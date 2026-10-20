BEGIN;

CREATE TABLE public.email_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(trim(email)) AND length(email) <= 254),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  newsletter boolean NOT NULL DEFAULT false,
  categories text[] NOT NULL DEFAULT '{}',
  max_budget numeric(12,2) CHECK (max_budget > 0),
  digest_prices jsonb NOT NULL DEFAULT '{}',
  consent_version text NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.email_price_alerts (
  subscriber_id uuid NOT NULL REFERENCES public.email_subscribers(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  target_price numeric(12,2) NOT NULL CHECK (target_price > 0),
  last_notified_price numeric(12,2),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subscriber_id, product_id)
);
CREATE TABLE public.email_opt_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  payload jsonb NOT NULL,
  consent_version text NOT NULL,
  source text NOT NULL CHECK (source IN ('product', 'newsletter')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  consumed_at timestamptz
);
CREATE TABLE public.email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES public.email_subscribers(id) ON DELETE CASCADE,
  delivery_day date NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'cancelled')),
  lease uuid,
  locked_at timestamptz,
  available_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  provider_id text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  UNIQUE (subscriber_id, delivery_day)
);
CREATE INDEX email_delivery_queue ON public.email_deliveries(status, available_at);
CREATE TABLE public.email_rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL,
  expires_at timestamptz NOT NULL
);

ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_opt_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_subscribers, public.email_price_alerts, public.email_opt_ins,
  public.email_deliveries, public.email_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.email_subscribers, public.email_price_alerts, public.email_opt_ins,
  public.email_deliveries, public.email_rate_limits TO service_role;

CREATE FUNCTION public.bf_email_rate_limit(p_key text, p_limit integer, p_seconds integer)
RETURNS boolean LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE n integer;
BEGIN
  INSERT INTO public.email_rate_limits AS r(key, count, expires_at)
  VALUES (p_key, 1, now() + make_interval(secs => p_seconds))
  ON CONFLICT (key) DO UPDATE SET
    count = CASE WHEN r.expires_at <= now() THEN 1 ELSE r.count + 1 END,
    expires_at = CASE WHEN r.expires_at <= now() THEN now() + make_interval(secs => p_seconds) ELSE r.expires_at END
  RETURNING count INTO n;
  RETURN n <= p_limit;
END;
$$;

CREATE FUNCTION public.bf_confirm_subscription(p_hash text)
RETURNS uuid LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE r public.email_opt_ins; s public.email_subscribers; alert jsonb; product text;
BEGIN
  SELECT * INTO r FROM public.email_opt_ins WHERE token_hash = p_hash FOR UPDATE;
  IF NOT FOUND OR r.consumed_at IS NOT NULL OR r.expires_at <= now() THEN RETURN NULL; END IF;
  INSERT INTO public.email_subscribers(email, consent_version)
    VALUES (r.email, r.consent_version) ON CONFLICT(email) DO NOTHING;
  SELECT * INTO s FROM public.email_subscribers WHERE email = r.email FOR UPDATE;
  IF s.status = 'unsubscribed' THEN
    UPDATE public.email_subscribers SET newsletter = false, categories = '{}', max_budget = NULL WHERE id = s.id;
    UPDATE public.email_price_alerts SET enabled = false WHERE subscriber_id = s.id;
  END IF;
  UPDATE public.email_subscribers SET status = 'active', confirmed_at = now(),
    consent_version = r.consent_version, unsubscribed_at = NULL WHERE id = s.id;
  IF (r.payload->>'newsletter')::boolean THEN
    UPDATE public.email_subscribers SET newsletter = true,
      categories = ARRAY(SELECT jsonb_array_elements_text(r.payload->'categories')),
      max_budget = (r.payload->>'maxBudget')::numeric WHERE id = s.id;
  END IF;
  alert := r.payload->'alert';
  IF alert IS NOT NULL AND alert <> 'null'::jsonb THEN
    product := alert->>'productId';
    IF NOT EXISTS (SELECT 1 FROM public.email_price_alerts WHERE subscriber_id = s.id AND product_id = product AND enabled)
      AND (SELECT count(*) FROM public.email_price_alerts WHERE subscriber_id = s.id AND enabled) >= 20 THEN
      RAISE EXCEPTION 'alert_limit';
    END IF;
    INSERT INTO public.email_price_alerts(subscriber_id, product_id, target_price)
      VALUES (s.id, product, (alert->>'targetPrice')::numeric)
      ON CONFLICT(subscriber_id, product_id) DO UPDATE SET
        target_price = excluded.target_price, enabled = true, last_notified_price = NULL;
  END IF;
  UPDATE public.email_opt_ins SET consumed_at = now() WHERE id = r.id;
  RETURN s.id;
END;
$$;

CREATE FUNCTION public.bf_unsubscribe(p_subscriber uuid)
RETURNS boolean LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE address text;
BEGIN
  UPDATE public.email_subscribers SET status = 'unsubscribed', newsletter = false, unsubscribed_at = now()
    WHERE id = p_subscriber RETURNING email INTO address;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.email_price_alerts SET enabled = false WHERE subscriber_id = p_subscriber;
  UPDATE public.email_opt_ins SET consumed_at = now() WHERE email = address AND consumed_at IS NULL;
  UPDATE public.email_deliveries SET status = 'cancelled'
    WHERE subscriber_id = p_subscriber AND status IN ('pending', 'sending');
  RETURN true;
END;
$$;

CREATE FUNCTION public.bf_enqueue_email(p_subscriber uuid, p_day date, p_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE result uuid;
BEGIN
  PERFORM 1 FROM public.email_subscribers WHERE id = p_subscriber AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  INSERT INTO public.email_deliveries(subscriber_id, delivery_day, payload)
    VALUES (p_subscriber, p_day, p_payload) ON CONFLICT(subscriber_id, delivery_day) DO NOTHING
    RETURNING id INTO result;
  RETURN result;
END;
$$;

CREATE FUNCTION public.bf_claim_email()
RETURNS TABLE(id uuid, lease uuid, email text, payload jsonb)
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE row_id uuid; claim_id uuid := gen_random_uuid();
BEGIN
  SELECT d.id INTO row_id FROM public.email_deliveries d
    JOIN public.email_subscribers s ON s.id = d.subscriber_id AND s.status = 'active'
    WHERE (d.status = 'pending' OR (d.status = 'sending' AND d.locked_at < now() - interval '10 minutes'))
      AND d.available_at <= now() AND d.attempts < 5 AND d.created_at > now() - interval '20 hours'
      AND d.delivery_day = (now() AT TIME ZONE 'America/El_Salvador')::date
      AND (d.payload->>'validUntil')::timestamptz > now()
    ORDER BY d.created_at LIMIT 1 FOR UPDATE OF d SKIP LOCKED;
  IF row_id IS NULL THEN RETURN; END IF;
  UPDATE public.email_deliveries d SET status = 'sending', lease = claim_id, locked_at = now(), attempts = attempts + 1 WHERE d.id = row_id;
  RETURN QUERY SELECT d.id, d.lease, s.email, d.payload FROM public.email_deliveries d
    JOIN public.email_subscribers s ON s.id = d.subscriber_id WHERE d.id = row_id;
END;
$$;

CREATE FUNCTION public.bf_finish_email(p_id uuid, p_lease uuid, p_provider text)
RETURNS boolean LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE d public.email_deliveries; entry record;
BEGIN
  UPDATE public.email_deliveries SET status = 'sent', sent_at = now(), provider_id = p_provider, error_code = NULL
    WHERE id = p_id AND lease = p_lease AND status = 'sending' RETURNING * INTO d;
  IF NOT FOUND THEN RETURN false; END IF;
  FOR entry IN SELECT * FROM jsonb_each_text(d.payload->'alertPrices') LOOP
    UPDATE public.email_price_alerts SET last_notified_price = entry.value::numeric
      WHERE subscriber_id = d.subscriber_id AND product_id = entry.key;
  END LOOP;
  UPDATE public.email_subscribers SET digest_prices = digest_prices || COALESCE(d.payload->'digestPrices', '{}'::jsonb)
    WHERE id = d.subscriber_id;
  RETURN true;
END;
$$;

CREATE FUNCTION public.bf_retry_email(p_id uuid, p_lease uuid, p_error text)
RETURNS void LANGUAGE sql SET search_path = '' AS $$
  UPDATE public.email_deliveries SET status = 'pending', available_at = now() + interval '5 minutes',
    error_code = left(p_error, 60)
  WHERE id = p_id AND lease = p_lease AND status = 'sending';
$$;

CREATE FUNCTION public.bf_email_cleanup()
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  DELETE FROM public.email_rate_limits WHERE expires_at < now();
  DELETE FROM public.email_opt_ins WHERE created_at < now() - interval '7 days';
  UPDATE public.email_deliveries SET status = 'cancelled', error_code = 'retry_window_expired'
    WHERE status IN ('pending', 'sending') AND (created_at <= now() - interval '20 hours' OR attempts >= 5
      OR delivery_day < (now() AT TIME ZONE 'America/El_Salvador')::date
      OR (payload->>'validUntil')::timestamptz <= now());
  DELETE FROM public.email_deliveries WHERE created_at < now() - interval '90 days';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bf_email_rate_limit(text, integer, integer),
  public.bf_confirm_subscription(text), public.bf_unsubscribe(uuid),
  public.bf_enqueue_email(uuid, date, jsonb), public.bf_claim_email(),
  public.bf_finish_email(uuid, uuid, text), public.bf_retry_email(uuid, uuid, text), public.bf_email_cleanup()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bf_email_rate_limit(text, integer, integer),
  public.bf_confirm_subscription(text), public.bf_unsubscribe(uuid),
  public.bf_enqueue_email(uuid, date, jsonb), public.bf_claim_email(),
  public.bf_finish_email(uuid, uuid, text), public.bf_retry_email(uuid, uuid, text), public.bf_email_cleanup()
  TO service_role;

COMMIT;

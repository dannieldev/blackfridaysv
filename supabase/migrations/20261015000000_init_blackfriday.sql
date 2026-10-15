-- ====================================================================
-- RADAR BLACK FRIDAY EL SALVADOR 2026 - ESQUEMA DE BASE DE DATOS INICIAL
-- ====================================================================

-- Extensión para generación de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA: stores (Almacenes y comercios de El Salvador)
CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY, -- 'siman', 'curacao', 'prado', 'omnisport', 'walmart', 'epa'
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    logo_url TEXT,
    platform TEXT, -- 'vtex', 'magento', 'custom'
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABLA: canonical_products (Productos universales agrupados por código de modelo)
CREATE TABLE IF NOT EXISTS canonical_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_code TEXT UNIQUE NOT NULL, -- ej: '55UR7800PSB', 'SM-S928B', 'WH-1000XM5'
    brand TEXT NOT NULL, -- 'LG', 'Samsung', 'Apple', 'Sony', 'Mabe', etc.
    canonical_title TEXT NOT NULL,
    category TEXT NOT NULL, -- 'tv_audio', 'smartphones', 'computacion', 'linea_blanca', 'gaming'
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABLA: store_products (Catálogo individual de cada tienda)
CREATE TABLE IF NOT EXISTS store_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    canonical_id UUID REFERENCES canonical_products(id) ON DELETE SET NULL,
    store_sku TEXT NOT NULL,
    title TEXT NOT NULL,
    product_url TEXT NOT NULL,
    image_url TEXT,
    in_stock BOOLEAN DEFAULT true,
    last_scraped_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, store_sku)
);

-- 4. TABLA: price_history (Serie temporal inmutable de precios en USD)
CREATE TABLE IF NOT EXISTS price_history (
    id BIGSERIAL PRIMARY KEY,
    store_product_id UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
    regular_price NUMERIC(10, 2), -- Precio de lista o 'tachado' que muestra la tienda
    offer_price NUMERIC(10, 2) NOT NULL, -- Precio real de cobro
    captured_at TIMESTAMPTZ DEFAULT now()
);

-- Índices de alto rendimiento para consultas inmediatas (< 20ms)
CREATE INDEX IF NOT EXISTS idx_price_history_lookup ON price_history(store_product_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_products_canonical ON store_products(canonical_id);
CREATE INDEX IF NOT EXISTS idx_store_products_store ON store_products(store_id);
CREATE INDEX IF NOT EXISTS idx_canonical_model ON canonical_products(model_code);
CREATE INDEX IF NOT EXISTS idx_canonical_category ON canonical_products(category);
CREATE INDEX IF NOT EXISTS idx_canonical_brand ON canonical_products(brand);

-- 5. VISTA INTELIGENTE: view_deal_radar
-- Pre-calcula el veredicto del semáforo, el mínimo histórico y si el precio fue inflado
CREATE OR REPLACE VIEW view_deal_radar AS
WITH latest_prices AS (
    SELECT DISTINCT ON (store_product_id)
        store_product_id,
        regular_price AS current_regular_price,
        offer_price AS current_offer_price,
        captured_at AS latest_captured_at
    FROM price_history
    ORDER BY store_product_id, captured_at DESC
),
historic_stats AS (
    SELECT
        store_product_id,
        MIN(offer_price) AS min_historic_price,
        MAX(offer_price) AS max_historic_price,
        ROUND(AVG(offer_price), 2) AS avg_historic_price,
        ROUND(AVG(offer_price) FILTER (WHERE captured_at >= now() - INTERVAL '30 days'), 2) AS avg_price_last_30d,
        MAX(regular_price) FILTER (WHERE captured_at >= now() - INTERVAL '20 days') AS max_regular_last_20d
    FROM price_history
    GROUP BY store_product_id
)
SELECT
    sp.id AS store_product_id,
    sp.store_sku,
    sp.title AS store_title,
    sp.product_url,
    sp.image_url AS product_image,
    sp.in_stock,
    sp.last_scraped_at,
    s.id AS store_id,
    s.name AS store_name,
    s.logo_url AS store_logo,
    cp.id AS canonical_id,
    cp.model_code,
    cp.brand,
    cp.canonical_title,
    cp.category,
    lp.current_regular_price,
    lp.current_offer_price,
    hs.min_historic_price,
    hs.avg_historic_price,
    COALESCE(hs.avg_price_last_30d, hs.avg_historic_price) AS baseline_price_30d,
    -- Detección de Inflación (Art. 31 Ley Protección Consumidor SV):
    -- Si el precio regular anunciado subió más de 12% en los últimos 20 días sobre el promedio
    CASE 
        WHEN lp.current_regular_price > (COALESCE(hs.avg_price_last_30d, lp.current_offer_price) * 1.15) THEN true 
        ELSE false 
    END AS is_inflated,
    -- ¿Es mínimo histórico absoluto?
    CASE 
        WHEN lp.current_offer_price <= hs.min_historic_price THEN true 
        ELSE false 
    END AS is_all_time_low,
    -- Descuento Real Porcentual vs Línea Base (no sobre el precio inflado de la tienda)
    ROUND(
        (1.0 - (lp.current_offer_price / NULLIF(COALESCE(hs.avg_price_last_30d, lp.current_regular_price, lp.current_offer_price), 0))) * 100.0, 
        1
    ) AS real_discount_percent,
    -- Semáforo de Veredicto
    CASE
        WHEN lp.current_offer_price <= hs.min_historic_price AND (hs.avg_price_last_30d - lp.current_offer_price) >= 15 THEN 'ganga_historica'
        WHEN lp.current_regular_price > (COALESCE(hs.avg_price_last_30d, lp.current_offer_price) * 1.15) THEN 'falsa_oferta_inflada'
        WHEN (1.0 - (lp.current_offer_price / NULLIF(hs.avg_price_last_30d, 0))) >= 0.08 THEN 'buena_oferta'
        WHEN ABS(lp.current_offer_price - COALESCE(hs.avg_price_last_30d, lp.current_offer_price)) <= 3.0 THEN 'descuento_cosmetico'
        ELSE 'precio_regular'
    END AS deal_score
FROM store_products sp
JOIN stores s ON sp.store_id = s.id
LEFT JOIN canonical_products cp ON sp.canonical_id = cp.id
LEFT JOIN latest_prices lp ON sp.id = lp.store_product_id
LEFT JOIN historic_stats hs ON sp.id = hs.store_product_id;

-- 6. DATOS SEMILLA (STORES INICIALES DE EL SALVADOR)
INSERT INTO stores (id, name, domain, logo_url, platform, active) VALUES
('siman', 'Almacenes Siman', 'sv.siman.com', 'https://sv.siman.com/arquivos/siman-logo.png', 'vtex', true),
('curacao', 'La Curacao El Salvador', 'lacuracaoonline.com/elsalvador', 'https://lacuracaoonline.com/static/version1700000000/frontend/Curacao/default/es_SV/images/logo.svg', 'vtex', true),
('prado', 'Prado El Salvador', 'prado.com.sv', 'https://prado.com.sv/media/logo/stores/1/logo_prado.png', 'magento', true),
('omnisport', 'Omnisport El Salvador', 'omnisport.com', 'https://omnisport.com/images/omnisport-logo.svg', 'custom', true),
('walmart', 'Walmart El Salvador', 'walmart.com.sv', 'https://walmart.com.sv/logo.png', 'walmart_catalog', true),
('epa', 'EPA El Salvador', 'sv.epaenlinea.com', 'https://sv.epaenlinea.com/logo.png', 'magento', true)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    domain = EXCLUDED.domain,
    active = EXCLUDED.active;

-- 7. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública para la App Web (anon key)
CREATE POLICY "Lectura pública de stores" ON stores FOR SELECT USING (true);
CREATE POLICY "Lectura pública de canonical_products" ON canonical_products FOR SELECT USING (true);
CREATE POLICY "Lectura pública de store_products" ON store_products FOR SELECT USING (true);
CREATE POLICY "Lectura pública de price_history" ON price_history FOR SELECT USING (true);

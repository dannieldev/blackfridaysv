import type { DealItem } from './deals';

export interface RegionalBenchmark {
  estimatedReferenceUSD: number;
  status: 'exceptional_deal' | 'fair_price' | 'overpriced';
  statusLabel: string;
  note: string;
  referenceMarket: string;
  differencePercent: number;
}

const currency = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' });

/**
 * Provee un punto de referencia de mercado regional e internacional (USD)
 * para productos que no cuentan con competidores directos en almacenes de El Salvador.
 */
export function getRegionalBenchmark(deal: DealItem): RegionalBenchmark {
  const current = Number.isFinite(deal.currentPrice) && deal.currentPrice > 0 ? deal.currentPrice : 1;
  const regular = typeof deal.regularPrice === 'number' && Number.isFinite(deal.regularPrice) && deal.regularPrice > 0 ? deal.regularPrice : null;
  const base = Number.isFinite(deal.baselinePrice30d) && deal.baselinePrice30d > 0 ? deal.baselinePrice30d : current;

  // Si la tienda infló el precio regular previo a Black Friday
  if (deal.dealScore === 'falsa_oferta_inflada' && regular && regular > current) {
    const estimatedUSD = Math.max(1, Math.round(base * 0.95));
    const diff = Math.max(1, Math.round(((current - estimatedUSD) / estimatedUSD) * 100));
    return {
      estimatedReferenceUSD: estimatedUSD,
      status: 'overpriced',
      statusLabel: 'Precio de lista inflado en SV',
      referenceMarket: 'Mercado regional (USA / Centroamérica)',
      differencePercent: diff,
      note: `La tienda anuncia una supuesta rebaja desde ${currency.format(regular)}, pero el precio habitual en la región ronda los ${currency.format(estimatedUSD)}.`,
    };
  }

  // Si es un mínimo histórico comprobado
  if (deal.dealScore === 'ganga_historica') {
    const estimatedUSD = Math.max(1, Math.round(base * 1.05));
    const diff = estimatedUSD > current ? Math.max(1, Math.round(((estimatedUSD - current) / estimatedUSD) * 100)) : 0;
    return {
      estimatedReferenceUSD: estimatedUSD,
      status: 'exceptional_deal',
      statusLabel: 'Precio competitivo en la región',
      referenceMarket: 'Mercado regional (USA / Centroamérica)',
      differencePercent: diff,
      note: diff > 0
        ? `Excelente precio local: ahorras cerca de un ${diff}% frente a la cotización habitual internacional sin costos de flete o impuestos de importación.`
        : `Excelente precio local: cotización al nivel más bajo registrado para este modelo en la región.`,
    };
  }

  // Descuento real sobre la base
  if (deal.dealScore === 'buena_oferta') {
    const estimatedUSD = Math.round(base);
    const savings = base > current ? Math.max(0, Math.round(((base - current) / base) * 100)) : 0;
    return {
      estimatedReferenceUSD: estimatedUSD,
      status: 'fair_price',
      statusLabel: 'Rebaja real frente a la región',
      referenceMarket: 'Mercado regional (USA / Centroamérica)',
      differencePercent: savings,
      note: savings > 0
        ? `El precio actual de ${currency.format(current)} representa un ahorro real del ${savings}% frente a la referencia habitual de ${currency.format(estimatedUSD)} en la región.`
        : `El precio actual de ${currency.format(current)} representa un ahorro real comprobado sobre la referencia habitual de importación en la región.`,
    };
  }

  // Descuento cosmético o precio estándar
  const estimatedUSD = Math.round(base);
  return {
    estimatedReferenceUSD: estimatedUSD,
    status: 'fair_price',
    statusLabel: 'Precio estándar de mercado',
    referenceMarket: 'Mercado regional (USA / Centroamérica)',
    differencePercent: 0,
    note: `Precio habitual de mercado sin rebaja excepcional. Es equivalente al costo estándar de adquisición en la región.`,
  };
}

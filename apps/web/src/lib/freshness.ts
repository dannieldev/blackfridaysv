export interface Capture {
  checkedAt?: string;
  refreshStatus?: 'updated' | 'retained';
}

export function freshness(item: Capture, now = Date.now()): 'recent' | 'stale' | 'unknown' | 'retained' {
  const timestamp = Date.parse(item.checkedAt ?? '');
  if (!Number.isFinite(timestamp) || timestamp > now) return 'unknown';
  if (now - timestamp > 24 * 60 * 60 * 1000) return 'stale';
  return item.refreshStatus === 'retained' ? 'retained' : 'recent';
}

export function freshnessLabel(item: Capture, now = Date.now()): string {
  return {
    recent: 'Captura de las últimas 24 h', stale: 'Captura de hace más de 24 h',
    unknown: 'Fecha de captura sin verificar', retained: 'Pendiente de nueva captura',
  }[freshness(item, now)];
}

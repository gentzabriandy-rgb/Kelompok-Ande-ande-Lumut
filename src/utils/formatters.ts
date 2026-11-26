export function formatRupiah(amount: number): string {
  const value = Number.isFinite(amount) ? Math.round(amount) : 0;
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  return `${sign}Rp ${abs.toLocaleString('id-ID')}`;
}

export function formatCompactRupiah(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '')} M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp ${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')} Jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp ${(abs / 1_000).toFixed(0)} Rb`;
  }
  return `${sign}Rp ${Math.round(abs).toLocaleString('id-ID')}`;
}

export function formatDateTime(ms?: number): string {
  if (!ms) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

export function formatShortDate(ms?: number): string {
  if (!ms) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(ms));
}

export function todayDateLabel(): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());
}

export function generateId(prefix = 'item'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function safeOpenUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(trimmed)) return `https://${trimmed}`;
  return null;
}

export function parsePositiveNumber(raw: string): number {
  const cleaned = raw.replace(/[^\d.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

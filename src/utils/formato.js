export const fmt = n => `$${Number(n || 0).toLocaleString('es-CO')}`;
export const fmtPct = n => `${(Number(n || 0) * 100).toFixed(1)}%`;

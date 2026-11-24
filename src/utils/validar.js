export const validarEmail = e =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());

// Mismo criterio que CambiarPassword
export const validarPassword = p => String(p || '').length >= 8;

// 'YYYY-MM-DD' y que sea una fecha real (rechaza 2026-02-31)
export const esFechaValida = f => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return false;
  const [y, m, d] = f.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
};

// Vacío = 0. Acepta coma decimal. Devuelve NaN si no es un número.
export const aNumero = txt => {
  const t = String(txt ?? '')
    .trim()
    .replace(',', '.');
  if (t === '') return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

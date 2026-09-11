/**
 * Utilidades de fecha — ancladas a Colombia (UTC-5), sin depender de la
 * zona horaria que tenga configurada el dispositivo.
 *
 * IMPORTANTE: no usamos `new Date().getFullYear()/getMonth()/getDate()`
 * porque esos dependen de la zona horaria del SISTEMA OPERATIVO del
 * dispositivo — y en emuladores (o teléfonos mal configurados) eso puede
 * no ser Colombia, dando fechas equivocadas cerca de medianoche.
 *
 * En su lugar, calculamos la hora actual en Colombia restando el offset
 * directamente al instante UTC, igual que hace el backend.
 */

const OFFSET_COLOMBIA_HORAS = 5; // Colombia es UTC-5 todo el año (sin DST)

// Formatea cualquier Date a 'YYYY-MM-DD' como si fuera hora Colombia,
// sin importar la zona horaria configurada en el dispositivo.
export const toFechaLocal = date => {
  const colombiaMs = date.getTime() - OFFSET_COLOMBIA_HORAS * 60 * 60 * 1000;
  const colombiaDate = new Date(colombiaMs);
  const y = colombiaDate.getUTCFullYear();
  const m = String(colombiaDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(colombiaDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Fecha de "hoy" en formato 'YYYY-MM-DD', anclada a hora Colombia.
export const getFechaHoyLocal = () => toFechaLocal(new Date());

/**
 * Formatea para mostrar una fecha que YA viene guardada (venta, lote,
 * movimiento de caja, pago de deuda) como 'DD/MM/YYYY'.
 *
 * OJO: esto es distinto a toFechaLocal/getFechaHoyLocal de arriba. Esas dos
 * convierten un INSTANTE real (new Date(), "ahora") a la hora de Colombia.
 * Pero los campos `fecha` que vienen del backend son `@db.Date` en la base
 * de datos — solo un día calendario, sin hora. El backend los entrega como
 * '2026-09-10T00:00:00.000Z' para el 10 de septiembre. Si a ESE valor le
 * aplicamos una conversión de zona horaria (como hace `new Date(d).toLocaleDateString()`,
 * que usa la zona horaria del dispositivo), restamos horas de más y cruzamos
 * la medianoche: el resultado se corre un día hacia atrás. Por eso aquí NO
 * se reconvierte nada — se lee el string tal cual llega.
 */
export const fmtFecha = d => {
  const [y, m, dia] = String(d).slice(0, 10).split('-');
  return `${dia}/${m}/${y}`;
};

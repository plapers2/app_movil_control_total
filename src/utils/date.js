/**
 * Utilidades de fecha.
 *
 * IMPORTANTE: nunca usar `new Date().toISOString().split('T')[0]` para obtener
 * la fecha de "hoy". `toISOString()` siempre devuelve la fecha en UTC, no en
 * hora local. Colombia está en UTC-5, así que entre ~7pm y medianoche (hora
 * Colombia) ese método ya devuelve el día siguiente.
 *
 * Estas funciones siempre usan los componentes de fecha LOCALES del
 * dispositivo (getFullYear/getMonth/getDate), que respetan la zona horaria
 * real del usuario.
 */

// Formatea cualquier Date a 'YYYY-MM-DD' usando hora LOCAL (no UTC).
export const toFechaLocal = date => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Fecha de "hoy" en formato 'YYYY-MM-DD', en hora local del dispositivo.
export const getFechaHoyLocal = () => toFechaLocal(new Date());

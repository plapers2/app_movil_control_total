/**
 * Normaliza texto para búsquedas: minúsculas + sin tildes/diacríticos.
 * Ej: normalizar('José Pérez') === 'jose perez'
 */
export function normalizar(texto) {
  return (texto || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * true si `texto` contiene `query`, ignorando tildes y mayúsculas/minúsculas.
 */
export function coincide(texto, query) {
  if (!query) return true;
  return normalizar(texto).includes(normalizar(query));
}

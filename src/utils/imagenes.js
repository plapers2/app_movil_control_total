import client from '../api/client';

const API_ORIGIN = (client.defaults.baseURL || '').replace(/\/api\/?$/, '');

export const urlImagen = ruta => {
  if (!ruta) return null;

  if (/^https?:\/\//i.test(ruta)) {
    return ruta;
  }

  return `${API_ORIGIN}${ruta.startsWith('/') ? '' : '/'}${ruta}`;
};

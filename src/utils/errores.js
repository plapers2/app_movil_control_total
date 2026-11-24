import { Alert } from 'react-native';

let ultimoAviso = 0;

// Para errores al CARGAR datos. Evita:
// - alertas cuando la sesión expiró (el interceptor ya redirige al login)
// - alertas repetidas (Home hace 2 peticiones en paralelo)
export const avisarError = (err, fallback = 'Ocurrió un error.') => {
  const status = err?.response?.status;
  const code = err?.response?.data?.code;
  if (status === 401 || code === 'DEBE_CAMBIAR_PASSWORD') return;

  const ahora = Date.now();
  if (ahora - ultimoAviso < 3000) return;
  ultimoAviso = ahora;

  const mensaje = err?.response
    ? err.response.data?.message || fallback
    : 'Sin conexión con el servidor. Revisa tu internet.';
  Alert.alert('Error', mensaje);
};

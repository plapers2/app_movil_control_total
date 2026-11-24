import axios from 'axios';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetTo } from '../navigation/navigationRef';
import { clearSession } from '../store/authStore';

const API_URL = 'https://apicontroltotal.vidriospelaez.com.co/api/'; // Produccion
// const API_URL = 'http://10.0.2.2:3000/api/'; // Desarrollo

const client = axios.create({ baseURL: API_URL, timeout: 30000 });

const esRutaLogin = config => !!config?.url?.includes('/auth/login');

client.interceptors.request.use(async config => {
  if (esRutaLogin(config)) return config; // el login no lleva token
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let cerrandoSesion = false;

const cerrarSesion = async (titulo, mensaje) => {
  if (cerrandoSesion) return;
  cerrandoSesion = true;
  await clearSession();
  resetTo('Login');
  Alert.alert(titulo, mensaje);
  setTimeout(() => {
    cerrandoSesion = false;
  }, 2000);
};

client.interceptors.response.use(
  response => response,
  async error => {
    const { status, data } = error.response || {};

    // Temporal: muestra qué endpoint devolvió el 401 (solo en desarrollo)
    if (__DEV__ && status === 401) {
      console.log('[401]', error.config?.url, data?.message);
    }

    if (status === 403 && data?.code === 'DEBE_CAMBIAR_PASSWORD') {
      resetTo('CambiarPassword');
    }

    if ((status === 401 || status === 403) && !esRutaLogin(error.config)) {
      // Solo actuar si la petición que falló usó la sesión que sigue vigente.
      // Así una respuesta tardía de la sesión anterior no borra la nueva.
      const tokenUsado = error.config?.headers?.Authorization;
      const tokenActual = await AsyncStorage.getItem('token');
      const sesionVigente =
        !!tokenUsado && tokenUsado === `Bearer ${tokenActual}`;

      if (sesionVigente) {
        if (status === 401) {
          await cerrarSesion(
            'Sesión expirada',
            'Inicia sesión de nuevo para continuar.',
          );
        } else if (data?.message === 'Sin acceso a esta empresa.') {
          await cerrarSesion(
            'Acceso revocado',
            'Ya no tienes acceso a esta empresa.',
          );
        }
      }
    }

    return Promise.reject(error);
  },
);

export default client;

import axios from 'axios';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetTo } from '../navigation/navigationRef';
import { clearSession } from '../store/authStore';

// const API_URL = 'https://apicontroltotal.vidriospelaez.com.co/api/'; // Produccion
const API_URL = 'http://10.0.2.2:3000/api/'; // Desarrollo

const client = axios.create({ baseURL: API_URL, timeout: 30000 });

client.interceptors.request.use(async config => {
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
    const esLogin = error.config?.url?.includes('/auth/login');

    if (status === 403 && data?.code === 'DEBE_CAMBIAR_PASSWORD') {
      resetTo('CambiarPassword');
    }

    // Token vencido, inválido o usuario inactivo
    if (status === 401 && !esLogin) {
      await cerrarSesion(
        'Sesión expirada',
        'Inicia sesión de nuevo para continuar.',
      );
    }

    // Membresía desactivada: el token ya no sirve para esta empresa
    if (status === 403 && data?.message === 'Sin acceso a esta empresa.') {
      await cerrarSesion(
        'Acceso revocado',
        'Ya no tienes acceso a esta empresa.',
      );
    }

    return Promise.reject(error);
  },
);

export default client;

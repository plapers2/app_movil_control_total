import axios from 'axios';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetTo } from '../navigation/navigationRef';
import { clearSession } from '../store/authStore';

// const API_URL = 'https://apicontroltotal.vidriospelaez.com.co/api/'; // Produccion
const API_URL = 'http://10.0.2.2:3000/api/'; // Desarrollo

const client = axios.create({ baseURL: API_URL, timeout: 15000 });

client.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let cerrandoSesion = false;

client.interceptors.response.use(
  response => response,
  async error => {
    const { status, data } = error.response || {};
    const esLogin = error.config?.url?.includes('/auth/login');

    if (status === 403 && data?.code === 'DEBE_CAMBIAR_PASSWORD') {
      resetTo('CambiarPassword');
    }

    // Token vencido o inválido: limpiar sesión y volver al login (una sola vez)
    if (status === 401 && !esLogin && !cerrandoSesion) {
      cerrandoSesion = true;
      await clearSession();
      resetTo('Login');
      Alert.alert('Sesión expirada', 'Inicia sesión de nuevo para continuar.');
      setTimeout(() => {
        cerrandoSesion = false;
      }, 2000);
    }

    return Promise.reject(error);
  },
);

export default client;

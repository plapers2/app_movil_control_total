import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetTo } from '../navigation/navigationRef';

// const API_URL = 'https://apicontroltotal.vidriospelaez.com.co/api/'; // Produccion
const API_URL = 'http://10.0.2.2:3000/api/'; // Desarrollo

const client = axios.create({ baseURL: API_URL });

client.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  response => response,
  error => {
    const { status, data } = error.response || {};
    if (status === 403 && data?.code === 'DEBE_CAMBIAR_PASSWORD') {
      resetTo('CambiarPassword');
    }
    return Promise.reject(error);
  },
);

export default client;

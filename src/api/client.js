import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://apicontroltotal.vidriospelaez.com.co/api/'; // Produccion
// const API_URL = 'http://10.0.2.2:3000/api/'; // Desarrollo

const client = axios.create({ baseURL: API_URL });

client.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;

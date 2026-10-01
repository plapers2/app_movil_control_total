import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveToken = token => AsyncStorage.setItem('token', token);
export const getToken = () => AsyncStorage.getItem('token');
export const removeToken = () => AsyncStorage.removeItem('token');
export const saveEmpresa = empresa =>
  AsyncStorage.setItem('empresa', JSON.stringify(empresa));
export const getEmpresa = async () => {
  const e = await AsyncStorage.getItem('empresa');
  return e ? JSON.parse(e) : null;
};
export const saveRol = rol => AsyncStorage.setItem('rol', rol);
export const getRol = () => AsyncStorage.getItem('rol');
export const saveUsuario = usuario =>
  AsyncStorage.setItem('usuario', JSON.stringify(usuario));
export const getUsuario = async () => {
  const u = await AsyncStorage.getItem('usuario');
  return u ? JSON.parse(u) : null;
};
export const clearSession = async () => {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('empresa');
  await AsyncStorage.removeItem('rol');
  await AsyncStorage.removeItem('usuario');
};

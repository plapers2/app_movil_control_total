import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ACCESSIBLE,
  getGenericPassword,
  setGenericPassword,
  resetGenericPassword,
} from 'react-native-keychain';

const TOKEN_SERVICE = 'com.control_total.auth.token';
const TOKEN_USERNAME = 'control-total-session';

const TOKEN_OPTIONS = {
  service: TOKEN_SERVICE,
  accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// Serializa las operaciones para evitar que dos peticiones simultáneas
// intenten migrar o modificar el token al mismo tiempo.
let tokenQueue = Promise.resolve();

const withTokenLock = operation => {
  const pending = tokenQueue.then(operation, operation);

  tokenQueue = pending.then(
    () => undefined,
    () => undefined,
  );

  return pending;
};

const guardarTokenSeguro = async token => {
  const resultado = await setGenericPassword(
    TOKEN_USERNAME,
    token,
    TOKEN_OPTIONS,
  );

  if (!resultado) {
    throw new Error(
      'No fue posible guardar el token en el almacenamiento seguro.',
    );
  }
};

export const saveToken = token =>
  withTokenLock(async () => {
    if (typeof token !== 'string' || !token.trim()) {
      throw new Error('El token de sesión no es válido.');
    }

    // Primero guardar de forma segura.
    await guardarTokenSeguro(token);

    // Solo después eliminar la copia antigua.
    await AsyncStorage.removeItem('token');
  });

export const getToken = () =>
  withTokenLock(async () => {
    // El almacenamiento seguro siempre tiene prioridad.
    const credenciales = await getGenericPassword({
      service: TOKEN_SERVICE,
    });

    if (credenciales) {
      // Limpiar cualquier token antiguo que haya quedado en AsyncStorage.
      await AsyncStorage.removeItem('token');
      return credenciales.password;
    }

    // Migración automática de sesiones existentes.
    const tokenAntiguo = await AsyncStorage.getItem('token');

    if (!tokenAntiguo) {
      return null;
    }

    // No borrar el token antiguo hasta confirmar su almacenamiento seguro.
    await guardarTokenSeguro(tokenAntiguo);
    await AsyncStorage.removeItem('token');

    return tokenAntiguo;
  });

export const removeToken = () =>
  withTokenLock(async () => {
    await resetGenericPassword({
      service: TOKEN_SERVICE,
    });

    // También limpia la copia antigua, si existe.
    await AsyncStorage.removeItem('token');

    return true;
  });

export const saveEmpresa = empresa =>
  AsyncStorage.setItem('empresa', JSON.stringify(empresa));

export const getEmpresa = async () => {
  const empresa = await AsyncStorage.getItem('empresa');
  return empresa ? JSON.parse(empresa) : null;
};

export const saveRol = rol => AsyncStorage.setItem('rol', rol);

export const getRol = () => AsyncStorage.getItem('rol');

export const saveUsuario = usuario =>
  AsyncStorage.setItem('usuario', JSON.stringify(usuario));

export const getUsuario = async () => {
  const usuario = await AsyncStorage.getItem('usuario');
  return usuario ? JSON.parse(usuario) : null;
};

export const clearSession = async () => {
  // Si no se puede eliminar el token seguro, no fingir que cerramos sesión.
  await removeToken();

  await AsyncStorage.removeItem('empresa');
  await AsyncStorage.removeItem('rol');
  await AsyncStorage.removeItem('usuario');
};

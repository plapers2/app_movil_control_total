import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ACCESSIBLE,
  getGenericPassword,
  setGenericPassword,
  resetGenericPassword,
} from 'react-native-keychain';

import {
  saveToken,
  getToken,
  removeToken,
  saveEmpresa,
  getEmpresa,
  saveRol,
  getRol,
  saveUsuario,
  getUsuario,
  clearSession,
} from '../src/store/authStore';

const TOKEN_SERVICE = 'com.control_total.auth.token';
const TOKEN_USERNAME = 'control-total-session';

const TOKEN_OPTIONS = {
  service: TOKEN_SERVICE,
  accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

jest.spyOn(AsyncStorage, 'setItem');
jest.spyOn(AsyncStorage, 'removeItem');

describe('authStore: almacenamiento de sesión', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();

    getGenericPassword.mockReset().mockResolvedValue(false);
    setGenericPassword
      .mockReset()
      .mockResolvedValue({ service: 'test' });
    resetGenericPassword.mockReset().mockResolvedValue(true);
  });

  describe('saveToken', () => {
    test('guarda el token en Keychain y después elimina la copia antigua', async () => {
      await AsyncStorage.setItem('token', 'token-antiguo');

      await saveToken('token-nuevo');

      expect(setGenericPassword).toHaveBeenCalledWith(
        TOKEN_USERNAME,
        'token-nuevo',
        TOKEN_OPTIONS,
      );

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');

      expect(setGenericPassword.mock.invocationCallOrder[0]).toBeLessThan(
        AsyncStorage.removeItem.mock.invocationCallOrder[0],
      );

      await expect(AsyncStorage.getItem('token')).resolves.toBeNull();
    });

    test.each([
      ['cadena vacía', ''],
      ['solo espacios', '   '],
      ['valor nulo', null],
      ['valor numérico', 123],
    ])('rechaza un token inválido: %s', async (_caso, token) => {
      await expect(saveToken(token)).rejects.toThrow(
        'El token de sesión no es válido.',
      );

      expect(setGenericPassword).not.toHaveBeenCalled();
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });

    test('conserva la copia antigua si falla el almacenamiento seguro', async () => {
      await AsyncStorage.setItem('token', 'token-antiguo');
      setGenericPassword.mockResolvedValue(false);

      await expect(saveToken('token-nuevo')).rejects.toThrow(
        'No fue posible guardar el token en el almacenamiento seguro.',
      );

      await expect(AsyncStorage.getItem('token')).resolves.toBe(
        'token-antiguo',
      );

      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('getToken', () => {
    test('prioriza el token de Keychain sobre el token antiguo', async () => {
      await AsyncStorage.setItem('token', 'token-antiguo');

      getGenericPassword.mockResolvedValue({
        username: TOKEN_USERNAME,
        password: 'token-seguro',
      });

      await expect(getToken()).resolves.toBe('token-seguro');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');
      expect(setGenericPassword).not.toHaveBeenCalled();
    });

    test('migra el token antiguo a Keychain y después lo elimina', async () => {
      await AsyncStorage.setItem('token', 'token-legacy');

      await expect(getToken()).resolves.toBe('token-legacy');

      expect(setGenericPassword).toHaveBeenCalledWith(
        TOKEN_USERNAME,
        'token-legacy',
        TOKEN_OPTIONS,
      );

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');

      expect(setGenericPassword.mock.invocationCallOrder[0]).toBeLessThan(
        AsyncStorage.removeItem.mock.invocationCallOrder[0],
      );

      await expect(AsyncStorage.getItem('token')).resolves.toBeNull();
    });

    test('devuelve null cuando no existe ningún token', async () => {
      await expect(getToken()).resolves.toBeNull();

      expect(getGenericPassword).toHaveBeenCalledWith({
        service: TOKEN_SERVICE,
      });

      expect(setGenericPassword).not.toHaveBeenCalled();
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });

    test('conserva el token antiguo si falla su migración a Keychain', async () => {
      await AsyncStorage.setItem('token', 'token-legacy');
      setGenericPassword.mockResolvedValue(false);

      await expect(getToken()).rejects.toThrow(
        'No fue posible guardar el token en el almacenamiento seguro.',
      );

      await expect(AsyncStorage.getItem('token')).resolves.toBe(
        'token-legacy',
      );

      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('removeToken', () => {
    test('elimina el token seguro y la copia antigua', async () => {
      await AsyncStorage.setItem('token', 'token-antiguo');

      await expect(removeToken()).resolves.toBe(true);

      expect(resetGenericPassword).toHaveBeenCalledWith({
        service: TOKEN_SERVICE,
      });

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');
      await expect(AsyncStorage.getItem('token')).resolves.toBeNull();
    });

    test('no elimina la copia antigua si falla la eliminación segura', async () => {
      await AsyncStorage.setItem('token', 'token-antiguo');
      resetGenericPassword.mockRejectedValue(
        new Error('Error de Keychain'),
      );

      await expect(removeToken()).rejects.toThrow('Error de Keychain');

      await expect(AsyncStorage.getItem('token')).resolves.toBe(
        'token-antiguo',
      );

      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('datos de empresa, rol y usuario', () => {
    test('guarda y recupera los datos de la empresa', async () => {
      const empresa = {
        id: 15,
        nombre: 'Empresa de prueba',
      };

      await saveEmpresa(empresa);

      await expect(getEmpresa()).resolves.toEqual(empresa);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'empresa',
        JSON.stringify(empresa),
      );
    });

    test('devuelve null cuando no existe una empresa guardada', async () => {
      await expect(getEmpresa()).resolves.toBeNull();
    });

    test('guarda y recupera el rol', async () => {
      await saveRol('administrador');

      await expect(getRol()).resolves.toBe('administrador');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'rol',
        'administrador',
      );
    });

    test('guarda y recupera los datos del usuario', async () => {
      const usuario = {
        id: 8,
        nombre: 'Usuario de prueba',
        email: 'prueba@controltotal.test',
      };

      await saveUsuario(usuario);

      await expect(getUsuario()).resolves.toEqual(usuario);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'usuario',
        JSON.stringify(usuario),
      );
    });

    test('devuelve null cuando no existe un usuario guardado', async () => {
      await expect(getUsuario()).resolves.toBeNull();
    });
  });

  describe('clearSession', () => {
    test('elimina token, empresa, rol y usuario', async () => {
      await AsyncStorage.setItem('token', 'token-antiguo');
      await saveEmpresa({ id: 15, nombre: 'Empresa de prueba' });
      await saveRol('administrador');
      await saveUsuario({ id: 8, nombre: 'Usuario de prueba' });

      await clearSession();

      expect(resetGenericPassword).toHaveBeenCalledWith({
        service: TOKEN_SERVICE,
      });

      await expect(AsyncStorage.getItem('token')).resolves.toBeNull();
      await expect(AsyncStorage.getItem('empresa')).resolves.toBeNull();
      await expect(AsyncStorage.getItem('rol')).resolves.toBeNull();
      await expect(AsyncStorage.getItem('usuario')).resolves.toBeNull();
    });

    test('conserva los datos de sesión si falla la eliminación del token seguro', async () => {
      await AsyncStorage.setItem('token', 'token-antiguo');
      await saveEmpresa({ id: 15, nombre: 'Empresa de prueba' });
      await saveRol('administrador');
      await saveUsuario({ id: 8, nombre: 'Usuario de prueba' });

      resetGenericPassword.mockRejectedValue(
        new Error('No se pudo eliminar el token seguro'),
      );

      await expect(clearSession()).rejects.toThrow(
        'No se pudo eliminar el token seguro',
      );

      await expect(AsyncStorage.getItem('token')).resolves.toBe(
        'token-antiguo',
      );
      await expect(AsyncStorage.getItem('empresa')).resolves.toBe(
        JSON.stringify({ id: 15, nombre: 'Empresa de prueba' }),
      );
      await expect(AsyncStorage.getItem('rol')).resolves.toBe(
        'administrador',
      );
      await expect(AsyncStorage.getItem('usuario')).resolves.toBe(
        JSON.stringify({ id: 8, nombre: 'Usuario de prueba' }),
      );
    });
  });
});


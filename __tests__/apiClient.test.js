jest.mock('../src/store/authStore', () => ({
  getToken: jest.fn(),
  clearSession: jest.fn(),
}));

jest.mock('../src/navigation/navigationRef', () => ({
  resetTo: jest.fn(),
}));

import { Alert } from 'react-native';
import client from '../src/api/client';
import { getToken, clearSession } from '../src/store/authStore';
import { resetTo } from '../src/navigation/navigationRef';

const obtenerInterceptorSolicitud = () =>
  client.interceptors.request.handlers.find(h => h?.fulfilled).fulfilled;

const obtenerInterceptorRespuesta = () =>
  client.interceptors.response.handlers.find(h => h?.rejected).rejected;

const crearError = (status, data = {}, config = {}) => ({
  config: {
    url: '/ventas',
    headers: {
      Authorization: 'Bearer token-vigente',
    },
    ...config,
  },
  response: {
    status,
    data,
  },
});

describe('cliente API: interceptores HTTP', () => {
  let alertSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    getToken.mockResolvedValue('token-vigente');
    clearSession.mockResolvedValue(undefined);

    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('interceptor de solicitudes', () => {
    test('adjunta el token vigente en el encabezado Authorization', async () => {
      const config = {
        url: '/ventas',
        headers: {},
      };

      const resultado = await obtenerInterceptorSolicitud()(config);

      expect(getToken).toHaveBeenCalledTimes(1);
      expect(resultado).toBe(config);
      expect(resultado.headers.Authorization).toBe(
        'Bearer token-vigente',
      );
    });

    test('no consulta ni adjunta token durante el inicio de sesión', async () => {
      const config = {
        url: '/auth/login',
        headers: {},
      };

      const resultado = await obtenerInterceptorSolicitud()(config);

      expect(resultado).toBe(config);
      expect(resultado.headers.Authorization).toBeUndefined();
      expect(getToken).not.toHaveBeenCalled();
    });

    test('continúa la solicitud sin Authorization cuando no existe token', async () => {
      getToken.mockResolvedValue(null);

      const config = {
        url: '/ventas',
        headers: {},
      };

      const resultado = await obtenerInterceptorSolicitud()(config);

      expect(resultado).toBe(config);
      expect(resultado.headers.Authorization).toBeUndefined();
    });
  });

  describe('interceptor de respuestas', () => {
    test('redirige a cambiar contraseña cuando el servidor lo exige', async () => {
      const error = crearError(403, {
        code: 'DEBE_CAMBIAR_PASSWORD',
      });

      await expect(
        obtenerInterceptorRespuesta()(error),
      ).rejects.toBe(error);

      expect(resetTo).toHaveBeenCalledWith('CambiarPassword');
      expect(clearSession).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });

    test('cierra sesión cuando el token vigente ha expirado', async () => {
      const error = crearError(401);

      await expect(
        obtenerInterceptorRespuesta()(error),
      ).rejects.toBe(error);

      expect(getToken).toHaveBeenCalledTimes(1);
      expect(clearSession).toHaveBeenCalledTimes(1);
      expect(resetTo).toHaveBeenCalledWith('Login');

      expect(alertSpy).toHaveBeenCalledWith(
        'Sesión expirada',
        'Inicia sesión de nuevo para continuar.',
      );
    });

    test('cierra sesión cuando se revoca el acceso a la empresa', async () => {
      const error = crearError(403, {
        message: 'Sin acceso a esta empresa.',
      });

      await expect(
        obtenerInterceptorRespuesta()(error),
      ).rejects.toBe(error);

      expect(clearSession).toHaveBeenCalledTimes(1);
      expect(resetTo).toHaveBeenCalledWith('Login');

      expect(alertSpy).toHaveBeenCalledWith(
        'Acceso revocado',
        'Ya no tienes acceso a esta empresa.',
      );
    });

    test('no cierra la sesión nueva por una respuesta tardía de la anterior', async () => {
      getToken.mockResolvedValue('token-nuevo');

      const error = crearError(401, {}, {
        headers: {
          Authorization: 'Bearer token-anterior',
        },
      });

      await expect(
        obtenerInterceptorRespuesta()(error),
      ).rejects.toBe(error);

      expect(clearSession).not.toHaveBeenCalled();
      expect(resetTo).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });

    test('no cierra sesión por un error 401 del propio login', async () => {
      const error = crearError(401, {}, {
        url: '/auth/login',
        headers: {},
      });

      await expect(
        obtenerInterceptorRespuesta()(error),
      ).rejects.toBe(error);

      expect(getToken).not.toHaveBeenCalled();
      expect(clearSession).not.toHaveBeenCalled();
      expect(resetTo).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });

    test('no cierra sesión por errores que no sean de autenticación', async () => {
      const error = crearError(500, {
        message: 'Error interno del servidor',
      });

      await expect(
        obtenerInterceptorRespuesta()(error),
      ).rejects.toBe(error);

      expect(getToken).not.toHaveBeenCalled();
      expect(clearSession).not.toHaveBeenCalled();
      expect(resetTo).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });

    test('no cierra sesión si la respuesta no corresponde al token vigente', async () => {
      getToken.mockResolvedValue(null);

      const error = crearError(401);

      await expect(
        obtenerInterceptorRespuesta()(error),
      ).rejects.toBe(error);

      expect(clearSession).not.toHaveBeenCalled();
      expect(resetTo).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });

    test('evita ejecutar dos cierres de sesión simultáneos', async () => {
      const error1 = crearError(401);
      const error2 = crearError(401);

      const resultados = await Promise.allSettled([
        obtenerInterceptorRespuesta()(error1),
        obtenerInterceptorRespuesta()(error2),
      ]);

      expect(resultados).toHaveLength(2);
      expect(resultados.every(r => r.status === 'rejected')).toBe(true);

      expect(clearSession).toHaveBeenCalledTimes(1);
      expect(resetTo).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledTimes(1);
    });
  });
});

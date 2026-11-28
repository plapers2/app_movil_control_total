import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

jest.mock('../src/store/authStore', () => ({
  saveToken: jest.fn(),
  saveUsuario: jest.fn(),
  clearSession: jest.fn(),
}));

import client from '../src/api/client';
import {
  saveToken,
  saveUsuario,
  clearSession,
} from '../src/store/authStore';

import LoginScreen from '../src/screens/LoginScreen';

const crearRespuesta = ({
  usuario = {},
  empresas = [{ id: 1, nombre: 'Empresa de prueba' }],
  token = 'token-prueba',
} = {}) => ({
  data: {
    data: {
      token,
      usuario: {
        id: 10,
        nombre: 'Ana',
        ...usuario,
      },
      empresas,
    },
  },
});

describe('LoginScreen: inicio de sesión', () => {
  let screen;
  let navigation;
  let alertSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    client.post.mockReset();
    clearSession.mockReset().mockResolvedValue(undefined);
    saveToken.mockReset().mockResolvedValue(undefined);
    saveUsuario.mockReset().mockResolvedValue(undefined);

    navigation = {
      replace: jest.fn(),
    };

    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    if (screen) {
      ReactTestRenderer.act(() => {
        screen.unmount();
      });
      screen = null;
    }

    jest.restoreAllMocks();
  });

  const renderScreen = async () => {
    await ReactTestRenderer.act(async () => {
      screen = ReactTestRenderer.create(
        <LoginScreen navigation={navigation} />,
      );
    });

    return screen;
  };

  const cambiarCampo = async (placeholder, value) => {
    await ReactTestRenderer.act(async () => {
      screen.root
        .findByType(TextInput)
        .props.onChangeText(value);
    });
  };

  const cambiarCampoEspecifico = async (placeholder, value) => {
    await ReactTestRenderer.act(async () => {
      const campo = screen.root.findByProps({ placeholder });
      campo.props.onChangeText(value);
    });
  };

  const ingresar = async () => {
    await ReactTestRenderer.act(async () => {
      await screen.root
        .findByType(TouchableOpacity)
        .props.onPress();
    });
  };

  test('muestra los campos y el botón de inicio de sesión', async () => {
    await renderScreen();

    expect(screen.root.findByProps({ placeholder: 'Email' })).toBeDefined();

    expect(
      screen.root.findByProps({ placeholder: 'Contraseña' }),
    ).toBeDefined();

    expect(
      screen.root.findAllByType(Text).some(
        item => item.props.children === 'Ingresar',
      ),
    ).toBe(true);
  });

  test.each([
    ['', '', 'email y contraseña vacíos'],
    ['ana@correo.com', '', 'contraseña vacía'],
    ['', '12345678', 'email vacío'],
  ])('rechaza campos incompletos: %s (%s)', async (email, password) => {
    await renderScreen();

    await cambiarCampoEspecifico('Email', email);
    await cambiarCampoEspecifico('Contraseña', password);
    await ingresar();

    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'Completa todos los campos.',
    );

    expect(clearSession).not.toHaveBeenCalled();
    expect(client.post).not.toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  test('rechaza un correo electrónico inválido', async () => {
    await renderScreen();

    await cambiarCampoEspecifico('Email', 'correo-invalido');
    await cambiarCampoEspecifico('Contraseña', '12345678');
    await ingresar();

    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'El email no es válido.',
    );

    expect(clearSession).not.toHaveBeenCalled();
    expect(client.post).not.toHaveBeenCalled();
  });

  test('normaliza el correo y permite iniciar sesión correctamente', async () => {
    const respuesta = crearRespuesta();

    client.post.mockResolvedValue(respuesta);

    await renderScreen();

    await cambiarCampoEspecifico('Email', '  ANA@CORREO.COM  ');
    await cambiarCampoEspecifico('Contraseña', '12345678');
    await ingresar();

    expect(clearSession).toHaveBeenCalledTimes(1);

    expect(client.post).toHaveBeenCalledWith('/auth/login', {
      email: 'ana@correo.com',
      password: '12345678',
    });

    expect(saveToken).toHaveBeenCalledWith('token-prueba');
    expect(saveUsuario).toHaveBeenCalledWith(respuesta.data.data.usuario);

    expect(navigation.replace).toHaveBeenCalledWith(
      'SelectEmpresa',
      { empresas: respuesta.data.data.empresas },
    );

    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('redirige al cambio de contraseña si el usuario está obligado a cambiarla', async () => {
    const respuesta = crearRespuesta({
      usuario: {
        debe_cambiar_password: true,
      },
    });

    client.post.mockResolvedValue(respuesta);

    await renderScreen();

    await cambiarCampoEspecifico('Email', 'ana@correo.com');
    await cambiarCampoEspecifico('Contraseña', '12345678');
    await ingresar();

    expect(saveToken).toHaveBeenCalledWith('token-prueba');
    expect(saveUsuario).toHaveBeenCalledWith(respuesta.data.data.usuario);

    expect(navigation.replace).toHaveBeenCalledWith(
      'CambiarPassword',
    );
  });

  test('redirige al panel Superadmin cuando no tiene empresas', async () => {
    const respuesta = crearRespuesta({
      usuario: {
        es_superadmin: true,
      },
      empresas: [],
    });

    client.post.mockResolvedValue(respuesta);

    await renderScreen();

    await cambiarCampoEspecifico('Email', 'admin@correo.com');
    await cambiarCampoEspecifico('Contraseña', '12345678');
    await ingresar();

    expect(navigation.replace).toHaveBeenCalledWith('Superadmin');
    expect(saveToken).toHaveBeenCalledWith('token-prueba');
  });

  test('muestra el mensaje devuelto por el servidor ante credenciales incorrectas', async () => {
    client.post.mockRejectedValue({
      response: {
        data: {
          message: 'Credenciales incorrectas.',
        },
      },
    });

    await renderScreen();

    await cambiarCampoEspecifico('Email', 'ana@correo.com');
    await cambiarCampoEspecifico('Contraseña', 'incorrecta');
    await ingresar();

    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'Credenciales incorrectas.',
    );

    expect(saveToken).not.toHaveBeenCalled();
    expect(saveUsuario).not.toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  test('muestra un mensaje genérico cuando ocurre un error inesperado', async () => {
    client.post.mockRejectedValue(new Error('Error de conexión'));

    await renderScreen();

    await cambiarCampoEspecifico('Email', 'ana@correo.com');
    await cambiarCampoEspecifico('Contraseña', '12345678');
    await ingresar();

    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'Error al iniciar sesión.',
    );

    expect(navigation.replace).not.toHaveBeenCalled();
  });

  test('no envía la solicitud si falla la limpieza de la sesión anterior', async () => {
    clearSession.mockRejectedValue(
      new Error('No se pudo limpiar la sesión'),
    );

    await renderScreen();

    await cambiarCampoEspecifico('Email', 'ana@correo.com');
    await cambiarCampoEspecifico('Contraseña', '12345678');
    await ingresar();

    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(client.post).not.toHaveBeenCalled();
    expect(saveToken).not.toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalled();

    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'Error al iniciar sesión.',
    );
  });

  test('muestra el estado de carga y deshabilita el botón mientras espera', async () => {
    let resolver;

    client.post.mockReturnValue(
      new Promise(resolve => {
        resolver = resolve;
      }),
    );

    await renderScreen();

    await cambiarCampoEspecifico('Email', 'ana@correo.com');
    await cambiarCampoEspecifico('Contraseña', '12345678');

    let solicitud;

    await ReactTestRenderer.act(async () => {
      solicitud = screen.root
        .findByType(TouchableOpacity)
        .props.onPress();

      for (let i = 0; i < 5; i += 1) {
        await Promise.resolve();
      }
    });

    const boton = screen.root.findByType(TouchableOpacity);

    expect(boton.props.disabled).toBe(true);

    expect(
      screen.root.findAllByType(Text).some(
        item => item.props.children === 'Ingresando...',
      ),
    ).toBe(true);

    await ReactTestRenderer.act(async () => {
      resolver(crearRespuesta());
      await solicitud;
    });

    expect(
      screen.root.findByType(TouchableOpacity).props.disabled,
    ).toBe(false);
  });

  test('restablece el estado de carga después de un error', async () => {
    client.post.mockRejectedValue(new Error('Error de conexión'));

    await renderScreen();

    await cambiarCampoEspecifico('Email', 'ana@correo.com');
    await cambiarCampoEspecifico('Contraseña', '12345678');
    await ingresar();

    expect(
      screen.root.findByType(TouchableOpacity).props.disabled,
    ).toBe(false);

    expect(
      screen.root.findAllByType(Text).some(
        item => item.props.children === 'Ingresar',
      ),
    ).toBe(true);
  });
});

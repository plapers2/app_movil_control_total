import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('../src/store/authStore', () => ({
  saveToken: jest.fn(),
  saveEmpresa: jest.fn(),
  saveRol: jest.fn(),
  getUsuario: jest.fn(),
}));

jest.mock('../src/utils/errores', () => ({
  avisarError: jest.fn(),
}));

jest.mock('../src/utils/sesion', () => ({
  cerrarSesion: jest.fn(),
}));

import client from '../src/api/client';
import {
  saveToken,
  saveEmpresa,
  saveRol,
  getUsuario,
} from '../src/store/authStore';
import { avisarError } from '../src/utils/errores';
import { cerrarSesion } from '../src/utils/sesion';
import SelectEmpresaScreen from '../src/screens/SelectEmpresaScreen';

const crearMembresia = (id = 1) => ({
  id,
  empresas_id: id,
  empresas: {
    id,
    nombre: `Empresa ${id}`,
  },
  roles: {
    nombre: 'admin',
  },
});

const crearRespuestaSeleccion = (rol = 'admin') => ({
  data: {
    data: {
      token: 'token-empresa-nueva',
      rol,
    },
  },
});

describe('SelectEmpresaScreen: selección de empresa', () => {
  let screen;
  let navigation;
  let alertSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    client.get.mockReset();
    client.post.mockReset();

    saveToken.mockReset().mockResolvedValue(undefined);
    saveEmpresa.mockReset().mockResolvedValue(undefined);
    saveRol.mockReset().mockResolvedValue(undefined);
    getUsuario.mockReset().mockResolvedValue(null);

    avisarError.mockReset();
    cerrarSesion.mockReset();

    navigation = {
      dispatch: jest.fn(),
      navigate: jest.fn(),
      goBack: jest.fn(),
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

  const renderScreen = async (params = {}) => {
    await ReactTestRenderer.act(async () => {
      screen = ReactTestRenderer.create(
        <SelectEmpresaScreen
          navigation={navigation}
          route={{ params }}
        />,
      );

      for (let i = 0; i < 5; i += 1) {
        await Promise.resolve();
      }
    });

    return screen;
  };

  const obtenerLista = () => screen.root.findByType(FlatList);

  const seleccionar = async membresia => {
    const fila = obtenerLista().props.renderItem({
      item: membresia,
    });

    await ReactTestRenderer.act(async () => {
      await fila.props.onPress();
    });
  };

  test('muestra las empresas recibidas desde Login sin consultar /auth/me', async () => {
    const empresas = [
      crearMembresia(1),
      crearMembresia(2),
    ];

    await renderScreen({ empresas });

    expect(obtenerLista().props.data).toEqual(empresas);
    expect(client.get).not.toHaveBeenCalled();
    expect(getUsuario).toHaveBeenCalledTimes(1);
  });

  test('recupera las empresas desde /auth/me cuando no recibe parámetros', async () => {
    const empresas = [
      crearMembresia(3),
      crearMembresia(4),
    ];

    client.get.mockResolvedValue({
      data: {
        data: { empresas },
      },
    });

    await renderScreen();

    expect(client.get).toHaveBeenCalledWith('/auth/me');
    expect(obtenerLista().props.data).toEqual(empresas);
  });

  test('muestra el indicador mientras carga las empresas', async () => {
    let resolver;

    client.get.mockReturnValue(
      new Promise(resolve => {
        resolver = resolve;
      }),
    );

    await renderScreen();

    const lista = obtenerLista();

    expect(lista.props.data).toEqual([]);
    expect(lista.props.ListEmptyComponent.type).toBe(ActivityIndicator);

    await ReactTestRenderer.act(async () => {
      resolver({
        data: {
          data: {
            empresas: [crearMembresia(5)],
          },
        },
      });

      for (let i = 0; i < 5; i += 1) {
        await Promise.resolve();
      }
    });

    expect(obtenerLista().props.data).toEqual([
      crearMembresia(5),
    ]);
  });

  test('notifica el error si falla la recuperación de empresas', async () => {
    const error = new Error('Error de conexión');

    client.get.mockRejectedValue(error);

    await renderScreen();

    expect(avisarError).toHaveBeenCalledWith(
      error,
      'No se pudieron cargar tus empresas.',
    );

    const empty = obtenerLista().props.ListEmptyComponent;

    expect(empty.type).toBe(Text);
    expect(empty.props.children).toBe(
      'No perteneces a ninguna empresa activa.',
    );
  });

  test('muestra el mensaje de lista vacía cuando el servidor no devuelve empresas', async () => {
    client.get.mockResolvedValue({
      data: {
        data: { empresas: [] },
      },
    });

    await renderScreen();

    const empty = obtenerLista().props.ListEmptyComponent;

    expect(empty.type).toBe(Text);
    expect(empty.props.children).toBe(
      'No perteneces a ninguna empresa activa.',
    );
  });

  test('selecciona una empresa, guarda el nuevo token, empresa y rol, y reinicia la navegación', async () => {
    const membresia = crearMembresia(12);

    client.post.mockResolvedValue(
      crearRespuestaSeleccion('admin'),
    );

    await renderScreen({
      empresas: [membresia],
    });

    await seleccionar(membresia);

    expect(client.post).toHaveBeenCalledWith(
      '/auth/select-empresa',
      { empresas_id: 12 },
    );

    expect(saveToken).toHaveBeenCalledWith('token-empresa-nueva');
    expect(saveEmpresa).toHaveBeenCalledWith(membresia.empresas);
    expect(saveRol).toHaveBeenCalledWith('admin');

    expect(
      saveToken.mock.invocationCallOrder[0],
    ).toBeLessThan(saveEmpresa.mock.invocationCallOrder[0]);

    expect(
      saveEmpresa.mock.invocationCallOrder[0],
    ).toBeLessThan(saveRol.mock.invocationCallOrder[0]);

    expect(navigation.dispatch).toHaveBeenCalledWith(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'Main',
            params: { rol: 'admin' },
          },
        ],
      }),
    );

    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('muestra el mensaje del servidor cuando falla la selección', async () => {
    client.post.mockRejectedValue({
      response: {
        data: {
          message: 'No tienes acceso a esta empresa.',
        },
      },
    });

    await renderScreen({
      empresas: [crearMembresia(7)],
    });

    await seleccionar(crearMembresia(7));

    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'No tienes acceso a esta empresa.',
    );

    expect(saveToken).not.toHaveBeenCalled();
    expect(saveEmpresa).not.toHaveBeenCalled();
    expect(saveRol).not.toHaveBeenCalled();
    expect(navigation.dispatch).not.toHaveBeenCalled();
  });

  test('muestra un error genérico si falla la selección sin mensaje del servidor', async () => {
    client.post.mockRejectedValue(new Error('Error inesperado'));

    await renderScreen({
      empresas: [crearMembresia(8)],
    });

    await seleccionar(crearMembresia(8));

    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'No se pudo seleccionar la empresa.',
    );

    expect(navigation.dispatch).not.toHaveBeenCalled();
  });

  test('permite volver cuando la selección se inició desde un cambio de empresa', async () => {
    await renderScreen({
      empresas: [],
      desdeCambio: true,
    });

    const botonVolver = screen.root
      .findAllByType(TouchableOpacity)
      .find(boton => {
        const contenido = boton.props.children;
        return String(contenido?.props?.children).includes('Volver');
      });

    expect(botonVolver).toBeDefined();

    await ReactTestRenderer.act(async () => {
      botonVolver.props.onPress();
    });

    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('muestra el acceso a administración para un superadministrador', async () => {
    getUsuario.mockResolvedValue({
      id: 1,
      es_superadmin: true,
    });

    await renderScreen({
      empresas: [crearMembresia(9)],
    });

    const encabezado = obtenerLista().props.ListHeaderComponent;

    expect(encabezado).toBeDefined();
    expect(encabezado.type).toBe(TouchableOpacity);

    await ReactTestRenderer.act(async () => {
      encabezado.props.onPress();
    });

    expect(navigation.navigate).toHaveBeenCalledWith('Superadmin');
  });

  test('no muestra administración de empresas para un usuario normal', async () => {
    getUsuario.mockResolvedValue({
      id: 2,
      es_superadmin: false,
    });

    await renderScreen({
      empresas: [crearMembresia(10)],
    });

    expect(obtenerLista().props.ListHeaderComponent).toBeNull();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  test('permite solicitar el cierre de sesión desde el pie de la lista', async () => {
    await renderScreen({
      empresas: [crearMembresia(11)],
    });

    const footer = obtenerLista().props.ListFooterComponent;

    expect(footer.type).toBe(TouchableOpacity);

    await ReactTestRenderer.act(async () => {
      footer.props.onPress();
    });

    expect(cerrarSesion).toHaveBeenCalledTimes(1);
  });
});

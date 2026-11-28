import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { ActivityIndicator } from 'react-native';

jest.mock('../src/store/authStore', () => ({
  getToken: jest.fn(),
  getEmpresa: jest.fn(),
  getRol: jest.fn(),
  getUsuario: jest.fn(),
}));

jest.mock('../src/navigation/navigationRef', () => ({
  navigationRef: {},
}));

jest.mock('@react-navigation/native', () => {
  const React = require('react');

  return {
    NavigationContainer: ({ children }) =>
      React.createElement(React.Fragment, null, children),
  };
});

jest.mock('@react-navigation/native-stack', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Screen = ({ name, component }) =>
    React.createElement(View, {
      testID: `stack-screen-${name}`,
      screenName: name,
      screenComponent: component,
    });

  const Navigator = ({ initialRouteName, children }) =>
    React.createElement(
      View,
      {
        testID: 'stack-navigator',
        initialRouteName,
      },
      children,
    );

  return {
    createNativeStackNavigator: () => ({
      Navigator,
      Screen,
    }),
  };
});

jest.mock('@react-navigation/bottom-tabs', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Screen = ({ name, component }) =>
    React.createElement(View, {
      testID: `tab-screen-${name}`,
      tabName: name,
      screenComponent: component,
    });

  const Navigator = ({ children }) =>
    React.createElement(
      View,
      { testID: 'tab-navigator' },
      children,
    );

  return {
    createBottomTabNavigator: () => ({
      Navigator,
      Screen,
    }),
  };
});

jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcons');

import {
  getToken,
  getEmpresa,
  getRol,
  getUsuario,
} from '../src/store/authStore';

import AppNavigator from '../src/navigation/AppNavigator';

describe('AppNavigator: recuperación de sesión', () => {
  let screen;

  beforeEach(() => {
    jest.clearAllMocks();

    getToken.mockResolvedValue(null);
    getEmpresa.mockResolvedValue(null);
    getRol.mockResolvedValue(null);
    getUsuario.mockResolvedValue(null);
  });

  afterEach(() => {
    if (screen) {
      ReactTestRenderer.act(() => {
        screen.unmount();
      });
      screen = null;
    }
  });

  const renderNavigator = async () => {
    await ReactTestRenderer.act(async () => {
      screen = ReactTestRenderer.create(<AppNavigator />);

      for (let i = 0; i < 8; i += 1) {
        await Promise.resolve();
      }
    });

    return screen;
  };

  const obtenerRutaInicial = () =>
    screen.root.findByProps({
      testID: 'stack-navigator',
    }).props.initialRouteName;

  test.each([
    {
      caso: 'sin token',
      token: null,
      empresa: null,
      usuario: null,
      ruta: 'Login',
    },
    {
      caso: 'usuario obligado a cambiar contraseña',
      token: 'token-activo',
      empresa: { id: 5 },
      usuario: { debe_cambiar_password: true },
      ruta: 'CambiarPassword',
    },
    {
      caso: 'usuario con empresa seleccionada',
      token: 'token-activo',
      empresa: { id: 5 },
      usuario: { id: 10 },
      ruta: 'Main',
    },
    {
      caso: 'superadministrador sin empresa seleccionada',
      token: 'token-activo',
      empresa: null,
      usuario: { es_superadmin: true },
      ruta: 'Superadmin',
    },
    {
      caso: 'usuario autenticado sin empresa seleccionada',
      token: 'token-activo',
      empresa: null,
      usuario: { id: 10 },
      ruta: 'SelectEmpresa',
    },
    {
      caso: 'sin token aunque existan datos de empresa',
      token: null,
      empresa: { id: 5 },
      usuario: { id: 10 },
      ruta: 'Login',
    },
  ])(
    'elige correctamente la ruta inicial: $caso',
    async ({ token, empresa, usuario, ruta }) => {
      getToken.mockResolvedValue(token);
      getEmpresa.mockResolvedValue(empresa);
      getUsuario.mockResolvedValue(usuario);

      await renderNavigator();

      expect(obtenerRutaInicial()).toBe(ruta);

      expect(getToken).toHaveBeenCalledTimes(1);
      expect(getEmpresa).toHaveBeenCalledTimes(1);
      expect(getUsuario).toHaveBeenCalledTimes(1);
    },
  );

  test('muestra el indicador mientras recupera la sesión', async () => {
    let resolverToken;

    getToken.mockReturnValue(
      new Promise(resolve => {
        resolverToken = resolve;
      }),
    );

    ReactTestRenderer.act(() => {
      screen = ReactTestRenderer.create(<AppNavigator />);
    });

    expect(
      screen.root.findAllByType(ActivityIndicator).length,
    ).toBe(1);

    await ReactTestRenderer.act(async () => {
      resolverToken(null);

      for (let i = 0; i < 8; i += 1) {
        await Promise.resolve();
      }
    });

    expect(obtenerRutaInicial()).toBe('Login');
  });
});

describe('AppNavigator: pestañas según el rol', () => {
  let navigatorScreen;
  let tabsScreen;

  beforeEach(() => {
    jest.clearAllMocks();
    getRol.mockResolvedValue('empleado');
  });

  afterEach(() => {
    if (tabsScreen) {
      ReactTestRenderer.act(() => {
        tabsScreen.unmount();
      });
      tabsScreen = null;
    }

    if (navigatorScreen) {
      ReactTestRenderer.act(() => {
        navigatorScreen.unmount();
      });
      navigatorScreen = null;
    }
  });

  const obtenerComponenteMain = async () => {
    await ReactTestRenderer.act(async () => {
      navigatorScreen = ReactTestRenderer.create(<AppNavigator />);

      for (let i = 0; i < 8; i += 1) {
        await Promise.resolve();
      }
    });

    return navigatorScreen.root.findByProps({
      testID: 'stack-screen-Main',
    }).props.screenComponent;
  };

  const renderTabs = async (MainTabs, rol) => {
    await ReactTestRenderer.act(async () => {
      tabsScreen = ReactTestRenderer.create(
        React.createElement(MainTabs, {
          route: {
            params: rol ? { rol } : {},
          },
        }),
      );

      for (let i = 0; i < 8; i += 1) {
        await Promise.resolve();
      }
    });
  };

  const obtenerNombresTabs = () => [
    ...new Set(
      tabsScreen.root
        .findAll(node => typeof node.props.tabName === 'string')
        .map(node => node.props.tabName),
    ),
  ];

  test('el administrador recibe todas las pestañas habilitadas', async () => {
    const MainTabs = await obtenerComponenteMain();

    await renderTabs(MainTabs, 'admin');

    expect(obtenerNombresTabs()).toEqual([
      'Home',
      'Ventas',
      'Insumos',
      'Productos',
      'Produccion',
      'Clientes',
      'Caja',
    ]);

    expect(getRol).not.toHaveBeenCalled();
  });

  test('el empleado no recibe la pestaña Insumos', async () => {
    const MainTabs = await obtenerComponenteMain();

    await renderTabs(MainTabs, 'empleado');

    expect(obtenerNombresTabs()).toEqual([
      'Home',
      'Ventas',
      'Productos',
      'Produccion',
      'Clientes',
      'Caja',
    ]);

    expect(obtenerNombresTabs()).not.toContain('Insumos');
    expect(getRol).not.toHaveBeenCalled();
  });

  test('recupera el rol guardado cuando la navegación no recibe parámetros', async () => {
    getRol.mockResolvedValue('admin');

    const MainTabs = await obtenerComponenteMain();

    await renderTabs(MainTabs, null);

    expect(getRol).toHaveBeenCalledTimes(1);

    expect(obtenerNombresTabs()).toContain('Insumos');
    expect(obtenerNombresTabs()).toContain('Caja');
  });
});



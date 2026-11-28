import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {
  Alert,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    defaults: {
      baseURL: 'http://10.0.2.2:3000/api/',
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../src/store/authStore', () => ({
  getRol: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: callback => {
    const React = require('react');
    React.useEffect(callback, [callback]);
  },
}));

jest.mock('../src/components/FiltroPeriodo', () => () => null);

jest.mock('../src/components/BotonVerMas', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');

  return ({ onPress, loading, visible }) =>
    visible
      ? React.createElement(
          TouchableOpacity,
          {
            testID: 'boton-ver-mas',
            onPress,
            disabled: loading,
          },
          React.createElement(
            Text,
            null,
            loading ? 'Cargando...' : 'Ver más',
          ),
        )
      : null;
});

jest.mock('../src/components/KeyboardView', () => {
  const React = require('react');
  const { View } = require('react-native');

  return ({ children }) =>
    React.createElement(View, null, children);
});

jest.mock('../src/components/ModalAnular', () => {
  const React = require('react');
  const { View, Text, TextInput, TouchableOpacity } = require('react-native');

  return ({
    visible,
    titulo,
    motivo,
    onChangeMotivo,
    anulando,
    onConfirmar,
    onCerrar,
    textoBoton,
  }) =>
    visible
      ? React.createElement(
          View,
          { testID: 'mock-modal-anular' },
          React.createElement(Text, null, titulo),
          React.createElement(TextInput, {
            testID: 'motivo-anulacion',
            value: motivo,
            onChangeText: onChangeMotivo,
          }),
          React.createElement(
            TouchableOpacity,
            {
              testID: 'confirmar-anulacion',
              onPress: onConfirmar,
              disabled: anulando,
            },
            React.createElement(
              Text,
              null,
              anulando ? 'Anulando...' : textoBoton,
            ),
          ),
          React.createElement(
            TouchableOpacity,
            {
              testID: 'cerrar-modal-anular',
              onPress: onCerrar,
            },
            React.createElement(Text, null, 'Cancelar'),
          ),
        )
      : null;
});

jest.mock('../src/components/SelectorProductoModal', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');

  return ({
    visible,
    productos,
    items,
    onAgregar,
    onQuitar,
    onClose,
  }) => {
    if (!visible) return null;

    return React.createElement(
      View,
      { testID: 'mock-selector-productos' },
      ...productos
        .filter(producto => producto.activo)
        .map(producto => {
          const seleccionado = items.some(
            item => item.productos_id === producto.id,
          );

          return React.createElement(
            TouchableOpacity,
            {
              key: String(producto.id),
              testID: `selector-producto-${producto.id}`,
              onPress: () =>
                seleccionado
                  ? onQuitar(producto.id)
                  : onAgregar(producto),
            },
            React.createElement(Text, null, producto.nombre),
          );
        }),
      React.createElement(
        TouchableOpacity,
        {
          testID: 'cerrar-selector-productos',
          onPress: onClose,
        },
        React.createElement(Text, null, 'Listo'),
      ),
    );
  };
});

jest.mock('../src/utils/date', () => ({
  getFechaHoyLocal: jest.fn(() => '2026-11-28'),
  fmtFecha: jest.fn(() => '28/11/2026'),
}));

jest.mock('../src/utils/errores', () => ({
  avisarError: jest.fn(),
}));

import client from '../src/api/client';
import { getRol } from '../src/store/authStore';
import VentasScreen from '../src/screens/VentasScreen';

const PRODUCTOS = [
  {
    id: 1,
    nombre: 'Arepa de queso',
    precio_venta: 5000,
    activo: true,
  },
  {
    id: 2,
    nombre: 'Arepa de choclo',
    precio_venta: 7000,
    activo: true,
  },
];

const CLIENTE = {
  id: 15,
  nombre: 'Cliente de prueba',
  telefono: '3001234567',
  saldo_favor: 0,
};

const flushPromises = async () => {
  for (let i = 0; i < 12; i += 1) {
    await Promise.resolve();
  }
};

describe('VentasScreen: creación de ventas', () => {
  let screen;
  let alertSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    getRol.mockResolvedValue('admin');

    client.get.mockImplementation(async url => {
      if (url.startsWith('/ventas?')) {
        return {
          data: {
            data: [],
            meta: { pages: 1 },
          },
        };
      }

      if (url === '/productos') {
        return {
          data: { data: PRODUCTOS },
        };
      }

      if (url === '/clientes') {
        return {
          data: { data: [CLIENTE] },
        };
      }

      throw new Error(`GET no esperado en la prueba: ${url}`);
    });

    client.post.mockResolvedValue({ data: { data: {} } });

    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    if (screen) {
      ReactTestRenderer.act(() => {
        screen.unmount();
      });
      screen = null;
    }

    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const renderScreen = async () => {
    await ReactTestRenderer.act(async () => {
      screen = ReactTestRenderer.create(<VentasScreen />);
      await flushPromises();
    });

    return screen;
  };

  const buscarBoton = predicate =>
    screen.root
      .findAllByType(TouchableOpacity)
      .find(boton =>
        boton.findAllByType(Text).some(texto => {
          const contenido = texto.props.children;
          return typeof contenido === 'string' && predicate(contenido);
        }),
      );

  const pulsarBoton = async predicate => {
    const boton = buscarBoton(predicate);

    if (!boton) {
      throw new Error('No se encontró el botón esperado en VentasScreen.');
    }

    await ReactTestRenderer.act(async () => {
      await boton.props.onPress();
      await flushPromises();
    });
  };

  const abrirNuevaVenta = () =>
    pulsarBoton(texto => texto.includes('Nueva venta'));

  const agregarProducto = async (id = 1) => {
    await pulsarBoton(texto =>
      texto.includes('buscar y agregar productos'),
    );

    await ReactTestRenderer.act(async () => {
      screen.root
        .findByProps({ testID: `selector-producto-${id}` })
        .props.onPress();

      await flushPromises();
    });

    await ReactTestRenderer.act(async () => {
      screen.root
        .findByProps({ testID: 'cerrar-selector-productos' })
        .props.onPress();
    });
  };

  const buscarInput = predicate =>
    screen.root.findAllByType(TextInput).find(predicate);

  const cambiarCantidad = async valor => {
    const input = buscarInput(campo => campo.props.value === '1');

    if (!input) {
      throw new Error('No se encontró el campo de cantidad del producto.');
    }

    await ReactTestRenderer.act(async () => {
      input.props.onChangeText(valor);
    });
  };

  const guardarVenta = () =>
    pulsarBoton(texto => texto.includes('Registrar venta'));

  const seleccionarCliente = async cliente => {
    await pulsarBoton(texto => texto.includes('Sin cliente'));

    const lista = screen.root
      .findAllByType(FlatList)
      .find(flatList =>
        flatList.props.data?.some(item => item.id === cliente.id),
      );

    if (!lista) {
      throw new Error('No se encontró la lista de clientes.');
    }

    const fila = lista.props.renderItem({ item: cliente });

    await ReactTestRenderer.act(async () => {
      await fila.props.onPress();
      await flushPromises();
    });
  };

  test('muestra la pantalla de ventas después de cargar los datos iniciales', async () => {
    await renderScreen();

    expect(
      screen.root.findAllByType(Text).some(
        item => item.props.children === 'Ventas',
      ),
    ).toBe(true);

    expect(client.get).toHaveBeenCalledWith(
      expect.stringContaining('/ventas?'),
    );

    expect(client.get).toHaveBeenCalledWith('/productos');
    expect(client.get).toHaveBeenCalledWith('/clientes');
    expect(getRol).toHaveBeenCalledTimes(1);
  });

  test('impide guardar una venta sin productos', async () => {
    await renderScreen();
    await abrirNuevaVenta();
    await guardarVenta();

    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'Agrega al menos un producto.',
    );

    expect(client.post).not.toHaveBeenCalled();
  });

  test('impide cantidades decimales o menores que uno', async () => {
    await renderScreen();
    await abrirNuevaVenta();
    await agregarProducto();

    await cambiarCantidad('1.5');
    await guardarVenta();

    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'Revisa las cantidades, deben ser números enteros mayores a 0.',
    );

    expect(client.post).not.toHaveBeenCalled();
  });

  test('impide registrar una venta a crédito sin cliente', async () => {
    await renderScreen();
    await abrirNuevaVenta();
    await agregarProducto();

    await pulsarBoton(texto => texto === 'A crédito');
    await guardarVenta();

    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'Para una venta a crédito debes asignar un cliente.',
    );

    expect(client.post).not.toHaveBeenCalled();
  });

  test('impide un abono inicial superior al total de la venta', async () => {
    await renderScreen();
    await abrirNuevaVenta();
    await agregarProducto();
    await seleccionarCliente(CLIENTE);

    await pulsarBoton(texto => texto === 'A crédito');

    const inputAbono = buscarInput(
      campo => campo.props.placeholder === '0',
    );

    expect(inputAbono).toBeDefined();

    await ReactTestRenderer.act(async () => {
      inputAbono.props.onChangeText('6000');
    });

    await guardarVenta();

    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'El abono no puede ser mayor al total de la venta.',
    );

    expect(client.post).not.toHaveBeenCalled();
  });

  test('registra correctamente una venta de contado en punto de venta', async () => {
    await renderScreen();
    await abrirNuevaVenta();
    await agregarProducto();

    await guardarVenta();

    expect(client.post).toHaveBeenCalledWith('/ventas', {
      fecha: '2026-11-28',
      canal: 'punto_venta',
      valor_domicilio: 0,
      clientes_id: null,
      credito: false,
      saldo_usado: 0,
      abono_inicial: undefined,
      items: [
        {
          productos_id: 1,
          cantidad: 1,
          precio_unitario: 5000,
        },
      ],
    });

    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('registra correctamente una venta a domicilio con el valor predeterminado', async () => {
    await renderScreen();
    await abrirNuevaVenta();
    await agregarProducto();

    await pulsarBoton(texto => texto === 'Domicilio');

    const inputDomicilio = buscarInput(
      campo => campo.props.placeholder === '3000',
    );

    expect(inputDomicilio).toBeDefined();
    expect(inputDomicilio.props.value).toBe('3000');

    await guardarVenta();

    expect(client.post).toHaveBeenCalledWith(
      '/ventas',
      expect.objectContaining({
        canal: 'domicilio',
        valor_domicilio: 3000,
        items: [
          {
            productos_id: 1,
            cantidad: 1,
            precio_unitario: 5000,
          },
        ],
      }),
    );
  });

  test('rechaza un valor de domicilio inválido', async () => {
    await renderScreen();
    await abrirNuevaVenta();
    await agregarProducto();
    await pulsarBoton(texto => texto === 'Domicilio');

    const inputDomicilio = buscarInput(
      campo => campo.props.placeholder === '3000',
    );

    await ReactTestRenderer.act(async () => {
      inputDomicilio.props.onChangeText('abc');
    });

    await guardarVenta();

    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'El valor del domicilio no es válido.',
    );

    expect(client.post).not.toHaveBeenCalled();
  });

  test('registra una venta a crédito con cliente y abono inicial', async () => {
    await renderScreen();
    await abrirNuevaVenta();
    await agregarProducto();
    await seleccionarCliente(CLIENTE);

    await pulsarBoton(texto => texto === 'A crédito');

    const inputAbono = buscarInput(
      campo => campo.props.placeholder === '0',
    );

    await ReactTestRenderer.act(async () => {
      inputAbono.props.onChangeText('1000');
    });

    await guardarVenta();

    expect(client.post).toHaveBeenCalledWith(
      '/ventas',
      expect.objectContaining({
        canal: 'punto_venta',
        clientes_id: CLIENTE.id,
        credito: true,
        abono_inicial: 1000,
        saldo_usado: 0,
      }),
    );
  });

  test('consumo propio registra el canal correcto y no genera cobro', async () => {
    await renderScreen();
    await abrirNuevaVenta();
    await agregarProducto();

    await pulsarBoton(texto => texto === 'Consumo propio');

    expect(
      screen.root.findAllByType(Text).some(
        item => item.props.children === 'Sin costo',
      ),
    ).toBe(true);

    await pulsarBoton(texto =>
      texto.includes('Registrar consumo propio'),
    );

    expect(client.post).toHaveBeenCalledWith(
      '/ventas',
      expect.objectContaining({
        canal: 'consumo_propio',
        valor_domicilio: 0,
        clientes_id: null,
        credito: false,
        saldo_usado: 0,
        items: [
          {
            productos_id: 1,
            cantidad: 1,
            precio_unitario: 5000,
          },
        ],
      }),
    );
  });

  test('consumo propio desactiva el crédito y elimina el cliente seleccionado', async () => {
    await renderScreen();
    await abrirNuevaVenta();
    await agregarProducto();
    await seleccionarCliente(CLIENTE);

    await pulsarBoton(texto => texto === 'A crédito');
    await pulsarBoton(texto => texto === 'Consumo propio');

    await pulsarBoton(texto =>
      texto.includes('Registrar consumo propio'),
    );

    expect(client.post).toHaveBeenCalledWith(
      '/ventas',
      expect.objectContaining({
        canal: 'consumo_propio',
        clientes_id: null,
        credito: false,
        abono_inicial: undefined,
        saldo_usado: 0,
      }),
    );
  });

  test('limita el saldo a favor aplicado al total de la venta', async () => {
    const clienteConSaldo = {
      ...CLIENTE,
      saldo_favor: 8000,
    };

    jest.useFakeTimers();

    await renderScreen();
    await abrirNuevaVenta();
    await agregarProducto();
    await seleccionarCliente(clienteConSaldo);

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(400);
      await flushPromises();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Saldo a favor',
      expect.stringContaining(clienteConSaldo.nombre),
      expect.any(Array),
    );

    const acciones = alertSpy.mock.calls[0][2];

    await ReactTestRenderer.act(async () => {
      acciones[1].onPress();
      await flushPromises();
    });

    await guardarVenta();

    expect(client.post).toHaveBeenCalledWith(
      '/ventas',
      expect.objectContaining({
        clientes_id: clienteConSaldo.id,
        saldo_usado: 5000,
      }),
    );
  });

  test('conserva el formulario y muestra el error si el servidor rechaza el registro', async () => {
    client.post.mockRejectedValue({
      response: {
        data: {
          message: 'Stock insuficiente.',
        },
      },
    });

    await renderScreen();
    await abrirNuevaVenta();
    await agregarProducto();
    await guardarVenta();

    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'Stock insuficiente.',
    );

    expect(
      screen.root.findAllByType(Text).some(
        item => item.props.children === 'Arepa de queso',
      ),
    ).toBe(true);

    expect(
      screen.root.findAllByType(Text).some(
        item => item.props.children === 'Registrar venta · $5.000',
      ),
    ).toBe(true);
  });
  test('abre el detalle de una venta al seleccionar su tarjeta', async () => {
    const venta = {
      id: 77,
      fecha: '2026-11-28',
      canal: 'punto_venta',
      total: 5000,
      valor_domicilio: 0,
      estado_pago: 'pagada',
      notas: null,
      clientes: null,
      ventas_items: [
        {
          id: 1,
          productos_id: 1,
          cantidad: 1,
          precio_unitario: 5000,
          subtotal: 5000,
          productos: { nombre: 'Arepa de queso' },
        },
      ],
    };

    client.get.mockImplementation(async url => {
      if (url.startsWith('/ventas?')) {
        return { data: { data: [venta], meta: { pages: 1 } } };
      }
      if (url === '/productos') {
        return { data: { data: PRODUCTOS } };
      }
      if (url === '/clientes') {
        return { data: { data: [CLIENTE] } };
      }
      if (url === '/ventas/77') {
        return { data: { data: venta } };
      }
      throw new Error(`GET no esperado: ${url}`);
    });

    await renderScreen();

    const tarjeta = screen.root
      .findAllByType(TouchableOpacity)
      .find(boton =>
        boton.findAllByType(Text).some(
          texto => (Array.isArray(texto.props.children) ? texto.props.children.join('') : texto.props.children) === 'Venta #77',
        ),
      );

    expect(tarjeta).toBeDefined();

    await ReactTestRenderer.act(async () => {
      await tarjeta.props.onPress();
      await flushPromises();
    });

    expect(client.get).toHaveBeenCalledWith('/ventas/77');

    expect(
      screen.root.findAllByType(Text).some(
        texto => (Array.isArray(texto.props.children) ? texto.props.children.join('') : texto.props.children) === 'Venta #77',
      ),
    ).toBe(true);

    expect(
      screen.root.findAllByType(Text).some(
        texto => texto.props.children === 'Arepa de queso',
      ),
    ).toBe(true);
  });

  test('maneja el error al cargar el detalle de una venta', async () => {
    const venta = {
      id: 78,
      fecha: '2026-11-28',
      canal: 'punto_venta',
      total: 5000,
      valor_domicilio: 0,
      ventas_items: [],
    };

    client.get.mockImplementation(async url => {
      if (url.startsWith('/ventas?')) {
        return { data: { data: [venta], meta: { pages: 1 } } };
      }
      if (url === '/productos') {
        return { data: { data: PRODUCTOS } };
      }
      if (url === '/clientes') {
        return { data: { data: [CLIENTE] } };
      }
      if (url === '/ventas/78') {
        throw new Error('Error de prueba al cargar detalle');
      }
      throw new Error(`GET no esperado: ${url}`);
    });

    await renderScreen();

    const tarjeta = screen.root
      .findAllByType(TouchableOpacity)
      .find(boton =>
        boton.findAllByType(Text).some(
          texto => (Array.isArray(texto.props.children) ? texto.props.children.join('') : texto.props.children) === 'Venta #78',
        ),
      );

    await ReactTestRenderer.act(async () => {
      await tarjeta.props.onPress();
      await flushPromises();
    });

    const { avisarError } = require('../src/utils/errores');

    expect(avisarError).toHaveBeenCalledWith(
      expect.any(Error),
      'No se pudo cargar el detalle.',
    );
  });
});




/* global jest, beforeEach, afterEach, describe, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import RentabilidadScreen from '../src/screens/RentabilidadScreen';
import client from '../src/api/client';

jest.mock('@react-navigation/native', () => {
  const ReactModule = require('react');

  return {
    useNavigation: () => ({ goBack: jest.fn() }),
    useFocusEffect: callback => ReactModule.useEffect(callback, [callback]),
  };
});

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('../src/components/FiltroPeriodo', () => () => null);

jest.mock('../src/utils/formato', () => ({
  fmt: valor => `$${Number(valor)}`,
  fmtPct: valor => `${Number(valor) * 100}%`,
}));

let renderer = null;

const productoBase = {
  productos_id: 1,
  nombre: 'Arepa de prueba',
  unidadesVendidas: 1,
  ingreso: 10000,

  costoDirectoUnitario: 1000,
  costoDirectoTotal: 1000,
  costoDirectoEstimado: false,
  costoDirectoNoVerificable: false,

  costoConVariableUnitario: 2000,
  costoConVariableTotal: 2000,
  costoConVariableEstimado: false,
  costoConVariableNoVerificable: false,
  indirectoEstimado: false,

  utilidadDirecta: 9000,
  utilidadConVariable: 8000,
  margenDirecto: 0.9,
  margenConVariable: 0.8,
};

const productoSinDirecto = {
  ...productoBase,
  productos_id: 2,
  nombre: 'Producto sin costo verificable',

  costoDirectoUnitario: null,
  costoDirectoTotal: null,
  costoDirectoEstimado: false,
  costoDirectoNoVerificable: true,

  costoConVariableUnitario: null,
  costoConVariableTotal: null,
  costoConVariableEstimado: false,
  costoConVariableNoVerificable: true,

  utilidadDirecta: null,
  utilidadConVariable: null,
  margenDirecto: null,
  margenConVariable: null,
};

const productoSinIndirecto = {
  ...productoBase,
  productos_id: 3,
  nombre: 'Producto sin costo de agua',

  costoDirectoUnitario: 500,
  costoDirectoTotal: 500,
  utilidadDirecta: 9500,
  margenDirecto: 0.95,

  costoConVariableUnitario: null,
  costoConVariableTotal: null,
  costoConVariableEstimado: false,
  costoConVariableNoVerificable: true,

  utilidadConVariable: null,
  margenConVariable: null,
};

const renderizar = async productos => {
  client.get.mockResolvedValueOnce({
    data: {
      data: {
        productos,
        indirectos: {},
        consumoPropio: {
          unidades: 0,
          costoDirecto: 0,
          costoConVariable: 0,
          estimado: false,
          noVerificable: false,
        },
      },
    },
  });

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<RentabilidadScreen />);
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  return renderer;
};

const textoCompleto = nodo => {
  if (Array.isArray(nodo)) {
    return nodo.map(textoCompleto).join('');
  }

  if (nodo == null || typeof nodo === 'boolean') {
    return '';
  }

  if (typeof nodo === 'object') {
    return textoCompleto(nodo.children);
  }

  return String(nodo);
};

const valorResumen = (nodo, etiqueta) => {
  if (!nodo || typeof nodo !== 'object') return null;

  if (nodo.type === 'View' && Array.isArray(nodo.children)) {
    const textos = nodo.children.filter(hijo => hijo?.type === 'Text');

    const tieneEtiqueta = textos.some(
      hijo => textoCompleto(hijo.children) === etiqueta,
    );

    if (tieneEtiqueta) {
      const valor = textos.find(
        hijo => textoCompleto(hijo.children) !== etiqueta,
      );

      return valor ? textoCompleto(valor.children) : null;
    }
  }

  for (const hijo of nodo.children ?? []) {
    const resultado = valorResumen(hijo, etiqueta);
    if (resultado !== null) return resultado;
  }

  return null;
};

beforeEach(() => {
  jest.clearAllMocks();
  renderer = null;
});

afterEach(() => {
  if (renderer) {
    ReactTestRenderer.act(() => {
      renderer.unmount();
    });

    renderer = null;
  }
});

describe('RentabilidadScreen - costos y verificabilidad', () => {
  test('muestra los costos y la utilidad cuando son verificables', async () => {
    await renderizar([productoBase]);

    const pantalla = textoCompleto(renderer.toJSON());

    expect(pantalla).toContain('Arepa de prueba');
    expect(pantalla).toContain('$1000 / unidad');
    expect(pantalla).toContain('$2000 / unidad');
    expect(pantalla).toContain('$8000');
    expect(pantalla).toContain('80%');

    expect(
      valorResumen(renderer.toJSON(), 'Utilidad'),
    ).toBe('$8000');
  });

  test('identifica los costos historicos como estimados', async () => {
    const estimado = {
      ...productoBase,
      costoDirectoUnitario: 700,
      costoDirectoTotal: 700,
      costoDirectoEstimado: true,
      costoConVariableUnitario: 900,
      costoConVariableTotal: 900,
      costoConVariableEstimado: true,
      utilidadDirecta: 9300,
      utilidadConVariable: 9100,
      margenDirecto: 0.93,
      margenConVariable: 0.91,
    };

    await renderizar([estimado]);

    const pantalla = textoCompleto(renderer.toJSON());

    expect(pantalla).toContain('$700 / unidad \u00b7 estimado');
    expect(pantalla).toContain('$900 / unidad \u00b7 estimado');
    expect(pantalla).toContain('$9100');
    expect(pantalla).toContain('91%');

    expect(
      valorResumen(renderer.toJSON(), 'Utilidad'),
    ).toBe('$9100');
  });

  test('muestra costos y utilidad no verificables cuando falta el costo directo', async () => {
    await renderizar([productoSinDirecto]);

    const pantalla = textoCompleto(renderer.toJSON());

    expect(pantalla).toContain('No verificable');
    expect(pantalla).not.toContain('$0');

    expect(
      valorResumen(renderer.toJSON(), 'Costo + variable'),
    ).toBe('No verificable');

    expect(
      valorResumen(renderer.toJSON(), 'Utilidad'),
    ).toBe('No verificable');
  });

  test('conserva el costo directo cuando falta un servicio publico, pero no inventa la utilidad combinada', async () => {
    await renderizar([productoSinIndirecto]);

    const pantalla = textoCompleto(renderer.toJSON());

    expect(pantalla).toContain('$500 / unidad');
    expect(pantalla).toContain('Margen: No verificable (solo insumos: 95%)');
    expect(pantalla).toContain('No verificable');

    expect(
      valorResumen(renderer.toJSON(), 'Costo + variable'),
    ).toBe('No verificable');

    expect(
      valorResumen(renderer.toJSON(), 'Utilidad'),
    ).toBe('No verificable');

    expect(pantalla).toContain('95%');
  });

  test('no calcula un resumen general si uno de los productos no es verificable', async () => {
    await renderizar([productoBase, productoSinDirecto]);

    expect(
      valorResumen(renderer.toJSON(), 'Costo + variable'),
    ).toBe('No verificable');

    expect(
      valorResumen(renderer.toJSON(), 'Utilidad'),
    ).toBe('No verificable');
  });
});
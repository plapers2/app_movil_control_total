import { fmt, fmtPct } from '../src/utils/formato';
import { paramsFecha } from '../src/utils/query';
import { toFechaLocal, fmtFecha } from '../src/utils/date';
import { normalizar, coincide } from '../src/utils/texto';

describe('formato', () => {
  test('fmt da formato de pesos colombianos', () => {
    expect(fmt(1500)).toBe('$1.500');
    expect(fmt(0)).toBe('$0');
    expect(fmt(null)).toBe('$0');
  });
  test('fmtPct convierte proporción a porcentaje', () => {
    expect(fmtPct(0.256)).toBe('25.6%');
    expect(fmtPct(undefined)).toBe('0.0%');
  });
});

describe('paramsFecha', () => {
  test('solo periodo', () => {
    expect(paramsFecha({ periodo: 'dia' }).toString()).toBe('periodo=dia');
  });
  test('rango personalizado', () => {
    const qp = paramsFecha({
      periodo: 'rango',
      desde: '2026-11-01',
      hasta: '2026-11-23',
    });
    expect(qp.get('desde')).toBe('2026-11-01');
    expect(qp.get('hasta')).toBe('2026-11-23');
  });
  test('no manda desde/hasta si falta uno', () => {
    const qp = paramsFecha({ periodo: 'rango', desde: '2026-11-01' });
    expect(qp.has('desde')).toBe(false);
  });
  test('texto de búsqueda se recorta y se omite si está vacío', () => {
    expect(paramsFecha({ periodo: 'mes' }, '  arepa ').get('q')).toBe('arepa');
    expect(paramsFecha({ periodo: 'mes' }, '   ').has('q')).toBe(false);
  });
});

describe('date', () => {
  test('toFechaLocal usa hora de Colombia (UTC-5)', () => {
    // 03:00 UTC del 24 = 22:00 del 23 en Colombia
    expect(toFechaLocal(new Date('2026-11-24T03:00:00Z'))).toBe('2026-11-23');
    expect(toFechaLocal(new Date('2026-11-24T05:00:00Z'))).toBe('2026-11-24');
  });
  test('fmtFecha no corre el día de una fecha guardada', () => {
    expect(fmtFecha('2026-09-10T00:00:00.000Z')).toBe('10/09/2026');
  });
});

describe('texto', () => {
  test('normalizar quita tildes y mayúsculas', () => {
    expect(normalizar('José Pérez')).toBe('jose perez');
  });
  test('coincide ignora tildes y query vacío coincide con todo', () => {
    expect(coincide('Arepa de Choclo', 'CHOCLÓ')).toBe(true);
    expect(coincide('Arepa', '')).toBe(true);
    expect(coincide('Arepa', 'queso')).toBe(false);
  });
});

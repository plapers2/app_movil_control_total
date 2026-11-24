import {
  validarEmail,
  validarPassword,
  esFechaValida,
  aNumero,
  aDinero,
} from '../src/utils/validar';

describe('validarEmail', () => {
  test('acepta emails normales y con espacios alrededor', () => {
    expect(validarEmail('ana@correo.com')).toBe(true);
    expect(validarEmail('  ana@correo.com ')).toBe(true);
  });
  test('rechaza emails inválidos', () => {
    expect(validarEmail('ana')).toBe(false);
    expect(validarEmail('ana@correo')).toBe(false);
    expect(validarEmail('')).toBe(false);
    expect(validarEmail(null)).toBe(false);
  });
});

describe('validarPassword', () => {
  test('exige mínimo 8 caracteres', () => {
    expect(validarPassword('1234567')).toBe(false);
    expect(validarPassword('12345678')).toBe(true);
  });
});

describe('esFechaValida', () => {
  test('acepta fechas reales', () => {
    expect(esFechaValida('2026-11-23')).toBe(true);
    expect(esFechaValida('2028-02-29')).toBe(true); // bisiesto
  });
  test('rechaza formato incorrecto y fechas inexistentes', () => {
    expect(esFechaValida('2026-02-31')).toBe(false);
    expect(esFechaValida('2027-02-29')).toBe(false);
    expect(esFechaValida('23/11/2026')).toBe(false);
    expect(esFechaValida('2026-1-5')).toBe(false);
  });
});

describe('aNumero (cantidades)', () => {
  test('acepta punto o coma decimal', () => {
    expect(aNumero('0.5')).toBe(0.5);
    expect(aNumero('0,5')).toBe(0.5);
  });
  test('vacío es 0 y texto inválido es NaN', () => {
    expect(aNumero('')).toBe(0);
    expect(aNumero(null)).toBe(0);
    expect(aNumero('abc')).toBeNaN();
  });
});

describe('aDinero (pesos)', () => {
  test('el punto es separador de miles', () => {
    expect(aDinero('1.500')).toBe(1500);
    expect(aDinero('1500')).toBe(1500);
    expect(aDinero('$ 2.000')).toBe(2000);
    expect(aDinero('1.250.000')).toBe(1250000);
  });
  test('la coma es decimal', () => {
    expect(aDinero('1.500,50')).toBe(1500.5);
  });
  test('vacío es 0 y texto inválido es NaN', () => {
    expect(aDinero('')).toBe(0);
    expect(aDinero('abc')).toBeNaN();
  });
});

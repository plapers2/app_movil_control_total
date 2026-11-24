import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { getFechaHoyLocal } from '../utils/date';
import { esFechaValida } from '../utils/validar';

const OPCIONES = [
  { key: 'dia', label: 'Día' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
  { key: 'total', label: 'Total' },
  { key: 'rango', label: 'Rango' },
];

// Filtro de periodo reutilizado en Home y Caja.
// - dia/semana/mes: rangos ya calculados por el backend.
// - total: todo lo registrado en el sistema, sin filtro de fecha.
// - rango: el usuario escribe un desde/hasta (YYYY-MM-DD) y presiona Aplicar.
//
// onChange recibe siempre un objeto: { periodo } o { periodo: 'rango', desde, hasta }.
const FiltroPeriodo = ({ periodo, onChange }) => {
  const [mostrarRango, setMostrarRango] = useState(periodo === 'rango');
  const [desde, setDesde] = useState(getFechaHoyLocal());
  const [hasta, setHasta] = useState(getFechaHoyLocal());

  const seleccionar = key => {
    if (key === 'rango') {
      setMostrarRango(true);
      return; // espera a que el usuario presione "Aplicar"
    }
    setMostrarRango(false);
    onChange({ periodo: key });
  };

  const aplicarRango = () => {
    if (!esFechaValida(desde) || !esFechaValida(hasta))
      return Alert.alert(
        'Fechas inválidas',
        'Usa el formato AAAA-MM-DD, por ejemplo 2026-11-23.',
      );
    if (desde > hasta)
      return Alert.alert(
        'Rango inválido',
        'La fecha "Desde" no puede ser posterior a "Hasta".',
      );
    onChange({ periodo: 'rango', desde, hasta });
  };

  // Solo dígitos y guiones
  const limpiarFecha = v => v.replace(/[^\d-]/g, '');

  return (
    <View>
      <View style={s.container}>
        {OPCIONES.map(op => {
          const activo =
            op.key === 'rango'
              ? mostrarRango
              : periodo === op.key && !mostrarRango;
          return (
            <TouchableOpacity
              key={op.key}
              style={[s.chip, activo && s.chipActivo]}
              onPress={() => seleccionar(op.key)}
            >
              <Text style={[s.chipText, activo && s.chipTextActivo]}>
                {op.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {mostrarRango && (
        <View style={s.rangoBox}>
          <View style={s.rangoCampo}>
            <Text style={s.rangoLabel}>Desde</Text>
            <TextInput
              style={s.rangoInput}
              value={desde}
              onChangeText={setDesde}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#aaa"
              maxLength={10}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={s.rangoCampo}>
            <Text style={s.rangoLabel}>Hasta</Text>
            <TextInput
              style={s.rangoInput}
              value={hasta}
              onChangeText={setHasta}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#aaa"
              maxLength={10}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <TouchableOpacity style={s.rangoBtn} onPress={aplicarRango}>
            <Text style={s.rangoBtnText}>Aplicar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  chipActivo: { backgroundColor: '#E63946' },
  chipText: { fontSize: 13, color: '#555', fontWeight: '600' },
  chipTextActivo: { color: '#fff' },
  rangoBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  rangoCampo: { flex: 1 },
  rangoLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 4,
    fontWeight: '600',
  },
  rangoInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: '#fff',
  },
  rangoBtn: {
    backgroundColor: '#457B9D',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rangoBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

export default FiltroPeriodo;

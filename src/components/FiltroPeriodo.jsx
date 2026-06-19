import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const OPCIONES = [
  { key: 'dia', label: 'Día' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
];

const FiltroPeriodo = ({ periodo, onChange }) => (
  <View style={s.container}>
    {OPCIONES.map(op => (
      <TouchableOpacity
        key={op.key}
        style={[s.chip, periodo === op.key && s.chipActivo]}
        onPress={() => onChange(op.key)}
      >
        <Text style={[s.chipText, periodo === op.key && s.chipTextActivo]}>
          {op.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
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
});

export default FiltroPeriodo;

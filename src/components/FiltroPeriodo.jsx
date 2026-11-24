import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import client from '../api/client';
import { getFechaHoyLocal, fmtFecha } from '../utils/date';
import CalendarioRango from './CalendarioRango';
import { colors } from '../theme/colors';

const OPCIONES = [
  { key: 'dia', label: 'Día' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
  { key: 'total', label: 'Total' },
  { key: 'rango', label: 'Rango' },
];

// Filtro de periodo reutilizado en Inicio, Ventas, Producción, Caja y
// Rentabilidad.
// - dia/semana/mes: rangos ya calculados por el backend.
// - total: todo lo registrado en el sistema, sin filtro de fecha.
// - rango: el usuario elige desde/hasta en un calendario que deja en gris los
//   días futuros y los anteriores al primer registro.
//
// modulo (opcional): 'ventas', 'caja' o 'produccion'. Indica de cuál módulo se
// toma el primer registro; sin él se usa el más antiguo de los tres.
//
// onChange recibe siempre un objeto: { periodo } o { periodo: 'rango', desde, hasta }.
const FiltroPeriodo = ({ periodo, onChange, modulo }) => {
  const [mostrarRango, setMostrarRango] = useState(periodo === 'rango');
  const [calendario, setCalendario] = useState(false);
  const [desde, setDesde] = useState(getFechaHoyLocal());
  const [hasta, setHasta] = useState(getFechaHoyLocal());
  const [minFecha, setMinFecha] = useState(null);

  // El primer registro se consulta al abrir el calendario, así siempre está
  // al día. Si la consulta falla, el calendario simplemente no limita.
  const abrirCalendario = () => {
    setCalendario(true);
    client
      .get('/reportes/primer-registro', {
        params: modulo ? { modulo } : undefined,
      })
      .then(res => setMinFecha(res.data.data?.fecha ?? null))
      .catch(() => {});
  };

  const seleccionar = key => {
    if (key === 'rango') {
      setMostrarRango(true);
      abrirCalendario();
      return;
    }
    setMostrarRango(false);
    onChange({ periodo: key });
  };

  const aplicarRango = r => {
    setDesde(r.desde);
    setHasta(r.hasta);
    setCalendario(false);
    onChange({ periodo: 'rango', desde: r.desde, hasta: r.hasta });
  };

  const cerrarCalendario = () => {
    setCalendario(false);
    // Si cancela sin haber aplicado nunca un rango, el chip no queda activo
    if (periodo !== 'rango') setMostrarRango(false);
  };

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
        <TouchableOpacity style={s.rangoBox} onPress={abrirCalendario}>
          <Text style={s.rangoIcono}>📅</Text>
          <Text style={s.rangoTexto}>
            {fmtFecha(desde)} → {fmtFecha(hasta)}
          </Text>
          <Text style={s.rangoCambiar}>Cambiar</Text>
        </TouchableOpacity>
      )}

      <CalendarioRango
        visible={calendario}
        desde={desde}
        hasta={hasta}
        minFecha={minFecha}
        onApply={aplicarRango}
        onClose={cerrarCalendario}
      />
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
  chipActivo: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, color: '#555', fontWeight: '600' },
  chipTextActivo: { color: '#fff' },
  rangoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borde,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  rangoIcono: { fontSize: 16, marginRight: 8 },
  rangoTexto: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.texto },
  rangoCambiar: { fontSize: 13, fontWeight: '700', color: colors.azul },
});

export default FiltroPeriodo;

import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  getFechaHoyLocal,
  fmtFecha,
  armarFecha,
  partesFecha,
  sumarDias,
  casillasMes,
  mesAnterior,
} from '../utils/date';
import { colors } from '../theme/colors';

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// Calendario para elegir un rango de fechas.
// Toca un día para el inicio y otro para el final (el mismo día dos veces
// sirve para un solo día). No deja elegir días futuros.
// onApply recibe { desde, hasta } en formato 'YYYY-MM-DD'.
const CalendarioRango = ({ visible, desde, hasta, onApply, onClose }) => {
  const hoy = getFechaHoyLocal();
  const [ini, setIni] = useState(null);
  const [fin, setFin] = useState(null);
  const [cursor, setCursor] = useState(() => {
    const { y, m } = partesFecha(hoy);
    return { y, m };
  });

  // Cada vez que se abre, parte del rango que ya estaba aplicado
  useEffect(() => {
    if (!visible) return;
    setIni(desde || null);
    setFin(hasta || null);
    const { y, m } = partesFecha(desde || hoy);
    setCursor({ y, m });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const { y: hy, m: hm } = partesFecha(hoy);
  const enMesActual = cursor.y === hy && cursor.m === hm;

  const moverMes = delta =>
    setCursor(({ y, m }) => {
      const n = m + delta;
      return { y: y + Math.floor(n / 12), m: ((n % 12) + 12) % 12 };
    });

  const tocarDia = f => {
    if (f > hoy) return;
    if (!ini || (ini && fin)) {
      setIni(f);
      setFin(null);
    } else if (f < ini) {
      setIni(f); // tocó un día anterior: se vuelve el nuevo inicio
    } else {
      setFin(f);
    }
  };

  const atajo = (a, b) => {
    setIni(a);
    setFin(b);
    const { y, m } = partesFecha(a);
    setCursor({ y, m });
  };

  const aplicar = () => {
    if (!ini) return;
    onApply({ desde: ini, hasta: fin || ini });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.card}>
          {/* Atajos */}
          <View style={s.atajos}>
            <TouchableOpacity
              style={s.atajo}
              onPress={() => atajo(sumarDias(hoy, -1), sumarDias(hoy, -1))}
            >
              <Text style={s.atajoText}>Ayer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.atajo}
              onPress={() => atajo(sumarDias(hoy, -6), hoy)}
            >
              <Text style={s.atajoText}>Últimos 7 días</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.atajo}
              onPress={() => {
                const r = mesAnterior(hoy);
                atajo(r.desde, r.hasta);
              }}
            >
              <Text style={s.atajoText}>Mes pasado</Text>
            </TouchableOpacity>
          </View>

          {/* Mes */}
          <View style={s.mesRow}>
            <TouchableOpacity
              onPress={() => moverMes(-1)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={s.flecha}>‹</Text>
            </TouchableOpacity>
            <Text style={s.mesTitulo}>
              {MESES[cursor.m]} {cursor.y}
            </Text>
            <TouchableOpacity
              onPress={() => moverMes(1)}
              disabled={enMesActual}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[s.flecha, enMesActual && s.flechaOff]}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Cuadrícula */}
          <View style={s.grid}>
            {DIAS.map((d, i) => (
              <View key={`h${i}`} style={s.celda}>
                <Text style={s.diaSemana}>{d}</Text>
              </View>
            ))}
            {casillasMes(cursor.y, cursor.m).map((d, i) => {
              if (d === null) return <View key={`v${i}`} style={s.celda} />;
              const f = armarFecha(cursor.y, cursor.m, d);
              const futuro = f > hoy;
              const extremo = f === ini || f === fin;
              const medio = ini && fin && f > ini && f < fin;
              return (
                <TouchableOpacity
                  key={f}
                  style={[s.celda, medio && s.celdaMedio]}
                  onPress={() => tocarDia(f)}
                  disabled={futuro}
                  activeOpacity={0.6}
                >
                  <View style={[s.dia, extremo && s.diaExtremo]}>
                    <Text
                      style={[
                        s.diaText,
                        futuro && s.diaFuturo,
                        extremo && s.diaTextExtremo,
                        f === hoy && !extremo && s.diaHoy,
                      ]}
                    >
                      {d}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Resumen */}
          <Text style={s.resumen}>
            {ini
              ? `${fmtFecha(ini)}  →  ${fin ? fmtFecha(fin) : 'elige el final'}`
              : 'Elige la fecha de inicio'}
          </Text>

          <View style={s.botones}>
            <TouchableOpacity style={s.btnCancelar} onPress={onClose}>
              <Text style={s.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btnAplicar, !ini && { opacity: 0.4 }]}
              onPress={aplicar}
              disabled={!ini}
            >
              <Text style={s.btnAplicarText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  atajos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  atajo: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
  },
  atajoText: { fontSize: 12, fontWeight: '600', color: '#555' },
  mesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mesTitulo: { fontSize: 16, fontWeight: '700', color: colors.texto },
  flecha: {
    fontSize: 30,
    lineHeight: 32,
    color: colors.primary,
    paddingHorizontal: 8,
  },
  flechaOff: { color: '#ddd' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  celda: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celdaMedio: { backgroundColor: '#FDE8EA' },
  diaSemana: { fontSize: 12, fontWeight: '700', color: colors.textoSuave },
  dia: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaExtremo: { backgroundColor: colors.primary },
  diaText: { fontSize: 14, color: colors.texto },
  diaTextExtremo: { color: '#fff', fontWeight: '700' },
  diaFuturo: { color: '#ccc' },
  diaHoy: { color: colors.primary, fontWeight: '700' },
  resumen: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: colors.texto,
    marginTop: 12,
    marginBottom: 14,
  },
  botones: { flexDirection: 'row', gap: 10 },
  btnCancelar: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  btnCancelarText: { color: '#555', fontWeight: '700' },
  btnAplicar: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  btnAplicarText: { color: '#fff', fontWeight: '700' },
});

export default CalendarioRango;

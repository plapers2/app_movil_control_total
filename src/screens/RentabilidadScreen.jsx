import React, { useState, useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import client from '../api/client';
import FiltroPeriodo from '../components/FiltroPeriodo';

const fmt = n => `$${Number(n || 0).toLocaleString('es-CO')}`;
const fmtPct = n => `${(Number(n || 0) * 100).toFixed(1)}%`;

const LABEL_SERVICIO = { energia: 'Energía', agua: 'Agua', gas: 'Gas' };

const RentabilidadScreen = () => {
  const navigation = useNavigation();
  const [productos, setProductos] = useState([]);
  const [indirectos, setIndirectos] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtro de periodo (dia|semana|mes|total|rango), igual al de Home/Caja.
  // Por defecto "mes", porque los servicios públicos se facturan mensual.
  const [periodo, setPeriodo] = useState('mes');
  const [rango, setRango] = useState(null);

  const paramsFecha = criterio => {
    const params = new URLSearchParams({ periodo: criterio.periodo });
    if (criterio.desde && criterio.hasta) {
      params.set('desde', criterio.desde);
      params.set('hasta', criterio.hasta);
    }
    return params;
  };

  const cargar = useCallback(
    async (criterioActual = { periodo, ...(rango || {}) }) => {
      try {
        const qp = paramsFecha(criterioActual);
        const res = await client.get(`/reportes/rentabilidad?${qp.toString()}`);
        setProductos(res.data.data.productos || []);
        setIndirectos(res.data.data.indirectos || null);
      } catch {
        Alert.alert('Error', 'No se pudo cargar la rentabilidad.');
      }
      setLoading(false);
    },
    [periodo, rango],
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      cargar();
    }, [cargar]),
  );

  const cambiarPeriodo = criterio => {
    setPeriodo(criterio.periodo);
    setRango(
      criterio.periodo === 'rango'
        ? { desde: criterio.desde, hasta: criterio.hasta }
        : null,
    );
    setLoading(true);
    cargar(criterio);
  };

  // Totales del periodo, sumando todos los productos vendidos
  const totales = productos.reduce(
    (acc, p) => ({
      ingreso: acc.ingreso + p.ingreso,
      costoDirecto: acc.costoDirecto + p.costoDirectoTotal,
      costoConVariable: acc.costoConVariable + p.costoConVariableTotal,
      utilidad: acc.utilidad + p.utilidadConVariable,
    }),
    { ingreso: 0, costoDirecto: 0, costoConVariable: 0, utilidad: 0 },
  );

  const serviciosConDato = indirectos
    ? Object.entries(indirectos).filter(([, v]) => v.unidades > 0)
    : [];

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#E63946" />
      </View>
    );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={s.title}>Rentabilidad</Text>
        <View style={{ width: 60 }} />
      </View>

      <FiltroPeriodo periodo={periodo} onChange={cambiarPeriodo} />

      {productos.length > 0 && (
        <View style={s.resumen}>
          <View style={s.resumenRow}>
            <View style={s.resumenItem}>
              <Text style={s.resumenLabel}>Ingreso</Text>
              <Text style={s.resumenValor}>{fmt(totales.ingreso)}</Text>
            </View>
            <View style={s.resumenItem}>
              <Text style={s.resumenLabel}>Costo + variable</Text>
              <Text style={s.resumenValor}>{fmt(totales.costoConVariable)}</Text>
            </View>
            <View style={s.resumenItem}>
              <Text style={s.resumenLabel}>Utilidad</Text>
              <Text
                style={[
                  s.resumenValor,
                  { color: totales.utilidad >= 0 ? '#2DC653' : '#E63946' },
                ]}
              >
                {fmt(totales.utilidad)}
              </Text>
            </View>
          </View>

          {serviciosConDato.length > 0 && (
            <Text style={s.indirectosTexto}>
              Indirecto/unidad:{' '}
              {serviciosConDato
                .map(
                  ([s2, v]) =>
                    `${LABEL_SERVICIO[s2]} ${fmt(v.costoUnitario)}${v.estimado ? ' (estimado)' : ''}`,
                )
                .join(' · ')}
            </Text>
          )}
        </View>
      )}

      <FlatList
        data={productos}
        keyExtractor={item => String(item.productos_id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={s.empty}>Sin ventas registradas en este periodo</Text>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardRow}>
              <Text style={s.cardTitle}>{item.nombre}</Text>
              <Text
                style={[
                  s.cardUtilidad,
                  { color: item.utilidadConVariable >= 0 ? '#2DC653' : '#E63946' },
                ]}
              >
                {fmt(item.utilidadConVariable)}
              </Text>
            </View>
            <Text style={s.cardSub}>
              {item.unidadesVendidas} vendidas · Ingreso {fmt(item.ingreso)}
            </Text>

            <View style={s.costosBox}>
              <View style={s.costoFila}>
                <Text style={s.costoLabel}>Costo directo</Text>
                <Text style={s.costoValor}>
                  {fmt(item.costoDirectoUnitario)} / unidad
                  {item.costoDirectoEstimado ? ' · estimado' : ''}
                </Text>
              </View>
              <View style={s.costoFila}>
                <Text style={s.costoLabel}>Directo + variable</Text>
                <Text style={s.costoValor}>
                  {fmt(item.costoConVariableUnitario)} / unidad
                  {item.indirectoEstimado ? ' · estimado' : ''}
                </Text>
              </View>
            </View>

            <Text style={s.margen}>
              Margen: {fmtPct(item.margenConVariable)} (solo insumos:{' '}
              {fmtPct(item.margenDirecto)})
            </Text>
          </View>
        )}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
  },
  backBtn: { width: 60 },
  backText: { color: '#E63946', fontSize: 15, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  resumen: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  resumenRow: { flexDirection: 'row', justifyContent: 'space-between' },
  resumenItem: { alignItems: 'center', flex: 1 },
  resumenLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase' },
  resumenValor: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 2 },
  indirectosTexto: {
    fontSize: 11,
    color: '#888',
    marginTop: 10,
    textAlign: 'center',
  },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40, paddingHorizontal: 30 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: { fontWeight: '700', fontSize: 15, color: '#333', flex: 1, marginRight: 8 },
  cardUtilidad: { fontSize: 15, fontWeight: '700' },
  cardSub: { color: '#888', fontSize: 12, marginTop: 4 },
  costosBox: {
    marginTop: 10,
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
    paddingTop: 8,
  },
  costoFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  costoLabel: { fontSize: 12, color: '#888' },
  costoValor: { fontSize: 12, color: '#333', fontWeight: '600' },
  margen: { fontSize: 12, color: '#457B9D', fontWeight: '600', marginTop: 8 },
});

export default RentabilidadScreen;

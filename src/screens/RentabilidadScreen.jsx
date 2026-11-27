import React, { useState, useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import client from '../api/client';
import FiltroPeriodo from '../components/FiltroPeriodo';
import { avisarError } from '../utils/errores';
import { HEADER_TOP } from '../utils/safeArea';
import { fmt, fmtPct } from '../utils/formato';
import { paramsFecha } from '../utils/query';
import { colors } from '../theme/colors';

const LABEL_SERVICIO = { energia: 'Energía', agua: 'Agua', gas: 'Gas' };

const RentabilidadScreen = () => {
  const navigation = useNavigation();
  const [productos, setProductos] = useState([]);
  const [indirectos, setIndirectos] = useState(null);
  const [consumoPropio, setConsumoPropio] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtro de periodo (dia|semana|mes|total|rango), igual al de Home/Caja.
  // Por defecto "mes", porque los servicios públicos se facturan mensual.
  const [periodo, setPeriodo] = useState('mes');
  const [rango, setRango] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const qp = paramsFecha({ periodo, ...(rango || {}) });
      const res = await client.get(`/reportes/rentabilidad?${qp.toString()}`);
      setProductos(res.data.data.productos || []);
      setIndirectos(res.data.data.indirectos || null);
      setConsumoPropio(res.data.data.consumoPropio || null);
    } catch (err) {
      avisarError(err, 'No se pudo cargar la rentabilidad.');
    }
    setLoading(false);
  }, [periodo, rango]);

  useFocusEffect(
    useCallback(() => {
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
  };

  // Totales del periodo: si un producto no tiene costo verificable,
  // el total correspondiente tampoco se presenta como una cifra completa.
  const totales = productos.reduce(
    (acc, p) => ({
      ingreso: acc.ingreso + p.ingreso,
      costoDirecto:
        acc.costoDirecto == null || p.costoDirectoTotal == null
          ? null
          : acc.costoDirecto + p.costoDirectoTotal,
      costoConVariable:
        acc.costoConVariable == null || p.costoConVariableTotal == null
          ? null
          : acc.costoConVariable + p.costoConVariableTotal,
      utilidad:
        acc.utilidad == null || p.utilidadConVariable == null
          ? null
          : acc.utilidad + p.utilidadConVariable,
    }),
    { ingreso: 0, costoDirecto: 0, costoConVariable: 0, utilidad: 0 },
  );

  const serviciosConDato = indirectos
    ? Object.entries(indirectos).filter(([, v]) => v.unidades > 0)
    : [];

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
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
              <Text style={s.resumenValor}>
                {totales.costoConVariable == null
                  ? 'No verificable'
                  : fmt(totales.costoConVariable)}
              </Text>
            </View>
            <View style={s.resumenItem}>
              <Text style={s.resumenLabel}>Utilidad</Text>
              <Text
                style={[
                  s.resumenValor,
                  {
                    color:
                      totales.utilidad == null
                        ? colors.textoSuave
                        : totales.utilidad >= 0
                          ? colors.verde
                          : colors.primary,
                  },
                ]}
              >
                {totales.utilidad == null ? 'No verificable' : fmt(totales.utilidad)}
              </Text>
            </View>
          </View>

          {serviciosConDato.length > 0 && (
            <Text style={s.indirectosTexto}>
              Indirecto/unidad:{' '}
              {serviciosConDato
                .map(
                  ([s2, v]) =>
                    `${LABEL_SERVICIO[s2]} ${fmt(v.costoUnitario)}${
                      v.estimado ? ' (estimado)' : ''
                    }`,
                )
                .join(' · ')}
            </Text>
          )}
        </View>
      )}

      {consumoPropio?.unidades > 0 && (
        <View style={s.consumoBox}>
          <Text style={s.consumoTitulo}>
            🍽 Consumo propio (no cuenta en la utilidad)
          </Text>
          <Text style={s.consumoTexto}>
            {consumoPropio.unidades} unidad
            {consumoPropio.unidades === 1 ? '' : 'es'} · costo{' '}
            {consumoPropio.noVerificable ||
            consumoPropio.costoConVariable == null
              ? 'no verificable'
              : `${fmt(consumoPropio.costoConVariable)}${
                  consumoPropio.estimado ? ' (estimado)' : ''
                }`}
          </Text>
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
                  {
                    color:
                      item.utilidadConVariable == null
                        ? colors.textoSuave
                        : item.utilidadConVariable >= 0
                          ? colors.verde
                          : colors.primary,
                  },
                ]}
              >
                {item.utilidadConVariable == null ? 'No verificable' : fmt(item.utilidadConVariable)}
              </Text>
            </View>
            <Text style={s.cardSub}>
              {item.unidadesVendidas} vendidas · Ingreso {fmt(item.ingreso)}
            </Text>

            <View style={s.costosBox}>
              <View style={s.costoFila}>
                <Text style={s.costoLabel}>Costo directo</Text>
                <Text style={s.costoValor}>
                  {item.costoDirectoUnitario == null
                    ? 'No verificable'
                    : `${fmt(item.costoDirectoUnitario)} / unidad${
                        item.costoDirectoEstimado ? ' · estimado' : ''
                      }`}
                </Text>
              </View>
              <View style={s.costoFila}>
                <Text style={s.costoLabel}>Directo + variable</Text>
                <Text style={s.costoValor}>
                  {item.costoConVariableUnitario == null
                    ? 'No verificable'
                    : `${fmt(item.costoConVariableUnitario)} / unidad${
                        item.costoConVariableEstimado ? ' · estimado' : ''
                      }`}
                </Text>
              </View>
            </View>

            <Text style={s.margen}>
              Margen: {item.margenConVariable == null
                ? 'No verificable'
                : fmtPct(item.margenConVariable)} (solo insumos:{' '}
              {item.margenDirecto == null
                ? 'No verificable'
                : fmtPct(item.margenDirecto)})
            </Text>
          </View>
        )}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.fondo },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: HEADER_TOP,
    backgroundColor: '#fff',
  },
  backBtn: { width: 60 },
  backText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.texto },
  resumen: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  resumenRow: { flexDirection: 'row', justifyContent: 'space-between' },
  resumenItem: { alignItems: 'center', flex: 1 },
  resumenLabel: {
    fontSize: 11,
    color: colors.textoSuave,
    textTransform: 'uppercase',
  },
  resumenValor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.texto,
    marginTop: 2,
  },
  indirectosTexto: {
    fontSize: 11,
    color: colors.textoSuave,
    marginTop: 10,
    textAlign: 'center',
  },
  consumoBox: {
    backgroundColor: '#FFF8E6',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
  },
  consumoTitulo: { fontSize: 13, fontWeight: '700', color: colors.texto },
  consumoTexto: { fontSize: 13, color: colors.textoSuave, marginTop: 2 },
  empty: {
    textAlign: 'center',
    color: '#aaa',
    marginTop: 40,
    paddingHorizontal: 30,
  },
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
  cardTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.texto,
    flex: 1,
    marginRight: 8,
  },
  cardUtilidad: { fontSize: 15, fontWeight: '700' },
  cardSub: { color: colors.textoSuave, fontSize: 12, marginTop: 4 },
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
  costoLabel: { fontSize: 12, color: colors.textoSuave },
  costoValor: { fontSize: 12, color: colors.texto, fontWeight: '600' },
  margen: { fontSize: 12, color: colors.azul, fontWeight: '600', marginTop: 8 },
});

export default RentabilidadScreen;

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import client from '../api/client';
import { getEmpresa, getRol, getUsuario } from '../store/authStore';
import FiltroPeriodo from '../components/FiltroPeriodo';
import { avisarError } from '../utils/errores';
import { HEADER_TOP } from '../utils/safeArea';
import { abrirMenuCuenta } from '../utils/sesion';
import { fmt } from '../utils/formato';
import { colors } from '../theme/colors';

const Card = ({ label, value, color }) => (
  <View style={[s.card, { borderLeftColor: color }]}>
    <Text style={s.cardValue}>{value}</Text>
    <Text style={s.cardLabel}>{label}</Text>
  </View>
);

const HomeScreen = () => {
  const navigation = useNavigation();
  const [empresa, setEmpresa] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [fondo, setFondo] = useState(null);
  const [reconstruyendoFondo, setReconstruyendoFondo] = useState(false);
  const [deudas, setDeudas] = useState(null);
  const [serviciosPublicos, setServiciosPublicos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('dia');
  const [rango, setRango] = useState(null); // { desde, hasta } cuando periodo === 'rango'
  const [rol, setRol] = useState(null);
  const [esSuper, setEsSuper] = useState(false);

  const cargarResumen = async (criterio = { periodo }) => {
    try {
      const params = new URLSearchParams({ periodo: criterio.periodo });
      if (criterio.desde && criterio.hasta) {
        params.set('desde', criterio.desde);
        params.set('hasta', criterio.hasta);
      }
      const res = await client.get(`/caja/resumen?${params.toString()}`);
      setResumen(res.data.data);
    } catch (err) {
      avisarError(err, 'No se pudo cargar el resumen.');
    }
  };

  const cargarFondo = async () => {
    try {
      const res = await client.get('/caja/fondo-resumen');
      setFondo(res.data.data);
    } catch (err) {
      avisarError(err, 'No se pudo cargar el fondo de reposición.');
    }
  };

  const reconstruirFondo = () => {
    Alert.alert(
      'Reconstruir fondo de reposición',
      'Se recalculará el histórico con ventas, abonos, saldos a favor aplicados y gastos antiguos de insumos. No se modificará el balance ni los movimientos de Caja. Puedes repetir este proceso si corriges datos históricos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reconstruir',
          onPress: async () => {
            try {
              setReconstruyendoFondo(true);
              const res = await client.post('/caja/fondo-reconstruir');
              await cargarFondo();
              Alert.alert('Fondo actualizado', `Estado histórico: ${String(res.data.data.estado_historico).replace(/_/g, ' ')}. Saldo calculado: ${fmt(res.data.data.balance)}.`);
            } catch (err) {
              avisarError(err, 'No se pudo reconstruir el histórico del fondo.');
            } finally {
              setReconstruyendoFondo(false);
            }
          },
        },
      ],
    );
  };

  const cargarServiciosPublicos = async () => {
    try {
      const res = await client.get('/servicios-publicos');
      setServiciosPublicos(res.data.data);
    } catch (err) {
      avisarError(err, 'No se pudo cargar el estado de servicios públicos.');
    }
  };

  const cargarDeudas = async () => {
    try {
      const res = await client.get('/deudas/resumen');
      setDeudas(res.data.data);
    } catch (err) {
      avisarError(err, 'No se pudieron cargar las deudas.');
    }
  };

  const cargarTodo = useCallback(async () => {
    setLoading(true);
    try {
      const [e, r, u] = await Promise.all([
        getEmpresa(),
        getRol(),
        getUsuario(),
      ]);
      setEsSuper(!!u?.es_superadmin);
      setEmpresa(e);
      setRol(r);
      await Promise.all([
        cargarResumen({ periodo, ...(rango || {}) }),
        cargarDeudas(),
        cargarServiciosPublicos(),
        cargarFondo(),
      ]);
    } finally {
      setLoading(false); // el spinner nunca se queda pegado
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, rango]);

  // useFocusEffect corre también en la primera carga y al cambiar de periodo
  useFocusEffect(
    useCallback(() => {
      cargarTodo();
    }, [cargarTodo]),
  );

  const cambiarPeriodo = criterio => {
    setPeriodo(criterio.periodo);
    setRango(
      criterio.periodo === 'rango'
        ? { desde: criterio.desde, hasta: criterio.hasta }
        : null,
    );
    // cargarTodo se vuelve a ejecutar solo al cambiar periodo/rango
  };

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Hola 👋</Text>
          <Text style={s.empresa}>{empresa?.nombre || 'Mi empresa'}</Text>
        </View>
        <TouchableOpacity onPress={abrirMenuCuenta} style={s.logoutBtn}>
          <Text style={s.logoutText}>Cuenta ▾</Text>
        </TouchableOpacity>
      </View>

      {/* Balance actual: todo lo registrado en el sistema, siempre visible sin
          importar el filtro de periodo que se elija abajo. */}
      <TouchableOpacity
        style={[
          s.balanceCard,
          {
            borderLeftColor:
              resumen?.balanceTotal >= 0 ? colors.azul : colors.primary,
          },
        ]}
        onPress={() => navigation.navigate('Caja')}
      >
        <Text style={s.balanceLabel}>Balance actual (todo lo registrado)</Text>
        <Text
          style={[
            s.balanceValor,
            {
              color: resumen?.balanceTotal >= 0 ? colors.azul : colors.primary,
            },
          ]}
        >
          {loading ? '···' : fmt(resumen?.balanceTotal)}
        </Text>
      </TouchableOpacity>

      {fondo && (
        <View style={s.fondoCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.fondoTitulo}>Fondo de reposición · informativo</Text>
            <Text style={s.fondoValor}>{fmt(fondo.balance)}</Text>
            <Text style={s.fondoMeta}>Recuperado: {fmt(fondo.recuperado)}  ·  Usado en insumos: {fmt(fondo.usado)}</Text>
            <Text style={s.fondoMeta}>Financiado por fuera del fondo: {fmt(fondo.financiado_fuera)}</Text>
            {!!fondo.estado_historico && <Text style={s.fondoEstado}>Histórico: {fondo.estado_historico.replace(/_/g, ' ')}</Text>}
            {rol === 'admin' && (
              <TouchableOpacity style={s.fondoRebuildBtn} onPress={reconstruirFondo} disabled={reconstruyendoFondo}>
                <Text style={s.fondoRebuildText}>{reconstruyendoFondo ? 'Reconstruyendo histórico...' : 'Reconstruir histórico del fondo'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <Text style={s.section}>
        Resumen de{' '}
        {periodo === 'dia'
          ? 'hoy'
          : periodo === 'semana'
          ? 'la semana'
          : periodo === 'mes'
          ? 'el mes'
          : periodo === 'total'
          ? 'todo lo registrado'
          : 'el rango seleccionado'}
      </Text>

      <FiltroPeriodo periodo={periodo} onChange={cambiarPeriodo} />

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <>
          <View style={s.cards}>
            <Card
              label="Ingresos"
              value={fmt(resumen?.ingresos)}
              color={colors.verde}
            />
            <Card
              label="Gastos"
              value={fmt(resumen?.gastos)}
              color={colors.primary}
            />
            <Card
              label="Balance"
              value={fmt(resumen?.balance)}
              color={colors.azul}
            />
          </View>

          <TouchableOpacity
            style={s.deudaCard}
            onPress={() => navigation.navigate('Deudas')}
          >
            <View>
              <Text style={s.deudaLabel}>Total por cobrar</Text>
              <Text style={s.deudaSub}>
                {deudas?.cantidadVentas ?? 0} venta
                {deudas?.cantidadVentas === 1 ? '' : 's'} pendiente
                {deudas?.cantidadVentas === 1 ? '' : 's'}
              </Text>
            </View>
            <Text style={s.deudaValor}>{fmt(deudas?.totalPorCobrar)}</Text>
          </TouchableOpacity>
        </>
      )}

      {serviciosPublicos?.fechaInicio && (
        <TouchableOpacity
          style={s.serviciosCard}
          onPress={() => navigation.navigate('ServiciosPublicos')}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.serviciosTitulo}>Servicios públicos</Text>
            <Text style={s.serviciosSub}>
              {serviciosPublicos.servicios.map(item => `${item.nombre}: ${item.pendientes}`).join(' · ')} pendientes
            </Text>
          </View>
          <Text style={s.serviciosFlecha}>›</Text>
        </TouchableOpacity>
      )}

      <Text style={s.section}>Más opciones</Text>
      <View style={s.grid}>
        {[
          { label: '🧾 Deudas', screen: 'Deudas' },
          { label: '💡 Servicios públicos', screen: 'ServiciosPublicos' },
          { label: '⏰ Clientes inactivos', screen: 'ClientesInactivos' },
          ...(rol === 'admin'
            ? [{ label: '📊 Rentabilidad', screen: 'Rentabilidad' }]
            : []),
          ...(rol === 'admin'
            ? [{ label: '👤 Usuarios', screen: 'Usuarios' }]
            : []),
          ...(esSuper ? [{ label: '⚙️ Empresas', screen: 'Superadmin' }] : []),
        ].map(item => (
          <TouchableOpacity
            key={item.screen}
            style={s.gridItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Text style={s.gridText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.fondo },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: HEADER_TOP,
    backgroundColor: '#fff',
  },
  greeting: { fontSize: 14, color: colors.textoSuave },
  empresa: { fontSize: 20, fontWeight: 'bold', color: colors.texto },
  logoutBtn: { padding: 8, backgroundColor: '#f0f0f0', borderRadius: 8 },
  logoutText: { color: colors.primary, fontWeight: '600' },
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.texto,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  fondoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.borde,
  },
  fondoTitulo: { fontSize: 13, fontWeight: '700', color: colors.texto },
  fondoValor: { fontSize: 22, fontWeight: 'bold', color: colors.azul, marginTop: 5 },
  fondoMeta: { fontSize: 11, color: colors.textoSuave, marginTop: 4 },
  fondoRebuildBtn: { alignSelf: 'flex-start', marginTop: 9, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 7, backgroundColor: colors.fondoSuave || '#f2f4f7' },
  fondoRebuildText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  fondoEstado: { fontSize: 11, color: colors.textoSuave, marginTop: 4, textTransform: 'capitalize' },
  balanceCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2,
  },
  balanceLabel: {
    fontSize: 12,
    color: colors.textoSuave,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  balanceValor: { fontSize: 26, fontWeight: 'bold', marginTop: 4 },
  cards: { flexDirection: 'row', paddingHorizontal: 12, gap: 8 },
  deudaCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 10,
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    elevation: 1,
  },
  deudaLabel: { fontSize: 14, fontWeight: '700', color: colors.texto },
  deudaSub: { fontSize: 12, color: colors.textoSuave, marginTop: 2 },
  deudaValor: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
  serviciosCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, padding: 16, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: colors.azul, elevation: 1 },
  serviciosTitulo: { fontSize: 14, fontWeight: '700', color: colors.texto },
  serviciosSub: { fontSize: 12, color: colors.textoSuave, marginTop: 3 },
  serviciosFlecha: { fontSize: 28, color: colors.azul, marginLeft: 8 },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    elevation: 1,
  },
  cardValue: { fontSize: 16, fontWeight: 'bold', color: colors.texto },
  cardLabel: { fontSize: 12, color: colors.textoSuave, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  gridItem: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    elevation: 1,
  },
  gridText: { fontSize: 15, fontWeight: '600', color: colors.texto },
});

export default HomeScreen;

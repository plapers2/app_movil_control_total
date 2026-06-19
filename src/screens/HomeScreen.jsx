import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import client from '../api/client';
import { getEmpresa, clearSession } from '../store/authStore';
import FiltroPeriodo from '../components/FiltroPeriodo';

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
  const [deudas, setDeudas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('dia');

  const cargarResumen = async periodoActual => {
    try {
      const res = await client.get(`/caja/resumen?periodo=${periodoActual}`);
      setResumen(res.data.data);
    } catch {}
  };

  const cargarDeudas = async () => {
    try {
      const res = await client.get('/deudas/resumen');
      setDeudas(res.data.data);
    } catch {}
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setLoading(true);
      const load = async () => {
        const e = await getEmpresa();
        setEmpresa(e);
        await Promise.all([cargarResumen(periodo), cargarDeudas()]);
        setLoading(false);
      };
      load();
    });
    return unsubscribe;
  }, [navigation, periodo]);

  const cambiarPeriodo = nuevoPeriodo => {
    setPeriodo(nuevoPeriodo);
    setLoading(true);
    cargarResumen(nuevoPeriodo).finally(() => setLoading(false));
  };

  const handleLogout = async () => {
    await clearSession();
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }),
    );
  };

  const fmt = n => `$${Number(n || 0).toLocaleString('es-CO')}`;

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Hola 👋</Text>
          <Text style={s.empresa}>{empresa?.nombre || 'Mi empresa'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
          <Text style={s.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.section}>
        Resumen de{' '}
        {periodo === 'dia'
          ? 'hoy'
          : periodo === 'semana'
          ? 'la semana'
          : 'el mes'}
      </Text>

      <FiltroPeriodo periodo={periodo} onChange={cambiarPeriodo} />

      {loading ? (
        <ActivityIndicator color="#E63946" style={{ marginTop: 20 }} />
      ) : (
        <>
          <View style={s.cards}>
            <Card
              label="Ingresos"
              value={fmt(resumen?.ingresos)}
              color="#2DC653"
            />
            <Card label="Gastos" value={fmt(resumen?.gastos)} color="#E63946" />
            <Card
              label="Balance"
              value={fmt(resumen?.balance)}
              color="#457B9D"
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

      <Text style={s.section}>Accesos rápidos</Text>
      <View style={s.grid}>
        {[
          { label: '📦 Ventas', screen: 'Ventas' },
          { label: '🧂 Insumos', screen: 'Insumos' },
          { label: '🫓 Productos', screen: 'Productos' },
          { label: '🏭 Producción', screen: 'Produccion' },
          { label: '👥 Clientes', screen: 'Clientes' },
          { label: '💰 Caja', screen: 'Caja' },
          { label: '🧾 Deudas', screen: 'Deudas' },
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
  },
  greeting: { fontSize: 14, color: '#888' },
  empresa: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  logoutBtn: { padding: 8, backgroundColor: '#f0f0f0', borderRadius: 8 },
  logoutText: { color: '#E63946', fontWeight: '600' },
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
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
    borderLeftColor: '#E63946',
    elevation: 1,
  },
  deudaLabel: { fontSize: 14, fontWeight: '700', color: '#333' },
  deudaSub: { fontSize: 12, color: '#888', marginTop: 2 },
  deudaValor: { fontSize: 18, fontWeight: 'bold', color: '#E63946' },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    elevation: 1,
  },
  cardValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cardLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  gridItem: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    elevation: 1,
  },
  gridText: { fontSize: 15, fontWeight: '600', color: '#333' },
});

export default HomeScreen;

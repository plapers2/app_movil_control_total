import React, { useState, useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import client from '../api/client';
import { getFechaHoyLocal, fmtFecha } from '../utils/date';
import BotonVerMas from '../components/BotonVerMas';

const fmt = n => `$${Number(n || 0).toLocaleString('es-CO')}`;

const DeudasScreen = () => {
  const navigation = useNavigation();
  const [deudas, setDeudas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMas, setLoadingMas] = useState(false);

  const [deudaSeleccionada, setDeudaSeleccionada] = useState(null);
  const [modal, setModal] = useState(false);
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [d, r] = await Promise.all([
        client.get('/deudas?page=1&limit=10'),
        client.get('/deudas/resumen'),
      ]);
      setDeudas(d.data.data);
      setPage(1);
      setTotalPages(d.data.meta?.pages ?? 1);
      setResumen(r.data.data);
    } catch {}
    setLoading(false);
  }, []);

  const verMas = async () => {
    if (page >= totalPages) return;
    try {
      setLoadingMas(true);
      const siguiente = page + 1;
      const res = await client.get(`/deudas?page=${siguiente}&limit=10`);
      setDeudas(prev => [...prev, ...res.data.data]);
      setPage(siguiente);
      setTotalPages(res.data.meta?.pages ?? 1);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar más deudas.');
    } finally {
      setLoadingMas(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      cargar();
    }, [cargar]),
  );

  const abrirAbono = deuda => {
    setDeudaSeleccionada(deuda);
    setMonto('');
    setNota('');
    setModal(true);
  };

  const registrarAbono = async () => {
    const m = Number(monto);
    if (!m || m <= 0) return Alert.alert('Error', 'Ingresa un monto válido.');
    if (m > deudaSeleccionada.saldo) {
      return Alert.alert(
        'Error',
        `El abono no puede ser mayor al saldo pendiente (${fmt(
          deudaSeleccionada.saldo,
        )}).`,
      );
    }
    try {
      setSaving(true);
      await client.post(`/deudas/${deudaSeleccionada.id}/pagos`, {
        monto: m,
        nota,
        fecha: getFechaHoyLocal(),
      });
      setModal(false);
      cargar();
    } catch (err) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'No se pudo registrar el abono.',
      );
    } finally {
      setSaving(false);
    }
  };

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
        <Text style={s.title}>Deudas</Text>
        <View style={{ width: 60 }} />
      </View>

      {resumen && (
        <View style={s.resumen}>
          <Text style={s.resumenLabel}>Total por cobrar</Text>
          <Text style={s.resumenValor}>{fmt(resumen.totalPorCobrar)}</Text>
          <Text style={s.resumenSub}>
            {resumen.cantidadVentas} venta
            {resumen.cantidadVentas === 1 ? '' : 's'} pendiente
            {resumen.cantidadVentas === 1 ? '' : 's'}
          </Text>
        </View>
      )}

      <FlatList
        data={deudas}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={s.empty}>No hay deudas pendientes 🎉</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => abrirAbono(item)}>
            <View style={s.cardRow}>
              <Text style={s.cardTitle}>
                {item.clientes ? item.clientes.nombre : `Venta #${item.id}`}
              </Text>
              <Text style={s.cardSaldo}>{fmt(item.saldo)}</Text>
            </View>
            <Text style={s.cardSub}>
              Venta #{item.id} · {fmtFecha(item.fecha)}
            </Text>
            <View style={s.cardRow2}>
              <Text style={s.cardMeta}>Total: {fmt(item.total)}</Text>
              <Text style={s.cardMeta}>Abonado: {fmt(item.pagado)}</Text>
            </View>
            <View
              style={[
                s.badge,
                item.estado_pago === 'parcial'
                  ? s.badgeParcial
                  : s.badgePendiente,
              ]}
            >
              <Text style={s.badgeText}>
                {item.estado_pago === 'parcial' ? 'Parcial' : 'Pendiente'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <BotonVerMas
            onPress={verMas}
            loading={loadingMas}
            visible={page < totalPages}
          />
        }
      />

      <Modal
        visible={modal}
        animationType="slide"
        onRequestClose={() => setModal(false)}
      >
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Registrar abono</Text>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Text style={s.close}>✕</Text>
            </TouchableOpacity>
          </View>
          {deudaSeleccionada && (
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={s.deudaInfo}>
                {deudaSeleccionada.clientes?.nombre ||
                  `Venta #${deudaSeleccionada.id}`}
              </Text>
              <Text style={s.deudaSub}>
                Saldo pendiente: {fmt(deudaSeleccionada.saldo)} de{' '}
                {fmt(deudaSeleccionada.total)}
              </Text>

              <Text style={s.fieldLabel}>Monto del abono *</Text>
              <TextInput
                style={s.input}
                value={monto}
                onChangeText={setMonto}
                keyboardType="numeric"
                placeholder="0"
              />

              <Text style={s.fieldLabel}>Nota (opcional)</Text>
              <TextInput
                style={s.input}
                value={nota}
                onChangeText={setNota}
                placeholder="Ej: Pago parcial en efectivo"
              />

              <TouchableOpacity
                style={[s.btnGuardar, saving && { opacity: 0.6 }]}
                onPress={registrarAbono}
                disabled={saving}
              >
                <Text style={s.btnGuardarText}>
                  {saving ? 'Guardando...' : 'Registrar abono'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>
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
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  resumenLabel: { fontSize: 13, color: '#888', fontWeight: '600' },
  resumenValor: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#E63946',
    marginTop: 4,
  },
  resumenSub: { fontSize: 12, color: '#aaa', marginTop: 2 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardTitle: { fontWeight: '700', fontSize: 15, color: '#333' },
  cardSaldo: { fontWeight: '700', fontSize: 15, color: '#E63946' },
  cardSub: { color: '#888', fontSize: 12, marginTop: 2 },
  cardMeta: { fontSize: 12, color: '#666' },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgePendiente: { backgroundColor: '#FCE4E4' },
  badgeParcial: { backgroundColor: '#FFF3CD' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#555' },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  close: { fontSize: 20, color: '#888' },
  deudaInfo: { fontSize: 16, fontWeight: '700', color: '#333' },
  deudaSub: { fontSize: 13, color: '#888', marginTop: 4, marginBottom: 16 },
  fieldLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 6,
    marginTop: 12,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  btnGuardar: {
    marginTop: 24,
    backgroundColor: '#E63946',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnGuardarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default DeudasScreen;

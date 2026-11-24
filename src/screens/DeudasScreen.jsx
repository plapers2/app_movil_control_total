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
import { avisarError } from '../utils/errores';
import KeyboardView from '../components/KeyboardView';
import { aDinero } from '../utils/validar';
import { HEADER_TOP, BOTTOM_INSET } from '../utils/safeArea';
import { fmt } from '../utils/formato';
import { colors } from '../theme/colors';

const DeudasScreen = () => {
  const navigation = useNavigation();
  const [clientes, setClientes] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [c, r] = await Promise.all([
        client.get('/deudas/clientes'),
        client.get('/deudas/resumen'),
      ]);
      setClientes(c.data.data);
      setResumen(r.data.data);
    } catch (err) {
      avisarError(err, 'No se pudieron cargar las deudas.');
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      cargar();
    }, [cargar]),
  );

  const abrirCliente = async c => {
    setMonto('');
    setNota('');
    setDetalle(null);
    setModal(true);
    setCargandoDetalle(true);
    try {
      const res = await client.get(`/deudas/clientes/${c.clientes_id ?? 0}`);
      setDetalle(res.data.data);
    } catch (err) {
      setModal(false);
      avisarError(err, 'No se pudo cargar el detalle de la deuda.');
    } finally {
      setCargandoDetalle(false);
    }
  };

  // Vista previa de cómo se reparte el abono: de la compra más vieja a la más reciente
  const m = aDinero(monto);
  const reparto = (() => {
    if (!detalle || !(m > 0)) return [];
    let restante = Math.round(m * 100);
    const out = [];
    for (const v of detalle.ventas) {
      if (restante <= 0) break;
      const saldo = Math.round(v.saldo * 100);
      const aplica = Math.min(restante, saldo);
      out.push({ id: v.id, monto: aplica / 100, salda: aplica === saldo });
      restante -= aplica;
    }
    return out;
  })();

  const enviarAbono = async guardarExcedente => {
    try {
      setSaving(true);
      const res = await client.post(
        `/deudas/clientes/${detalle.cliente.id ?? 0}/pagos`,
        {
          monto: m,
          nota,
          fecha: getFechaHoyLocal(),
          guardar_excedente: guardarExcedente,
        },
      );
      const { aplicados = [], excedente = 0 } = res.data.data;
      setModal(false);
      setDetalle(null);
      cargar();
      Alert.alert(
        'Abono registrado',
        aplicados
          .map(
            a =>
              `• Venta #${a.ventas_id}: ${fmt(a.monto)}${
                a.estado_pago === 'pagada' ? ' (saldada)' : ''
              }`,
          )
          .join('\n') +
          (excedente > 0
            ? `\n\n💰 ${fmt(excedente)} quedó como saldo a favor.`
            : ''),
      );
    } catch (err) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'No se pudo registrar el abono.',
      );
    } finally {
      setSaving(false);
    }
  };

  const registrarAbono = () => {
    if (!(m > 0)) return Alert.alert('Error', 'Ingresa un monto válido.');
    if (m > detalle.totalDeuda) {
      if (!detalle.cliente.id)
        return Alert.alert(
          'Error',
          `El abono no puede ser mayor a la deuda total (${fmt(
            detalle.totalDeuda,
          )}).`,
        );
      const sobra = Math.round((m - detalle.totalDeuda) * 100) / 100;
      return Alert.alert(
        'El abono supera la deuda',
        `La deuda es ${fmt(detalle.totalDeuda)} y sobran ${fmt(
          sobra,
        )}. ¿Dejar ese valor como saldo a favor de ${detalle.cliente.nombre}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sí, dejar saldo', onPress: () => enviarAbono(true) },
        ],
      );
    }
    enviarAbono(false);
  };

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
        <Text style={s.title}>Deudas</Text>
        <View style={{ width: 60 }} />
      </View>

      {resumen && (
        <View style={s.resumen}>
          <Text style={s.resumenLabel}>Total por cobrar</Text>
          <Text style={s.resumenValor}>{fmt(resumen.totalPorCobrar)}</Text>
          <Text style={s.resumenSub}>
            {clientes.length} cliente{clientes.length === 1 ? '' : 's'} ·{' '}
            {resumen.cantidadVentas} compra
            {resumen.cantidadVentas === 1 ? '' : 's'} pendiente
            {resumen.cantidadVentas === 1 ? '' : 's'}
          </Text>
        </View>
      )}

      <FlatList
        data={clientes}
        keyExtractor={item => String(item.clientes_id ?? 0)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={s.empty}>No hay deudas pendientes 🎉</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => abrirCliente(item)}>
            <View style={s.cardRow}>
              <Text style={s.cardTitle}>{item.nombre}</Text>
              <Text style={s.cardSaldo}>{fmt(item.totalDeuda)}</Text>
            </View>
            <Text style={s.cardSub}>
              {item.cantidadVentas} compra
              {item.cantidadVentas === 1 ? '' : 's'} en deuda · la más antigua
              del {fmtFecha(item.masAntigua)}
            </Text>
          </TouchableOpacity>
        )}
      />

      <Modal
        visible={modal}
        animationType="slide"
        onRequestClose={() => setModal(false)}
      >
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Deuda del cliente</Text>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Text style={s.close}>✕</Text>
            </TouchableOpacity>
          </View>

          {cargandoDetalle && (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={{ marginTop: 40 }}
            />
          )}

          {detalle && (
            <KeyboardView>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
              >
                <Text style={s.deudaInfo}>{detalle.cliente.nombre}</Text>
                <Text style={s.deudaSub}>
                  Debe en total {fmt(detalle.totalDeuda)} en{' '}
                  {detalle.ventas.length} compra
                  {detalle.ventas.length === 1 ? '' : 's'}
                </Text>

                {detalle.ventas.map(v => (
                  <View key={v.id} style={s.ventaBox}>
                    <View style={s.cardRow}>
                      <Text style={s.cardTitle}>Venta #{v.id}</Text>
                      <Text style={s.cardSaldo}>{fmt(v.saldo)}</Text>
                    </View>
                    <Text style={s.cardSub}>
                      {fmtFecha(v.fecha)} · Total {fmt(v.total)} · Abonado{' '}
                      {fmt(v.pagado)}
                    </Text>
                    {v.ventas_items.map(i => (
                      <Text key={i.id} style={s.cardMeta}>
                        • {i.productos?.nombre} x{i.cantidad} —{' '}
                        {fmt(i.subtotal)}
                      </Text>
                    ))}
                  </View>
                ))}

                <Text style={s.fieldLabel}>Abono general *</Text>
                <Text style={s.ayuda}>
                  Se descuenta de la deuda más vieja a la más reciente.
                </Text>
                <TextInput
                  style={s.input}
                  value={monto}
                  onChangeText={setMonto}
                  keyboardType="numeric"
                  placeholder="0"
                />

                {reparto.length > 0 && (
                  <View style={s.previewBox}>
                    <Text style={s.previewTitulo}>Se aplicará así:</Text>
                    {reparto.map(r => (
                      <Text key={r.id} style={s.previewLinea}>
                        Venta #{r.id}: {fmt(r.monto)}
                        {r.salda ? ' ✓ queda saldada' : ''}
                      </Text>
                    ))}
                  </View>
                )}

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
            </KeyboardView>
          )}
        </View>
      </Modal>
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
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  resumenLabel: { fontSize: 13, color: colors.textoSuave, fontWeight: '600' },
  resumenValor: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.primary,
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
  cardTitle: { fontWeight: '700', fontSize: 15, color: colors.texto },
  cardSaldo: { fontWeight: '700', fontSize: 15, color: colors.primary },
  cardSub: { color: colors.textoSuave, fontSize: 12, marginTop: 2 },
  cardMeta: { fontSize: 12, color: '#666' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#555' },
  ventaBox: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  ayuda: { fontSize: 12, color: '#aaa', marginBottom: 6 },
  previewBox: {
    backgroundColor: '#EAF8EE',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  previewTitulo: { fontSize: 12, fontWeight: '700', color: colors.texto },
  previewLinea: { fontSize: 13, color: colors.texto, marginTop: 2 },
  modal: { flex: 1, backgroundColor: '#fff', paddingBottom: BOTTOM_INSET },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: HEADER_TOP,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  close: { fontSize: 20, color: colors.textoSuave },
  deudaInfo: { fontSize: 16, fontWeight: '700', color: colors.texto },
  deudaSub: {
    fontSize: 13,
    color: colors.textoSuave,
    marginTop: 4,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    color: colors.textoSuave,
    marginBottom: 6,
    marginTop: 12,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borde,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  btnGuardar: {
    marginTop: 24,
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnGuardarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default DeudasScreen;

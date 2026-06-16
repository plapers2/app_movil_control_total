import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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

const fmt = n => `$${Number(n || 0).toLocaleString('es-CO')}`;
const fmtFecha = d => new Date(d).toLocaleDateString('es-CO');

const CajaScreen = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tipo: 'gasto',
    categoria: 'insumo',
    monto: '',
    descripcion: '',
  });

  const hoy = new Date();
  const desde = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(
    2,
    '0',
  )}-01`;
  const hasta = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(hoy.getDate()).padStart(2, '0')}`;

  const cargar = useCallback(async () => {
    try {
      const [m, r] = await Promise.all([
        client.get('/caja'),
        client.get(`/caja/resumen?desde=${desde}&hasta=${hasta}`),
      ]);
      setMovimientos(m.data.data);
      setResumen(r.data.data);
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const guardar = async () => {
    if (!form.monto || !form.descripcion)
      return Alert.alert('Error', 'Monto y descripción son requeridos.');
    try {
      setSaving(true);
      await client.post('/caja', {
        tipo: form.tipo,
        categoria: form.categoria,
        monto: Number(form.monto),
        descripcion: form.descripcion,
        fecha: hasta,
      });
      setModal(false);
      setForm({
        tipo: 'gasto',
        categoria: 'insumo',
        monto: '',
        descripcion: '',
      });
      cargar();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Error al guardar.');
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
        <Text style={s.title}>Caja</Text>
        <TouchableOpacity style={s.btnNew} onPress={() => setModal(true)}>
          <Text style={s.btnNewText}>+ Movimiento</Text>
        </TouchableOpacity>
      </View>

      {resumen && (
        <View style={s.resumen}>
          <View style={[s.resCard, { borderLeftColor: '#2DC653' }]}>
            <Text style={s.resVal}>{fmt(resumen.ingresos)}</Text>
            <Text style={s.resLabel}>Ingresos</Text>
          </View>
          <View style={[s.resCard, { borderLeftColor: '#E63946' }]}>
            <Text style={s.resVal}>{fmt(resumen.gastos)}</Text>
            <Text style={s.resLabel}>Gastos</Text>
          </View>
          <View
            style={[
              s.resCard,
              { borderLeftColor: resumen.balance >= 0 ? '#457B9D' : '#E63946' },
            ]}
          >
            <Text
              style={[
                s.resVal,
                { color: resumen.balance >= 0 ? '#457B9D' : '#E63946' },
              ]}
            >
              {fmt(resumen.balance)}
            </Text>
            <Text style={s.resLabel}>Balance</Text>
          </View>
        </View>
      )}

      <Text style={s.sectionLabel}>Movimientos del mes</Text>

      <FlatList
        data={movimientos}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        ListEmptyComponent={<Text style={s.empty}>Sin movimientos</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardDesc}>{item.descripcion}</Text>
                <Text style={s.cardMeta}>
                  {fmtFecha(item.fecha)} · {item.categoria}
                </Text>
              </View>
              <Text
                style={[
                  s.cardMonto,
                  item.tipo === 'ingreso' ? s.ingreso : s.gasto,
                ]}
              >
                {item.tipo === 'ingreso' ? '+' : '-'}
                {fmt(item.monto)}
              </Text>
            </View>
          </View>
        )}
      />

      <Modal
        visible={modal}
        animationType="slide"
        onRequestClose={() => setModal(false)}
      >
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Nuevo movimiento</Text>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Text style={s.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            <Text style={s.fieldLabel}>Tipo</Text>
            <View style={s.toggle}>
              {['gasto', 'ingreso'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.toggleBtn, form.tipo === t && s.toggleActive]}
                  onPress={() =>
                    setForm(p => ({
                      ...p,
                      tipo: t,
                      categoria: t === 'gasto' ? 'insumo' : 'venta',
                    }))
                  }
                >
                  <Text
                    style={[
                      s.toggleText,
                      form.tipo === t && s.toggleTextActive,
                    ]}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>Categoría</Text>
            <View style={s.chips}>
              <View style={s.chips}>
                {(form.tipo === 'gasto'
                  ? ['insumo', 'servicio', 'otro']
                  : ['venta', 'otro']
                ).map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[s.chip, form.categoria === c && s.chipActive]}
                    onPress={() => setForm(p => ({ ...p, categoria: c }))}
                  >
                    <Text
                      style={[
                        s.chipText,
                        form.categoria === c && s.chipTextActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.fieldLabel}>Monto *</Text>
              <TextInput
                style={s.input}
                value={form.monto}
                onChangeText={v => setForm(p => ({ ...p, monto: v }))}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            <View style={s.field}>
              <Text style={s.fieldLabel}>Descripción *</Text>
              <TextInput
                style={s.input}
                value={form.descripcion}
                onChangeText={v => setForm(p => ({ ...p, descripcion: v }))}
                placeholder="Ej: Compra de harina"
              />
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[s.btnGuardar, saving && { opacity: 0.6 }]}
            onPress={guardar}
            disabled={saving}
          >
            <Text style={s.btnGuardarText}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Text>
          </TouchableOpacity>
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
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  btnNew: {
    backgroundColor: '#E63946',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnNewText: { color: '#fff', fontWeight: '600' },
  resumen: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  resCard: { flex: 1, borderLeftWidth: 3, paddingLeft: 8, paddingVertical: 4 },
  resVal: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  resLabel: { fontSize: 11, color: '#888' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    textTransform: 'uppercase',
  },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardDesc: { fontSize: 14, fontWeight: '600', color: '#333' },
  cardMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  cardMonto: { fontSize: 15, fontWeight: 'bold' },
  ingreso: { color: '#2DC653' },
  gasto: { color: '#E63946' },
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
  fieldLabel: {
    fontSize: 13,
    color: '#888',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  toggle: { flexDirection: 'row', marginHorizontal: 20, gap: 8 },
  toggleBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  toggleActive: { backgroundColor: '#E63946', borderColor: '#E63946' },
  toggleText: { color: '#888', fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
  chips: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chipActive: { backgroundColor: '#E63946', borderColor: '#E63946' },
  chipText: { color: '#888', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  field: { paddingHorizontal: 20, paddingTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  btnGuardar: {
    margin: 20,
    backgroundColor: '#E63946',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnGuardarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default CajaScreen;

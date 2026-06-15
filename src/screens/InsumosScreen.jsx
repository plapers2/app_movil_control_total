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
} from 'react-native';
import client from '../api/client';

const fmt = n => `$${Number(n || 0).toLocaleString('es-CO')}`;

const UNIDADES = [
  { label: 'Kilogramo (kg)', value: 'kg' },
  { label: 'Gramo (g)', value: 'g' },
  { label: 'Litro (l)', value: 'l' },
  { label: 'Mililitro (ml)', value: 'ml' },
  { label: 'Unidad', value: 'unidad' },
];

const InsumosScreen = () => {
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState(null);
  const [modalUnidad, setModalUnidad] = useState(false);

  const [form, setForm] = useState({
    nombre: '',
    unidad_medida: '',
    stock_actual: '',
    stock_minimo: '',
    precio_unidad: '',
  });

  const cargar = useCallback(async () => {
    try {
      const res = await client.get('/insumos');
      setInsumos(res.data.data);
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const abrirNuevo = () => {
    setEditando(null);
    setForm({
      nombre: '',
      unidad_medida: '',
      stock_actual: '',
      stock_minimo: '',
      precio_unidad: '',
    });
    setModal(true);
  };

  const abrirEditar = item => {
    setEditando(item);
    setForm({
      nombre: item.nombre,
      unidad_medida: item.unidad_medida,
      stock_actual: String(item.stock_actual),
      stock_minimo: String(item.stock_minimo),
      precio_unidad: String(item.precio_unidad),
    });
    setModal(true);
  };

  const guardar = async () => {
    if (!form.nombre || !form.unidad_medida)
      return Alert.alert('Error', 'Nombre y unidad son requeridos.');
    try {
      setSaving(true);
      const data = {
        nombre: form.nombre,
        unidad_medida: form.unidad_medida,
        stock_actual: Number(form.stock_actual) || 0,
        stock_minimo: Number(form.stock_minimo) || 0,
        precio_unidad: Number(form.precio_unidad) || 0,
      };
      if (editando) await client.put(`/insumos/${editando.id}`, data);
      else await client.post('/insumos', data);
      setModal(false);
      cargar();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const eliminar = item => {
    Alert.alert('Desactivar', `¿Desactivar "${item.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desactivar',
        style: 'destructive',
        onPress: async () => {
          await client.delete(`/insumos/${item.id}`);
          cargar();
        },
      },
    ]);
  };

  const stockBajo = item =>
    Number(item.stock_actual) <= Number(item.stock_minimo);

  const unidadLabel = value =>
    UNIDADES.find(u => u.value === value)?.label || value;

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#E63946" />
      </View>
    );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Insumos</Text>
        <TouchableOpacity style={s.btnNew} onPress={abrirNuevo}>
          <Text style={s.btnNewText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={insumos.filter(i => i.activo)}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={s.empty}>Sin insumos registrados</Text>
        }
        renderItem={({ item }) => (
          <View style={[s.card, stockBajo(item) && s.cardAlert]}>
            <View style={s.cardRow}>
              <Text style={s.cardNombre}>{item.nombre}</Text>
              <View style={s.actions}>
                <TouchableOpacity
                  onPress={() => abrirEditar(item)}
                  style={s.editBtn}
                >
                  <Text style={s.editBtnText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => eliminar(item)}
                  style={s.delBtn}
                >
                  <Text style={s.delBtnText}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={s.cardDetails}>
              <Text style={s.detail}>
                Stock:{' '}
                <Text style={stockBajo(item) ? s.low : s.ok}>
                  {item.stock_actual} {item.unidad_medida}
                </Text>
              </Text>
              <Text style={s.detail}>
                Mín: {item.stock_minimo} {item.unidad_medida}
              </Text>
              <Text style={s.detail}>
                Precio: {fmt(item.precio_unidad)}/{item.unidad_medida}
              </Text>
            </View>
            {stockBajo(item) && <Text style={s.alertText}>⚠️ Stock bajo</Text>}
          </View>
        )}
      />

      {/* Modal principal del formulario */}
      <Modal
        visible={modal}
        animationType="slide"
        onRequestClose={() => setModal(false)}
      >
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>
              {editando ? 'Editar insumo' : 'Nuevo insumo'}
            </Text>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Text style={s.close}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Nombre */}
          <View style={s.field}>
            <Text style={s.label}>Nombre *</Text>
            <TextInput
              style={s.input}
              value={form.nombre}
              onChangeText={v => setForm(prev => ({ ...prev, nombre: v }))}
              keyboardType="default"
            />
          </View>

          {/* Unidad medida - Selector */}
          <View style={s.field}>
            <Text style={s.label}>Unidad de medida *</Text>
            <TouchableOpacity
              style={[s.input, s.selector]}
              onPress={() => setModalUnidad(true)}
            >
              <Text
                style={
                  form.unidad_medida ? s.selectorText : s.selectorPlaceholder
                }
              >
                {form.unidad_medida
                  ? unidadLabel(form.unidad_medida)
                  : 'Seleccionar unidad...'}
              </Text>
              <Text style={s.selectorArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Stock actual */}
          <View style={s.field}>
            <Text style={s.label}>Stock actual</Text>
            <TextInput
              style={s.input}
              value={form.stock_actual}
              onChangeText={v =>
                setForm(prev => ({ ...prev, stock_actual: v }))
              }
              keyboardType="numeric"
            />
          </View>

          {/* Stock mínimo */}
          <View style={s.field}>
            <Text style={s.label}>Stock mínimo</Text>
            <TextInput
              style={s.input}
              value={form.stock_minimo}
              onChangeText={v =>
                setForm(prev => ({ ...prev, stock_minimo: v }))
              }
              keyboardType="numeric"
            />
          </View>

          {/* Precio */}
          <View style={s.field}>
            <Text style={s.label}>Precio por unidad</Text>
            <TextInput
              style={s.input}
              value={form.precio_unidad}
              onChangeText={v =>
                setForm(prev => ({ ...prev, precio_unidad: v }))
              }
              keyboardType="numeric"
            />
          </View>

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

      {/* Modal selector de unidad */}
      <Modal
        visible={modalUnidad}
        animationType="fade"
        transparent
        onRequestClose={() => setModalUnidad(false)}
      >
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={() => setModalUnidad(false)}
        >
          <View style={s.dropdownContainer}>
            <Text style={s.dropdownTitle}>Seleccionar unidad</Text>
            {UNIDADES.map(u => (
              <TouchableOpacity
                key={u.value}
                style={[
                  s.dropdownItem,
                  form.unidad_medida === u.value && s.dropdownItemSelected,
                ]}
                onPress={() => {
                  setForm(prev => ({ ...prev, unidad_medida: u.value }));
                  setModalUnidad(false);
                }}
              >
                <Text
                  style={[
                    s.dropdownItemText,
                    form.unidad_medida === u.value &&
                      s.dropdownItemTextSelected,
                  ]}
                >
                  {u.label}
                </Text>
                {form.unidad_medida === u.value && (
                  <Text style={s.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
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
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  cardAlert: { borderLeftWidth: 4, borderLeftColor: '#E63946' },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardNombre: { fontSize: 16, fontWeight: '700', color: '#333', flex: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  editBtn: { padding: 4 },
  editBtnText: { fontSize: 16 },
  delBtn: { padding: 4 },
  delBtnText: { fontSize: 16 },
  cardDetails: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  detail: { fontSize: 13, color: '#666' },
  ok: { color: '#2DC653', fontWeight: '600' },
  low: { color: '#E63946', fontWeight: '600' },
  alertText: {
    color: '#E63946',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
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
  field: { paddingHorizontal: 20, paddingTop: 16 },
  label: { fontSize: 13, color: '#888', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: { fontSize: 15, color: '#333' },
  selectorPlaceholder: { fontSize: 15, color: '#aaa' },
  selectorArrow: { fontSize: 12, color: '#888' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '80%',
    paddingVertical: 8,
    elevation: 5,
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownItemSelected: { backgroundColor: '#FFF0F0' },
  dropdownItemText: { fontSize: 15, color: '#333' },
  dropdownItemTextSelected: { color: '#E63946', fontWeight: '600' },
  checkmark: { color: '#E63946', fontWeight: 'bold' },
  btnGuardar: {
    margin: 20,
    backgroundColor: '#E63946',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnGuardarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default InsumosScreen;

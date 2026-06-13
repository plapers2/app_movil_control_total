import React, { useState, useCallback } from 'react';
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

const ProductosScreen = () => {
  const [productos, setProductos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [modalReceta, setModalReceta] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState(null);
  const [productoReceta, setProductoReceta] = useState(null);
  const [recetaItems, setRecetaItems] = useState([]);

  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    precio_venta: '',
  });

  const cargar = useCallback(async () => {
    try {
      const [p, i] = await Promise.all([
        client.get('/productos'),
        client.get('/insumos'),
      ]);
      setProductos(p.data.data);
      setInsumos(i.data.data);
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
    setForm({ nombre: '', descripcion: '', precio_venta: '' });
    setModal(true);
  };

  const abrirEditar = item => {
    setEditando(item);
    setForm({
      nombre: item.nombre,
      descripcion: item.descripcion || '',
      precio_venta: String(item.precio_venta),
    });
    setModal(true);
  };

  const abrirReceta = producto => {
    setProductoReceta(producto);
    setRecetaItems(
      (producto.recetas || []).map(r => ({
        insumos_id: r.insumos_id,
        nombre: r.insumos?.nombre || '',
        unidad: r.insumos?.unidad_medida || '',
        cantidad: String(r.cantidad),
      })),
    );
    setModalReceta(true);
  };

  const guardar = async () => {
    if (!form.nombre) return Alert.alert('Error', 'El nombre es requerido.');
    try {
      setSaving(true);
      const data = {
        nombre: form.nombre,
        descripcion: form.descripcion,
        precio_venta: Number(form.precio_venta) || 0,
      };
      if (editando) await client.put(`/productos/${editando.id}`, data);
      else await client.post('/productos', data);
      setModal(false);
      cargar();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const agregarInsumoReceta = insumo => {
    setRecetaItems(prev => {
      if (prev.find(i => i.insumos_id === insumo.id)) return prev;
      return [
        ...prev,
        {
          insumos_id: insumo.id,
          nombre: insumo.nombre,
          unidad: insumo.unidad_medida,
          cantidad: '1',
        },
      ];
    });
  };

  const guardarReceta = async () => {
    try {
      setSaving(true);
      await client.put(`/productos/${productoReceta.id}/receta`, {
        insumos: recetaItems.map(i => ({
          insumos_id: i.insumos_id,
          cantidad: Number(i.cantidad),
        })),
      });
      setModalReceta(false);
      cargar();
    } catch (err) {
      Alert.alert('Error', 'Error al guardar receta.');
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
          await client.delete(`/productos/${item.id}`);
          cargar();
        },
      },
    ]);
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
        <Text style={s.title}>Productos</Text>
        <TouchableOpacity style={s.btnNew} onPress={abrirNuevo}>
          <Text style={s.btnNewText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={productos.filter(p => p.activo)}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={s.empty}>Sin productos registrados</Text>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardNombre}>{item.nombre}</Text>
                {item.descripcion ? (
                  <Text style={s.cardDesc}>{item.descripcion}</Text>
                ) : null}
                <Text style={s.cardPrecio}>{fmt(item.precio_venta)}</Text>
                <Text style={s.cardStock}>
                  Stock: {Number(item.stock_actual || 0)} unidades
                </Text>
              </View>
              <View style={s.actions}>
                <TouchableOpacity
                  onPress={() => abrirReceta(item)}
                  style={s.recetaBtn}
                >
                  <Text style={s.recetaBtnText}>🧾</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => abrirEditar(item)}
                  style={s.editBtn}
                >
                  <Text>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => eliminar(item)}>
                  <Text>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
            {item.recetas?.length > 0 && (
              <View style={s.recetaPreview}>
                <Text style={s.recetaLabel}>Receta: </Text>
                <Text style={s.recetaText}>
                  {item.recetas
                    .map(
                      r =>
                        `${r.insumos?.nombre} ${r.cantidad}${r.insumos?.unidad_medida}`,
                    )
                    .join(', ')}
                </Text>
              </View>
            )}
          </View>
        )}
      />

      {/* Modal producto */}
      <Modal
        visible={modal}
        animationType="slide"
        onRequestClose={() => setModal(false)}
      >
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>
              {editando ? 'Editar producto' : 'Nuevo producto'}
            </Text>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Text style={s.close}>✕</Text>
            </TouchableOpacity>
          </View>
          {[
            { key: 'nombre', label: 'Nombre *', keyboard: 'default' },
            { key: 'descripcion', label: 'Descripción', keyboard: 'default' },
            {
              key: 'precio_venta',
              label: 'Precio de venta',
              keyboard: 'numeric',
            },
          ].map(({ key, label, keyboard }) => (
            <View key={key} style={s.field}>
              <Text style={s.label}>{label}</Text>
              <TextInput
                style={s.input}
                value={form[key]}
                onChangeText={v => setForm(prev => ({ ...prev, [key]: v }))}
                keyboardType={keyboard}
              />
            </View>
          ))}
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

      {/* Modal receta */}
      <Modal
        visible={modalReceta}
        animationType="slide"
        onRequestClose={() => setModalReceta(false)}
      >
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Receta: {productoReceta?.nombre}</Text>
            <TouchableOpacity onPress={() => setModalReceta(false)}>
              <Text style={s.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            <Text style={s.sectionLabel}>Insumos disponibles</Text>
            {insumos
              .filter(i => i.activo)
              .map(i => (
                <TouchableOpacity
                  key={i.id}
                  style={s.insumoRow}
                  onPress={() => agregarInsumoReceta(i)}
                >
                  <Text style={s.insumoNombre}>
                    {i.nombre} ({i.unidad_medida})
                  </Text>
                  <Text style={s.addBtn}>＋</Text>
                </TouchableOpacity>
              ))}

            {recetaItems.length > 0 && (
              <>
                <Text style={s.sectionLabel}>Ingredientes</Text>
                {recetaItems.map((item, idx) => (
                  <View key={item.insumos_id} style={s.recetaRow}>
                    <Text style={s.recetaItemNombre}>{item.nombre}</Text>
                    <TextInput
                      style={s.cantidadInput}
                      value={item.cantidad}
                      onChangeText={v =>
                        setRecetaItems(prev =>
                          prev.map((r, i) =>
                            i === idx ? { ...r, cantidad: v } : r,
                          ),
                        )
                      }
                      keyboardType="numeric"
                    />
                    <Text style={s.unidad}>{item.unidad}</Text>
                    <TouchableOpacity
                      onPress={() =>
                        setRecetaItems(prev => prev.filter((_, i) => i !== idx))
                      }
                    >
                      <Text style={s.removeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
          <TouchableOpacity
            style={[s.btnGuardar, saving && { opacity: 0.6 }]}
            onPress={guardarReceta}
            disabled={saving}
          >
            <Text style={s.btnGuardarText}>
              {saving ? 'Guardando...' : 'Guardar receta'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  cardStock: {
    fontSize: 13,
    color: '#457B9D',
    fontWeight: '600',
    marginTop: 2,
  },
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
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  cardNombre: { fontSize: 16, fontWeight: '700', color: '#333' },
  cardDesc: { fontSize: 13, color: '#888', marginTop: 2 },
  cardPrecio: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E63946',
    marginTop: 4,
  },
  actions: { flexDirection: 'row', gap: 8, marginLeft: 8 },
  recetaBtn: { padding: 2 },
  recetaBtnText: { fontSize: 18 },
  editBtn: { padding: 2 },
  recetaPreview: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
  recetaLabel: { fontSize: 12, color: '#888', fontWeight: '600' },
  recetaText: { fontSize: 12, color: '#555', flex: 1 },
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
  modalTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, marginRight: 8 },
  close: { fontSize: 20, color: '#888' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    textTransform: 'uppercase',
  },
  insumoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  insumoNombre: { fontSize: 15, color: '#333' },
  addBtn: { fontSize: 22, color: '#E63946', fontWeight: 'bold' },
  recetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    gap: 8,
  },
  recetaItemNombre: { flex: 1, fontSize: 14, color: '#333' },
  cantidadInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 6,
    width: 60,
    textAlign: 'center',
    fontSize: 14,
  },
  unidad: { fontSize: 13, color: '#888', width: 30 },
  removeBtn: { color: '#E63946', fontSize: 16, padding: 4 },
  field: { paddingHorizontal: 20, paddingTop: 16 },
  label: { fontSize: 13, color: '#888', marginBottom: 6 },
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

export default ProductosScreen;

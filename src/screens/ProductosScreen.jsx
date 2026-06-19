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
import { getRol } from '../store/authStore';

const fmt = n => `$${Number(n || 0).toLocaleString('es-CO')}`;

const ProductosScreen = () => {
  const [productos, setProductos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rol, setRol] = useState(null);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState(null);
  const [modalInsumo, setModalInsumo] = useState(false);

  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    precio_venta: '',
  });

  // Ingredientes de la receta en el formulario
  const [receta, setReceta] = useState([]);

  const cargar = useCallback(async () => {
    try {
      const [p, i] = await Promise.all([
        client.get('/productos'),
        client.get('/insumos'),
      ]);
      setProductos(p.data.data);
      setInsumos(i.data.data);
    } catch {}
    const r = await getRol();
    setRol(r);
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
    setReceta([]);
    setModal(true);
  };

  const abrirEditar = item => {
    setEditando(item);
    setForm({
      nombre: item.nombre,
      descripcion: item.descripcion || '',
      precio_venta: String(item.precio_venta),
    });
    setReceta(
      (item.recetas || []).map(r => ({
        insumos_id: r.insumos_id,
        nombre: r.insumos?.nombre || '',
        unidad: r.insumos?.unidad_medida || '',
        cantidad: String(r.cantidad),
      })),
    );
    setModal(true);
  };

  const agregarInsumo = insumo => {
    setReceta(prev => {
      if (prev.find(i => i.insumos_id === insumo.id)) {
        Alert.alert('', 'Este insumo ya está en la receta.');
        return prev;
      }
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
    setModalInsumo(false);
  };

  const guardar = async () => {
    if (!form.nombre) return Alert.alert('Error', 'El nombre es requerido.');

    // Validar que todos los ingredientes tengan cantidad
    const invalido = receta.find(
      r => !Number(r.cantidad) || Number(r.cantidad) <= 0,
    );
    if (invalido)
      return Alert.alert(
        'Error',
        `La cantidad de "${invalido.nombre}" debe ser mayor a 0.`,
      );

    try {
      setSaving(true);
      const data = {
        nombre: form.nombre,
        descripcion: form.descripcion,
        precio_venta: Number(form.precio_venta) || 0,
      };

      let productoId;
      if (editando) {
        await client.put(`/productos/${editando.id}`, data);
        productoId = editando.id;
      } else {
        const res = await client.post('/productos', data);
        productoId = res.data.data.id;
      }

      // Guardar receta si hay ingredientes (o limpiarla si se borraron todos)
      await client.put(`/productos/${productoId}/receta`, {
        insumos: receta.map(r => ({
          insumos_id: r.insumos_id,
          cantidad: Number(r.cantidad),
        })),
      });

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
        {rol === 'admin' && (
          <TouchableOpacity style={s.btnNew} onPress={abrirNuevo}>
            <Text style={s.btnNewText}>+ Nuevo</Text>
          </TouchableOpacity>
        )}
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
                {rol === 'admin' && item.descripcion ? (
                  <Text style={s.cardDesc}>{item.descripcion}</Text>
                ) : null}
                <Text style={s.cardPrecio}>{fmt(item.precio_venta)}</Text>
                <Text
                  style={[s.cardStock, rol !== 'admin' && s.cardStockGrande]}
                >
                  Stock: {Number(item.stock_actual || 0)} unidades
                </Text>
              </View>
              {rol === 'admin' && (
                <View style={s.actions}>
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
              )}
            </View>
            {rol === 'admin' && item.recetas?.length > 0 && (
              <View style={s.recetaPreview}>
                <Text style={s.recetaLabel}>🧾 Receta: </Text>
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

      {/* ── Modal producto + receta ── */}
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

          <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
            {/* ── Datos básicos ── */}
            <Text style={s.sectionLabel}>Información del producto</Text>

            <View style={s.field}>
              <Text style={s.label}>Nombre *</Text>
              <TextInput
                style={s.input}
                value={form.nombre}
                onChangeText={v => setForm(p => ({ ...p, nombre: v }))}
                placeholder="Ej: Arepa de choclo"
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Descripción</Text>
              <TextInput
                style={[s.input, { minHeight: 70 }]}
                value={form.descripcion}
                onChangeText={v => setForm(p => ({ ...p, descripcion: v }))}
                placeholder="Descripción opcional"
                multiline
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Precio de venta</Text>
              <TextInput
                style={s.input}
                value={form.precio_venta}
                onChangeText={v => setForm(p => ({ ...p, precio_venta: v }))}
                keyboardType="numeric"
                placeholder="Ej: 2500"
              />
            </View>

            {/* ── Receta ── */}
            <View style={s.recetaHeader}>
              <Text style={s.sectionLabel}>Receta / Ingredientes</Text>
              <TouchableOpacity
                style={s.btnAgregarInsumo}
                onPress={() => setModalInsumo(true)}
              >
                <Text style={s.btnAgregarInsumoText}>+ Agregar</Text>
              </TouchableOpacity>
            </View>

            {receta.length === 0 ? (
              <TouchableOpacity
                style={s.recetaVacia}
                onPress={() => setModalInsumo(true)}
              >
                <Text style={s.recetaVaciaIcon}>🧾</Text>
                <Text style={s.recetaVaciaText}>
                  Sin ingredientes aún.{'\n'}Toca para agregar insumos a la
                  receta.
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                {receta.map((item, idx) => (
                  <View key={item.insumos_id} style={s.ingredienteRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.ingredienteNombre}>{item.nombre}</Text>
                      <Text style={s.ingredienteUnidad}>{item.unidad}</Text>
                    </View>
                    <TextInput
                      style={s.cantInput}
                      value={item.cantidad}
                      onChangeText={v =>
                        setReceta(prev =>
                          prev.map((r, i) =>
                            i === idx ? { ...r, cantidad: v } : r,
                          ),
                        )
                      }
                      keyboardType="numeric"
                    />
                    <Text style={s.cantUnidad}>{item.unidad}</Text>
                    <TouchableOpacity
                      onPress={() =>
                        setReceta(prev => prev.filter((_, i) => i !== idx))
                      }
                      style={s.removeBtn}
                    >
                      <Text style={s.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={s.btnAgregarMas}
                  onPress={() => setModalInsumo(true)}
                >
                  <Text style={s.btnAgregarMasText}>
                    + Agregar otro ingrediente
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[s.btnGuardar, saving && { opacity: 0.6 }]}
              onPress={guardar}
              disabled={saving}
            >
              <Text style={s.btnGuardarText}>
                {saving ? 'Guardando...' : 'Guardar producto'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Modal selector de insumo ── */}
      <Modal
        visible={modalInsumo}
        animationType="slide"
        onRequestClose={() => setModalInsumo(false)}
      >
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Seleccionar insumo</Text>
            <TouchableOpacity onPress={() => setModalInsumo(false)}>
              <Text style={s.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={insumos.filter(i => i.activo)}
            keyExtractor={i => String(i.id)}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
            ListEmptyComponent={
              <Text style={s.empty}>Sin insumos registrados</Text>
            }
            renderItem={({ item }) => {
              const yaAgregado = receta.find(r => r.insumos_id === item.id);
              return (
                <TouchableOpacity
                  style={[s.insumoRow, yaAgregado && s.insumoRowDesactivado]}
                  onPress={() => !yaAgregado && agregarInsumo(item)}
                  disabled={!!yaAgregado}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[s.insumoNombre, yaAgregado && { color: '#aaa' }]}
                    >
                      {item.nombre}
                    </Text>
                    <Text style={s.insumoUnidad}>
                      {item.unidad_medida} · Stock: {item.stock_actual}
                    </Text>
                  </View>
                  {yaAgregado ? (
                    <Text style={s.yaAgregado}>✓ Agregado</Text>
                  ) : (
                    <Text style={s.addBtn}>＋</Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />
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
  cardStock: {
    fontSize: 13,
    color: '#457B9D',
    fontWeight: '600',
    marginTop: 2,
  },
  cardStockGrande: {
    fontSize: 18,
    marginTop: 6,
  },
  actions: { flexDirection: 'row', gap: 8, marginLeft: 8 },
  editBtn: { padding: 2 },
  recetaPreview: {
    flexDirection: 'row',
    marginTop: 10,
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
    paddingTop: 8,
  },
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
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  close: { fontSize: 20, color: '#888' },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  field: { paddingHorizontal: 16, paddingTop: 12 },
  label: { fontSize: 13, color: '#888', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  recetaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
  },
  btnAgregarInsumo: {
    backgroundColor: '#E63946',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 16,
  },
  btnAgregarInsumoText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  recetaVacia: {
    margin: 16,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 10,
    alignItems: 'center',
  },
  recetaVaciaIcon: { fontSize: 28, marginBottom: 8 },
  recetaVaciaText: {
    fontSize: 13,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 20,
  },
  ingredienteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    gap: 8,
  },
  ingredienteNombre: { fontSize: 14, fontWeight: '600', color: '#333' },
  ingredienteUnidad: { fontSize: 11, color: '#aaa', marginTop: 2 },
  cantInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    width: 70,
    textAlign: 'center',
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  cantUnidad: { fontSize: 12, color: '#888', width: 35 },
  removeBtn: { padding: 6 },
  removeBtnText: { color: '#E63946', fontSize: 16 },
  btnAgregarMas: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E63946',
    borderRadius: 8,
    alignItems: 'center',
  },
  btnAgregarMasText: { color: '#E63946', fontSize: 14, fontWeight: '600' },
  btnGuardar: {
    margin: 16,
    marginTop: 24,
    backgroundColor: '#E63946',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnGuardarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  insumoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  insumoRowDesactivado: { opacity: 0.5 },
  insumoNombre: { fontSize: 15, color: '#333', fontWeight: '500' },
  insumoUnidad: { fontSize: 12, color: '#aaa', marginTop: 2 },
  addBtn: { fontSize: 24, color: '#E63946', fontWeight: 'bold' },
  yaAgregado: { fontSize: 13, color: '#2DC653', fontWeight: '600' },
});

export default ProductosScreen;

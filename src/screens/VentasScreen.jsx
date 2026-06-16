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

const VentasScreen = () => {
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [modalClientes, setModalClientes] = useState(false);
  const [ventaDetalle, setVentaDetalle] = useState(null);
  const [modalDetalle, setModalDetalle] = useState(false);

  // Form state
  const [items, setItems] = useState([]);
  const [canal, setCanal] = useState('punto_venta');

  const cargar = useCallback(async () => {
    try {
      const [v, p, c] = await Promise.all([
        client.get('/ventas'),
        client.get('/productos'),
        client.get('/clientes'),
      ]);
      setVentas(v.data.data);
      setProductos(p.data.data);
      setClientes(c.data.data);
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const agregarItem = producto => {
    setItems(prev => {
      const existe = prev.find(i => i.productos_id === producto.id);
      if (existe) {
        return prev.map(i =>
          i.productos_id === producto.id
            ? { ...i, cantidad: i.cantidad + 1 }
            : i,
        );
      }
      return [
        ...prev,
        {
          productos_id: producto.id,
          nombre: producto.nombre,
          cantidad: 1,
          precio_unitario: Number(producto.precio_venta),
        },
      ];
    });
  };

  const quitarItem = productos_id =>
    setItems(prev => prev.filter(i => i.productos_id !== productos_id));

  const total = items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);

  const guardar = async () => {
    if (!items.length)
      return Alert.alert('Error', 'Agrega al menos un producto.');
    try {
      setSaving(true);
      await client.post('/ventas', {
        fecha: new Date().toISOString().split('T')[0],
        canal,
        clientes_id: clienteSeleccionado?.id ?? null,
        items: items.map(({ productos_id, cantidad, precio_unitario }) => ({
          productos_id,
          cantidad,
          precio_unitario,
        })),
      });
      setModal(false);
      setItems([]);
      setClienteSeleccionado(null);
      cargar();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const verDetalle = async venta => {
    try {
      const res = await client.get(`/ventas/${venta.id}`);
      setVentaDetalle(res.data.data);
      setModalDetalle(true);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el detalle.');
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
        <Text style={s.title}>Ventas</Text>
        <TouchableOpacity style={s.btnNew} onPress={() => setModal(true)}>
          <Text style={s.btnNewText}>+ Nueva venta</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={ventas}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={s.empty}>Sin ventas registradas</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => verDetalle(item)}>
            <View style={s.cardRow}>
              <Text style={s.cardTitle}>Venta #{item.id}</Text>
              <Text style={s.cardTotal}>{fmt(item.total)}</Text>
            </View>
            <Text style={s.cardSub}>
              {fmtFecha(item.fecha)} · {item.canal}
            </Text>
            {item.clientes && (
              <Text style={s.cardCliente}>👤 {item.clientes.nombre}</Text>
            )}
            {item.ventas_items?.map(vi => (
              <Text key={vi.id} style={s.cardItem}>
                • {vi.productos?.nombre} x{vi.cantidad} — {fmt(vi.subtotal)}
              </Text>
            ))}
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
            <Text style={s.modalTitle}>Nueva venta</Text>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Text style={s.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView>
            <Text style={s.sectionLabel}>Productos disponibles</Text>
            {productos
              .filter(p => p.activo)
              .map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={s.prodRow}
                  onPress={() => agregarItem(p)}
                >
                  <View>
                    <Text style={s.prodNombre}>{p.nombre}</Text>
                    <Text style={s.prodPrecio}>{fmt(p.precio_venta)}</Text>
                  </View>
                  <Text style={s.addBtn}>＋</Text>
                </TouchableOpacity>
              ))}

            <Text style={s.sectionLabel}>Cliente (opcional)</Text>
            <TouchableOpacity
              style={s.clienteSelector}
              onPress={() => setModalClientes(true)}
            >
              <Text
                style={
                  clienteSeleccionado ? s.clienteNombre : s.clientePlaceholder
                }
              >
                {clienteSeleccionado
                  ? clienteSeleccionado.nombre
                  : 'Sin cliente — toca para asignar'}
              </Text>
              {clienteSeleccionado && (
                <TouchableOpacity onPress={() => setClienteSeleccionado(null)}>
                  <Text style={s.removeBtn}>✕</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {items.length > 0 && (
              <>
                <Text style={s.sectionLabel}>Resumen</Text>
                {items.map(i => (
                  <View key={i.productos_id} style={s.itemRow}>
                    <Text style={s.itemNombre}>
                      {i.nombre} x{i.cantidad}
                    </Text>
                    <Text style={s.itemSubtotal}>
                      {fmt(i.precio_unitario * i.cantidad)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => quitarItem(i.productos_id)}
                    >
                      <Text style={s.removeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Total</Text>
                  <Text style={s.totalValue}>{fmt(total)}</Text>
                </View>
              </>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[s.btnGuardar, saving && { opacity: 0.6 }]}
            onPress={guardar}
            disabled={saving}
          >
            <Text style={s.btnGuardarText}>
              {saving ? 'Guardando...' : `Registrar venta · ${fmt(total)}`}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
      <Modal
        visible={modalDetalle}
        animationType="slide"
        onRequestClose={() => setModalDetalle(false)}
      >
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Venta #{ventaDetalle?.id}</Text>
            <TouchableOpacity onPress={() => setModalDetalle(false)}>
              <Text style={s.close}>✕</Text>
            </TouchableOpacity>
          </View>
          {ventaDetalle && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={s.detalleSeccion}>
                <Text style={s.detalleLabel}>Fecha</Text>
                <Text style={s.detalleValor}>
                  {fmtFecha(ventaDetalle.fecha)}
                </Text>
              </View>
              <View style={s.detalleSeccion}>
                <Text style={s.detalleLabel}>Canal</Text>
                <Text style={s.detalleValor}>{ventaDetalle.canal}</Text>
              </View>
              {ventaDetalle.clientes && (
                <View style={s.detalleSeccion}>
                  <Text style={s.detalleLabel}>Cliente</Text>
                  <Text style={s.detalleValor}>
                    {ventaDetalle.clientes.nombre}
                  </Text>
                </View>
              )}
              {ventaDetalle.notas ? (
                <View style={s.detalleSeccion}>
                  <Text style={s.detalleLabel}>Notas</Text>
                  <Text style={s.detalleValor}>{ventaDetalle.notas}</Text>
                </View>
              ) : null}

              <Text style={s.sectionLabel}>Productos</Text>
              {ventaDetalle.ventas_items?.map(vi => (
                <View key={vi.id} style={s.detalleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.detalleRowNombre}>
                      {vi.productos?.nombre}
                    </Text>
                    <Text style={s.detalleLabel}>
                      x{vi.cantidad} · {fmt(vi.precio_unitario)} c/u
                    </Text>
                  </View>
                  <Text style={s.detalleRowCant}>{fmt(vi.subtotal)}</Text>
                </View>
              ))}

              <View
                style={[
                  s.detalleSeccion,
                  { marginTop: 16, borderTopWidth: 2, borderColor: '#eee' },
                ]}
              >
                <Text
                  style={[
                    s.detalleLabel,
                    { fontSize: 16, fontWeight: 'bold', color: '#333' },
                  ]}
                >
                  Total
                </Text>
                <Text
                  style={[
                    s.detalleValor,
                    { fontSize: 16, color: '#2DC653', fontWeight: '700' },
                  ]}
                >
                  {fmt(ventaDetalle.total)}
                </Text>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
      <Modal
        visible={modalClientes}
        animationType="slide"
        onRequestClose={() => setModalClientes(false)}
      >
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Seleccionar cliente</Text>
            <TouchableOpacity onPress={() => setModalClientes(false)}>
              <Text style={s.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={clientes}
            keyExtractor={c => String(c.id)}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
              <Text style={s.empty}>Sin clientes registrados</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.prodRow}
                onPress={() => {
                  setClienteSeleccionado(item);
                  setModalClientes(false);
                }}
              >
                <View>
                  <Text style={s.prodNombre}>{item.nombre}</Text>
                  {item.telefono && (
                    <Text style={s.prodPrecio}>{item.telefono}</Text>
                  )}
                </View>
                <Text style={s.arrow}>›</Text>
              </TouchableOpacity>
            )}
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
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { fontWeight: '700', fontSize: 15, color: '#333' },
  cardTotal: { fontWeight: '700', fontSize: 15, color: '#2DC653' },
  cardSub: { color: '#888', fontSize: 12, marginTop: 2, marginBottom: 6 },
  cardItem: { color: '#555', fontSize: 13 },
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
    fontSize: 14,
    fontWeight: '700',
    color: '#888',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  prodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  prodNombre: { fontSize: 15, color: '#333', fontWeight: '500' },
  prodPrecio: { fontSize: 13, color: '#888' },
  addBtn: { fontSize: 22, color: '#E63946', fontWeight: 'bold' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  itemNombre: { flex: 1, fontSize: 14, color: '#333' },
  itemSubtotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 12,
  },
  removeBtn: { color: '#E63946', fontSize: 16 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 2,
    borderColor: '#eee',
  },
  totalLabel: { fontSize: 17, fontWeight: 'bold' },
  totalValue: { fontSize: 17, fontWeight: 'bold', color: '#2DC653' },
  btnGuardar: {
    margin: 16,
    backgroundColor: '#E63946',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnGuardarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  clienteSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  clienteNombre: { fontSize: 14, color: '#333', fontWeight: '600' },
  clientePlaceholder: { fontSize: 14, color: '#aaa' },
  arrow: { fontSize: 22, color: '#ccc' },
  cardCliente: { fontSize: 12, color: '#457B9D', marginBottom: 4 },
  detalleSeccion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  detalleLabel: { fontSize: 13, color: '#888' },
  detalleValor: { fontSize: 13, color: '#333', fontWeight: '600' },
  detalleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  detalleRowNombre: { fontSize: 14, color: '#333', fontWeight: '600' },
  detalleRowCant: { fontSize: 14, color: '#2DC653', fontWeight: '700' },
});

export default VentasScreen;

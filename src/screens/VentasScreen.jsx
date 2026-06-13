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

  // Form state
  const [items, setItems] = useState([]);
  const [canal, setCanal] = useState('punto_venta');

  const cargar = useCallback(async () => {
    try {
      const [v, p] = await Promise.all([
        client.get('/ventas'),
        client.get('/productos'),
      ]);
      setVentas(v.data.data);
      setProductos(p.data.data);
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
        items: items.map(({ productos_id, cantidad, precio_unitario }) => ({
          productos_id,
          cantidad,
          precio_unitario,
        })),
      });
      setModal(false);
      setItems([]);
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
          <View style={s.card}>
            <View style={s.cardRow}>
              <Text style={s.cardTitle}>Venta #{item.id}</Text>
              <Text style={s.cardTotal}>{fmt(item.total)}</Text>
            </View>
            <Text style={s.cardSub}>
              {fmtFecha(item.fecha)} · {item.canal}
            </Text>
            {item.ventas_items?.map(vi => (
              <Text key={vi.id} style={s.cardItem}>
                • {vi.productos?.nombre} x{vi.cantidad} — {fmt(vi.subtotal)}
              </Text>
            ))}
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
});

export default VentasScreen;

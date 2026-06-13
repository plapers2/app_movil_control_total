import React, { useEffect, useState, useCallback } from 'react';
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

const ProduccionScreen = () => {
  const [lotes, setLotes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [notas, setNotas] = useState('');

  const cargar = useCallback(async () => {
    try {
      const [l, p] = await Promise.all([
        client.get('/produccion'),
        client.get('/productos'),
      ]);
      setLotes(l.data.data);
      setProductos(p.data.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregarProducto = producto => {
    setItems(prev => {
      const existe = prev.find(i => i.productos_id === producto.id);
      if (existe)
        return prev.map(i =>
          i.productos_id === producto.id
            ? { ...i, cantidad: i.cantidad + 1 }
            : i,
        );
      return [
        ...prev,
        { productos_id: producto.id, nombre: producto.nombre, cantidad: 1 },
      ];
    });
  };

  const guardar = async () => {
    if (!items.length)
      return Alert.alert('Error', 'Agrega al menos un producto.');
    try {
      setSaving(true);
      await client.post('/produccion', {
        fecha: new Date().toISOString().split('T')[0],
        notas,
        items: items.map(({ productos_id, cantidad }) => ({
          productos_id,
          cantidad,
        })),
      });
      setModal(false);
      setItems([]);
      setNotas('');
      cargar();
    } catch (err) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Error al registrar.',
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
        <Text style={s.title}>Producción</Text>
        <TouchableOpacity style={s.btnNew} onPress={() => setModal(true)}>
          <Text style={s.btnNewText}>+ Lote</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={lotes}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={s.empty}>Sin lotes registrados</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardRow}>
              <Text style={s.cardTitle}>Lote #{item.id}</Text>
              <Text style={s.cardFecha}>{fmtFecha(item.fecha)}</Text>
            </View>
            {item.notas ? <Text style={s.cardNotas}>{item.notas}</Text> : null}
            {item.lotes_produccion_items?.map(li => (
              <Text key={li.id} style={s.cardItem}>
                • {li.productos?.nombre} × {li.cantidad}
              </Text>
            ))}
            {Number(item.costo_total) > 0 && (
              <Text style={s.cardCosto}>Costo: {fmt(item.costo_total)}</Text>
            )}
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
            <Text style={s.modalTitle}>Nuevo lote</Text>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Text style={s.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            <Text style={s.sectionLabel}>Productos a producir</Text>
            {productos
              .filter(p => p.activo)
              .map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={s.prodRow}
                  onPress={() => agregarProducto(p)}
                >
                  <Text style={s.prodNombre}>{p.nombre}</Text>
                  <Text style={s.addBtn}>＋</Text>
                </TouchableOpacity>
              ))}

            {items.length > 0 && (
              <>
                <Text style={s.sectionLabel}>Resumen del lote</Text>
                {items.map((item, idx) => (
                  <View key={item.productos_id} style={s.itemRow}>
                    <Text style={s.itemNombre}>{item.nombre}</Text>
                    <TextInput
                      style={s.cantInput}
                      value={String(item.cantidad)}
                      onChangeText={v =>
                        setItems(prev =>
                          prev.map((i, n) =>
                            n === idx ? { ...i, cantidad: Number(v) || 1 } : i,
                          ),
                        )
                      }
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setItems(prev => prev.filter((_, n) => n !== idx))
                      }
                    >
                      <Text style={s.removeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            <View style={s.field}>
              <Text style={s.label}>Notas (opcional)</Text>
              <TextInput
                style={s.input}
                value={notas}
                onChangeText={setNotas}
                placeholder="Ej: Producción del día"
                multiline
              />
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[s.btnGuardar, saving && { opacity: 0.6 }]}
            onPress={guardar}
            disabled={saving}
          >
            <Text style={s.btnGuardarText}>
              {saving ? 'Registrando...' : 'Registrar lote'}
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
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
  cardFecha: { fontSize: 13, color: '#888' },
  cardNotas: { fontSize: 13, color: '#666', marginTop: 4, fontStyle: 'italic' },
  cardItem: { fontSize: 13, color: '#555', marginTop: 4 },
  cardCosto: {
    fontSize: 13,
    color: '#E63946',
    marginTop: 6,
    fontWeight: '600',
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    textTransform: 'uppercase',
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
  prodNombre: { fontSize: 15, color: '#333' },
  addBtn: { fontSize: 22, color: '#E63946', fontWeight: 'bold' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    gap: 8,
  },
  itemNombre: { flex: 1, fontSize: 14, color: '#333' },
  cantInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 6,
    width: 50,
    textAlign: 'center',
    fontSize: 14,
  },
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

export default ProduccionScreen;

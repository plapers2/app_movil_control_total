import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { coincide } from '../utils/texto';

const fmt = n => `$${Number(n || 0).toLocaleString('es-CO')}`;

// Modal de selección de producto: carga todos los productos activos con un
// buscador arriba (mismo patrón que el selector de cliente en VentasScreen).
// No se cierra al seleccionar, ya que a diferencia del cliente, se pueden
// elegir varios productos seguidos. Funciona como un toggle: tocar un
// producto no seleccionado lo agrega (chulito), tocarlo de nuevo lo quita.
// La cantidad se ajusta después en la pantalla de venta, no aquí.
const SelectorProductoModal = ({
  visible,
  onClose,
  productos,
  items,
  onAgregar,
  onQuitar,
}) => {
  const [busqueda, setBusqueda] = useState('');

  const cerrar = () => {
    setBusqueda('');
    onClose();
  };

  const disponibles = productos.filter(
    p => p.activo && coincide(p.nombre, busqueda),
  );

  const toggle = producto => {
    const seleccionado = items.some(i => i.productos_id === producto.id);
    if (seleccionado) {
      onQuitar(producto.id);
    } else {
      onAgregar(producto);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={cerrar}>
      <View style={s.modal}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>Seleccionar producto</Text>
          <TouchableOpacity onPress={cerrar}>
            <Text style={s.close}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={s.buscadorBox}>
          <TextInput
            style={s.buscadorInput}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar producto..."
            placeholderTextColor="#aaa"
            autoFocus
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <Text style={s.removeBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={disponibles}
          keyExtractor={p => String(p.id)}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={s.empty}>Sin resultados</Text>}
          renderItem={({ item }) => {
            const seleccionado = items.some(i => i.productos_id === item.id);
            return (
              <TouchableOpacity
                style={[s.prodRow, seleccionado && s.prodRowDesactivado]}
                onPress={() => toggle(item)}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[s.prodNombre, seleccionado && { color: '#aaa' }]}
                  >
                    {item.nombre}
                  </Text>
                  <Text style={s.prodPrecio}>{fmt(item.precio_venta)}</Text>
                </View>
                {seleccionado ? (
                  <Text style={s.yaAgregado}>✓ Agregado</Text>
                ) : (
                  <Text style={s.addBtn}>＋</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />

        <TouchableOpacity style={s.btnListo} onPress={cerrar}>
          <Text style={s.btnListoText}>Listo</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
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
  buscadorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 0,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  buscadorInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  removeBtn: { color: '#E63946', fontSize: 16 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },
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
  addBtn: {
    fontSize: 22,
    color: '#E63946',
    fontWeight: 'bold',
    marginLeft: 12,
  },
  prodRowDesactivado: { opacity: 0.5 },
  yaAgregado: { fontSize: 13, color: '#2DC653', fontWeight: '600' },
  btnListo: {
    margin: 16,
    backgroundColor: '#E63946',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnListoText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});

export default SelectorProductoModal;

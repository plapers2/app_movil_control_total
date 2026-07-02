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
} from 'react-native';
import client from '../api/client';
import { coincide } from '../utils/texto';

const ClientesScreen = () => {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
    notas: '',
  });

  const cargar = useCallback(async () => {
    try {
      const r = await client.get('/clientes');
      setClientes(r.data.data);
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
    setForm({ nombre: '', telefono: '', direccion: '', notas: '' });
    setModal(true);
  };

  const abrirEditar = item => {
    setEditando(item);
    setForm({
      nombre: item.nombre,
      telefono: item.telefono || '',
      direccion: item.direccion || '',
      notas: item.notas || '',
    });
    setModal(true);
  };

  const guardar = async () => {
    if (!form.nombre) return Alert.alert('Error', 'El nombre es requerido.');
    try {
      setSaving(true);
      if (editando) await client.put(`/clientes/${editando.id}`, form);
      else await client.post('/clientes', form);
      setModal(false);
      cargar();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const eliminar = item => {
    Alert.alert('Desactivar', `¿Desactivar a "${item.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desactivar',
        style: 'destructive',
        onPress: async () => {
          await client.delete(`/clientes/${item.id}`);
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
        <Text style={s.title}>Clientes</Text>
        <TouchableOpacity style={s.btnNew} onPress={abrirNuevo}>
          <Text style={s.btnNewText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      <View style={s.buscadorBox}>
        <TextInput
          style={s.buscadorInput}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por nombre, teléfono o dirección..."
          placeholderTextColor="#aaa"
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda('')}>
            <Text style={s.removeBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={clientes.filter(c => {
          if (!c.activo) return false;
          if (!busqueda.trim()) return true;
          return (
            coincide(c.nombre, busqueda) ||
            coincide(c.telefono, busqueda) ||
            coincide(c.direccion, busqueda)
          );
        })}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={s.empty}>
            {busqueda.trim() ? 'Sin resultados' : 'Sin clientes registrados'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardRow}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {item.nombre.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardNombre}>{item.nombre}</Text>
                {item.telefono ? (
                  <Text style={s.cardSub}>📞 {item.telefono}</Text>
                ) : null}
                {item.direccion ? (
                  <Text style={s.cardSub}>📍 {item.direccion}</Text>
                ) : null}
              </View>
              <View style={s.actions}>
                <TouchableOpacity onPress={() => abrirEditar(item)}>
                  <Text style={s.icon}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => eliminar(item)}>
                  <Text style={s.icon}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
            {item.notas ? <Text style={s.notas}>💬 {item.notas}</Text> : null}
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
            <Text style={s.modalTitle}>
              {editando ? 'Editar cliente' : 'Nuevo cliente'}
            </Text>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Text style={s.close}>✕</Text>
            </TouchableOpacity>
          </View>
          {[
            { key: 'nombre', label: 'Nombre *', keyboard: 'default' },
            { key: 'telefono', label: 'Teléfono', keyboard: 'phone-pad' },
            { key: 'direccion', label: 'Dirección', keyboard: 'default' },
            { key: 'notas', label: 'Notas', keyboard: 'default' },
          ].map(({ key, label, keyboard }) => (
            <View key={key} style={s.field}>
              <Text style={s.label}>{label}</Text>
              <TextInput
                style={s.input}
                value={form[key]}
                onChangeText={v => setForm(p => ({ ...p, [key]: v }))}
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
  buscadorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E63946',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cardNombre: { fontSize: 16, fontWeight: '700', color: '#333' },
  cardSub: { fontSize: 13, color: '#888', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  icon: { fontSize: 16 },
  notas: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
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
  btnGuardar: {
    margin: 20,
    backgroundColor: '#E63946',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnGuardarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default ClientesScreen;

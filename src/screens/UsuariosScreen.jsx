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

const UsuariosScreen = ({ navigation }) => {
  const [miembros, setMiembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'empleado',
  });

  const cargar = useCallback(async () => {
    try {
      const res = await client.get('/auth/usuarios');
      setMiembros(res.data.data);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los usuarios.');
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const guardar = async () => {
    if (!form.nombre || !form.email || !form.password)
      return Alert.alert('Error', 'Todos los campos son requeridos.');
    try {
      setSaving(true);
      await client.post('/auth/usuarios', form);
      setModal(false);
      setForm({ nombre: '', email: '', password: '', rol: 'empleado' });
      cargar();
    } catch (err) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Error al crear usuario.',
      );
    } finally {
      setSaving(false);
    }
  };

  const eliminar = miembro => {
    Alert.alert(
      'Desactivar usuario',
      `¿Desactivar a ${miembro.usuarios?.nombre} de la empresa?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            try {
              await client.delete(`/auth/usuarios/${miembro.id}`);
              cargar();
            } catch {
              Alert.alert('Error', 'No se pudo desactivar el usuario.');
            }
          },
        },
      ],
    );
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={s.title}>Usuarios</Text>
        <TouchableOpacity style={s.btnNew} onPress={() => setModal(true)}>
          <Text style={s.btnNewText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={miembros}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={s.empty}>Sin usuarios registrados</Text>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.nombre}>{item.usuarios?.nombre}</Text>
              <Text style={s.email}>{item.usuarios?.email}</Text>
              <View
                style={[
                  s.rolBadge,
                  item.roles?.nombre === 'admin' ? s.rolAdmin : s.rolEmp,
                ]}
              >
                <Text style={s.rolText}>{item.roles?.nombre}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => eliminar(item)}>
              <Text style={s.deleteBtn}>✕</Text>
            </TouchableOpacity>
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
            <Text style={s.modalTitle}>Nuevo usuario</Text>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Text style={s.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Nombre *</Text>
            <TextInput
              style={s.input}
              value={form.nombre}
              onChangeText={v => setForm(p => ({ ...p, nombre: v }))}
              placeholder="Nombre completo"
            />
          </View>
          <View style={s.field}>
            <Text style={s.label}>Email *</Text>
            <TextInput
              style={s.input}
              value={form.email}
              onChangeText={v => setForm(p => ({ ...p, email: v }))}
              placeholder="correo@ejemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={s.field}>
            <Text style={s.label}>Contraseña *</Text>
            <TextInput
              style={s.input}
              value={form.password}
              onChangeText={v => setForm(p => ({ ...p, password: v }))}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
            />
          </View>

          <Text style={s.label}>Rol</Text>
          <View style={s.toggle}>
            {['empleado', 'admin'].map(r => (
              <TouchableOpacity
                key={r}
                style={[s.toggleBtn, form.rol === r && s.toggleActive]}
                onPress={() => setForm(p => ({ ...p, rol: r }))}
              >
                <Text
                  style={[s.toggleText, form.rol === r && s.toggleTextActive]}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[s.btnGuardar, saving && { opacity: 0.6 }]}
            onPress={guardar}
            disabled={saving}
          >
            <Text style={s.btnGuardarText}>
              {saving ? 'Guardando...' : 'Crear usuario'}
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
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  back: { color: '#E63946', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  btnNew: {
    backgroundColor: '#E63946',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnNewText: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  nombre: { fontSize: 15, fontWeight: '700', color: '#333' },
  email: { fontSize: 13, color: '#888', marginTop: 2 },
  rolBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  rolAdmin: { backgroundColor: '#FFE8E8' },
  rolEmp: { backgroundColor: '#E8F4FF' },
  rolText: { fontSize: 12, fontWeight: '600', color: '#333' },
  deleteBtn: { color: '#E63946', fontSize: 20, paddingLeft: 12 },
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
  label: {
    fontSize: 13,
    color: '#888',
    marginBottom: 6,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  toggle: { flexDirection: 'row', marginHorizontal: 20, marginTop: 8, gap: 8 },
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
  btnGuardar: {
    margin: 20,
    backgroundColor: '#E63946',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnGuardarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default UsuariosScreen;

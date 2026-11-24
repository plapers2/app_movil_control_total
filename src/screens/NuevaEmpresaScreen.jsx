import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import client from '../api/client';
import CredencialesModal from '../components/CredencialesModal';
import KeyboardView from '../components/KeyboardView';
import { HEADER_TOP } from '../utils/safeArea';
import { colors } from '../theme/colors';

const NuevaEmpresaScreen = ({ navigation }) => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [modo, setModo] = useState('nuevo'); // 'nuevo' | 'existente'
  const [adminNombre, setAdminNombre] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [credenciales, setCredenciales] = useState(null); // { email, password }

  useEffect(() => {
    if (modo !== 'existente' || usuarios.length) return;
    client
      .get('/superadmin/usuarios')
      .then(res => setUsuarios(res.data.data))
      .catch(() => Alert.alert('Error', 'No se pudieron cargar los usuarios.'));
  }, [modo, usuarios.length]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = q
      ? usuarios.filter(
          u =>
            u.nombre.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q),
        )
      : usuarios;
    return lista.slice(0, 8);
  }, [busqueda, usuarios]);

  const handleCrear = async () => {
    if (!nombre.trim())
      return Alert.alert('Error', 'El nombre de la empresa es requerido.');

    let admin;
    if (modo === 'nuevo') {
      if (!adminNombre.trim() || !/\S+@\S+\.\S+/.test(adminEmail.trim()))
        return Alert.alert(
          'Error',
          'Ingresa el nombre y un email válido para el admin.',
        );
      admin = { nombre: adminNombre.trim(), email: adminEmail.trim() };
    } else {
      if (!seleccionado)
        return Alert.alert('Error', 'Selecciona un usuario como admin.');
      admin = { usuarios_id: seleccionado.id };
    }

    try {
      setLoading(true);
      const res = await client.post('/superadmin/empresas', {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        admin,
      });
      const { admin: adm, password_temporal } = res.data.data;

      if (password_temporal) {
        setCredenciales({ email: adm.email, password: password_temporal });
      } else {
        Alert.alert(
          'Empresa creada',
          `${adm.nombre} ahora es admin de la empresa.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      }
    } catch (err) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'No se pudo crear la empresa.',
      );
    } finally {
      setLoading(false);
    }
  };

  const cerrarModal = () => {
    setCredenciales(null);
    navigation.goBack();
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={s.title}>Nueva empresa</Text>
        <View style={{ width: 60 }} />
      </View>
      <KeyboardView>
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.label}>Empresa</Text>
          <TextInput
            style={s.input}
            placeholder="Nombre de la empresa"
            value={nombre}
            onChangeText={setNombre}
          />
          <TextInput
            style={s.input}
            placeholder="Descripción (opcional)"
            value={descripcion}
            onChangeText={setDescripcion}
          />

          <Text style={s.label}>Administrador</Text>
          <View style={s.chips}>
            {[
              { key: 'nuevo', label: 'Admin nuevo' },
              { key: 'existente', label: 'Admin existente' },
            ].map(m => (
              <TouchableOpacity
                key={m.key}
                style={[s.chip, modo === m.key && s.chipOn]}
                onPress={() => setModo(m.key)}
              >
                <Text style={[s.chipText, modo === m.key && s.chipTextOn]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {modo === 'nuevo' ? (
            <>
              <TextInput
                style={s.input}
                placeholder="Nombre del admin"
                value={adminNombre}
                onChangeText={setAdminNombre}
              />
              <TextInput
                style={s.input}
                placeholder="Email del admin"
                value={adminEmail}
                onChangeText={setAdminEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Text style={s.hint}>
                Se generará una contraseña temporal que verás una sola vez. Si
                se pierde, podrás generar otra desde la lista de empresas. El
                admin deberá cambiarla en su primer ingreso.
              </Text>
            </>
          ) : (
            <>
              <TextInput
                style={s.input}
                placeholder="Buscar por nombre o email"
                value={busqueda}
                onChangeText={setBusqueda}
                autoCapitalize="none"
              />
              {filtrados.map(u => (
                <TouchableOpacity
                  key={u.id}
                  style={[s.user, seleccionado?.id === u.id && s.userOn]}
                  onPress={() => setSeleccionado(u)}
                >
                  <Text style={s.userName}>{u.nombre}</Text>
                  <Text style={s.userEmail}>{u.email}</Text>
                </TouchableOpacity>
              ))}
              {usuarios.length > 8 && (
                <Text style={s.hint}>Escribe para filtrar la lista.</Text>
              )}
            </>
          )}

          <TouchableOpacity
            style={[s.btn, loading && { opacity: 0.6 }]}
            onPress={handleCrear}
            disabled={loading}
          >
            <Text style={s.btnText}>
              {loading ? 'Creando...' : 'Crear empresa'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardView>
      <CredencialesModal
        visible={!!credenciales}
        titulo="Empresa creada"
        email={credenciales?.email}
        password={credenciales?.password}
        onClose={cerrarModal}
        bloquear
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.fondo },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: HEADER_TOP,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  back: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.texto },
  label: {
    fontSize: 12,
    color: colors.textoSuave,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borde,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  hint: { fontSize: 12, color: colors.textoSuave, marginBottom: 12 },
  chips: { flexDirection: 'row', marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.borde,
    marginRight: 8,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: '#555', fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  user: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  userOn: { borderColor: colors.primary, backgroundColor: '#FFF5F5' },
  userName: { fontSize: 15, fontWeight: '600', color: colors.texto },
  userEmail: { fontSize: 13, color: colors.textoSuave },
  btn: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default NuevaEmpresaScreen;

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import client from '../api/client';
import { saveUsuario, clearSession } from '../store/authStore';

const CambiarPasswordScreen = ({ navigation }) => {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGuardar = async () => {
    if (!actual || !nueva || !confirmar)
      return Alert.alert('Error', 'Completa todos los campos.');
    if (nueva.length < 8)
      return Alert.alert(
        'Error',
        'La nueva contraseña debe tener al menos 8 caracteres.',
      );
    if (nueva !== confirmar)
      return Alert.alert('Error', 'Las contraseñas nuevas no coinciden.');

    try {
      setLoading(true);
      await client.post('/auth/cambiar-password', {
        password_actual: actual,
        password_nuevo: nueva,
      });

      // Refrescar usuario y empresas (la bandera ya quedó en false)
      const me = await client.get('/auth/me');
      const { usuario, empresas } = me.data.data;
      await saveUsuario(usuario);

      if (usuario.es_superadmin && empresas.length === 0) {
        navigation.replace('Superadmin');
      } else {
        navigation.replace('SelectEmpresa', { empresas });
      }
    } catch (err) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'No se pudo cambiar la contraseña.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSalir = async () => {
    await clearSession();
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }),
    );
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Cambia tu contraseña</Text>
      <Text style={s.subtitle}>
        Por seguridad, debes reemplazar la contraseña temporal antes de
        continuar.
      </Text>
      <TextInput
        style={s.input}
        placeholder="Contraseña actual (temporal)"
        value={actual}
        onChangeText={setActual}
        secureTextEntry
        autoCapitalize="none"
      />
      <TextInput
        style={s.input}
        placeholder="Nueva contraseña (mín. 8 caracteres)"
        value={nueva}
        onChangeText={setNueva}
        secureTextEntry
        autoCapitalize="none"
      />
      <TextInput
        style={s.input}
        placeholder="Confirmar nueva contraseña"
        value={confirmar}
        onChangeText={setConfirmar}
        secureTextEntry
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={[s.btn, loading && { opacity: 0.6 }]}
        onPress={handleGuardar}
        disabled={loading}
      >
        <Text style={s.btnText}>{loading ? 'Guardando...' : 'Guardar'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleSalir} style={s.salir}>
        <Text style={s.salirText}>Salir</Text>
      </TouchableOpacity>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#E63946',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#888',
    marginTop: 8,
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  btn: {
    backgroundColor: '#E63946',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  salir: { alignItems: 'center', marginTop: 20 },
  salirText: { color: '#888', fontSize: 15 },
});

export default CambiarPasswordScreen;

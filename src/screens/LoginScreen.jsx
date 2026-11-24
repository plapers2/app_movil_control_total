import React, { useState, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { validarEmail } from '../utils/validar';
import client from '../api/client';
import { saveToken, saveUsuario, clearSession } from '../store/authStore';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const passRef = useRef(null);

  const handleLogin = async () => {
    const emailLimpio = email.trim().toLowerCase();
    if (!emailLimpio || !password)
      return Alert.alert('Error', 'Completa todos los campos.');
    if (!validarEmail(emailLimpio))
      return Alert.alert('Error', 'El email no es válido.');
    if (!email || !password)
      return Alert.alert('Error', 'Completa todos los campos.');
    try {
      setLoading(true);
      await clearSession();
      const res = await client.post('/auth/login', {
        email: emailLimpio,
        password,
      });
      const { token, usuario, empresas } = res.data.data;
      await saveToken(token);
      await saveUsuario(usuario);

      if (usuario.debe_cambiar_password) {
        navigation.replace('CambiarPassword');
      } else if (usuario.es_superadmin && empresas.length === 0) {
        navigation.replace('Superadmin');
      } else {
        navigation.replace('SelectEmpresa', { empresas });
      }
    } catch (err) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Error al iniciar sesión.',
      );
    } finally {
      setLoading(false);
    }
  };

  <KeyboardAvoidingView
    style={s.container}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  >
    <Text style={s.title}>Mi Arepita Querida</Text>
    <Text style={s.subtitle}>Control Total</Text>
    <TextInput
      style={s.input}
      placeholder="Email"
      value={email}
      onChangeText={setEmail}
      keyboardType="email-address"
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="next"
      onSubmitEditing={() => passRef.current?.focus()}
    />
    <TextInput
      ref={passRef}
      style={s.input}
      placeholder="Contraseña"
      value={password}
      onChangeText={setPassword}
      secureTextEntry
      returnKeyType="go"
      onSubmitEditing={handleLogin}
    />
    <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
      <Text style={s.btnText}>{loading ? 'Ingresando...' : 'Ingresar'}</Text>
    </TouchableOpacity>
  </KeyboardAvoidingView>;
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#E63946',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#888',
    marginBottom: 40,
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
});

export default LoginScreen;

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Share,
  StyleSheet,
} from 'react-native';

const CredencialesModal = ({
  visible,
  titulo,
  email,
  password,
  onClose,
  bloquear = false,
}) => {
  const compartir = () =>
    Share.share({
      message:
        'Acceso a Control Total\n' +
        `Email: ${email}\n` +
        `Contraseña temporal: ${password}\n` +
        'Deberás cambiarla al ingresar por primera vez.',
    });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={bloquear ? () => {} : onClose}
    >
      <View style={s.overlay}>
        <View style={s.modal}>
          <Text style={s.title}>{titulo}</Text>
          <Text style={s.hint}>
            Esta clave no se volverá a mostrar. Si se pierde, genera otra desde
            la lista de empresas (la anterior dejará de funcionar).
          </Text>
          <Text style={s.label}>Email</Text>
          <Text selectable style={s.valor}>
            {email}
          </Text>
          <Text style={s.label}>Contraseña temporal</Text>
          <Text selectable style={s.password}>
            {password}
          </Text>
          <TouchableOpacity style={s.btnSec} onPress={compartir}>
            <Text style={s.btnSecText}>Compartir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btn} onPress={onClose}>
            <Text style={s.btnText}>Listo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  hint: { fontSize: 12, color: '#888', marginBottom: 8 },
  label: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
  },
  valor: { fontSize: 16, color: '#333' },
  password: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#E63946',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  btn: {
    backgroundColor: '#E63946',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btnSec: {
    borderWidth: 1,
    borderColor: '#E63946',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  btnSecText: { color: '#E63946', fontSize: 15, fontWeight: '600' },
});

export default CredencialesModal;

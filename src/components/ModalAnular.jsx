import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { colors } from '../theme/colors';

// Modal de "Anular ..." con motivo obligatorio. Lo usan Ventas, Caja y
// Producción. La validación del motivo vacío la hace quien lo usa.
const ModalAnular = ({
  visible,
  titulo,
  descripcion,
  placeholder,
  textoBoton,
  motivo,
  onChangeMotivo,
  anulando,
  onConfirmar,
  onCerrar,
}) => (
  <Modal
    visible={visible}
    animationType="fade"
    transparent
    onRequestClose={onCerrar}
  >
    <KeyboardAvoidingView
      style={s.overlay}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.box}>
        <Text style={s.titulo}>{titulo}</Text>
        <Text style={s.descripcion}>{descripcion}</Text>
        <Text style={s.label}>Motivo *</Text>
        <TextInput
          style={s.input}
          value={motivo}
          onChangeText={onChangeMotivo}
          placeholder={placeholder}
          multiline
        />
        <View style={s.acciones}>
          <TouchableOpacity style={s.cancelBtn} onPress={onCerrar}>
            <Text style={s.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.confirmBtn, anulando && { opacity: 0.6 }]}
            onPress={onConfirmar}
            disabled={anulando}
          >
            <Text style={s.confirmText}>
              {anulando ? 'Anulando...' : textoBoton}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  box: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  titulo: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.texto,
    marginBottom: 8,
  },
  descripcion: { fontSize: 13, color: colors.textoSuave, marginBottom: 12 },
  label: {
    fontSize: 13,
    color: colors.textoSuave,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borde,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 70,
  },
  acciones: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borde,
    alignItems: 'center',
  },
  cancelText: { color: colors.textoSuave, fontWeight: '600' },
  confirmBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '600' },
});

export default ModalAnular;

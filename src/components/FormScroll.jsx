import React from 'react';
import { KeyboardAvoidingView, ScrollView, Platform } from 'react-native';

// Envuelve el cuerpo de un formulario en modal: hace scroll y se
// aparta del teclado.
const FormScroll = ({ children }) => (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  >
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {children}
    </ScrollView>
  </KeyboardAvoidingView>
);

export default FormScroll;

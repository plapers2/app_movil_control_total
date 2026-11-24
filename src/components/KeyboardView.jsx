import React from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

// Para modales que ya tienen su propio ScrollView.
const KeyboardView = ({ children }) => (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  >
    {children}
  </KeyboardAvoidingView>
);

export default KeyboardView;
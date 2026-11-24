import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { colors } from '../theme/colors';

const BotonVerMas = ({ onPress, loading, visible }) => {
  if (!visible) return null;
  return (
    <TouchableOpacity style={s.btn} onPress={onPress} disabled={loading}>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Text style={s.text}>Ver más</Text>
      )}
    </TouchableOpacity>
  );
};

const s = StyleSheet.create({
  btn: {
    marginVertical: 12,
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  text: { color: colors.primary, fontWeight: '700' },
});

export default BotonVerMas;

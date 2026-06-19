import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import client from '../api/client';
import { saveToken, saveEmpresa, saveRol } from '../store/authStore';

const SelectEmpresaScreen = ({ navigation, route }) => {
  const empresas = route.params?.empresas || [];

  const handleSelect = async membresia => {
    try {
      const res = await client.post('/auth/select-empresa', {
        empresas_id: membresia.empresas_id,
      });
      await saveToken(res.data.data.token);
      await saveEmpresa(membresia.empresas);
      await saveRol(res.data.data.rol);
      navigation.replace('Main', { rol: res.data.data.rol });
    } catch (err) {
      Alert.alert('Error', 'No se pudo seleccionar la empresa.');
    }
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Selecciona una empresa</Text>
      <FlatList
        data={empresas}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => handleSelect(item)}>
            <Text style={s.name}>{item.empresas?.nombre}</Text>
            <Text style={s.rol}>{item.roles?.nombre}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff', paddingTop: 60 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, color: '#333' },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
  },
  name: { fontSize: 18, fontWeight: '600', color: '#333' },
  rol: { fontSize: 14, color: '#888', marginTop: 4 },
});

export default SelectEmpresaScreen;

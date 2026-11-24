import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import client from '../api/client';
import {
  saveToken,
  saveEmpresa,
  saveRol,
  getUsuario,
} from '../store/authStore';
import { avisarError } from '../utils/errores';
import { HEADER_TOP } from '../utils/safeArea';

const SelectEmpresaScreen = ({ navigation, route }) => {
  const [empresas, setEmpresas] = useState(route.params?.empresas || []);
  const [cargando, setCargando] = useState(!route.params?.empresas);
  const [esSuper, setEsSuper] = useState(false);

  useEffect(() => {
    getUsuario().then(u => setEsSuper(!!u?.es_superadmin));

    // Si la app se reabrió no llegan params: pedir las empresas al servidor
    if (route.params?.empresas) return;
    client
      .get('/auth/me')
      .then(res => setEmpresas(res.data.data.empresas || []))
      .catch(err => avisarError(err, 'No se pudieron cargar tus empresas.'))
      .finally(() => setCargando(false));
  }, [route.params?.empresas]);

  const handleSelect = async membresia => {
    try {
      const res = await client.post('/auth/select-empresa', {
        empresas_id: membresia.empresas_id,
      });
      await saveToken(res.data.data.token);
      await saveEmpresa(membresia.empresas);
      await saveRol(res.data.data.rol);
      // reset en vez de replace: no deja pilas de "Main" duplicadas
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main', params: { rol: res.data.data.rol } }],
        }),
      );
    } catch (err) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'No se pudo seleccionar la empresa.',
      );
    }
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Selecciona una empresa</Text>
      <FlatList
        data={empresas}
        keyExtractor={item => String(item.id)}
        ListHeaderComponent={
          esSuper ? (
            <TouchableOpacity
              style={[s.card, s.cardSuper]}
              onPress={() => navigation.navigate('Superadmin')}
            >
              <Text style={s.name}>⚙️ Administrar empresas</Text>
              <Text style={s.rol}>superadmin</Text>
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => handleSelect(item)}>
            <Text style={s.name}>{item.empresas?.nombre}</Text>
            <Text style={s.rol}>{item.roles?.nombre}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          cargando ? (
            <ActivityIndicator color="#E63946" style={{ marginTop: 20 }} />
          ) : (
            <Text style={{ color: '#aaa', textAlign: 'center', marginTop: 20 }}>
              No perteneces a ninguna empresa activa.
            </Text>
          )
        }
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    paddingTop: HEADER_TOP + 8,
  },
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
  cardSuper: { borderColor: '#E63946', backgroundColor: '#FFF5F5' },
});

export default SelectEmpresaScreen;

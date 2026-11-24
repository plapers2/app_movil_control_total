import React, { useState, useCallback } from 'react';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import client from '../api/client';
import { clearSession } from '../store/authStore';
import CredencialesModal from '../components/CredencialesModal';
import { HEADER_TOP } from '../utils/safeArea';

const SuperadminScreen = ({ navigation }) => {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [credenciales, setCredenciales] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const res = await client.get('/superadmin/empresas');
      setEmpresas(res.data.data);
    } catch (err) {
      if (err.response?.data?.code !== 'DEBE_CAMBIAR_PASSWORD') {
        Alert.alert(
          'Error',
          err.response?.data?.message || 'No se pudieron cargar las empresas.',
        );
      }
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const salir = async () => {
    await clearSession();
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }),
    );
  };

  const generarClave = usuario => {
    Alert.alert(
      'Generar clave temporal',
      'Se creará una clave nueva y la anterior dejará de funcionar. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Generar',
          onPress: async () => {
            try {
              const res = await client.post(
                `/superadmin/usuarios/${usuario.id}/password-temporal`,
              );
              setCredenciales({
                email: res.data.data.usuario.email,
                password: res.data.data.password_temporal,
              });
            } catch (err) {
              Alert.alert(
                'No disponible',
                err.response?.data?.message || 'No se pudo generar la clave.',
              );
            }
          },
        },
      ],
    );
  };

  const puedeVolver = navigation.canGoBack();

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#E63946" />
      </View>
    );

  return (
    <View style={s.container}>
      <View style={s.header}>
        {puedeVolver ? (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.back}>‹ Volver</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
        <Text style={s.title}>Empresas</Text>
        {puedeVolver ? (
          <View style={{ width: 60 }} />
        ) : (
          <TouchableOpacity onPress={salir}>
            <Text style={s.back}>Salir</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={empresas}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <TouchableOpacity
            style={s.btnNueva}
            onPress={() => navigation.navigate('NuevaEmpresa')}
          >
            <Text style={s.btnNuevaText}>+ Nueva empresa</Text>
          </TouchableOpacity>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              cargar();
            }}
            colors={['#E63946']}
          />
        }
        ListEmptyComponent={<Text style={s.empty}>Sin empresas creadas</Text>}
        renderItem={({ item }) => {
          const admins = item.usuarios_empresas || [];
          const activa = item.activa !== false;
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <Text style={s.nombre}>{item.nombre}</Text>
                <View style={[s.badge, activa ? s.badgeOn : s.badgeOff]}>
                  <Text style={s.badgeText}>
                    {activa ? 'Activa' : 'Inactiva'}
                  </Text>
                </View>
              </View>
              {item.descripcion ? (
                <Text style={s.desc}>{item.descripcion}</Text>
              ) : null}
              <Text style={s.adminLabel}>Admin</Text>
              {admins.length === 0 ? (
                <Text style={s.sinAdmin}>Sin admin asignado</Text>
              ) : (
                admins.map(ue => (
                  <View key={ue.id} style={s.adminRow}>
                    <Text style={s.admin}>
                      {ue.usuarios?.nombre} · {ue.usuarios?.email}
                    </Text>
                    {ue.usuarios?.debe_cambiar_password ? (
                      <View style={s.pendiente}>
                        <Text style={s.pendienteText}>
                          Pendiente de primer ingreso
                        </Text>
                        <TouchableOpacity
                          onPress={() => generarClave(ue.usuarios)}
                        >
                          <Text style={s.verClave}>Generar clave temporal</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          );
        }}
      />

      <CredencialesModal
        visible={!!credenciales}
        titulo="Clave temporal"
        email={credenciales?.email}
        password={credenciales?.password}
        onClose={() => setCredenciales(null)}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  back: { color: '#E63946', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nombre: { fontSize: 16, fontWeight: '700', color: '#333', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeOn: { backgroundColor: '#E6F7EB' },
  badgeOff: { backgroundColor: '#EEE' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#333' },
  desc: { fontSize: 13, color: '#888', marginTop: 4 },
  adminLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 10,
  },
  admin: { fontSize: 14, color: '#333', marginTop: 2 },
  sinAdmin: { fontSize: 14, color: '#E63946', marginTop: 2 },
  adminRow: { marginTop: 4 },
  pendiente: { marginTop: 4 },
  pendienteText: { fontSize: 12, color: '#B45309' },
  verClave: {
    fontSize: 13,
    color: '#E63946',
    fontWeight: '600',
    marginTop: 2,
  },
  btnNueva: {
    backgroundColor: '#E63946',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnNuevaText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default SuperadminScreen;

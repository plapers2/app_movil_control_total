import React, { useState, useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import client from '../api/client';

const fmtFecha = d =>
  d ? new Date(d).toLocaleDateString('es-CO') : null;

const ClientesInactivosScreen = () => {
  const navigation = useNavigation();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actualizandoId, setActualizandoId] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const res = await client.get('/clientes/inactivos?dias=15');
      setClientes(res.data.data);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los clientes inactivos.');
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      cargar();
    }, [cargar]),
  );

  const toggleAviso = async cliente => {
    try {
      setActualizandoId(cliente.id);
      const nuevoEstado = !cliente.aviso_inactivo_enviado;
      await client.patch(`/clientes/${cliente.id}/aviso`, {
        enviado: nuevoEstado,
      });
      setClientes(prev =>
        prev.map(c =>
          c.id === cliente.id
            ? { ...c, aviso_inactivo_enviado: nuevoEstado }
            : c,
        ),
      );
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el aviso.');
    } finally {
      setActualizandoId(null);
    }
  };

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#E63946" />
      </View>
    );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={s.title}>Clientes inactivos</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={s.resumen}>
        <Text style={s.resumenValor}>{clientes.length}</Text>
        <Text style={s.resumenLabel}>
          cliente{clientes.length === 1 ? '' : 's'} con más de 15 días sin
          comprar
        </Text>
      </View>

      <FlatList
        data={clientes}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={s.empty}>
            🎉 Todos tus clientes han comprado en los últimos 15 días
          </Text>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardRow}>
              <Text style={s.cardTitle}>{item.nombre}</Text>
              <View
                style={[
                  s.badge,
                  item.aviso_inactivo_enviado ? s.badgeEnviado : s.badgePendiente,
                ]}
              >
                <Text style={s.badgeText}>
                  {item.aviso_inactivo_enviado ? 'Aviso enviado' : 'Pendiente'}
                </Text>
              </View>
            </View>

            <Text style={s.cardSub}>
              {item.nunca_compro
                ? 'Nunca ha comprado'
                : `Última compra: ${fmtFecha(item.ultima_compra)}`}
            </Text>
            <Text style={s.cardDias}>
              {item.dias_sin_comprar} días sin comprar
            </Text>

            {!!item.telefono && (
              <Text style={s.cardMeta}>📞 {item.telefono}</Text>
            )}
            {!!item.direccion && (
              <Text style={s.cardMeta}>📍 {item.direccion}</Text>
            )}

            <TouchableOpacity
              style={[
                s.btnAviso,
                item.aviso_inactivo_enviado ? s.btnAvisoDesmarcar : s.btnAvisoMarcar,
              ]}
              onPress={() => toggleAviso(item)}
              disabled={actualizandoId === item.id}
            >
              <Text
                style={[
                  s.btnAvisoText,
                  item.aviso_inactivo_enviado && s.btnAvisoTextDesmarcar,
                ]}
              >
                {actualizandoId === item.id
                  ? 'Actualizando...'
                  : item.aviso_inactivo_enviado
                  ? 'Marcar como pendiente'
                  : 'Marcar aviso como enviado'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    paddingTop: 50,
    backgroundColor: '#fff',
  },
  backBtn: { width: 60 },
  backText: { color: '#E63946', fontSize: 15, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  resumen: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  resumenValor: { fontSize: 26, fontWeight: 'bold', color: '#E63946' },
  resumenLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40, paddingHorizontal: 30 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: { fontWeight: '700', fontSize: 15, color: '#333', flex: 1, marginRight: 8 },
  cardSub: { color: '#888', fontSize: 12, marginTop: 4 },
  cardDias: {
    color: '#E63946',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  cardMeta: { fontSize: 12, color: '#666', marginTop: 4 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgePendiente: { backgroundColor: '#FCE4E4' },
  badgeEnviado: { backgroundColor: '#DFF5E1' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#555' },
  btnAviso: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnAvisoMarcar: { backgroundColor: '#E63946' },
  btnAvisoDesmarcar: { backgroundColor: '#f0f0f0' },
  btnAvisoText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  btnAvisoTextDesmarcar: { color: '#555' },
});

export default ClientesInactivosScreen;

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import client from '../api/client';
import { getRol } from '../store/authStore';
import { avisarError } from '../utils/errores';
import { HEADER_TOP, BOTTOM_INSET } from '../utils/safeArea';
import { colors } from '../theme/colors';

const SERVICIOS = [
  { key: 'energia', nombre: 'Energía', icono: '⚡' },
  { key: 'agua', nombre: 'Agua', icono: '💧' },
  { key: 'gas', nombre: 'Gas', icono: '🔥' },
];
const nombreMes = clave => {
  const [year, month] = clave.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('es-CO', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  });
};

const ServiciosPublicosScreen = () => {
  const navigation = useNavigation();
  const [datos, setDatos] = useState(null);
  const [rol, setRol] = useState(null);
  const [dias, setDias] = useState({ energia: '', agua: '', gas: '' });
  const [guardando, setGuardando] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const [r, role] = await Promise.all([
        client.get('/servicios-publicos'),
        getRol(),
      ]);
      setDatos(r.data.data);
      setRol(role);
      setDias(Object.fromEntries(
        r.data.data.servicios.map(s => [s.servicio, s.diaPago ? String(s.diaPago) : '']),
      ));
    } catch (err) {
      avisarError(err, 'No se pudo cargar la información de servicios públicos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); cargar(); }, [cargar]));

  const guardarDia = async servicio => {
    const dia = Number(dias[servicio]);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      return Alert.alert('Día no válido', 'Ingresa un día entre 1 y 31.');
    }
    try {
      setGuardando(servicio);
      await client.put('/servicios-publicos/configuracion', {
        servicio,
        dia_pago: dia,
      });
      await cargar();
      Alert.alert('Configuración guardada', 'El día de pago quedó actualizado.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo guardar el día de pago.');
    } finally {
      setGuardando(null);
    }
  };

  if (loading) return <View style={s.centro}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={s.title}>Servicios públicos</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={s.contenido}>
        <View style={s.infoCard}>
          <Text style={s.infoTitulo}>Control de recibos mensuales</Text>
          <Text style={s.infoTexto}>
            {datos?.fechaInicio
              ? `El conteo inicia desde el primer registro de la aplicación (${datos.fechaInicio}). Los recibos se reconocen cuando registras el gasto en Caja como servicio público.`
              : 'Todavía no hay registros en la aplicación. Cuando registres la primera actividad, comenzará el conteo de recibos.'}
          </Text>
        </View>

        {datos?.servicios.map(servicio => {
          const meta = SERVICIOS.find(x => x.key === servicio.servicio);
          return (
            <View key={servicio.servicio} style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.servicioNombre}>{meta.icono} {servicio.nombre}</Text>
                <View style={s.pendientesPill}>
                  <Text style={s.pendientesTexto}>{servicio.pendientes} pendiente{servicio.pendientes === 1 ? '' : 's'}</Text>
                </View>
              </View>
              <View style={s.contadores}>
                <Text style={s.contador}>Registrados: <Text style={s.contadorValor}>{servicio.registrados}</Text></Text>
                <Text style={s.contador}>Por registrar: <Text style={s.contadorValor}>{servicio.pendientes}</Text></Text>
              </View>

              <Text style={s.label}>Día de pago mensual (1 a 31)</Text>
              <View style={s.configRow}>
                <TextInput
                  style={s.inputDia}
                  value={dias[servicio.servicio]}
                  onChangeText={v => setDias(prev => ({ ...prev, [servicio.servicio]: v.replace(/[^0-9]/g, '').slice(0, 2) }))}
                  keyboardType="number-pad"
                  placeholder="Ej. 15"
                  editable={rol === 'admin'}
                  maxLength={2}
                />
                {rol === 'admin' && (
                  <TouchableOpacity
                    style={s.guardarBtn}
                    disabled={guardando === servicio.servicio}
                    onPress={() => guardarDia(servicio.servicio)}
                  >
                    <Text style={s.guardarTexto}>{guardando === servicio.servicio ? 'Guardando...' : 'Guardar'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {servicio.proximoVencimiento && (
                <Text style={s.proximo}>Próxima fecha de pago: {servicio.proximoVencimiento}</Text>
              )}

              <Text style={s.subtitulo}>Historial mensual</Text>
              {servicio.meses.length === 0 ? (
                <Text style={s.vacio}>Sin meses para mostrar.</Text>
              ) : servicio.meses.map(mes => (
                <View key={mes.mes} style={s.mesRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.mesNombre}>{nombreMes(mes.mes)}</Text>
                    {mes.fechaVencimiento && (
                      <Text style={s.fechaVence}>Pago programado: {mes.fechaVencimiento}</Text>
                    )}
                  </View>
                  <Text style={[s.estado, mes.registrado ? s.estadoOk : s.estadoPendiente]}>
                    {mes.registrado ? '✓ Registrado' : 'Pendiente'}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}
        <Text style={s.nota}>Para marcar un recibo como registrado, entra a Caja y crea un gasto con categoría “Servicio público”, seleccionando Energía, Agua o Gas y la fecha correspondiente.</Text>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.fondo },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: HEADER_TOP, backgroundColor: '#fff' },
  backBtn: { width: 60 }, backText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  title: { color: colors.texto, fontSize: 18, fontWeight: 'bold' },
  contenido: { padding: 14, paddingBottom: BOTTOM_INSET + 24 },
  infoCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  infoTitulo: { fontSize: 16, fontWeight: '700', color: colors.texto, marginBottom: 6 },
  infoTexto: { fontSize: 13, lineHeight: 19, color: colors.textoSuave },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  servicioNombre: { fontSize: 17, fontWeight: '700', color: colors.texto },
  pendientesPill: { backgroundColor: '#fff1e8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  pendientesTexto: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  contadores: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  contador: { color: colors.textoSuave, fontSize: 12 }, contadorValor: { color: colors.texto, fontWeight: '700' },
  label: { color: colors.texto, fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 7 },
  configRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inputDia: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, width: 90, color: colors.texto, fontSize: 16 },
  guardarBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 11 },
  guardarTexto: { color: '#fff', fontWeight: '700' },
  proximo: { color: colors.primary, fontSize: 12, marginTop: 8, fontWeight: '600' },
  subtitulo: { fontSize: 14, fontWeight: '700', color: colors.texto, marginTop: 18, marginBottom: 6 },
  mesRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  mesNombre: { color: colors.texto, fontSize: 13, textTransform: 'capitalize' },
  fechaVence: { color: colors.textoSuave, fontSize: 11, marginTop: 3 },
  estado: { fontSize: 12, fontWeight: '700' }, estadoOk: { color: colors.verde }, estadoPendiente: { color: colors.primary },
  vacio: { color: colors.textoSuave, fontSize: 13 },
  nota: { color: colors.textoSuave, fontSize: 12, lineHeight: 18, marginHorizontal: 4, marginTop: 2, marginBottom: 12 },
});

export default ServiciosPublicosScreen;

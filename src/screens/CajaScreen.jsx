import React, { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import client from '../api/client';
import { getFechaHoyLocal, fmtFecha } from '../utils/date';
import { getRol } from '../store/authStore';
import FiltroPeriodo from '../components/FiltroPeriodo';
import BotonVerMas from '../components/BotonVerMas';
import { coincide } from '../utils/texto';
import { avisarError } from '../utils/errores';
import KeyboardView from '../components/KeyboardView';
import { aNumero, aDinero } from '../utils/validar';
import { HEADER_TOP, BOTTOM_INSET } from '../utils/safeArea';
import { fmt } from '../utils/formato';
import { paramsFecha } from '../utils/query';
import ModalAnular from '../components/ModalAnular';
import { colors } from '../theme/colors';

const CajaScreen = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tipo: 'gasto',
    categoria: 'insumo',
    tipo_servicio: null,
    monto: '',
    descripcion: '',
  });
  const [movDetalle, setMovDetalle] = useState(null);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [rol, setRol] = useState(null);
  const [modalEditar, setModalEditar] = useState(false);
  const [movEditando, setMovEditando] = useState(null);
  const [formEdit, setFormEdit] = useState({
    tipo: 'gasto',
    categoria: 'insumo',
    tipo_servicio: null,
    monto: '',
    descripcion: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [modalAnular, setModalAnular] = useState(false);
  const [movAnulando, setMovAnulando] = useState(null);
  const [motivoAnular, setMotivoAnular] = useState('');
  const [anulando, setAnulando] = useState(false);

  // Vincular el gasto a insumos (opcional) para sumar al inventario
  const [insumos, setInsumos] = useState([]);
  const [busquedaInsumo, setBusquedaInsumo] = useState('');
  const [insumosForm, setInsumosForm] = useState([]); // [{ insumos_id, nombre, unidad_medida, cantidad }]

  // Filtro de periodo (dia|semana|mes|total|rango) y paginación (lista de movimientos)
  const [periodo, setPeriodo] = useState('dia');
  const [rango, setRango] = useState(null); // { desde, hasta } cuando periodo === 'rango'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMas, setLoadingMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);

  const reqId = useRef(0);

  const cargar = useCallback(async () => {
    const id = ++reqId.current;
    setRefrescando(true);
    try {
      const qp = paramsFecha({ periodo, ...(rango || {}) });
      const [m, r] = await Promise.all([
        client.get(`/caja?${qp.toString()}&page=1&limit=10`),
        client.get(`/caja/resumen?${qp.toString()}`),
      ]);
      if (id !== reqId.current) return;
      setMovimientos(m.data.data);
      setPage(1);
      setTotalPages(m.data.meta?.pages ?? 1);
      setResumen(r.data.data);
    } catch (err) {
      if (id === reqId.current) avisarError(err, 'No se pudo cargar la caja.');
    } finally {
      if (id === reqId.current) {
        setLoading(false);
        setRefrescando(false);
      }
    }
  }, [periodo, rango]);

  // Insumos y rol: solo al entrar a la pantalla
  const cargarExtras = useCallback(async () => {
    getRol().then(setRol);
    try {
      const i = await client.get('/insumos');
      setInsumos(i.data.data);
    } catch (err) {
      avisarError(err, 'No se pudieron cargar los insumos.');
    }
  }, []);

  const verMas = async () => {
    if (page >= totalPages) return;
    const id = reqId.current;
    try {
      setLoadingMas(true);
      const siguiente = page + 1;
      const qp = paramsFecha({ periodo, ...(rango || {}) });
      const res = await client.get(
        `/caja?${qp.toString()}&page=${siguiente}&limit=10`,
      );
      if (id !== reqId.current) return;
      setMovimientos(prev => [...prev, ...res.data.data]);
      setPage(siguiente);
      setTotalPages(res.data.meta?.pages ?? 1);
    } catch (err) {
      avisarError(err, 'No se pudieron cargar más movimientos.');
    } finally {
      setLoadingMas(false);
    }
  };

  const cambiarPeriodo = criterio => {
    setPeriodo(criterio.periodo);
    setRango(
      criterio.periodo === 'rango'
        ? { desde: criterio.desde, hasta: criterio.hasta }
        : null,
    );
  };

  const agregarInsumoForm = insumo => {
    setInsumosForm(prev => {
      if (prev.some(i => i.insumos_id === insumo.id)) return prev;
      return [
        ...prev,
        {
          insumos_id: insumo.id,
          nombre: insumo.nombre,
          unidad_medida: insumo.unidad_medida,
          cantidad: '',
        },
      ];
    });
    setBusquedaInsumo('');
  };

  const quitarInsumoForm = insumos_id =>
    setInsumosForm(prev => prev.filter(i => i.insumos_id !== insumos_id));

  const cambiarCantidadInsumoForm = (insumos_id, valor) =>
    setInsumosForm(prev =>
      prev.map(i =>
        i.insumos_id === insumos_id ? { ...i, cantidad: valor } : i,
      ),
    );

  useFocusEffect(
    useCallback(() => {
      cargarExtras();
    }, [cargarExtras]),
  );

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const guardar = async () => {
    const monto = aDinero(form.monto);
    if (!form.descripcion.trim() || !(monto > 0))
      return Alert.alert(
        'Error',
        'Monto (mayor a 0) y descripción son requeridos.',
      );
    if (form.categoria === 'servicio_publico' && !form.tipo_servicio)
      return Alert.alert(
        'Error',
        'Selecciona el tipo de servicio (energía, agua o gas).',
      );
    if (insumosForm.some(i => !(aNumero(i.cantidad) > 0)))
      return Alert.alert(
        'Error',
        'Revisa las cantidades de los insumos, deben ser mayores a 0 (o quítalos de la lista).',
      );
    try {
      setSaving(true);
      await client.post('/caja', {
        tipo: form.tipo,
        categoria: form.categoria,
        tipo_servicio:
          form.categoria === 'servicio_publico'
            ? form.tipo_servicio
            : undefined,
        monto: aDinero(form.monto),
        descripcion: form.descripcion,
        fecha: getFechaHoyLocal(),
        insumos: insumosForm.length
          ? insumosForm.map(i => ({
              insumos_id: i.insumos_id,
              cantidad: aNumero(i.cantidad),
            }))
          : undefined,
      });
      setModal(false);
      setForm({
        tipo: 'gasto',
        categoria: 'insumo',
        tipo_servicio: null,
        monto: '',
        descripcion: '',
      });
      setInsumosForm([]);
      setBusquedaInsumo('');
      cargar();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const verDetalle = mov => {
    setMovDetalle(mov);
    setModalDetalle(true);
  };

  const abrirEditar = mov => {
    setMovEditando(mov);
    setFormEdit({
      tipo: mov.tipo,
      categoria: mov.categoria,
      tipo_servicio: mov.tipo_servicio || null,
      monto: String(mov.monto),
      descripcion: mov.descripcion || '',
    });
    setModalEditar(true);
  };

  const guardarEdicion = async () => {
    const monto = aDinero(form.monto);
    if (!form.descripcion.trim() || !(monto > 0))
      return Alert.alert(
        'Error',
        'Monto (mayor a 0) y descripción son requeridos.',
      );
    if (formEdit.categoria === 'servicio_publico' && !formEdit.tipo_servicio)
      return Alert.alert(
        'Error',
        'Selecciona el tipo de servicio (energía, agua o gas).',
      );
    try {
      setSavingEdit(true);
      await client.put(`/caja/${movEditando.id}`, {
        tipo: formEdit.tipo,
        categoria: formEdit.categoria,
        tipo_servicio:
          formEdit.categoria === 'servicio_publico'
            ? formEdit.tipo_servicio
            : undefined,
        monto: aNumero(formEdit.monto),
        descripcion: formEdit.descripcion,
        fecha: movEditando.fecha,
      });
      setModalEditar(false);
      cargar();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Error al editar.');
    } finally {
      setSavingEdit(false);
    }
  };

  const abrirAnular = mov => {
    setMovAnulando(mov);
    setMotivoAnular('');
    setModalAnular(true);
  };

  const confirmarAnular = async () => {
    if (!motivoAnular.trim())
      return Alert.alert('Error', 'Debes indicar un motivo.');
    try {
      setAnulando(true);
      await client.delete(`/caja/${movAnulando.id}`, {
        data: { motivo: motivoAnular.trim() },
      });
      setModalAnular(false);
      cargar();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Error al anular.');
    } finally {
      setAnulando(false);
    }
  };

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Caja</Text>
        <TouchableOpacity style={s.btnNew} onPress={() => setModal(true)}>
          <Text style={s.btnNewText}>+ Movimiento</Text>
        </TouchableOpacity>
      </View>

      {resumen && (
        <TouchableOpacity
          style={[
            s.balanceActualCard,
            {
              borderLeftColor:
                resumen.balanceTotal >= 0 ? colors.azul : colors.primary,
            },
          ]}
          activeOpacity={1}
        >
          <Text style={s.balanceActualLabel}>
            Balance actual (todo lo registrado)
          </Text>
          <Text
            style={[
              s.balanceActualValor,
              { color: resumen.balanceTotal >= 0 ? colors.azul : colors.primary },
            ]}
          >
            {fmt(resumen.balanceTotal)}
          </Text>
        </TouchableOpacity>
      )}

      {resumen && (
        <>
          <Text style={s.resumenPeriodoLabel}>
            {periodo === 'dia'
              ? 'Hoy'
              : periodo === 'semana'
              ? 'Esta semana'
              : periodo === 'mes'
              ? 'Este mes'
              : periodo === 'total'
              ? 'Todo lo registrado'
              : 'Rango seleccionado'}
          </Text>
          <View style={s.resumen}>
            <View style={[s.resCard, { borderLeftColor: colors.verde }]}>
              <Text style={s.resVal}>{fmt(resumen.ingresos)}</Text>
              <Text style={s.resLabel}>Ingresos</Text>
            </View>
            <View style={[s.resCard, { borderLeftColor: colors.primary }]}>
              <Text style={s.resVal}>{fmt(resumen.gastos)}</Text>
              <Text style={s.resLabel}>Gastos</Text>
            </View>
            <View
              style={[
                s.resCard,
                {
                  borderLeftColor: resumen.balance >= 0 ? colors.azul : colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  s.resVal,
                  { color: resumen.balance >= 0 ? colors.azul : colors.primary },
                ]}
              >
                {fmt(resumen.balance)}
              </Text>
              <Text style={s.resLabel}>Balance</Text>
            </View>
          </View>
        </>
      )}

      <FiltroPeriodo periodo={periodo} onChange={cambiarPeriodo} />
      {refrescando && (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={{ marginBottom: 8 }}
        />
      )}

      <Text style={s.sectionLabel}>Movimientos</Text>

      <FlatList
        data={movimientos}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        ListEmptyComponent={<Text style={s.empty}>Sin movimientos</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => verDetalle(item)}>
            <View style={s.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardDesc}>{item.descripcion}</Text>
                <Text style={s.cardMeta}>
                  {fmtFecha(item.fecha)} · {item.categoria}
                  {item.tipo_servicio ? ` (${item.tipo_servicio})` : ''}
                </Text>
              </View>
              <Text
                style={[
                  s.cardMonto,
                  item.tipo === 'ingreso' ? s.ingreso : s.gasto,
                ]}
              >
                {item.tipo === 'ingreso' ? '+' : '-'}
                {fmt(item.monto)}
              </Text>
            </View>
            {rol === 'admin' && (
              <View style={s.actions}>
                <TouchableOpacity
                  onPress={() => abrirEditar(item)}
                  style={s.editBtn}
                >
                  <Text>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => abrirAnular(item)}>
                  <Text>🗑</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <BotonVerMas
            onPress={verMas}
            loading={loadingMas}
            visible={page < totalPages}
          />
        }
      />

      <Modal
        visible={modal}
        animationType="slide"
        onRequestClose={() => setModal(false)}
      >
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Nuevo movimiento</Text>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Text style={s.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <KeyboardView>
            <ScrollView>
              <Text style={s.fieldLabel}>Tipo</Text>
              <View style={s.toggle}>
                {['gasto', 'ingreso'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[s.toggleBtn, form.tipo === t && s.toggleActive]}
                    onPress={() => {
                      setForm(p => ({
                        ...p,
                        tipo: t,
                        categoria: t === 'gasto' ? 'insumo' : 'venta',
                      }));
                      if (t !== 'gasto') {
                        setInsumosForm([]);
                        setBusquedaInsumo('');
                      }
                    }}
                  >
                    <Text
                      style={[
                        s.toggleText,
                        form.tipo === t && s.toggleTextActive,
                      ]}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.fieldLabel}>Categoría</Text>
              <View style={s.chips}>
                <View style={s.chips}>
                  {(form.tipo === 'gasto'
                    ? ['insumo', 'servicio', 'servicio_publico', 'otro']
                    : ['venta', 'otro']
                  ).map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[s.chip, form.categoria === c && s.chipActive]}
                      onPress={() => {
                        setForm(p => ({
                          ...p,
                          categoria: c,
                          tipo_servicio:
                            c === 'servicio_publico' ? p.tipo_servicio : null,
                        }));
                        if (c !== 'insumo') {
                          setInsumosForm([]);
                          setBusquedaInsumo('');
                        }
                      }}
                    >
                      <Text
                        style={[
                          s.chipText,
                          form.categoria === c && s.chipTextActive,
                        ]}
                      >
                        {c === 'servicio_publico' ? 'servicio público' : c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {form.tipo === 'gasto' &&
                form.categoria === 'servicio_publico' && (
                  <>
                    <Text style={s.fieldLabel}>Tipo de servicio *</Text>
                    <View style={s.chips}>
                      {['energia', 'agua', 'gas'].map(ts => (
                        <TouchableOpacity
                          key={ts}
                          style={[
                            s.chip,
                            form.tipo_servicio === ts && s.chipActive,
                          ]}
                          onPress={() =>
                            setForm(p => ({ ...p, tipo_servicio: ts }))
                          }
                        >
                          <Text
                            style={[
                              s.chipText,
                              form.tipo_servicio === ts && s.chipTextActive,
                            ]}
                          >
                            {ts === 'energia' ? 'energía' : ts}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

              {form.tipo === 'gasto' && form.categoria === 'insumo' && (
                <View style={s.field}>
                  <Text style={s.fieldLabel}>
                    Vincular a insumos (opcional, suma al inventario)
                  </Text>

                  <View style={s.buscadorBox}>
                    <TextInput
                      style={s.buscadorInput}
                      value={busquedaInsumo}
                      onChangeText={setBusquedaInsumo}
                      placeholder="Buscar insumo..."
                      placeholderTextColor="#aaa"
                    />
                    {busquedaInsumo.length > 0 && (
                      <TouchableOpacity onPress={() => setBusquedaInsumo('')}>
                        <Text style={s.removeBtn}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {busquedaInsumo.trim().length > 0 && (
                    <View style={s.dropdown}>
                      {insumos
                        .filter(
                          i =>
                            !insumosForm.some(f => f.insumos_id === i.id) &&
                            coincide(i.nombre, busquedaInsumo),
                        )
                        .map(i => (
                          <TouchableOpacity
                            key={i.id}
                            style={s.prodRow}
                            onPress={() => agregarInsumoForm(i)}
                          >
                            <Text style={s.prodNombre}>{i.nombre}</Text>
                            <Text style={s.prodPrecio}>{i.unidad_medida}</Text>
                          </TouchableOpacity>
                        ))}
                      {!insumos.some(
                        i =>
                          !insumosForm.some(f => f.insumos_id === i.id) &&
                          coincide(i.nombre, busquedaInsumo),
                      ) && <Text style={s.empty}>Sin resultados</Text>}
                    </View>
                  )}

                  {insumosForm.map(i => (
                    <View key={i.insumos_id} style={s.insumoFormRow}>
                      <Text style={s.insumoFormNombre}>{i.nombre}</Text>
                      <TextInput
                        style={s.cantInput}
                        value={i.cantidad}
                        onChangeText={v =>
                          cambiarCantidadInsumoForm(i.insumos_id, v)
                        }
                        keyboardType="numeric"
                        placeholder="0"
                      />
                      <Text style={s.unidad}>{i.unidad_medida}</Text>
                      <TouchableOpacity
                        onPress={() => quitarInsumoForm(i.insumos_id)}
                      >
                        <Text style={s.removeBtn}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={s.field}>
                <Text style={s.fieldLabel}>Monto *</Text>
                <TextInput
                  style={s.input}
                  value={form.monto}
                  onChangeText={v => setForm(p => ({ ...p, monto: v }))}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Descripción *</Text>
                <TextInput
                  style={s.input}
                  value={form.descripcion}
                  onChangeText={v => setForm(p => ({ ...p, descripcion: v }))}
                  placeholder="Ej: Compra de harina"
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[s.btnGuardar, saving && { opacity: 0.6 }]}
              onPress={guardar}
              disabled={saving}
            >
              <Text style={s.btnGuardarText}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </KeyboardView>
        </View>
      </Modal>
      <Modal
        visible={modalDetalle}
        animationType="slide"
        onRequestClose={() => setModalDetalle(false)}
      >
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Detalle movimiento</Text>
            <TouchableOpacity onPress={() => setModalDetalle(false)}>
              <Text style={s.close}>✕</Text>
            </TouchableOpacity>
          </View>
          {movDetalle && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={s.detalleSeccion}>
                <Text style={s.detalleLabel}>Tipo</Text>
                <Text
                  style={[
                    s.detalleValor,
                    movDetalle.tipo === 'ingreso' ? s.ingreso : s.gasto,
                  ]}
                >
                  {movDetalle.tipo.charAt(0).toUpperCase() +
                    movDetalle.tipo.slice(1)}
                </Text>
              </View>
              <View style={s.detalleSeccion}>
                <Text style={s.detalleLabel}>Categoría</Text>
                <Text style={s.detalleValor}>{movDetalle.categoria}</Text>
              </View>
              {movDetalle.tipo_servicio && (
                <View style={s.detalleSeccion}>
                  <Text style={s.detalleLabel}>Tipo de servicio</Text>
                  <Text style={s.detalleValor}>{movDetalle.tipo_servicio}</Text>
                </View>
              )}
              <View style={s.detalleSeccion}>
                <Text style={s.detalleLabel}>Fecha</Text>
                <Text style={s.detalleValor}>{fmtFecha(movDetalle.fecha)}</Text>
              </View>
              <View style={s.detalleSeccion}>
                <Text style={s.detalleLabel}>Descripción</Text>
                <Text style={s.detalleValor}>{movDetalle.descripcion}</Text>
              </View>
              <View
                style={[
                  s.detalleSeccion,
                  { marginTop: 16, borderTopWidth: 2, borderColor: '#eee' },
                ]}
              >
                <Text
                  style={[
                    s.detalleLabel,
                    { fontSize: 16, fontWeight: 'bold', color: colors.texto },
                  ]}
                >
                  Monto
                </Text>
                <Text
                  style={[
                    s.detalleValor,
                    { fontSize: 16, fontWeight: '700' },
                    movDetalle.tipo === 'ingreso' ? s.ingreso : s.gasto,
                  ]}
                >
                  {movDetalle.tipo === 'ingreso' ? '+' : '-'}
                  {fmt(movDetalle.monto)}
                </Text>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      <Modal
        visible={modalEditar}
        animationType="slide"
        onRequestClose={() => setModalEditar(false)}
      >
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Editar movimiento</Text>
            <TouchableOpacity onPress={() => setModalEditar(false)}>
              <Text style={s.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <KeyboardView>
            <ScrollView>
              <Text style={s.fieldLabel}>Tipo</Text>
              <View style={s.toggle}>
                {['gasto', 'ingreso'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[s.toggleBtn, formEdit.tipo === t && s.toggleActive]}
                    onPress={() =>
                      setFormEdit(p => ({
                        ...p,
                        tipo: t,
                        categoria: t === 'gasto' ? 'insumo' : 'venta',
                      }))
                    }
                  >
                    <Text
                      style={[
                        s.toggleText,
                        formEdit.tipo === t && s.toggleTextActive,
                      ]}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.fieldLabel}>Categoría</Text>
              <View style={s.chips}>
                {(formEdit.tipo === 'gasto'
                  ? ['insumo', 'servicio', 'servicio_publico', 'otro']
                  : ['venta', 'otro']
                ).map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[s.chip, formEdit.categoria === c && s.chipActive]}
                    onPress={() =>
                      setFormEdit(p => ({
                        ...p,
                        categoria: c,
                        tipo_servicio:
                          c === 'servicio_publico' ? p.tipo_servicio : null,
                      }))
                    }
                  >
                    <Text
                      style={[
                        s.chipText,
                        formEdit.categoria === c && s.chipTextActive,
                      ]}
                    >
                      {c === 'servicio_publico' ? 'servicio público' : c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {formEdit.tipo === 'gasto' &&
                formEdit.categoria === 'servicio_publico' && (
                  <>
                    <Text style={s.fieldLabel}>Tipo de servicio *</Text>
                    <View style={s.chips}>
                      {['energia', 'agua', 'gas'].map(ts => (
                        <TouchableOpacity
                          key={ts}
                          style={[
                            s.chip,
                            formEdit.tipo_servicio === ts && s.chipActive,
                          ]}
                          onPress={() =>
                            setFormEdit(p => ({ ...p, tipo_servicio: ts }))
                          }
                        >
                          <Text
                            style={[
                              s.chipText,
                              formEdit.tipo_servicio === ts && s.chipTextActive,
                            ]}
                          >
                            {ts === 'energia' ? 'energía' : ts}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

              <View style={s.field}>
                <Text style={s.fieldLabel}>Monto *</Text>
                <TextInput
                  style={s.input}
                  value={formEdit.monto}
                  onChangeText={v => setFormEdit(p => ({ ...p, monto: v }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Descripción *</Text>
                <TextInput
                  style={s.input}
                  value={formEdit.descripcion}
                  onChangeText={v =>
                    setFormEdit(p => ({ ...p, descripcion: v }))
                  }
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[s.btnGuardar, savingEdit && { opacity: 0.6 }]}
              onPress={guardarEdicion}
              disabled={savingEdit}
            >
              <Text style={s.btnGuardarText}>
                {savingEdit ? 'Guardando...' : 'Guardar cambios'}
              </Text>
            </TouchableOpacity>
          </KeyboardView>
        </View>
      </Modal>

      <ModalAnular
        visible={modalAnular}
        titulo="Anular movimiento"
        descripcion="Este movimiento quedará marcado como anulado. Si estaba vinculado a insumos, revisa el inventario manualmente."
        placeholder="Ej: Monto incorrecto, registro duplicado..."
        textoBoton="Anular movimiento"
        motivo={motivoAnular}
        onChangeMotivo={setMotivoAnular}
        anulando={anulando}
        onConfirmar={confirmarAnular}
        onCerrar={() => setModalAnular(false)}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.fondo },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: HEADER_TOP,
    backgroundColor: '#fff',
  },
  balanceActualCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 1,
  },
  balanceActualLabel: {
    fontSize: 11,
    color: colors.textoSuave,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  balanceActualValor: { fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  resumenPeriodoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textoSuave,
    paddingHorizontal: 16,
    paddingTop: 8,
    textTransform: 'uppercase',
  },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.texto },
  btnNew: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnNewText: { color: '#fff', fontWeight: '600' },
  resumen: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  resCard: { flex: 1, borderLeftWidth: 3, paddingLeft: 8, paddingVertical: 4 },
  resVal: { fontSize: 14, fontWeight: 'bold', color: colors.texto },
  resLabel: { fontSize: 11, color: colors.textoSuave },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textoSuave,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    textTransform: 'uppercase',
  },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardDesc: { fontSize: 14, fontWeight: '600', color: colors.texto },
  cardMeta: { fontSize: 12, color: colors.textoSuave, marginTop: 2 },
  cardMonto: { fontSize: 15, fontWeight: 'bold' },
  ingreso: { color: colors.verde },
  gasto: { color: colors.primary },
  modal: { flex: 1, backgroundColor: '#fff', paddingBottom: BOTTOM_INSET },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: HEADER_TOP,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  close: { fontSize: 20, color: colors.textoSuave },
  fieldLabel: {
    fontSize: 13,
    color: colors.textoSuave,
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  toggle: { flexDirection: 'row', marginHorizontal: 20, gap: 8 },
  toggleBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borde,
    alignItems: 'center',
  },
  toggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { color: colors.textoSuave, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
  chips: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borde,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textoSuave, fontSize: 13 },
  chipTextActive: { color: '#fff' },
  buscadorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.borde,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  buscadorInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.texto,
  },
  dropdown: {
    marginTop: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    overflow: 'hidden',
  },
  prodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  prodNombre: { fontSize: 14, color: colors.texto, fontWeight: '500' },
  prodPrecio: { fontSize: 12, color: colors.textoSuave },
  insumoFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    gap: 8,
  },
  insumoFormNombre: { flex: 1, fontSize: 14, color: colors.texto },
  cantInput: {
    borderWidth: 1,
    borderColor: colors.borde,
    borderRadius: 6,
    padding: 8,
    width: 70,
    textAlign: 'center',
    fontSize: 14,
    backgroundColor: '#fff',
  },
  unidad: { fontSize: 13, color: colors.textoSuave, width: 35 },
  removeBtn: { color: colors.primary, fontSize: 16 },
  field: { paddingHorizontal: 20, paddingTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.borde,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  btnGuardar: {
    margin: 20,
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnGuardarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  detalleSeccion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  detalleLabel: { fontSize: 13, color: colors.textoSuave },
  detalleValor: { fontSize: 13, color: colors.texto, fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
    paddingTop: 8,
  },
  editBtn: { marginRight: 4 },
});

export default CajaScreen;

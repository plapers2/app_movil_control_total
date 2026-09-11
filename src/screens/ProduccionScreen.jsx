import React, { useState, useCallback } from 'react';
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
  Pressable,
} from 'react-native';
import client from '../api/client';
import { getFechaHoyLocal, fmtFecha } from '../utils/date';
import { getRol } from '../store/authStore';
import FiltroPeriodo from '../components/FiltroPeriodo';
import BotonVerMas from '../components/BotonVerMas';

const fmt = n => `$${Number(n || 0).toLocaleString('es-CO')}`;

// ─── Paso 1: Seleccionar producto ────────────────────────────────────
const PasoProducto = ({ productos, onSeleccionar }) => (
  <View style={{ flex: 1 }}>
    <Text style={s.sectionLabel}>¿Qué producto vas a producir?</Text>
    <FlatList
      data={productos.filter(p => p.activo)}
      keyExtractor={p => String(p.id)}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
      ListEmptyComponent={
        <Text style={s.empty}>Sin productos registrados</Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={s.prodCard}
          onPress={() => onSeleccionar(item)}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.prodNombre}>{item.nombre}</Text>
            {item.recetas?.length > 0 ? (
              <Text style={s.prodRecetaHint}>
                {item.recetas.length} ingrediente
                {item.recetas.length > 1 ? 's' : ''} en receta
              </Text>
            ) : (
              <Text style={s.prodSinReceta}>Sin receta configurada</Text>
            )}
          </View>
          <Text style={s.arrow}>›</Text>
        </TouchableOpacity>
      )}
    />
  </View>
);

// ─── Paso 2: Ajustar insumos y cantidad producida ────────────────────
const PasoInsumos = ({ producto, onGuardar, onVolver, saving }) => {
  const [cantidad, setCantidad] = useState('1');
  const [insumos, setInsumos] = useState(
    (producto.recetas || []).map(r => ({
      insumos_id: r.insumos_id,
      nombre: r.insumos?.nombre || '',
      unidad: r.insumos?.unidad_medida || '',
      cantidad_base: Number(r.cantidad),
      cantidad_real: String(Number(r.cantidad) * 1),
    })),
  );
  const [notas, setNotas] = useState('');
  const [costoTotal, setCostoTotal] = useState('');
  const sinReceta = !producto.recetas || producto.recetas.length === 0;

  // Recalcular cantidades al cambiar la cantidad de producción
  const onCantidadChange = v => {
    const n = Number(v) || 1;
    setCantidad(v);
    setInsumos(prev =>
      prev.map(i => ({
        ...i,
        cantidad_real: String(+(i.cantidad_base * n).toFixed(3)),
      })),
    );
  };

  const onInsumoChange = (idx, v) => {
    setInsumos(prev =>
      prev.map((i, n) => (n === idx ? { ...i, cantidad_real: v } : i)),
    );
  };

  const confirmar = () => {
    const cantNum = Number(cantidad);
    if (!cantNum || cantNum <= 0)
      return Alert.alert('Error', 'La cantidad debe ser mayor a 0.');

    if (sinReceta && (!costoTotal || Number(costoTotal) <= 0)) {
      return Alert.alert(
        'Error',
        'Ingresa cuánto pagaste en total por este lote.',
      );
    }

    onGuardar({
      productos_id: producto.id,
      cantidad: cantNum,
      notas,
      costo_total: sinReceta ? Number(costoTotal) : undefined,
      insumos_reales: insumos.map(i => ({
        insumos_id: i.insumos_id,
        cantidad: Number(i.cantidad_real) || 0,
      })),
    });
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      {/* Producto seleccionado */}
      <View style={s.productoSeleccionado}>
        <TouchableOpacity onPress={onVolver} style={s.volverBtn}>
          <Text style={s.volverText}>‹ Cambiar</Text>
        </TouchableOpacity>
        <Text style={s.productoSeleccionadoNombre}>{producto.nombre}</Text>
      </View>

      {/* Cantidad producida */}
      <View style={s.field}>
        <Text style={s.label}>Unidades que salieron del lote *</Text>
        <TextInput
          style={s.input}
          value={cantidad}
          onChangeText={onCantidadChange}
          keyboardType="numeric"
          placeholder="Ej: 50"
        />
      </View>

      {/* Insumos */}
      {insumos.length > 0 ? (
        <>
          <Text style={s.sectionLabel}>Insumos utilizados</Text>
          <Text style={s.sectionHint}>
            Registra cuánto se usó realmente en este lote
          </Text>
          {insumos.map((item, idx) => (
            <View key={item.insumos_id} style={s.insumoRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.insumoNombre}>{item.nombre}</Text>
                <Text style={s.insumoBase}>
                  Base receta: {item.cantidad_base} {item.unidad} ×{' '}
                  {cantidad || 1}
                </Text>
              </View>
              <TextInput
                style={s.cantInput}
                value={item.cantidad_real}
                onChangeText={v => onInsumoChange(idx, v)}
                keyboardType="numeric"
              />
              <Text style={s.unidad}>{item.unidad}</Text>
            </View>
          ))}
        </>
      ) : (
        <View style={s.sinRecetaBox}>
          <Text style={s.sinRecetaText}>
            ⚠️ Este producto no tiene receta configurada. No se descontarán
            insumos automáticamente.
          </Text>
        </View>
      )}

      {sinReceta && (
        <View style={s.field}>
          <Text style={s.label}>¿Cuánto pagaste en total por este lote? *</Text>
          <Text style={s.sectionHint}>
            Ej: compraste 10 paquetes por $70.000 y de ahí salen{' '}
            {cantidad || '__'} unidades para vender. Ingresa los $70.000, el
            costo por unidad se calcula solo.
          </Text>
          <TextInput
            style={s.input}
            value={costoTotal}
            onChangeText={setCostoTotal}
            keyboardType="numeric"
            placeholder="Ej: 70000"
          />
          {Number(costoTotal) > 0 && Number(cantidad) > 0 && (
            <Text style={s.sectionHint}>
              Costo por unidad: {fmt(Number(costoTotal) / Number(cantidad))}
            </Text>
          )}
        </View>
      )}

      {/* Notas */}
      <View style={s.field}>
        <Text style={s.label}>Notas (opcional)</Text>
        <TextInput
          style={[s.input, { minHeight: 70 }]}
          value={notas}
          onChangeText={setNotas}
          placeholder="Ej: Producción del lunes"
          multiline
        />
      </View>

      <TouchableOpacity
        style={[s.btnGuardar, saving && { opacity: 0.6 }]}
        onPress={confirmar}
        disabled={saving}
      >
        <Text style={s.btnGuardarText}>
          {saving ? 'Registrando...' : '✓ Registrar lote producido'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ─── Pantalla principal ──────────────────────────────────────────────
const ProduccionScreen = () => {
  const [lotes, setLotes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paso, setPaso] = useState(1); // 1: seleccionar producto, 2: insumos
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [loteDetalle, setLoteDetalle] = useState(null);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [filtroProducto, setFiltroProducto] = useState(null);
  const [rol, setRol] = useState(null);
  const [modalEditar, setModalEditar] = useState(false);
  const [loteEditando, setLoteEditando] = useState(null);
  const [cantidadEdit, setCantidadEdit] = useState('1');
  const [insumosEdit, setInsumosEdit] = useState([]);
  const [costoTotalEdit, setCostoTotalEdit] = useState('');
  const [notasEdit, setNotasEdit] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [modalAnular, setModalAnular] = useState(false);
  const [loteAnulando, setLoteAnulando] = useState(null);
  const [motivoAnular, setMotivoAnular] = useState('');
  const [anulando, setAnulando] = useState(false);

  // Filtro de periodo y paginación
  const [periodo, setPeriodo] = useState('dia');
  const [rango, setRango] = useState(null); // { desde, hasta } cuando periodo === 'rango'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMas, setLoadingMas] = useState(false);

  const paramsFecha = criterio => {
    const params = new URLSearchParams({ periodo: criterio.periodo });
    if (criterio.desde && criterio.hasta) {
      params.set('desde', criterio.desde);
      params.set('hasta', criterio.hasta);
    }
    return params;
  };

  const cargar = useCallback(
    async (criterioActual = { periodo, ...(rango || {}) }) => {
      try {
        const qp = paramsFecha(criterioActual);
        const [l, p] = await Promise.all([
          client.get(`/produccion?${qp.toString()}&page=1&limit=10`),
          client.get('/productos'),
        ]);
        setLotes(l.data.data);
        setPage(1);
        setTotalPages(l.data.meta?.pages ?? 1);
        setProductos(p.data.data);
      } catch {}
      const r = await getRol();
      setRol(r);
      setLoading(false);
    },
    [periodo, rango],
  );

  const verMas = async () => {
    if (page >= totalPages) return;
    try {
      setLoadingMas(true);
      const siguiente = page + 1;
      const qp = paramsFecha({ periodo, ...(rango || {}) });
      const res = await client.get(
        `/produccion?${qp.toString()}&page=${siguiente}&limit=10`,
      );
      setLotes(prev => [...prev, ...res.data.data]);
      setPage(siguiente);
      setTotalPages(res.data.meta?.pages ?? 1);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar más lotes.');
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
    setLoading(true);
    cargar(criterio);
  };

  const productosEnLotes = productos.filter(p =>
    lotes.some(l =>
      l.lotes_produccion_items?.some(i => i.productos_id === p.id),
    ),
  );

  const lotesFiltrados = filtroProducto
    ? lotes.filter(l =>
        l.lotes_produccion_items?.some(i => i.productos_id === filtroProducto),
      )
    : lotes;

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const abrirModal = () => {
    setPaso(1);
    setProductoSeleccionado(null);
    setModal(true);
  };

  const seleccionarProducto = producto => {
    setProductoSeleccionado(producto);
    setPaso(2);
  };

  const verDetalle = async lote => {
    try {
      const res = await client.get(`/produccion/${lote.id}`);
      setLoteDetalle(res.data.data);
      setModalDetalle(true);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el detalle.');
    }
  };

  const abrirEditar = async lote => {
    try {
      const res = await client.get(`/produccion/${lote.id}`);
      const l = res.data.data;
      setLoteEditando(l);
      setNotasEdit(l.notas || '');
      // Solo soporta editar lotes de un solo item (que es como se crean hoy)
      const item = l.lotes_produccion_items?.[0];
      setCantidadEdit(item ? String(item.cantidad) : '1');
      setInsumosEdit(
        (l.movimientos_insumos || []).map(m => ({
          insumos_id: m.insumos_id,
          nombre: m.insumos?.nombre || '',
          unidad: m.insumos?.unidad_medida || '',
          cantidad: String(m.cantidad),
        })),
      );
      // Si el item no tiene insumos asociados, es un producto sin receta:
      // precargamos el costo total actual (costo_unitario × cantidad) para
      // que se pueda corregir.
      setCostoTotalEdit(
        item && Number(item.costo_unitario) > 0
          ? String(Math.round(Number(item.costo_unitario) * item.cantidad))
          : '',
      );
      setModalEditar(true);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el lote.');
    }
  };

  const cambiarInsumoEdit = (idx, v) => {
    setInsumosEdit(prev =>
      prev.map((i, n) => (n === idx ? { ...i, cantidad: v } : i)),
    );
  };

  const guardarEdicion = async () => {
    const cantNum = Number(cantidadEdit);
    if (!cantNum || cantNum <= 0)
      return Alert.alert('Error', 'La cantidad debe ser mayor a 0.');
    if (insumosEdit.some(i => i.cantidad !== '' && Number(i.cantidad) < 0))
      return Alert.alert('Error', 'Revisa las cantidades de los insumos.');

    const item = loteEditando.lotes_produccion_items?.[0];
    const sinRecetaEdit = insumosEdit.length === 0;
    if (sinRecetaEdit && (!costoTotalEdit || Number(costoTotalEdit) <= 0)) {
      return Alert.alert(
        'Error',
        'Ingresa cuánto pagaste en total por este lote.',
      );
    }
    try {
      setSavingEdit(true);
      await client.put(`/produccion/${loteEditando.id}`, {
        notas: notasEdit,
        items: [
          {
            productos_id: item.productos_id,
            cantidad: cantNum,
            costo_total: sinRecetaEdit ? Number(costoTotalEdit) : undefined,
          },
        ],
        insumos_reales: insumosEdit.map(i => ({
          insumos_id: i.insumos_id,
          cantidad: Number(i.cantidad) || 0,
        })),
      });
      setModalEditar(false);
      cargar();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Error al editar.');
    } finally {
      setSavingEdit(false);
    }
  };

  const abrirAnular = lote => {
    setLoteAnulando(lote);
    setMotivoAnular('');
    setModalAnular(true);
  };

  const confirmarAnular = async () => {
    if (!motivoAnular.trim())
      return Alert.alert('Error', 'Debes indicar un motivo.');
    try {
      setAnulando(true);
      await client.delete(`/produccion/${loteAnulando.id}`, {
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

  const guardar = async ({
    productos_id,
    cantidad,
    notas,
    insumos_reales,
    costo_total,
  }) => {
    try {
      setSaving(true);
      await client.post('/produccion', {
        fecha: getFechaHoyLocal(),
        notas,
        items: [{ productos_id, cantidad, costo_total }],
        insumos_reales, // para descuento real si el backend lo soporta
      });
      setModal(false);
      cargar();
      Alert.alert(
        '✓ Lote registrado',
        `Se registraron ${cantidad} unidades producidas de ${productoSeleccionado?.nombre}.`,
      );
    } catch (err) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Error al registrar.',
      );
    } finally {
      setSaving(false);
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
        <Text style={s.title}>Producción</Text>
        <TouchableOpacity style={s.btnNew} onPress={abrirModal}>
          <Text style={s.btnNewText}>+ Lote</Text>
        </TouchableOpacity>
      </View>
      <FiltroPeriodo periodo={periodo} onChange={cambiarPeriodo} />
      {productosEnLotes.length > 0 && (
        <FlatList
          data={[{ id: '__todos__', nombre: 'Todos' }, ...productosEnLotes]}
          keyExtractor={item => String(item.id)}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={s.filtros}
          renderItem={({ item }) => {
            const esTodos = item.id === '__todos__';
            const activo = esTodos
              ? !filtroProducto
              : filtroProducto === item.id;
            return (
              <Pressable
                style={[s.filtroChip, activo && s.filtroChipActivo]}
                onPress={() => setFiltroProducto(esTodos ? null : item.id)}
              >
                <Text
                  style={[s.filtroChipText, activo && s.filtroChipTextActivo]}
                >
                  {item.nombre}
                </Text>
              </Pressable>
            );
          }}
        />
      )}

      <FlatList
        data={lotesFiltrados}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={s.empty}>Sin lotes registrados</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => verDetalle(item)}>
            <View style={s.cardRow}>
              <Text style={s.cardTitle}>Lote #{item.id}</Text>
              <Text style={s.cardFecha}>{fmtFecha(item.fecha)}</Text>
            </View>
            {item.notas ? <Text style={s.cardNotas}>{item.notas}</Text> : null}
            {item.lotes_produccion_items?.map(li => (
              <View key={li.id} style={s.loteItem}>
                <Text style={s.loteItemNombre}>• {li.productos?.nombre}</Text>
                <Text style={s.loteItemCant}>{li.cantidad} uds</Text>
              </View>
            ))}
            {Number(item.costo_total) > 0 && (
              <Text style={s.cardCosto}>Costo: {fmt(item.costo_total)}</Text>
            )}
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
            visible={!filtroProducto && page < totalPages}
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
            <Text style={s.modalTitle}>
              {paso === 1 ? 'Nuevo lote' : 'Detalle del lote'}
            </Text>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Text style={s.close}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Indicador de pasos */}
          <View style={s.pasos}>
            <View style={s.paso}>
              <Text style={[s.pasoNum, paso >= 1 && s.pasoNumActivo]}>1</Text>
              <Text style={[s.pasoLabel, paso >= 1 && s.pasoLabelActivo]}>
                Producto
              </Text>
            </View>
            <View style={s.pasoDivider} />
            <View style={s.paso}>
              <Text style={[s.pasoNum, paso >= 2 && s.pasoNumActivo]}>2</Text>
              <Text style={[s.pasoLabel, paso >= 2 && s.pasoLabelActivo]}>
                Insumos
              </Text>
            </View>
          </View>

          {paso === 1 ? (
            <PasoProducto
              productos={productos}
              onSeleccionar={seleccionarProducto}
            />
          ) : (
            <PasoInsumos
              producto={productoSeleccionado}
              onGuardar={guardar}
              onVolver={() => setPaso(1)}
              saving={saving}
            />
          )}
        </View>
      </Modal>
      <Modal
        visible={modalDetalle}
        animationType="slide"
        onRequestClose={() => setModalDetalle(false)}
      >
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Lote #{loteDetalle?.id}</Text>
            <TouchableOpacity onPress={() => setModalDetalle(false)}>
              <Text style={s.close}>✕</Text>
            </TouchableOpacity>
          </View>
          {loteDetalle && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {/* Fecha y notas */}
              <View style={s.detalleSeccion}>
                <Text style={s.detalleLabel}>Fecha</Text>
                <Text style={s.detalleValor}>
                  {fmtFecha(loteDetalle.fecha)}
                </Text>
              </View>
              {loteDetalle.notas ? (
                <View style={s.detalleSeccion}>
                  <Text style={s.detalleLabel}>Notas</Text>
                  <Text style={s.detalleValor}>{loteDetalle.notas}</Text>
                </View>
              ) : null}

              {/* Productos producidos */}
              <Text style={s.sectionLabel}>Productos producidos</Text>
              {loteDetalle.lotes_produccion_items?.map(li => (
                <View key={li.id} style={s.detalleRow}>
                  <Text style={s.detalleRowNombre}>{li.productos?.nombre}</Text>
                  <Text style={s.detalleRowCant}>{li.cantidad} uds</Text>
                </View>
              ))}

              {/* Insumos usados */}
              {loteDetalle.movimientos_insumos?.length > 0 && (
                <>
                  <Text style={s.sectionLabel}>Insumos utilizados</Text>
                  {loteDetalle.movimientos_insumos.map(m => (
                    <View key={m.id} style={s.detalleRow}>
                      <Text style={s.detalleRowNombre}>
                        {m.insumos?.nombre}
                      </Text>
                      <Text style={s.detalleRowCant}>
                        {m.cantidad} {m.insumos?.unidad_medida}
                      </Text>
                    </View>
                  ))}
                </>
              )}

              {/* Costo */}
              {Number(loteDetalle.costo_total) > 0 && (
                <View style={[s.detalleSeccion, { marginTop: 16 }]}>
                  <Text style={s.detalleLabel}>Costo total</Text>
                  <Text
                    style={[
                      s.detalleValor,
                      { color: '#E63946', fontWeight: '700' },
                    ]}
                  >
                    {fmt(loteDetalle.costo_total)}
                  </Text>
                </View>
              )}
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
            <Text style={s.modalTitle}>Editar lote #{loteEditando?.id}</Text>
            <TouchableOpacity onPress={() => setModalEditar(false)}>
              <Text style={s.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            <View style={s.productoSeleccionado}>
              <Text style={s.productoSeleccionadoNombre}>
                {loteEditando?.lotes_produccion_items?.[0]?.productos?.nombre}
              </Text>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Unidades que salieron del lote *</Text>
              <TextInput
                style={s.input}
                value={cantidadEdit}
                onChangeText={setCantidadEdit}
                keyboardType="numeric"
              />
            </View>

            {insumosEdit.length > 0 ? (
              <>
                <Text style={s.sectionLabel}>Insumos utilizados</Text>
                {insumosEdit.map((item, idx) => (
                  <View key={item.insumos_id} style={s.insumoRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.insumoNombre}>{item.nombre}</Text>
                    </View>
                    <TextInput
                      style={s.cantInput}
                      value={item.cantidad}
                      onChangeText={v => cambiarInsumoEdit(idx, v)}
                      keyboardType="numeric"
                    />
                    <Text style={s.unidad}>{item.unidad}</Text>
                  </View>
                ))}
              </>
            ) : (
              <View style={s.field}>
                <Text style={s.label}>
                  ¿Cuánto pagaste en total por este lote? *
                </Text>
                <TextInput
                  style={s.input}
                  value={costoTotalEdit}
                  onChangeText={setCostoTotalEdit}
                  keyboardType="numeric"
                  placeholder="Ej: 70000"
                />
              </View>
            )}

            <View style={s.field}>
              <Text style={s.label}>Notas (opcional)</Text>
              <TextInput
                style={[s.input, { minHeight: 70 }]}
                value={notasEdit}
                onChangeText={setNotasEdit}
                multiline
              />
            </View>

            <TouchableOpacity
              style={[s.btnGuardar, savingEdit && { opacity: 0.6 }]}
              onPress={guardarEdicion}
              disabled={savingEdit}
            >
              <Text style={s.btnGuardarText}>
                {savingEdit ? 'Guardando...' : 'Guardar cambios'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={modalAnular}
        animationType="fade"
        transparent
        onRequestClose={() => setModalAnular(false)}
      >
        <View style={s.overlay}>
          <View style={s.confirmBox}>
            <Text style={s.confirmTitle}>Anular lote #{loteAnulando?.id}</Text>
            <Text style={s.confirmText}>
              Se revertirá el stock producido y se devolverán los insumos
              consumidos.
            </Text>
            <Text style={s.label}>Motivo *</Text>
            <TextInput
              style={[s.input, { minHeight: 70 }]}
              value={motivoAnular}
              onChangeText={setMotivoAnular}
              placeholder="Ej: Error al registrar la cantidad..."
              multiline
            />
            <View style={s.confirmActions}>
              <TouchableOpacity
                style={s.confirmCancelBtn}
                onPress={() => setModalAnular(false)}
              >
                <Text style={s.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmDeleteBtn, anulando && { opacity: 0.6 }]}
                onPress={confirmarAnular}
                disabled={anulando}
              >
                <Text style={s.confirmDeleteText}>
                  {anulando ? 'Anulando...' : 'Anular lote'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  btnNew: {
    backgroundColor: '#E63946',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnNewText: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },
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
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
  cardFecha: { fontSize: 13, color: '#888' },
  cardNotas: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  loteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  loteItemNombre: { fontSize: 13, color: '#555' },
  loteItemCant: { fontSize: 13, color: '#457B9D', fontWeight: '600' },
  cardCosto: {
    fontSize: 13,
    color: '#E63946',
    marginTop: 8,
    fontWeight: '600',
  },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  close: { fontSize: 20, color: '#888' },
  pasos: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: '#fafafa',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  paso: { alignItems: 'center', flex: 1 },
  pasoNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ddd',
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#999',
    overflow: 'hidden',
  },
  pasoNumActivo: { backgroundColor: '#E63946', color: '#fff' },
  pasoLabel: { fontSize: 11, color: '#aaa', marginTop: 4 },
  pasoLabelActivo: { color: '#E63946', fontWeight: '600' },
  pasoDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    textTransform: 'uppercase',
  },
  sectionHint: {
    fontSize: 12,
    color: '#aaa',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  prodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  prodNombre: { fontSize: 15, fontWeight: '700', color: '#333' },
  prodRecetaHint: { fontSize: 12, color: '#2DC653', marginTop: 2 },
  prodSinReceta: { fontSize: 12, color: '#aaa', marginTop: 2 },
  arrow: { fontSize: 22, color: '#ccc', marginLeft: 8 },
  productoSeleccionado: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF0F0',
    borderBottomWidth: 1,
    borderColor: '#fdd',
  },
  volverBtn: { marginRight: 12 },
  volverText: { color: '#E63946', fontSize: 14, fontWeight: '600' },
  productoSeleccionadoNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  field: { paddingHorizontal: 16, paddingTop: 16 },
  label: { fontSize: 13, color: '#888', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  insumoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    gap: 8,
  },
  insumoNombre: { fontSize: 14, fontWeight: '600', color: '#333' },
  insumoBase: { fontSize: 11, color: '#aaa', marginTop: 2 },
  cantInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    width: 70,
    textAlign: 'center',
    fontSize: 14,
    backgroundColor: '#fff',
  },
  unidad: { fontSize: 13, color: '#888', width: 35 },
  sinRecetaBox: {
    margin: 16,
    padding: 14,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  sinRecetaText: { fontSize: 13, color: '#7B6000' },
  btnGuardar: {
    margin: 16,
    backgroundColor: '#E63946',
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
  detalleLabel: { fontSize: 13, color: '#888' },
  detalleValor: { fontSize: 13, color: '#333', fontWeight: '600' },
  detalleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  detalleRowNombre: { fontSize: 14, color: '#333' },
  detalleRowCant: { fontSize: 14, color: '#457B9D', fontWeight: '600' },
  filtros: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: '#eee',
    flexGrow: 0,
    alignItems: 'center',
  },
  filtroChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    flexShrink: 0,
    marginRight: 8,
  },
  filtroChipActivo: {
    backgroundColor: '#E63946',
    borderColor: '#E63946',
  },
  filtroChipText: { fontSize: 13, lineHeight: 18, height: 18, color: '#888' },
  filtroChipTextActivo: { color: '#fff', fontWeight: '600' },
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  confirmBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  confirmText: { fontSize: 13, color: '#888', marginBottom: 12 },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  confirmCancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  confirmCancelText: { color: '#888', fontWeight: '600' },
  confirmDeleteBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#E63946',
    alignItems: 'center',
  },
  confirmDeleteText: { color: '#fff', fontWeight: '600' },
});

export default ProduccionScreen;

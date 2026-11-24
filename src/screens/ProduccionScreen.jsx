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
  Pressable,
} from 'react-native';
import client from '../api/client';
import { getFechaHoyLocal, fmtFecha } from '../utils/date';
import { getRol } from '../store/authStore';
import FiltroPeriodo from '../components/FiltroPeriodo';
import BotonVerMas from '../components/BotonVerMas';
import { avisarError } from '../utils/errores';
import KeyboardView from '../components/KeyboardView';
import { aNumero, aDinero } from '../utils/validar';
import { HEADER_TOP, BOTTOM_INSET } from '../utils/safeArea';
import { fmt } from '../utils/formato';
import { paramsFecha } from '../utils/query';
import ModalAnular from '../components/ModalAnular';
import { colors } from '../theme/colors';

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

// Cantidad sin ceros sobrantes: "10.000" -> "10", "2.500" -> "2.5"
const fmtCant = n => String(+Number(n).toFixed(3));

// ─── Paso 2: Ajustar insumos y cantidad producida ────────────────────
const PasoInsumos = ({ producto, onGuardar, onVolver, saving }) => {
  const [cantidad, setCantidad] = useState('1');
  const [insumos, setInsumos] = useState(
    (producto.recetas || []).map(r => ({
      insumos_id: r.insumos_id,
      nombre: r.insumos?.nombre || '',
      unidad: r.insumos?.unidad_medida || '',
      stock: Number(r.insumos?.stock_actual ?? 0),
      cantidad_base: Number(r.cantidad),
      cantidad_real: String(Number(r.cantidad) * 1),
    })),
  );
  const [notas, setNotas] = useState('');
  const [costoTotal, setCostoTotal] = useState('');
  const sinReceta = !producto.recetas || producto.recetas.length === 0;

  // Lo que se va a usar frente al stock que hay ahora mismo
  const conStock = insumos.map(i => {
    const usado = aNumero(i.cantidad_real) || 0;
    return { ...i, falta: Math.max(0, +(usado - i.stock).toFixed(3)) };
  });
  const faltantes = conStock.filter(i => i.falta > 0);

  // Unidades que alcanzan con el stock actual, según la receta base
  const maxProducible = insumos
    .filter(i => i.cantidad_base > 0)
    .reduce(
      (min, i) => Math.min(min, Math.floor(i.stock / i.cantidad_base)),
      Infinity,
    );

  // Recalcular cantidades al cambiar la cantidad de producción
  const onCantidadChange = v => {
    const n = aNumero(v) || 1;
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
    const cantNum = aNumero(cantidad);
    if (!cantNum || cantNum <= 0)
      return Alert.alert('Error', 'La cantidad debe ser mayor a 0.');

    if (faltantes.length > 0)
      return Alert.alert(
        'Insumos insuficientes',
        faltantes
          .map(i => `• ${i.nombre}: faltan ${fmtCant(i.falta)} ${i.unidad}`)
          .join('\n'),
      );

    if (sinReceta && (!costoTotal || aDinero(costoTotal) <= 0)) {
      return Alert.alert(
        'Error',
        'Ingresa cuánto pagaste en total por este lote.',
      );
    }

    onGuardar({
      productos_id: producto.id,
      cantidad: cantNum,
      notas,
      costo_total: sinReceta ? aDinero(costoTotal) : undefined,
      insumos_reales: insumos.map(i => ({
        insumos_id: i.insumos_id,
        cantidad: aNumero(i.cantidad_real) || 0,
      })),
    });
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
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
          {Number.isFinite(maxProducible) && (
            <View
              style={[s.capacidadBox, maxProducible < 1 && s.capacidadBoxMal]}
            >
              <Text style={s.capacidadText}>
                {maxProducible < 1
                  ? 'Con el stock actual no alcanza para producir una unidad.'
                  : `Con el stock actual alcanzan para ${maxProducible} unidad${
                      maxProducible === 1 ? '' : 'es'
                    }.`}
              </Text>
            </View>
          )}
          {conStock.map((item, idx) => (
            <View key={item.insumos_id} style={s.insumoRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.insumoNombre}>{item.nombre}</Text>
                <Text style={s.insumoBase}>
                  Base receta: {item.cantidad_base} {item.unidad} ×{' '}
                  {cantidad || 1}
                </Text>
                <Text style={[s.insumoDisp, item.falta > 0 && s.insumoFalta]}>
                  Disponible: {fmtCant(item.stock)} {item.unidad}
                  {item.falta > 0 ? ` · faltan ${fmtCant(item.falta)}` : ''}
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
          {aDinero(costoTotal) > 0 && Number(cantidad) > 0 && (
            <Text style={s.sectionHint}>
              Costo por unidad: {fmt(aDinero(costoTotal) / Number(cantidad))}
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
  const [refrescando, setRefrescando] = useState(false);

  const reqId = useRef(0);

  const cargar = useCallback(async () => {
    const id = ++reqId.current;
    setRefrescando(true);
    try {
      const qp = paramsFecha({ periodo, ...(rango || {}) });
      if (filtroProducto) qp.set('productos_id', String(filtroProducto));
      const l = await client.get(
        `/produccion?${qp.toString()}&page=1&limit=10`,
      );
      if (id !== reqId.current) return;
      setLotes(l.data.data);
      setPage(1);
      setTotalPages(l.data.meta?.pages ?? 1);
    } catch (err) {
      if (id === reqId.current) {
        avisarError(err, 'No se pudo cargar la producción.');
      }
    } finally {
      if (id === reqId.current) {
        setLoading(false);
        setRefrescando(false);
      }
    }
  }, [periodo, rango, filtroProducto]);

  // Productos y rol: solo al entrar a la pantalla
  const cargarProductos = useCallback(async () => {
    getRol().then(setRol);
    try {
      const p = await client.get('/productos');
      setProductos(p.data.data);
    } catch (err) {
      avisarError(err, 'No se pudieron cargar los productos.');
    }
  }, []);

  const verMas = async () => {
    if (page >= totalPages) return;
    const id = reqId.current;
    try {
      setLoadingMas(true);
      const siguiente = page + 1;
      const qp = paramsFecha({ periodo, ...(rango || {}) });
      if (filtroProducto) qp.set('productos_id', String(filtroProducto));
      const res = await client.get(
        `/produccion?${qp.toString()}&page=${siguiente}&limit=10`,
      );
      if (id !== reqId.current) return;
      setLotes(prev => [...prev, ...res.data.data]);
      setPage(siguiente);
      setTotalPages(res.data.meta?.pages ?? 1);
    } catch (err) {
      avisarError(err, 'No se pudieron cargar más lotes.');
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

  useFocusEffect(
    useCallback(() => {
      cargarProductos();
    }, [cargarProductos]),
  );

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const abrirModal = () => {
    cargarProductos(); // stock de insumos al día: pudo cambiar en Insumos o Caja
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
    } catch (err) {
      avisarError(err, 'No se pudo cargar el detalle.');
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
      // Receta actual del producto: sirve para recalcular al cambiar unidades
      const recetaProd =
        productos.find(p => p.id === item?.productos_id)?.recetas || [];
      const filaDe = (insumos_id, insumo, cantidad, yaUsado) => {
        const r = recetaProd.find(x => x.insumos_id === insumos_id);
        return {
          insumos_id,
          nombre: insumo?.nombre || '',
          unidad: insumo?.unidad_medida || '',
          cantidad: fmtCant(cantidad),
          // Disponible real para este lote: stock actual + lo que ya descontó
          disponible: Number(insumo?.stock_actual ?? 0) + yaUsado,
          base: r ? Number(r.cantidad) : null,
        };
      };
      const filas = (l.movimientos_insumos || []).map(m =>
        filaDe(m.insumos_id, m.insumos, Number(m.cantidad), Number(m.cantidad)),
      );
      // Insumos de la receta que el lote no usó (cantidad 0): se ofrecen en 0
      if (filas.length > 0) {
        recetaProd.forEach(r => {
          if (!filas.some(f => f.insumos_id === r.insumos_id))
            filas.push(filaDe(r.insumos_id, r.insumos, 0, 0));
        });
      }
      setInsumosEdit(filas);
      // Si el item no tiene insumos asociados, es un producto sin receta:
      // precargamos el costo total actual (costo_unitario × cantidad) para
      // que se pueda corregir.
      setCostoTotalEdit(
        item && Number(item.costo_unitario) > 0
          ? String(Math.round(Number(item.costo_unitario) * item.cantidad))
          : '',
      );
      setModalEditar(true);
    } catch (err) {
      avisarError(err, 'No se pudo cargar el lote.');
    }
  };

  const cambiarInsumoEdit = (idx, v) => {
    setInsumosEdit(prev =>
      prev.map((i, n) => (n === idx ? { ...i, cantidad: v } : i)),
    );
  };

  // Al cambiar las unidades, recalcula cada insumo con base en la receta.
  // Los que no están en la receta actual conservan su cantidad.
  const aplicarReceta = (unidades, lista) => {
    const n = aNumero(unidades);
    if (!(n > 0)) return lista;
    return lista.map(i =>
      i.base != null ? { ...i, cantidad: fmtCant(i.base * n) } : i,
    );
  };

  const cambiarCantidadEdit = v => {
    setCantidadEdit(v);
    setInsumosEdit(prev => aplicarReceta(v, prev));
  };

  // Vuelve a los valores de la receta si se editaron a mano
  const recalcularEdit = () =>
    setInsumosEdit(prev => aplicarReceta(cantidadEdit, prev));

  // Lo que se va a usar frente al stock disponible para este lote
  const insumosEditConStock = insumosEdit.map(i => {
    const usado = aNumero(i.cantidad) || 0;
    return { ...i, falta: Math.max(0, +(usado - i.disponible).toFixed(3)) };
  });
  const faltantesEdit = insumosEditConStock.filter(i => i.falta > 0);
  const maxProducibleEdit = insumosEdit
    .filter(i => i.base > 0)
    .reduce(
      (min, i) => Math.min(min, Math.floor(i.disponible / i.base)),
      Infinity,
    );

  const guardarEdicion = async () => {
    const cantNum = aNumero(cantidadEdit);
    if (!cantNum || cantNum <= 0)
      return Alert.alert('Error', 'La cantidad debe ser mayor a 0.');
    if (insumosEdit.some(i => i.cantidad !== '' && !(aNumero(i.cantidad) >= 0)))
      return Alert.alert('Error', 'Revisa las cantidades de los insumos.');
    if (faltantesEdit.length > 0)
      return Alert.alert(
        'Insumos insuficientes',
        faltantesEdit
          .map(i => `• ${i.nombre}: faltan ${fmtCant(i.falta)} ${i.unidad}`)
          .join('\n'),
      );

    const item = loteEditando.lotes_produccion_items?.[0];
    const sinRecetaEdit = insumosEdit.length === 0;
    if (sinRecetaEdit && (!costoTotalEdit || aDinero(costoTotalEdit) <= 0)) {
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
            costo_total: sinRecetaEdit ? aDinero(costoTotalEdit) : undefined,
          },
        ],
        insumos_reales: insumosEdit.map(i => ({
          insumos_id: i.insumos_id,
          cantidad: aNumero(i.cantidad) || 0,
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
        <ActivityIndicator size="large" color={colors.primary} />
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
      {refrescando && (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={{ marginBottom: 8 }}
        />
      )}
      {productos.length > 0 && (
        <FlatList
          data={[{ id: '__todos__', nombre: 'Todos' }, ...productos]}
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
        data={lotes}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={s.empty}>
            {filtroProducto
              ? 'Sin lotes de este producto en el periodo'
              : 'Sin lotes registrados'}
          </Text>
        }
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
            <Text style={s.modalTitle}>
              {paso === 1 ? 'Nuevo lote' : 'Detalle del lote'}
            </Text>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Text style={s.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <KeyboardView>
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
                      { color: colors.primary, fontWeight: '700' },
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
          <KeyboardView>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
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
                  onChangeText={cambiarCantidadEdit}
                  keyboardType="numeric"
                />
              </View>

              {insumosEdit.length > 0 ? (
                <>
                  <Text style={s.sectionLabel}>Insumos utilizados</Text>
                  <Text style={s.sectionHint}>
                    Se recalculan con la receta al cambiar las unidades; puedes
                    ajustarlos a mano. El disponible incluye lo que este lote ya
                    descontó.
                  </Text>
                  {Number.isFinite(maxProducibleEdit) && (
                    <View
                      style={[
                        s.capacidadBox,
                        maxProducibleEdit < 1 && s.capacidadBoxMal,
                      ]}
                    >
                      <Text style={s.capacidadText}>
                        {maxProducibleEdit < 1
                          ? 'Con el stock disponible no alcanza para producir una unidad.'
                          : `Con el stock disponible alcanzan para ${maxProducibleEdit} unidad${
                              maxProducibleEdit === 1 ? '' : 'es'
                            }.`}
                      </Text>
                    </View>
                  )}
                  {insumosEdit.some(i => i.base != null) && (
                    <TouchableOpacity onPress={recalcularEdit}>
                      <Text style={s.linkRecalcular}>
                        ↻ Recalcular según la receta
                      </Text>
                    </TouchableOpacity>
                  )}
                  {insumosEditConStock.map((item, idx) => (
                    <View key={item.insumos_id} style={s.insumoRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.insumoNombre}>{item.nombre}</Text>
                        {item.base != null && (
                          <Text style={s.insumoBase}>
                            Base receta: {fmtCant(item.base)} {item.unidad} ×{' '}
                            {cantidadEdit || 1}
                          </Text>
                        )}
                        <Text
                          style={[
                            s.insumoDisp,
                            item.falta > 0 && s.insumoFalta,
                          ]}
                        >
                          Disponible: {fmtCant(item.disponible)} {item.unidad}
                          {item.falta > 0
                            ? ` · faltan ${fmtCant(item.falta)}`
                            : ''}
                        </Text>
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
          </KeyboardView>
        </View>
      </Modal>

      <ModalAnular
        visible={modalAnular}
        titulo={`Anular lote #${loteAnulando?.id}`}
        descripcion="Se revertirá el stock producido y se devolverán los insumos consumidos."
        placeholder="Ej: Error al registrar la cantidad..."
        textoBoton="Anular lote"
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
  title: { fontSize: 22, fontWeight: 'bold', color: colors.texto },
  btnNew: {
    backgroundColor: colors.primary,
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
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.texto },
  cardFecha: { fontSize: 13, color: colors.textoSuave },
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
  loteItemCant: { fontSize: 13, color: colors.azul, fontWeight: '600' },
  cardCosto: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 8,
    fontWeight: '600',
  },
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
    backgroundColor: colors.borde,
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#999',
    overflow: 'hidden',
  },
  pasoNumActivo: { backgroundColor: colors.primary, color: '#fff' },
  pasoLabel: { fontSize: 11, color: '#aaa', marginTop: 4 },
  pasoLabelActivo: { color: colors.primary, fontWeight: '600' },
  pasoDivider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borde,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textoSuave,
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
  prodNombre: { fontSize: 15, fontWeight: '700', color: colors.texto },
  prodRecetaHint: { fontSize: 12, color: colors.verde, marginTop: 2 },
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
  volverText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  productoSeleccionadoNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.texto,
  },
  field: { paddingHorizontal: 16, paddingTop: 16 },
  label: { fontSize: 13, color: colors.textoSuave, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.borde,
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
  insumoNombre: { fontSize: 14, fontWeight: '600', color: colors.texto },
  insumoBase: { fontSize: 11, color: '#aaa', marginTop: 2 },
  insumoDisp: { fontSize: 12, color: colors.verde, marginTop: 2 },
  insumoFalta: { color: colors.primary, fontWeight: '600' },
  capacidadBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#EAF8EE',
  },
  capacidadBoxMal: { backgroundColor: '#FFF0F0' },
  capacidadText: { fontSize: 13, color: colors.texto },
  linkRecalcular: {
    color: colors.azul,
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
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
  detalleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  detalleRowNombre: { fontSize: 14, color: colors.texto },
  detalleRowCant: { fontSize: 14, color: colors.azul, fontWeight: '600' },
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
    borderColor: colors.borde,
    backgroundColor: '#fff',
    flexShrink: 0,
    marginRight: 8,
  },
  filtroChipActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filtroChipText: {
    fontSize: 13,
    lineHeight: 18,
    height: 18,
    color: colors.textoSuave,
  },
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
});

export default ProduccionScreen;

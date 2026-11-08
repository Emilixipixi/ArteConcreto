// Acciones de negocio de la Fase 4: fabricacion, reservas, traslados y salidas (ventas/despachos).
// Todo movimiento de inventario se registra con documento y usuario, en el mismo cambio de estado que las existencias,
// de modo que la suma de movimientos siempre coincide con el stock fisico.
import type { StoreApi } from 'zustand';
import { evaluarDesviacion, validarSuficiencia, calcularConsumoEstandar, type ConsumoFab } from '../lib/fabricacion';
import { idDesdeNumero, siguienteNumero } from '../lib/numeracion';
import { puede, reglaSegregacion } from '../lib/permisos';
import { hoyISO } from '../lib/reglas';
import { validarDecimales } from '../lib/unidades';
import type { Despacho, ExistenciaItem, Fabricacion, HistorialItem, Movimiento, Reserva, ResultadoAccion, TipoMovimiento, Traslado, Usuario } from '../types';
import { nivelDe } from './accionesFase3';
import { disponibleTerminado } from './selectoresFase4';
import type { Acciones, Store } from './useStore';

type Set = StoreApi<Store>['setState'];
type Get = StoreApi<Store>['getState'];

const falla = (error: string): ResultadoAccion => ({ ok: false, error });
const ahora = () => new Date().toISOString();
const entrada = (u: Usuario, accion: string, ant?: string, nuevo?: string, obs?: string): HistorialItem =>
  ({ fecha: ahora(), usuarioId: u.id, accion, estadoAnterior: ant, estadoNuevo: nuevo, observacion: obs });
const redondear = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

/** Cambia campos de una fila de existencias (la crea si no existe) */
function ajustar(ex: ExistenciaItem[], sku: string, bodegaId: string, d: { fisica?: number; comprometida?: number; enTransito?: number }): ExistenciaItem[] {
  const i = ex.findIndex((x) => x.sku === sku && x.bodegaId === bodegaId);
  const base = i >= 0 ? ex[i] : { sku, bodegaId, fisica: 0, comprometida: 0, enTransito: 0 };
  const nuevo = {
    ...base, fisica: redondear(base.fisica + (d.fisica ?? 0)), enTransito: Math.max(0, redondear(base.enTransito + (d.enTransito ?? 0))),
    comprometida: Math.max(0, redondear(base.comprometida + (d.comprometida ?? 0))),
  };
  return i >= 0 ? ex.map((x, j) => (j === i ? nuevo : x)) : [...ex, nuevo];
}

export function crearAccionesFase4(set: Set, get: Get): Partial<Acciones> {
  const usuario = (): Usuario | null => get().usuarios.find((u) => u.id === get().usuarioActualId) ?? null;
  const aviso = (m: string, t: 'ok' | 'error' | 'info' = 'ok') => get().mostrarToast(m, t);
  const nombreArt = (sku: string) => get().articulos.find((a) => a.sku === sku)?.nombre ?? sku;

  const idsMovimiento = (n: number): string[] => {
    let max = 0;
    for (const m of get().movimientos) { const k = parseInt(m.id.replace(/\D/g, ''), 10); if (!isNaN(k)) max = Math.max(max, k); }
    return Array.from({ length: n }, (_, i) => `mov-${String(max + i + 1).padStart(4, '0')}`);
  };
  type MovBase = Pick<Movimiento, 'sku' | 'tipo' | 'bodegaOrigenId' | 'bodegaDestinoId' | 'cantidadBase' | 'documentoTipo' | 'documentoId' | 'observacion'>;
  const armarMovimientos = (u: Usuario, lista: MovBase[]): Movimiento[] => {
    const ids = idsMovimiento(lista.length);
    return lista.map((m, i) => ({ ...m, id: ids[i], fecha: ahora(), tipoArticulo: get().articulos.find((a) => a.sku === m.sku)?.tipo ?? 'materia_prima', usuarioId: u.id }));
  };

  /** Alertas de stock una sola vez por cambio de nivel (RF-29, RF-35) para materias primas y producto terminado */
  const alertar = (antes: ExistenciaItem[], despues: ExistenciaItem[], skus: string[]) => {
    for (const sku of new globalThis.Set(skus)) {
      const a = get().articulos.find((x) => x.sku === sku);
      if (!a) continue;
      const n0 = nivelDe(antes, a), n1 = nivelDe(despues, a);
      if (n1 === n0 || n1 === 'ok') continue;
      const ruta = a.tipo === 'materia_prima' ? `/materias-primas?sku=${a.sku}` : `/producto-terminado?sku=${a.sku}`;
      get().emitirNotificacion(n1 === 'agotado' && a.tipo === 'producto_terminado' ? 'producto_agotado' : 'stock_bajo', {
        numero: a.sku, docId: a.sku, ruta,
        detalle: n1 === 'agotado' ? `${a.sku} - ${a.nombre}: agotado, sin existencias disponibles.` : `${a.sku} - ${a.nombre}: quedó por debajo del mínimo (${a.stockMinimo}).`,
      });
    }
  };

  const actualizarFab = (id: string, c: Partial<Fabricacion>, h?: HistorialItem) =>
    set((s) => ({ fabricaciones: s.fabricaciones.map((x) => (x.id === id ? { ...x, ...c, actualizadoEn: ahora(), historial: h ? [...x.historial, h] : x.historial } : x)) }));
  const actualizarTraslado = (id: string, c: Partial<Traslado>, h?: HistorialItem) =>
    set((s) => ({ traslados: s.traslados.map((x) => (x.id === id ? { ...x, ...c, actualizadoEn: ahora(), historial: h ? [...x.historial, h] : x.historial } : x)) }));
  const actualizarDesp = (id: string, c: Partial<Despacho>, h?: HistorialItem) =>
    set((s) => ({ despachos: s.despachos.map((x) => (x.id === id ? { ...x, ...c, actualizadoEn: ahora(), historial: h ? [...x.historial, h] : x.historial } : x)) }));

  // ---------- Fabricacion ----------
  /** Valida y arma una fabricacion a partir de los datos del formulario; no toca inventario */
  const prepararFab = (d: Partial<Fabricacion>, idActual?: string): { error?: string; datos?: Omit<Fabricacion, 'id' | 'numero' | 'creadoPor' | 'creadoEn' | 'actualizadoEn' | 'historial' | 'estado'> } => {
    const st = get();
    const prod = st.articulos.find((a) => a.sku === d.skuProducto && a.tipo === 'producto_terminado' && a.activo);
    if (!prod) return { error: 'Elige un producto terminado' };
    const cant = d.cantidadFabricada ?? 0;
    if (!Number.isInteger(cant) || cant <= 0) return { error: 'La cantidad a fabricar debe ser un entero mayor que cero' };
    const lote = (d.lote ?? '').trim();
    if (!lote) return { error: 'El lote es obligatorio' };
    if (st.fabricaciones.some((f) => f.lote === lote && f.id !== idActual && f.estado !== 'anulada')) return { error: `El lote ${lote} ya existe` };
    const fecha = (d.fechaFabricacion ?? hoyISO()).slice(0, 10);
    if (fecha > hoyISO()) return { error: 'La fecha de fabricación no puede ser posterior a hoy' };
    const bodegaO = d.bodegaOrigenInsumosId ?? '', bodegaD = d.bodegaDestinoId ?? '';
    if (!st.bodegas.some((b) => b.id === bodegaO && b.activa) || !st.bodegas.some((b) => b.id === bodegaD && b.activa)) return { error: 'Elige bodegas de origen y destino activas' };
    // El estandar siempre se recalcula desde la receta; los insumos extra conservan estandar 0
    const estandar = calcularConsumoEstandar(st.articulos, prod.sku, cant);
    const recibidos = d.consumos ?? [];
    const consumos: ConsumoFab[] = [];
    for (const e of estandar) {
      const real = recibidos.find((c) => c.sku === e.sku && !c.extra)?.real ?? e.estandar;
      if (!isFinite(real) || real < 0) return { error: `Consumo real inválido para ${e.sku}` };
      consumos.push({ sku: e.sku, estandar: e.estandar, real: redondear(real, 4) });
    }
    for (const c of recibidos.filter((x) => x.extra)) {
      const art = st.articulos.find((a) => a.sku === c.sku && a.tipo === 'materia_prima');
      if (!art) return { error: 'Un insumo extra debe ser una materia prima' };
      if (estandar.some((e) => e.sku === c.sku) || consumos.some((x) => x.sku === c.sku)) return { error: `${c.sku} ya forma parte de la receta` };
      if (!(c.real > 0)) return { error: `Indica el consumo real de ${c.sku}` };
      if ((c.justificacion ?? '').trim().length < 5) return { error: `El insumo extra ${c.sku} exige justificación` };
      consumos.push({ sku: c.sku, estandar: 0, real: redondear(c.real, 4), extra: true, justificacion: c.justificacion!.trim() });
    }
    const { desviacionPct, requiereDirector } = evaluarDesviacion(consumos, st.parametros.toleranciaConsumo);
    return { datos: { skuProducto: prod.sku, lote, cantidadFabricada: cant, bodegaDestinoId: bodegaD, bodegaOrigenInsumosId: bodegaO, consumos, desviacionPct, requiereConfirmacionDirector: requiereDirector, fechaFabricacion: new Date(`${fecha}T12:00:00`).toISOString(), observacion: d.observacion?.trim() || undefined } };
  };

  /** Genera de forma atomica las salidas de insumos y la entrada del producto terminado (RN-08, CA-07) */
  const aplicarFabricacion = (u: Usuario, f: Fabricacion, inversa: boolean, motivo?: string): ResultadoAccion => {
    const st = get();
    const antes = st.existencias;
    let despues = antes;
    const movs: MovBase[] = [];
    const doc = { documentoTipo: 'Fabricación', documentoId: f.id };
    const obs = (t: string) => (inversa ? `Anulación ${f.numero}: ${motivo}` : `${f.numero} - Lote ${f.lote}: ${t}`);
    for (const c of f.consumos.filter((x) => x.real > 0)) {
      despues = ajustar(despues, c.sku, f.bodegaOrigenInsumosId, { fisica: inversa ? c.real : -c.real });
      movs.push(inversa
        ? { ...doc, sku: c.sku, tipo: 'ajuste', bodegaDestinoId: f.bodegaOrigenInsumosId, cantidadBase: c.real, observacion: obs('devolución de insumo') }
        : { ...doc, sku: c.sku, tipo: 'salida_fabricacion', bodegaOrigenId: f.bodegaOrigenInsumosId, cantidadBase: c.real, observacion: obs('consumo de insumo') });
    }
    despues = ajustar(despues, f.skuProducto, f.bodegaDestinoId, { fisica: inversa ? -f.cantidadFabricada : f.cantidadFabricada });
    movs.push(inversa
      ? { ...doc, sku: f.skuProducto, tipo: 'ajuste', bodegaDestinoId: f.bodegaDestinoId, cantidadBase: -f.cantidadFabricada, observacion: obs('retiro de producto') }
      : { ...doc, sku: f.skuProducto, tipo: 'entrada_fabricacion', bodegaDestinoId: f.bodegaDestinoId, cantidadBase: f.cantidadFabricada, observacion: obs('ingreso de producto terminado') });
    set((s) => ({ movimientos: [...s.movimientos, ...armarMovimientos(u, movs)], existencias: despues }));
    alertar(antes, despues, movs.map((m) => m.sku));
    return { ok: true, id: f.id };
  };

  // ---------- Salidas ----------
  /** Valida las lineas de una salida contra el disponible de la bodega (RN-10). `propio` = cantidades ya comprometidas por el mismo documento */
  const validarLineasSalida = (bodegaId: string, lineas: { sku: string; cantidad: number }[], propio?: Despacho): string | null => {
    if (lineas.length === 0) return 'Agrega al menos un producto';
    const vistos = new globalThis.Set<string>();
    for (const l of lineas) {
      const art = get().articulos.find((a) => a.sku === l.sku && a.tipo === 'producto_terminado');
      if (!art) return 'Solo se registran salidas de producto terminado (RN-05)';
      if (vistos.has(l.sku)) return `${l.sku} está repetido: unifica las cantidades`;
      vistos.add(l.sku);
      if (!(l.cantidad > 0)) return `La cantidad de ${l.sku} debe ser mayor que cero`;
      const e = validarDecimales(l.cantidad, art.unidadBaseId); if (e) return `${l.sku}: ${e}`;
      const disp = disponibleTerminado(get(), l.sku, bodegaId).disponible + (propio?.estado === 'pendiente_salida' ? propio.lineas.filter((x) => x.sku === l.sku).reduce((a, x) => a + x.cantidad, 0) : 0);
      if (l.cantidad - disp > 1e-9) return `${l.sku}: la cantidad (${l.cantidad}) supera el disponible en la bodega (${disp})`;
    }
    return null;
  };

  const validarDatosDespacho = (d: Partial<Despacho>): string | null => {
    if (d.canal !== 'punto_venta' && d.canal !== 'despacho_cliente') return 'Elige el canal: punto de venta o despacho a cliente';
    if (!get().bodegas.some((b) => b.id === d.bodegaId && b.activa)) return 'Elige la bodega de salida';
    if (!(d.cliente ?? '').trim()) return 'El cliente es obligatorio';
    if (d.canal === 'despacho_cliente' && !(d.destino ?? '').trim()) return 'El destino es obligatorio en un despacho a cliente';
    if (!(d.documentoReferencia ?? '').trim()) return 'El documento de referencia es obligatorio (cotización, orden del cliente o remisión)';
    return null;
  };

  return {
    // ---------- Fabricacion ----------
    crearFabricacion: (d) => {
      const u = usuario();
      if (!u) return falla('Debes iniciar sesión');
      if (!puede(u, 'fabricacion.registrar')) return falla('Solo Producción registra fabricaciones');
      const p = prepararFab(d);
      if (p.error) return falla(p.error);
      const numero = siguienteNumero('FAB', get().fabricaciones.map((f) => f.numero));
      const f: Fabricacion = { ...p.datos!, id: idDesdeNumero(numero), numero, creadoPor: u.id, creadoEn: ahora(), actualizadoEn: ahora(), estado: 'borrador', historial: [entrada(u, 'Fabricación registrada en borrador', undefined, 'borrador')] };
      set((s) => ({ fabricaciones: [f, ...s.fabricaciones] }));
      aviso(`Fabricación ${numero} guardada en borrador`);
      return { ok: true, id: f.id };
    },

    actualizarFabricacion: (id, d) => {
      const u = usuario(); const f = get().fabricaciones.find((x) => x.id === id);
      if (!u || !f) return falla('Fabricación no encontrada');
      if (!puede(u, 'fabricacion.registrar')) return falla('Solo Producción edita fabricaciones');
      if (f.estado !== 'borrador') return falla('Solo se edita una fabricación en borrador');
      const p = prepararFab(d, id);
      if (p.error) return falla(p.error);
      actualizarFab(id, p.datos!, entrada(u, 'Borrador actualizado', 'borrador', 'borrador'));
      aviso(`Fabricación ${f.numero} actualizada`);
      return { ok: true, id };
    },

    confirmarFabricacion: (id, observacion) => {
      const u = usuario(); const f = get().fabricaciones.find((x) => x.id === id);
      if (!u || !f) return falla('Fabricación no encontrada');
      if (!['borrador', 'pendiente_director'].includes(f.estado)) return falla('La fabricación ya fue resuelta'); // RN-18
      const st = get();
      const { desviacionPct, requiereDirector } = evaluarDesviacion(f.consumos, st.parametros.toleranciaConsumo);
      // Quien confirma: Produccion si esta dentro de tolerancia; el Director si hay desvio (RN-08)
      if (requiereDirector && f.estado === 'borrador') {
        if (!puede(u, 'fabricacion.registrar')) return falla('Solo Producción envía la fabricación a confirmación');
        const faltantes = validarSuficiencia(st.existencias, f.consumos, f.bodegaOrigenInsumosId);
        if (faltantes.length) return falla(`Insumos insuficientes: ${faltantes.map((x) => `${x.sku} (faltan ${x.faltante})`).join(', ')}`);
        actualizarFab(id, { estado: 'pendiente_director', desviacionPct, requiereConfirmacionDirector: true }, entrada(u, `Enviada al director por desvío de consumo (${desviacionPct} %)`, 'borrador', 'pendiente_director', observacion));
        get().emitirNotificacion('fabricacion_pendiente_director', { numero: f.numero, docId: f.id, creadoPor: f.creadoPor, detalle: `${f.numero} (lote ${f.lote}): el consumo real se desvía hasta ${desviacionPct} % del estándar (tolerancia ${st.parametros.toleranciaConsumo} %).` });
        aviso(`Fabricación ${f.numero} enviada al director por desvío de consumo`, 'info');
        return { ok: true, id };
      }
      if (requiereDirector) {
        const r = reglaSegregacion(u, f, 'fabricacion.confirmar_desvio');
        if (!r.permitido) return falla(r.motivo ?? 'Acción no permitida');
      } else if (!puede(u, 'fabricacion.registrar')) return falla('Solo Producción confirma una fabricación dentro de tolerancia');
      const faltantes = validarSuficiencia(st.existencias, f.consumos, f.bodegaOrigenInsumosId);
      if (faltantes.length) return falla(`Insumos insuficientes: ${faltantes.map((x) => `${x.sku} (faltan ${x.faltante})`).join(', ')}`);
      const r = aplicarFabricacion(u, f, false);
      if (!r.ok) return r;
      actualizarFab(id, { estado: 'confirmada', desviacionPct }, entrada(u, 'Fabricación confirmada: insumos consumidos y producto ingresado', f.estado, 'confirmada', observacion));
      get().emitirNotificacion('fabricacion_confirmada', { numero: f.numero, docId: f.id, creadoPor: f.creadoPor, ruta: `/producto-terminado?sku=${f.skuProducto}`, detalle: `${f.numero}: ingresaron ${f.cantidadFabricada} ${nombreArt(f.skuProducto)} (lote ${f.lote}).` });
      aviso(`Fabricación ${f.numero} confirmada`);
      return { ok: true, id };
    },

    anularFabricacion: (id, motivo) => {
      const u = usuario(); const f = get().fabricaciones.find((x) => x.id === id);
      if (!u || !f) return falla('Fabricación no encontrada');
      if (!puede(u, 'documento.anular')) return falla('Solo el Director anula una fabricación confirmada');
      if (f.estado !== 'confirmada') return falla('Solo se anula una fabricación confirmada');
      if ((motivo ?? '').trim().length < 10) return falla('El motivo de anulación es obligatorio (mínimo 10 caracteres)');
      const disp = disponibleTerminado(get(), f.skuProducto, f.bodegaDestinoId).disponible;
      if (disp < f.cantidadFabricada) return falla(`No se puede anular: el producto ya salió de la bodega (disponible ${disp}, se necesitan ${f.cantidadFabricada})`);
      const r = aplicarFabricacion(u, f, true, motivo.trim());
      if (!r.ok) return r;
      actualizarFab(id, { estado: 'anulada', motivoAnulacion: motivo.trim() }, entrada(u, 'Fabricación anulada: movimientos inversos generados', 'confirmada', 'anulada', motivo.trim()));
      get().emitirNotificacion('documento_anulado', { numero: f.numero, docId: f.id, creadoPor: f.creadoPor, ruta: `/fabricacion/${f.id}`, detalle: `${u.nombre} anuló ${f.numero}: ${motivo.trim()}` });
      aviso(`Fabricación ${f.numero} anulada`, 'info');
      return { ok: true, id };
    },

    // ---------- Reservas ----------
    crearReserva: (d) => {
      const u = usuario();
      if (!u) return falla('Debes iniciar sesión');
      if (!puede(u, 'reserva.crear')) return falla('Solo Ventas o Producción reservan producto');
      const art = get().articulos.find((a) => a.sku === d.sku && a.tipo === 'producto_terminado');
      if (!art) return falla('Elige un producto terminado');
      if (!get().bodegas.some((b) => b.id === d.bodegaId && b.activa)) return falla('Elige una bodega activa');
      if (!(d.cantidad > 0)) return falla('La cantidad debe ser mayor que cero');
      const dec = validarDecimales(d.cantidad, art.unidadBaseId); if (dec) return falla(dec);
      if (!d.cliente.trim() || !d.referencia.trim()) return falla('Cliente o proyecto y referencia son obligatorios');
      if (!d.vence || d.vence < hoyISO()) return falla('La fecha de vencimiento no puede ser anterior a hoy');
      const disp = disponibleTerminado(get(), d.sku, d.bodegaId).disponible;
      if (d.cantidad - disp > 1e-9) return falla(`La cantidad supera el disponible en la bodega (${disp})`);
      const numero = siguienteNumero('RES', get().reservas.map((r) => r.numero));
      const r: Reserva = { id: idDesdeNumero(numero), numero, creadoPor: u.id, creadoEn: ahora(), actualizadoEn: ahora(), sku: d.sku, bodegaId: d.bodegaId, cantidad: d.cantidad, cliente: d.cliente.trim(), referencia: d.referencia.trim(), vence: d.vence, estado: 'activa', historial: [entrada(u, 'Reserva creada', undefined, 'activa')] };
      set((s) => ({ reservas: [r, ...s.reservas], existencias: ajustar(s.existencias, d.sku, d.bodegaId, { comprometida: d.cantidad }) }));
      aviso(`Reserva ${numero} creada: el disponible baja ${d.cantidad}`);
      return { ok: true, id: r.id };
    },

    liberarReserva: (id, motivo) => {
      const u = usuario(); const r = get().reservas.find((x) => x.id === id);
      if (!u || !r) return falla('Reserva no encontrada');
      if (!puede(u, 'reserva.crear')) return falla('Solo Ventas o Producción liberan reservas');
      if (r.estado !== 'activa') return falla('La reserva ya no está activa');
      set((s) => ({
        reservas: s.reservas.map((x) => (x.id === id ? { ...x, estado: 'liberada', actualizadoEn: ahora(), historial: [...x.historial, entrada(u, 'Reserva liberada', 'activa', 'liberada', motivo)] } : x)),
        existencias: ajustar(s.existencias, r.sku, r.bodegaId, { comprometida: -r.cantidad }),
      }));
      aviso(`Reserva ${r.numero} liberada`, 'info');
      return { ok: true, id };
    },

    liberarReservasVencidas: () => {
      const hoy = hoyISO();
      const vencidas = get().reservas.filter((r) => r.estado === 'activa' && r.vence < hoy);
      if (vencidas.length === 0) return;
      set((s) => {
        let ex = s.existencias;
        for (const r of vencidas) ex = ajustar(ex, r.sku, r.bodegaId, { comprometida: -r.cantidad });
        return {
          existencias: ex,
          reservas: s.reservas.map((r) => (vencidas.some((v) => v.id === r.id) ? { ...r, estado: 'vencida' as const, actualizadoEn: ahora(), historial: [...r.historial, { fecha: ahora(), usuarioId: r.creadoPor, accion: 'Reserva vencida: se libera el compromiso', estadoAnterior: 'activa', estadoNuevo: 'vencida' }] } : r)),
        };
      });
    },

    // ---------- Traslados ----------
    crearTraslado: (d) => {
      const u = usuario();
      if (!u) return falla('Debes iniciar sesión');
      if (!puede(u, 'traslado.crear')) return falla('Solo Almacén crea traslados');
      const st = get();
      if (d.origenId === d.destinoId) return falla('El origen y el destino no pueden ser la misma bodega');
      if (!st.bodegas.some((b) => b.id === d.origenId && b.activa) || !st.bodegas.some((b) => b.id === d.destinoId && b.activa)) return falla('Elige bodegas activas');
      if (d.lineas.length === 0) return falla('Agrega al menos un producto');
      const vistos = new globalThis.Set<string>();
      for (const l of d.lineas) {
        const art = st.articulos.find((a) => a.sku === l.sku && a.tipo === 'producto_terminado');
        if (!art) return falla('Solo se trasladan productos terminados (RN-05)');
        if (vistos.has(l.sku)) return falla(`${l.sku} está repetido`);
        vistos.add(l.sku);
        if (!(l.cantidadEnviada > 0)) return falla(`La cantidad de ${l.sku} debe ser mayor que cero`);
        const dec = validarDecimales(l.cantidadEnviada, art.unidadBaseId); if (dec) return falla(`${l.sku}: ${dec}`);
        const disp = disponibleTerminado(st, l.sku, d.origenId).disponible;
        if (l.cantidadEnviada - disp > 1e-9) return falla(`${l.sku}: supera el disponible en el origen (${disp})`);
      }
      const numero = siguienteNumero('TRS', st.traslados.map((t) => t.numero));
      const t: Traslado = { id: idDesdeNumero(numero), numero, creadoPor: u.id, creadoEn: ahora(), actualizadoEn: ahora(), origenId: d.origenId, destinoId: d.destinoId, lineas: d.lineas.map((l) => ({ sku: l.sku, cantidadEnviada: l.cantidadEnviada })), estado: 'borrador', observacion: (d as { observacion?: string }).observacion?.trim() || undefined, historial: [entrada(u, 'Traslado creado en borrador', undefined, 'borrador')] };
      set((s) => ({ traslados: [t, ...s.traslados] }));
      aviso(`Traslado ${numero} guardado en borrador`);
      return { ok: true, id: t.id };
    },

    cancelarTraslado: (id) => {
      const u = usuario(); const t = get().traslados.find((x) => x.id === id);
      if (!u || !t) return falla('Traslado no encontrado');
      if (!puede(u, 'traslado.crear')) return falla('Solo Almacén cancela traslados');
      if (t.estado !== 'borrador') return falla('Solo se cancela un traslado en borrador');
      actualizarTraslado(id, { estado: 'cancelado' }, entrada(u, 'Traslado cancelado', 'borrador', 'cancelado'));
      aviso(`Traslado ${t.numero} cancelado`, 'info');
      return { ok: true, id };
    },

    despacharTraslado: (id) => {
      const u = usuario(); const t = get().traslados.find((x) => x.id === id);
      if (!u || !t) return falla('Traslado no encontrado');
      if (!puede(u, 'traslado.crear')) return falla('Solo Almacén despacha traslados');
      if (t.estado !== 'borrador') return falla('El traslado ya fue despachado'); // RN-18
      const st = get();
      for (const l of t.lineas) {
        const disp = disponibleTerminado(st, l.sku, t.origenId).disponible;
        if (l.cantidadEnviada - disp > 1e-9) return falla(`${l.sku}: supera el disponible en el origen (${disp})`);
      }
      // Baja la fisica del origen y las unidades quedan en transito hacia el destino (no disponibles en ningun lado, RN-09)
      const antes = st.existencias; let despues = antes;
      for (const l of t.lineas) {
        despues = ajustar(despues, l.sku, t.origenId, { fisica: -l.cantidadEnviada });
        despues = ajustar(despues, l.sku, t.destinoId, { enTransito: l.cantidadEnviada });
      }
      const movs = armarMovimientos(u, t.lineas.map((l) => ({ sku: l.sku, tipo: 'traslado_salida' as TipoMovimiento, bodegaOrigenId: t.origenId, bodegaDestinoId: t.destinoId, cantidadBase: l.cantidadEnviada, documentoTipo: 'Traslado', documentoId: t.id, observacion: `${t.numero}: salida hacia ${t.destinoId.toUpperCase()}` })));
      set((s) => ({ movimientos: [...s.movimientos, ...movs], existencias: despues }));
      actualizarTraslado(id, { estado: 'en_transito' }, entrada(u, 'Traslado despachado: unidades en tránsito', 'borrador', 'en_transito'));
      get().emitirNotificacion('traslado_en_transito', { numero: t.numero, docId: t.id, creadoPor: u.id });
      alertar(antes, despues, t.lineas.map((l) => l.sku));
      aviso(`Traslado ${t.numero} despachado: en tránsito`);
      return { ok: true, id };
    },

    recibirTraslado: (id, recibidas) => {
      const u = usuario(); const t = get().traslados.find((x) => x.id === id);
      if (!u || !t) return falla('Traslado no encontrado');
      const st = get();
      const regla = reglaSegregacion(u, t, 'traslado.recibir', { parametros: st.parametros, usuarios: st.usuarios });
      if (!regla.permitido) return falla(regla.motivo ?? 'Acción no permitida');
      if (t.estado !== 'en_transito') return falla('El traslado no está en tránsito'); // RN-18
      for (const l of t.lineas) {
        const q = recibidas[l.sku];
        if (q === undefined || !isFinite(q) || q < 0) return falla(`Indica la cantidad recibida de ${l.sku}`);
        if (q - l.cantidadEnviada > 1e-9) return falla(`${l.sku}: no se puede recibir más de lo enviado (${l.cantidadEnviada})`);
        const art = st.articulos.find((a) => a.sku === l.sku)!; const dec = validarDecimales(q, art.unidadBaseId); if (dec) return falla(`${l.sku}: ${dec}`);
      }
      const antes = st.existencias; let despues = antes;
      const movs: MovBase[] = [];
      for (const l of t.lineas) {
        const q = redondear(recibidas[l.sku]);
        despues = ajustar(despues, l.sku, t.destinoId, { enTransito: -l.cantidadEnviada, fisica: q });
        if (q > 0) movs.push({ sku: l.sku, tipo: 'traslado_entrada', bodegaOrigenId: t.origenId, bodegaDestinoId: t.destinoId, cantidadBase: q, documentoTipo: 'Traslado', documentoId: t.id, observacion: `${t.numero}: recibido en ${t.destinoId.toUpperCase()}` });
      }
      const lineas = t.lineas.map((l) => ({ ...l, cantidadRecibida: redondear(recibidas[l.sku]) }));
      const dif = lineas.filter((l) => l.cantidadRecibida < l.cantidadEnviada);
      const nuevo = dif.length ? 'recibido_con_diferencias' : 'recibido';
      set((s) => ({ movimientos: [...s.movimientos, ...armarMovimientos(u, movs)], existencias: despues }));
      const detalleDif = dif.map((l) => `${l.sku}: enviadas ${l.cantidadEnviada}, recibidas ${l.cantidadRecibida}`).join('; ');
      actualizarTraslado(id, { estado: nuevo, lineas }, entrada(u, dif.length ? 'Recepción confirmada con diferencias' : 'Recepción confirmada en destino', 'en_transito', nuevo, detalleDif || undefined));
      if (dif.length) get().emitirNotificacion('traslado_con_diferencias', { numero: t.numero, docId: t.id, creadoPor: u.id, detalle: `${t.numero} recibido con diferencias (${detalleDif}). Queda como pérdida en tránsito pendiente de ajuste autorizado.` });
      alertar(antes, despues, t.lineas.map((l) => l.sku));
      aviso(dif.length ? `Traslado ${t.numero} recibido con diferencias` : `Traslado ${t.numero} recibido`, dif.length ? 'info' : 'ok');
      return { ok: true, id };
    },

    // ---------- Ventas y despachos ----------
    crearDespacho: (d) => {
      const u = usuario();
      if (!u) return falla('Debes iniciar sesión');
      if (!puede(u, 'despacho.crear')) return falla('Solo Ventas registra salidas');
      const e = validarDatosDespacho(d); if (e) return falla(e);
      const lineas = d.lineas ?? [];
      const e2 = validarLineasSalida(d.bodegaId!, lineas); if (e2) return falla(e2);
      const numero = siguienteNumero('DSP', get().despachos.map((x) => x.numero));
      const nuevo: Despacho = {
        id: idDesdeNumero(numero), numero, creadoPor: u.id, creadoEn: ahora(), actualizadoEn: ahora(), canal: d.canal!, bodegaId: d.bodegaId!, cliente: d.cliente!.trim(),
        destino: (d.destino ?? '').trim() || (d.canal === 'punto_venta' ? 'Showroom' : ''), documentoReferencia: d.documentoReferencia!.trim(), proyecto: d.proyecto?.trim() || undefined,
        lineas: lineas.map((l) => ({ sku: l.sku, cantidad: l.cantidad })), estado: 'borrador', estadoAdministrativo: 'sin_descargar',
        identificacionCliente: d.identificacionCliente?.trim() || undefined, reservaId: d.reservaId || undefined, historial: [entrada(u, 'Salida registrada en borrador', undefined, 'borrador')],
      };
      set((s) => ({ despachos: [nuevo, ...s.despachos] }));
      aviso(`Salida ${numero} guardada en borrador`);
      return { ok: true, id: nuevo.id };
    },

    actualizarDespacho: (id, d) => {
      const u = usuario(); const x = get().despachos.find((y) => y.id === id);
      if (!u || !x) return falla('Salida no encontrada');
      if (!puede(u, 'despacho.crear')) return falla('Solo Ventas edita salidas');
      if (x.estado !== 'borrador') return falla('Solo se edita una salida en borrador');
      const datos = { ...x, ...d };
      const e = validarDatosDespacho(datos); if (e) return falla(e);
      const e2 = validarLineasSalida(datos.bodegaId, datos.lineas); if (e2) return falla(e2);
      actualizarDesp(id, { canal: datos.canal, bodegaId: datos.bodegaId, cliente: datos.cliente.trim(), destino: datos.destino.trim(), documentoReferencia: datos.documentoReferencia.trim(), proyecto: datos.proyecto?.trim() || undefined, lineas: datos.lineas, identificacionCliente: datos.identificacionCliente?.trim() || undefined, reservaId: datos.reservaId || undefined }, entrada(u, 'Borrador actualizado', 'borrador', 'borrador'));
      aviso(`Salida ${x.numero} actualizada`);
      return { ok: true, id };
    },

    enviarASalida: (id) => {
      const u = usuario(); const x = get().despachos.find((y) => y.id === id);
      if (!u || !x) return falla('Salida no encontrada');
      if (!puede(u, 'despacho.crear')) return falla('Solo Ventas envía salidas a Almacén');
      if (x.estado !== 'borrador') return falla('La salida ya fue enviada');
      const e = validarDatosDespacho(x) ?? validarLineasSalida(x.bodegaId, x.lineas);
      if (e) return falla(e);
      // Si hay reserva vinculada, su compromiso pasa a la salida (solo se ajusta la diferencia)
      const reserva = x.reservaId ? get().reservas.find((r) => r.id === x.reservaId && r.estado === 'activa') : undefined;
      let ex = get().existencias;
      for (const l of x.lineas) {
        const yaReservado = reserva && reserva.sku === l.sku && reserva.bodegaId === x.bodegaId ? reserva.cantidad : 0;
        ex = ajustar(ex, l.sku, x.bodegaId, { comprometida: l.cantidad - yaReservado });
      }
      if (reserva && !x.lineas.some((l) => l.sku === reserva.sku)) ex = ajustar(ex, reserva.sku, reserva.bodegaId, { comprometida: -reserva.cantidad });
      set((s) => ({
        existencias: ex,
        reservas: reserva ? s.reservas.map((r) => (r.id === reserva.id ? { ...r, estado: 'consumida' as const, actualizadoEn: ahora(), historial: [...r.historial, entrada(u, `Consumida por ${x.numero}`, 'activa', 'consumida')] } : r)) : s.reservas,
      }));
      actualizarDesp(id, { estado: 'pendiente_salida' }, entrada(u, 'Enviada a almacén para salida física', 'borrador', 'pendiente_salida'));
      get().emitirNotificacion('despacho_pendiente_salida', { numero: x.numero, docId: x.id, creadoPor: u.id });
      aviso(`Salida ${x.numero} enviada a Almacén`);
      return { ok: true, id };
    },

    confirmarSalida: (id) => {
      const u = usuario(); const x = get().despachos.find((y) => y.id === id);
      if (!u || !x) return falla('Salida no encontrada');
      if (!puede(u, 'salida.confirmar')) return falla('Solo Almacén confirma la salida física');
      // Guardia anti-duplicado: una salida confirmada no vuelve a descontar (RN-18, CA-09)
      if (x.estado !== 'pendiente_salida') return falla(x.estado === 'confirmado' ? 'La salida ya fue confirmada: no se descuenta dos veces' : 'La salida no está pendiente de confirmación');
      const st = get();
      for (const l of x.lineas) {
        const fisica = st.existencias.find((e) => e.sku === l.sku && e.bodegaId === x.bodegaId)?.fisica ?? 0;
        if (l.cantidad - fisica > 1e-9) return falla(`${l.sku}: la cantidad (${l.cantidad}) supera la existencia física de la bodega (${fisica})`);
      }
      const antes = st.existencias; let despues = antes;
      const tipo: TipoMovimiento = x.canal === 'punto_venta' ? 'salida_venta' : 'salida_despacho';
      for (const l of x.lineas) despues = ajustar(despues, l.sku, x.bodegaId, { fisica: -l.cantidad, comprometida: -l.cantidad });
      const movs = armarMovimientos(u, x.lineas.map((l) => ({ sku: l.sku, tipo, bodegaOrigenId: x.bodegaId, cantidadBase: l.cantidad, documentoTipo: 'Despacho', documentoId: x.id, observacion: `${x.numero} - ${x.cliente} (${x.documentoReferencia})` })));
      set((s) => ({ movimientos: [...s.movimientos, ...movs], existencias: despues }));
      actualizarDesp(id, { estado: 'confirmado' }, entrada(u, 'Salida física confirmada: stock descontado', 'pendiente_salida', 'confirmado'));
      alertar(antes, despues, x.lineas.map((l) => l.sku));
      aviso(`Salida ${x.numero} confirmada`);
      return { ok: true, id };
    },

    anularSalida: (id, motivo) => {
      const u = usuario(); const x = get().despachos.find((y) => y.id === id);
      if (!u || !x) return falla('Salida no encontrada');
      if (!puede(u, 'documento.anular')) return falla('Solo el Director autoriza la anulación de una salida');
      if (x.estado !== 'confirmado') return falla('Solo se anula una salida confirmada');
      if ((motivo ?? '').trim().length < 10) return falla('El motivo de anulación es obligatorio (mínimo 10 caracteres)');
      const antes = get().existencias; let despues = antes;
      for (const l of x.lineas) despues = ajustar(despues, l.sku, x.bodegaId, { fisica: l.cantidad });
      const movs = armarMovimientos(u, x.lineas.map((l) => ({ sku: l.sku, tipo: 'ajuste' as TipoMovimiento, bodegaDestinoId: x.bodegaId, cantidadBase: l.cantidad, documentoTipo: 'Despacho', documentoId: x.id, observacion: `Anulación ${x.numero}: ${motivo.trim()}` })));
      set((s) => ({ movimientos: [...s.movimientos, ...movs], existencias: despues }));
      actualizarDesp(id, { estado: 'anulado', motivoAnulacion: motivo.trim() }, entrada(u, 'Salida anulada: movimiento inverso generado', 'confirmado', 'anulado', motivo.trim()));
      get().emitirNotificacion('documento_anulado', { numero: x.numero, docId: x.id, creadoPor: x.creadoPor, ruta: `/ventas/${x.id}`, detalle: `${u.nombre} anuló ${x.numero}: ${motivo.trim()}` });
      aviso(`Salida ${x.numero} anulada`, 'info');
      return { ok: true, id };
    },

    marcarDescargado: (id) => {
      const u = usuario(); const x = get().despachos.find((y) => y.id === id);
      if (!u || !x) return falla('Salida no encontrada');
      if (!puede(u, 'despacho.descargar')) return falla('Solo Administración o Ventas marcan la descarga');
      if (x.estado !== 'confirmado') return falla('Solo se descarga una salida confirmada');
      if (x.estadoAdministrativo === 'descargado_contabilidad') return falla('Ya está marcada como descargada');
      actualizarDesp(id, { estadoAdministrativo: 'descargado_contabilidad' }, entrada(u, 'Marcada como descargada de contabilidad (sin asientos, RN-14)', 'confirmado', 'confirmado'));
      aviso(`Salida ${x.numero} marcada como descargada`);
      return { ok: true, id };
    },
  };
}

// Acciones de negocio de la Fase 3: pagos y anticipos, recepciones de almacen y ajustes de inventario.
// Cada accion valida permisos/segregacion, cambia estado, agrega historial, mueve inventario de forma atomica y notifica.
import type { StoreApi } from 'zustand';
import { puede, reglaSegregacion } from '../lib/permisos';
import { idDesdeNumero, siguienteNumero } from '../lib/numeracion';
import { hoyISO } from '../lib/reglas';
import { aBase, validarDecimales } from '../lib/unidades';
import type { Articulo, Compra, ExistenciaItem, HistorialItem, LineaRecepcion, Movimiento, Pago, Recepcion, ResultadoAccion, SolicitudPago, Usuario } from '../types';
import { anticipoPagado, enCursoPagoFinal, maximoSolicitable, pagadoCompra, pendientePorLinea, saldoPorPagar, valorRecibido } from './selectoresFase3';
import type { Acciones, Store } from './useStore';

type Set = StoreApi<Store>['setState'];
type Get = StoreApi<Store>['getState'];

const falla = (error: string): ResultadoAccion => ({ ok: false, error });
const ahora = () => new Date().toISOString();
const entrada = (u: Usuario, accion: string, ant?: string, nuevo?: string, obs?: string): HistorialItem =>
  ({ fecha: ahora(), usuarioId: u.id, accion, estadoAnterior: ant, estadoNuevo: nuevo, observacion: obs });
const redondear = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

// Guardia anti-duplicado (RN-18): la misma recepcion enviada dos veces seguidas se ignora
let ultimaConfirmacion = { clave: '', t: 0 };

type Nivel = 'ok' | 'bajo' | 'agotado';
/** Nivel de stock de un articulo segun el disponible total (igual criterio que el semaforo) */
export function nivelDe(existencias: ExistenciaItem[], a: Articulo): Nivel {
  const disp = existencias.filter((x) => x.sku === a.sku).reduce((t, x) => t + x.fisica - x.comprometida, 0);
  return disp <= 0 ? 'agotado' : disp < a.stockMinimo ? 'bajo' : 'ok';
}

/** Suma (o resta) una cantidad base a la existencia de una bodega; crea la fila si no existe */
export function aplicarStock(existencias: ExistenciaItem[], sku: string, bodegaId: string, delta: number): ExistenciaItem[] {
  const i = existencias.findIndex((x) => x.sku === sku && x.bodegaId === bodegaId);
  if (i < 0) return [...existencias, { sku, bodegaId, fisica: redondear(delta), comprometida: 0, enTransito: 0 }];
  return existencias.map((x, j) => (j === i ? { ...x, fisica: redondear(x.fisica + delta) } : x));
}

export function crearAccionesFase3(set: Set, get: Get): Partial<Acciones> {
  const usuario = (): Usuario | null => get().usuarios.find((u) => u.id === get().usuarioActualId) ?? null;
  const aviso = (m: string, t: 'ok' | 'error' | 'info' = 'ok') => get().mostrarToast(m, t);
  const actualizarCompra = (id: string, cambios: Partial<Compra>, h?: HistorialItem) =>
    set((s) => ({ compras: s.compras.map((x) => (x.id === id ? { ...x, ...cambios, actualizadoEn: ahora(), historial: h ? [...x.historial, h] : x.historial } : x)) }));
  const actualizarPago = (id: string, cambios: Partial<SolicitudPago>, h?: HistorialItem) =>
    set((s) => ({ solicitudesPago: s.solicitudesPago.map((x) => (x.id === id ? { ...x, ...cambios, actualizadoEn: ahora(), historial: h ? [...x.historial, h] : x.historial } : x)) }));

  /** Cierra la compra cuando ya esta recibida por completo y pagada (y conciliada si hubo anticipo) */
  const cerrarSiCorresponde = (compraId: string, u: Usuario) => {
    const c = get().compras.find((x) => x.id === compraId);
    if (!c || c.estado === 'cerrada' || c.estadoRecepcion !== 'completa' || c.estadoPago !== 'pagado') return;
    const sinConciliar = get().solicitudesPago.some((s) => s.compraId === compraId && s.tipo === 'anticipo' && s.estado === 'pagada');
    if (sinConciliar) return;
    actualizarCompra(compraId, { estado: 'cerrada' }, entrada(u, 'Compra cerrada: recibida y pagada', c.estado, 'cerrada'));
  };

  /** Emite alertas de stock una sola vez por cambio de estado (RF-29): compara el nivel antes y despues del movimiento */
  const alertarCambioDeNivel = (antes: ExistenciaItem[], despues: ExistenciaItem[], skus: string[]) => {
    for (const sku of new Set(skus)) {
      const a = get().articulos.find((x) => x.sku === sku && x.tipo === 'materia_prima');
      if (!a) continue;
      const n0 = nivelDe(antes, a), n1 = nivelDe(despues, a);
      if (n1 !== n0 && n1 !== 'ok') {
        get().emitirNotificacion('stock_bajo', {
          numero: a.sku, docId: a.sku, ruta: `/materias-primas?sku=${a.sku}`,
          detalle: n1 === 'agotado' ? `${a.sku} - ${a.nombre}: agotado, sin existencias disponibles.` : `${a.sku} - ${a.nombre}: quedó por debajo del mínimo (${a.stockMinimo}).`,
        });
      }
    }
  };

  /** Ids de movimiento consecutivos (mov-0001...) sin repetir los existentes */
  const idsMovimiento = (cantidad: number): string[] => {
    let max = 0;
    for (const m of get().movimientos) { const n = parseInt(m.id.replace(/\D/g, ''), 10); if (!isNaN(n)) max = Math.max(max, n); }
    return Array.from({ length: cantidad }, (_, i) => `mov-${String(max + i + 1).padStart(4, '0')}`);
  };

  /** Valida que el importe sea positivo y no supere el maximo solicitable */
  const validarImporte = (compraId: string, tipo: SolicitudPago['tipo'], importe: number, excluirId?: string): string | null => {
    if (!isFinite(importe) || importe <= 0) return 'El importe debe ser mayor que cero';
    const max = maximoSolicitable(get(), compraId, tipo, excluirId);
    if (importe - max > 0.005) return `El importe no puede superar el saldo disponible (${max.toFixed(2)} USD)`;
    return null;
  };

  return {
    // ---------- Tesoreria ----------
    crearSolicitudPago: (compraId, tipo, importe, observacion) => {
      const u = usuario();
      if (!u) return falla('Debes iniciar sesión');
      if (!puede(u, 'pago.preparar')) return falla('Tu rol no puede preparar solicitudes de pago');
      const c = get().compras.find((x) => x.id === compraId);
      if (!c) return falla('Compra no encontrada');
      // RN-17: una orden sin aprobar no se paga
      if (!['aprobada', 'recibida_parcial', 'recibida'].includes(c.estado)) return falla('La orden aún no está aprobada: esperando aprobación');
      if (tipo === 'anticipo') {
        if (c.modalidadPago !== 'anticipo') return falla('La orden no es con anticipo');
        if (get().solicitudesPago.some((s) => s.compraId === c.id && s.tipo === 'anticipo' && s.estado !== 'devuelta')) return falla('Ya existe una solicitud de anticipo para esta orden');
      } else {
        if (!get().recepciones.some((r) => r.compraId === c.id)) return falla('El pago final se prepara sobre lo ya recibido: aún no hay recepciones');
        if (c.modalidadPago === 'anticipo' && !anticipoPagado(get(), c.id)) return falla('Primero debe pagarse el anticipo');
      }
      const err = validarImporte(c.id, tipo, importe);
      if (err) return falla(err);
      const numero = siguienteNumero('PAG', get().solicitudesPago.map((s) => s.numero));
      const nueva: SolicitudPago = {
        id: idDesdeNumero(numero), numero, creadoPor: u.id, creadoEn: ahora(), actualizadoEn: ahora(), compraId: c.id, tipo,
        importe: redondear(importe, 2), observacion: observacion?.trim() || undefined, estado: 'preparada',
        historial: [entrada(u, tipo === 'anticipo' ? 'Solicitud de anticipo preparada' : 'Solicitud de pago preparada', undefined, 'preparada', observacion?.trim() || undefined)],
      };
      set((s) => ({ solicitudesPago: [nueva, ...s.solicitudesPago] }));
      aviso(`Solicitud ${numero} guardada`);
      return { ok: true, id: nueva.id };
    },

    enviarSolicitudPago: (id, d) => {
      const u = usuario(); const sp = get().solicitudesPago.find((x) => x.id === id);
      if (!u || !sp) return falla('Solicitud de pago no encontrada');
      if (!puede(u, 'pago.preparar')) return falla('Tu rol no puede enviar solicitudes de pago');
      if (!['preparada', 'devuelta'].includes(sp.estado)) return falla('Solo se envían solicitudes preparadas o devueltas');
      const importe = d?.importe ?? sp.importe;
      const err = validarImporte(sp.compraId, sp.tipo, importe, sp.id);
      if (err) return falla(err);
      const compra = get().compras.find((c) => c.id === sp.compraId);
      actualizarPago(id, { importe: redondear(importe, 2), observacion: d?.observacion?.trim() || sp.observacion, estado: 'pendiente_aprobacion' },
        entrada(u, sp.estado === 'devuelta' ? 'Reenviada a aprobación' : 'Enviada a aprobación', sp.estado, 'pendiente_aprobacion'));
      get().emitirNotificacion('pago_enviado', { numero: sp.numero, docId: sp.id, creadoPor: sp.creadoPor, refId: sp.compraId, detalle: `${u.nombre} solicita aprobar ${sp.numero} (${compra?.numero ?? ''}) por ${importe.toFixed(2)} USD.` });
      aviso(`Solicitud ${sp.numero} enviada a aprobación`);
      return { ok: true, id };
    },

    decidirSolicitudPago: (id, decision, observacion) => {
      const u = usuario(); const sp = get().solicitudesPago.find((x) => x.id === id);
      if (!u || !sp) return falla('Solicitud de pago no encontrada');
      const regla = reglaSegregacion(u, sp, 'pago.aprobar');
      if (!regla.permitido) return falla(regla.motivo ?? 'Acción no permitida');
      if (sp.estado !== 'pendiente_aprobacion') return falla('La solicitud ya no está pendiente de aprobación'); // RN-18
      if (decision === 'rechazar') return falla('Un pago se aprueba o se devuelve con observación');
      const obs = (observacion ?? '').trim();
      if (decision === 'devolver' && obs.length < 10) return falla('La observación es obligatoria (mínimo 10 caracteres)');
      // RN-16: aprobar un pago nunca toca el inventario; solo cambia el estado de la solicitud
      const nuevo = decision === 'aprobar' ? 'aprobada' : 'devuelta';
      actualizarPago(id, { estado: nuevo }, entrada(u, decision === 'aprobar' ? (sp.tipo === 'anticipo' ? 'Anticipo aprobado' : 'Pago aprobado') : 'Pago devuelto con observación', 'pendiente_aprobacion', nuevo, obs || undefined));
      get().emitirNotificacion(decision === 'aprobar' ? 'pago_aprobado' : 'pago_devuelto', { numero: sp.numero, docId: sp.id, creadoPor: sp.creadoPor, refId: sp.compraId, detalle: obs ? `${u.nombre}: ${obs}` : undefined });
      aviso(`Solicitud ${sp.numero} ${nuevo === 'aprobada' ? 'aprobada' : 'devuelta a Tesorería'}`, nuevo === 'aprobada' ? 'ok' : 'info');
      return { ok: true, id };
    },

    registrarPago: (spId, d) => {
      const u = usuario(); const sp = get().solicitudesPago.find((x) => x.id === spId);
      if (!u || !sp) return falla('Solicitud de pago no encontrada');
      const regla = reglaSegregacion(u, sp, 'pago.registrar');
      if (!regla.permitido) return falla(regla.motivo ?? 'Acción no permitida');
      if (sp.estado !== 'aprobada') return falla('Solo se registra el pago de solicitudes aprobadas'); // RN-18: no registrar dos veces
      const fecha = (d.fecha ?? hoyISO()).slice(0, 10);
      if (fecha > hoyISO()) return falla('La fecha del pago no puede ser posterior a hoy');
      const importe = d.importe ?? sp.importe;
      if (!isFinite(importe) || importe <= 0) return falla('El importe debe ser mayor que cero');
      if (importe - sp.importe > 0.005) return falla('El importe pagado no puede superar el aprobado');
      if (!d.comprobante?.trim()) return falla('Adjunta el comprobante del pago');
      const c = get().compras.find((x) => x.id === sp.compraId);
      if (!c) return falla('Compra no encontrada');

      const nPago = String(get().pagos.length + 1).padStart(4, '0');
      const pago: Pago = { id: `pg-${nPago}`, solicitudPagoId: sp.id, fecha: new Date(`${fecha}T12:00:00`).toISOString(), importe: redondear(importe, 2), medio: d.medio, comprobante: d.comprobante.trim(), registradoPor: u.id, referencia: d.referencia?.trim() || undefined, cuentaId: d.medio === 'efectivo' ? undefined : d.cuentaId };
      set((s) => ({ pagos: [pago, ...s.pagos] }));
      actualizarPago(sp.id, { estado: 'pagada' }, entrada(u, sp.tipo === 'anticipo' ? 'Anticipo registrado con comprobante' : 'Pago registrado con comprobante', 'aprobada', 'pagada', d.referencia ? `Referencia ${d.referencia.trim()}` : undefined));

      // Estado de pago independiente de la recepcion (RN-03, RN-04)
      const st = get();
      let estadoPago: Compra['estadoPago'];
      if (sp.tipo === 'anticipo') estadoPago = 'anticipo';
      else {
        const cubierto = pagadoCompra(st, c.id) + 0.005 >= valorRecibido(st, c.id);
        estadoPago = cubierto && c.estadoRecepcion === 'completa' ? 'pagado' : 'pago_parcial';
      }
      actualizarCompra(c.id, { estadoPago }, entrada(u, sp.tipo === 'anticipo' ? `Anticipo pagado (${sp.numero})` : `Pago registrado (${sp.numero})`, undefined, undefined));
      if (sp.tipo === 'anticipo') {
        get().emitirNotificacion('anticipo_registrado', { numero: c.numero, docId: sp.id, refId: c.id, creadoPor: u.id });
        aviso(`Anticipo ${sp.numero} registrado: la orden ${c.numero} ya puede recibirse`);
      } else {
        aviso(`Pago ${sp.numero} registrado${estadoPago === 'pagado' ? ': ciclo de pago cerrado' : ''}`);
      }
      cerrarSiCorresponde(c.id, u);
      return { ok: true, id: pago.id };
    },

    conciliarAnticipo: (spId) => {
      const u = usuario(); const sp = get().solicitudesPago.find((x) => x.id === spId);
      if (!u || !sp) return falla('Solicitud de pago no encontrada');
      if (!puede(u, 'pago.registrar')) return falla('Tu rol no puede conciliar anticipos');
      if (sp.tipo !== 'anticipo' || sp.estado !== 'pagada') return falla('Solo se concilian anticipos ya pagados');
      const st = get(); const c = st.compras.find((x) => x.id === sp.compraId);
      if (!c) return falla('Compra no encontrada');
      if (c.estadoRecepcion !== 'completa') return falla('Primero debe completarse o cerrarse la recepción');
      if (saldoPorPagar(st, c.id) > 0 || enCursoPagoFinal(st, c.id) > 0) return falla('Hay saldo por pagar: solicita y registra primero el pago final');
      const favor = pagadoCompra(st, c.id) - valorRecibido(st, c.id);
      actualizarPago(sp.id, { estado: 'conciliada' }, entrada(u, favor > 0.005 ? 'Anticipo conciliado con saldo a favor' : 'Anticipo conciliado', 'pagada', 'conciliada'));
      actualizarCompra(c.id, { estadoPago: 'pagado' }, entrada(u, `Anticipo ${sp.numero} conciliado`));
      cerrarSiCorresponde(c.id, u);
      aviso(`Anticipo ${sp.numero} conciliado: cierre administrativo listo`);
      return { ok: true, id: sp.id };
    },

    // ---------- Recepcion de almacen ----------
    registrarRecepcion: (compraId, lineas, observacion, extra) => {
      const u = usuario(); const c = get().compras.find((x) => x.id === compraId);
      if (!u || !c) return falla('Orden de compra no encontrada');
      const st = get();
      const regla = reglaSegregacion(u, c, 'recepcion.confirmar', { parametros: st.parametros, solicitudesPago: st.solicitudesPago, pagos: st.pagos });
      if (!regla.permitido) return falla(regla.motivo ?? 'Acción no permitida');
      if (!['aprobada', 'recibida_parcial'].includes(c.estado) || c.estadoRecepcion === 'completa') return falla('La orden no está disponible para recepción'); // RN-17
      // RN-19: con anticipo, primero debe estar pagado
      if (c.modalidadPago === 'anticipo' && !anticipoPagado(st, c.id)) return falla('La orden es con anticipo: el anticipo debe estar pagado antes de recibir');
      const bodegaId = extra?.bodegaId ?? c.lugarEntregaBodegaId ?? 'b1';
      const bodega = st.bodegas.find((b) => b.id === bodegaId && b.activa);
      if (!bodega) return falla('Elige una bodega de recepción activa');
      const fecha = (extra?.fecha ?? hoyISO()).slice(0, 10);
      if (fecha > hoyISO()) return falla('La fecha de recepción no puede ser posterior a hoy');

      const pend = pendientePorLinea(st, c);
      const nuevasLineas: LineaRecepcion[] = [];
      let hayExceso = false;
      for (const p of pend) {
        const ahoraQ = lineas.find((l) => l.sku === p.sku)?.recibidoAhora ?? 0;
        if (!isFinite(ahoraQ) || ahoraQ < 0) return falla(`Cantidad inválida para ${p.sku}`);
        const errDec = validarDecimales(ahoraQ, p.unidadId);
        if (errDec) return falla(`${p.sku}: ${errDec}`);
        const exceso = ahoraQ - p.pendiente > 0.0005;
        if (exceso) hayExceso = true;
        nuevasLineas.push({
          sku: p.sku, ordenado: p.ordenado, recibidoAntes: p.recibido, recibidoAhora: redondear(ahoraQ), unidadId: p.unidadId,
          faltante: Math.max(0, redondear(p.ordenado - p.recibido - ahoraQ)), exceso: exceso || undefined,
          observacion: extra?.observacionesLinea?.[p.sku]?.trim() || undefined,
        });
      }
      if (!nuevasLineas.some((l) => l.recibidoAhora > 0)) return falla('Indica al menos una cantidad recibida');
      if (hayExceso && (extra?.motivoExceso ?? '').trim().length < 5) return falla('Recibir más de lo pendiente exige un motivo ("Exceso aceptado")');

      // Guardia anti-duplicado (RN-18)
      const clave = `${c.id}|${bodegaId}|${nuevasLineas.map((l) => `${l.sku}:${l.recibidoAhora}`).join(',')}`;
      if (clave === ultimaConfirmacion.clave && Date.now() - ultimaConfirmacion.t < 3000) return falla('Esta recepción ya fue confirmada');
      ultimaConfirmacion = { clave, t: Date.now() };

      const completa = nuevasLineas.every((l) => l.faltante === 0);
      const numero = siguienteNumero('REC', st.recepciones.map((r) => r.numero));
      const rec: Recepcion = {
        id: idDesdeNumero(numero), numero, creadoPor: u.id, creadoEn: ahora(), actualizadoEn: ahora(), compraId: c.id, bodegaId,
        lineas: nuevasLineas, observacion: observacion?.trim() || undefined, esCierre: completa, estado: 'confirmada',
        fechaRecepcion: new Date(`${fecha}T12:00:00`).toISOString(), remision: extra?.remision?.trim() || undefined,
        adjuntos: extra?.adjuntos?.length ? extra.adjuntos : undefined, motivoExceso: hayExceso ? extra?.motivoExceso?.trim() : undefined,
        historial: [entrada(u, completa ? 'Recepción confirmada (completa)' : 'Recepción confirmada (parcial)', undefined, 'confirmada', observacion?.trim() || undefined)],
      };

      // Movimientos y existencias se actualizan en el mismo set: solo lo efectivamente recibido (RF-27, CA-05)
      const conCantidad = nuevasLineas.filter((l) => l.recibidoAhora > 0);
      const ids = idsMovimiento(conCantidad.length);
      const movs: Movimiento[] = conCantidad.map((l, i) => {
        const art = st.articulos.find((a) => a.sku === l.sku)!;
        return {
          id: ids[i], fecha: ahora(), sku: l.sku, tipoArticulo: art.tipo, tipo: 'entrada_compra', bodegaDestinoId: bodegaId,
          cantidadBase: redondear(aBase(l.recibidoAhora, l.unidadId, art)), documentoTipo: 'Recepción', documentoId: rec.id, usuarioId: u.id,
          observacion: `${c.numero}: ${l.recibidoAhora} ${l.unidadId}`,
        };
      });
      const antes = st.existencias;
      let despues = antes;
      for (const m of movs) despues = aplicarStock(despues, m.sku, bodegaId, m.cantidadBase);
      set((s) => ({ recepciones: [rec, ...s.recepciones], movimientos: [...s.movimientos, ...movs], existencias: despues }));
      actualizarCompra(c.id, { estadoRecepcion: completa ? 'completa' : 'parcial', estado: completa ? 'recibida' : 'recibida_parcial' },
        entrada(u, completa ? `Recepción completa ${numero}` : `Recepción parcial ${numero}`, c.estado, completa ? 'recibida' : 'recibida_parcial'));

      const resumen = conCantidad.map((l) => `${l.recibidoAhora} ${l.unidadId} de ${l.sku}`).join(', ');
      get().emitirNotificacion('recepcion_registrada', { numero, docId: rec.id, refId: c.id, creadoPor: u.id, conAnticipo: c.modalidadPago === 'anticipo', detalle: `${c.numero}: se recibieron ${resumen}.` });
      if (!completa || hayExceso) {
        get().emitirNotificacion('recepcion_diferencias', {
          numero, docId: rec.id, refId: c.id, creadoPor: u.id,
          detalle: hayExceso ? `${c.numero}: exceso aceptado (${extra?.motivoExceso?.trim()}).` : `${c.numero}: faltan ${nuevasLineas.filter((l) => l.faltante > 0).map((l) => `${l.faltante} ${l.unidadId} de ${l.sku}`).join(', ')}.`,
        });
      }
      alertarCambioDeNivel(antes, despues, conCantidad.map((l) => l.sku));
      aviso(`Recepción ${numero} confirmada${completa ? '' : ' (parcial)'}`);
      return { ok: true, id: rec.id };
    },

    cerrarRecepcion: (compraId, observacion) => {
      const u = usuario(); const c = get().compras.find((x) => x.id === compraId);
      if (!u || !c) return falla('Orden de compra no encontrada');
      const st = get();
      const regla = reglaSegregacion(u, c, 'recepcion.confirmar', { parametros: st.parametros, solicitudesPago: st.solicitudesPago, pagos: st.pagos });
      if (!regla.permitido) return falla(regla.motivo ?? 'Acción no permitida');
      if (c.estadoRecepcion !== 'parcial' || c.estado !== 'recibida_parcial') return falla('Solo se cierra contra la orden original una recepción parcial');
      const motivo = (observacion ?? '').trim();
      if (motivo.length < 10) return falla('El motivo del cierre es obligatorio (mínimo 10 caracteres)');
      const faltan = pendientePorLinea(st, c).filter((l) => l.pendiente > 0).map((l) => `${l.pendiente} ${l.unidadId} de ${l.sku}`).join(', ');
      const ultima = st.recepciones.filter((r) => r.compraId === c.id).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))[0];
      set((s) => ({ recepciones: s.recepciones.map((r) => (r.id === ultima?.id ? { ...r, esCierre: true, motivoCierre: motivo } : r)) }));
      actualizarCompra(c.id, { estadoRecepcion: 'completa', estado: 'recibida' }, entrada(u, 'Cerrada contra la orden original', 'recibida_parcial', 'recibida', `${motivo}. No se recibirá: ${faltan}.`));
      get().emitirNotificacion('recepcion_diferencias', { numero: c.numero, docId: ultima?.id ?? c.id, refId: c.id, creadoPor: u.id, detalle: `${c.numero} cerrada contra la orden original sin recibir ${faltan}. Motivo: ${motivo}` });
      cerrarSiCorresponde(c.id, u);
      aviso(`Orden ${c.numero} cerrada contra la orden original`, 'info');
      return { ok: true, id: c.id };
    },

    // ---------- Ajustes de inventario ----------
    crearAjuste: (d) => {
      const u = usuario();
      if (!u) return falla('Debes iniciar sesión');
      if (!puede(u, 'ajuste.crear')) return falla('Tu rol no puede registrar ajustes');
      const art = get().articulos.find((a) => a.sku === d.sku);
      if (!art || art.tipo !== 'materia_prima') return falla('Solo se ajustan materias primas desde esta pantalla (RN-05)');
      if (!get().bodegas.some((b) => b.id === d.bodegaId && b.activa)) return falla('Elige una bodega activa');
      if (!isFinite(d.cantidadBase) || d.cantidadBase === 0) return falla('La cantidad del ajuste no puede ser cero');
      if ((d.motivo ?? '').trim().length < 5) return falla('El motivo es obligatorio');
      const fisica = get().existencias.find((x) => x.sku === d.sku && x.bodegaId === d.bodegaId)?.fisica ?? 0;
      if (fisica + d.cantidadBase < 0) return falla(`El ajuste dejaría la existencia en negativo (hay ${fisica} en esa bodega)`);
      const numero = siguienteNumero('AJU', get().ajustes.map((a) => a.numero));
      const aj = {
        id: idDesdeNumero(numero), numero, creadoPor: u.id, creadoEn: ahora(), actualizadoEn: ahora(), sku: d.sku, bodegaId: d.bodegaId,
        cantidadBase: redondear(d.cantidadBase), motivo: d.motivo.trim(), tipoAjuste: d.tipoAjuste, estado: 'pendiente' as const,
        historial: [entrada(u, 'Ajuste solicitado', undefined, 'pendiente', d.motivo.trim())],
      };
      // El stock NO cambia hasta que el Director apruebe
      set((s) => ({ ajustes: [aj, ...s.ajustes] }));
      get().emitirNotificacion('ajuste_pendiente', { numero, docId: aj.id, creadoPor: u.id, detalle: `${u.nombre} solicita ajustar ${d.cantidadBase > 0 ? '+' : ''}${d.cantidadBase} de ${d.sku}: ${aj.motivo}` });
      aviso(`Ajuste ${numero} enviado al director`);
      return { ok: true, id: aj.id };
    },

    decidirAjuste: (id, decision, observacion) => {
      const u = usuario(); const aj = get().ajustes.find((x) => x.id === id);
      if (!u || !aj) return falla('Ajuste no encontrado');
      const regla = reglaSegregacion(u, aj, 'ajuste.aprobar');
      if (!regla.permitido) return falla(regla.motivo ?? 'Acción no permitida');
      if (aj.estado !== 'pendiente') return falla('El ajuste ya fue resuelto'); // RN-18
      const obs = (observacion ?? '').trim();
      if (decision !== 'aprobar' && obs.length < 10) return falla('La observación es obligatoria (mínimo 10 caracteres)');
      if (decision === 'aprobar') {
        const antes = get().existencias;
        const fisica = antes.find((x) => x.sku === aj.sku && x.bodegaId === aj.bodegaId)?.fisica ?? 0;
        if (fisica + aj.cantidadBase < 0) return falla('La existencia actual ya no alcanza para este ajuste');
        const art = get().articulos.find((a) => a.sku === aj.sku)!;
        const despues = aplicarStock(antes, aj.sku, aj.bodegaId, aj.cantidadBase);
        const mov: Movimiento = {
          id: idsMovimiento(1)[0], fecha: ahora(), sku: aj.sku, tipoArticulo: art.tipo, tipo: 'ajuste', bodegaDestinoId: aj.bodegaId,
          cantidadBase: aj.cantidadBase, documentoTipo: 'Ajuste', documentoId: aj.id, usuarioId: u.id, observacion: aj.motivo,
        };
        // Movimiento y existencia en el mismo set: la suma de movimientos sigue coincidiendo con el stock
        set((s) => ({ movimientos: [...s.movimientos, mov], existencias: despues }));
        alertarCambioDeNivel(antes, despues, [aj.sku]);
      }
      const nuevo = decision === 'aprobar' ? 'aprobado' : 'rechazado';
      set((s) => ({ ajustes: s.ajustes.map((x) => (x.id === id ? { ...x, estado: nuevo, actualizadoEn: ahora(), historial: [...x.historial, entrada(u, decision === 'aprobar' ? 'Ajuste aprobado: movimiento registrado' : 'Ajuste rechazado', 'pendiente', nuevo, obs || undefined)] } : x)) }));
      get().emitirNotificacion('ajuste_decidido', { numero: aj.numero, docId: aj.id, creadoPor: aj.creadoPor, detalle: decision === 'aprobar' ? `${u.nombre} aprobó el ajuste de ${aj.sku}; el stock ya refleja el cambio.` : `${u.nombre} rechazó el ajuste: ${obs}` });
      aviso(`Ajuste ${aj.numero} ${nuevo}`, decision === 'aprobar' ? 'ok' : 'info');
      return { ok: true, id };
    },
  };
}

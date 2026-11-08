// Acciones de negocio de la Fase 2: solicitudes y compras (hasta la orden aprobada).
// Cada accion: valida permisos/segregacion, cambia estado, agrega historial, notifica y devuelve { ok, error? }.
import type { StoreApi } from 'zustand';
import { dentroUmbral, calcularTotales, generarCotizaciones, hoyISO, validarCompra, validarSolicitud } from '../lib/reglas';
import { puede, reglaSegregacion } from '../lib/permisos';
import { idDesdeNumero, siguienteNumero } from '../lib/numeracion';
import type { Compra, HistorialItem, ResultadoAccion, Solicitud, Usuario } from '../types';
import type { Acciones, Store } from './useStore';

type Set = StoreApi<Store>['setState'];
type Get = StoreApi<Store>['getState'];

const falla = (error: string): ResultadoAccion => ({ ok: false, error });
const ahora = () => new Date().toISOString();
const entrada = (u: Usuario, accion: string, ant?: string, nuevo?: string, obs?: string): HistorialItem =>
  ({ fecha: ahora(), usuarioId: u.id, accion, estadoAnterior: ant, estadoNuevo: nuevo, observacion: obs });
const primerError = (e: Record<string, string>) => Object.values(e)[0];

export function crearAccionesFase2(set: Set, get: Get): Partial<Acciones> {
  const usuario = (): Usuario | null => get().usuarios.find((u) => u.id === get().usuarioActualId) ?? null;
  const actualizarSolicitud = (id: string, cambios: Partial<Solicitud>, h?: HistorialItem) =>
    set((s) => ({ solicitudes: s.solicitudes.map((x) => (x.id === id ? { ...x, ...cambios, actualizadoEn: ahora(), historial: h ? [...x.historial, h] : x.historial } : x)) }));
  const actualizarCompra = (id: string, cambios: Partial<Compra>, h?: HistorialItem) =>
    set((s) => ({ compras: s.compras.map((x) => (x.id === id ? { ...x, ...cambios, actualizadoEn: ahora(), historial: h ? [...x.historial, h] : x.historial } : x)) }));
  const aviso = (m: string, t: 'ok' | 'error' | 'info' = 'ok') => get().mostrarToast(m, t);

  /** Crea o actualiza un borrador (o una devuelta en edicion) sin exigir validacion completa */
  const guardarBorrador: Acciones['guardarBorradorSolicitud'] = (d, id) => {
    const u = usuario();
    if (!u) return falla('Debes iniciar sesión');
    if (!puede(u, 'solicitud.crear')) return falla('Tu rol no puede crear solicitudes');
    if (id) {
      const s = get().solicitudes.find((x) => x.id === id);
      if (!s) return falla('Solicitud no encontrada');
      if (s.creadoPor !== u.id) return falla('Solo el creador puede editar la solicitud');
      if (!['borrador', 'devuelta'].includes(s.estado)) return falla('Solo se puede editar en borrador o devuelta');
      actualizarSolicitud(id, d, s.estado === 'borrador' ? entrada(u, 'Borrador guardado', 'borrador', 'borrador') : entrada(u, 'Corrección guardada sin reenviar', 'devuelta', 'devuelta'));
      aviso(`Borrador ${s.numero} guardado`);
      return { ok: true, id };
    }
    const numero = siguienteNumero('SOL', get().solicitudes.map((x) => x.numero));
    const nueva: Solicitud = {
      id: idDesdeNumero(numero), numero, creadoPor: u.id, creadoEn: ahora(), actualizadoEn: ahora(), estado: 'borrador',
      area: d.area ?? '', prioridad: d.prioridad ?? 'media', justificacion: d.justificacion ?? '', lineas: d.lineas ?? [], adjuntos: d.adjuntos ?? [],
      fechaRequerida: d.fechaRequerida, historial: [entrada(u, 'Solicitud creada', undefined, 'borrador')],
    };
    set((s) => ({ solicitudes: [nueva, ...s.solicitudes] }));
    aviso(`Borrador ${numero} guardado`);
    return { ok: true, id: nueva.id };
  };

  const enviar = (id: string, reenvio: boolean, d?: Parameters<Acciones['reenviarSolicitud']>[1]): ResultadoAccion => {
    const u = usuario();
    if (!u) return falla('Debes iniciar sesión');
    const s = get().solicitudes.find((x) => x.id === id);
    if (!s) return falla('Solicitud no encontrada');
    if (s.creadoPor !== u.id) return falla('Solo el creador puede enviar la solicitud');
    if (s.estado !== (reenvio ? 'devuelta' : 'borrador')) return falla(reenvio ? 'Solo se reenvían solicitudes devueltas' : 'Solo se envían borradores');
    const datos = { ...s, ...(d ?? {}) };
    const errores = validarSolicitud(datos, get().articulos);
    if (Object.keys(errores).length) return falla(primerError(errores));
    // RN-02: el historial se conserva completo; solo se agrega la nueva entrada
    actualizarSolicitud(id, { ...(d ?? {}), estado: 'pendiente' }, entrada(u, reenvio ? 'Reenviada' : 'Solicitud enviada al director', reenvio ? 'devuelta' : 'borrador', 'pendiente'));
    get().emitirNotificacion('solicitud_enviada', { numero: s.numero, docId: s.id, creadoPor: s.creadoPor, detalle: `${u.nombre} ${reenvio ? 'reenvió' : 'envió'} la solicitud ${s.numero} (${datos.lineas.length} ítems).` });
    aviso(`Solicitud ${s.numero} ${reenvio ? 'reenviada' : 'enviada'} al director`);
    return { ok: true, id };
  };

  return {
    crearSolicitud: (d) => guardarBorrador(d),
    guardarBorradorSolicitud: guardarBorrador,
    enviarSolicitud: (id) => enviar(id, false),
    reenviarSolicitud: (id, d) => enviar(id, true, d),

    eliminarSolicitud: (id) => {
      const u = usuario(); const s = get().solicitudes.find((x) => x.id === id);
      if (!u || !s) return falla('Solicitud no encontrada');
      if (s.estado !== 'borrador' || s.creadoPor !== u.id) return falla('Solo el creador puede eliminar un borrador');
      set((st) => ({ solicitudes: st.solicitudes.filter((x) => x.id !== id) }));
      aviso(`Borrador ${s.numero} eliminado`, 'info');
      return { ok: true };
    },

    decidirSolicitud: (id, decision, observacion) => {
      const u = usuario(); const s = get().solicitudes.find((x) => x.id === id);
      if (!u || !s) return falla('Solicitud no encontrada');
      const regla = reglaSegregacion(u, s, 'solicitud.decidir');
      if (!regla.permitido) return falla(regla.motivo ?? 'Acción no permitida');
      if (s.estado !== 'pendiente') return falla('La solicitud ya no está pendiente'); // RN-18: no repetir el efecto
      const obs = (observacion ?? '').trim();
      if (decision !== 'aprobar' && obs.length < 10) return falla('La observación es obligatoria (mínimo 10 caracteres)');
      const nuevo = decision === 'aprobar' ? 'aprobada' : decision === 'devolver' ? 'devuelta' : 'rechazada';
      const accion = decision === 'aprobar' ? 'Solicitud aprobada' : decision === 'devolver' ? 'Solicitud devuelta' : 'Solicitud rechazada';
      actualizarSolicitud(id, { estado: nuevo }, entrada(u, accion, 'pendiente', nuevo, decision === 'aprobar' ? observacion : obs));
      const ctx = { numero: s.numero, docId: s.id, creadoPor: s.creadoPor, detalle: obs ? `${u.nombre}: ${obs}` : undefined };
      get().emitirNotificacion(decision === 'aprobar' ? 'solicitud_aprobada' : decision === 'devolver' ? 'solicitud_devuelta' : 'solicitud_rechazada', ctx);
      aviso(`Solicitud ${s.numero} ${nuevo === 'aprobada' ? 'aprobada' : nuevo === 'devuelta' ? 'devuelta con observación' : 'rechazada'}`, nuevo === 'rechazada' ? 'info' : 'ok');
      return { ok: true, id };
    },

    crearCompraDesdeSolicitud: (solicitudId) => {
      const u = usuario(); const s = get().solicitudes.find((x) => x.id === solicitudId);
      if (!u || !s) return falla('Solicitud no encontrada');
      if (!puede(u, 'compra.crear')) return falla('Tu rol no puede gestionar compras');
      if (s.estado !== 'aprobada') return falla('Solo se inicia compra desde una solicitud aprobada (RN-01)');
      if (get().compras.some((c) => c.solicitudId === s.id && c.estado !== 'rechazada')) return falla('La solicitud ya tiene una compra');
      const numero = siguienteNumero('OC', get().compras.map((c) => c.numero));
      const lineas = s.lineas.map((l) => ({ sku: l.sku, cantidad: l.cantidad, unidadId: l.unidadId, precioUnitario: 0 }));
      const t = calcularTotales(lineas, get().parametros.impuestoInformativoPct);
      const compra: Compra = {
        id: idDesdeNumero(numero), numero, creadoPor: u.id, creadoEn: ahora(), actualizadoEn: ahora(), solicitudId: s.id, origen: 'solicitud',
        proveedorId: '', lineas, cotizaciones: generarCotizaciones(lineas, get().proveedores, get().articulos), modalidadPago: 'pago_posterior',
        condiciones: '', fechaEstimadaEntrega: hoyISO(7), lugarEntregaBodegaId: s.lineas[0]?.destinoBodegaId ?? 'b1',
        ...t, estado: 'borrador', estadoRecepcion: 'pendiente', estadoPago: 'sin_pago', ordenGenerada: false,
        historial: [entrada(u, `Compra iniciada desde ${s.numero}`, undefined, 'borrador')],
      };
      set((st) => ({ compras: [compra, ...st.compras] }));
      actualizarSolicitud(s.id, { estado: 'en_compra' }, entrada(u, `Compra ${numero} iniciada`, 'aprobada', 'en_compra'));
      aviso(`Compra ${numero} iniciada desde ${s.numero}`);
      return { ok: true, id: compra.id };
    },

    crearCompraAdministrativa: (d) => {
      const u = usuario();
      if (!u) return falla('Debes iniciar sesión');
      if (!puede(u, 'compra.crear')) return falla('Tu rol no puede gestionar compras');
      if (!d.motivo.trim() || !d.centroCosto.trim()) return falla('La compra administrativa exige motivo y centro de costo (RN-01)');
      const numero = siguienteNumero('OC', get().compras.map((c) => c.numero));
      const compra: Compra = {
        id: idDesdeNumero(numero), numero, creadoPor: u.id, creadoEn: ahora(), actualizadoEn: ahora(), origen: 'administrativa',
        proveedorId: '', lineas: [], cotizaciones: [], modalidadPago: 'pago_posterior', condiciones: '', fechaEstimadaEntrega: hoyISO(7),
        lugarEntregaBodegaId: 'b1', subtotal: 0, impuestoInformativo: 0, total: 0, estado: 'borrador', estadoRecepcion: 'pendiente', estadoPago: 'sin_pago',
        ordenGenerada: false, motivoAdministrativo: d.motivo.trim(), centroCosto: d.centroCosto.trim(),
        historial: [entrada(u, 'Compra administrativa iniciada', undefined, 'borrador', d.motivo.trim())],
      };
      set((st) => ({ compras: [compra, ...st.compras] }));
      aviso(`Compra administrativa ${numero} iniciada`);
      return { ok: true, id: compra.id };
    },

    guardarCompra: (d, id) => {
      const u = usuario(); const c = get().compras.find((x) => x.id === id);
      if (!u || !c || !id) return falla('Compra no encontrada');
      if (!puede(u, 'compra.crear')) return falla('Tu rol no puede gestionar compras');
      if (!['borrador', 'devuelta'].includes(c.estado)) return falla('Solo se edita una compra en borrador o devuelta');
      const lineas = d.lineas ?? c.lineas;
      // Se regeneran las cotizaciones si cambian los articulos/unidades (se conserva la seleccion)
      const firma = (ls: typeof lineas) => ls.map((l) => `${l.sku}|${l.unidadId}`).join(',');
      const cambioItems = firma(lineas) !== firma(c.lineas);
      let cotizaciones = d.cotizaciones ?? c.cotizaciones;
      let proveedorId = d.proveedorId ?? c.proveedorId;
      let lineasFinal = lineas;
      if (cambioItems || (cotizaciones.length === 0 && lineas.length > 0)) {
        cotizaciones = generarCotizaciones(lineas, get().proveedores, get().articulos, c.cotizaciones);
        const sel = cotizaciones.find((q) => q.seleccionada);
        if (sel) lineasFinal = lineas.map((l) => ({ ...l, precioUnitario: sel.precios.find((p) => p.sku === l.sku)?.precioUnitario ?? l.precioUnitario }));
        else proveedorId = '';
      }
      const t = calcularTotales(lineasFinal, get().parametros.impuestoInformativoPct);
      actualizarCompra(c.id, { ...d, lineas: lineasFinal, cotizaciones, proveedorId, ...t, ordenGenerada: false },
        entrada(u, 'Borrador de compra guardado', c.estado, c.estado));
      aviso(`Borrador ${c.numero} guardado`);
      return { ok: true, id: c.id };
    },

    elegirProveedor: (compraId, proveedorId) => {
      const u = usuario(); const c = get().compras.find((x) => x.id === compraId);
      if (!u || !c) return falla('Compra no encontrada');
      if (!puede(u, 'compra.crear')) return falla('Tu rol no puede gestionar compras');
      if (!['borrador', 'devuelta'].includes(c.estado)) return falla('Solo se elige proveedor en borrador o devuelta');
      const q = c.cotizaciones.find((x) => x.proveedorId === proveedorId);
      if (!q) return falla('Proveedor sin cotización');
      // El proveedor seleccionado fija el precio unitario de cada linea
      const lineas = c.lineas.map((l) => ({ ...l, precioUnitario: q.precios.find((p) => p.sku === l.sku)?.precioUnitario ?? 0 }));
      const t = calcularTotales(lineas, get().parametros.impuestoInformativoPct);
      const f = new Date(Date.now() + q.diasEntrega * 86400000);
      actualizarCompra(c.id, {
        proveedorId, lineas, ...t, condiciones: q.condiciones, ordenGenerada: false,
        cotizaciones: c.cotizaciones.map((x) => ({ ...x, seleccionada: x.proveedorId === proveedorId })),
        fechaEstimadaEntrega: hoyISO(q.diasEntrega) || f.toISOString(),
      }, entrada(u, `Proveedor elegido: ${get().proveedores.find((p) => p.id === proveedorId)?.nombre ?? proveedorId}`, c.estado, c.estado));
      return { ok: true, id: c.id };
    },

    generarOrdenCompra: (id) => {
      const u = usuario(); const c = get().compras.find((x) => x.id === id);
      if (!u || !c) return falla('Compra no encontrada');
      if (!puede(u, 'compra.crear')) return falla('Tu rol no puede gestionar compras');
      if (!['borrador', 'devuelta'].includes(c.estado)) return falla('La orden ya fue enviada');
      const sol = get().solicitudes.find((x) => x.id === c.solicitudId);
      const errores = validarCompra(c, sol, get().articulos);
      if (Object.keys(errores).length) return falla(primerError(errores));
      actualizarCompra(id, { ordenGenerada: true }, entrada(u, 'Orden de compra generada', c.estado, c.estado));
      aviso(`Orden ${c.numero} generada: lista para enviar a aprobación`);
      return { ok: true, id };
    },

    enviarCompraAAprobacion: (id) => {
      const u = usuario(); const c = get().compras.find((x) => x.id === id);
      if (!u || !c) return falla('Compra no encontrada');
      if (!puede(u, 'compra.crear')) return falla('Tu rol no puede gestionar compras');
      if (!['borrador', 'devuelta'].includes(c.estado)) return falla('La orden ya fue enviada');
      if (!c.ordenGenerada) return falla('Primero genera la orden de compra');
      const dentro = dentroUmbral(c.total, get().parametros);
      actualizarCompra(id, { estado: 'pendiente_aprobacion' }, entrada(u, 'Enviada a aprobación', c.estado, 'pendiente_aprobacion'));
      get().emitirNotificacion('compra_enviada', {
        numero: c.numero, docId: c.id, creadoPor: c.creadoPor, dentroUmbral: dentro,
        detalle: `${u.nombre} envió la orden ${c.numero} (${c.total.toLocaleString('es-EC', { minimumFractionDigits: 2 })} USD).`,
      });
      aviso(`Orden ${c.numero} enviada a ${dentro ? 'Dirección' : 'Gerencia'} para aprobación`);
      return { ok: true, id };
    },

    decidirCompra: (id, decision, observacion) => {
      const u = usuario(); const c = get().compras.find((x) => x.id === id);
      if (!u || !c) return falla('Compra no encontrada');
      const regla = reglaSegregacion(u, c, 'compra.aprobar', { parametros: get().parametros });
      if (!regla.permitido) return falla(regla.motivo ?? 'Acción no permitida');
      if (c.estado !== 'pendiente_aprobacion') return falla('La orden ya no está pendiente de aprobación'); // RN-18
      const obs = (observacion ?? '').trim();
      if (decision !== 'aprobar' && obs.length < 10) return falla('La observación es obligatoria (mínimo 10 caracteres)');
      const nuevo = decision === 'aprobar' ? 'aprobada' : decision === 'devolver' ? 'devuelta' : 'rechazada';
      const accion = decision === 'aprobar' ? 'Orden aprobada' : decision === 'devolver' ? 'Orden devuelta' : 'Orden rechazada';
      actualizarCompra(id, { estado: nuevo, ...(decision === 'devolver' ? { ordenGenerada: false } : {}) }, entrada(u, accion, 'pendiente_aprobacion', nuevo, decision === 'aprobar' ? observacion : obs));
      const ctx = { numero: c.numero, docId: c.id, creadoPor: c.creadoPor, conAnticipo: c.modalidadPago === 'anticipo', detalle: obs ? `${u.nombre}: ${obs}` : undefined };
      if (decision === 'aprobar') get().emitirNotificacion('compra_aprobada', ctx); // queda lista para recepcion (Fase 3)
      else if (decision === 'devolver') get().emitirNotificacion('compra_devuelta', ctx);
      else {
        get().emitirNotificacion('compra_rechazada', ctx);
        // La solicitud vuelve a "aprobadas sin compra" para poder iniciar otra gestion
        if (c.solicitudId) actualizarSolicitud(c.solicitudId, { estado: 'aprobada' }, entrada(u, `Compra ${c.numero} rechazada`, 'en_compra', 'aprobada'));
      }
      aviso(`Orden ${c.numero} ${nuevo === 'aprobada' ? 'aprobada' : nuevo === 'devuelta' ? 'devuelta a Compras' : 'rechazada'}`, nuevo === 'rechazada' ? 'info' : 'ok');
      return { ok: true, id };
    },
  };
}

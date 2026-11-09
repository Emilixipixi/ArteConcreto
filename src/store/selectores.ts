import { MOSTRAR_CONCILIACION_BANCARIA } from '../lib/funciones';
// Selectores derivados. Son funciones puras sobre el estado; los hooks al final los memorizan.
import { useMemo } from 'react';
import { diasDesde } from '../lib/formato';
import { esParaUsuario } from '../lib/notificaciones';
import type { Notificacion, Prioridad, Usuario } from '../types';
import { anticipoPagado as anticipoPagadoF3, anticiposPorConciliar, comprasPorPreparar } from './selectoresFase3';
import { comprasSinFactura, cuentasPorPagar } from './selectoresTesoreria';
import { useStore, type Estado } from './useStore';

export interface Stock { fisica: number; comprometida: number; enTransito: number; disponible: number }

/** Stock de un SKU (en unidad base), total o de una bodega. disponible = fisica - comprometida (RN-07) */
export function stockPorSku(e: Estado, sku: string, bodegaId?: string): Stock {
  const filas = e.existencias.filter((x) => x.sku === sku && (!bodegaId || bodegaId === 'todas' || x.bodegaId === bodegaId));
  const fisica = filas.reduce((a, x) => a + x.fisica, 0);
  const comprometida = filas.reduce((a, x) => a + x.comprometida, 0);
  const enTransito = filas.reduce((a, x) => a + x.enTransito, 0); // no cuenta como disponible (RN-09)
  return { fisica, comprometida, enTransito, disponible: fisica - comprometida };
}

export const disponible = (e: Estado, sku: string, bodegaId?: string) => stockPorSku(e, sku, bodegaId).disponible;

/** Filas de inventario por bodega; materia prima y producto terminado nunca se mezclan (RN-05) */
export function stockPorBodega(e: Estado, bodegaId: string, tipo: 'materia_prima' | 'producto_terminado') {
  return e.articulos
    .filter((a) => a.tipo === tipo && a.activo)
    .map((a) => ({ articulo: a, ...stockPorSku(e, a.sku, bodegaId) }));
}

export interface AlertaInv {
  id: string; tipo: 'bajo_minimo' | 'agotado' | 'recepcion_vencida'; severidad: 'aviso' | 'error';
  titulo: string; detalle: string; ruta: string; sku?: string;
}

export function alertasInventario(e: Estado): AlertaInv[] {
  const lista: AlertaInv[] = [];
  for (const a of e.articulos.filter((x) => x.activo)) {
    const s = stockPorSku(e, a.sku);
    const ruta = a.tipo === 'materia_prima' ? `/materias-primas?sku=${a.sku}` : `/producto-terminado?sku=${a.sku}`;
    if (s.disponible <= 0) {
      lista.push({ id: `ag-${a.sku}`, tipo: 'agotado', severidad: 'error', titulo: `${a.sku} - ${a.nombre}`, detalle: 'Agotado: sin existencias disponibles', ruta, sku: a.sku });
    } else if (s.disponible < a.stockMinimo * ((e.parametros.umbralStockPct ?? 100) / 100)) {
      lista.push({ id: `bm-${a.sku}`, tipo: 'bajo_minimo', severidad: 'aviso', titulo: `${a.sku} - ${a.nombre}`, detalle: `Disponible ${s.disponible} por debajo del mínimo ${a.stockMinimo}`, ruta, sku: a.sku });
    }
  }
  // Recepciones vencidas: fecha estimada + dias de tolerancia ya superados
  for (const c of e.compras) {
    if (['aprobada', 'recibida_parcial'].includes(c.estado) && c.estadoRecepcion !== 'completa') {
      const vencidos = diasDesde(c.fechaEstimadaEntrega) - e.parametros.diasRecepcionVencida;
      if (new Date(c.fechaEstimadaEntrega).getTime() < Date.now() && vencidos > 0) {
        lista.push({ id: `rv-${c.id}`, tipo: 'recepcion_vencida', severidad: 'error', titulo: `${c.numero} - recepción vencida`, detalle: `Entrega estimada hace ${diasDesde(c.fechaEstimadaEntrega)} días`, ruta: `/recepcion/${c.id}` });
      }
    }
  }
  return lista;
}

export interface Pendiente {
  id: string; numero: string; tipoDoc: string; descripcion: string; prioridad: Prioridad; antiguedadDias: number;
  ruta: string; modulo: string; estado: string;
}

/** Documentos que esperan una accion del usuario activo segun sus roles */
export function pendientesDelUsuario(e: Estado): Pendiente[] {
  const u = e.usuarios.find((x) => x.id === e.usuarioActualId);
  if (!u) return [];
  const tiene = (r: Usuario['roles'][number]) => u.roles.includes(r);
  const lista: Pendiente[] = [];
  const add = (p: Omit<Pendiente, 'id'>) => { if (!lista.some((x) => x.numero === p.numero && x.ruta === p.ruta)) lista.push({ ...p, id: `${p.numero}|${p.ruta}` }); };
  const { umbralCompra } = e.parametros;
  const anticipoPagado = (compraId: string) => anticipoPagadoF3(e, compraId);

  if (tiene('solicitante') || tiene('produccion')) {
    for (const s of e.solicitudes.filter((x) => x.creadoPor === u.id && ['devuelta', 'borrador'].includes(x.estado)))
      add({ numero: s.numero, tipoDoc: 'Solicitud', descripcion: s.estado === 'devuelta' ? 'Devuelta: corrige y reenvía' : 'Borrador sin enviar', prioridad: s.prioridad, antiguedadDias: diasDesde(s.actualizadoEn), ruta: `/solicitudes/${s.id}`, modulo: '/solicitudes', estado: s.estado });
  }
  if (tiene('director')) {
    for (const s of e.solicitudes.filter((x) => x.estado === 'pendiente' && x.creadoPor !== u.id))
      add({ numero: s.numero, tipoDoc: 'Solicitud', descripcion: 'Solicitud por revisar', prioridad: s.prioridad, antiguedadDias: diasDesde(s.actualizadoEn), ruta: `/director/${s.id}`, modulo: '/director', estado: s.estado });
    for (const c of e.compras.filter((x) => x.estado === 'pendiente_aprobacion' && x.total <= umbralCompra && x.creadoPor !== u.id))
      add({ numero: c.numero, tipoDoc: 'Orden de compra', descripcion: 'Orden dentro del umbral por aprobar', prioridad: 'media', antiguedadDias: diasDesde(c.actualizadoEn), ruta: `/aprobacion-compras/${c.id}`, modulo: '/aprobacion-compras', estado: c.estado });
    for (const a of e.ajustes.filter((x) => x.estado === 'pendiente' && x.creadoPor !== u.id))
      add({ numero: a.numero, tipoDoc: 'Ajuste de inventario', descripcion: `Ajuste de ${a.sku}: ${a.motivo}`, prioridad: 'media', antiguedadDias: diasDesde(a.actualizadoEn), ruta: `/materias-primas?doc=${a.id}`, modulo: '/materias-primas', estado: a.estado });
    for (const f of e.fabricaciones.filter((x) => x.estado === 'pendiente_director' && x.creadoPor !== u.id))
      add({ numero: f.numero, tipoDoc: 'Fabricación', descripcion: 'Desvío de consumo por confirmar', prioridad: 'media', antiguedadDias: diasDesde(f.actualizadoEn), ruta: `/fabricacion/${f.id}`, modulo: '/fabricacion', estado: f.estado });
  }
  if (tiene('compras')) {
    for (const s of e.solicitudes.filter((x) => x.estado === 'aprobada'))
      add({ numero: s.numero, tipoDoc: 'Solicitud', descripcion: 'Aprobada sin compra: genera la orden', prioridad: s.prioridad, antiguedadDias: diasDesde(s.actualizadoEn), ruta: `/compras?solicitud=${s.id}`, modulo: '/compras', estado: s.estado });
    for (const c of e.compras.filter((x) => x.creadoPor === u.id && ['devuelta', 'borrador'].includes(x.estado)))
      add({ numero: c.numero, tipoDoc: 'Orden de compra', descripcion: c.estado === 'devuelta' ? 'Orden devuelta: corrige y reenvía' : 'Borrador sin enviar', prioridad: 'media', antiguedadDias: diasDesde(c.actualizadoEn), ruta: `/compras/${c.id}`, modulo: '/compras', estado: c.estado });
  }
  if (tiene('aprobador_compra')) {
    for (const c of e.compras.filter((x) => x.estado === 'pendiente_aprobacion' && x.total > umbralCompra && x.creadoPor !== u.id))
      add({ numero: c.numero, tipoDoc: 'Orden de compra', descripcion: 'Orden sobre el umbral por aprobar', prioridad: 'alta', antiguedadDias: diasDesde(c.actualizadoEn), ruta: `/aprobacion-compras/${c.id}`, modulo: '/aprobacion-compras', estado: c.estado });
  }
  if (tiene('tesoreria')) {
    for (const p of comprasPorPreparar(e))
      add({ numero: p.compra.numero, tipoDoc: 'Orden de compra', descripcion: p.tipo === 'anticipo' ? 'Preparar solicitud de anticipo' : p.motivo, prioridad: p.tipo === 'anticipo' ? 'alta' : 'media', antiguedadDias: diasDesde(p.compra.actualizadoEn), ruta: `/tesoreria/nueva?compra=${p.compra.id}`, modulo: '/tesoreria', estado: p.compra.estado });
    for (const s of e.solicitudesPago.filter((x) => ['preparada', 'pendiente_aprobacion', 'aprobada', 'devuelta'].includes(x.estado))) {
      const porAprobar = s.estado === 'pendiente_aprobacion'; // se cuentan en el menu "Aprobar pagos"
      add({ numero: s.numero, tipoDoc: 'Solicitud de pago', descripcion: s.estado === 'aprobada' ? 'Aprobada: registrar pago y comprobante' : s.estado === 'devuelta' ? 'Devuelta: corregir' : porAprobar ? 'Pago o anticipo por aprobar' : 'Preparada: enviar a aprobación', prioridad: 'alta', antiguedadDias: diasDesde(s.actualizadoEn), ruta: porAprobar ? `/aprobacion-pagos/${s.id}` : `/tesoreria/${s.id}`, modulo: porAprobar ? '/aprobacion-pagos' : '/tesoreria', estado: s.estado });
    }
    for (const s of anticiposPorConciliar(e))
      add({ numero: s.numero, tipoDoc: 'Solicitud de pago', descripcion: 'Anticipo por conciliar tras la recepción', prioridad: 'media', antiguedadDias: diasDesde(s.actualizadoEn), ruta: `/tesoreria/${s.id}`, modulo: '/tesoreria', estado: s.estado });
    // Tesoreria ampliada: facturas por registrar, diferencias de cotejo, pagos vencidos y extracto sin conciliar
    for (const c of comprasSinFactura(e).slice(0, 4))
      add({ numero: c.numero, tipoDoc: 'Factura de proveedor', descripcion: 'Recibida: registrar la factura del proveedor', prioridad: 'media', antiguedadDias: diasDesde(c.actualizadoEn), ruta: `/tesoreria?vista=facturas&factura=${c.id}`, modulo: '/tesoreria', estado: 'pendiente' });
    for (const f of e.facturas.filter((x) => x.estado === 'con_diferencia'))
      add({ numero: f.numero, tipoDoc: 'Factura de proveedor', descripcion: 'Diferencia de cotejo: aceptar o reclamar', prioridad: 'alta', antiguedadDias: diasDesde(f.actualizadoEn), ruta: '/tesoreria?vista=facturas', modulo: '/tesoreria', estado: 'con_diferencia' });
    for (const f of cuentasPorPagar(e).filter((x) => x.dias > 0 && x.tramo !== 'sin_factura').slice(0, 4))
      add({ numero: f.compraNumero, tipoDoc: 'Cuenta por pagar', descripcion: `Vencida hace ${f.dias} días: preparar el pago`, prioridad: 'alta', antiguedadDias: f.dias, ruta: `/tesoreria/nueva?compra=${f.compraId}`, modulo: '/tesoreria', estado: 'vencida' });
    const sinConc = e.movimientosBanco.filter((m) => m.estado === 'sin_conciliar');
    if (MOSTRAR_CONCILIACION_BANCARIA && sinConc.length > 0)
      add({ numero: 'Extracto', tipoDoc: 'Conciliación bancaria', descripcion: `${sinConc.length} movimientos del banco sin conciliar`, prioridad: 'media', antiguedadDias: diasDesde(sinConc[sinConc.length - 1].fecha), ruta: '/tesoreria?vista=banco', modulo: '/tesoreria', estado: 'sin_conciliar' });
  }
  if (tiene('almacen')) {
    // RN-19: una compra con anticipo solo se recibe si el anticipo ya fue pagado
    for (const c of e.compras.filter((x) => ['aprobada', 'recibida_parcial'].includes(x.estado) && x.estadoRecepcion !== 'completa' && (x.modalidadPago !== 'anticipo' || anticipoPagado(x.id))))
      add({ numero: c.numero, tipoDoc: 'Orden de compra', descripcion: c.estadoRecepcion === 'parcial' ? 'Recepción parcial: quedan pendientes' : 'Pendiente de recibir', prioridad: 'media', antiguedadDias: diasDesde(c.actualizadoEn), ruta: `/recepcion/${c.id}`, modulo: '/recepcion', estado: c.estado });
    for (const d of e.despachos.filter((x) => x.estado === 'pendiente_salida'))
      add({ numero: d.numero, tipoDoc: 'Despacho', descripcion: `Confirmar salida para ${d.cliente}`, prioridad: 'media', antiguedadDias: diasDesde(d.actualizadoEn), ruta: `/ventas/${d.id}`, modulo: '/ventas', estado: d.estado });
    for (const t of e.traslados.filter((x) => ['en_transito', 'borrador'].includes(x.estado)))
      add({ numero: t.numero, tipoDoc: 'Traslado', descripcion: t.estado === 'en_transito' ? 'En tránsito: confirmar recepción' : 'Borrador por despachar', prioridad: 'media', antiguedadDias: diasDesde(t.actualizadoEn), ruta: `/traslados/${t.id}`, modulo: '/traslados', estado: t.estado });
  }
  if (tiene('produccion')) {
    for (const f of e.fabricaciones.filter((x) => x.estado === 'borrador'))
      add({ numero: f.numero, tipoDoc: 'Fabricación', descripcion: `Lote ${f.lote} en borrador por confirmar`, prioridad: 'media', antiguedadDias: diasDesde(f.actualizadoEn), ruta: `/fabricacion/${f.id}`, modulo: '/fabricacion', estado: f.estado });
  }
  if (tiene('produccion')) {
    for (const a of alertasInventario(e).filter((x) => x.sku?.match(/^(BC|MC|MT|BO|CA|BI|LV|CC|PI)-/) && ['agotado', 'bajo_minimo'].includes(x.tipo)))
      add({ numero: a.sku as string, tipoDoc: 'Producto terminado', descripcion: a.tipo === 'agotado' ? 'Agotado: programar fabricación' : `Bajo el mínimo: ${a.detalle.replace('Disponible ', 'disponible ')}`, prioridad: a.tipo === 'agotado' ? 'alta' : 'media', antiguedadDias: 0, ruta: '/fabricacion', modulo: '/fabricacion', estado: a.tipo });
  }
  if (tiene('compras')) {
    for (const a of alertasInventario(e).filter((x) => x.sku?.startsWith('MP-') && ['agotado', 'bajo_minimo'].includes(x.tipo)))
      add({ numero: a.sku as string, tipoDoc: 'Materia prima', descripcion: a.tipo === 'agotado' ? 'Agotada: reponer con una compra' : `Bajo el mínimo: ${a.detalle.replace('Disponible ', 'disponible ')}`, prioridad: a.tipo === 'agotado' ? 'alta' : 'media', antiguedadDias: 0, ruta: '/compras', modulo: '/compras', estado: a.tipo });
  }
  if (tiene('almacen')) {
    for (const a of alertasInventario(e).filter((x) => x.tipo === 'recepcion_vencida'))
      add({ numero: a.titulo.split(' ')[0], tipoDoc: 'Orden de compra', descripcion: `Recepción vencida: ${a.detalle.toLowerCase()}`, prioridad: 'alta', antiguedadDias: 0, ruta: a.ruta, modulo: '/recepcion', estado: 'vencida' });
  }
  if (tiene('ventas')) {
    for (const d of e.despachos.filter((x) => x.estado === 'borrador'))
      add({ numero: d.numero, tipoDoc: 'Despacho', descripcion: 'Borrador por enviar a almacén', prioridad: 'media', antiguedadDias: diasDesde(d.actualizadoEn), ruta: `/ventas/${d.id}`, modulo: '/ventas', estado: d.estado });
  }
  if (tiene('ventas') || tiene('admin')) {
    for (const d of e.despachos.filter((x) => x.estado === 'confirmado' && x.estadoAdministrativo === 'sin_descargar'))
      add({ numero: d.numero, tipoDoc: 'Despacho', descripcion: `Salida confirmada: descargar en contabilidad (${d.cliente})`, prioridad: 'baja', antiguedadDias: diasDesde(d.actualizadoEn), ruta: `/ventas/${d.id}`, modulo: '/ventas', estado: d.estado });
    for (const ev of e.eventos.filter((x) => x.estado === 'error'))
      add({ numero: ev.id.toUpperCase(), tipoDoc: 'Evento de integración', descripcion: `Con error: ${ev.detalle}`, prioridad: 'media', antiguedadDias: diasDesde(ev.fecha), ruta: '/conexiones', modulo: '/conexiones', estado: ev.estado });
  }
  const orden: Record<Prioridad, number> = { urgente: 0, alta: 1, media: 2, baja: 3 };
  return lista.sort((a, b) => orden[a.prioridad] - orden[b.prioridad] || b.antiguedadDias - a.antiguedadDias);
}

export interface Kpis {
  solicitudesPendientes: number; comprasEnCurso: number; comprasPorRecibir: number; anticiposAbiertos: number;
  pagosPendientesCerrar: number; stockCritico: number; productosAgotados: number; despachosRecientes: number;
}

export function kpis(e: Estado): Kpis {
  const mpCriticas = e.articulos.filter((a) => a.tipo === 'materia_prima' && a.activo && stockPorSku(e, a.sku).disponible < a.stockMinimo).length;
  const ptAgotados = e.articulos.filter((a) => a.tipo === 'producto_terminado' && a.activo && stockPorSku(e, a.sku).disponible <= 0).length;
  return {
    solicitudesPendientes: e.solicitudes.filter((s) => s.estado === 'pendiente').length,
    comprasEnCurso: e.compras.filter((c) => !['cerrada', 'rechazada', 'recibida'].includes(c.estado)).length,
    comprasPorRecibir: e.compras.filter((c) => ['aprobada', 'recibida_parcial'].includes(c.estado) && c.estadoRecepcion !== 'completa').length,
    anticiposAbiertos: e.solicitudesPago.filter((s) => s.tipo === 'anticipo' && s.estado !== 'conciliada').length,
    pagosPendientesCerrar: e.solicitudesPago.filter((s) => ['preparada', 'pendiente_aprobacion', 'devuelta', 'aprobada'].includes(s.estado)).length,
    stockCritico: mpCriticas,
    productosAgotados: ptAgotados,
    despachosRecientes: e.despachos.filter((d) => d.estado === 'confirmado' && diasDesde(d.actualizadoEn) <= 7).length,
  };
}

export interface Actividad { fecha: string; numero: string; docTipo: string; accion: string; usuarioId: string; ruta: string }

/** Ultimas entradas del historial global de todos los documentos */
export function actividadReciente(e: Estado, n = 8): Actividad[] {
  const fuentes: { docs: { numero: string; id: string; historial: Actividad extends never ? never : { fecha: string; usuarioId: string; accion: string }[] }[]; tipo: string; base: string }[] = [
    { docs: e.solicitudes, tipo: 'Solicitud', base: '/solicitudes' }, { docs: e.compras, tipo: 'Orden de compra', base: '/compras' },
    { docs: e.solicitudesPago, tipo: 'Solicitud de pago', base: '/tesoreria' }, { docs: e.recepciones, tipo: 'Recepción', base: '/recepcion' },
    { docs: e.fabricaciones, tipo: 'Fabricación', base: '/fabricacion' }, { docs: e.traslados, tipo: 'Traslado', base: '/traslados' },
    { docs: e.despachos, tipo: 'Despacho', base: '/ventas' }, { docs: e.ajustes, tipo: 'Ajuste', base: '/materias-primas?doc=' },
  ];
  const todas: Actividad[] = [];
  for (const f of fuentes) for (const d of f.docs) for (const h of d.historial)
    todas.push({ fecha: h.fecha, numero: d.numero, docTipo: f.tipo, accion: h.accion, usuarioId: h.usuarioId, ruta: f.base.endsWith('=') ? `${f.base}${d.id}` : `${f.base}/${d.id}` });
  return todas.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, n);
}

export const comprasPorEstado = (e: Estado) => {
  const etiquetas: Record<string, string> = { borrador: 'Borrador', pendiente_aprobacion: 'En aprobación', devuelta: 'Devuelta', aprobada: 'Aprobada', rechazada: 'Rechazada', recibida_parcial: 'Recibida parcial', recibida: 'Recibida', cerrada: 'Cerrada' };
  return Object.entries(etiquetas).map(([k, nombre]) => ({ estado: nombre, cantidad: e.compras.filter((c) => c.estado === k).length })).filter((x) => x.cantidad > 0);
};

/** Cantidad de movimientos por dia en los ultimos N dias, separando materia prima y producto terminado (RN-05) */
export function movimientosPorDia(e: Estado, dias = 14) {
  const hoy = new Date();
  const filas = Array.from({ length: dias }, (_, i) => {
    const d = new Date(hoy.getTime() - (dias - 1 - i) * 86400000);
    return { clave: d.toDateString(), dia: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, materiaPrima: 0, productoTerminado: 0 };
  });
  for (const m of e.movimientos) {
    if (m.documentoId === 'saldo-inicial') continue;
    const f = filas.find((x) => x.clave === new Date(m.fecha).toDateString());
    if (!f) continue;
    if (m.tipoArticulo === 'materia_prima') f.materiaPrima++; else f.productoTerminado++;
  }
  return filas;
}

// ---- Hooks ----
export const useUsuarioActual = (): Usuario | null =>
  useStore((s) => s.usuarios.find((u) => u.id === s.usuarioActualId) ?? null);

export function useNotificacionesUsuario(): { todas: Notificacion[]; sinLeer: Notificacion[] } {
  const notificaciones = useStore((s) => s.notificaciones);
  const u = useUsuarioActual();
  return useMemo(() => {
    if (!u) return { todas: [], sinLeer: [] };
    const todas = notificaciones.filter((n) => esParaUsuario(n, u.id, u.roles)).sort((a, b) => b.fecha.localeCompare(a.fecha));
    return { todas, sinLeer: todas.filter((n) => !n.leidaPor.includes(u.id)) };
  }, [notificaciones, u]);
}

export function usePendientes(): Pendiente[] {
  const estado = useStore();
  return useMemo(() => pendientesDelUsuario(estado), [estado]);
}
export function useKpis(): Kpis {
  const estado = useStore();
  return useMemo(() => kpis(estado), [estado]);
}
export function useAlertas(): AlertaInv[] {
  const estado = useStore();
  return useMemo(() => alertasInventario(estado), [estado]);
}

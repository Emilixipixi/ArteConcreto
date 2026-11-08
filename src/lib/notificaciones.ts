// Notificaciones: se generan como efecto de una transicion de estado dentro de las acciones del store.
// Para ajustar quien recibe que, editar REGLAS_NOTIFICACION.
import type { Notificacion, RolId } from '../types';

export type EventoNotif =
  | 'solicitud_enviada' | 'solicitud_devuelta' | 'solicitud_rechazada' | 'solicitud_aprobada'
  | 'compra_enviada' | 'compra_devuelta' | 'compra_rechazada' | 'compra_aprobada'
  | 'pago_enviado' | 'pago_devuelto' | 'pago_aprobado' | 'anticipo_registrado'
  | 'recepcion_registrada' | 'recepcion_diferencias' | 'recepcion_vencida'
  | 'ajuste_pendiente' | 'ajuste_decidido' | 'documento_anulado' | 'stock_bajo' | 'producto_agotado'
  | 'fabricacion_pendiente_director' | 'fabricacion_confirmada'
  | 'traslado_en_transito' | 'traslado_con_diferencias' | 'despacho_pendiente_salida'
  | 'evento_tienda_aplicado' | 'evento_tienda_duplicado' | 'evento_tienda_error' | 'producto_agotado_tienda'
  | 'prueba';

export interface ContextoNotif {
  numero: string;            // numero visible del documento (SOL-0004)
  docId: string;             // id interno
  creadoPor?: string;        // creador del documento (destinatario de devoluciones)
  refId?: string;            // documento relacionado (ej. id de la compra)
  detalle?: string;          // texto libre (observacion, SKU, etc.)
  dentroUmbral?: boolean;    // compra: monto dentro del umbral del director
  conAnticipo?: boolean;     // compra: modalidad anticipo
  ruta?: string;             // ruta explicita (reemplaza la de la regla)
}

interface ReglaNotif {
  roles: RolId[] | ((c: ContextoNotif) => RolId[]);
  creador?: boolean;         // ademas (o en lugar de) los roles, avisa al creador
  condicion?: (c: ContextoNotif) => boolean;
  tipo: Notificacion['tipo'];
  titulo: (c: ContextoNotif) => string;
  mensaje: (c: ContextoNotif) => string;
  docTipo: string;
  ruta: (c: ContextoNotif) => string;
}

const r = (x: ReglaNotif) => x;

export const REGLAS_NOTIFICACION: Record<EventoNotif, ReglaNotif[]> = {
  solicitud_enviada: [r({ roles: ['director'], tipo: 'accion', titulo: (c) => `Solicitud ${c.numero} por revisar`, mensaje: (c) => c.detalle ?? 'Hay una solicitud nueva esperando tu decisión.', docTipo: 'Solicitud', ruta: (c) => `/director/${c.docId}` })],
  solicitud_devuelta: [r({ roles: [], creador: true, tipo: 'alerta', titulo: (c) => `Solicitud ${c.numero} devuelta`, mensaje: (c) => c.detalle ?? 'El director devolvió la solicitud con observaciones.', docTipo: 'Solicitud', ruta: (c) => `/solicitudes/${c.docId}` })],
  solicitud_rechazada: [r({ roles: [], creador: true, tipo: 'alerta', titulo: (c) => `Solicitud ${c.numero} rechazada`, mensaje: (c) => c.detalle ?? 'El director rechazó la solicitud.', docTipo: 'Solicitud', ruta: (c) => `/solicitudes/${c.docId}` })],
  solicitud_aprobada: [
    r({ roles: ['compras'], tipo: 'accion', titulo: (c) => `Solicitud ${c.numero} aprobada`, mensaje: () => 'Está disponible en "Aprobadas sin compra" para gestionar.', docTipo: 'Solicitud', ruta: (c) => `/compras?solicitud=${c.docId}` }),
    r({ roles: [], creador: true, tipo: 'exito', titulo: (c) => `Solicitud ${c.numero} aprobada`, mensaje: () => 'Tu solicitud fue aprobada y pasa a Compras.', docTipo: 'Solicitud', ruta: (c) => `/solicitudes/${c.docId}` }),
  ],
  compra_enviada: [r({ roles: (c) => (c.dentroUmbral ? ['director'] : ['aprobador_compra']), tipo: 'accion', titulo: (c) => `Orden ${c.numero} pendiente de aprobación`, mensaje: (c) => c.detalle ?? 'Compras envió una orden para tu autorización.', docTipo: 'Compra', ruta: (c) => `/aprobacion-compras/${c.docId}` })],
  compra_devuelta: [r({ roles: [], creador: true, tipo: 'alerta', titulo: (c) => `Orden ${c.numero} devuelta`, mensaje: (c) => c.detalle ?? 'La orden fue devuelta con observaciones.', docTipo: 'Compra', ruta: (c) => `/compras/${c.docId}` })],
  compra_rechazada: [r({ roles: [], creador: true, tipo: 'alerta', titulo: (c) => `Orden ${c.numero} rechazada`, mensaje: (c) => c.detalle ?? 'La orden fue rechazada.', docTipo: 'Compra', ruta: (c) => `/compras/${c.docId}` })],
  compra_aprobada: [
    r({ roles: ['compras'], tipo: 'info', titulo: (c) => `Orden ${c.numero} aprobada`, mensaje: () => 'La orden ya puede emitirse al proveedor.', docTipo: 'Compra', ruta: (c) => `/compras/${c.docId}` }),
    r({ roles: ['almacen'], tipo: 'accion', titulo: (c) => `${c.numero} pendiente de recibir`, mensaje: () => 'Orden aprobada: queda esperando recepción en bodega.', docTipo: 'Compra', ruta: (c) => `/recepcion/${c.docId}` }),
    r({ roles: ['tesoreria'], condicion: (c) => !!c.conAnticipo, tipo: 'accion', titulo: (c) => `${c.numero} requiere anticipo`, mensaje: () => 'La orden es con anticipo: prepara la solicitud de pago.', docTipo: 'Compra', ruta: (c) => `/tesoreria?compra=${c.docId}` }),
  ],
  pago_enviado: [r({ roles: ['tesoreria'], tipo: 'accion', titulo: (c) => `Pago ${c.numero} por aprobar`, mensaje: (c) => c.detalle ?? 'Tesorería envió una solicitud de pago.', docTipo: 'SolicitudPago', ruta: (c) => `/tesoreria/${c.docId}` })],
  pago_devuelto: [r({ roles: ['tesoreria'], tipo: 'alerta', titulo: (c) => `Pago ${c.numero} devuelto`, mensaje: (c) => c.detalle ?? 'La solicitud de pago fue devuelta u observada.', docTipo: 'SolicitudPago', ruta: (c) => `/tesoreria/${c.docId}` })],
  pago_aprobado: [r({ roles: ['tesoreria'], tipo: 'accion', titulo: (c) => `Pago ${c.numero} aprobado`, mensaje: () => 'Falta registrar el pago y adjuntar el comprobante.', docTipo: 'SolicitudPago', ruta: (c) => `/tesoreria/${c.docId}` })],
  anticipo_registrado: [
    r({ roles: ['compras'], tipo: 'info', titulo: (c) => `Anticipo registrado (${c.numero})`, mensaje: () => 'Se entregó el anticipo al proveedor.', docTipo: 'Compra', ruta: (c) => `/compras/${c.refId ?? c.docId}` }),
    r({ roles: ['almacen'], tipo: 'info', titulo: (c) => `Anticipo registrado (${c.numero})`, mensaje: () => 'La orden ya puede recibirse cuando llegue la mercancía.', docTipo: 'Compra', ruta: (c) => `/recepcion/${c.refId ?? c.docId}` }),
  ],
  recepcion_registrada: [
    r({ roles: ['compras'], tipo: 'info', titulo: (c) => `Recepción ${c.numero} registrada`, mensaje: (c) => c.detalle ?? 'Almacén registró una recepción.', docTipo: 'Recepción', ruta: (c) => `/recepcion/${c.refId ?? c.docId}` }),
    r({ roles: ['tesoreria'], condicion: (c) => !c.conAnticipo, tipo: 'accion', titulo: (c) => `Pago pendiente por ${c.numero}`, mensaje: () => 'Hay mercancía recibida: prepara el pago de lo recibido.', docTipo: 'Compra', ruta: (c) => `/tesoreria?compra=${c.refId ?? c.docId}` }),
  ],
  recepcion_diferencias: [r({ roles: ['compras'], tipo: 'alerta', titulo: (c) => `Recepción ${c.numero} con diferencias`, mensaje: (c) => c.detalle ?? 'Se recibió menos de lo ordenado.', docTipo: 'Recepción', ruta: (c) => `/recepcion/${c.refId ?? c.docId}` })],
  recepcion_vencida: [r({ roles: ['almacen', 'compras'], tipo: 'alerta', titulo: (c) => `Recepción vencida: ${c.numero}`, mensaje: () => 'La fecha estimada de entrega ya superó el plazo de tolerancia.', docTipo: 'Compra', ruta: (c) => `/recepcion/${c.docId}` })],
  ajuste_pendiente: [r({ roles: ['director'], tipo: 'accion', titulo: (c) => `Ajuste ${c.numero} por aprobar`, mensaje: (c) => c.detalle ?? 'Almacén solicita un ajuste de inventario.', docTipo: 'Ajuste', ruta: (c) => `/materias-primas?doc=${c.docId}` })],
  ajuste_decidido: [r({ roles: [], creador: true, tipo: 'info', titulo: (c) => `Ajuste ${c.numero} resuelto`, mensaje: (c) => c.detalle ?? 'El director resolvió tu solicitud de ajuste.', docTipo: 'Ajuste', ruta: (c) => `/materias-primas?doc=${c.docId}` })],
  documento_anulado: [r({ roles: [], creador: true, tipo: 'alerta', titulo: (c) => `${c.numero} anulado`, mensaje: (c) => c.detalle ?? 'El director anuló el documento y se revirtieron sus movimientos.', docTipo: 'Anulación', ruta: (c) => c.ruta ?? '/' })],
  stock_bajo: [r({ roles: ['compras', 'almacen', 'produccion'], tipo: 'alerta', titulo: (c) => `Stock bajo mínimo: ${c.numero}`, mensaje: (c) => c.detalle ?? 'El artículo está por debajo del mínimo.', docTipo: 'Articulo', ruta: (c) => c.ruta ?? `/materias-primas?sku=${c.docId}` })],
  producto_agotado: [r({ roles: ['compras', 'almacen', 'produccion'], tipo: 'alerta', titulo: (c) => `Producto agotado: ${c.numero}`, mensaje: (c) => c.detalle ?? 'No quedan existencias disponibles.', docTipo: 'Articulo', ruta: (c) => c.ruta ?? `/producto-terminado?sku=${c.docId}` })],
  fabricacion_pendiente_director: [r({ roles: ['director'], tipo: 'accion', titulo: (c) => `Fabricación ${c.numero} requiere tu confirmación`, mensaje: (c) => c.detalle ?? 'El consumo real se desvía del estándar.', docTipo: 'Fabricación', ruta: (c) => `/fabricacion/${c.docId}` })],
  fabricacion_confirmada: [r({ roles: ['almacen', 'ventas'], tipo: 'info', titulo: (c) => `Fabricación ${c.numero} confirmada`, mensaje: (c) => c.detalle ?? 'Ingresó producto terminado al inventario.', docTipo: 'Fabricación', ruta: (c) => c.ruta ?? `/producto-terminado` })],
  traslado_en_transito: [r({ roles: ['almacen'], tipo: 'accion', titulo: (c) => `Traslado ${c.numero} en tránsito`, mensaje: () => 'Confirma la recepción cuando llegue a la bodega destino.', docTipo: 'Traslado', ruta: (c) => `/traslados/${c.docId}` })],
  traslado_con_diferencias: [r({ roles: ['almacen', 'director'], tipo: 'alerta', titulo: (c) => `Traslado ${c.numero} recibido con diferencias`, mensaje: (c) => c.detalle ?? 'Las cantidades recibidas no coinciden con las enviadas.', docTipo: 'Traslado', ruta: (c) => `/traslados/${c.docId}` })],
  despacho_pendiente_salida: [r({ roles: ['almacen'], tipo: 'accion', titulo: (c) => `Despacho ${c.numero} pendiente de salida`, mensaje: () => 'Confirma la salida física para descontar el stock.', docTipo: 'Despacho', ruta: (c) => `/ventas/${c.docId}` })],
  evento_tienda_aplicado: [r({ roles: ['ventas'], tipo: 'info', titulo: (c) => `Evento ${c.numero} aplicado`, mensaje: (c) => c.detalle ?? 'El pedido de la tienda en línea descontó stock.', docTipo: 'Evento', ruta: () => '/conexiones' })],
  evento_tienda_duplicado: [r({ roles: ['ventas'], tipo: 'info', titulo: (c) => `Evento ${c.numero} duplicado`, mensaje: () => 'Ya estaba aplicado: no se descontó dos veces.', docTipo: 'Evento', ruta: () => '/conexiones' })],
  evento_tienda_error: [r({ roles: ['ventas', 'admin'], tipo: 'alerta', titulo: (c) => `Evento ${c.numero} con error`, mensaje: (c) => c.detalle ?? 'El evento no pudo aplicarse.', docTipo: 'Evento', ruta: () => '/conexiones' })],
  producto_agotado_tienda: [r({ roles: ['ventas', 'produccion'], tipo: 'alerta', titulo: (c) => `Agotado reflejado en la tienda: ${c.numero}`, mensaje: (c) => c.detalle ?? 'La tienda en línea marcó el producto como agotado.', docTipo: 'Articulo', ruta: () => '/conexiones' })],
  prueba: [r({ roles: [], creador: true, tipo: 'info', titulo: () => 'Notificación de prueba', mensaje: (c) => c.detalle ?? 'Esta notificación se generó desde la guía de demostración.', docTipo: 'Prueba', ruta: () => '/guia-demo' })],
};

let secuencia = 0;

/** Construye las notificaciones de un evento segun REGLAS_NOTIFICACION (funcion pura; el store las agrega). */
export function notificar(evento: EventoNotif, ctx: ContextoNotif, ahora: Date = new Date()): Notificacion[] {
  const salida: Notificacion[] = [];
  for (const regla of REGLAS_NOTIFICACION[evento]) {
    if (regla.condicion && !regla.condicion(ctx)) continue;
    const roles = typeof regla.roles === 'function' ? regla.roles(ctx) : regla.roles;
    const usuarios = regla.creador && ctx.creadoPor ? [ctx.creadoPor] : undefined;
    if (roles.length === 0 && !usuarios) continue;
    salida.push({
      id: `n-${ahora.getTime()}-${secuencia++}`,
      fecha: ahora.toISOString(),
      destinatarioRoles: roles,
      destinatarioUsuarios: usuarios,
      tipo: regla.tipo,
      titulo: regla.titulo(ctx),
      mensaje: regla.mensaje(ctx),
      docTipo: regla.docTipo,
      docId: ctx.docId,
      ruta: ctx.ruta && regla.docTipo !== 'Articulo' ? ctx.ruta : regla.ruta(ctx),
      leidaPor: [],
    });
  }
  return salida;
}

/** Una notificacion llega a un usuario si esta nombrado o tiene alguno de los roles destinatarios */
export function esParaUsuario(n: Notificacion, usuarioId: string, roles: RolId[]): boolean {
  return (n.destinatarioUsuarios ?? []).includes(usuarioId) || n.destinatarioRoles.some((r) => roles.includes(r));
}

// Datos adicionales de la demostracion: mas volumen de operacion para que cada rol tenga trabajo pendiente.
// No modifica ningun documento de los escenarios D-01 a D-07 (numeros SOL-0001..0006, OC-0001..0004, etc.).
import type {
  Ajuste, Compra, CorreoSimulado, Despacho, EventoIntegracion, Fabricacion, LineaCompra, Notificacion, Pago, Prioridad,
  Proveedor, Recepcion, Solicitud, SolicitudPago, Traslado,
} from '../types';
import { enDias, hace } from '../lib/formato';
import { h } from './ayudas';

const redo = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------- Proveedores
export const PROVEEDORES_EXTRA: Proveedor[] = [
  { id: 'p-pigmentos', nombre: 'Pigmentos y Color del Ecuador', identificacionFiscal: '1790000005001', contacto: 'Lucía Narváez', correo: 'ventas@pigmentoscolor.test', ciudad: 'Quito', condicionesPago: 'Pago a 30 dias', diasEntrega: 6, activo: true },
  { id: 'p-moldes', nombre: 'Moldes y Encofrados Andinos', identificacionFiscal: '0190000006001', contacto: 'Raúl Cevallos', correo: 'pedidos@moldesandinos.test', ciudad: 'Cuenca', condicionesPago: 'Anticipo 50 % y saldo contra entrega', diasEntrega: 12, activo: true },
  { id: 'p-ferreteria', nombre: 'Ferretería Industrial La Unión', identificacionFiscal: '1790000007001', contacto: 'Daniel Proaño', correo: 'ventas@ferreteriaunion.test', ciudad: 'Quito', condicionesPago: 'Contra entrega', diasEntrega: 2, activo: false },
];

// ---------------------------------------------------------------- Solicitudes
type SolIn = { n: number; por: string; dias: number; horas?: number; estado: Solicitud['estado']; area: string; prioridad: Prioridad; just: string; lineas: Solicitud['lineas']; adj?: string[]; fecha?: string; extra?: ReturnType<typeof h>[] };
const sol = (s: SolIn): Solicitud => {
  const numero = `SOL-${String(s.n).padStart(4, '0')}`;
  const ini = hace(s.dias, (s.horas ?? 0) + 2); const fin = hace(s.dias, s.horas ?? 0);
  const hist = [h(ini, s.por, 'Solicitud creada', undefined, 'borrador')];
  if (s.estado !== 'borrador') hist.push(h(ini, s.por, 'Solicitud enviada al director', 'borrador', 'pendiente'));
  if (s.estado === 'devuelta') hist.push(h(fin, 'u-marcela', 'Solicitud devuelta', 'pendiente', 'devuelta', 'Indique la cantidad exacta y el pedido que origina esta necesidad.'));
  if (s.estado === 'rechazada') hist.push(h(fin, 'u-marcela', 'Solicitud rechazada', 'pendiente', 'rechazada', 'Hay stock suficiente en la Bodega 2; solicite un traslado.'));
  if (['aprobada', 'en_compra', 'cerrada'].includes(s.estado)) hist.push(h(hace(s.dias, (s.horas ?? 0) + 1), 'u-marcela', 'Solicitud aprobada', 'pendiente', 'aprobada'));
  if (s.extra) hist.push(...s.extra);
  return { id: numero.toLowerCase(), numero, creadoPor: s.por, creadoEn: ini, actualizadoEn: fin, estado: s.estado, area: s.area, prioridad: s.prioridad, justificacion: s.just, lineas: s.lineas, adjuntos: s.adj ?? [], historial: hist };
};

export const crearSolicitudesExtra = (): Solicitud[] => [
  sol({ n: 7, por: 'u-carlos', dias: 0, horas: 3, estado: 'pendiente', area: 'Planta', prioridad: 'media', just: 'Arena fina para completar los lotes de macetas de la semana.', lineas: [{ sku: 'MP-02', cantidad: 10, unidadId: 'm3', destinoBodegaId: 'b1' }] }),
  sol({ n: 8, por: 'u-daniela', dias: 0, horas: 2, estado: 'pendiente', area: 'Producción', prioridad: 'alta', just: 'Cemento para el pedido de 12 bancas del proyecto Parque lineal.', lineas: [{ sku: 'MP-01', cantidad: 40, unidadId: 'saco50', destinoBodegaId: 'b1' }, { sku: 'MP-05', cantidad: 4, unidadId: 'cub19', destinoBodegaId: 'b1' }], adj: ['pedido-parque-lineal.pdf'] }),
  sol({ n: 9, por: 'u-andres', dias: 1, estado: 'pendiente', area: 'Administración', prioridad: 'urgente', just: 'Varilla para completar el pedido del Municipio; el stock cubre solo dos días de producción.', lineas: [{ sku: 'MP-04', cantidad: 20, unidadId: 'var6', destinoBodegaId: 'b1' }] }),
  sol({ n: 10, por: 'u-daniela', dias: 0, horas: 4, estado: 'borrador', area: 'Producción', prioridad: 'media', just: '', lineas: [{ sku: 'MP-06', cantidad: 3, unidadId: 'saco25', destinoBodegaId: 'b1' }] }),
  sol({ n: 11, por: 'u-carlos', dias: 3, estado: 'devuelta', area: 'Planta', prioridad: 'alta', just: 'Desmoldante.', lineas: [{ sku: 'MP-07', cantidad: 3, unidadId: 'tamb200', destinoBodegaId: 'b1' }] }),
  sol({ n: 12, por: 'u-carlos', dias: 2, estado: 'aprobada', area: 'Planta', prioridad: 'media', just: 'Reposición de desmoldante para los próximos lotes.', lineas: [{ sku: 'MP-07', cantidad: 2, unidadId: 'tamb200', destinoBodegaId: 'b1' }] }),
  sol({ n: 13, por: 'u-daniela', dias: 1, horas: 5, estado: 'aprobada', area: 'Producción', prioridad: 'alta', just: 'Aditivo bajo el mínimo: se necesita para los lotes de bancas y mesas.', lineas: [{ sku: 'MP-05', cantidad: 6, unidadId: 'cub19', destinoBodegaId: 'b1' }] }),
  sol({ n: 14, por: 'u-carlos', dias: 6, estado: 'en_compra', area: 'Planta', prioridad: 'media', just: 'Pigmento y aditivo para la producción de la quincena.', lineas: [{ sku: 'MP-06', cantidad: 2, unidadId: 'saco25', destinoBodegaId: 'b1' }, { sku: 'MP-05', cantidad: 2, unidadId: 'cub19', destinoBodegaId: 'b1' }], extra: [h(hace(5), 'u-andres', 'Compra OC-0007 generada', 'aprobada', 'en_compra')] }),
  sol({ n: 15, por: 'u-carlos', dias: 8, estado: 'rechazada', area: 'Planta', prioridad: 'baja', just: 'Cemento para stock de seguridad.', lineas: [{ sku: 'MP-01', cantidad: 60, unidadId: 'saco50', destinoBodegaId: 'b1' }] }),
  sol({ n: 16, por: 'u-daniela', dias: 5, estado: 'en_compra', area: 'Producción', prioridad: 'alta', just: 'Cemento y varilla para el pedido de bolardos y bancas.', lineas: [{ sku: 'MP-01', cantidad: 30, unidadId: 'saco50', destinoBodegaId: 'b1' }, { sku: 'MP-04', cantidad: 40, unidadId: 'var6', destinoBodegaId: 'b1' }], extra: [h(hace(4), 'u-andres', 'Compra OC-0008 generada', 'aprobada', 'en_compra')] }),
  sol({ n: 17, por: 'u-carlos', dias: 12, estado: 'en_compra', area: 'Planta', prioridad: 'media', just: 'Cemento para los lotes de macetas.', lineas: [{ sku: 'MP-01', cantidad: 40, unidadId: 'saco50', destinoBodegaId: 'b1' }], extra: [h(hace(11), 'u-andres', 'Compra OC-0010 generada', 'aprobada', 'en_compra')] }),
  sol({ n: 18, por: 'u-carlos', dias: 3, estado: 'en_compra', area: 'Planta', prioridad: 'media', just: 'Varilla para bolardos.', lineas: [{ sku: 'MP-04', cantidad: 25, unidadId: 'var6', destinoBodegaId: 'b1' }], extra: [h(hace(2), 'u-andres', 'Compra OC-0009 generada', 'aprobada', 'en_compra')] }),
  sol({ n: 19, por: 'u-daniela', dias: 20, estado: 'cerrada', area: 'Producción', prioridad: 'media', just: 'Cemento para el lote de lavamanos.', lineas: [{ sku: 'MP-01', cantidad: 20, unidadId: 'saco50', destinoBodegaId: 'b1' }], extra: [h(hace(19), 'u-andres', 'Compra OC-0016 generada', 'aprobada', 'en_compra'), h(hace(14), 'u-paola', 'Solicitud cerrada', 'en_compra', 'cerrada')] }),
];

// ---------------------------------------------------------------- Compras
type OcIn = {
  n: number; dias: number; estado: Compra['estado']; prov: string; solicitudId?: string; origen?: Compra['origen']; lineas: LineaCompra[];
  pago: Compra['modalidadPago']; anticipoPct?: number; cond: string; entrega: string; recepcion?: Compra['estadoRecepcion']; estadoPago?: Compra['estadoPago']; hist: ReturnType<typeof h>[];
  motivo?: string;
};
const oc = (o: OcIn): Compra => {
  const numero = `OC-${String(o.n).padStart(4, '0')}`;
  const subtotal = redo(o.lineas.reduce((a, l) => a + l.cantidad * l.precioUnitario, 0));
  const imp = redo(subtotal * 0.15);
  return {
    id: numero.toLowerCase(), numero, creadoPor: 'u-andres', creadoEn: hace(o.dias, 3), actualizadoEn: o.hist[o.hist.length - 1]?.fecha ?? hace(o.dias),
    solicitudId: o.solicitudId, origen: o.origen ?? 'solicitud', proveedorId: o.prov, lineas: o.lineas,
    cotizaciones: [{ proveedorId: o.prov, precios: o.lineas.map((l) => ({ sku: l.sku, precioUnitario: l.precioUnitario })), condiciones: o.cond, diasEntrega: 5, seleccionada: true }],
    modalidadPago: o.pago, porcentajeAnticipo: o.anticipoPct, condiciones: o.cond, fechaEstimadaEntrega: o.entrega,
    subtotal, impuestoInformativo: imp, total: redo(subtotal + imp),
    estado: o.estado, estadoRecepcion: o.recepcion ?? 'pendiente', estadoPago: o.estadoPago ?? 'sin_pago', historial: o.hist,
    ...(o.origen === 'administrativa' ? { motivoAdministrativo: o.motivo ?? 'Compra administrativa', centroCosto: 'Planta' } : {}),
  };
};
const crea = (_n: number, dias: number, desde?: string) => [h(hace(dias, 3), 'u-andres', desde ? `Orden creada desde ${desde}` : 'Orden administrativa creada', undefined, 'borrador')];
const envia = (dias: number) => h(hace(dias, 2), 'u-andres', 'Enviada a aprobación', 'borrador', 'pendiente_aprobacion');

export const crearComprasExtra = (): Compra[] => [
  oc({ n: 5, dias: 0, estado: 'borrador', prov: 'p-quimicos', origen: 'administrativa', motivo: 'Reposición de emergencia de desmoldante', lineas: [{ sku: 'MP-07', cantidad: 1, unidadId: 'tamb200', precioUnitario: 620 }], pago: 'pago_posterior', cond: 'Pago a 30 días', entrega: enDias(8), hist: crea(5, 0) }),
  oc({ n: 6, dias: 2, estado: 'devuelta', prov: 'p-pigmentos', origen: 'administrativa', motivo: 'Pigmento para línea de color', lineas: [{ sku: 'MP-06', cantidad: 4, unidadId: 'saco25', precioUnitario: 60 }], pago: 'pago_posterior', cond: 'Pago a 30 días', entrega: enDias(9), hist: [...crea(6, 2), envia(2), h(hace(1, 2), 'u-marcela', 'Orden devuelta', 'pendiente_aprobacion', 'devuelta', 'Adjunte una segunda cotización antes de aprobar.')] }),
  oc({ n: 7, dias: 5, estado: 'pendiente_aprobacion', prov: 'p-quimicos', solicitudId: 'sol-0014', lineas: [{ sku: 'MP-06', cantidad: 2, unidadId: 'saco25', precioUnitario: 60 }, { sku: 'MP-05', cantidad: 2, unidadId: 'cub19', precioUnitario: 85 }], pago: 'pago_posterior', cond: 'Pago a 30 días', entrega: enDias(7), hist: [...crea(7, 5, 'SOL-0014'), envia(1)] }),
  oc({ n: 8, dias: 4, estado: 'pendiente_aprobacion', prov: 'p-cementos', solicitudId: 'sol-0016', lineas: [{ sku: 'MP-01', cantidad: 30, unidadId: 'saco50', precioUnitario: 8.2 }, { sku: 'MP-04', cantidad: 40, unidadId: 'var6', precioUnitario: 11 }], pago: 'pago_posterior', cond: 'Pago a 15 días', entrega: enDias(6), hist: [...crea(8, 4, 'SOL-0016'), envia(0)] }),
  oc({ n: 9, dias: 2, estado: 'aprobada', prov: 'p-aceros', solicitudId: 'sol-0018', lineas: [{ sku: 'MP-04', cantidad: 25, unidadId: 'var6', precioUnitario: 11 }], pago: 'pago_posterior', cond: 'Pago contra entrega', entrega: enDias(5), hist: [...crea(9, 2, 'SOL-0018'), envia(2), h(hace(1), 'u-marcela', 'Orden aprobada (monto dentro del umbral del director)', 'pendiente_aprobacion', 'aprobada')] }),
  oc({ n: 10, dias: 11, estado: 'recibida_parcial', prov: 'p-cementos', solicitudId: 'sol-0017', lineas: [{ sku: 'MP-01', cantidad: 40, unidadId: 'saco50', precioUnitario: 8.2 }], pago: 'pago_posterior', cond: 'Pago a 15 días', entrega: enDias(3), recepcion: 'parcial', hist: [...crea(10, 11, 'SOL-0017'), envia(11), h(hace(10), 'u-marcela', 'Orden aprobada (monto dentro del umbral del director)', 'pendiente_aprobacion', 'aprobada'), h(hace(3), 'u-sergio', 'Recepción parcial REC-0002', 'aprobada', 'recibida_parcial')] }),
  oc({ n: 11, dias: 3, estado: 'aprobada', prov: 'p-aceros', origen: 'administrativa', motivo: 'Varilla para el pedido de cerramientos', lineas: [{ sku: 'MP-04', cantidad: 50, unidadId: 'var6', precioUnitario: 11 }], pago: 'anticipo', anticipoPct: 30, cond: 'Anticipo 30 % y saldo contra entrega', entrega: enDias(9), hist: [...crea(11, 3), envia(3), h(hace(2), 'u-julian', 'Orden aprobada', 'pendiente_aprobacion', 'aprobada')] }),
  oc({ n: 12, dias: 14, estado: 'aprobada', prov: 'p-quimicos', origen: 'administrativa', motivo: 'Desmoldante para lotes del mes', lineas: [{ sku: 'MP-07', cantidad: 2, unidadId: 'tamb200', precioUnitario: 620 }], pago: 'pago_posterior', cond: 'Pago a 30 días', entrega: hace(6), hist: [...crea(12, 14), envia(14), h(hace(13), 'u-julian', 'Orden aprobada', 'pendiente_aprobacion', 'aprobada')] }),
  oc({ n: 13, dias: 2, estado: 'aprobada', prov: 'p-quimicos', origen: 'administrativa', motivo: 'Aditivo para el pedido del Municipio', lineas: [{ sku: 'MP-05', cantidad: 10, unidadId: 'cub19', precioUnitario: 85 }], pago: 'anticipo', anticipoPct: 50, cond: 'Anticipo 50 % y saldo a 30 días', entrega: enDias(10), hist: [...crea(13, 2), envia(2), h(hace(1), 'u-julian', 'Orden aprobada', 'pendiente_aprobacion', 'aprobada')] }),
  oc({ n: 14, dias: 6, estado: 'recibida', prov: 'p-aceros', origen: 'administrativa', motivo: 'Varilla para stock de planta', lineas: [{ sku: 'MP-04', cantidad: 20, unidadId: 'var6', precioUnitario: 11 }], pago: 'pago_posterior', cond: 'Pago contra entrega', entrega: hace(2), recepcion: 'completa', hist: [...crea(14, 6), envia(6), h(hace(5), 'u-marcela', 'Orden aprobada', 'pendiente_aprobacion', 'aprobada'), h(hace(2), 'u-sergio', 'Recepción completa REC-0003', 'aprobada', 'recibida')] }),
  oc({ n: 18, dias: 1, estado: 'aprobada', prov: 'p-agregados', origen: 'administrativa', motivo: 'Grava para el pedido de pisos modulares', lineas: [{ sku: 'MP-03', cantidad: 12, unidadId: 'm3', precioUnitario: 24 }], pago: 'anticipo', anticipoPct: 50, cond: 'Anticipo 50 % y saldo contra entrega', entrega: enDias(7), hist: [...crea(18, 1), envia(1), h(hace(0, 8), 'u-marcela', 'Orden aprobada (monto dentro del umbral del director)', 'pendiente_aprobacion', 'aprobada')] }),
  oc({ n: 16, dias: 19, estado: 'cerrada', prov: 'p-cementos', solicitudId: 'sol-0019', lineas: [{ sku: 'MP-01', cantidad: 20, unidadId: 'saco50', precioUnitario: 8.2 }], pago: 'pago_posterior', cond: 'Pago a 15 días', entrega: hace(14), recepcion: 'completa', estadoPago: 'pagado', hist: [...crea(16, 19, 'SOL-0019'), envia(19), h(hace(18), 'u-marcela', 'Orden aprobada', 'pendiente_aprobacion', 'aprobada'), h(hace(14), 'u-sergio', 'Recepción completa REC-0004', 'aprobada', 'recibida'), h(hace(12), 'u-paola', 'Pago registrado y conciliado', 'recibida', 'cerrada')] }),
  oc({ n: 17, dias: 22, estado: 'rechazada', prov: 'p-agregados', origen: 'administrativa', motivo: 'Compra de grava fuera de planificación', lineas: [{ sku: 'MP-03', cantidad: 30, unidadId: 'm3', precioUnitario: 24 }], pago: 'pago_posterior', cond: 'Contra entrega', entrega: hace(15), hist: [...crea(17, 22), envia(22), h(hace(21), 'u-julian', 'Orden rechazada', 'pendiente_aprobacion', 'rechazada', 'No hay solicitud aprobada que respalde esta compra.')] }),
];

// ---------------------------------------------------------------- Pagos y recepciones
export const crearSolicitudesPagoExtra = (): SolicitudPago[] => [
  { id: 'pag-0003', numero: 'PAG-0003', creadoPor: 'u-paola', creadoEn: hace(0, 5), actualizadoEn: hace(0, 5), compraId: 'oc-0010', tipo: 'pago_final', importe: 94.3, observacion: 'Pago de lo recibido (10 sacos)', estado: 'preparada', historial: [h(hace(0, 5), 'u-paola', 'Solicitud de pago preparada', undefined, 'preparada')] },
  { id: 'pag-0004', numero: 'PAG-0004', creadoPor: 'u-paola', creadoEn: hace(0, 8), actualizadoEn: hace(0, 6), compraId: 'oc-0013', tipo: 'anticipo', importe: 488.75, observacion: 'Anticipo 50 % según condiciones del proveedor', estado: 'pendiente_aprobacion', historial: [h(hace(0, 8), 'u-paola', 'Solicitud de anticipo preparada', undefined, 'preparada'), h(hace(0, 6), 'u-paola', 'Enviada a aprobación', 'preparada', 'pendiente_aprobacion')] },
  { id: 'pag-0007', numero: 'PAG-0007', creadoPor: 'u-paola', creadoEn: hace(0, 7), actualizadoEn: hace(0, 5), compraId: 'oc-0011', tipo: 'anticipo', importe: 189.75, observacion: 'Anticipo 30 % según condiciones del proveedor', estado: 'pendiente_aprobacion', historial: [h(hace(0, 7), 'u-paola', 'Solicitud de anticipo preparada', undefined, 'preparada'), h(hace(0, 5), 'u-paola', 'Enviada a aprobación', 'preparada', 'pendiente_aprobacion')] },
  { id: 'pag-0005', numero: 'PAG-0005', creadoPor: 'u-paola', creadoEn: hace(1, 4), actualizadoEn: hace(0, 3), compraId: 'oc-0014', tipo: 'pago_final', importe: 253, estado: 'aprobada', historial: [h(hace(1, 4), 'u-paola', 'Solicitud de pago preparada', undefined, 'preparada'), h(hace(1, 3), 'u-paola', 'Enviada a aprobación', 'preparada', 'pendiente_aprobacion'), h(hace(0, 3), 'u-paola', 'Pago aprobado', 'pendiente_aprobacion', 'aprobada')] },
  { id: 'pag-0006', numero: 'PAG-0006', creadoPor: 'u-paola', creadoEn: hace(13), actualizadoEn: hace(12), compraId: 'oc-0016', tipo: 'pago_final', importe: 188.6, estado: 'conciliada', historial: [h(hace(13), 'u-paola', 'Solicitud de pago preparada', undefined, 'preparada'), h(hace(13), 'u-paola', 'Enviada a aprobación', 'preparada', 'pendiente_aprobacion'), h(hace(13), 'u-paola', 'Pago aprobado', 'pendiente_aprobacion', 'aprobada'), h(hace(12), 'u-paola', 'Pago registrado con comprobante', 'aprobada', 'pagada'), h(hace(12), 'u-paola', 'Pago conciliado', 'pagada', 'conciliada')] },
];
export const crearPagosExtra = (): Pago[] => [
  { id: 'pg-0002', solicitudPagoId: 'pag-0006', fecha: hace(12), importe: 188.6, medio: 'transferencia', comprobante: 'comprobante-transferencia-0002.pdf', registradoPor: 'u-paola' },
];
const recep = (n: number, dias: number, compraId: string, sku: string, ordenado: number, ahora: number, unidadId: string, cierre: boolean): Recepcion => ({
  id: `rec-${String(n).padStart(4, '0')}`, numero: `REC-${String(n).padStart(4, '0')}`, creadoPor: 'u-sergio', creadoEn: hace(dias), actualizadoEn: hace(dias), compraId, bodegaId: 'b1', estado: 'confirmada', esCierre: cierre,
  lineas: [{ sku, ordenado, recibidoAntes: 0, recibidoAhora: ahora, faltante: cierre ? 0 : ordenado - ahora, unidadId }],
  historial: [h(hace(dias), 'u-sergio', 'Recepción confirmada', undefined, 'confirmada')],
});
export const crearRecepcionesExtra = (): Recepcion[] => [
  recep(2, 3, 'oc-0010', 'MP-01', 40, 10, 'saco50', false),
  recep(3, 2, 'oc-0014', 'MP-04', 20, 20, 'var6', true),
  recep(4, 14, 'oc-0016', 'MP-01', 20, 20, 'saco50', true),
];

// ---------------------------------------------------------------- Fabricaciones, traslados, ajustes
const consumos = (cant: number, r: [number, number, number, number, number, number, number]) =>
  ['MP-01', 'MP-02', 'MP-03', 'MP-04', 'MP-05', 'MP-06', 'MP-07'].map((sku, i) => ({ sku, estandar: redo(r[i] * cant * 1000) / 1000, real: redo(r[i] * cant * 1000) / 1000 })).filter((c) => c.estandar > 0);
const fab = (n: number, p: Partial<Fabricacion> & { sku: string; lote: string; cant: number; dias: number; rec: [number, number, number, number, number, number, number]; por?: string }): Fabricacion => {
  const numero = `FAB-${String(n).padStart(4, '0')}`;
  const estado = p.estado ?? 'confirmada';
  return {
    id: numero.toLowerCase(), numero, creadoPor: p.por ?? 'u-daniela', creadoEn: hace(p.dias, 2), actualizadoEn: hace(p.dias), skuProducto: p.sku, lote: p.lote, cantidadFabricada: p.cant,
    bodegaDestinoId: 'b1', bodegaOrigenInsumosId: 'b1', consumos: p.consumos ?? consumos(p.cant, p.rec), desviacionPct: p.desviacionPct ?? 0,
    requiereConfirmacionDirector: p.requiereConfirmacionDirector ?? false, estado, fechaFabricacion: hace(p.dias, 2),
    historial: [h(hace(p.dias, 2), 'u-daniela', estado === 'borrador' ? 'Fabricación registrada en borrador' : 'Fabricación registrada', undefined, estado === 'borrador' ? 'borrador' : estado === 'pendiente_director' ? 'pendiente_director' : 'borrador'),
      ...(estado === 'confirmada' ? [h(hace(p.dias), 'u-daniela', 'Fabricación confirmada: consumos y producto terminado registrados', 'borrador', 'confirmada')] : [])],
  };
};
const REC_MT01: [number, number, number, number, number, number, number] = [60, 0.04, 0.03, 1.5, 0.15, 0.3, 0.1];
const REC_BI01: [number, number, number, number, number, number, number] = [150, 0.09, 0.07, 5, 0.4, 0.7, 0.22];
export const crearFabricacionesExtra = (): Fabricacion[] => [
  fab(2, { sku: 'MT-02', lote: 'FT-004', cant: 4, dias: 0, rec: [110, 0.07, 0.06, 3, 0.28, 0.55, 0.18], estado: 'pendiente_director', desviacionPct: 12, requiereConfirmacionDirector: true,
    consumos: [{ sku: 'MP-01', estandar: 440, real: 492 }, { sku: 'MP-02', estandar: 0.28, real: 0.28 }, { sku: 'MP-03', estandar: 0.24, real: 0.24 }, { sku: 'MP-04', estandar: 12, real: 12 }, { sku: 'MP-05', estandar: 1.12, real: 1.12 }, { sku: 'MP-06', estandar: 2.2, real: 2.2 }, { sku: 'MP-07', estandar: 0.72, real: 0.72 }] }),
  fab(3, { sku: 'BO-01', lote: 'FT-005', cant: 6, dias: 0, rec: [45, 0.03, 0.02, 1, 0.1, 0.2, 0.08], estado: 'borrador' }),
  fab(4, { sku: 'MT-01', lote: 'FT-002', cant: 10, dias: 7, rec: REC_MT01 }),
  fab(5, { sku: 'BI-01', lote: 'FT-003', cant: 2, dias: 4, rec: REC_BI01 }),
];

export const crearTrasladosExtra = (): Traslado[] => [
  { id: 'trs-0003', numero: 'TRS-0003', creadoPor: 'u-sergio', creadoEn: hace(1, 3), actualizadoEn: hace(1), origenId: 'b1', destinoId: 'b2', estado: 'en_transito', lineas: [{ sku: 'BO-02', cantidadEnviada: 6 }, { sku: 'MT-02', cantidadEnviada: 2 }],
    historial: [h(hace(1, 3), 'u-sergio', 'Traslado creado', undefined, 'borrador'), h(hace(1), 'u-sergio', 'Traslado despachado: unidades en tránsito', 'borrador', 'en_transito')] },
  { id: 'trs-0004', numero: 'TRS-0004', creadoPor: 'u-sergio', creadoEn: hace(5, 3), actualizadoEn: hace(4, 20), origenId: 'b1', destinoId: 'b3', estado: 'recibido', lineas: [{ sku: 'LV-01', cantidadEnviada: 2, cantidadRecibida: 2 }],
    historial: [h(hace(5, 3), 'u-sergio', 'Traslado creado', undefined, 'borrador'), h(hace(5), 'u-sergio', 'Traslado despachado', 'borrador', 'en_transito'), h(hace(4, 20), 'u-sergio', 'Recepción confirmada en destino', 'en_transito', 'recibido')] },
  { id: 'trs-0005', numero: 'TRS-0005', creadoPor: 'u-sergio', creadoEn: hace(0, 1), actualizadoEn: hace(0, 1), origenId: 'b2', destinoId: 'b3', estado: 'borrador', lineas: [{ sku: 'MT-02', cantidadEnviada: 2 }], historial: [h(hace(0, 1), 'u-sergio', 'Traslado creado en borrador', undefined, 'borrador')] },
];
export const TRANSITO_EXTRA: Record<string, number> = { 'BO-02|b2': 6, 'MT-02|b2': 2 };

export const crearAjustesExtra = (): Ajuste[] => [
  { id: 'aju-0002', numero: 'AJU-0002', creadoPor: 'u-sergio', creadoEn: hace(0, 3), actualizadoEn: hace(0, 3), sku: 'MP-02', bodegaId: 'b1', cantidadBase: -0.5, tipoAjuste: 'conteo_fisico', motivo: 'Conteo físico: la arena en patio resultó menor al sistema.', estado: 'pendiente', historial: [h(hace(0, 3), 'u-sergio', 'Ajuste solicitado', undefined, 'pendiente', 'Conteo físico: la arena en patio resultó menor al sistema.')] },
  { id: 'aju-0003', numero: 'AJU-0003', creadoPor: 'u-sergio', creadoEn: hace(0, 2), actualizadoEn: hace(0, 2), sku: 'MP-05', bodegaId: 'b1', cantidadBase: -3, tipoAjuste: 'merma', motivo: 'Merma por cubeta golpeada durante el traslado interno.', estado: 'pendiente', historial: [h(hace(0, 2), 'u-sergio', 'Ajuste solicitado', undefined, 'pendiente', 'Merma por cubeta golpeada durante el traslado interno.')] },
  { id: 'aju-0004', numero: 'AJU-0004', creadoPor: 'u-sergio', creadoEn: hace(6, 2), actualizadoEn: hace(6), sku: 'MP-06', bodegaId: 'b1', cantidadBase: -2, tipoAjuste: 'correccion', motivo: 'Corrección por error de conteo en la recepción anterior.', estado: 'aprobado', historial: [h(hace(6, 2), 'u-sergio', 'Ajuste solicitado', undefined, 'pendiente'), h(hace(6), 'u-marcela', 'Ajuste aprobado', 'pendiente', 'aprobado')] },
];

// ---------------------------------------------------------------- Despachos y eventos
type D = Omit<Despacho, 'creadoEn' | 'actualizadoEn' | 'historial' | 'id'> & { dias: number };
const despacho = (d: D): Despacho => {
  const { dias, ...resto } = d;
  const conf = d.estado === 'confirmado';
  return {
    ...resto, id: d.numero.toLowerCase(), creadoEn: hace(dias, 2), actualizadoEn: hace(dias),
    historial: [
      h(hace(dias, 2), d.creadoPor, d.estado === 'borrador' ? 'Despacho guardado en borrador' : 'Despacho registrado', undefined, d.estado === 'borrador' ? 'borrador' : 'pendiente_salida'),
      ...(conf ? [h(hace(dias), 'u-sergio', 'Salida física confirmada', 'pendiente_salida', 'confirmado')] : []),
    ],
  };
};
export const crearDespachosExtra = (): Despacho[] => [
  despacho({ numero: 'DSP-0010', creadoPor: 'u-camila', dias: 0, canal: 'despacho_cliente', bodegaId: 'b1', cliente: 'Restaurante La Plaza', destino: 'Calle 12 (ilustrativo)', documentoReferencia: 'COT-2026-021', lineas: [{ sku: 'CA-01', cantidad: 2 }], estado: 'borrador', estadoAdministrativo: 'sin_descargar' }),
  despacho({ numero: 'DSP-0011', creadoPor: 'u-camila', dias: 0, canal: 'despacho_cliente', bodegaId: 'b1', cliente: 'Colegio Demo', destino: 'Patio central (ilustrativo)', documentoReferencia: 'COT-2026-022', proyecto: 'Patio seguro', lineas: [{ sku: 'BO-02', cantidad: 8 }], estado: 'borrador', estadoAdministrativo: 'sin_descargar' }),
  despacho({ numero: 'DSP-0012', creadoPor: 'u-camila', dias: 0, canal: 'despacho_cliente', bodegaId: 'b1', cliente: 'Urbanización Los Pinos', destino: 'Av. de los Pinos (ilustrativo)', documentoReferencia: 'COT-2026-019', proyecto: 'Áreas comunales', lineas: [{ sku: 'PI-01', cantidad: 15 }, { sku: 'CC-01', cantidad: 4 }], estado: 'pendiente_salida', estadoAdministrativo: 'sin_descargar' }),
  despacho({ numero: 'DSP-0013', creadoPor: 'u-camila', dias: 0, canal: 'punto_venta', bodegaId: 'b3', cliente: 'Cafetería Esquina', destino: 'Showroom', documentoReferencia: 'VTA-2026-0110', lineas: [{ sku: 'LV-01', cantidad: 1 }, { sku: 'MT-01', cantidad: 3 }], estado: 'pendiente_salida', estadoAdministrativo: 'sin_descargar' }),
  despacho({ numero: 'DSP-0014', creadoPor: 'u-camila', dias: 8, canal: 'despacho_cliente', bodegaId: 'b1', cliente: 'Conjunto Residencial Alba', destino: 'Calle Alba 7 (ilustrativo)', documentoReferencia: 'COT-2026-013', proyecto: 'Accesos vehiculares', lineas: [{ sku: 'BO-02', cantidad: 6 }], estado: 'confirmado', estadoAdministrativo: 'sin_descargar' }),
  despacho({ numero: 'DSP-0015', creadoPor: 'u-camila', dias: 11, canal: 'despacho_cliente', bodegaId: 'b1', cliente: 'Café del Parque', destino: 'Parque central (ilustrativo)', documentoReferencia: 'COT-2026-008', lineas: [{ sku: 'MC-01', cantidad: 1 }], estado: 'confirmado', estadoAdministrativo: 'descargado_contabilidad' }),
  despacho({ numero: 'DSP-0016', creadoPor: 'u-camila', dias: 7, canal: 'punto_venta', bodegaId: 'b3', cliente: 'Cliente de mostrador', destino: 'Showroom', documentoReferencia: 'VTA-2026-0104', lineas: [{ sku: 'MT-01', cantidad: 3 }], estado: 'confirmado', estadoAdministrativo: 'descargado_contabilidad' }),
  despacho({ numero: 'DSP-0017', creadoPor: 'u-camila', dias: 5, canal: 'tienda_en_linea', bodegaId: 'b1', cliente: 'Cliente tienda en línea', destino: 'Envío a domicilio', documentoReferencia: 'SHP-10003', lineas: [{ sku: 'MT-02', cantidad: 1 }], estado: 'confirmado', estadoAdministrativo: 'sin_descargar' }),
  despacho({ numero: 'DSP-0018', creadoPor: 'u-camila', dias: 3, canal: 'tienda_en_linea', bodegaId: 'b1', cliente: 'Cliente tienda en línea', destino: 'Envío a domicilio', documentoReferencia: 'SHP-10004', lineas: [{ sku: 'BO-02', cantidad: 2 }], estado: 'confirmado', estadoAdministrativo: 'descargado_contabilidad' }),
  despacho({ numero: 'DSP-0019', creadoPor: 'u-camila', dias: 2, canal: 'despacho_cliente', bodegaId: 'b2', cliente: 'Hotel Ejemplo', destino: 'Calle 5 (ilustrativo)', documentoReferencia: 'COT-2026-016', lineas: [{ sku: 'BO-02', cantidad: 4 }], estado: 'confirmado', estadoAdministrativo: 'descargado_contabilidad' }),
  despacho({ numero: 'DSP-0020', creadoPor: 'u-camila', dias: 13, canal: 'punto_venta', bodegaId: 'b3', cliente: 'Cliente de mostrador', destino: 'Showroom', documentoReferencia: 'VTA-2026-0095', lineas: [{ sku: 'LV-01', cantidad: 1 }], estado: 'confirmado', estadoAdministrativo: 'descargado_contabilidad' }),
];
export const COMPROMETIDO_EXTRA: Record<string, number> = { 'PI-01|b1': 15, 'CC-01|b1': 4, 'LV-01|b3': 1, 'MT-01|b3': 3 };

export const crearEventosExtra = (): EventoIntegracion[] => [
  { id: 'evt-0003', canal: 'tienda_en_linea', idExterno: 'SHP-10003', tipo: 'pedido_creado', estado: 'aplicado', fecha: hace(5), detalle: 'Pedido SHP-10003: 1 x MT-02 descontado de la Bodega 1 (DSP-0017).', intentos: 1, numero: 'EVT-0003', sku: 'MT-02', cantidad: 1, despachoId: 'dsp-0017' },
  { id: 'evt-0004', canal: 'tienda_en_linea', idExterno: 'SHP-10004', tipo: 'pedido_creado', estado: 'aplicado', fecha: hace(3), detalle: 'Pedido SHP-10004: 2 x BO-02 descontado de la Bodega 1 (DSP-0018).', intentos: 1, numero: 'EVT-0004', sku: 'BO-02', cantidad: 2, despachoId: 'dsp-0018' },
  { id: 'evt-0005', canal: 'tienda_en_linea', idExterno: 'SHP-10003', tipo: 'pedido_creado', estado: 'duplicado', fecha: hace(4, 20), detalle: 'Evento repetido: el pedido SHP-10003 ya se había aplicado. No se descontó stock.', intentos: 1, numero: 'EVT-0005', sku: 'MT-02', cantidad: 1 },
  { id: 'evt-0006', canal: 'tienda_en_linea', idExterno: 'SHP-10005', tipo: 'pedido_creado', estado: 'error', fecha: hace(0, 3), detalle: 'Sin stock suficiente: BC-02 disponible 2, solicitado 3. No se descontó stock.', intentos: 1, numero: 'EVT-0006', sku: 'BC-02', cantidad: 3 },
];

// ---------------------------------------------------------------- Notificaciones y correos
const nt = (n: number, fecha: string, roles: Notificacion['destinatarioRoles'], tipo: Notificacion['tipo'], titulo: string, mensaje: string, docTipo: string, docId: string, ruta: string, leida: string[] = []): Notificacion =>
  ({ id: `n-${String(n).padStart(3, '0')}`, fecha, destinatarioRoles: roles, tipo, titulo, mensaje, docTipo, docId, ruta, leidaPor: leida });
export const crearNotificacionesExtra = (): Notificacion[] => [
  nt(16, hace(0, 3), ['director'], 'accion', 'Solicitud SOL-0007 por revisar', 'Carlos Rueda solicita 10 m3 de arena fina.', 'Solicitud', 'sol-0007', '/director/sol-0007'),
  nt(17, hace(0, 2), ['director'], 'accion', 'Solicitud SOL-0008 por revisar (alta)', 'Producción solicita cemento y aditivo para el pedido del Parque lineal.', 'Solicitud', 'sol-0008', '/director/sol-0008'),
  nt(18, hace(1), ['director'], 'accion', 'Solicitud SOL-0009 urgente', 'Compras solicita varilla con prioridad urgente.', 'Solicitud', 'sol-0009', '/director/sol-0009'),
  nt(19, hace(2), ['compras'], 'accion', 'Solicitud SOL-0012 aprobada', 'Aprobada sin compra: genera la orden de desmoldante.', 'Solicitud', 'sol-0012', '/compras?solicitud=sol-0012'),
  nt(20, hace(1, 5), ['compras'], 'accion', 'Solicitud SOL-0013 aprobada', 'Aprobada sin compra: aditivo para Producción.', 'Solicitud', 'sol-0013', '/compras?solicitud=sol-0013'),
  nt(21, hace(0, 5), ['aprobador_compra'], 'accion', 'Orden OC-0008 pendiente de aprobación', 'Compras envió una orden de $788,90 que supera el umbral.', 'Compra', 'oc-0008', '/aprobacion-compras/oc-0008'),
  nt(22, hace(0, 6), ['tesoreria'], 'accion', 'Anticipo PAG-0004 por aprobar', 'Tesorería envió un anticipo de $488,75.', 'SolicitudPago', 'pag-0004', '/tesoreria/pag-0004'),
  nt(23, hace(0, 3), ['tesoreria'], 'accion', 'Pago PAG-0005 aprobado', 'Paola Suárez aprobó el pago de $253,00. Falta registrarlo.', 'SolicitudPago', 'pag-0005', '/tesoreria/pag-0005'),
  nt(24, hace(3), ['almacen'], 'info', 'OC-0010 recibida parcialmente', 'Se recibieron 10 de 40 sacos de cemento; quedan 30 pendientes.', 'Compra', 'oc-0010', '/recepcion/oc-0010', ['u-sergio']),
  nt(25, hace(1), ['almacen'], 'accion', 'Traslado TRS-0003 en tránsito', 'Confirma la recepción en la Bodega 2.', 'Traslado', 'trs-0003', '/traslados/trs-0003'),
  nt(26, hace(0, 3), ['director'], 'accion', 'Fabricación FAB-0002 con desvío', 'El consumo de cemento supera el estándar en 12 %.', 'Fabricación', 'fab-0002', '/fabricacion/fab-0002'),
  nt(27, hace(0, 1), ['almacen'], 'accion', 'Despachos pendientes de salida', 'DSP-0012 y DSP-0013 esperan confirmación de salida.', 'Despacho', 'dsp-0012', '/ventas/dsp-0012'),
  nt(28, hace(0, 3), ['ventas', 'admin'], 'alerta', 'Evento de tienda en línea con error', 'El pedido SHP-10005 no pudo aplicarse: sin stock suficiente.', 'Evento', 'evt-0006', '/conexiones'),
  nt(29, hace(0, 2), ['produccion'], 'alerta', 'Producto bajo el mínimo: BC-02', 'Banca con espaldar: 2 disponibles frente a un mínimo de 3.', 'Articulo', 'BC-02', '/producto-terminado?sku=BC-02'),
];
export const crearCorreosExtra = (): CorreoSimulado[] => [
  { id: 'cs-003', fecha: hace(0, 6), para: 'Tesorería', asunto: 'Anticipo PAG-0004 por aprobar', canal: 'correo' },
  { id: 'cs-004', fecha: hace(0, 3), para: 'Ventas y Administración', asunto: 'Evento de tienda con error: SHP-10005', canal: 'whatsapp' },
  { id: 'cs-005', fecha: hace(0, 2), para: 'Director de solicitudes', asunto: 'Fabricación FAB-0002 con desvío de consumo', canal: 'correo' },
  { id: 'cs-006', fecha: hace(1), para: 'Producción', asunto: 'Producto bajo el mínimo: BC-02', canal: 'whatsapp' },
];

// ---------------------------------------------------------------- Movimientos adicionales (ligados a los documentos de arriba)
type Mx = { dias: number; horas?: number; sku: string; tipo: 'entrada_compra' | 'salida_fabricacion' | 'entrada_fabricacion' | 'traslado_salida' | 'traslado_entrada' | 'salida_venta' | 'salida_despacho' | 'ajuste'; origen?: string; destino?: string; cant: number; doc: string; docId: string; usuario: string; obs?: string };
const fabMovs = (docId: string, dias: number, sku: string, cant: number, r: [number, number, number, number, number, number, number]): Mx[] => [
  ...['MP-01', 'MP-02', 'MP-03', 'MP-04', 'MP-05', 'MP-06', 'MP-07'].map((s, i): Mx | null => (r[i] > 0 ? { dias, sku: s, tipo: 'salida_fabricacion', origen: 'b1', cant: redo(r[i] * cant * 1000) / 1000, doc: 'Fabricación', docId, usuario: 'u-daniela', obs: 'consumo de insumo' } : null)).filter((x): x is Mx => x !== null),
  { dias, sku, tipo: 'entrada_fabricacion', destino: 'b1', cant, doc: 'Fabricación', docId, usuario: 'u-daniela', obs: 'ingreso de producto terminado' },
];
export const MOVIMIENTOS_EXTRA: Mx[] = [
  { dias: 3, sku: 'MP-01', tipo: 'entrada_compra', destino: 'b1', cant: 500, doc: 'Recepción', docId: 'rec-0002', usuario: 'u-sergio', obs: 'OC-0010: 10 saco50 (recepción parcial)' },
  { dias: 2, sku: 'MP-04', tipo: 'entrada_compra', destino: 'b1', cant: 120, doc: 'Recepción', docId: 'rec-0003', usuario: 'u-sergio', obs: 'OC-0014: 20 var6 x 6 m' },
  { dias: 14, sku: 'MP-01', tipo: 'entrada_compra', destino: 'b1', cant: 1000, doc: 'Recepción', docId: 'rec-0004', usuario: 'u-sergio', obs: 'OC-0016: 20 saco50' },
  ...fabMovs('fab-0004', 7, 'MT-01', 10, [60, 0.04, 0.03, 1.5, 0.15, 0.3, 0.1]),
  ...fabMovs('fab-0005', 4, 'BI-01', 2, [150, 0.09, 0.07, 5, 0.4, 0.7, 0.22]),
  { dias: 1, sku: 'BO-02', tipo: 'traslado_salida', origen: 'b1', destino: 'b2', cant: 6, doc: 'Traslado', docId: 'trs-0003', usuario: 'u-sergio', obs: 'TRS-0003: salida hacia B2' },
  { dias: 1, sku: 'MT-02', tipo: 'traslado_salida', origen: 'b1', destino: 'b2', cant: 2, doc: 'Traslado', docId: 'trs-0003', usuario: 'u-sergio', obs: 'TRS-0003: salida hacia B2' },
  { dias: 5, sku: 'LV-01', tipo: 'traslado_salida', origen: 'b1', destino: 'b3', cant: 2, doc: 'Traslado', docId: 'trs-0004', usuario: 'u-sergio' },
  { dias: 4, horas: 20, sku: 'LV-01', tipo: 'traslado_entrada', destino: 'b3', cant: 2, doc: 'Traslado', docId: 'trs-0004', usuario: 'u-sergio' },
  { dias: 6, sku: 'MP-06', tipo: 'ajuste', destino: 'b1', cant: -2, doc: 'Ajuste', docId: 'aju-0004', usuario: 'u-sergio', obs: 'AJU-0004: corrección de conteo' },
  { dias: 8, sku: 'BO-02', tipo: 'salida_despacho', origen: 'b1', cant: 6, doc: 'Despacho', docId: 'dsp-0014', usuario: 'u-sergio' },
  { dias: 11, sku: 'MC-01', tipo: 'salida_despacho', origen: 'b1', cant: 1, doc: 'Despacho', docId: 'dsp-0015', usuario: 'u-sergio' },
  { dias: 7, sku: 'MT-01', tipo: 'salida_venta', origen: 'b3', cant: 3, doc: 'Despacho', docId: 'dsp-0016', usuario: 'u-sergio' },
  { dias: 5, sku: 'MT-02', tipo: 'salida_venta', origen: 'b1', cant: 1, doc: 'Despacho', docId: 'dsp-0017', usuario: 'u-sergio', obs: 'Pedido SHP-10003' },
  { dias: 3, sku: 'BO-02', tipo: 'salida_venta', origen: 'b1', cant: 2, doc: 'Despacho', docId: 'dsp-0018', usuario: 'u-sergio', obs: 'Pedido SHP-10004' },
  { dias: 2, sku: 'BO-02', tipo: 'salida_despacho', origen: 'b2', cant: 4, doc: 'Despacho', docId: 'dsp-0019', usuario: 'u-sergio' },
  { dias: 13, sku: 'LV-01', tipo: 'salida_venta', origen: 'b3', cant: 1, doc: 'Despacho', docId: 'dsp-0020', usuario: 'u-sergio' },
];

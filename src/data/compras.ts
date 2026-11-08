import type { Compra, Pago, Recepcion, SolicitudPago } from '../types';
import { enDias, hace } from '../lib/formato';
import { h } from './ayudas';

// Totales calculados con impuesto informativo del 15 %
export const crearCompras = (): Compra[] => [
  {
    // Escenario D-02: 25 sacos aprobados, listos para recibir (se recibiran 18 y quedaran 7)
    id: 'oc-0001', numero: 'OC-0001', creadoPor: 'u-andres', creadoEn: hace(7), actualizadoEn: hace(6),
    solicitudId: 'sol-0004', origen: 'solicitud', proveedorId: 'p-cementos',
    lineas: [{ sku: 'MP-01', cantidad: 25, unidadId: 'saco50', precioUnitario: 8.2 }],
    cotizaciones: [
      { proveedorId: 'p-cementos', precios: [{ sku: 'MP-01', precioUnitario: 8.2 }], condiciones: 'Pago a 15 días', diasEntrega: 5, seleccionada: true },
      { proveedorId: 'p-agregados', precios: [{ sku: 'MP-01', precioUnitario: 8.9 }], condiciones: 'Contra entrega', diasEntrega: 3, seleccionada: false },
    ],
    modalidadPago: 'pago_posterior', condiciones: 'Pago a 15 días', fechaEstimadaEntrega: hace(4),
    subtotal: 205, impuestoInformativo: 30.75, total: 235.75,
    estado: 'aprobada', estadoRecepcion: 'pendiente', estadoPago: 'sin_pago',
    historial: [
      h(hace(7), 'u-andres', 'Orden creada desde SOL-0004', undefined, 'borrador'),
      h(hace(7), 'u-andres', 'Enviada a aprobación', 'borrador', 'pendiente_aprobacion'),
      h(hace(6), 'u-marcela', 'Orden aprobada (monto dentro del umbral del director)', 'pendiente_aprobacion', 'aprobada'),
    ],
  },
  {
    // Escenario D-03: anticipo ya aprobado, pendiente de pago
    id: 'oc-0002', numero: 'OC-0002', creadoPor: 'u-andres', creadoEn: hace(4), actualizadoEn: hace(1),
    solicitudId: 'sol-0005', origen: 'solicitud', proveedorId: 'p-quimicos',
    lineas: [
      { sku: 'MP-05', cantidad: 10, unidadId: 'cub19', precioUnitario: 85 },
      { sku: 'MP-06', cantidad: 4, unidadId: 'saco25', precioUnitario: 60 },
    ],
    cotizaciones: [
      { proveedorId: 'p-quimicos', precios: [{ sku: 'MP-05', precioUnitario: 85 }, { sku: 'MP-06', precioUnitario: 60 }], condiciones: 'Anticipo 50 % y saldo a 30 días', diasEntrega: 10, seleccionada: true },
    ],
    modalidadPago: 'anticipo', porcentajeAnticipo: 50, condiciones: 'Anticipo 50 % y saldo a 30 días', fechaEstimadaEntrega: enDias(10),
    subtotal: 1090, impuestoInformativo: 163.5, total: 1253.5,
    estado: 'aprobada', estadoRecepcion: 'pendiente', estadoPago: 'sin_pago',
    historial: [
      h(hace(4), 'u-andres', 'Orden creada desde SOL-0005', undefined, 'borrador'),
      h(hace(4), 'u-andres', 'Enviada a aprobación', 'borrador', 'pendiente_aprobacion'),
      h(hace(3), 'u-julian', 'Orden aprobada', 'pendiente_aprobacion', 'aprobada'),
    ],
  },
  {
    // Pendiente de aprobacion: supera el umbral de $500, la aprueba el Aprobador de compra
    id: 'oc-0003', numero: 'OC-0003', creadoPor: 'u-andres', creadoEn: hace(1), actualizadoEn: hace(0, 4),
    solicitudId: 'sol-0006', origen: 'solicitud', proveedorId: 'p-agregados',
    lineas: [
      { sku: 'MP-02', cantidad: 20, unidadId: 'm3', precioUnitario: 22 },
      { sku: 'MP-03', cantidad: 15, unidadId: 'm3', precioUnitario: 24 },
    ],
    cotizaciones: [
      { proveedorId: 'p-agregados', precios: [{ sku: 'MP-02', precioUnitario: 22 }, { sku: 'MP-03', precioUnitario: 24 }], condiciones: 'Contra entrega', diasEntrega: 3, seleccionada: true },
    ],
    modalidadPago: 'pago_posterior', condiciones: 'Contra entrega', fechaEstimadaEntrega: enDias(4),
    subtotal: 800, impuestoInformativo: 120, total: 920,
    estado: 'pendiente_aprobacion', estadoRecepcion: 'pendiente', estadoPago: 'sin_pago',
    historial: [
      h(hace(1), 'u-andres', 'Orden creada desde SOL-0006', undefined, 'borrador'),
      h(hace(0, 4), 'u-andres', 'Enviada a aprobación', 'borrador', 'pendiente_aprobacion'),
    ],
  },
  {
    // Historica: compra administrativa cerrada, recibida completa y pagada
    id: 'oc-0004', numero: 'OC-0004', creadoPor: 'u-andres', creadoEn: hace(16), actualizadoEn: hace(9),
    origen: 'administrativa', proveedorId: 'p-aceros',
    lineas: [{ sku: 'MP-04', cantidad: 30, unidadId: 'var6', precioUnitario: 11 }],
    cotizaciones: [
      { proveedorId: 'p-aceros', precios: [{ sku: 'MP-04', precioUnitario: 11 }], condiciones: 'Pago contra entrega', diasEntrega: 7, seleccionada: true },
    ],
    modalidadPago: 'pago_posterior', condiciones: 'Pago contra entrega', fechaEstimadaEntrega: hace(10),
    subtotal: 330, impuestoInformativo: 49.5, total: 379.5,
    estado: 'cerrada', estadoRecepcion: 'completa', estadoPago: 'pagado',
    historial: [
      h(hace(16), 'u-andres', 'Orden administrativa creada', undefined, 'borrador'),
      h(hace(16), 'u-andres', 'Enviada a aprobación', 'borrador', 'pendiente_aprobacion'),
      h(hace(15), 'u-marcela', 'Orden aprobada', 'pendiente_aprobacion', 'aprobada'),
      h(hace(10), 'u-sergio', 'Recepción completa REC-0001', 'aprobada', 'recibida'),
      h(hace(9), 'u-paola', 'Pago registrado y conciliado', 'recibida', 'cerrada'),
    ],
  },
];

export const crearSolicitudesPago = (): SolicitudPago[] => [
  {
    id: 'pag-0001', numero: 'PAG-0001', creadoPor: 'u-paola', creadoEn: hace(10), actualizadoEn: hace(9),
    compraId: 'oc-0004', tipo: 'pago_final', importe: 379.5, estado: 'conciliada',
    historial: [
      h(hace(10), 'u-paola', 'Solicitud de pago preparada', undefined, 'preparada'),
      h(hace(10), 'u-paola', 'Enviada a aprobación', 'preparada', 'pendiente_aprobacion'),
      h(hace(10), 'u-paola', 'Pago aprobado', 'pendiente_aprobacion', 'aprobada'),
      h(hace(9), 'u-paola', 'Pago registrado con comprobante', 'aprobada', 'pagada'),
      h(hace(9), 'u-paola', 'Pago conciliado', 'pagada', 'conciliada'),
    ],
  },
  {
    // Anticipo del 50 % sobre el total de OC-0002 (626,75), aprobado y pendiente de registrar el pago
    id: 'pag-0002', numero: 'PAG-0002', creadoPor: 'u-paola', creadoEn: hace(1), actualizadoEn: hace(0, 2),
    compraId: 'oc-0002', tipo: 'anticipo', importe: 626.75, observacion: 'Anticipo 50 % según condiciones del proveedor', estado: 'aprobada',
    historial: [
      h(hace(1), 'u-paola', 'Solicitud de anticipo preparada', undefined, 'preparada'),
      h(hace(1), 'u-paola', 'Enviada a aprobación', 'preparada', 'pendiente_aprobacion'),
      h(hace(0, 2), 'u-paola', 'Anticipo aprobado', 'pendiente_aprobacion', 'aprobada'),
    ],
  },
];

export const crearPagos = (): Pago[] => [
  { id: 'pg-0001', solicitudPagoId: 'pag-0001', fecha: hace(9), importe: 379.5, medio: 'transferencia', comprobante: 'comprobante-transferencia-0001.pdf', registradoPor: 'u-paola' },
];

export const crearRecepciones = (): Recepcion[] => [
  {
    id: 'rec-0001', numero: 'REC-0001', creadoPor: 'u-sergio', creadoEn: hace(10), actualizadoEn: hace(10),
    compraId: 'oc-0004', bodegaId: 'b1', estado: 'confirmada', esCierre: true,
    lineas: [{ sku: 'MP-04', ordenado: 30, recibidoAntes: 0, recibidoAhora: 30, faltante: 0, unidadId: 'var6' }],
    historial: [h(hace(10), 'u-sergio', 'Recepción confirmada', undefined, 'confirmada')],
  },
];

import type { Ajuste, Despacho, EventoIntegracion, Fabricacion, Traslado } from '../types';
import { hace } from '../lib/formato';
import { h } from './ayudas';

// Escenario D-04: lote FT-001 en borrador. Consumos = receta x 2 bancas (400 kg de cemento = 8 sacos)
export const crearFabricaciones = (): Fabricacion[] => [
  {
    id: 'fab-0001', numero: 'FAB-0001', creadoPor: 'u-daniela', creadoEn: hace(0, 3), actualizadoEn: hace(0, 3),
    skuProducto: 'BC-01', lote: 'FT-001', cantidadFabricada: 2, bodegaDestinoId: 'b1', bodegaOrigenInsumosId: 'b1',
    consumos: [
      { sku: 'MP-01', estandar: 400, real: 400 }, { sku: 'MP-02', estandar: 0.24, real: 0.24 },
      { sku: 'MP-03', estandar: 0.2, real: 0.2 }, { sku: 'MP-04', estandar: 12, real: 12 },
      { sku: 'MP-05', estandar: 1, real: 1 }, { sku: 'MP-06', estandar: 2, real: 2 },
      { sku: 'MP-07', estandar: 0.6, real: 0.6 },
    ],
    desviacionPct: 0, requiereConfirmacionDirector: false, estado: 'borrador', fechaFabricacion: hace(0, 3),
    historial: [h(hace(0, 3), 'u-daniela', 'Fabricación registrada en borrador', undefined, 'borrador')],
  },
];

export const crearTraslados = (): Traslado[] => [
  {
    id: 'trs-0001', numero: 'TRS-0001', creadoPor: 'u-sergio', creadoEn: hace(0, 2), actualizadoEn: hace(0, 2),
    origenId: 'b1', destinoId: 'b2', estado: 'borrador',
    lineas: [{ sku: 'BO-02', cantidadEnviada: 5 }, { sku: 'MT-02', cantidadEnviada: 2 }],
    historial: [h(hace(0, 2), 'u-sergio', 'Traslado creado en borrador', undefined, 'borrador')],
  },
  {
    id: 'trs-0002', numero: 'TRS-0002', creadoPor: 'u-sergio', creadoEn: hace(8), actualizadoEn: hace(7, 20),
    origenId: 'b1', destinoId: 'b3', estado: 'recibido',
    lineas: [{ sku: 'MT-01', cantidadEnviada: 5, cantidadRecibida: 5 }],
    historial: [
      h(hace(8), 'u-sergio', 'Traslado creado', undefined, 'borrador'),
      h(hace(8), 'u-sergio', 'Traslado despachado', 'borrador', 'en_transito'),
      h(hace(7, 20), 'u-sergio', 'Recepción confirmada en destino', 'en_transito', 'recibido'),
    ],
  },
];

type D = Omit<Despacho, 'creadoEn' | 'actualizadoEn' | 'historial' | 'id'> & { dias: number };
const despacho = (d: D): Despacho => {
  const { dias, ...resto } = d;
  const conf = d.estado === 'confirmado';
  return {
    ...resto, id: d.numero.toLowerCase(), creadoEn: hace(dias, 2), actualizadoEn: hace(dias),
    historial: [
      h(hace(dias, 2), d.creadoPor, 'Despacho registrado', undefined, 'pendiente_salida'),
      ...(conf ? [h(hace(dias), 'u-sergio', 'Salida física confirmada', 'pendiente_salida', 'confirmado')] : []),
    ],
  };
};

export const crearDespachos = (): Despacho[] => [
  despacho({ numero: 'DSP-0001', creadoPor: 'u-camila', dias: 6, canal: 'punto_venta', bodegaId: 'b3', cliente: 'Cliente de mostrador', destino: 'Showroom', documentoReferencia: 'VTA-2026-0101', lineas: [{ sku: 'BC-01', cantidad: 1 }], estado: 'confirmado', estadoAdministrativo: 'descargado_contabilidad' }),
  despacho({ numero: 'DSP-0002', creadoPor: 'u-camila', dias: 4, canal: 'despacho_cliente', bodegaId: 'b2', cliente: 'Jardines del Norte S.A.', destino: 'Av. Principal 123 (ilustrativo)', documentoReferencia: 'COT-2026-011', proyecto: 'Parque lineal', lineas: [{ sku: 'MT-02', cantidad: 3 }], estado: 'confirmado', estadoAdministrativo: 'descargado_contabilidad' }),
  despacho({ numero: 'DSP-0003', creadoPor: 'u-camila', dias: 5, canal: 'despacho_cliente', bodegaId: 'b1', cliente: 'Constructora Demo S.A.', destino: 'Obra Centro (ilustrativo)', documentoReferencia: 'COT-2026-012', proyecto: 'Plaza central', lineas: [{ sku: 'BO-02', cantidad: 4 }], estado: 'confirmado', estadoAdministrativo: 'sin_descargar' }),
  despacho({ numero: 'DSP-0004', creadoPor: 'u-camila', dias: 2, canal: 'tienda_en_linea', bodegaId: 'b1', cliente: 'Cliente tienda en línea', destino: 'Envío a domicilio', documentoReferencia: 'SHP-10001', lineas: [{ sku: 'CA-01', cantidad: 1 }], estado: 'confirmado', estadoAdministrativo: 'sin_descargar' }),
  despacho({ numero: 'DSP-0005', creadoPor: 'u-camila', dias: 3, canal: 'punto_venta', bodegaId: 'b3', cliente: 'Cliente de mostrador', destino: 'Showroom', documentoReferencia: 'VTA-2026-0102', lineas: [{ sku: 'LV-01', cantidad: 1 }], estado: 'confirmado', estadoAdministrativo: 'descargado_contabilidad' }),
  despacho({ numero: 'DSP-0006', creadoPor: 'u-camila', dias: 1, canal: 'despacho_cliente', bodegaId: 'b1', cliente: 'Hotel Ejemplo', destino: 'Calle 5 (ilustrativo)', documentoReferencia: 'COT-2026-015', lineas: [{ sku: 'CC-01', cantidad: 2 }], estado: 'confirmado', estadoAdministrativo: 'sin_descargar' }),
  // Pendiente de salida: compromete 2 macetas medianas en B1 (disponible = fisico - comprometido)
  despacho({ numero: 'DSP-0007', creadoPor: 'u-camila', dias: 0, canal: 'despacho_cliente', bodegaId: 'b1', cliente: 'Vivero Ejemplo', destino: 'Av. Verde 45 (ilustrativo)', documentoReferencia: 'COT-2026-017', lineas: [{ sku: 'MT-01', cantidad: 2 }], estado: 'pendiente_salida', estadoAdministrativo: 'sin_descargar' }),
  despacho({ numero: 'DSP-0008', creadoPor: 'u-camila', dias: 9, canal: 'despacho_cliente', bodegaId: 'b1', cliente: 'Municipio Demo', destino: 'Parque norte (ilustrativo)', documentoReferencia: 'COT-2026-009', lineas: [{ sku: 'PI-01', cantidad: 10 }], estado: 'confirmado', estadoAdministrativo: 'descargado_contabilidad' }),
  despacho({ numero: 'DSP-0009', creadoPor: 'u-camila', dias: 12, canal: 'punto_venta', bodegaId: 'b3', cliente: 'Cliente de mostrador', destino: 'Showroom', documentoReferencia: 'VTA-2026-0098', lineas: [{ sku: 'MT-01', cantidad: 2 }], estado: 'confirmado', estadoAdministrativo: 'descargado_contabilidad' }),
];

export const crearAjustes = (): Ajuste[] => [
  {
    id: 'aju-0001', numero: 'AJU-0001', creadoPor: 'u-sergio', creadoEn: hace(0, 4), actualizadoEn: hace(0, 4),
    sku: 'MP-07', bodegaId: 'b1', cantidadBase: -4, motivo: 'Merma por derrame durante el trasvase del tambor.', estado: 'pendiente',
    historial: [h(hace(0, 4), 'u-sergio', 'Ajuste solicitado', undefined, 'pendiente', 'Merma por derrame durante el trasvase del tambor.')],
  },
];

export const crearEventos = (): EventoIntegracion[] => [
  { id: 'evt-0001', canal: 'tienda_en_linea', idExterno: 'SHP-10001', tipo: 'pedido_creado', estado: 'aplicado', fecha: hace(2), detalle: 'Pedido SHP-10001: 1 x CA-01 descontado de la Bodega 1 (DSP-0004).', intentos: 1, numero: 'EVT-0001', sku: 'CA-01', cantidad: 1, despachoId: 'dsp-0004' },
  { id: 'evt-0002', canal: 'tienda_en_linea', idExterno: 'SHP-10002', tipo: 'pedido_creado', estado: 'error', fecha: hace(1), detalle: 'SKU no reconocido en el pedido (CA-99). No se descontó stock.', intentos: 1, numero: 'EVT-0002', sku: 'CA-99', cantidad: 1 },
];

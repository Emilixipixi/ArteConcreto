import type { Solicitud } from '../types';
import { hace } from '../lib/formato';
import { h } from './ayudas';

export const crearSolicitudes = (): Solicitud[] => [
  {
    // Escenario D-01: devuelta por falta de justificacion
    id: 'sol-0001', numero: 'SOL-0001', creadoPor: 'u-carlos', creadoEn: hace(2, 3), actualizadoEn: hace(1, 2),
    estado: 'devuelta', area: 'Planta', prioridad: 'alta', justificacion: '',
    lineas: [{ sku: 'MP-01', cantidad: 25, unidadId: 'saco50', observacion: 'Para el lote de bancas', destinoBodegaId: 'b1' }],
    adjuntos: [],
    historial: [
      h(hace(2, 3), 'u-carlos', 'Solicitud creada', undefined, 'borrador'),
      h(hace(2, 2), 'u-carlos', 'Solicitud enviada al director', 'borrador', 'pendiente'),
      h(hace(1, 2), 'u-marcela', 'Solicitud devuelta', 'pendiente', 'devuelta', 'Falta justificación: indique el pedido o lote que requiere este volumen de cemento.'),
    ],
  },
  {
    id: 'sol-0002', numero: 'SOL-0002', creadoPor: 'u-carlos', creadoEn: hace(0, 6), actualizadoEn: hace(0, 6),
    estado: 'borrador', area: 'Planta', prioridad: 'media', justificacion: '',
    lineas: [{ sku: 'MP-04', cantidad: 12, unidadId: 'var6', destinoBodegaId: 'b1' }],
    adjuntos: [],
    historial: [h(hace(0, 6), 'u-carlos', 'Borrador guardado', undefined, 'borrador')],
  },
  {
    id: 'sol-0003', numero: 'SOL-0003', creadoPor: 'u-carlos', creadoEn: hace(0, 5), actualizadoEn: hace(0, 5),
    estado: 'pendiente', area: 'Planta', prioridad: 'media',
    justificacion: 'Reposición de desmoldante y pigmento para los próximos lotes de bancas.',
    lineas: [
      { sku: 'MP-07', cantidad: 1, unidadId: 'tamb200', destinoBodegaId: 'b1' },
      { sku: 'MP-06', cantidad: 2, unidadId: 'saco25', destinoBodegaId: 'b1' },
    ],
    adjuntos: ['cotizacion-referencial.pdf'],
    historial: [
      h(hace(0, 5), 'u-carlos', 'Solicitud creada', undefined, 'borrador'),
      h(hace(0, 5), 'u-carlos', 'Solicitud enviada al director', 'borrador', 'pendiente'),
    ],
  },
  {
    id: 'sol-0004', numero: 'SOL-0004', creadoPor: 'u-carlos', creadoEn: hace(9), actualizadoEn: hace(7),
    estado: 'en_compra', area: 'Planta', prioridad: 'alta',
    justificacion: 'Reposición de cemento para el lote de bancas del mes.',
    lineas: [{ sku: 'MP-01', cantidad: 25, unidadId: 'saco50', destinoBodegaId: 'b1' }],
    adjuntos: [],
    historial: [
      h(hace(9), 'u-carlos', 'Solicitud creada', undefined, 'borrador'),
      h(hace(9), 'u-carlos', 'Solicitud enviada al director', 'borrador', 'pendiente'),
      h(hace(8), 'u-marcela', 'Solicitud aprobada', 'pendiente', 'aprobada'),
      h(hace(7), 'u-andres', 'Compra OC-0001 generada', 'aprobada', 'en_compra'),
    ],
  },
  {
    id: 'sol-0005', numero: 'SOL-0005', creadoPor: 'u-carlos', creadoEn: hace(6), actualizadoEn: hace(4),
    estado: 'en_compra', area: 'Planta', prioridad: 'alta',
    justificacion: 'Aditivo bajo el mínimo y pigmento para los lotes de la quincena.',
    lineas: [
      { sku: 'MP-05', cantidad: 10, unidadId: 'cub19', destinoBodegaId: 'b1' },
      { sku: 'MP-06', cantidad: 4, unidadId: 'saco25', destinoBodegaId: 'b1' },
    ],
    adjuntos: [],
    historial: [
      h(hace(6), 'u-carlos', 'Solicitud creada', undefined, 'borrador'),
      h(hace(6), 'u-carlos', 'Solicitud enviada al director', 'borrador', 'pendiente'),
      h(hace(5), 'u-marcela', 'Solicitud aprobada', 'pendiente', 'aprobada'),
      h(hace(4), 'u-andres', 'Compra OC-0002 generada', 'aprobada', 'en_compra'),
    ],
  },
  {
    id: 'sol-0006', numero: 'SOL-0006', creadoPor: 'u-carlos', creadoEn: hace(4), actualizadoEn: hace(1),
    estado: 'en_compra', area: 'Planta', prioridad: 'media',
    justificacion: 'Agregados para la fabricación de mesas y macetas.',
    lineas: [
      { sku: 'MP-02', cantidad: 20, unidadId: 'm3', destinoBodegaId: 'b1' },
      { sku: 'MP-03', cantidad: 15, unidadId: 'm3', destinoBodegaId: 'b1' },
    ],
    adjuntos: [],
    historial: [
      h(hace(4), 'u-carlos', 'Solicitud creada', undefined, 'borrador'),
      h(hace(4), 'u-carlos', 'Solicitud enviada al director', 'borrador', 'pendiente'),
      h(hace(3), 'u-marcela', 'Solicitud aprobada', 'pendiente', 'aprobada'),
      h(hace(1), 'u-andres', 'Compra OC-0003 generada', 'aprobada', 'en_compra'),
    ],
  },
];

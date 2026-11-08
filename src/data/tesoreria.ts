// Carga adicional de Tesoreria: compras con anticipo en todas las etapas de la bandeja
// (por preparar, pendientes de aprobacion, aprobados por registrar y anticipos pagados esperando recepcion).
// La numeracion continua despues de los documentos ya existentes (se recibe el maximo de cada serie).
import type { Compra, Pago, Prioridad, Solicitud, SolicitudPago } from '../types';
import { enDias, hace } from '../lib/formato';
import { h } from './ayudas';

export interface Maximos { sol: number; oc: number; pag: number; pg: number }

type Etapa = 'preparar' | 'pendiente' | 'aprobado' | 'pagado';
interface Plan { etapa: Etapa; prov: string; pct: number; dias: number; entrega: number; lineas: { sku: string; cant: number; u: string; precio: number }[]; area?: string; por?: string; prio?: Prioridad }

// Precio por presentacion de compra (USD): precio de referencia x factor de la presentacion
const PLANES: Plan[] = [
  // Por preparar (compra aprobada, falta la solicitud de anticipo)
  { etapa: 'preparar', prov: 'p-aceros', pct: 30, dias: 1, entrega: 9, lineas: [{ sku: 'MP-04', cant: 60, u: 'var6', precio: 10.98 }, { sku: 'MP-10', cant: 8, u: 'rollo', precio: 114 }] },
  { etapa: 'preparar', prov: 'p-quimicos', pct: 50, dias: 0, entrega: 12, lineas: [{ sku: 'MP-11', cant: 6, u: 'cub19', precio: 98.8 }, { sku: 'MP-13', cant: 4, u: 'cub19', precio: 115.9 }] },
  { etapa: 'preparar', prov: 'p-aceros', pct: 40, dias: 2, entrega: 7, lineas: [{ sku: 'MP-14', cant: 10, u: 'caja', precio: 12 }, { sku: 'MP-04', cant: 30, u: 'var6', precio: 10.98 }] },
  { etapa: 'preparar', prov: 'p-quimicos', pct: 50, dias: 1, entrega: 10, lineas: [{ sku: 'MP-15', cant: 5, u: 'cub19', precio: 140.6 }, { sku: 'MP-05', cant: 8, u: 'cub19', precio: 84.93 }] },
  // Pendientes de aprobacion (anticipo enviado al aprobador de pago)
  { etapa: 'pendiente', prov: 'p-quimicos', pct: 50, dias: 2, entrega: 8, lineas: [{ sku: 'MP-07', cant: 2, u: 'tamb200', precio: 620 }, { sku: 'MP-05', cant: 6, u: 'cub19', precio: 84.93 }] },
  { etapa: 'pendiente', prov: 'p-aceros', pct: 30, dias: 3, entrega: 6, lineas: [{ sku: 'MP-10', cant: 12, u: 'rollo', precio: 114 }] },
  { etapa: 'pendiente', prov: 'p-aceros', pct: 30, dias: 1, entrega: 11, lineas: [{ sku: 'MP-04', cant: 80, u: 'var6', precio: 10.98 }] },
  { etapa: 'pendiente', prov: 'p-quimicos', pct: 50, dias: 0, entrega: 9, lineas: [{ sku: 'MP-13', cant: 8, u: 'cub19', precio: 115.9 }, { sku: 'MP-11', cant: 4, u: 'cub19', precio: 98.8 }] },
  // Aprobados (falta registrar el pago con su comprobante)
  { etapa: 'aprobado', prov: 'p-quimicos', pct: 50, dias: 3, entrega: 7, lineas: [{ sku: 'MP-15', cant: 8, u: 'cub19', precio: 140.6 }] },
  { etapa: 'aprobado', prov: 'p-aceros', pct: 30, dias: 4, entrega: 5, lineas: [{ sku: 'MP-04', cant: 50, u: 'var6', precio: 10.98 }, { sku: 'MP-14', cant: 8, u: 'caja', precio: 12 }] },
  { etapa: 'aprobado', prov: 'p-quimicos', pct: 50, dias: 2, entrega: 14, lineas: [{ sku: 'MP-05', cant: 12, u: 'cub19', precio: 84.93 }] },
  { etapa: 'aprobado', prov: 'p-aceros', pct: 40, dias: 3, entrega: 8, lineas: [{ sku: 'MP-10', cant: 10, u: 'rollo', precio: 114 }] },
  // Anticipos ya pagados que esperan la llegada de la mercancia
  { etapa: 'pagado', prov: 'p-quimicos', pct: 50, dias: 8, entrega: 4, lineas: [{ sku: 'MP-11', cant: 10, u: 'cub19', precio: 98.8 }, { sku: 'MP-15', cant: 6, u: 'cub19', precio: 140.6 }] },
  { etapa: 'pagado', prov: 'p-aceros', pct: 30, dias: 7, entrega: 5, lineas: [{ sku: 'MP-04', cant: 100, u: 'var6', precio: 10.98 }] },
  { etapa: 'pagado', prov: 'p-quimicos', pct: 50, dias: 9, entrega: 6, lineas: [{ sku: 'MP-05', cant: 14, u: 'cub19', precio: 84.93 }, { sku: 'MP-07', cant: 1, u: 'tamb200', precio: 620 }] },
  { etapa: 'pagado', prov: 'p-aceros', pct: 40, dias: 6, entrega: 3, lineas: [{ sku: 'MP-14', cant: 20, u: 'caja', precio: 12 }, { sku: 'MP-10', cant: 6, u: 'rollo', precio: 114 }] },
  { etapa: 'pagado', prov: 'p-quimicos', pct: 50, dias: 10, entrega: 2, lineas: [{ sku: 'MP-13', cant: 12, u: 'cub19', precio: 115.9 }] },
  { etapa: 'pagado', prov: 'p-aceros', pct: 30, dias: 5, entrega: 8, lineas: [{ sku: 'MP-04', cant: 45, u: 'var6', precio: 10.98 }, { sku: 'MP-10', cant: 5, u: 'rollo', precio: 114 }] },
];

// Variantes adicionales (misma logica, otras combinaciones) para que cada pestana de la bandeja tenga bastante trabajo
const LINEAS_VAR: Plan['lineas'][] = [
  [{ sku: 'MP-04', cant: 40, u: 'var6', precio: 10.98 }, { sku: 'MP-14', cant: 6, u: 'caja', precio: 12 }],
  [{ sku: 'MP-05', cant: 10, u: 'cub19', precio: 84.93 }, { sku: 'MP-11', cant: 3, u: 'cub19', precio: 98.8 }],
  [{ sku: 'MP-10', cant: 9, u: 'rollo', precio: 114 }],
  [{ sku: 'MP-13', cant: 6, u: 'cub19', precio: 115.9 }, { sku: 'MP-15', cant: 4, u: 'cub19', precio: 140.6 }],
  [{ sku: 'MP-07', cant: 2, u: 'tamb200', precio: 620 }],
  [{ sku: 'MP-04', cant: 120, u: 'var6', precio: 10.98 }],
];
(['preparar', 'pendiente', 'aprobado', 'pagado'] as Etapa[]).forEach((etapa, e) => {
  for (let k = 0; k < 4; k++) {
    const quim = (k + e) % 2 === 0; const pct = quim ? 50 : [30, 40][k % 2];
    PLANES.push({ etapa, prov: quim ? 'p-quimicos' : 'p-aceros', pct, dias: etapa === 'pagado' ? 4 + k * 2 : k % 4, entrega: 3 + ((k * 3 + e * 2) % 12),
      lineas: LINEAS_VAR[(k + e * 2) % LINEAS_VAR.length].filter((l) => (quim ? ['MP-05', 'MP-07', 'MP-11', 'MP-13', 'MP-15'].includes(l.sku) : ['MP-04', 'MP-10', 'MP-14'].includes(l.sku))) });
  }
});
const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (p: string, n: number) => `${p}-${String(n).padStart(4, '0')}`;
const COND: Record<number, string> = { 30: 'Anticipo 30 % y saldo contra entrega', 40: 'Anticipo 40 % y saldo a la recepción', 50: 'Anticipo 50 % y saldo a 30 días' };

export function crearTesoreriaExtra(m: Maximos) {
  const solicitudes: Solicitud[] = []; const compras: Compra[] = []; const solicitudesPago: SolicitudPago[] = []; const pagos: Pago[] = [];
  let nSol = m.sol, nOc = m.oc, nPag = m.pag, nPg = m.pg;
  PLANES.filter((p) => p.lineas.length > 0).forEach((p, i) => {
    const por = i % 2 === 0 ? 'u-daniela' : 'u-carlos';
    const sN = num('SOL', ++nSol); const ocN = num('OC', ++nOc); const sid = sN.toLowerCase(); const oid = ocN.toLowerCase();
    const subtotal = r2(p.lineas.reduce((a, l) => a + l.cant * l.precio, 0)); const imp = r2(subtotal * 0.15); const total = r2(subtotal + imp);
    const aprobador = total <= 500 ? 'u-marcela' : 'u-julian';
    solicitudes.push({
      id: sid, numero: sN, creadoPor: por, creadoEn: hace(p.dias + 4, 3), actualizadoEn: hace(p.dias, 4), estado: 'en_compra', area: por === 'u-daniela' ? 'Producción' : 'Planta', prioridad: (['media', 'alta', 'media', 'baja'] as Prioridad[])[i % 4],
      justificacion: 'Insumos para los lotes programados de la semana.', adjuntos: [],
      lineas: p.lineas.map((l) => ({ sku: l.sku, cantidad: l.cant, unidadId: l.u, destinoBodegaId: 'b1' })),
      historial: [h(hace(p.dias + 4, 3), por, 'Solicitud creada', undefined, 'borrador'), h(hace(p.dias + 4, 3), por, 'Solicitud enviada al director', 'borrador', 'pendiente'),
        h(hace(p.dias + 3), 'u-marcela', 'Solicitud aprobada', 'pendiente', 'aprobada'), h(hace(p.dias + 2), 'u-andres', `Compra ${ocN} generada`, 'aprobada', 'en_compra')],
    });
    const anticipo = r2(total * p.pct / 100);
    compras.push({
      id: oid, numero: ocN, creadoPor: 'u-andres', creadoEn: hace(p.dias + 2, 3), actualizadoEn: hace(p.dias), solicitudId: sid, origen: 'solicitud', proveedorId: p.prov,
      lineas: p.lineas.map((l) => ({ sku: l.sku, cantidad: l.cant, unidadId: l.u, precioUnitario: l.precio })),
      cotizaciones: [{ proveedorId: p.prov, precios: p.lineas.map((l) => ({ sku: l.sku, precioUnitario: l.precio })), condiciones: COND[p.pct], diasEntrega: 7, seleccionada: true }],
      modalidadPago: 'anticipo', porcentajeAnticipo: p.pct, condiciones: COND[p.pct], fechaEstimadaEntrega: enDias(p.entrega), subtotal, impuestoInformativo: imp, total,
      estado: 'aprobada', estadoRecepcion: 'pendiente', estadoPago: p.etapa === 'pagado' ? 'anticipo' : 'sin_pago', ordenGenerada: true,
      historial: [h(hace(p.dias + 2, 3), 'u-andres', `Orden creada desde ${sN}`, undefined, 'borrador'), h(hace(p.dias + 2, 2), 'u-andres', 'Enviada a aprobación', 'borrador', 'pendiente_aprobacion'),
        h(hace(p.dias + 1), aprobador, 'Orden aprobada', 'pendiente_aprobacion', 'aprobada')],
    });
    if (p.etapa === 'preparar') return; // sin solicitud de pago todavia
    const pN = num('PAG', ++nPag); const pid = pN.toLowerCase();
    const hist = [h(hace(p.dias, 6), 'u-paola', 'Solicitud de anticipo preparada', undefined, 'preparada'), h(hace(p.dias, 5), 'u-paola', 'Enviada a aprobación', 'preparada', 'pendiente_aprobacion')];
    let estado: SolicitudPago['estado'] = 'pendiente_aprobacion';
    if (p.etapa !== 'pendiente') { hist.push(h(hace(p.dias, 3), 'u-paola', 'Anticipo aprobado', 'pendiente_aprobacion', 'aprobada')); estado = 'aprobada'; }
    if (p.etapa === 'pagado') { hist.push(h(hace(p.dias - 1 < 0 ? 0 : p.dias - 1, 2), 'u-paola', 'Pago registrado con comprobante', 'aprobada', 'pagada')); estado = 'pagada'; }
    solicitudesPago.push({ id: pid, numero: pN, creadoPor: 'u-paola', creadoEn: hace(p.dias, 6), actualizadoEn: hist[hist.length - 1].fecha, compraId: oid, tipo: 'anticipo', importe: anticipo, observacion: `Anticipo ${p.pct} % según condiciones del proveedor`, estado, historial: hist });
    if (p.etapa === 'pagado') pagos.push({ id: num('pg', ++nPg).toLowerCase(), solicitudPagoId: pid, fecha: hace(p.dias - 1 < 0 ? 0 : p.dias - 1, 2), importe: anticipo, medio: i % 3 === 0 ? 'cheque' : 'transferencia', comprobante: `comprobante-${pid}.pdf`, registradoPor: 'u-paola', referencia: `TRF-${String(48200 + i * 7)}` });
  });
  return { solicitudes, compras, solicitudesPago, pagos };
}

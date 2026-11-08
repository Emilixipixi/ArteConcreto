// Volumen historico de la demostracion (generado con una semilla fija: siempre produce los mismos datos).
// Cubre ~70 dias de operacion: compras completas (solicitud -> orden -> recepcion -> pago), fabricaciones,
// traslados, despachos, eventos de la tienda. No toca los escenarios D-01 a D-07.
import type {
  Ajuste, Articulo, AuditoriaItem, Compra, Despacho, EventoIntegracion, Fabricacion, Notificacion, Pago, Prioridad, Proveedor,
  Recepcion, Solicitud, SolicitudPago, Traslado,
} from '../types';
import { hace } from '../lib/formato';
import { h } from './ayudas';

// ---------------------------------------------------------------- Generador pseudoaleatorio con semilla
function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rnd = mulberry32(20261106);
const entre = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const elige = <T,>(l: T[]): T => l[Math.floor(rnd() * l.length)];
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (p: string, n: number, w = 4) => `${p}-${String(n).padStart(w, '0')}`;

// ---------------------------------------------------------------- Catalogo ampliado
const mp = (sku: string, nombre: string, categoria: string, unidadBaseId: string, presUnidad: string, presFactor: number, stockMinimo: number, precio: number): Articulo => ({
  sku, nombre, tipo: 'materia_prima', categoria, unidadBaseId, presentaciones: [{ unidadId: presUnidad, factorABase: presFactor }], stockMinimo, activo: true, precioReferencia: precio,
});
type Rec = Record<string, number>;
const recetaDe = (r: Rec) => Object.entries(r).filter(([, v]) => v > 0).map(([sku, cantidadBase]) => ({ sku, cantidadBase }));
const pt = (sku: string, nombre: string, categoria: string, stockMinimo: number, plazo: number, precio: number, r: Rec, unidadBaseId = 'und'): Articulo => ({
  sku, nombre, tipo: 'producto_terminado', categoria, unidadBaseId, presentaciones: [], stockMinimo, activo: true, receta: recetaDe(r), plazoFabricacionDias: plazo, precioReferencia: precio,
});

export const ARTICULOS_EXTRA: Articulo[] = [
  mp('MP-08', 'Cemento blanco', 'Cemento y aglomerantes', 'kg', 'saco25', 25, 100, 0.45),
  mp('MP-09', 'Fibra de polipropileno', 'Aditivos', 'kg', 'caja', 10, 20, 6.5),
  mp('MP-10', 'Malla electrosoldada', 'Acero', 'm2', 'rollo', 30, 60, 3.8),
  mp('MP-11', 'Impermeabilizante', 'Aditivos', 'L', 'cub19', 19, 40, 5.2),
  mp('MP-12', 'Arena gruesa', 'Agregados', 'm3', 'm3', 1, 3, 26),
  mp('MP-13', 'Aditivo acelerante', 'Aditivos', 'L', 'cub19', 19, 30, 6.1),
  mp('MP-14', 'Anclajes y tornillería', 'Acero', 'und', 'caja', 100, 200, 0.12),
  mp('MP-15', 'Sellador transparente', 'Desmoldantes', 'L', 'cub19', 19, 30, 7.4),
  pt('BC-03', 'Banca sin espaldar', 'Bancas', 4, 10, 150, { 'MP-01': 150, 'MP-02': 0.09, 'MP-03': 0.08, 'MP-04': 4, 'MP-05': 0.4, 'MP-06': 0.8, 'MP-07': 0.25 }),
  pt('BC-04', 'Banca curva', 'Bancas', 2, 16, 340, { 'MP-01': 300, 'MP-08': 20, 'MP-02': 0.14, 'MP-03': 0.12, 'MP-04': 9, 'MP-05': 0.7, 'MP-06': 1.5, 'MP-07': 0.45 }),
  pt('MC-03', 'Mesa cuadrada de picnic', 'Mesas', 2, 12, 320, { 'MP-01': 260, 'MP-02': 0.15, 'MP-03': 0.12, 'MP-04': 8, 'MP-05': 0.6, 'MP-06': 1.2, 'MP-07': 0.4 }),
  pt('MT-03', 'Jardinera rectangular', 'Macetas', 6, 7, 130, { 'MP-01': 120, 'MP-02': 0.08, 'MP-03': 0.06, 'MP-04': 3, 'MP-09': 0.3, 'MP-05': 0.3, 'MP-06': 0.6, 'MP-07': 0.2 }),
  pt('BO-03', 'Bolardo bajo', 'Bolardos', 8, 6, 45, { 'MP-01': 32, 'MP-02': 0.02, 'MP-03': 0.02, 'MP-04': 0.8, 'MP-05': 0.08, 'MP-06': 0.15, 'MP-07': 0.06 }),
  pt('PI-02', 'Adoquín ecológico (m2)', 'Pisos', 30, 10, 28, { 'MP-01': 24, 'MP-02': 0.018, 'MP-03': 0.018, 'MP-10': 1, 'MP-05': 0.05, 'MP-06': 0.1, 'MP-07': 0.03 }, 'm2'),
  pt('LV-02', 'Lavamanos redondo', 'Lavamanos', 2, 7, 135, { 'MP-01': 60, 'MP-08': 6, 'MP-02': 0.03, 'MP-03': 0.03, 'MP-04': 1.2, 'MP-11': 0.2, 'MP-05': 0.12, 'MP-06': 0.3, 'MP-07': 0.1 }),
  pt('CA-02', 'Caneca doble', 'Canecas', 3, 9, 140, { 'MP-01': 110, 'MP-02': 0.06, 'MP-03': 0.05, 'MP-04': 3, 'MP-05': 0.25, 'MP-06': 0.45, 'MP-07': 0.18, 'MP-15': 0.1 }),
  pt('BI-02', 'Bicicletero 3 plazas', 'Bicicleteros', 3, 8, 140, { 'MP-01': 100, 'MP-02': 0.06, 'MP-03': 0.05, 'MP-04': 3.5, 'MP-05': 0.28, 'MP-06': 0.5, 'MP-07': 0.15, 'MP-14': 6 }),
];

// Existencia final (unidad base) de los articulos nuevos
export const OBJETIVO_EXTRA: [string, string, number][] = [
  ['MP-08', 'b1', 180], ['MP-08', 'b2', 40], ['MP-09', 'b1', 35], ['MP-10', 'b1', 150], ['MP-11', 'b1', 70], ['MP-12', 'b1', 9],
  ['MP-13', 'b1', 55], ['MP-14', 'b1', 120], ['MP-15', 'b1', 45],
  ['BC-03', 'b1', 7], ['BC-03', 'b3', 3], ['BC-04', 'b1', 2], ['MC-03', 'b1', 4], ['MC-03', 'b3', 1], ['MT-03', 'b1', 14], ['MT-03', 'b2', 5],
  ['BO-03', 'b1', 18], ['BO-03', 'b2', 8], ['PI-02', 'b1', 80], ['LV-02', 'b1', 4], ['CA-02', 'b1', 5], ['CA-02', 'b3', 2], ['BI-02', 'b1', 2],
];

// ---------------------------------------------------------------- Plan de compras: proveedor -> materias primas
const PROV: Record<string, { mps: string[]; pago: 'pago_posterior' | 'anticipo'; pct?: number; cond: string }> = {
  'p-cementos': { mps: ['MP-01', 'MP-08'], pago: 'pago_posterior', cond: 'Pago a 15 días' },
  'p-agregados': { mps: ['MP-02', 'MP-03', 'MP-12'], pago: 'pago_posterior', cond: 'Contra entrega' },
  'p-aceros': { mps: ['MP-04', 'MP-10', 'MP-14'], pago: 'anticipo', pct: 30, cond: 'Anticipo 30 % y saldo contra entrega' },
  'p-quimicos': { mps: ['MP-05', 'MP-07', 'MP-11', 'MP-13', 'MP-15'], pago: 'anticipo', pct: 50, cond: 'Anticipo 50 % y saldo a 30 días' },
  'p-pigmentos': { mps: ['MP-06', 'MP-09'], pago: 'pago_posterior', cond: 'Pago a 30 días' },
};
// Presentacion de compra (unidad y factor a base) y precio por unidad base de los 15 insumos
const PRES: Record<string, { u: string; f: number; precio: number }> = {
  'MP-01': { u: 'saco50', f: 50, precio: 0.164 }, 'MP-02': { u: 'm3', f: 1, precio: 22 }, 'MP-03': { u: 'm3', f: 1, precio: 24 }, 'MP-04': { u: 'var6', f: 6, precio: 1.83 },
  'MP-05': { u: 'cub19', f: 19, precio: 4.47 }, 'MP-06': { u: 'saco25', f: 25, precio: 2.4 }, 'MP-07': { u: 'tamb200', f: 200, precio: 3.1 },
  'MP-08': { u: 'saco25', f: 25, precio: 0.45 }, 'MP-09': { u: 'caja', f: 10, precio: 6.5 }, 'MP-10': { u: 'rollo', f: 30, precio: 3.8 }, 'MP-11': { u: 'cub19', f: 19, precio: 5.2 },
  'MP-12': { u: 'm3', f: 1, precio: 26 }, 'MP-13': { u: 'cub19', f: 19, precio: 6.1 }, 'MP-14': { u: 'caja', f: 100, precio: 0.12 }, 'MP-15': { u: 'cub19', f: 19, precio: 7.4 },
};

// Productos terminados y su receta (existentes + nuevos). Las recetas de los existentes se repiten aqui en unidad base.
const R = (c: number, a: number, g: number, v: number, ad: number, p: number, d: number): Rec => ({ 'MP-01': c, 'MP-02': a, 'MP-03': g, 'MP-04': v, 'MP-05': ad, 'MP-06': p, 'MP-07': d });
const PT_PLAN: { sku: string; rec: Rec; lote: [number, number]; existente: boolean }[] = [
  { sku: 'BC-01', rec: R(200, 0.12, 0.1, 6, 0.5, 1, 0.3), lote: [3, 6], existente: true },
  { sku: 'BC-02', rec: R(260, 0.16, 0.13, 8, 0.6, 1.3, 0.4), lote: [2, 4], existente: true },
  { sku: 'MC-01', rec: R(180, 0.1, 0.09, 5, 0.45, 0.9, 0.25), lote: [2, 4], existente: true },
  { sku: 'MC-02', rec: R(210, 0.12, 0.1, 6, 0.5, 1, 0.3), lote: [2, 3], existente: true },
  { sku: 'MT-01', rec: R(60, 0.04, 0.03, 1.5, 0.15, 0.3, 0.1), lote: [10, 24], existente: true },
  { sku: 'MT-02', rec: R(110, 0.07, 0.06, 3, 0.28, 0.55, 0.18), lote: [6, 12], existente: true },
  { sku: 'BO-01', rec: R(45, 0.03, 0.02, 1, 0.1, 0.2, 0.08), lote: [4, 10], existente: true },
  { sku: 'BO-02', rec: R(40, 0.025, 0.02, 1, 0.1, 0.2, 0.07), lote: [10, 20], existente: true },
  { sku: 'CA-01', rec: R(70, 0.04, 0.03, 2, 0.15, 0.3, 0.12), lote: [4, 8], existente: true },
  { sku: 'BI-01', rec: R(150, 0.09, 0.07, 5, 0.4, 0.7, 0.22), lote: [2, 4], existente: true },
  { sku: 'LV-01', rec: R(55, 0.03, 0.03, 1.2, 0.12, 0.25, 0.1), lote: [3, 6], existente: true },
  { sku: 'CC-01', rec: R(35, 0.02, 0.02, 0, 0.08, 0.15, 0.06), lote: [8, 16], existente: true },
  { sku: 'PI-01', rec: R(28, 0.02, 0.02, 2, 0.05, 0.1, 0.03), lote: [40, 90], existente: true },
  ...ARTICULOS_EXTRA.filter((a) => a.tipo === 'producto_terminado').map((a) => ({
    sku: a.sku, rec: Object.fromEntries((a.receta ?? []).map((x) => [x.sku, x.cantidadBase])) as Rec, lote: (a.unidadBaseId === 'm2' ? [40, 90] : [3, 9]) as [number, number], existente: false,
  })),
];
// Existencia final por bodega de los productos (para calcular lo que se vendio): existentes + nuevos
const FINAL_B1: Record<string, number> = { 'BC-01': 8, 'BC-02': 2, 'MC-01': 3, 'MC-02': 0, 'MT-01': 40, 'MT-02': 12, 'BO-01': 0, 'BO-02': 20, 'CA-01': 6, 'BI-01': 3, 'LV-01': 5, 'CC-01': 14, 'PI-01': 60,
  ...Object.fromEntries(OBJETIVO_EXTRA.filter(([s, b]) => b === 'b1' && !s.startsWith('MP')).map(([s, , q]) => [s, q])) };
// Cuanto salio de b1 en el seed actual (suma de RECIENTES y extra.ts) para no dejar saldos iniciales negativos
const NETO_PREVIO_B1: Record<string, number> = { 'MT-01': -3, 'BO-02': -10, 'PI-01': -10, 'CC-01': -2, 'BI-01': 2, 'MT-02': -2, 'BC-01': 0, 'LV-01': -2 };

// ---------------------------------------------------------------- Salida del generador
export interface MovGen { dias: number; horas?: number; sku: string; tipo: 'entrada_compra' | 'salida_fabricacion' | 'entrada_fabricacion' | 'traslado_salida' | 'traslado_entrada' | 'salida_venta' | 'salida_despacho' | 'ajuste'; origen?: string; destino?: string; cant: number; doc: string; docId: string; usuario: string; obs?: string }

const solicitudes: Solicitud[] = []; const compras: Compra[] = []; const solPago: SolicitudPago[] = []; const pagos: Pago[] = []; const recepciones: Recepcion[] = [];
const fabricaciones: Fabricacion[] = []; const traslados: Traslado[] = []; const despachos: Despacho[] = []; const eventos: EventoIntegracion[] = []; const ajustes: Ajuste[] = [];
const movs: MovGen[] = [];
let nSol = 20, nOc = 19, nRec = 5, nPag = 8, nPg = 3, nFab = 6, nLote = 6, nTrs = 6, nDsp = 21, nEvt = 10, nAju = 5;

// 1) Fabricaciones: lotes entre los dias 62 y 2
const consumoTotal: Record<string, number> = {}; const fabTotal: Record<string, number> = {}; const fabMinDia: Record<string, number> = {};
for (const p of PT_PLAN) {
  const lotes = p.existente ? entre(1, 2) : entre(1, 2);
  for (let i = 0; i < lotes; i++) {
    const cant = entre(p.lote[0], p.lote[1]); const dias = entre(8, 60); fabMinDia[p.sku] = Math.min(fabMinDia[p.sku] ?? 99, dias);
    const numero = num('FAB', nFab++); const lote = `FT-${String(nLote++).padStart(3, '0')}`;
    const consumos = Object.entries(p.rec).map(([sku, c]) => { const est = r3(c * cant); const real = r3(est * (1 + (rnd() - 0.5) * 0.04)); consumoTotal[sku] = (consumoTotal[sku] ?? 0) + real; return { sku, estandar: est, real }; });
    fabTotal[p.sku] = (fabTotal[p.sku] ?? 0) + cant;
    const des = r2(consumos.reduce((a, c) => a + (c.real - c.estandar), 0) / Math.max(1e-9, consumos.reduce((a, c) => a + c.estandar, 0)) * 100);
    fabricaciones.push({ id: numero.toLowerCase(), numero, creadoPor: 'u-daniela', creadoEn: hace(dias, 3), actualizadoEn: hace(dias), skuProducto: p.sku, lote, cantidadFabricada: cant, bodegaDestinoId: 'b1', bodegaOrigenInsumosId: 'b1',
      consumos, desviacionPct: des, requiereConfirmacionDirector: false, estado: 'confirmada', fechaFabricacion: hace(dias, 3),
      historial: [h(hace(dias, 3), 'u-daniela', 'Fabricación registrada', undefined, 'borrador'), h(hace(dias), 'u-daniela', 'Fabricación confirmada: consumos y producto terminado registrados', 'borrador', 'confirmada')] });
    for (const c of consumos) movs.push({ dias, sku: c.sku, tipo: 'salida_fabricacion', origen: 'b1', cant: c.real, doc: 'Fabricación', docId: numero.toLowerCase(), usuario: 'u-daniela', obs: `${numero}: consumo de insumo` });
    movs.push({ dias, sku: p.sku, tipo: 'entrada_fabricacion', destino: 'b1', cant, doc: 'Fabricación', docId: numero.toLowerCase(), usuario: 'u-daniela', obs: `${numero}: ingreso de producto terminado` });
  }
}

// 2) Compras completas por proveedor: 3 lotes de compra con recepcion anterior a las fabricaciones
const solicitantes = ['u-carlos', 'u-daniela'];
const diasLote = [68, 52, 38];
for (const [provId, plan] of Object.entries(PROV)) {
  diasLote.forEach((baseDia, idx) => {
    const lineas = plan.mps.map((sku) => {
      const pr = PRES[sku]; const total = consumoTotal[sku] ?? 0;
      let unidades = Math.floor((total * 0.9) / pr.f / diasLote.length);
      if (unidades < 1) unidades = idx === 0 && total * 0.9 >= pr.f ? 1 : 0; // sin compra si el consumo no justifica ni una presentacion
      return { sku, cantidad: unidades, unidadId: pr.u, precioUnitario: r2(pr.precio * pr.f) };
    }).filter((l) => l.cantidad > 0);
    if (!lineas.length) return;
    const dRec = baseDia - entre(0, 3);                 // dia de la recepcion
    // Lotes recibidos pero SIN pagar (cuentas por pagar de Tesoreria): el mas reciente de cada proveedor y, en algunos, lotes mas antiguos (saldos vencidos de 31 a 60 y de mas de 60 dias)
    const pos = Object.keys(PROV).indexOf(provId);
    const abierta = idx === 2 || (idx === 1 && pos % 3 === 0) || (idx === 0 && pos === 1);
    const dSol = dRec + 9;
    const por = elige(solicitantes); const sId = num('SOL', nSol++); const sol = sId.toLowerCase();
    const prio: Prioridad = elige(['media', 'media', 'alta', 'baja']);
    solicitudes.push({ id: sol, numero: sId, creadoPor: por, creadoEn: hace(dSol, 3), actualizadoEn: hace(dRec), estado: abierta ? 'en_compra' : 'cerrada', area: por === 'u-daniela' ? 'Producción' : 'Planta', prioridad: prio,
      justificacion: 'Reposición programada de insumos para los lotes de fabricación del período.', adjuntos: [],
      lineas: lineas.map((l) => ({ sku: l.sku, cantidad: l.cantidad, unidadId: l.unidadId, destinoBodegaId: 'b1' })),
      historial: [h(hace(dSol, 3), por, 'Solicitud creada', undefined, 'borrador'), h(hace(dSol, 3), por, 'Solicitud enviada al director', 'borrador', 'pendiente'), h(hace(dSol - 1), 'u-marcela', 'Solicitud aprobada', 'pendiente', 'aprobada')] });
    const ocN = num('OC', nOc++); const oc = ocN.toLowerCase();
    const subtotal = r2(lineas.reduce((a, l) => a + l.cantidad * l.precioUnitario, 0)); const imp = r2(subtotal * 0.15); const total = r2(subtotal + imp);
    const aprobador = total <= 500 ? 'u-marcela' : 'u-julian';
    const dOc = dSol - 2;
    compras.push({ id: oc, numero: ocN, creadoPor: 'u-andres', creadoEn: hace(dOc, 3), actualizadoEn: hace(dRec - 8), solicitudId: sol, origen: 'solicitud', proveedorId: provId, lineas,
      cotizaciones: [{ proveedorId: provId, precios: lineas.map((l) => ({ sku: l.sku, precioUnitario: l.precioUnitario })), condiciones: plan.cond, diasEntrega: 6, seleccionada: true }],
      modalidadPago: plan.pago, porcentajeAnticipo: plan.pct, condiciones: plan.cond, fechaEstimadaEntrega: hace(dRec), subtotal, impuestoInformativo: imp, total,
      estado: abierta ? 'recibida' : 'cerrada', estadoRecepcion: 'completa', estadoPago: abierta ? (plan.pago === 'anticipo' ? 'anticipo' : 'sin_pago') : 'pagado', ordenGenerada: true,
      historial: [h(hace(dOc, 3), 'u-andres', `Orden creada desde ${sId}`, undefined, 'borrador'), h(hace(dOc, 2), 'u-andres', 'Enviada a aprobación', 'borrador', 'pendiente_aprobacion'),
        h(hace(dOc - 1), aprobador, 'Orden aprobada', 'pendiente_aprobacion', 'aprobada'), h(hace(dRec), 'u-sergio', `Recepción completa ${num('REC', nRec)}`, 'aprobada', 'recibida'), ...(abierta ? [] : [h(hace(dRec - 8), 'u-paola', 'Pago registrado y conciliado', 'recibida', 'cerrada')])] });
    sol && (solicitudes[solicitudes.length - 1].historial.push(h(hace(dOc), 'u-andres', `Compra ${ocN} generada`, 'aprobada', 'en_compra'), ...(abierta ? [] : [h(hace(dRec - 8), 'u-paola', 'Solicitud cerrada', 'en_compra', 'cerrada')])));
    const recN = num('REC', nRec++);
    recepciones.push({ id: recN.toLowerCase(), numero: recN, creadoPor: 'u-sergio', creadoEn: hace(dRec), actualizadoEn: hace(dRec), compraId: oc, bodegaId: 'b1', estado: 'confirmada', esCierre: true,
      lineas: lineas.map((l) => ({ sku: l.sku, ordenado: l.cantidad, recibidoAntes: 0, recibidoAhora: l.cantidad, faltante: 0, unidadId: l.unidadId })), historial: [h(hace(dRec), 'u-sergio', 'Recepción confirmada', undefined, 'confirmada')] });
    for (const l of lineas) movs.push({ dias: dRec, sku: l.sku, tipo: 'entrada_compra', destino: 'b1', cant: r3(l.cantidad * PRES[l.sku].f), doc: 'Recepción', docId: recN.toLowerCase(), usuario: 'u-sergio', obs: `${ocN}: ${l.cantidad} ${l.unidadId}` });
    // pagos: con anticipo se generan dos solicitudes de pago (anticipo y saldo)
    const nuevoPago = (tipo: 'anticipo' | 'pago_final', importe: number, dia: number, obs?: string, conciliar = true) => {
      const pN = num('PAG', nPag++); const id = pN.toLowerCase();
      solPago.push({ id, numero: pN, creadoPor: 'u-paola', creadoEn: hace(dia, 4), actualizadoEn: hace(dia), compraId: oc, tipo, importe, observacion: obs, estado: conciliar ? 'conciliada' : 'pagada',
        historial: [h(hace(dia, 4), 'u-paola', 'Solicitud de pago preparada', undefined, 'preparada'), h(hace(dia, 3), 'u-paola', 'Enviada a aprobación', 'preparada', 'pendiente_aprobacion'), h(hace(dia, 2), 'u-paola', 'Pago aprobado', 'pendiente_aprobacion', 'aprobada'),
          h(hace(dia, 1), 'u-paola', 'Pago registrado con comprobante', 'aprobada', 'pagada'), ...(conciliar ? [h(hace(dia), 'u-paola', 'Pago conciliado', 'pagada', 'conciliada')] : [])] });
      const pgN = num('pg', nPg++).toLowerCase();
      pagos.push({ id: pgN, solicitudPagoId: id, fecha: hace(dia, 1), importe, medio: elige(['transferencia', 'transferencia', 'cheque']), comprobante: `comprobante-${pN.toLowerCase()}.pdf`, registradoPor: 'u-paola' });
    };
    if (plan.pago === 'anticipo') {
      const ant = r2(total * (plan.pct ?? 50) / 100);
      nuevoPago('anticipo', ant, dOc - 4, `Anticipo ${plan.pct} % según condiciones del proveedor`, !abierta); if (!abierta) nuevoPago('pago_final', r2(total - ant), dRec - 8);
    } else if (!abierta) nuevoPago('pago_final', total, dRec - 8);
  });
}

// 3) Traslados historicos que llevan producto a b2 y b3 (y la venta de showroom posterior)
const salidaB1Traslado: Record<string, number> = {};
for (const [sku, bodega, obj] of OBJETIVO_EXTRA.filter(([s, b]) => !s.startsWith('MP') && b !== 'b1')) {
  const vendidas = 1; const cant = obj + vendidas; const dias = entre(18, 28);
  const tN = num('TRS', nTrs++); const id = tN.toLowerCase(); salidaB1Traslado[sku] = (salidaB1Traslado[sku] ?? 0) + cant;
  traslados.push({ id, numero: tN, creadoPor: 'u-sergio', creadoEn: hace(dias, 4), actualizadoEn: hace(dias - 1), origenId: 'b1', destinoId: bodega, estado: 'recibido', lineas: [{ sku, cantidadEnviada: cant, cantidadRecibida: cant }],
    historial: [h(hace(dias, 4), 'u-sergio', 'Traslado creado', undefined, 'borrador'), h(hace(dias, 3), 'u-sergio', 'Traslado despachado', 'borrador', 'en_transito'), h(hace(dias - 1), 'u-sergio', 'Recepción confirmada en destino', 'en_transito', 'recibido')] });
  movs.push({ dias, horas: 3, sku, tipo: 'traslado_salida', origen: 'b1', destino: bodega, cant, doc: 'Traslado', docId: id, usuario: 'u-sergio', obs: `${tN}: salida hacia ${bodega.toUpperCase()}` });
  movs.push({ dias: dias - 1, sku, tipo: 'traslado_entrada', destino: bodega, cant, doc: 'Traslado', docId: id, usuario: 'u-sergio', obs: `${tN}: entrada desde B1` });
  // venta de una unidad desde esa bodega
  const dN = num('DSP', nDsp++); const dd = dias - 5;
  despachos.push({ id: dN.toLowerCase(), numero: dN, creadoPor: 'u-camila', creadoEn: hace(dd, 2), actualizadoEn: hace(dd), canal: 'punto_venta', bodegaId: bodega, cliente: 'Cliente de mostrador', destino: 'Showroom', documentoReferencia: `VTA-2026-${String(110 + nDsp).padStart(4, '0')}`, lineas: [{ sku, cantidad: vendidas }], estado: 'confirmado', estadoAdministrativo: 'descargado_contabilidad',
    historial: [h(hace(dd, 2), 'u-camila', 'Despacho registrado', undefined, 'pendiente_salida'), h(hace(dd), 'u-sergio', 'Salida física confirmada', 'pendiente_salida', 'confirmado')] });
  movs.push({ dias: dd, sku, tipo: 'salida_venta', origen: bodega, cant: vendidas, doc: 'Despacho', docId: dN.toLowerCase(), usuario: 'u-sergio' });
}

// 4) Despachos desde b1 por producto: la venta total deja el saldo inicial en un valor positivo y pequeno
const CLIENTES = ['Constructora Andina S.A.', 'Municipio de Cumbayá', 'Hotel Boutique Mirador', 'Conjunto Residencial Los Cedros', 'Parque Industrial Norte', 'Universidad Técnica Demo', 'Restaurante El Fogón', 'Urbanización Altos del Valle', 'Clínica Santa Marta', 'Centro Comercial Plaza Sol', 'Colegio San Patricio', 'Jardines del Sur S.A.', 'Hacienda La Esperanza', 'Cooperativa Vivienda Nueva'];
const PROYECTOS = ['Parque lineal', 'Plaza central', 'Áreas comunales', 'Accesos vehiculares', 'Mobiliario urbano', 'Jardinería', 'Ciclovía'];
for (const p of PT_PLAN) {
  const F = fabTotal[p.sku] ?? 0; if (!F) continue;
  const finalB1 = FINAL_B1[p.sku] ?? 0; const out = salidaB1Traslado[p.sku] ?? 0; const previo = NETO_PREVIO_B1[p.sku] ?? 0;
  // saldo inicial = final - (F - ventas - traslados + previo) >= 2  ->  ventas >= F - traslados + previo - final + 2
  let ventas = Math.max(Math.ceil(F * 0.5), F - out + previo - finalB1 + 2);
  if (ventas > F) ventas = F;           // si no alcanza, se vende todo lo fabricado
  if (ventas <= 0) continue;
  const n = p.lote[1] > 20 ? entre(2, 4) : Math.min(ventas, entre(2, 4)); let resto = ventas;
  for (let i = 0; i < n && resto > 0; i++) {
    const cant = i === n - 1 ? resto : Math.max(1, Math.min(resto, Math.round(ventas / n))); resto -= cant;
    const dd = entre(1, Math.max(1, (fabMinDia[p.sku] ?? 8) - 1)); const canal = rnd() < 0.2 ? 'tienda_en_linea' : 'despacho_cliente';
    const dN = num('DSP', nDsp++); const id = dN.toLowerCase();
    const cliente = canal === 'tienda_en_linea' ? 'Cliente tienda en línea' : elige(CLIENTES);
    despachos.push({ id, numero: dN, creadoPor: 'u-camila', creadoEn: hace(dd, 2), actualizadoEn: hace(dd), canal, bodegaId: 'b1', cliente, destino: canal === 'tienda_en_linea' ? 'Envío a domicilio' : 'Dirección del cliente (ilustrativo)',
      documentoReferencia: canal === 'tienda_en_linea' ? `SHP-${10100 + nDsp}` : `COT-2026-${String(100 + nDsp).padStart(3, '0')}`, proyecto: canal === 'despacho_cliente' && rnd() < 0.5 ? elige(PROYECTOS) : undefined,
      lineas: [{ sku: p.sku, cantidad: cant }], estado: 'confirmado', estadoAdministrativo: dd > 10 || rnd() < 0.5 ? 'descargado_contabilidad' : 'sin_descargar',
      historial: [h(hace(dd, 2), 'u-camila', 'Despacho registrado', undefined, 'pendiente_salida'), h(hace(dd), 'u-sergio', 'Salida física confirmada', 'pendiente_salida', 'confirmado')] });
    movs.push({ dias: dd, sku: p.sku, tipo: canal === 'tienda_en_linea' ? 'salida_venta' : 'salida_despacho', origen: 'b1', cant, doc: 'Despacho', docId: id, usuario: 'u-sergio' });
    if (canal === 'tienda_en_linea') {
      const eN = num('EVT', nEvt++);
      eventos.push({ id: eN.toLowerCase(), canal: 'tienda_en_linea', idExterno: despachos[despachos.length - 1].documentoReferencia, tipo: 'pedido_creado', estado: 'aplicado', fecha: hace(dd, 1), detalle: `Pedido ${despachos[despachos.length - 1].documentoReferencia}: ${cant} x ${p.sku} descontado de la Bodega 1 (${dN}).`, intentos: 1, numero: eN, sku: p.sku, cantidad: cant, despachoId: id });
    }
  }
}

// 5) Ajustes historicos aprobados / rechazados
const AJ: { sku: string; q: number; dias: number; mot: string; tipo: Ajuste['tipoAjuste']; ok: boolean }[] = [
  { sku: 'MP-01', q: -40, dias: 33, mot: 'Merma por sacos rotos en el patio de descarga.', tipo: 'merma', ok: true },
  { sku: 'MP-02', q: -0.4, dias: 27, mot: 'Conteo físico del patio de agregados.', tipo: 'conteo_fisico', ok: true },
  { sku: 'MP-07', q: -6, dias: 21, mot: 'Derrame durante el trasvase del tambor.', tipo: 'merma', ok: true },
  { sku: 'MP-04', q: -12, dias: 15, mot: 'Varillas dañadas por humedad, no aptas para fabricar.', tipo: 'merma', ok: true },
  { sku: 'MP-06', q: 8, dias: 12, mot: 'Conteo físico: sobrante de pigmento sin registrar.', tipo: 'conteo_fisico', ok: false },
];
for (const a of AJ) {
  const aN = num('AJU', nAju++); const id = aN.toLowerCase();
  ajustes.push({ id, numero: aN, creadoPor: 'u-sergio', creadoEn: hace(a.dias, 3), actualizadoEn: hace(a.dias), sku: a.sku, bodegaId: 'b1', cantidadBase: a.q, tipoAjuste: a.tipo, motivo: a.mot, estado: a.ok ? 'aprobado' : 'rechazado',
    historial: [h(hace(a.dias, 3), 'u-sergio', 'Ajuste solicitado', undefined, 'pendiente', a.mot), h(hace(a.dias), 'u-marcela', a.ok ? 'Ajuste aprobado' : 'Ajuste rechazado', 'pendiente', a.ok ? 'aprobado' : 'rechazado', a.ok ? undefined : 'Verifique el conteo con otra persona y vuelva a solicitarlo.')] });
  if (a.ok) movs.push({ dias: a.dias, sku: a.sku, tipo: 'ajuste', destino: 'b1', cant: a.q, doc: 'Ajuste', docId: id, usuario: 'u-sergio', obs: `${aN}: ${a.mot}` });
}

// 6) Eventos de integracion variados (duplicados, errores y reintentos)
for (const [i, ev] of [['SHP-10090', 'duplicado'], ['SHP-10091', 'reintentado'], ['SHP-10092', 'duplicado'], ['SHP-10093', 'reintentado']].entries()) {
  const eN = num('EVT', nEvt++); const [idExt, estado] = ev;
  eventos.push({ id: eN.toLowerCase(), canal: 'tienda_en_linea', idExterno: idExt, tipo: 'pedido_creado', estado: estado as EventoIntegracion['estado'], fecha: hace(8 + i * 5, 3),
    detalle: estado === 'duplicado' ? `Evento repetido: el pedido ${idExt} ya se había aplicado. No se descontó stock.` : `Pedido ${idExt} aplicado tras reintento (stock repuesto).`, intentos: estado === 'duplicado' ? 1 : 2, numero: eN, sku: 'MT-01', cantidad: 1 });
}

// 7) Proveedores adicionales, auditoria y notificaciones de historia
export const PROVEEDORES_VOLUMEN: Proveedor[] = [];
export const AUDITORIA_EXTRA: AuditoriaItem[] = [
  { id: 'aud-0002', fecha: hace(60), usuarioId: 'u-laura', entidad: 'Usuarios', accion: 'Alta de usuario', detalle: 'Se creó el usuario Daniela Rojas con el rol Producción.' },
  { id: 'aud-0003', fecha: hace(58), usuarioId: 'u-laura', entidad: 'Bodegas', accion: 'Alta de bodega', detalle: 'Se activó la Bodega 3 - Punto de venta / showroom.' },
  { id: 'aud-0004', fecha: hace(45), usuarioId: 'u-laura', entidad: 'Catálogo', accion: 'Nuevo artículo', detalle: 'Se agregaron los insumos MP-08 a MP-15 y 9 productos terminados nuevos.' },
  { id: 'aud-0005', fecha: hace(33), usuarioId: 'u-laura', entidad: 'Proveedores', accion: 'Alta de proveedor', detalle: 'Se agregaron Pigmentos y Color del Ecuador y Moldes y Encofrados Andinos.' },
  { id: 'aud-0006', fecha: hace(25), usuarioId: 'u-laura', entidad: 'Parámetros', accion: 'Cambio de parámetro', detalle: 'Umbral de compra: de 400 a 500 USD.' },
  { id: 'aud-0007', fecha: hace(18), usuarioId: 'u-laura', entidad: 'Usuarios', accion: 'Cambio de roles', detalle: 'Andrés Pineda ahora tiene los roles Compras y Solicitante / Planta.' },
  { id: 'aud-0008', fecha: hace(9), usuarioId: 'u-laura', entidad: 'Proveedores', accion: 'Desactivación', detalle: 'Ferretería Industrial La Unión pasó a inactivo.' },
];
const nt = (n: number, dias: number, roles: Notificacion['destinatarioRoles'], tipo: Notificacion['tipo'], titulo: string, mensaje: string, docTipo: string, docId: string, ruta: string, leida: string[]): Notificacion =>
  ({ id: `n-${String(n).padStart(3, '0')}`, fecha: hace(dias), destinatarioRoles: roles, tipo, titulo, mensaje, docTipo, docId, ruta, leidaPor: leida });
export const NOTIFICACIONES_HIST: Notificacion[] = [
  nt(40, 4, ['tesoreria'], 'exito', 'Pago PAG-0006 conciliado', 'El pago de la orden OC-0016 quedó conciliado.', 'SolicitudPago', 'pag-0006', '/tesoreria/pag-0006', ['u-paola']),
  nt(41, 6, ['director'], 'exito', 'Ajuste AJU-0004 aprobado', 'Se registró la corrección de pigmento en la Bodega 1.', 'Ajuste', 'aju-0004', '/materias-primas?doc=aju-0004', ['u-marcela']),
  nt(42, 7, ['produccion'], 'exito', 'Fabricación confirmada', 'Lote FT-002 de 10 macetas medianas registrado en la Bodega 1.', 'Fabricación', 'fab-0004', '/fabricacion/fab-0004', ['u-daniela']),
  nt(43, 8, ['ventas'], 'info', 'Despacho DSP-0014 confirmado', 'Almacén confirmó la salida de 6 bolardos cilíndricos.', 'Despacho', 'dsp-0014', '/ventas/dsp-0014', ['u-camila']),
  nt(44, 12, ['compras'], 'info', 'Orden OC-0016 recibida', 'La orden de cemento se recibió completa en la Bodega 1.', 'Compra', 'oc-0016', '/compras/oc-0016', ['u-andres']),
  nt(45, 15, ['almacen'], 'exito', 'Traslado TRS-0004 recibido', 'Los lavamanos llegaron a la Bodega 3 sin diferencias.', 'Traslado', 'trs-0004', '/traslados/trs-0004', ['u-sergio']),
  nt(46, 20, ['aprobador_compra'], 'info', 'Orden aprobada', 'Aprobaste la orden de insumos químicos por $1.034,00.', 'Compra', 'oc-0020', '/compras/oc-0020', ['u-julian']),
  nt(47, 24, ['admin'], 'info', 'Parámetros actualizados', 'El umbral de compra quedó en 500 USD.', 'Parametros', 'umbral', '/administracion', ['u-laura']),
  nt(48, 30, ['tesoreria'], 'exito', 'Pago aprobado', 'Aprobaste un anticipo de la orden de varilla y malla.', 'SolicitudPago', 'pag-0010', '/tesoreria/pag-0010', ['u-paola']),
];

export const VOLUMEN = {
  solicitudes, compras, solicitudesPago: solPago, pagos, recepciones, fabricaciones, traslados, despachos, eventos, ajustes, movimientos: movs,
};

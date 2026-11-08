import type { ExistenciaItem, Movimiento, TipoMovimiento } from '../types';
import { hace } from '../lib/formato';
import { redondear } from './ayudas';
import { COMPROMETIDO_EXTRA, MOVIMIENTOS_EXTRA, TRANSITO_EXTRA } from './extra';
import { OBJETIVO_EXTRA, VOLUMEN } from './volumen';

// Existencia objetivo (estado final) en unidad base, segun la seccion 13 del maestro.
const OBJETIVO: [string, string, number][] = [
  ['MP-01', 'b1', 1200], ['MP-01', 'b2', 200], ['MP-02', 'b1', 6], ['MP-03', 'b1', 5], ['MP-04', 'b1', 300],
  ['MP-05', 'b1', 38], ['MP-06', 'b1', 50], ['MP-07', 'b1', 120],
  ['BC-01', 'b1', 8], ['BC-01', 'b2', 0], ['BC-01', 'b3', 4], ['BC-02', 'b1', 2], ['BC-02', 'b3', 0],
  ['MC-01', 'b1', 3], ['MC-01', 'b3', 1], ['MC-02', 'b1', 0], ['MC-02', 'b3', 0],
  ['MT-01', 'b1', 40], ['MT-01', 'b3', 15], ['MT-02', 'b1', 12], ['MT-02', 'b2', 6],
  ['BO-01', 'b1', 0], ['BO-02', 'b1', 20], ['BO-02', 'b2', 10],
  ['CA-01', 'b1', 6], ['CA-01', 'b3', 2], ['BI-01', 'b1', 3], ['LV-01', 'b1', 5], ['LV-01', 'b3', 2],
  ['CC-01', 'b1', 14], ['PI-01', 'b1', 60],
];

// Comprometido por despachos pendientes de salida (DSP-0007: 2 MT-01 en B1)
const COMPROMETIDO: Record<string, number> = { 'MT-01|b1': 2, ...COMPROMETIDO_EXTRA };

export const crearExistencias = (): ExistenciaItem[] =>
  OBJETIVO.map(([sku, bodegaId, fisica]) => ({ sku, bodegaId, fisica, comprometida: COMPROMETIDO[`${sku}|${bodegaId}`] ?? 0, enTransito: TRANSITO_EXTRA[`${sku}|${bodegaId}`] ?? 0 }));

const tipoArt = (sku: string): Movimiento['tipoArticulo'] => (sku.startsWith('MP') ? 'materia_prima' : 'producto_terminado');

type M = { dias: number; horas?: number; sku: string; tipo: TipoMovimiento; origen?: string; destino?: string; cant: number; doc: string; docId: string; usuario: string; obs?: string };

// Movimientos recientes (ultimos 14 dias) ligados a documentos existentes
const RECIENTES: M[] = [
  { dias: 10, sku: 'MP-04', tipo: 'entrada_compra', destino: 'b1', cant: 180, doc: 'Recepción', docId: 'rec-0001', usuario: 'u-sergio', obs: 'OC-0004: 30 var6 x 6 m' },
  { dias: 8, sku: 'MT-01', tipo: 'traslado_salida', origen: 'b1', cant: 5, doc: 'Traslado', docId: 'trs-0002', usuario: 'u-sergio' },
  { dias: 7, horas: 20, sku: 'MT-01', tipo: 'traslado_entrada', destino: 'b3', cant: 5, doc: 'Traslado', docId: 'trs-0002', usuario: 'u-sergio' },
  { dias: 12, sku: 'MT-01', tipo: 'salida_venta', origen: 'b3', cant: 2, doc: 'Despacho', docId: 'dsp-0009', usuario: 'u-sergio' },
  { dias: 9, sku: 'PI-01', tipo: 'salida_despacho', origen: 'b1', cant: 10, doc: 'Despacho', docId: 'dsp-0008', usuario: 'u-sergio' },
  { dias: 6, sku: 'BC-01', tipo: 'salida_venta', origen: 'b3', cant: 1, doc: 'Despacho', docId: 'dsp-0001', usuario: 'u-sergio' },
  { dias: 5, sku: 'BO-02', tipo: 'salida_despacho', origen: 'b1', cant: 4, doc: 'Despacho', docId: 'dsp-0003', usuario: 'u-sergio' },
  { dias: 4, sku: 'MT-02', tipo: 'salida_despacho', origen: 'b2', cant: 3, doc: 'Despacho', docId: 'dsp-0002', usuario: 'u-sergio' },
  { dias: 3, sku: 'LV-01', tipo: 'salida_venta', origen: 'b3', cant: 1, doc: 'Despacho', docId: 'dsp-0005', usuario: 'u-sergio' },
  { dias: 2, sku: 'CA-01', tipo: 'salida_venta', origen: 'b1', cant: 1, doc: 'Despacho', docId: 'dsp-0004', usuario: 'u-sergio', obs: 'Pedido SHP-10001' },
  { dias: 1, sku: 'CC-01', tipo: 'salida_despacho', origen: 'b1', cant: 2, doc: 'Despacho', docId: 'dsp-0006', usuario: 'u-sergio' },
];

// Movimientos adicionales de la demostracion (data/extra.ts)
RECIENTES.push(...MOVIMIENTOS_EXTRA, ...VOLUMEN.movimientos);
OBJETIVO.push(...OBJETIVO_EXTRA);

const esSalida = (t: TipoMovimiento) => ['salida_fabricacion', 'traslado_salida', 'salida_venta', 'salida_despacho'].includes(t);

/** Efecto neto de un movimiento sobre una bodega concreta */
function efecto(m: M, bodegaId: string): number {
  if (esSalida(m.tipo) && m.origen === bodegaId) return -m.cant;
  if (!esSalida(m.tipo) && m.destino === bodegaId) return m.cant;
  return 0;
}

/** Ledger coherente: saldo inicial (hace 30 dias) = existencia objetivo - efecto de los movimientos recientes */
export function crearMovimientos(): Movimiento[] {
  const lista: Movimiento[] = [];
  let n = 1;
  const id = () => `mov-${String(n++).padStart(4, '0')}`;
  for (const [sku, bodegaId, fisica] of OBJETIVO) {
    const neto = RECIENTES.filter((m) => m.sku === sku).reduce((a, m) => a + efecto(m, bodegaId), 0);
    const inicial = redondear(fisica - neto, 3);
    if (inicial !== 0) {
      lista.push({ id: id(), fecha: hace(75), sku, tipoArticulo: tipoArt(sku), tipo: 'ajuste', bodegaDestinoId: bodegaId, cantidadBase: inicial, documentoTipo: 'Saldo inicial', documentoId: 'saldo-inicial', usuarioId: 'u-laura', observacion: 'Saldo inicial de la demostración' });
    }
  }
  for (const m of RECIENTES) {
    lista.push({
      id: id(), fecha: hace(m.dias, m.horas ?? 0), sku: m.sku, tipoArticulo: tipoArt(m.sku), tipo: m.tipo,
      bodegaOrigenId: m.origen, bodegaDestinoId: m.destino, cantidadBase: m.cant,
      documentoTipo: m.doc, documentoId: m.docId, usuarioId: m.usuario, observacion: m.obs,
    });
  }
  return lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

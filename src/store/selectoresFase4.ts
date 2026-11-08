// Selectores de la Fase 4: producto terminado, transito, reservas y salidas.
import type { Despacho, ExistenciaItem, Reserva, Traslado } from '../types';
import type { Estado } from './useStore';

const redondear = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

export interface StockTerminado { fisica: number; comprometida: number; disponible: number; enTransito: number }

/** Existencias de un producto terminado en una bodega (o en todas). disponible = fisica - comprometida; el transito aparte (RN-09) */
export function disponibleTerminado(e: Estado | { existencias: ExistenciaItem[] }, sku: string, bodegaId?: string): StockTerminado {
  const filas = e.existencias.filter((x) => x.sku === sku && (!bodegaId || bodegaId === 'todas' || x.bodegaId === bodegaId));
  const fisica = redondear(filas.reduce((a, x) => a + x.fisica, 0));
  const comprometida = redondear(filas.reduce((a, x) => a + x.comprometida, 0));
  const enTransito = redondear(filas.reduce((a, x) => a + x.enTransito, 0));
  return { fisica, comprometida, disponible: redondear(fisica - comprometida), enTransito };
}

/** Estado comercial del producto (RF-35): disponible verde, reservado ambar, agotado rojo */
export function estadoProducto(s: StockTerminado): 'disponible' | 'reservado' | 'agotado' {
  if (s.fisica <= 0) return 'agotado';
  if (s.disponible <= 0) return 'reservado';
  return 'disponible';
}

export function stockTerminadoPorBodega(e: Estado, bodegaId: string) {
  return e.articulos.filter((a) => a.tipo === 'producto_terminado' && a.activo).map((a) => ({ articulo: a, ...disponibleTerminado(e, a.sku, bodegaId) }));
}

/** Traslados en transito (RF-40) */
export const enTransito = (e: Estado): Traslado[] => e.traslados.filter((t) => t.estado === 'en_transito');

/** Cantidad de un SKU que esta en transito hacia una bodega destino */
export const reservasActivas = (e: Estado, sku?: string): Reserva[] => e.reservas.filter((r) => r.estado === 'activa' && (!sku || r.sku === sku));

/** Cantidad de un despacho aun comprometida para un SKU y bodega (solo si esta pendiente de salida) */
export const comprometidoPorDespacho = (d: Despacho, sku: string): number => (d.estado === 'pendiente_salida' ? d.lineas.filter((l) => l.sku === sku).reduce((a, l) => a + l.cantidad, 0) : 0);

/** Perdida en transito de un traslado con diferencias: enviado - recibido por linea */
export function perdidaEnTransito(t: Traslado): { sku: string; cantidad: number }[] {
  if (t.estado !== 'recibido_con_diferencias') return [];
  return t.lineas.filter((l) => (l.cantidadRecibida ?? l.cantidadEnviada) < l.cantidadEnviada).map((l) => ({ sku: l.sku, cantidad: redondear(l.cantidadEnviada - (l.cantidadRecibida ?? 0)) }));
}

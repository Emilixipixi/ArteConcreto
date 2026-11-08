// Calculos puros de fabricacion: consumo estandar, desviacion y suficiencia de insumos (RF-30 a RF-33).
import type { Articulo, ExistenciaItem, Fabricacion } from '../types';

export type ConsumoFab = Fabricacion['consumos'][number];
const redondear = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

/** Consumo estandar = receta x cantidad (unidad base de cada insumo) */
export function calcularConsumoEstandar(articulos: Articulo[], skuProducto: string, cantidad: number): { sku: string; estandar: number }[] {
  const prod = articulos.find((a) => a.sku === skuProducto);
  return (prod?.receta ?? []).map((r) => ({ sku: r.sku, estandar: redondear(r.cantidadBase * cantidad) }));
}

/** Desviacion porcentual del consumo real respecto del estandar. Un insumo extra (estandar 0) cuenta como 100 %. */
export function pctDesvio(estandar: number, real: number): number {
  if (estandar <= 0) return real > 0 ? 100 : 0;
  return redondear(((real - estandar) / estandar) * 100, 2);
}

/** Desviacion maxima (en valor absoluto) y si alguna linea sale de la tolerancia */
export function evaluarDesviacion(consumos: ConsumoFab[], tolerancia: number): { desviacionPct: number; requiereDirector: boolean } {
  const pcts = consumos.map((c) => Math.abs(pctDesvio(c.estandar, c.real)));
  const max = pcts.length ? Math.max(...pcts) : 0;
  return { desviacionPct: redondear(max, 2), requiereDirector: pcts.some((p) => p > tolerancia + 1e-9) };
}

export interface Faltante { sku: string; requerido: number; disponible: number; faltante: number }

/** Insumos que no alcanzan en la bodega de origen (RN-08) */
export function validarSuficiencia(existencias: ExistenciaItem[], consumos: ConsumoFab[], bodegaOrigenId: string): Faltante[] {
  const salida: Faltante[] = [];
  for (const c of consumos) {
    const fila = existencias.find((x) => x.sku === c.sku && x.bodegaId === bodegaOrigenId);
    const disponible = fila ? fila.fisica - fila.comprometida : 0;
    if (c.real - disponible > 1e-9) salida.push({ sku: c.sku, requerido: c.real, disponible: redondear(disponible), faltante: redondear(c.real - disponible) });
  }
  return salida;
}

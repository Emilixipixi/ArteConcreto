// Selectores de la Fase 3: pagos, saldos, recepciones pendientes y consistencia del inventario.
// Son funciones puras sobre el estado (sin importar selectores.ts para evitar ciclos de modulos).
import { diasDesde } from '../lib/formato';
import { aBase } from '../lib/unidades';
import type { Compra, LineaCompra, Movimiento, TipoMovimiento } from '../types';
import type { Estado } from './useStore';

const redondear = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const factorImpuesto = (e: Estado) => 1 + e.parametros.impuestoInformativoPct / 100;

/** Cantidad recibida por SKU (en la unidad de compra de la orden) sumando todas sus recepciones */
export function recibidoPorSku(e: Estado, compraId: string): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const r of e.recepciones.filter((x) => x.compraId === compraId))
    for (const l of r.lineas) acc[l.sku] = redondear((acc[l.sku] ?? 0) + l.recibidoAhora, 3);
  return acc;
}

/** Valor de lo efectivamente recibido (cantidad recibida x precio, con el impuesto informativo), RF-21 */
export function valorRecibido(e: Estado, compraId: string): number {
  const c = e.compras.find((x) => x.id === compraId);
  if (!c) return 0;
  const rec = recibidoPorSku(e, compraId);
  const subtotal = c.lineas.reduce((a, l) => a + (rec[l.sku] ?? 0) * l.precioUnitario, 0);
  return redondear(subtotal * factorImpuesto(e));
}

/** Suma de los pagos efectivamente registrados para una compra */
export function pagadoCompra(e: Estado, compraId: string): number {
  const ids = e.solicitudesPago.filter((s) => s.compraId === compraId).map((s) => s.id);
  return redondear(e.pagos.filter((p) => ids.includes(p.solicitudPagoId)).reduce((a, p) => a + p.importe, 0));
}

/** Importe de anticipo ya pagado */
export function anticipoPagadoImporte(e: Estado, compraId: string): number {
  const ids = e.solicitudesPago.filter((s) => s.compraId === compraId && s.tipo === 'anticipo').map((s) => s.id);
  return redondear(e.pagos.filter((p) => ids.includes(p.solicitudPagoId)).reduce((a, p) => a + p.importe, 0));
}

/** RN-19: el anticipo esta pagado si existe una solicitud de anticipo pagada o conciliada */
export const anticipoPagado = (e: Estado, compraId: string): boolean =>
  e.solicitudesPago.some((s) => s.compraId === compraId && s.tipo === 'anticipo' && ['pagada', 'conciliada'].includes(s.estado));

/** Solicitudes de pago final todavia en curso (aun no pagadas): reservan parte del saldo */
export function enCursoPagoFinal(e: Estado, compraId: string, excluirId?: string): number {
  return redondear(e.solicitudesPago
    .filter((s) => s.compraId === compraId && s.tipo === 'pago_final' && s.id !== excluirId && ['preparada', 'pendiente_aprobacion', 'aprobada'].includes(s.estado))
    .reduce((a, s) => a + s.importe, 0));
}

const hayRecepciones = (e: Estado, compraId: string) => e.recepciones.some((r) => r.compraId === compraId);

/** Base sobre la que se calcula el saldo: lo recibido; en una compra con anticipo y sin recepcion, el total de la orden */
function baseCobrable(e: Estado, c: Compra): number {
  if (hayRecepciones(e, c.id)) return valorRecibido(e, c.id);
  return c.modalidadPago === 'anticipo' ? c.total : 0;
}

/** Saldo por pagar de la compra (RF-21). Nunca negativo. */
export function saldoPorPagar(e: Estado, compraId: string): number {
  const c = e.compras.find((x) => x.id === compraId);
  if (!c) return 0;
  return Math.max(0, redondear(baseCobrable(e, c) - pagadoCompra(e, compraId)));
}

/** Saldo a favor: se pago mas de lo recibido una vez cerrada la recepcion (anticipo mayor que el valor recibido) */
export function saldoAFavor(e: Estado, compraId: string): number {
  const c = e.compras.find((x) => x.id === compraId);
  if (!c || c.estadoRecepcion !== 'completa') return 0;
  return Math.max(0, redondear(pagadoCompra(e, compraId) - valorRecibido(e, compraId)));
}

/** Importe maximo que se puede solicitar ahora (descontando solicitudes de pago final aun en curso) */
export function maximoSolicitable(e: Estado, compraId: string, tipo: 'anticipo' | 'pago_final', excluirId?: string): number {
  const c = e.compras.find((x) => x.id === compraId);
  if (!c) return 0;
  if (tipo === 'anticipo') return Math.max(0, redondear(c.total - pagadoCompra(e, compraId)));
  return Math.max(0, redondear(saldoPorPagar(e, compraId) - enCursoPagoFinal(e, compraId, excluirId)));
}

export interface CompraPorPreparar { compra: Compra; tipo: 'anticipo' | 'pago_final'; importeSugerido: number; motivo: string }

/** Compras que esperan que Tesoreria prepare una solicitud de pago (bandeja "Por preparar", RF-22) */
export function comprasPorPreparar(e: Estado): CompraPorPreparar[] {
  const lista: CompraPorPreparar[] = [];
  for (const c of e.compras) {
    if (c.modalidadPago === 'anticipo' && c.estado === 'aprobada' && !e.solicitudesPago.some((s) => s.compraId === c.id && s.tipo === 'anticipo')) {
      lista.push({ compra: c, tipo: 'anticipo', importeSugerido: redondear(c.total * (c.porcentajeAnticipo ?? 100) / 100), motivo: 'Orden aprobada con anticipo' });
      continue;
    }
    const recibida = ['recibida_parcial', 'recibida'].includes(c.estado);
    const anticipoOk = c.modalidadPago !== 'anticipo' || anticipoPagado(e, c.id);
    if (recibida && anticipoOk && c.estadoPago !== 'pagado') {
      const sug = maximoSolicitable(e, c.id, 'pago_final');
      if (sug > 0) lista.push({ compra: c, tipo: 'pago_final', importeSugerido: sug, motivo: c.modalidadPago === 'anticipo' ? 'Saldo por pagar tras la recepción' : 'Pago de lo recibido' });
    }
  }
  return lista;
}

/** Anticipos pagados cuya recepcion ya se cerro y esperan conciliacion (sin saldo por pagar en curso) */
export function anticiposPorConciliar(e: Estado) {
  return e.solicitudesPago.filter((s) => {
    if (s.tipo !== 'anticipo' || s.estado !== 'pagada') return false;
    const c = e.compras.find((x) => x.id === s.compraId);
    return !!c && c.estadoRecepcion === 'completa' && saldoPorPagar(e, c.id) === 0 && enCursoPagoFinal(e, c.id) === 0;
  });
}

export interface LineaPendiente { sku: string; ordenado: number; recibido: number; pendiente: number; unidadId: string }

export function pendientePorLinea(e: Estado, compra: Compra): LineaPendiente[] {
  const rec = recibidoPorSku(e, compra.id);
  return compra.lineas.map((l: LineaCompra) => {
    const recibido = rec[l.sku] ?? 0;
    return { sku: l.sku, ordenado: l.cantidad, recibido, pendiente: Math.max(0, redondear(l.cantidad - recibido, 3)), unidadId: l.unidadId };
  });
}

export interface RecepcionPendiente {
  compra: Compra; lineas: LineaPendiente[]; diasAtraso: number; vencida: boolean; bloqueadaPorAnticipo: boolean;
}

/** Ordenes aprobadas o parcialmente recibidas que esperan mercancia (bandeja de P-09) */
export function pendientesDeRecibir(e: Estado): RecepcionPendiente[] {
  return e.compras
    .filter((c) => ['aprobada', 'recibida_parcial'].includes(c.estado) && c.estadoRecepcion !== 'completa')
    .map((c) => {
      const vencido = new Date(c.fechaEstimadaEntrega).getTime() < Date.now();
      const diasAtraso = vencido ? diasDesde(c.fechaEstimadaEntrega) : 0;
      return {
        compra: c, lineas: pendientePorLinea(e, c), diasAtraso,
        vencida: diasAtraso > e.parametros.diasRecepcionVencida,
        bloqueadaPorAnticipo: c.modalidadPago === 'anticipo' && !anticipoPagado(e, c.id),
      };
    });
}

export const recepcionesVencidas = (e: Estado): RecepcionPendiente[] => pendientesDeRecibir(e).filter((x) => x.vencida);

// ---- Inventario ----
const SALIDAS: TipoMovimiento[] = ['salida_fabricacion', 'traslado_salida', 'salida_venta', 'salida_despacho'];

/** Efecto firmado de un movimiento sobre una bodega. Los ajustes se guardan firmados en bodegaDestinoId. */
export function efectoMovimiento(m: Movimiento, bodegaId: string): number {
  if (SALIDAS.includes(m.tipo)) return m.bodegaOrigenId === bodegaId ? -m.cantidadBase : 0;
  return m.bodegaDestinoId === bodegaId ? m.cantidadBase : 0;
}

/** Compara la suma de movimientos con las existencias fisicas. Devuelve las diferencias (vacio = consistente). */
export function inconsistenciasInventario(e: Estado): { sku: string; bodegaId: string; fisica: number; porMovimientos: number }[] {
  const salida: { sku: string; bodegaId: string; fisica: number; porMovimientos: number }[] = [];
  for (const x of e.existencias) {
    const suma = redondear(e.movimientos.filter((m) => m.sku === x.sku).reduce((a, m) => a + efectoMovimiento(m, x.bodegaId), 0), 3);
    if (Math.abs(suma - x.fisica) > 0.0005) salida.push({ sku: x.sku, bodegaId: x.bodegaId, fisica: x.fisica, porMovimientos: suma });
  }
  return salida;
}

/** Cantidad en unidad de compra de un stock en base (para el conmutador Unidad base / Unidad de compra, RF-28) */
export function unidadCompraDe(e: Estado, sku: string): { unidadId: string; factor: number } {
  const a = e.articulos.find((x) => x.sku === sku);
  if (!a) return { unidadId: '', factor: 1 };
  const p = a.presentaciones[0];
  return p ? { unidadId: p.unidadId, factor: aBase(1, p.unidadId, a) } : { unidadId: a.unidadBaseId, factor: 1 };
}

// Selectores de la Tesoreria ampliada: facturas, cuentas por pagar, conciliacion bancaria y estado de cuenta por proveedor.
import type { Compra, FacturaProveedor, MovimientoBanco, Pago } from '../types';
import { pagadoCompra, saldoPorPagar } from './selectoresFase3';
import type { Estado } from './useStore';

const DIA = 86400000;
const redondear = (n: number) => Math.round(n * 100) / 100;

/** Factura vigente de una compra (la ultima que no este anulada) */
export const facturaVigente = (e: Estado, compraId: string): FacturaProveedor | undefined =>
  [...e.facturas].filter((f) => f.compraId === compraId && f.estado !== 'anulada').sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))[0];

/** Compras ya recibidas (total o parcialmente) que todavia no tienen factura registrada */
export function comprasSinFactura(e: Estado): Compra[] {
  return e.compras
    .filter((c) => c.estadoRecepcion !== 'pendiente' && c.estado !== 'rechazada' && !facturaVigente(e, c.id))
    .sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn));
}

export type Tramo = 'por_vencer' | 'v1_30' | 'v31_60' | 'v60' | 'sin_factura';
export const TRAMOS: { clave: Tramo; texto: string }[] = [
  { clave: 'por_vencer', texto: 'Por vencer' }, { clave: 'v1_30', texto: 'Vencido 1-30 días' }, { clave: 'v31_60', texto: 'Vencido 31-60 días' },
  { clave: 'v60', texto: 'Vencido más de 60 días' }, { clave: 'sin_factura', texto: 'Sin factura' },
];

export interface FilaCxP {
  clave: string; compraId: string; compraNumero: string; proveedorId: string; proveedor: string; facturaId?: string; facturaNumero?: string;
  vencimiento?: string; saldo: number; dias: number; tramo: Tramo; // dias > 0 = vencido hace N dias; dias <= 0 = faltan N dias
}

/** Obligaciones abiertas con proveedores: compras recibidas con saldo por pagar */
export function cuentasPorPagar(e: Estado, ahora = Date.now()): FilaCxP[] {
  const filas: FilaCxP[] = [];
  for (const c of e.compras) {
    if (c.estadoRecepcion === 'pendiente' || c.estado === 'cerrada' || c.estado === 'rechazada') continue;
    const saldo = saldoPorPagar(e, c.id);
    if (saldo <= 0.005) continue;
    const f = facturaVigente(e, c.id);
    const dias = f ? Math.floor((ahora - new Date(f.fechaVencimiento).getTime()) / DIA) : 0;
    const tramo: Tramo = !f ? 'sin_factura' : dias <= 0 ? 'por_vencer' : dias <= 30 ? 'v1_30' : dias <= 60 ? 'v31_60' : 'v60';
    filas.push({
      clave: c.id, compraId: c.id, compraNumero: c.numero, proveedorId: c.proveedorId, proveedor: e.proveedores.find((p) => p.id === c.proveedorId)?.nombre ?? '-',
      facturaId: f?.id, facturaNumero: f?.numeroFactura, vencimiento: f?.fechaVencimiento, saldo, dias, tramo,
    });
  }
  return filas.sort((a, b) => (a.vencimiento ?? '9').localeCompare(b.vencimiento ?? '9'));
}

export const totalPorTramo = (filas: FilaCxP[]): Record<Tramo, number> =>
  filas.reduce((t, f) => ({ ...t, [f.tramo]: redondear(t[f.tramo] + f.saldo) }), { por_vencer: 0, v1_30: 0, v31_60: 0, v60: 0, sin_factura: 0 } as Record<Tramo, number>);

// ---------------- Conciliacion bancaria ----------------
/** Pagos con cuenta bancaria que aun no aparecen vinculados a ningun movimiento del extracto */
export const pagosSinMovimiento = (e: Estado, cuentaId?: string): Pago[] => {
  const usados = new Set(e.movimientosBanco.map((m) => m.pagoId).filter(Boolean));
  return e.pagos.filter((p) => p.cuentaId && (!cuentaId || p.cuentaId === cuentaId) && !usados.has(p.id)).sort((a, b) => b.fecha.localeCompare(a.fecha));
};

/** Pagos que podrian corresponder a un movimiento: mismo importe y cuenta, sin movimiento asignado */
export const candidatosPago = (e: Estado, m: MovimientoBanco): Pago[] =>
  pagosSinMovimiento(e, m.cuentaId).filter((p) => Math.abs(p.importe + m.monto) < 0.005);

/** Empareja (uno a uno) los movimientos sin conciliar con pagos del mismo importe: son pares por conciliar, no diferencias */
export function emparejarPendientes(e: Estado, cuentaId: string): { pares: [MovimientoBanco, Pago][]; movsSueltos: MovimientoBanco[]; pagosSueltos: Pago[] } {
  const pagos = pagosSinMovimiento(e, cuentaId); const usados = new Set<string>();
  const pares: [MovimientoBanco, Pago][] = []; const movsSueltos: MovimientoBanco[] = [];
  for (const m of e.movimientosBanco.filter((x) => x.cuentaId === cuentaId && x.estado === 'sin_conciliar')) {
    const p = pagos.find((x) => !usados.has(x.id) && Math.abs(x.importe + m.monto) < 0.005);
    if (p) { usados.add(p.id); pares.push([m, p]); } else movsSueltos.push(m);
  }
  return { pares, movsSueltos, pagosSueltos: pagos.filter((p) => !usados.has(p.id)) };
}

export function resumenBanco(e: Estado, cuentaId: string) {
  const cuenta = e.cuentasBancarias.find((c) => c.id === cuentaId);
  const movs = e.movimientosBanco.filter((m) => m.cuentaId === cuentaId);
  const saldoInicial = cuenta?.saldoInicial ?? 0;
  const saldoBanco = redondear(saldoInicial + movs.reduce((a, m) => a + m.monto, 0));
  const pagosCuenta = e.pagos.filter((p) => p.cuentaId === cuentaId).reduce((a, p) => a + p.importe, 0);
  const gastos = movs.filter((m) => m.estado === 'gasto_bancario').reduce((a, m) => a + m.monto, 0); // ya registrados en libros
  const saldoLibros = redondear(saldoInicial - pagosCuenta + gastos);
  const { pares, movsSueltos, pagosSueltos } = emparejarPendientes(e, cuentaId);
  const enTransito = redondear(pagosSueltos.reduce((a, p) => a + p.importe, 0));       // pagos que el banco aun no refleja
  const sinIdentificar = redondear(movsSueltos.reduce((a, m) => a + m.monto, 0));       // cargos del banco sin pago ni gasto (negativo)
  return { saldoBanco, saldoLibros, enTransito, sinIdentificar, diferencia: redondear(saldoBanco - saldoLibros), explicada: redondear(enTransito + sinIdentificar),
    sinConciliar: movs.filter((m) => m.estado === 'sin_conciliar').length, porConciliar: pares.length, nSueltos: movsSueltos.length };
}

// ---------------- Estado de cuenta por proveedor ----------------
export interface ResumenProveedor { proveedorId: string; nombre: string; comprado: number; facturado: number; pagado: number; saldo: number; vencido: number; ordenes: number }

export function resumenProveedores(e: Estado, ahora = Date.now()): ResumenProveedor[] {
  const cxp = cuentasPorPagar(e, ahora);
  return e.proveedores.map((p) => {
    const compras = e.compras.filter((c) => c.proveedorId === p.id && !['borrador', 'pendiente_aprobacion', 'devuelta', 'rechazada'].includes(c.estado));
    const facturado = e.facturas.filter((f) => f.proveedorId === p.id && f.estado !== 'anulada').reduce((a, f) => a + f.total, 0);
    const pagado = compras.reduce((a, c) => a + pagadoCompra(e, c.id), 0);
    const mias = cxp.filter((f) => f.proveedorId === p.id);
    return {
      proveedorId: p.id, nombre: p.nombre, ordenes: compras.length, comprado: redondear(compras.reduce((a, c) => a + c.total, 0)), facturado: redondear(facturado), pagado: redondear(pagado),
      saldo: redondear(mias.reduce((a, f) => a + f.saldo, 0)), vencido: redondear(mias.filter((f) => f.dias > 0).reduce((a, f) => a + f.saldo, 0)),
    };
  }).filter((r) => r.ordenes > 0).sort((a, b) => b.saldo - a.saldo);
}

export interface LineaEstadoCuenta { fecha: string; tipo: 'Factura' | 'Pago' | 'Anticipo'; documento: string; detalle: string; cargo: number; abono: number; saldo: number }

/** Libro del proveedor: facturas (cargo) y pagos (abono) en orden cronologico con saldo acumulado */
export function estadoCuentaProveedor(e: Estado, proveedorId: string): LineaEstadoCuenta[] {
  const compras = e.compras.filter((c) => c.proveedorId === proveedorId);
  const base: Omit<LineaEstadoCuenta, 'saldo'>[] = [];
  for (const f of e.facturas.filter((x) => x.proveedorId === proveedorId && x.estado !== 'anulada'))
    base.push({ fecha: f.fechaEmision, tipo: 'Factura', documento: f.numeroFactura, detalle: `Factura de ${compras.find((c) => c.id === f.compraId)?.numero ?? ''}`, cargo: f.total, abono: 0 });
  for (const p of e.pagos) {
    const sp = e.solicitudesPago.find((s) => s.id === p.solicitudPagoId);
    const c = compras.find((x) => x.id === sp?.compraId);
    if (!sp || !c) continue;
    base.push({ fecha: p.fecha, tipo: sp.tipo === 'anticipo' ? 'Anticipo' : 'Pago', documento: sp.numero, detalle: `${c.numero} - ${p.medio}${p.referencia ? ` ${p.referencia}` : ''}`, cargo: 0, abono: p.importe });
  }
  base.sort((a, b) => a.fecha.localeCompare(b.fecha));
  let acum = 0;
  return base.map((l) => { acum = redondear(acum + l.cargo - l.abono); return { ...l, saldo: acum }; });
}

// ---------------- Indicadores de cabecera ----------------
export function kpisTesoreria(e: Estado) {
  const cxp = cuentasPorPagar(e);
  return {
    porPagar: redondear(cxp.reduce((a, f) => a + f.saldo, 0)),
    vencido: redondear(cxp.filter((f) => f.dias > 0).reduce((a, f) => a + f.saldo, 0)),
    porVencer7: redondear(cxp.filter((f) => f.tramo === 'por_vencer' && f.dias >= -7).reduce((a, f) => a + f.saldo, 0)),
    sinFactura: comprasSinFactura(e).length,
    conDiferencia: e.facturas.filter((f) => f.estado === 'con_diferencia').length,
    sinConciliar: e.movimientosBanco.filter((m) => m.estado === 'sin_conciliar').length,
  };
}

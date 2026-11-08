// Tesoreria ampliada: facturas de proveedor, cuentas bancarias y extracto bancario (todo simulado).
// Se deriva de las compras, recepciones y pagos ya generados para que las cifras cuadren entre si.
import type { CuentaBancaria, FacturaProveedor, MovimientoBanco, Pago } from '../types';
import type { DatosDemo } from './index';
import { h } from './ayudas';

export const CUENTAS: CuentaBancaria[] = [
  { id: 'cta-1', nombre: 'Cuenta corriente operativa', banco: 'Banco Pichincha', ultimos4: '4521', saldoInicial: 62000 },
  { id: 'cta-2', nombre: 'Cuenta de cheques', banco: 'Produbanco', ultimos4: '8890', saldoInicial: 30000 },
];

const DIA = 86400000;
const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (pref: string, n: number) => `${pref}-${String(n).padStart(4, '0')}`;
const iso = (t: number) => new Date(t).toISOString();

export function crearFacturasYBanco(d: DatosDemo): { facturas: FacturaProveedor[]; cuentas: CuentaBancaria[]; movimientos: MovimientoBanco[]; pagos: Pago[] } {
  const ahora = Date.now();
  const iva = d.parametros.impuestoInformativoPct / 100;
  const provIdx = (id: string) => Math.max(0, d.proveedores.findIndex((p) => p.id === id));

  // ---------- Facturas: una por cada compra con recepcion (parcial o completa) ----------
  const facturas: FacturaProveedor[] = [];
  const conRecepcion = d.compras
    .filter((c) => c.estadoRecepcion !== 'pendiente' && c.estado !== 'rechazada')
    .sort((a, b) => a.numero.localeCompare(b.numero));
  // Las compras recibidas mas recientes y todavia abiertas quedan SIN factura para que Tesoreria las registre
  const abiertas = conRecepcion.filter((c) => c.estado === 'recibida' || c.estado === 'recibida_parcial');
  const sinFactura = new Set(abiertas.slice(-3).map((c) => c.id));
  let n = 1; let conDif = 0; let proximas = 0;
  for (const c of conRecepcion) {
    if (sinFactura.has(c.id)) continue;
    const recs = d.recepciones.filter((r) => r.compraId === c.id && r.estado === 'confirmada').sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
    const ultima = recs[recs.length - 1];
    const tEmision = Math.min(ahora - DIA, new Date(ultima?.creadoEn ?? c.actualizadoEn).getTime() + DIA);
    const recibido = r2(recs.reduce((a, r) => a + r.lineas.reduce((t, l) => t + l.recibidoAhora * (c.lineas.find((x) => x.sku === l.sku)?.precioUnitario ?? 0), 0), 0) * (1 + iva));
    const plazo = Number(c.condiciones.match(/(\d+)\s*d[ií]as/i)?.[1] ?? 30);
    // Algunas facturas abiertas llegan con diferencia (el proveedor facturo de mas) para mostrar el cotejo
    const dif = c.estado === 'recibida' && conDif < 2 ? (conDif++ === 0 ? 18.4 : 6.9) : 0;
    const total = r2(recibido + dif); const subtotal = r2(total / (1 + iva));
    // Dos facturas abiertas vencen pronto (4 y 19 dias) para mostrar el calendario de pagos
    const vencePronto = c.estado === 'recibida' && Math.abs(dif) < 0.05 && n % 2 === 0 && proximas < 2 ? [4, 19][proximas++] : null;
    const numeroFactura = `001-00${provIdx(c.proveedorId) + 1}-${String(140 + n * 37).padStart(9, '0')}`;
    const estado: FacturaProveedor['estado'] = Math.abs(dif) > 0.05 ? (conDif === 2 ? 'en_reclamo' : 'con_diferencia') : 'cotejada';
    const numero = num('FAC', n++);
    facturas.push({
      id: numero.toLowerCase(), numero, creadoPor: 'u-paola', creadoEn: iso(tEmision + DIA / 4), actualizadoEn: iso(tEmision + DIA / 4),
      compraId: c.id, proveedorId: c.proveedorId, numeroFactura, fechaEmision: iso(tEmision), fechaVencimiento: iso(vencePronto !== null ? ahora + vencePronto * DIA : tEmision + plazo * DIA),
      subtotal, iva: r2(total - subtotal), total, archivo: `factura-${numeroFactura}.pdf`, valorRecibido: recibido, diferencia: r2(total - recibido), estado,
      observacion: estado === 'en_reclamo' ? 'Se solicitó nota de crédito al proveedor por el valor facturado de más.' : undefined,
      historial: [
        h(iso(tEmision + DIA / 4), 'u-paola', 'Factura registrada y cotejada con la orden y la recepción', undefined, Math.abs(dif) > 0.05 ? 'con_diferencia' : 'cotejada'),
        ...(estado === 'en_reclamo' ? [h(iso(tEmision + DIA / 2), 'u-paola', 'Diferencia en reclamo: se pidió nota de crédito al proveedor', 'con_diferencia', 'en_reclamo')] : []),
      ],
    });
  }

  // ---------- Pagos: cuenta de origen y referencia ----------
  const pagos: Pago[] = d.pagos.map((p, i) => {
    if (p.medio === 'efectivo') return p;
    const cuentaId = p.medio === 'cheque' ? 'cta-2' : 'cta-1';
    return { ...p, cuentaId: p.cuentaId ?? cuentaId, referencia: p.referencia ?? `${p.medio === 'cheque' ? 'CHQ' : 'TRF'}-${String(48200 + i * 13)}` };
  });

  // ---------- Extracto bancario ----------
  const movimientos: MovimientoBanco[] = []; let m = 1;
  const provDe = (pagoId: string) => {
    const sp = d.solicitudesPago.find((s) => s.id === pagoId);
    return d.proveedores.find((p) => p.id === d.compras.find((c) => c.id === sp?.compraId)?.proveedorId)?.nombre ?? 'Proveedor';
  };
  // Los dos pagos mas recientes (uno por cuenta) todavia no aparecen en el extracto: cheque en circulacion / transferencia de hoy
  const sinLinea = new Set<string>();
  for (const cta of ['cta-1', 'cta-2']) { const ult = [...pagos].filter((x) => x.cuentaId === cta).sort((a, b) => b.fecha.localeCompare(a.fecha))[0]; if (ult) sinLinea.add(ult.id); }
  for (const p of pagos) {
    if (!p.cuentaId || sinLinea.has(p.id)) continue;
    const t = new Date(p.fecha).getTime() + (p.medio === 'cheque' ? 2 * DIA : 0);
    if (t > ahora - DIA / 2) continue; // todavia no aparece en el extracto (cheque en circulacion o pago de hoy)
    const antiguedad = (ahora - t) / DIA;
    const conciliado = antiguedad > 12;
    movimientos.push({
      id: num('mb', m++), cuentaId: p.cuentaId, fecha: iso(t), referencia: p.referencia ?? '',
      descripcion: `${p.medio === 'cheque' ? 'Cheque cobrado' : 'Transferencia enviada'} - ${provDe(p.solicitudPagoId)}`, monto: -p.importe,
      estado: conciliado ? 'conciliado' : 'sin_conciliar', pagoId: conciliado ? p.id : undefined,
      conciliadoPor: conciliado ? 'u-paola' : undefined, conciliadoEn: conciliado ? iso(t + 2 * DIA) : undefined,
    });
  }
  const extra: [number, string, string, number, MovimientoBanco['estado'], string?][] = [
    [34, 'Comisión por transferencias interbancarias (mensual)', 'COM-0930', -3.5, 'gasto_bancario', 'Gasto bancario recurrente'],
    [4, 'Comisión por transferencias interbancarias (mensual)', 'COM-1031', -3.5, 'sin_conciliar'],
    [6, 'Cargo por mantenimiento de cuenta', 'MNT-1029', -12, 'sin_conciliar'],
    [3, 'Débito no identificado', 'DEB-88231', -250, 'sin_conciliar'],
  ];
  for (const [dias, descripcion, referencia, monto, estado, nota] of extra) {
    movimientos.push({ id: num('mb', m++), cuentaId: 'cta-1', fecha: iso(ahora - dias * DIA), descripcion, referencia, monto, estado, nota,
      conciliadoPor: estado === 'gasto_bancario' ? 'u-paola' : undefined, conciliadoEn: estado === 'gasto_bancario' ? iso(ahora - (dias - 1) * DIA) : undefined });
  }
  movimientos.sort((a, b) => b.fecha.localeCompare(a.fecha));
  // renumera para que el orden de la tabla coincida con el id
  movimientos.forEach((x, i) => { x.id = num('mb', i + 1); });

  return { facturas, cuentas: structuredClone(CUENTAS), movimientos, pagos };
}

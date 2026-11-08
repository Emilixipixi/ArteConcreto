import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarClock } from 'lucide-react';
import BotonConPermiso from '../../components/BotonConPermiso';
import DataTable, { type Columna } from '../../components/DataTable';
import ExportarReporte from '../../components/ExportarReporte';
import { formatearFecha, formatearMoneda } from '../../lib/formato';
import { puede } from '../../lib/permisos';
import { useUsuarioActual } from '../../store/selectores';
import { cuentasPorPagar, TRAMOS, totalPorTramo, type FilaCxP, type Tramo } from '../../store/selectoresTesoreria';
import { useStore } from '../../store/useStore';

const COLOR: Record<Tramo, string> = { por_vencer: '#2F7D4F', v1_30: '#F2B705', v31_60: '#C2410C', v60: '#B42318', sin_factura: '#9A948C' };

function Vencimiento({ f }: { f: FilaCxP }) {
  if (f.tramo === 'sin_factura') return <span className="chip !bg-concreto-100 !text-concreto-600">Sin factura</span>;
  if (f.dias > 0) return <span className="chip !bg-error/10 !text-error">Vencida hace {f.dias} d</span>;
  if (f.dias === 0) return <span className="chip !bg-aviso/10 !text-aviso">Vence hoy</span>;
  return <span className={`chip ${f.dias >= -7 ? '!bg-aviso/10 !text-aviso' : ''}`}>Vence en {-f.dias} d</span>;
}

// Cuentas por pagar: antiguedad de saldos, obligaciones abiertas y calendario de pagos
export default function TabCuentasPorPagar({ onRegistrarFactura }: { onRegistrarFactura: (compraId: string) => void }) {
  const e = useStore();
  const u = useUsuarioActual()!;
  const navigate = useNavigate();
  const filas = useMemo(() => cuentasPorPagar(e), [e]);
  const totales = totalPorTramo(filas);
  const total = filas.reduce((a, f) => a + f.saldo, 0);
  const datos = TRAMOS.map((t) => ({ clave: t.clave, tramo: t.texto.replace('Vencido ', '').replace(' días', ' d'), valor: totales[t.clave] }));
  const proveedores = useMemo(() => [...new Set(filas.map((f) => f.proveedorId))].map((id) => ({
    id, nombre: filas.find((f) => f.proveedorId === id)!.proveedor, t: totalPorTramo(filas.filter((f) => f.proveedorId === id)),
    total: filas.filter((f) => f.proveedorId === id).reduce((a, f) => a + f.saldo, 0),
  })).sort((a, b) => b.total - a.total), [filas]);
  const proximos = filas.filter((f) => f.tramo === 'por_vencer' && f.dias >= -30).sort((a, b) => b.dias - a.dias);

  const columnas: Columna<FilaCxP>[] = [
    { clave: 'compraNumero', titulo: 'Orden', ordenable: true, render: (f) => <Link className="font-semibold text-marca-vino underline" to={`/compras/${f.compraId}`} onClick={(ev) => ev.stopPropagation()}>{f.compraNumero}</Link> },
    { clave: 'proveedor', titulo: 'Proveedor', ordenable: true },
    { clave: 'facturaNumero', titulo: 'Factura', render: (f) => f.facturaNumero ? <span className="tabular-nums">{f.facturaNumero}</span> : <span className="text-concreto-600">-</span> },
    { clave: 'vencimiento', titulo: 'Vence', ordenable: true, valor: (f) => f.vencimiento ?? '9', render: (f) => f.vencimiento ? formatearFecha(f.vencimiento) : '-' },
    { clave: 'estado', titulo: 'Situación', render: (f) => <Vencimiento f={f} /> },
    { clave: 'saldo', titulo: 'Saldo por pagar', alinear: 'der', ordenable: true, valor: (f) => f.saldo, render: (f) => <span className="font-semibold tabular-nums">{formatearMoneda(f.saldo)}</span> },
    { clave: 'acc', titulo: 'Acciones', render: (f) => f.tramo === 'sin_factura'
      ? <BotonConPermiso className="!py-1 text-xs" permitido={puede(u, 'factura.registrar')} motivo="Solo Tesorería registra facturas" onClick={() => onRegistrarFactura(f.compraId)}>Registrar factura</BotonConPermiso>
      : <BotonConPermiso variante="primario" className="!py-1 text-xs" permitido={puede(u, 'pago.preparar')} motivo="Solo Tesorería prepara pagos" onClick={() => navigate(`/tesoreria/nueva?compra=${f.compraId}`)}>Preparar pago</BotonConPermiso> },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-5">
        <section className="tarjeta p-4 lg:col-span-3" aria-label="Antigüedad de saldos">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-base font-bold">Antigüedad de saldos</h2><span className="text-sm text-concreto-600">Total por pagar <strong className="text-texto">{formatearMoneda(total)}</strong></span></div>
          <p className="mb-2 text-xs text-concreto-600">Saldo pendiente con proveedores, agrupado por días de vencimiento de su factura.</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datos} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D6D3CE" vertical={false} />
                <XAxis dataKey="tramo" tick={{ fontSize: 11, fill: '#6F6A64' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6F6A64' }} tickFormatter={(v) => `$${Number(v).toLocaleString('es-EC')}`} width={64} />
                <Tooltip formatter={(v) => formatearMoneda(Number(v))} />
                <Bar dataKey="valor" name="Saldo" radius={[4, 4, 0, 0]}>{datos.map((d) => <Cell key={d.clave} fill={COLOR[d.clave]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="tarjeta p-4 lg:col-span-2" aria-label="Calendario de pagos">
          <h2 className="mb-1 flex items-center gap-2 text-base font-bold"><CalendarClock size={17} aria-hidden="true" /> Vencen en los próximos 30 días</h2>
          {proximos.length === 0 ? <p className="text-sm text-concreto-600">No hay vencimientos próximos.</p> : (
            <ul className="max-h-56 divide-y divide-concreto-300 overflow-y-auto text-sm">{proximos.map((f) => (
              <li key={f.clave} className="flex items-center justify-between gap-2 py-2">
                <span className="min-w-0"><span className="font-semibold text-marca-vino">{f.compraNumero}</span> <span className="text-concreto-600">{f.proveedor}</span>
                  <span className="block text-xs text-concreto-600">{f.vencimiento ? formatearFecha(f.vencimiento) : ''} - <Vencimiento f={f} /></span></span>
                <span className="shrink-0 font-semibold tabular-nums">{formatearMoneda(f.saldo)}</span>
              </li>))}</ul>)}
        </section>
      </div>

      <section aria-label="Saldos por proveedor">
        <h2 className="mb-2 text-base font-bold">Saldos por proveedor</h2>
        <div className="tarjeta overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-concreto-100 text-xs uppercase text-concreto-600"><tr><th className="px-3 py-2 text-left">Proveedor</th>{TRAMOS.map((t) => <th key={t.clave} className="px-3 py-2 text-right">{t.texto}</th>)}<th className="px-3 py-2 text-right">Total</th></tr></thead>
            <tbody>{proveedores.length === 0 ? <tr><td colSpan={7} className="px-3 py-4 text-concreto-600">No hay saldos pendientes con proveedores.</td></tr> : proveedores.map((p) => (
              <tr key={p.id} className="border-t border-concreto-300"><td className="px-3 py-2 font-semibold">{p.nombre}</td>
                {TRAMOS.map((t) => <td key={t.clave} className={`px-3 py-2 text-right tabular-nums ${p.t[t.clave] > 0 && t.clave.startsWith('v') ? 'font-semibold text-error' : ''}`}>{p.t[t.clave] > 0 ? formatearMoneda(p.t[t.clave]) : '-'}</td>)}
                <td className="px-3 py-2 text-right font-bold tabular-nums">{formatearMoneda(p.total)}</td></tr>))}
            </tbody>
            {proveedores.length > 0 && <tfoot><tr className="border-t-2 border-concreto-300 bg-concreto-100 font-bold"><td className="px-3 py-2">Total</td>{TRAMOS.map((t) => <td key={t.clave} className="px-3 py-2 text-right tabular-nums">{formatearMoneda(totales[t.clave])}</td>)}<td className="px-3 py-2 text-right tabular-nums">{formatearMoneda(total)}</td></tr></tfoot>}
          </table>
        </div>
      </section>

      <section aria-label="Obligaciones abiertas">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-bold">Obligaciones abiertas ({filas.length})</h2>
          <ExportarReporte nombre="cuentas_por_pagar" filasCsv={() => [['Orden', 'Proveedor', 'Factura', 'Vence', 'Días vencido', 'Saldo'], ...filas.map((f) => [f.compraNumero, f.proveedor, f.facturaNumero ?? '', f.vencimiento?.slice(0, 10) ?? '', f.dias, f.saldo])]} /></div>
        <DataTable columnas={columnas} filas={filas} clave={(f) => f.clave} tamPagina={8} vacioTitulo="Sin obligaciones abiertas" vacioMensaje="Cuando una orden recibida tenga saldo por pagar aparecerá aquí." />
      </section>
    </div>
  );
}

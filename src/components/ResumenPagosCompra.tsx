import { FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatearFecha, formatearMoneda } from '../lib/formato';
import { anticipoPagadoImporte, pagadoCompra, saldoAFavor, saldoPorPagar, valorRecibido } from '../store/selectoresFase3';
import { useStore } from '../store/useStore';
import EstadosCompra from './EstadosCompra';

// Tarjeta resumen por compra: total, anticipo pagado, valor recibido, saldo y comprobantes (RF-21, CA-12)
export default function ResumenPagosCompra({ compraId }: { compraId: string }) {
  const e = useStore();
  const c = e.compras.find((x) => x.id === compraId);
  if (!c) return null;
  const anticipo = anticipoPagadoImporte(e, c.id);
  const recibido = valorRecibido(e, c.id);
  const saldo = saldoPorPagar(e, c.id);
  const favor = saldoAFavor(e, c.id);
  const pagos = e.pagos.filter((p) => e.solicitudesPago.some((s) => s.id === p.solicitudPagoId && s.compraId === c.id));
  const prov = e.proveedores.find((p) => p.id === c.proveedorId)?.nombre ?? '-';
  const celdas: [string, string, string?][] = [
    ['Total de la orden', formatearMoneda(c.total)],
    ['Anticipo pagado', formatearMoneda(anticipo)],
    ['Valor recibido', formatearMoneda(recibido), 'cantidad recibida x precio'],
    ['Pagado en total', formatearMoneda(pagadoCompra(e, c.id))],
    ['Saldo por pagar', formatearMoneda(saldo)],
    ['Saldo a favor', formatearMoneda(favor)],
  ];
  return (
    <section className="tarjeta p-4" aria-label={`Resumen de pagos de ${c.numero}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold"><Link className="text-marca-vino underline" to={`/compras/${c.id}`}>{c.numero}</Link> - {prov}</h3>
          <p className="text-xs text-concreto-600">{c.modalidadPago === 'anticipo' ? `Anticipo ${c.porcentajeAnticipo ?? 0} %` : 'Pago posterior'}</p>
        </div>
        <EstadosCompra compra={c} />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
        {celdas.map(([t, v, ayuda]) => (
          <div key={t} className="rounded-md bg-concreto-100 p-2">
            <dt className="text-xs font-semibold text-concreto-600">{t}</dt>
            <dd className="font-bold tabular-nums">{v}</dd>
            {ayuda && <dd className="text-[11px] text-concreto-600">{ayuda}</dd>}
          </div>
        ))}
      </dl>
      <div className="mt-3">
        <p className="etiqueta">Comprobantes</p>
        {pagos.length === 0 ? <p className="text-xs text-concreto-600">Aún no hay pagos registrados.</p> : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {pagos.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-md border border-concreto-300 px-2 py-1.5 text-sm">
                <FileText size={16} className="shrink-0 text-marca-vino" aria-hidden="true" />
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{p.comprobante}</span>
                  <span className="block text-xs text-concreto-600">{e.solicitudesPago.find((s) => s.id === p.solicitudPagoId)?.numero} - {formatearFecha(p.fecha)} - {p.medio}{p.referencia ? ` - ${p.referencia}` : ''}</span></span>
                <span className="font-semibold tabular-nums">{formatearMoneda(p.importe)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import AdjuntoSimulado from '../../components/AdjuntoSimulado';
import BotonConPermiso from '../../components/BotonConPermiso';
import Modal from '../../components/Modal';
import { formatearMoneda } from '../../lib/formato';
import { puede } from '../../lib/permisos';
import { hoyISO } from '../../lib/reglas';
import { useUsuarioActual } from '../../store/selectores';
import { valorRecibido } from '../../store/selectoresFase3';
import { comprasSinFactura } from '../../store/selectoresTesoreria';
import { useStore } from '../../store/useStore';

const sumarDias = (fecha: string, dias: number) => { const d = new Date(`${fecha}T12:00:00`); d.setDate(d.getDate() + dias); return d.toISOString().slice(0, 10); };
const dec = (t: string) => parseFloat(t.replace(',', '.'));

// Registro de factura del proveedor: se coteja en vivo contra el valor de la orden y de lo realmente recibido
export default function ModalFactura({ abierto, compraInicial, onCerrar }: { abierto: boolean; compraInicial?: string; onCerrar: () => void }) {
  const e = useStore();
  const u = useUsuarioActual()!;
  const pendientes = useMemo(() => comprasSinFactura(e), [e]);
  const [compraId, setCompraId] = useState('');
  const [numero, setNumero] = useState('');
  const [emision, setEmision] = useState(hoyISO());
  const [vence, setVence] = useState(sumarDias(hoyISO(), 30));
  const [subtotal, setSubtotal] = useState('');
  const [iva, setIva] = useState('');
  const [archivo, setArchivo] = useState<string[]>([]);
  const [obs, setObs] = useState('');
  const [error, setError] = useState('');

  const compra = e.compras.find((c) => c.id === compraId);
  const pct = e.parametros.impuestoInformativoPct / 100;

  // Al abrir o elegir una orden se sugieren los valores segun lo recibido y el plazo de pago de las condiciones
  useEffect(() => {
    if (!abierto) return;
    setCompraId(compraInicial ?? ''); setNumero(''); setEmision(hoyISO()); setObs(''); setArchivo([]); setError('');
  }, [abierto, compraInicial]);
  useEffect(() => {
    const c = e.compras.find((x) => x.id === compraId);
    if (!c) { setSubtotal(''); setIva(''); return; }
    const sub = Math.round((valorRecibido(e, c.id) / (1 + pct)) * 100) / 100;
    setSubtotal(String(sub)); setIva(String(Math.round(sub * pct * 100) / 100));
    setVence(sumarDias(emision, Number(c.condiciones.match(/(\d+)\s*d[ií]as/i)?.[1] ?? 30)));
  }, [compraId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sub = dec(subtotal); const ivaN = dec(iva);
  const total = isFinite(sub) && isFinite(ivaN) ? Math.round((sub + ivaN) * 100) / 100 : NaN;
  const recibido = compra ? valorRecibido(e, compra.id) : 0;
  const dif = isFinite(total) ? Math.round((total - recibido) * 100) / 100 : NaN;
  const hayDif = isFinite(dif) && Math.abs(dif) > 0.05;

  const guardar = () => {
    const r = e.registrarFactura({ compraId, numeroFactura: numero, fechaEmision: emision, fechaVencimiento: vence, subtotal: sub, iva: ivaN, archivo: archivo[0] ?? '', observacion: obs });
    if (!r.ok) return setError(r.error ?? 'No se pudo registrar la factura');
    onCerrar();
  };

  return (
    <Modal abierto={abierto} titulo="Registrar factura de proveedor" ancho="max-w-2xl" onCerrar={onCerrar}
      pie={<><button className="btn-fantasma" onClick={onCerrar}>Cancelar</button>
        <BotonConPermiso variante="primario" permitido={puede(u, 'factura.registrar')} motivo="Solo Tesorería registra facturas" onClick={guardar}>Registrar factura</BotonConPermiso></>}>
      <div className="space-y-3 text-sm">
        <div><label className="etiqueta" htmlFor="fa-oc">Orden de compra (recibida, sin factura)</label>
          <select id="fa-oc" className="campo" value={compraId} onChange={(ev) => setCompraId(ev.target.value)}>
            <option value="">Elige una orden</option>
            {compraInicial && !pendientes.some((c) => c.id === compraInicial) && e.compras.some((c) => c.id === compraInicial) && <option value={compraInicial}>{e.compras.find((c) => c.id === compraInicial)!.numero}</option>}
            {pendientes.map((c) => <option key={c.id} value={c.id}>{c.numero} - {e.proveedores.find((p) => p.id === c.proveedorId)?.nombre} ({formatearMoneda(valorRecibido(e, c.id))} recibido)</option>)}
          </select></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="etiqueta" htmlFor="fa-num">Nº de factura</label><input id="fa-num" className="campo" placeholder="001-001-000000123" value={numero} onChange={(ev) => setNumero(ev.target.value)} /></div>
          <div><label className="etiqueta" htmlFor="fa-em">Fecha de emisión</label><input id="fa-em" type="date" max={hoyISO()} className="campo" value={emision} onChange={(ev) => setEmision(ev.target.value)} /></div>
          <div><label className="etiqueta" htmlFor="fa-ve">Fecha de vencimiento</label><input id="fa-ve" type="date" min={emision} className="campo" value={vence} onChange={(ev) => setVence(ev.target.value)} /></div>
          <div><label className="etiqueta" htmlFor="fa-sub">Subtotal (USD)</label><input id="fa-sub" inputMode="decimal" className="campo" value={subtotal} onChange={(ev) => setSubtotal(ev.target.value)} /></div>
          <div><label className="etiqueta" htmlFor="fa-iva">IVA (USD)</label><input id="fa-iva" inputMode="decimal" className="campo" value={iva} onChange={(ev) => setIva(ev.target.value)} /></div>
          <div><p className="etiqueta">Total de la factura</p><p className="py-2 text-base font-bold tabular-nums">{isFinite(total) ? formatearMoneda(total) : '-'}</p></div>
        </div>
        {compra && (
          <div className={`rounded-md border p-3 ${hayDif ? 'border-aviso/40 bg-aviso/10' : 'border-ok/30 bg-ok/10'}`} role="status">
            <p className="mb-2 flex items-center gap-2 font-semibold">{hayDif ? <><AlertTriangle size={16} aria-hidden="true" /> El total facturado no coincide con lo recibido</> : <><CheckCircle2 size={16} aria-hidden="true" /> El total facturado coincide con lo recibido</>}</p>
            <dl className="grid gap-2 text-xs sm:grid-cols-4">
              <div><dt className="text-concreto-600">Total de la orden</dt><dd className="text-sm font-bold tabular-nums">{formatearMoneda(compra.total)}</dd></div>
              <div><dt className="text-concreto-600">Valor recibido</dt><dd className="text-sm font-bold tabular-nums">{formatearMoneda(recibido)}</dd></div>
              <div><dt className="text-concreto-600">Facturado</dt><dd className="text-sm font-bold tabular-nums">{isFinite(total) ? formatearMoneda(total) : '-'}</dd></div>
              <div><dt className="text-concreto-600">Diferencia</dt><dd className={`text-sm font-bold tabular-nums ${hayDif ? 'text-aviso' : 'text-ok'}`}>{isFinite(dif) ? formatearMoneda(dif) : '-'}</dd></div>
            </dl>
            {hayDif && <p className="mt-2 text-xs">Podrás registrarla igual: quedará "Con diferencia" para aceptarla con un motivo o reclamar una nota de crédito al proveedor.</p>}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div><p className="etiqueta">Archivo de la factura (simulado)</p>
            <AdjuntoSimulado adjuntos={archivo} onChange={(a) => setArchivo(a.slice(-1).map(() => `factura-${numero.trim() || 'proveedor'}.pdf`))} /></div>
          <div><label className="etiqueta" htmlFor="fa-obs">Observación (opcional)</label><textarea id="fa-obs" className="campo min-h-[64px]" value={obs} onChange={(ev) => setObs(ev.target.value)} /></div>
        </div>
        {error && <p role="alert" className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-xs text-error">{error}</p>}
      </div>
    </Modal>
  );
}

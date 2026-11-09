import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import BotonConPermiso from '../../components/BotonConPermiso';
import EstadoBadge from '../../components/EstadoBadge';
import EstadoVacio from '../../components/EstadoVacio';
import LineaTiempoEstados from '../../components/LineaTiempoEstados';
import ModalConfirmar from '../../components/ModalConfirmar';
import ModalObservacion from '../../components/ModalObservacion';
import ResumenPagosCompra from '../../components/ResumenPagosCompra';
import { diasDesde, formatearMoneda } from '../../lib/formato';
import { reglaSegregacion } from '../../lib/permisos';
import { useUsuarioActual } from '../../store/selectores';
import { facturaVigente } from '../../store/selectoresTesoreria';
import { useStore } from '../../store/useStore';

type Pestana = 'pendientes' | 'mias' | 'todas';

// Aprobar pagos: bandeja de solicitudes de pago con detalle al lado (mismo esquema que Aprobacion de compras)
export default function TabAprobarPagos({ seleccion, onSeleccionar }: { seleccion?: string; onSeleccionar: (id?: string) => void }) {
  const u = useUsuarioActual()!;
  const e = useStore();
  const [pestana, setPestana] = useState<Pestana>('pendientes');
  const [modal, setModal] = useState<null | 'aprobar' | 'devolver'>(null);
  const compraDe = (cid: string) => e.compras.find((c) => c.id === cid);
  const nombreProv = (cid: string) => e.proveedores.find((p) => p.id === compraDe(cid)?.proveedorId)?.nombre ?? '-';
  const nombre = (uid: string) => e.usuarios.find((x) => x.id === uid)?.nombre ?? uid;
  const concepto = (tipo: 'anticipo' | 'pago_final') => (tipo === 'anticipo' ? 'Anticipo' : 'Pago de lo recibido');

  const lista = useMemo(() => e.solicitudesPago.filter((s) => {
    if (pestana === 'pendientes') return s.estado === 'pendiente_aprobacion';
    if (pestana === 'mias') return s.historial.some((h) => h.usuarioId === u.id && h.estadoAnterior === 'pendiente_aprobacion');
    return s.estado !== 'preparada';
  }).sort((a, b) => a.actualizadoEn.localeCompare(b.actualizadoEn)), [e.solicitudesPago, pestana, u.id]);

  const sel = e.solicitudesPago.find((s) => s.id === seleccion);
  const compra = sel ? compraDe(sel.compraId) : undefined;
  const factura = sel ? facturaVigente(e, sel.compraId) : undefined;
  const regla = sel ? reglaSegregacion(u, sel, 'pago.aprobar') : { permitido: false, motivo: '' };
  const decidir = (d: 'aprobar' | 'devolver', obs?: string) => { if (!sel) return; const r = e.decidirSolicitudPago(sel.id, d, obs); if (!r.ok) e.mostrarToast(r.error ?? 'No se pudo completar', 'error'); };
  const previas = sel?.historial.filter((h) => h.observacion) ?? [];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(300px,400px)_1fr]">
      <div className={sel ? 'hidden lg:block' : ''}>
        <div className="mb-2 flex gap-1 border-b border-concreto-300" role="tablist" aria-label="Bandejas de aprobación de pagos">
          {([['pendientes', 'Pendientes'], ['mias', 'Decididas por mí'], ['todas', 'Todas']] as const).map(([k, t]) => (
            <button key={k} role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)} className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${pestana === k ? 'border-marca-vino text-marca-vino' : 'border-transparent text-concreto-600'}`}>{t}</button>
          ))}
        </div>
        {lista.length === 0 ? <div className="tarjeta"><EstadoVacio titulo="Sin pagos" mensaje="No hay solicitudes de pago en esta vista." /></div> : (
          <ul className="space-y-2">
            {lista.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => onSeleccionar(s.id)} className={`tarjeta block w-full p-3 text-left hover:border-marca-vino ${s.id === seleccion ? 'border-marca-vino ring-1 ring-marca-vino' : ''}`}>
                  <div className="flex items-center justify-between"><span className="font-semibold text-marca-vino">{s.numero}</span><span className="font-semibold tabular-nums">{formatearMoneda(s.importe)}</span></div>
                  <p className="mt-1 text-xs text-concreto-600">{nombreProv(s.compraId)} - {compraDe(s.compraId)?.numero ?? ''} - preparada por {nombre(s.creadoPor)}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
                    <EstadoBadge estado={s.estado} />
                    <span className={`text-xs font-semibold ${s.tipo === 'anticipo' ? 'text-aviso' : 'text-ok'}`}>{concepto(s.tipo)} - hace {diasDesde(s.actualizadoEn)} d</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={sel ? '' : 'hidden lg:block'}>
        {!sel ? <div className="tarjeta"><EstadoVacio titulo="Selecciona un pago" mensaje="El detalle y el resumen de la orden aparecerán aquí." /></div> : (
          <div className="space-y-4">
            <button className="btn-fantasma lg:hidden" onClick={() => onSeleccionar(undefined)}><ArrowLeft size={15} /> Volver a la lista</button>
            <div className="tarjeta space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">{sel.numero}</h2>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${sel.tipo === 'anticipo' ? 'border-aviso/30 bg-aviso/10 text-aviso' : 'border-ok/30 bg-ok/10 text-ok'}`}>
                  {sel.tipo === 'anticipo' ? 'Anticipo - la mercancía aún no se ha recibido por completo' : 'Pago de lo recibido'}</span></div>
              <EstadoBadge estado={sel.estado} />
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div><dt className="etiqueta">Importe solicitado</dt><dd className="text-lg font-bold tabular-nums">{formatearMoneda(sel.importe)}</dd></div>
                <div><dt className="etiqueta">Orden de compra</dt><dd>{compra ? <Link className="font-semibold text-marca-vino underline" to={`/compras/${compra.id}`}>{compra.numero}</Link> : '-'}</dd></div>
                <div><dt className="etiqueta">Factura del proveedor</dt><dd>{factura ? <span className="flex items-center gap-2">{factura.numeroFactura} <EstadoBadge estado={factura.estado} /></span> : <span className="text-concreto-600">Sin registrar</span>}</dd></div>
              </dl>
              {sel.observacion && <p className="rounded-md bg-marca-amarillo-suave/50 p-2 text-sm"><span className="font-semibold">Observación de Tesorería.</span> {sel.observacion}</p>}
              <Link className="text-xs font-semibold text-marca-vino underline" to={`/tesoreria/${sel.id}`}>Abrir la solicitud completa</Link>
            </div>
            <ResumenPagosCompra compraId={sel.compraId} />
            {sel.estado === 'pendiente_aprobacion' && (
              <div className="tarjeta flex flex-wrap items-center gap-2 p-3">
                <BotonConPermiso variante="primario" permitido={regla.permitido} motivo={regla.motivo} onClick={() => setModal('aprobar')}><CheckCircle2 size={16} /> Aprobar</BotonConPermiso>
                <BotonConPermiso variante="secundario" permitido={regla.permitido} motivo={regla.motivo} onClick={() => setModal('devolver')}><RotateCcw size={16} /> Devolver</BotonConPermiso>
              </div>
            )}
            {previas.length > 0 && <div className="tarjeta p-4 text-sm"><h3 className="mb-1 text-base font-bold">Observaciones previas</h3><ul className="list-inside list-disc">{previas.map((h, i) => <li key={i}>{nombre(h.usuarioId)}: {h.observacion}</li>)}</ul></div>}
            <div className="tarjeta p-4"><h3 className="mb-3 text-base font-bold">Historial</h3><LineaTiempoEstados historial={sel.historial} /></div>
          </div>
        )}
      </div>

      <ModalConfirmar abierto={modal === 'aprobar'} titulo="Aprobar pago" mensaje={`Aprobarás ${sel?.numero ?? ''} por ${formatearMoneda(sel?.importe ?? 0)}. Quedará listo para registrar el pago. Esto no modifica el stock.`} textoConfirmar="Aprobar" onConfirmar={() => decidir('aprobar')} onCerrar={() => setModal(null)} />
      <ModalObservacion abierto={modal === 'devolver'} titulo={`Devolver ${sel?.numero ?? ''}`} textoConfirmar="Devolver" minimo={10} onConfirmar={(o) => decidir('devolver', o)} onCerrar={() => setModal(null)} />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { CheckCircle2, FileText, Paperclip, RotateCcw, Scale } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { MOSTRAR_CONCILIACION_BANCARIA } from '../../lib/funciones';
import BotonConPermiso from '../../components/BotonConPermiso';
import EstadoBadge from '../../components/EstadoBadge';
import EstadoVacio from '../../components/EstadoVacio';
import LineaTiempoEstados from '../../components/LineaTiempoEstados';
import ModalConfirmar from '../../components/ModalConfirmar';
import ModalObservacion from '../../components/ModalObservacion';
import NotaReglasPago from '../../components/NotaReglasPago';
import { comprobantePagoPdf } from '../../lib/documentos';
import { datosComprobante } from '../../lib/documentosDatos';
import PageHeader from '../../components/PageHeader';
import ResumenPagosCompra from '../../components/ResumenPagosCompra';
import { formatearFecha, formatearMoneda } from '../../lib/formato';
import { puede, reglaSegregacion } from '../../lib/permisos';
import { hoyISO } from '../../lib/reglas';
import { useUsuarioActual } from '../../store/selectores';
import { enCursoPagoFinal, maximoSolicitable, pagadoCompra, saldoAFavor, saldoPorPagar, valorRecibido } from '../../store/selectoresFase3';
import { useStore } from '../../store/useStore';
import type { Pago } from '../../types';

// Detalle de una solicitud de pago: aprobacion, registro del pago y conciliacion de anticipo (RF-19 a RF-21)
export default function DetallePago() {
  const { id } = useParams();
  const u = useUsuarioActual()!;
  const e = useStore();
  const sp = e.solicitudesPago.find((s) => s.id === id);
  const [modal, setModal] = useState<null | 'aprobar' | 'devolver' | 'enviar' | 'pagar' | 'conciliar'>(null);
  const [importeTxt, setImporteTxt] = useState<string | null>(null);
  const [obsTxt, setObsTxt] = useState<string | null>(null);
  const [fecha, setFecha] = useState(hoyISO());
  const [pagoImporteTxt, setPagoImporteTxt] = useState<string | null>(null);
  const [medio, setMedio] = useState<Pago['medio']>('transferencia');
  const [referencia, setReferencia] = useState('');
  const [comprobante, setComprobante] = useState('');
  const [cuentaId, setCuentaId] = useState(e.cuentasBancarias[0]?.id ?? '');

  // Atajo desde la lista de Tesoreria: /tesoreria/ID?accion=aprobar | pagar abre directamente la confirmacion
  const [paramsUrl] = useSearchParams();
  const accionUrl = paramsUrl.get('accion');
  useEffect(() => {
    if (!sp) return;
    if (accionUrl === 'aprobar' && sp.estado === 'pendiente_aprobacion' && reglaSegregacion(u, sp, 'pago.aprobar').permitido) setModal('aprobar');
    if (accionUrl === 'pagar' && sp.estado === 'aprobada' && reglaSegregacion(u, sp, 'pago.registrar').permitido) setModal('pagar');
  }, [accionUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sp) return <EstadoVacio titulo="Solicitud de pago no encontrada" accion={<Link className="btn-primario" to="/tesoreria">Volver a Tesorería</Link>} />;
  const compra = e.compras.find((c) => c.id === sp.compraId)!;
  const nombre = (uid: string) => e.usuarios.find((x) => x.id === uid)?.nombre ?? uid;
  const pago = e.pagos.find((p) => p.solicitudPagoId === sp.id);
  const resultado = (r: { ok: boolean; error?: string }) => { if (!r.ok) e.mostrarToast(r.error ?? 'No se pudo completar', 'error'); };

  const editable = ['preparada', 'devuelta'].includes(sp.estado);
  const maxEdit = maximoSolicitable(e, sp.compraId, sp.tipo, sp.id);
  const importeEdit = importeTxt === null ? sp.importe : parseFloat(importeTxt.replace(',', '.'));
  const errEdit = !isFinite(importeEdit) || importeEdit <= 0 ? 'El importe debe ser mayor que cero' : importeEdit - maxEdit > 0.005 ? `No puede superar ${formatearMoneda(maxEdit)}` : null;

  const reglaAprobar = reglaSegregacion(u, sp, 'pago.aprobar');
  const reglaPagar = reglaSegregacion(u, sp, 'pago.registrar');
  const pagoImporte = pagoImporteTxt === null ? sp.importe : parseFloat(pagoImporteTxt.replace(',', '.'));
  const errPago = !isFinite(pagoImporte) || pagoImporte <= 0 ? 'Importe inválido' : pagoImporte - sp.importe > 0.005 ? 'No puede superar el importe aprobado' : fecha > hoyISO() ? 'La fecha no puede ser posterior a hoy' : !comprobante ? 'Adjunta el comprobante' : null;

  // Conciliacion (solo anticipos pagados)
  const conciliacion = sp.tipo === 'anticipo' && ['pagada', 'conciliada'].includes(sp.estado) && ['recibida_parcial', 'recibida', 'cerrada'].includes(compra.estado);
  const recibido = valorRecibido(e, compra.id);
  const pagado = pagadoCompra(e, compra.id);
  const diferencia = recibido - pagado; // >0 saldo por pagar, <0 saldo a favor
  const puedeConciliar = sp.estado === 'pagada' && compra.estadoRecepcion === 'completa' && saldoPorPagar(e, compra.id) === 0 && enCursoPagoFinal(e, compra.id) === 0;

  return (
    <div>
      <PageHeader titulo={`${sp.tipo === 'anticipo' ? 'Anticipo' : 'Pago'} ${sp.numero}`} migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Tesorería', ruta: '/tesoreria' }, { texto: sp.numero }]}
        acciones={<span className="flex items-center gap-2">{pago && <button className="btn-secundario !py-1 text-xs" onClick={() => comprobantePagoPdf(datosComprobante(e, sp, pago))}>Descargar comprobante (PDF)</button>}<EstadoBadge estado={sp.estado} /></span>} subtitulo={`Preparada por ${nombre(sp.creadoPor)} para la orden ${compra.numero}.`} />
      <NotaReglasPago />
      <div className="space-y-4">
        <ResumenPagosCompra compraId={compra.id} />

        <section className="tarjeta space-y-3 p-4">
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <div><p className="etiqueta">Importe solicitado</p><span className="text-lg font-bold tabular-nums">{formatearMoneda(sp.importe)}</span></div>
            <div><p className="etiqueta">Tipo</p>{sp.tipo === 'anticipo' ? 'Anticipo' : 'Pago de lo recibido'}</div>
            <div><p className="etiqueta">Observación</p>{sp.observacion ?? '-'}</div>
          </div>

          {sp.estado === 'devuelta' && (() => {
            const dev = [...sp.historial].reverse().find((h) => h.estadoNuevo === 'devuelta');
            return dev?.observacion ? <div className="rounded-md border border-aviso/40 bg-aviso/10 p-3 text-sm"><p className="font-semibold">Devuelta por {nombre(dev.usuarioId)}</p><p>{dev.observacion}</p></div> : null;
          })()}

          {editable && (
            <div className="grid gap-3 border-t border-concreto-300 pt-3 sm:grid-cols-2">
              <div>
                <label className="etiqueta" htmlFor="ed-importe">Importe (USD)</label>
                <input id="ed-importe" className={`campo ${errEdit ? 'border-error' : ''}`} value={importeTxt ?? sp.importe.toFixed(2)} onChange={(ev) => setImporteTxt(ev.target.value)} />
                {errEdit && <p className="mt-1 text-xs text-error">{errEdit}</p>}
              </div>
              <div>
                <label className="etiqueta" htmlFor="ed-obs">Observación</label>
                <textarea id="ed-obs" className="campo min-h-[60px]" value={obsTxt ?? sp.observacion ?? ''} onChange={(ev) => setObsTxt(ev.target.value)} />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <BotonConPermiso variante="primario" permitido={puede(u, 'pago.preparar')} motivo="Solo Tesorería envía solicitudes de pago" deshabilitado={!!errEdit} onClick={() => setModal('enviar')}>{sp.estado === 'devuelta' ? 'Corregir y reenviar' : 'Enviar a aprobación'}</BotonConPermiso>
              </div>
            </div>
          )}

          {sp.estado === 'pendiente_aprobacion' && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-concreto-300 pt-3">
              <BotonConPermiso variante="secundario" permitido={reglaAprobar.permitido} motivo={reglaAprobar.motivo} onClick={() => setModal('devolver')}><RotateCcw size={15} /> Devolver / Observar</BotonConPermiso>
              <BotonConPermiso variante="primario" permitido={reglaAprobar.permitido} motivo={reglaAprobar.motivo} onClick={() => setModal('aprobar')}><CheckCircle2 size={15} /> Aprobar</BotonConPermiso>
            </div>
          )}

          {sp.estado === 'aprobada' && (
            <div className="space-y-3 border-t border-concreto-300 pt-3">
              <h3 className="text-base font-bold">Registrar el pago</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div><label className="etiqueta" htmlFor="rp-fecha">Fecha</label><input id="rp-fecha" type="date" max={hoyISO()} className="campo" value={fecha} onChange={(ev) => setFecha(ev.target.value)} /></div>
                <div><label className="etiqueta" htmlFor="rp-importe">Importe (USD)</label><input id="rp-importe" className="campo" value={pagoImporteTxt ?? sp.importe.toFixed(2)} onChange={(ev) => setPagoImporteTxt(ev.target.value)} /></div>
                <div><label className="etiqueta" htmlFor="rp-medio">Medio</label>
                  <select id="rp-medio" className="campo" value={medio} onChange={(ev) => setMedio(ev.target.value as Pago['medio'])}>
                    <option value="transferencia">Transferencia</option><option value="cheque">Cheque</option><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option>
                  </select></div>
                {medio !== 'efectivo' && <div><label className="etiqueta" htmlFor="rp-cta">Cuenta de origen</label>
                  <select id="rp-cta" className="campo" value={cuentaId} onChange={(ev) => setCuentaId(ev.target.value)}>{e.cuentasBancarias.map((c) => <option key={c.id} value={c.id}>{c.banco} ****{c.ultimos4} - {c.nombre}</option>)}</select></div>}
                <div><label className="etiqueta" htmlFor="rp-ref">Referencia / Nº de comprobante</label><input id="rp-ref" className="campo" value={referencia} onChange={(ev) => setReferencia(ev.target.value)} /></div>
              </div>
              <div>
                <p className="etiqueta">Comprobante adjunto (simulado)</p>
                {comprobante ? (
                  <div className="flex max-w-sm items-center gap-2 rounded-md border border-concreto-300 bg-concreto-100 px-3 py-2 text-sm">
                    <FileText size={18} className="text-marca-vino" aria-hidden="true" /><span className="flex-1 truncate font-medium">{comprobante}</span>
                    <button className="text-xs underline" onClick={() => setComprobante('')}>Quitar</button>
                  </div>
                ) : <button type="button" className="btn-secundario !py-1 text-xs" onClick={() => setComprobante(`comprobante-${medio}-${sp.numero.toLowerCase()}.pdf`)}><Paperclip size={13} /> Adjuntar comprobante (simulado)</button>}
              </div>
              {errPago && <p className="text-xs text-error">{errPago}</p>}
              <div className="flex justify-end">
                <BotonConPermiso variante="primario" permitido={reglaPagar.permitido} motivo={reglaPagar.motivo} deshabilitado={!!errPago} onClick={() => setModal('pagar')}>Registrar pago</BotonConPermiso>
              </div>
            </div>
          )}

          {pago && (
            <div className="border-t border-concreto-300 pt-3 text-sm">
              <h3 className="mb-2 text-base font-bold">Pago registrado</h3>
              <div className="grid gap-3 sm:grid-cols-4">
                <div><p className="etiqueta">Fecha</p>{formatearFecha(pago.fecha)}</div>
                <div><p className="etiqueta">Importe</p><span className="tabular-nums">{formatearMoneda(pago.importe)}</span></div>
                <div><p className="etiqueta">Medio</p><span className="capitalize">{pago.medio}</span></div>
                <div><p className="etiqueta">Referencia</p>{pago.referencia ?? '-'}</div>
                {pago.cuentaId && <div><p className="etiqueta">Cuenta de origen</p>{(() => { const c = e.cuentasBancarias.find((x) => x.id === pago.cuentaId); return c ? `${c.banco} ****${c.ultimos4}` : '-'; })()}</div>}
                {MOSTRAR_CONCILIACION_BANCARIA && pago.cuentaId && <div><p className="etiqueta">Extracto bancario</p>{e.movimientosBanco.find((m) => m.pagoId === pago.id) ? <EstadoBadge estado="conciliado" /> : <span className="text-xs text-concreto-600">Aún no aparece en el extracto</span>}</div>}
              </div>
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-concreto-300 bg-concreto-100 px-3 py-2"><FileText size={16} className="text-marca-vino" aria-hidden="true" />{pago.comprobante} <span className="text-xs text-concreto-600">- registrado por {nombre(pago.registradoPor)}</span></p>
            </div>
          )}
        </section>

        {conciliacion && (
          <section className="tarjeta space-y-3 p-4" aria-label="Conciliación del anticipo">
            <h3 className="flex items-center gap-2 text-base font-bold"><Scale size={18} aria-hidden="true" /> Conciliación</h3>
            <dl className="grid gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-md bg-concreto-100 p-2"><dt className="text-xs font-semibold text-concreto-600">Anticipo pagado</dt><dd className="font-bold tabular-nums">{formatearMoneda(pagado)}</dd></div>
              <div className="rounded-md bg-concreto-100 p-2"><dt className="text-xs font-semibold text-concreto-600">Valor recibido</dt><dd className="font-bold tabular-nums">{formatearMoneda(recibido)}</dd></div>
              <div className="rounded-md bg-concreto-100 p-2"><dt className="text-xs font-semibold text-concreto-600">Diferencia</dt><dd className="font-bold tabular-nums">{formatearMoneda(Math.abs(diferencia))}</dd></div>
              <div className="rounded-md bg-concreto-100 p-2"><dt className="text-xs font-semibold text-concreto-600">Resultado</dt>
                <dd className="font-bold">{Math.abs(diferencia) < 0.005 ? 'Sin diferencia' : diferencia < 0 ? `Saldo a favor ${formatearMoneda(saldoAFavor(e, compra.id) || -diferencia)}` : `Saldo por pagar ${formatearMoneda(diferencia)}`}</dd></div>
            </dl>
            {compra.estadoRecepcion !== 'completa' && <p className="text-xs text-concreto-600">La conciliación se habilita cuando la recepción esté completa o cerrada contra la orden original.</p>}
            {sp.estado === 'pagada' && diferencia > 0.005 && compra.estadoRecepcion === 'completa' && (
              <p className="text-sm">Hay saldo por pagar. <Link className="font-semibold text-marca-vino underline" to={`/tesoreria/nueva?compra=${compra.id}`}>Preparar solicitud de pago final por la diferencia</Link></p>
            )}
            {sp.estado === 'pagada' && (
              <div className="flex justify-end">
                <BotonConPermiso variante="primario" permitido={puede(u, 'pago.registrar') && puedeConciliar} motivo={!puede(u, 'pago.registrar') ? 'Solo Tesorería concilia anticipos' : 'Falta cerrar la recepción o pagar el saldo pendiente'} onClick={() => setModal('conciliar')}>Conciliar</BotonConPermiso>
              </div>
            )}
            {sp.estado === 'conciliada' && <p className="text-sm font-semibold text-ok">Anticipo conciliado: cierre administrativo registrado.</p>}
          </section>
        )}

        <section className="tarjeta p-4"><h3 className="mb-3 text-base font-bold">Historial</h3><LineaTiempoEstados historial={sp.historial} /></section>
      </div>

      <ModalConfirmar abierto={modal === 'enviar'} titulo="Enviar a aprobación" mensaje={`Se enviará ${sp.numero} por ${formatearMoneda(importeEdit)} a aprobación.`} textoConfirmar="Enviar" onCerrar={() => setModal(null)}
        onConfirmar={() => resultado(e.enviarSolicitudPago(sp.id, { importe: importeEdit, observacion: obsTxt ?? undefined }))} />
      <ModalConfirmar abierto={modal === 'aprobar'} titulo="Aprobar pago" mensaje={`Aprobarás ${sp.numero} por ${formatearMoneda(sp.importe)}. Esto no modifica el stock.`} textoConfirmar="Aprobar" onCerrar={() => setModal(null)}
        onConfirmar={() => resultado(e.decidirSolicitudPago(sp.id, 'aprobar'))} />
      <ModalObservacion abierto={modal === 'devolver'} titulo="Devolver con observación" textoConfirmar="Devolver" minimo={10} onCerrar={() => setModal(null)}
        onConfirmar={(obs) => resultado(e.decidirSolicitudPago(sp.id, 'devolver', obs))} />
      <ModalConfirmar abierto={modal === 'pagar'} titulo="Registrar pago" mensaje={`Se registrará el pago de ${formatearMoneda(pagoImporte)} con el comprobante ${comprobante}.`} textoConfirmar="Registrar" onCerrar={() => setModal(null)}
        onConfirmar={() => resultado(e.registrarPago(sp.id, { fecha, importe: pagoImporte, medio, comprobante, referencia, cuentaId }))} />
      <ModalConfirmar abierto={modal === 'conciliar'} titulo="Conciliar anticipo" mensaje="Se marcará el anticipo como conciliado y la orden quedará lista para el cierre administrativo." textoConfirmar="Conciliar" onCerrar={() => setModal(null)}
        onConfirmar={() => resultado(e.conciliarAnticipo(sp.id))} />
    </div>
  );
}

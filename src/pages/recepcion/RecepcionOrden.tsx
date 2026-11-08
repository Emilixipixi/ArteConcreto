import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardEdit, Lock } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import AdjuntoSimulado from '../../components/AdjuntoSimulado';
import BotonConPermiso from '../../components/BotonConPermiso';
import CantidadConEquivalencia from '../../components/CantidadConEquivalencia';
import EstadoBadge from '../../components/EstadoBadge';
import EstadoVacio from '../../components/EstadoVacio';
import EstadosCompra from '../../components/EstadosCompra';
import LineaTiempoEstados from '../../components/LineaTiempoEstados';
import ModalConfirmar from '../../components/ModalConfirmar';
import ModalObservacion from '../../components/ModalObservacion';
import PageHeader from '../../components/PageHeader';
import { formatearFecha, formatearFechaHora } from '../../lib/formato';
import { reglaSegregacion } from '../../lib/permisos';
import { hoyISO } from '../../lib/reglas';
import { aBase, formatearCantidad, validarDecimales } from '../../lib/unidades';
import { useUsuarioActual } from '../../store/selectores';
import { anticipoPagado, pendientePorLinea } from '../../store/selectoresFase3';
import { useStore } from '../../store/useStore';

// Formulario de recepcion (RF-25, RF-26) y historial de recepciones de la orden
export default function RecepcionOrden() {
  const { id } = useParams();
  const e = useStore();
  const u = useUsuarioActual()!;
  const compra = e.compras.find((c) => c.id === id);
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [bodegaId, setBodegaId] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [remision, setRemision] = useState('');
  const [observacion, setObservacion] = useState('');
  const [motivoExceso, setMotivoExceso] = useState('');
  const [adjuntos, setAdjuntos] = useState<string[]>([]);
  const [modal, setModal] = useState<null | 'confirmar' | 'cerrar'>(null);

  if (!compra) return <EstadoVacio titulo="Orden no encontrada" accion={<Link className="btn-primario" to="/recepcion">Volver a la bandeja</Link>} />;
  const prov = e.proveedores.find((p) => p.id === compra.proveedorId)?.nombre ?? '-';
  const nombre = (uid: string) => e.usuarios.find((x) => x.id === uid)?.nombre ?? uid;
  const bodegaSel = bodegaId || compra.lugarEntregaBodegaId || 'b1';
  const pend = pendientePorLinea(e, compra);
  const recepciones = e.recepciones.filter((r) => r.compraId === compra.id).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  const regla = reglaSegregacion(u, compra, 'recepcion.confirmar', { parametros: e.parametros, solicitudesPago: e.solicitudesPago, pagos: e.pagos });
  const bloqueoAnticipo = compra.modalidadPago === 'anticipo' && !anticipoPagado(e, compra.id);
  const recibible = ['aprobada', 'recibida_parcial'].includes(compra.estado) && compra.estadoRecepcion !== 'completa';
  const permitido = regla.permitido && !bloqueoAnticipo && recibible;
  const motivoBloqueo = bloqueoAnticipo ? 'El anticipo debe estar pagado antes de recibir' : !recibible ? 'La orden no está disponible para recepción' : regla.motivo;

  // Validacion en linea por cantidad
  const num = (sku: string) => { const t = (cantidades[sku] ?? '').replace(',', '.'); return t === '' ? 0 : parseFloat(t); };
  const errorLinea = (sku: string, unidadId: string): string | null => {
    const v = num(sku);
    if (!isFinite(v) || v < 0) return 'Cantidad inválida';
    return validarDecimales(v, unidadId);
  };
  const hayErrores = pend.some((l) => errorLinea(l.sku, l.unidadId));
  const hayExceso = pend.some((l) => num(l.sku) - l.pendiente > 0.0005);
  const totalIngresado = pend.reduce((a, l) => a + num(l.sku), 0);
  const faltaMotivo = hayExceso && motivoExceso.trim().length < 5;
  const invalido = hayErrores || totalIngresado <= 0 || faltaMotivo;

  const payload = () => pend.map((l) => ({ sku: l.sku, recibidoAhora: num(l.sku) }));
  const extra = () => ({ bodegaId: bodegaSel, fecha, remision, adjuntos, motivoExceso: hayExceso ? motivoExceso : undefined, observacionesLinea: notas });
  const limpiar = () => { setCantidades({}); setNotas({}); setObservacion(''); setMotivoExceso(''); setRemision(''); setAdjuntos([]); };
  const confirmar = () => {
    const r = e.registrarRecepcion(compra.id, payload(), observacion, extra());
    if (!r.ok) e.mostrarToast(r.error ?? 'No se pudo registrar', 'error'); else limpiar();
  };
  // Cerrar contra la orden original: registra primero lo que se haya digitado y luego cierra con el motivo
  const cerrar = (motivo: string) => {
    if (totalIngresado > 0) {
      const r = e.registrarRecepcion(compra.id, payload(), observacion, extra());
      if (!r.ok) return e.mostrarToast(r.error ?? 'No se pudo registrar', 'error');
    }
    const actual = useStore.getState().compras.find((c) => c.id === compra.id);
    if (actual && actual.estadoRecepcion !== 'completa') {
      const r2 = e.cerrarRecepcion(compra.id, motivo);
      if (!r2.ok) return e.mostrarToast(r2.error ?? 'No se pudo cerrar', 'error');
    }
    limpiar();
  };
  // Ayuda para llenar: que falta para poder confirmar
  const lineasConCantidad = pend.filter((l) => num(l.sku) > 0).length;
  const faltaParaConfirmar = hayErrores ? 'Corrige las cantidades marcadas en rojo' : totalIngresado <= 0 ? 'Digita en la columna "Recibido ahora" la cantidad que llegó de al menos un SKU' : faltaMotivo ? 'Escribe el motivo del exceso (mínimo 5 letras)' : '';
  const recibirTodo = () => setCantidades(Object.fromEntries(pend.map((l) => [l.sku, String(l.pendiente)])));
  const puedeCerrar = permitido && (compra.estadoRecepcion === 'parcial' || totalIngresado > 0);

  return (
    <div>
      <PageHeader titulo={`Recepción de ${compra.numero}`} migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Recepción de almacén', ruta: '/recepcion' }, { texto: compra.numero }]}
        acciones={<Link className="btn-fantasma" to={`/compras/${compra.id}`}>Ver orden de compra</Link>} />
      <div className="space-y-4">
        <section className="tarjeta space-y-3 p-4">
          <div className="grid gap-4 text-sm sm:grid-cols-4">
            <div><p className="etiqueta">Orden vinculada</p><Link className="font-semibold text-marca-vino underline" to={`/compras/${compra.id}`}>{compra.numero}</Link></div>
            <div><p className="etiqueta">Proveedor</p>{prov}</div>
            <div><p className="etiqueta">Entrega estimada</p>{formatearFecha(compra.fechaEstimadaEntrega)}</div>
            <div><p className="etiqueta">Modalidad de pago</p>{compra.modalidadPago === 'anticipo' ? `Anticipo ${compra.porcentajeAnticipo ?? 0} %` : 'Pago posterior'}</div>
          </div>
          <EstadosCompra compra={compra} />
          {bloqueoAnticipo && <p className="flex items-center gap-2 rounded-md border border-aviso/40 bg-aviso/10 px-3 py-2 text-sm"><Lock size={15} aria-hidden="true" /> Esta orden es con anticipo y el anticipo aún no está pagado: la recepción está bloqueada.</p>}
          {!regla.permitido && !bloqueoAnticipo && <p className="flex items-center gap-2 rounded-md border border-aviso/40 bg-aviso/10 px-3 py-2 text-sm"><AlertTriangle size={15} aria-hidden="true" /> {regla.motivo}</p>}
        </section>

        {recibible && (
          <section className="tarjeta space-y-4 p-4">
            <h3 className="text-base font-bold">Registrar recepción</h3>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-marca-vino/30 bg-marca-vino/5 px-3 py-2.5 text-sm">
              <p className="flex items-start gap-2"><ClipboardEdit size={18} className="mt-0.5 shrink-0 text-marca-vino" aria-hidden="true" />
                <span><strong>Qué debes llenar:</strong> en la columna <strong>Recibido ahora</strong> escribe la cantidad que realmente llegó de cada SKU. Si llegó todo, usa el botón de la derecha. Luego pulsa <strong>Confirmar recepción</strong>.</span></p>
              <button type="button" className="btn-secundario shrink-0" onClick={recibirTodo}>Recibir todo lo pendiente</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className="etiqueta" htmlFor="rc-bodega">Bodega de recepción</label>
                <select id="rc-bodega" className="campo" value={bodegaSel} onChange={(ev) => setBodegaId(ev.target.value)}>{e.bodegas.filter((b) => b.activa).map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select></div>
              <div><label className="etiqueta" htmlFor="rc-fecha">Fecha de recepción</label><input id="rc-fecha" type="date" max={hoyISO()} className="campo" value={fecha} onChange={(ev) => setFecha(ev.target.value)} /></div>
              <div><label className="etiqueta" htmlFor="rc-rem">Documento del proveedor (remisión, opcional)</label><input id="rc-rem" className="campo" value={remision} onChange={(ev) => setRemision(ev.target.value)} /></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-concreto-100 text-xs uppercase text-concreto-600"><tr>
                  <th className="px-2 py-2 text-left">SKU</th><th className="px-2 py-2 text-right">Ordenado</th><th className="px-2 py-2 text-right">Recibido antes</th><th className="px-2 py-2 text-right">Pendiente</th>
                  <th className="bg-aviso/20 px-2 py-2 text-left text-marca-vino">Recibido ahora (llenar)</th><th className="px-2 py-2 text-right">Faltante</th><th className="px-2 py-2 text-left">Observación</th></tr></thead>
                <tbody>{pend.map((l) => {
                  const art = e.articulos.find((a) => a.sku === l.sku)!;
                  const v = num(l.sku); const err = errorLinea(l.sku, l.unidadId);
                  const faltante = Math.max(0, Math.round((l.pendiente - v) * 1000) / 1000);
                  const exceso = v - l.pendiente > 0.0005;
                  return (
                    <tr key={l.sku} className="border-t border-concreto-300 align-top">
                      <td className="px-2 py-2 font-semibold">{l.sku}<span className="block text-xs font-normal text-concreto-600">{art.nombre}</span></td>
                      <td className="px-2 py-2 text-right tabular-nums">{formatearCantidad(l.ordenado, l.unidadId)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{formatearCantidad(l.recibido, l.unidadId)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{formatearCantidad(l.pendiente, l.unidadId)}</td>
                      <td className="bg-aviso/10 px-2 py-2">
                        <input aria-label={`Cantidad recibida de ${l.sku}`} inputMode="decimal" className={`campo w-36 border-2 ${err ? 'border-error' : v > 0 ? 'border-ok' : 'border-aviso'}`} value={cantidades[l.sku] ?? ''} placeholder={`Cantidad (${l.unidadId})`} onChange={(ev) => setCantidades({ ...cantidades, [l.sku]: ev.target.value })} />
                        {err ? <p className="mt-1 text-xs text-error">{err}</p> : v > 0 && <p className="mt-1 text-xs text-concreto-600">{formatearCantidad(l.unidadId === art.unidadBaseId ? v : aBase(v, l.unidadId, art), art.unidadBaseId)} ingresan al stock</p>}
                        {exceso && <p className="mt-1 text-xs font-semibold text-aviso">Excede lo pendiente</p>}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{faltante > 0 ? <span className="text-aviso">{formatearCantidad(faltante, l.unidadId)}</span> : '0'}</td>
                      <td className="px-2 py-2"><input aria-label={`Observación de ${l.sku}`} className="campo" value={notas[l.sku] ?? ''} onChange={(ev) => setNotas({ ...notas, [l.sku]: ev.target.value })} /></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            {hayExceso && (
              <div><label className="etiqueta" htmlFor="rc-exceso">Exceso aceptado: motivo (obligatorio)</label>
                <input id="rc-exceso" className={`campo ${faltaMotivo ? 'border-error' : ''}`} value={motivoExceso} onChange={(ev) => setMotivoExceso(ev.target.value)} placeholder="Ej. el proveedor entregó un saco adicional sin costo" />
                <p className="mt-1 text-xs text-aviso">Recibir más de lo pendiente genera una alerta para Compras.</p></div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="etiqueta" htmlFor="rc-obs">Observación general</label><textarea id="rc-obs" className="campo min-h-[72px]" value={observacion} onChange={(ev) => setObservacion(ev.target.value)} /></div>
              <div><p className="etiqueta">Remisión adjunta (simulada)</p><AdjuntoSimulado adjuntos={adjuntos} onChange={setAdjuntos} /></div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-concreto-300 pt-3">
              <p className={`mr-auto flex items-center gap-2 text-sm ${faltaParaConfirmar ? 'text-aviso' : 'text-ok'}`}>
                {faltaParaConfirmar ? <><AlertTriangle size={16} aria-hidden="true" /> {faltaParaConfirmar}</> : <><CheckCircle2 size={16} aria-hidden="true" /> Listo para confirmar: {lineasConCantidad} {lineasConCantidad === 1 ? 'línea' : 'líneas'} con cantidad.</>}</p>
              <BotonConPermiso variante="secundario" permitido={puedeCerrar} motivo={permitido ? 'Registra una recepción parcial primero o digita cantidades' : motivoBloqueo} onClick={() => setModal('cerrar')}>Cerrar contra la orden original</BotonConPermiso>
              <BotonConPermiso variante="primario" permitido={permitido} motivo={motivoBloqueo} deshabilitado={invalido} onClick={() => setModal('confirmar')}>Confirmar recepción</BotonConPermiso>
            </div>
          </section>
        )}

        <section className="tarjeta p-4">
          <h3 className="mb-3 text-base font-bold">Historial de recepciones</h3>
          {recepciones.length === 0 ? <p className="text-sm text-concreto-600">Todavía no hay recepciones para esta orden.</p> : (
            <ul className="space-y-3">{recepciones.map((r) => {
              const art = (sku: string) => e.articulos.find((a) => a.sku === sku)!;
              return (
                <li key={r.id} className="rounded-md border border-concreto-300 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-bold">{r.numero}</span><EstadoBadge estado={r.estado} />{r.esCierre && <span className="chip">Cierre</span>}
                    <span className="text-xs text-concreto-600">{formatearFechaHora(r.fechaRecepcion ?? r.creadoEn)} - {nombre(r.creadoPor)} - {e.bodegas.find((b) => b.id === r.bodegaId)?.nombre}</span></div>
                  <ul className="mt-2 grid gap-1 sm:grid-cols-2">{r.lineas.filter((l) => l.recibidoAhora > 0 || l.faltante > 0).map((l) => (
                    <li key={l.sku} className="text-xs"><strong>{l.sku}</strong>: <CantidadConEquivalencia cantidad={l.recibidoAhora} unidadId={l.unidadId} articulo={art(l.sku)} />
                      {l.faltante > 0 && <span className="text-aviso"> (faltan {formatearCantidad(l.faltante, l.unidadId)})</span>}{l.exceso && <span className="text-aviso"> (exceso aceptado)</span>}{l.observacion && <span className="block text-concreto-600">{l.observacion}</span>}</li>))}</ul>
                  {(r.observacion || r.remision || r.motivoExceso || r.motivoCierre) && <p className="mt-2 text-xs text-concreto-600">{[r.remision && `Remisión ${r.remision}`, r.observacion, r.motivoExceso && `Exceso: ${r.motivoExceso}`, r.motivoCierre && `Cierre: ${r.motivoCierre}`].filter(Boolean).join(' - ')}</p>}
                </li>
              );
            })}</ul>
          )}
        </section>
        <section className="tarjeta p-4"><h3 className="mb-3 text-base font-bold">Historial de la orden</h3><LineaTiempoEstados historial={compra.historial} /></section>
      </div>

      <ModalConfirmar abierto={modal === 'confirmar'} titulo="Confirmar recepción" textoConfirmar="Confirmar" onCerrar={() => setModal(null)} onConfirmar={confirmar}
        mensaje={`Se registrará la entrada al inventario solo por lo recibido: ${pend.filter((l) => num(l.sku) > 0).map((l) => `${formatearCantidad(num(l.sku), l.unidadId)} de ${l.sku}`).join(', ') || 'nada'}.`} />
      <ModalObservacion abierto={modal === 'cerrar'} titulo="Cerrar contra la orden original" etiqueta="Motivo del cierre (obligatorio)" textoConfirmar="Cerrar orden" minimo={10} onCerrar={() => setModal(null)} onConfirmar={cerrar} />
    </div>
  );
}

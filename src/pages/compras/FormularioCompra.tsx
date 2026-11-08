import { useMemo, useState } from 'react';
import { FileCheck2, Send } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import ComparativoCotizaciones from '../../components/ComparativoCotizaciones';
import FormMultiItem, { type LineaForm } from '../../components/FormMultiItem';
import ModalConfirmar from '../../components/ModalConfirmar';
import PageHeader from '../../components/PageHeader';
import TablaLineas from '../../components/TablaLineas';
import { formatearMoneda } from '../../lib/formato';
import { puede } from '../../lib/permisos';
import { aBase, formatearCantidad, validarDecimales } from '../../lib/unidades';
import { calcularTotales, dentroUmbral, hoyISO, importesAnticipo, validarCompra, type Errores } from '../../lib/reglas';
import { useUsuarioActual } from '../../store/selectores';
import { useStore } from '../../store/useStore';

import type { LineaCompra } from '../../types';

// P-06 Formulario de compra: items, cotizaciones, proveedor, condiciones, modalidad, fecha y totales
export default function FormularioCompra() {
  const { id } = useParams();
  const navigate = useNavigate();
  const u = useUsuarioActual()!;
  const estado = useStore();
  const c = estado.compras.find((x) => x.id === id);
  const sol = estado.solicitudes.find((s) => s.id === c?.solicitudId);
  const esAdm = c?.origen === 'administrativa';

  const [cantidades, setCantidades] = useState<Record<string, number>>(() => Object.fromEntries((c?.lineas ?? []).map((l) => [l.sku, l.cantidad])));
  const [lineasAdm, setLineasAdm] = useState<LineaForm[]>(() => (c?.lineas ?? []).map((l) => ({ sku: l.sku, cantidad: l.cantidad, unidadId: l.unidadId })));
  const [modalidad, setModalidad] = useState(c?.modalidadPago ?? 'pago_posterior');
  const [pct, setPct] = useState(c?.porcentajeAnticipo ?? 50);
  const [condiciones, setCondiciones] = useState(c?.condiciones ?? '');
  const [fecha, setFecha] = useState((c?.fechaEstimadaEntrega ?? hoyISO(7)).slice(0, 10));
  const [lugar, setLugar] = useState(c?.lugarEntregaBodegaId ?? 'b1');
  const [obs, setObs] = useState(c?.observaciones ?? '');
  const [justCant, setJustCant] = useState(c?.justificacionCantidad ?? '');
  const [errores, setErrores] = useState<Errores>({});
  const [confirmar, setConfirmar] = useState(false);

  // Precios vigentes segun el proveedor elegido (guardado en el store)
  const lineas: LineaCompra[] = useMemo(() => {
    if (!c) return [];
    const sel = c.cotizaciones.find((q) => q.seleccionada);
    const precio = (sku: string) => sel?.precios.find((p) => p.sku === sku)?.precioUnitario ?? 0;
    if (esAdm) return lineasAdm.filter((l) => l.sku).map((l) => ({ ...l, precioUnitario: precio(l.sku) }));
    return c.lineas.map((l) => ({ ...l, cantidad: cantidades[l.sku] ?? l.cantidad }));
  }, [c, esAdm, lineasAdm, cantidades]);

  if (!c) return <Navigate to="/compras" replace />;
  if (!puede(u, 'compra.crear')) return <Navigate to="/403" replace />;
  if (!['borrador', 'devuelta'].includes(c.estado)) return <Navigate to={`/compras/${c.id}`} replace />;

  const t = calcularTotales(lineas, estado.parametros.impuestoInformativoPct);
  const { anticipo, saldo } = importesAnticipo(t.total, pct);
  const dentro = dentroUmbral(t.total, estado.parametros);
  const sinGuardarItems = esAdm && lineasAdm.filter((l) => l.sku).map((l) => `${l.sku}|${l.unidadId}`).join() !== c.lineas.map((l) => `${l.sku}|${l.unidadId}`).join();
  // Aumentos de cantidad respecto de la solicitud exigen justificacion
  const aumenta = !!sol && lineas.some((l) => { const a = estado.articulos.find((x) => x.sku === l.sku); const s = sol.lineas.find((x) => x.sku === l.sku); return a && s && aBase(l.cantidad, l.unidadId, a) > aBase(s.cantidad, s.unidadId, a) + 1e-9; });

  const payload = () => ({ lineas, modalidadPago: modalidad, porcentajeAnticipo: modalidad === 'anticipo' ? pct : undefined, condiciones, fechaEstimadaEntrega: fecha, lugarEntregaBodegaId: lugar, observaciones: obs, justificacionCantidad: justCant });
  const guardar = (silencioso = false) => {
    const r = estado.guardarCompra(payload(), c.id);
    if (!r.ok) estado.mostrarToast(r.error ?? 'No se pudo guardar', 'error');
    else if (!silencioso) navigate(`/compras/${c.id}`);
    return r.ok;
  };
  const elegir = (pid: string) => {
    if (sinGuardarItems) return estado.mostrarToast('Guarda el borrador antes de elegir proveedor para actualizar las cotizaciones', 'info');
    const r = estado.elegirProveedor(c.id, pid);
    if (!r.ok) return estado.mostrarToast(r.error ?? 'No se pudo elegir', 'error');
    // El proveedor fija condiciones de pago y plazo: se sincronizan con el formulario
    const nuevo = useStore.getState().compras.find((x) => x.id === c.id);
    if (nuevo) { setCondiciones(nuevo.condiciones); setFecha(nuevo.fechaEstimadaEntrega.slice(0, 10)); }
  };
  const generar = () => {
    const e = validarCompra({ ...c, ...payload(), proveedorId: c.proveedorId }, sol, estado.articulos);
    setErrores(e);
    if (Object.keys(e).length) return estado.mostrarToast('Revisa los campos marcados antes de generar la orden', 'error');
    if (!guardar(true)) return;
    const r = estado.generarOrdenCompra(c.id);
    if (!r.ok) estado.mostrarToast(r.error ?? 'No se pudo generar', 'error');
  };
  const enviar = () => { const r = estado.enviarCompraAAprobacion(c.id); if (r.ok) navigate(`/compras/${c.id}`); else estado.mostrarToast(r.error ?? 'No se pudo enviar', 'error'); };
  const devolucion = c.estado === 'devuelta' ? [...c.historial].reverse().find((h) => h.estadoNuevo === 'devuelta') : undefined;
  const msg = (k: string) => errores[k] && <p className="mt-1 text-xs text-error">{errores[k]}</p>;

  return (
    <div className="space-y-5">
      <PageHeader titulo={`Compra ${c.numero}`} migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Gestión de compras', ruta: '/compras' }, { texto: c.numero }]}
        subtitulo={esAdm ? `Compra administrativa - ${c.motivoAdministrativo} (${c.centroCosto})` : `Desde la solicitud ${sol?.numero}`} />
      {devolucion && <div className="rounded-md border-2 border-aviso/50 bg-aviso/10 p-3 text-sm" role="note"><p className="font-semibold text-aviso">Orden devuelta</p><p>{devolucion.observacion}</p></div>}

      <section className="tarjeta p-4"><h2 className="mb-3 text-base font-bold">1. Ítems</h2>
        {esAdm ? <><FormMultiItem lineas={lineasAdm} onChange={setLineasAdm} tipo="materia_prima" />{msg('lineas')}{sinGuardarItems && <p className="mt-2 text-xs text-concreto-600">Guarda el borrador para actualizar las cotizaciones.</p>}</> : (
          <div className="space-y-2">
            {c.lineas.map((l, i) => {
              const a = estado.articulos.find((x) => x.sku === l.sku);
              const s = sol?.lineas.find((x) => x.sku === l.sku);
              const err = errores[`linea-${i}`] ?? (a && validarDecimales(cantidades[l.sku] ?? l.cantidad, l.unidadId));
              return (
                <div key={l.sku} className="grid grid-cols-1 items-center gap-2 rounded-md border border-concreto-300 bg-concreto-100/50 p-2 sm:grid-cols-[2fr_1fr_2fr]">
                  <div className="text-sm"><span className="font-semibold text-marca-vino">{l.sku}</span> {a?.nombre}</div>
                  <div><label className="etiqueta">Cantidad ({l.unidadId})</label><input type="number" min={0} step="any" className={`campo tabular-nums ${err ? 'border-error' : ''}`} value={cantidades[l.sku] ?? ''} onChange={(e) => setCantidades({ ...cantidades, [l.sku]: parseFloat(e.target.value) || 0 })} /></div>
                  <div className="text-xs text-concreto-600">{s && a && <>Solicitado: {formatearCantidad(s.cantidad, s.unidadId)}. </>}{a && (cantidades[l.sku] ?? l.cantidad) > 0 && <>Equivale a {formatearCantidad(aBase(cantidades[l.sku] ?? l.cantidad, l.unidadId, a), a.unidadBaseId)}</>}{err && <span className="block text-error">{err}</span>}</div>
                </div>
              );
            })}
            {aumenta && <div><label className="etiqueta" htmlFor="jc">Justificación del aumento de cantidad</label><textarea id="jc" className={`campo ${errores.justificacionCantidad ? 'border-error' : ''}`} value={justCant} onChange={(e) => setJustCant(e.target.value)} />{msg('justificacionCantidad')}</div>}
            <p className="text-xs text-concreto-600">Las cantidades pueden bajar libremente; para subirlas se exige justificación.</p>
          </div>
        )}
      </section>

      <section className="tarjeta p-4"><h2 className="mb-1 text-base font-bold">2 y 3. Cotizaciones y selección del proveedor</h2>
        <p className="mb-3 text-xs text-concreto-600">Cotizaciones ilustrativas generadas automáticamente. El proveedor elegido fija el precio de cada línea.</p>
        <ComparativoCotizaciones compra={{ lineas, cotizaciones: c.cotizaciones, proveedorId: c.proveedorId }} onElegir={elegir} />{msg('proveedor')}
      </section>

      <section className="tarjeta grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
        <h2 className="text-base font-bold sm:col-span-2">4 a 6. Condiciones, modalidad de pago y entrega</h2>
        <div><label className="etiqueta" htmlFor="cond">Forma de pago</label><input id="cond" className={`campo ${errores.condiciones ? 'border-error' : ''}`} value={condiciones} onChange={(e) => setCondiciones(e.target.value)} placeholder="Se completa al elegir proveedor" />{msg('condiciones')}</div>
        <div><label className="etiqueta" htmlFor="lug">Lugar de entrega</label><select id="lug" className="campo" value={lugar} onChange={(e) => setLugar(e.target.value)}>{estado.bodegas.filter((b) => b.activa).map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select>{msg('lugarEntrega')}</div>
        <div className="sm:col-span-2"><label className="etiqueta" htmlFor="obsc">Observaciones</label><textarea id="obsc" className="campo" value={obs} onChange={(e) => setObs(e.target.value)} /></div>
        <fieldset><legend className="etiqueta">Modalidad de pago</legend>
          <div className="flex gap-4 text-sm">
            <label className="inline-flex items-center gap-1.5"><input type="radio" name="mod" checked={modalidad === 'pago_posterior'} onChange={() => setModalidad('pago_posterior')} /> Pago posterior</label>
            <label className="inline-flex items-center gap-1.5"><input type="radio" name="mod" checked={modalidad === 'anticipo'} onChange={() => setModalidad('anticipo')} /> Anticipo</label>
          </div>
          {modalidad === 'anticipo' && (
            <div className="mt-2"><label className="etiqueta" htmlFor="pct">Porcentaje de anticipo</label>
              <input id="pct" type="number" min={1} max={100} className={`campo max-w-[120px] ${errores.anticipo ? 'border-error' : ''}`} value={pct} onChange={(e) => setPct(parseFloat(e.target.value) || 0)} />{msg('anticipo')}
              <p className="mt-1 text-xs text-concreto-600">Anticipo {formatearMoneda(anticipo)} - Saldo {formatearMoneda(saldo)}</p></div>
          )}
        </fieldset>
        <div><label className="etiqueta" htmlFor="fe">Fecha estimada de entrega</label><input id="fe" type="date" min={hoyISO()} className={`campo ${errores.fecha ? 'border-error' : ''}`} value={fecha} onChange={(e) => setFecha(e.target.value)} />{msg('fecha')}</div>
      </section>

      <section className="tarjeta ml-auto max-w-sm p-4 text-sm" aria-label="Totales">
        <h2 className="mb-2 text-base font-bold">7. Totales</h2>
        <div className="flex justify-between"><span className="text-concreto-600">Subtotal</span><span className="tabular-nums">{formatearMoneda(t.subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-concreto-600">Impuesto informativo ({estado.parametros.impuestoInformativoPct} %)</span><span className="tabular-nums">{formatearMoneda(t.impuestoInformativo)}</span></div>
        <div className="mt-1 flex justify-between border-t border-concreto-300 pt-1 text-base font-bold"><span>Total</span><span className="tabular-nums">{formatearMoneda(t.total)}</span></div>
        <p className="mt-2 text-xs text-concreto-600">{dentro ? 'Dentro del umbral: lo aprueba el Director.' : `Supera ${formatearMoneda(estado.parametros.umbralCompra)}: requiere aprobación de Gerencia.`}</p>
      </section>

      {lineas.length > 0 && <details className="tarjeta p-3 text-sm"><summary className="cursor-pointer font-semibold">Vista de ítems con equivalencias</summary><div className="mt-2"><TablaLineas lineas={lineas} mostrarPrecios /></div></details>}

      <div className="flex flex-wrap justify-end gap-2">
        <button className="btn-fantasma" onClick={() => navigate(`/compras/${c.id}`)}>Cancelar</button>
        <button className="btn-secundario" onClick={() => guardar()}>Guardar borrador</button>
        <button className={c.ordenGenerada ? 'btn-secundario' : 'btn-primario'} onClick={generar}><FileCheck2 size={15} /> Generar orden de compra</button>
        {c.ordenGenerada && <button className="btn-primario" onClick={() => setConfirmar(true)}><Send size={15} /> Enviar a aprobación</button>}
      </div>
      <ModalConfirmar abierto={confirmar} titulo="Enviar a aprobación" textoConfirmar="Enviar"
        mensaje={`La orden ${c.numero} (${formatearMoneda(c.total)}) se enviará a ${dentro ? 'Dirección' : 'Gerencia'}. Hasta que sea aprobada no podrá pagarse ni recibirse.`} onConfirmar={enviar} onCerrar={() => setConfirmar(false)} />
    </div>
  );
}

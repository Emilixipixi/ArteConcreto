import { useMemo, useState } from 'react';
import { AlertTriangle, Plus, Send, Trash2 } from 'lucide-react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AdjuntoSimulado from '../../components/AdjuntoSimulado';
import BuscadorArticulo from '../../components/BuscadorArticulo';
import CantidadConEquivalencia from '../../components/CantidadConEquivalencia';
import ModalConfirmar from '../../components/ModalConfirmar';
import PageHeader from '../../components/PageHeader';
import SelectorUnidad from '../../components/SelectorUnidad';
import { AREAS, MAX_ADJUNTOS, PRIORIDADES, hoyISO, validarSolicitud, type Errores } from '../../lib/reglas';
import { formatearCantidad, validarDecimales } from '../../lib/unidades';
import { puede } from '../../lib/permisos';
import { stockPorSku, useUsuarioActual } from '../../store/selectores';
import { useStore } from '../../store/useStore';
import type { LineaSolicitud, Solicitud } from '../../types';

// P-04 Nueva solicitud / edicion (borrador o devuelta)
export default function FormularioSolicitud() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const u = useUsuarioActual()!;
  const estado = useStore();
  const existente = id ? estado.solicitudes.find((s) => s.id === id) : undefined;
  const esReenvio = existente?.estado === 'devuelta';

  const [area, setArea] = useState(existente?.area ?? (params.get('faltantes') ? 'Planta' : ''));
  const [prioridad, setPrioridad] = useState<Solicitud['prioridad']>(existente?.prioridad ?? 'media');
  const [fechaRequerida, setFecha] = useState(existente?.fechaRequerida ?? '');
  const [justificacion, setJust] = useState(existente?.justificacion ?? (params.get('faltantes') ? 'Insumos faltantes para una fabricación programada.' : ''));
  // Fase 4: desde Fabricacion llegan los faltantes como ?faltantes=SKU:cantidad,... (cantidad en unidad base)
  const [lineas, setLineas] = useState<LineaSolicitud[]>(() => {
    if (existente) return existente.lineas;
    const out: LineaSolicitud[] = [];
    for (const par of (params.get('faltantes') ?? '').split(',').filter(Boolean)) {
      const [sku, cant] = par.split(':'); const a = estado.articulos.find((x) => x.sku === sku && x.tipo === 'materia_prima');
      if (a && Number(cant) > 0) out.push({ sku, cantidad: Number(cant), unidadId: a.unidadBaseId, destinoBodegaId: estado.bodegas.find((b) => b.activa)?.id });
    }
    return out;
  });
  const [adjuntos, setAdjuntos] = useState<string[]>(existente?.adjuntos ?? []);
  const [intento, setIntento] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  const articulosMP = useMemo(() => estado.articulos.filter((a) => a.tipo === 'materia_prima' && a.activo), [estado.articulos]);
  const datos = { area, prioridad, fechaRequerida, justificacion, lineas, adjuntos };
  const errores: Errores = intento ? validarSolicitud(datos, estado.articulos) : {};
  const bodegas = estado.bodegas.filter((b) => b.activa);

  if (id && !existente) return <Navigate to="/solicitudes" replace />;
  if (existente && (existente.creadoPor !== u.id || !['borrador', 'devuelta'].includes(existente.estado))) return <Navigate to={`/solicitudes/${existente.id}`} replace />;
  if (!puede(u, 'solicitud.crear')) return <Navigate to="/403" replace />;

  const actualizar = (i: number, c: Partial<LineaSolicitud>) => setLineas(lineas.map((l, j) => (j === i ? { ...l, ...c } : l)));
  const agregar = () => setLineas([...lineas, { sku: '', cantidad: 0, unidadId: '', destinoBodegaId: bodegas[0]?.id }]);
  const elegirArticulo = (i: number, sku: string) => {
    const a = estado.articulos.find((x) => x.sku === sku)!;
    const otra = lineas.findIndex((l, j) => j !== i && l.sku === sku);
    if (otra >= 0) {
      // No se permiten articulos repetidos: se avisa y se suman las cantidades (en la unidad de la linea existente)
      const sumar = lineas[i].cantidad > 0 && lineas[i].unidadId === lineas[otra].unidadId ? lineas[i].cantidad : 0;
      setLineas(lineas.filter((_, j) => j !== i).map((l, j) => (j === (otra > i ? otra - 1 : otra) ? { ...l, cantidad: l.cantidad + sumar } : l)));
      estado.mostrarToast(`${sku} ya estaba en la solicitud: se unificó en una sola línea`, 'info');
      return;
    }
    actualizar(i, { sku, unidadId: a.presentaciones[0]?.unidadId ?? a.unidadBaseId });
  };

  const guardar = () => {
    const r = existente ? estado.guardarBorradorSolicitud(datos, existente.id) : estado.guardarBorradorSolicitud(datos);
    if (!r.ok) return estado.mostrarToast(r.error ?? 'No se pudo guardar', 'error');
    navigate(`/solicitudes/${r.id}`);
  };
  const pedirEnvio = () => {
    setIntento(true);
    if (Object.keys(validarSolicitud(datos, estado.articulos)).length) return;
    setConfirmar(true);
  };
  const enviar = () => {
    let idDoc = existente?.id;
    if (!esReenvio) { // primero se guarda el borrador y luego se envia
      const g = existente ? estado.guardarBorradorSolicitud(datos, existente.id) : estado.guardarBorradorSolicitud(datos);
      if (!g.ok) return estado.mostrarToast(g.error ?? 'No se pudo guardar', 'error');
      idDoc = g.id;
    }
    const r = esReenvio ? estado.reenviarSolicitud(idDoc!, datos) : estado.enviarSolicitud(idDoc!);
    if (!r.ok) return estado.mostrarToast(r.error ?? 'No se pudo enviar', 'error');
    navigate(`/solicitudes/${idDoc}`);
  };

  const resumen = Object.keys(errores).length;
  const devolucion = existente && [...existente.historial].reverse().find((h) => h.estadoNuevo === 'devuelta');

  return (
    <div>
      <PageHeader titulo={existente ? `${esReenvio ? 'Corregir y reenviar' : 'Editar'} ${existente.numero}` : 'Nueva solicitud'}
        migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Solicitudes', ruta: '/solicitudes' }, { texto: existente?.numero ?? 'Nueva' }]} />
      {esReenvio && devolucion && (
        <div className="mb-4 flex gap-3 rounded-md border border-aviso/40 bg-aviso/10 p-3 text-sm" role="note">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-aviso" aria-hidden="true" />
          <div><p className="font-semibold text-aviso">Observación del director</p><p>{devolucion.observacion}</p><p className="mt-1 text-xs text-concreto-600">Al reenviar se conserva todo el historial.</p></div>
        </div>
      )}
      {resumen > 0 && <div className="mb-4 rounded-md border border-error/40 bg-error/10 p-3 text-sm text-error" role="alert">Revisa {resumen} {resumen === 1 ? 'campo' : 'campos'} antes de enviar.</div>}

      <div className="space-y-5">
        <section className="tarjeta grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
          <div>
            <label className="etiqueta" htmlFor="area">Área solicitante</label>
            <select id="area" className={`campo ${errores.area ? 'border-error' : ''}`} value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="">Selecciona...</option>{AREAS.map((a) => <option key={a}>{a}</option>)}
            </select>
            {errores.area && <p className="mt-1 text-xs text-error">{errores.area}</p>}
          </div>
          <div>
            <label className="etiqueta" htmlFor="prio">Prioridad</label>
            <select id="prio" className="campo capitalize" value={prioridad} onChange={(e) => setPrioridad(e.target.value as Solicitud['prioridad'])}>{PRIORIDADES.map((p) => <option key={p}>{p}</option>)}</select>
          </div>
          <div>
            <label className="etiqueta" htmlFor="freq">Fecha requerida</label>
            <input id="freq" type="date" min={hoyISO()} className={`campo ${errores.fechaRequerida ? 'border-error' : ''}`} value={fechaRequerida} onChange={(e) => setFecha(e.target.value)} />
            {errores.fechaRequerida && <p className="mt-1 text-xs text-error">{errores.fechaRequerida}</p>}
          </div>
          <div className="sm:col-span-3">
            <label className="etiqueta" htmlFor="just">Justificación (obligatoria, mínimo 20 caracteres)</label>
            <textarea id="just" className={`campo min-h-[84px] ${errores.justificacion ? 'border-error' : ''}`} value={justificacion} onChange={(e) => setJust(e.target.value)} placeholder="Indica para qué pedido, lote o necesidad se requieren los materiales" />
            <div className="flex justify-between"><p className="mt-1 text-xs text-error">{errores.justificacion}</p><p className="mt-1 text-xs text-concreto-600">{justificacion.trim().length}/20</p></div>
          </div>
          <div className="sm:col-span-3">
            <p className="etiqueta">Adjuntos (simulados, máximo {MAX_ADJUNTOS})</p>
            <AdjuntoSimulado adjuntos={adjuntos} onChange={(a) => (a.length <= MAX_ADJUNTOS ? setAdjuntos(a) : estado.mostrarToast(`Máximo ${MAX_ADJUNTOS} adjuntos`, 'error'))} />
          </div>
        </section>

        <section className="tarjeta p-4" aria-label="Líneas de la solicitud">
          <h2 className="mb-3 text-base font-bold">Materiales solicitados</h2>
          {errores.lineas && <p className="mb-2 text-xs text-error">{errores.lineas}</p>}
          <div className="space-y-2">
            {lineas.map((l, i) => {
              const a = estado.articulos.find((x) => x.sku === l.sku);
              const errorLinea = errores[`linea-${i}`] ?? (l.cantidad > 0 && a ? validarDecimales(l.cantidad, l.unidadId) : null);
              const disp = a ? stockPorSku(estado, a.sku, l.destinoBodegaId).disponible : 0;
              return (
                <div key={i} className="rounded-md border border-concreto-300 bg-concreto-100/50 p-2">
                  <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[2fr_1fr_1fr_1.2fr_auto]">
                    <div><label className="etiqueta">Artículo</label><BuscadorArticulo value={l.sku} articulos={articulosMP} onChange={(sku) => elegirArticulo(i, sku)} invalido={!!errorLinea && !l.sku} /></div>
                    <div><label className="etiqueta">Cantidad</label><input type="number" min={0} step="any" className={`campo tabular-nums ${errorLinea ? 'border-error' : ''}`} value={l.cantidad || ''} onChange={(e) => actualizar(i, { cantidad: parseFloat(e.target.value) || 0 })} /></div>
                    <div><label className="etiqueta">Unidad</label><SelectorUnidad articulo={a} value={l.unidadId} onChange={(un) => actualizar(i, { unidadId: un })} /></div>
                    <div><label className="etiqueta">Bodega de destino</label>
                      <select className="campo" value={l.destinoBodegaId ?? ''} onChange={(e) => actualizar(i, { destinoBodegaId: e.target.value })}>{bodegas.map((b) => <option key={b.id} value={b.id}>{b.codigo}</option>)}</select></div>
                    <div className="sm:pt-5"><button type="button" className="btn-fantasma !px-2 text-error" aria-label="Quitar línea" onClick={() => setLineas(lineas.filter((_, j) => j !== i))}><Trash2 size={16} /></button></div>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[2fr_3fr]">
                    <input className="campo" placeholder="Observación (opcional)" value={l.observacion ?? ''} onChange={(e) => actualizar(i, { observacion: e.target.value })} aria-label="Observación de la línea" />
                    <div className="text-sm">
                      {a && l.cantidad > 0 && !validarDecimales(l.cantidad, l.unidadId) && <CantidadConEquivalencia cantidad={l.cantidad} unidadId={l.unidadId} articulo={a} />}
                      {a && <p className="text-xs text-concreto-600">Disponible en {bodegas.find((b) => b.id === l.destinoBodegaId)?.codigo ?? 'todas'}: {formatearCantidad(disp, a.unidadBaseId)} (mínimo {formatearCantidad(a.stockMinimo, a.unidadBaseId)})</p>}
                    </div>
                  </div>
                  {errorLinea && <p className="mt-1 text-xs text-error">{errorLinea}</p>}
                </div>
              );
            })}
          </div>
          <button type="button" className="btn-secundario mt-3" onClick={agregar}><Plus size={15} /> Agregar artículo</button>
        </section>

        <div className="flex flex-wrap justify-end gap-2">
          <button className="btn-fantasma" onClick={() => navigate(existente ? `/solicitudes/${existente.id}` : '/solicitudes')}>Cancelar</button>
          <button className="btn-secundario" onClick={guardar}>Guardar borrador</button>
          <button className="btn-primario" onClick={pedirEnvio}><Send size={15} /> {esReenvio ? 'Reenviar a aprobación' : 'Enviar a aprobación'}</button>
        </div>
      </div>
      <ModalConfirmar abierto={confirmar} titulo={esReenvio ? 'Reenviar solicitud' : 'Enviar a aprobación'} textoConfirmar="Enviar"
        mensaje="La solicitud pasará a estado Pendiente y se notificará al Director de solicitudes. ¿Deseas continuar?" onConfirmar={enviar} onCerrar={() => setConfirmar(false)} />
    </div>
  );
}

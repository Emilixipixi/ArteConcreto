import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdjuntoSimulado from '../../components/AdjuntoSimulado';
import BotonConPermiso from '../../components/BotonConPermiso';
import EstadoBadge from '../../components/EstadoBadge';
import EstadoVacio from '../../components/EstadoVacio';
import LineaTiempoEstados from '../../components/LineaTiempoEstados';
import ModalConfirmar from '../../components/ModalConfirmar';
import ModalObservacion from '../../components/ModalObservacion';
import PageHeader from '../../components/PageHeader';
import PrioridadChip from '../../components/PrioridadChip';
import TablaLineas from '../../components/TablaLineas';
import { diasDesde, formatearFecha } from '../../lib/formato';
import { reglaSegregacion } from '../../lib/permisos';
import { AREAS, PRIORIDADES } from '../../lib/reglas';
import { useUsuarioActual } from '../../store/selectores';
import { useStore } from '../../store/useStore';
import type { Prioridad, Solicitud } from '../../types';

type Pestana = 'pendientes' | 'mias' | 'todas';
const ORDEN: Record<Prioridad, number> = { urgente: 0, alta: 1, media: 2, baja: 3 };

// P-05 Bandeja del director: lista a la izquierda, detalle a la derecha (pagina de detalle en movil)
export default function BandejaDirector() {
  const { id } = useParams();
  const navigate = useNavigate();
  const u = useUsuarioActual()!;
  const estado = useStore();
  const [pestana, setPestana] = useState<Pestana>('pendientes');
  const [prioridad, setPrioridad] = useState('todas');
  const [area, setArea] = useState('todas');
  const [solicitante, setSolicitante] = useState('todos');
  const [desde, setDesde] = useState('');
  const [modal, setModal] = useState<null | 'aprobar' | 'devolver' | 'rechazar'>(null);
  const nombre = (uid: string) => estado.usuarios.find((x) => x.id === uid)?.nombre ?? uid;

  const lista = useMemo(() => estado.solicitudes.filter((s) => {
    if (pestana === 'pendientes' && s.estado !== 'pendiente') return false;
    if (pestana === 'mias' && !s.historial.some((h) => h.usuarioId === u.id && ['aprobada', 'devuelta', 'rechazada'].includes(h.estadoNuevo ?? ''))) return false;
    if (pestana === 'todas' && s.estado === 'borrador') return false;
    if (prioridad !== 'todas' && s.prioridad !== prioridad) return false;
    if (area !== 'todas' && s.area !== area) return false;
    if (solicitante !== 'todos' && s.creadoPor !== solicitante) return false;
    if (desde && s.creadoEn.slice(0, 10) < desde) return false;
    return true;
  }).sort((a, b) => ORDEN[a.prioridad] - ORDEN[b.prioridad] || a.actualizadoEn.localeCompare(b.actualizadoEn)), [estado.solicitudes, pestana, prioridad, area, solicitante, desde, u.id]);

  const sel: Solicitud | undefined = estado.solicitudes.find((s) => s.id === id);
  const solicitantes = [...new Set(estado.solicitudes.map((s) => s.creadoPor))];
  const regla = sel ? reglaSegregacion(u, sel, 'solicitud.decidir') : { permitido: false, motivo: '' };

  const decidir = (d: 'aprobar' | 'devolver' | 'rechazar', obs?: string) => {
    if (!sel) return;
    const r = estado.decidirSolicitud(sel.id, d, obs);
    if (!r.ok) estado.mostrarToast(r.error ?? 'No se pudo completar', 'error');
  };

  return (
    <div>
      <PageHeader titulo="Bandeja del director" migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Bandeja del director' }]} subtitulo="Revisa las solicitudes de materiales y decide: aprobar, devolver con observación o rechazar." />
      <div className={`grid grid-cols-1 gap-4 lg:grid-cols-[minmax(320px,420px)_1fr] ${id ? '' : ''}`}>
        {/* Lista: en movil se oculta cuando hay una solicitud abierta */}
        <div className={id ? 'hidden lg:block' : ''}>
          <div className="mb-2 flex gap-1 border-b border-concreto-300" role="tablist">
            {([['pendientes', 'Pendientes'], ['mias', 'Decididas por mí'], ['todas', 'Todas']] as const).map(([k, t]) => (
              <button key={k} role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)} className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${pestana === k ? 'border-marca-vino text-marca-vino' : 'border-transparent text-concreto-600'}`}>{t}</button>
            ))}
          </div>
          <div className="tarjeta mb-3 grid grid-cols-2 gap-2 p-3">
            <select className="campo" value={prioridad} onChange={(e) => setPrioridad(e.target.value)} aria-label="Prioridad"><option value="todas">Prioridad: todas</option>{PRIORIDADES.map((p) => <option key={p}>{p}</option>)}</select>
            <select className="campo" value={area} onChange={(e) => setArea(e.target.value)} aria-label="Área"><option value="todas">Área: todas</option>{AREAS.map((a) => <option key={a}>{a}</option>)}</select>
            <select className="campo" value={solicitante} onChange={(e) => setSolicitante(e.target.value)} aria-label="Solicitante"><option value="todos">Solicitante: todos</option>{solicitantes.map((c) => <option key={c} value={c}>{nombre(c)}</option>)}</select>
            <input type="date" className="campo" value={desde} onChange={(e) => setDesde(e.target.value)} aria-label="Desde" />
          </div>
          {lista.length === 0 ? <div className="tarjeta"><EstadoVacio titulo="Sin solicitudes" mensaje="No hay solicitudes en esta vista." /></div> : (
            <ul className="space-y-2">
              {lista.map((s) => {
                const dias = diasDesde(s.actualizadoEn);
                return (
                  <li key={s.id}>
                    <Link to={`/director/${s.id}`} className={`tarjeta block p-3 transition hover:border-marca-vino ${s.id === id ? 'border-marca-vino ring-1 ring-marca-vino' : ''}`}>
                      <div className="flex items-center justify-between gap-2"><span className="font-semibold text-marca-vino">{s.numero}</span><PrioridadChip prioridad={s.prioridad} /></div>
                      <p className="mt-1 text-xs text-concreto-600">{s.area} - {nombre(s.creadoPor)} - {s.lineas.length} {s.lineas.length === 1 ? 'ítem' : 'ítems'}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <EstadoBadge estado={s.estado} />
                        <span className={`text-xs font-semibold ${s.estado === 'pendiente' && dias > 2 ? 'text-aviso' : 'text-concreto-600'}`}>{dias === 0 ? 'Hoy' : `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className={id ? '' : 'hidden lg:block'}>
          {!sel ? <div className="tarjeta"><EstadoVacio titulo="Selecciona una solicitud" mensaje="El detalle aparecerá aquí." /></div> : (
            <div className="space-y-4">
              <button className="btn-fantasma lg:hidden" onClick={() => navigate('/director')}><ArrowLeft size={15} /> Volver a la lista</button>
              <div className="tarjeta p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold">{sel.numero}</h2><EstadoBadge estado={sel.estado} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div><dt className="etiqueta">Solicitante</dt><dd>{nombre(sel.creadoPor)}</dd></div>
                  <div><dt className="etiqueta">Área</dt><dd>{sel.area}</dd></div>
                  <div><dt className="etiqueta">Prioridad</dt><dd><PrioridadChip prioridad={sel.prioridad} /></dd></div>
                  <div><dt className="etiqueta">Fecha requerida</dt><dd>{sel.fechaRequerida ? formatearFecha(sel.fechaRequerida) : '-'}</dd></div>
                </dl>
                <p className="etiqueta mt-3">Justificación</p>
                <p className="text-sm">{sel.justificacion || <span className="text-error">Sin justificación</span>}</p>
                <p className="etiqueta mt-3">Adjuntos</p><AdjuntoSimulado adjuntos={sel.adjuntos} soloLectura />
              </div>
              <div><h3 className="mb-2 text-base font-bold">Ítems y stock actual</h3><TablaLineas lineas={sel.lineas} mostrarStock /></div>
              {sel.estado === 'pendiente' && (
                <div className="tarjeta flex flex-wrap items-center gap-2 p-3">
                  <BotonConPermiso variante="primario" permitido={regla.permitido} motivo={regla.motivo} onClick={() => setModal('aprobar')}><CheckCircle2 size={16} /> Aprobar</BotonConPermiso>
                  <BotonConPermiso variante="secundario" permitido={regla.permitido} motivo={regla.motivo} onClick={() => setModal('devolver')}><RotateCcw size={16} /> Devolver con observación</BotonConPermiso>
                  <BotonConPermiso variante="peligro" permitido={regla.permitido} motivo={regla.motivo} onClick={() => setModal('rechazar')}><XCircle size={16} /> Rechazar</BotonConPermiso>
                </div>
              )}
              <div className="tarjeta p-4"><h3 className="mb-3 text-base font-bold">Historial</h3><LineaTiempoEstados historial={sel.historial} /></div>
            </div>
          )}
        </div>
      </div>
      <ModalConfirmar abierto={modal === 'aprobar'} titulo="Aprobar solicitud" mensaje={`Se aprobará ${sel?.numero} y se notificará a Compras y al solicitante.`} textoConfirmar="Aprobar" onConfirmar={() => decidir('aprobar')} onCerrar={() => setModal(null)} />
      <ModalObservacion abierto={modal === 'devolver'} titulo={`Devolver ${sel?.numero ?? ''}`} textoConfirmar="Devolver" minimo={10} onConfirmar={(o) => decidir('devolver', o)} onCerrar={() => setModal(null)} />
      <ModalObservacion abierto={modal === 'rechazar'} titulo={`Rechazar ${sel?.numero ?? ''}`} etiqueta="Motivo del rechazo (obligatorio)" textoConfirmar="Rechazar" peligro minimo={10} onConfirmar={(o) => decidir('rechazar', o)} onCerrar={() => setModal(null)} />
    </div>
  );
}

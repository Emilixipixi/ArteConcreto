import { useMemo, useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EstadoVacio from '../components/EstadoVacio';
import FiltrosBar from '../components/FiltrosBar';
import NotificacionItem from '../components/NotificacionItem';
import PageHeader from '../components/PageHeader';
import { useNotificacionesUsuario, useUsuarioActual } from '../store/selectores';
import { useStore } from '../store/useStore';

const TAM = 10;

// Centro de notificaciones: lista completa con filtros y paginacion
export default function Notificaciones() {
  const usuario = useUsuarioActual()!;
  const { todas, sinLeer } = useNotificacionesUsuario();
  const marcarLeida = useStore((s) => s.marcarNotificacionLeida);
  const marcarTodas = useStore((s) => s.marcarTodasLeidas);
  const navigate = useNavigate();
  const [tipo, setTipo] = useState('todos');
  const [lectura, setLectura] = useState('todas');
  const [docTipo, setDocTipo] = useState('todos');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pagina, setPagina] = useState(0);

  const tiposDoc = useMemo(() => [...new Set(todas.map((n) => n.docTipo))], [todas]);
  const filtradas = todas.filter((n) => {
    if (tipo !== 'todos' && n.tipo !== tipo) return false;
    const leida = n.leidaPor.includes(usuario.id);
    if (lectura === 'leidas' && !leida) return false;
    if (lectura === 'no_leidas' && leida) return false;
    if (docTipo !== 'todos' && n.docTipo !== docTipo) return false;
    const f = n.fecha.slice(0, 10);
    if (desde && f < desde) return false;
    if (hasta && f > hasta) return false;
    return true;
  });
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / TAM));
  const p = Math.min(pagina, totalPaginas - 1);
  const visibles = filtradas.slice(p * TAM, p * TAM + TAM);
  const limpiar = () => { setTipo('todos'); setLectura('todas'); setDocTipo('todos'); setDesde(''); setHasta(''); setPagina(0); };

  return (
    <div>
      <PageHeader titulo="Centro de notificaciones" migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Notificaciones' }]}
        subtitulo={`${sinLeer.length} sin leer de ${todas.length}`}
        acciones={<button className="btn-secundario" onClick={marcarTodas} disabled={sinLeer.length === 0}><CheckCheck size={16} /> Marcar todas como leídas</button>} />
      <FiltrosBar onLimpiar={limpiar} filtros={[
        { clave: 'tipo', etiqueta: 'Tipo', valor: tipo, onChange: (v) => { setTipo(v); setPagina(0); }, opciones: [{ valor: 'todos', texto: 'Todos' }, { valor: 'accion', texto: 'Acción' }, { valor: 'alerta', texto: 'Alerta' }, { valor: 'info', texto: 'Información' }, { valor: 'exito', texto: 'Éxito' }] },
        { clave: 'lectura', etiqueta: 'Estado', valor: lectura, onChange: (v) => { setLectura(v); setPagina(0); }, opciones: [{ valor: 'todas', texto: 'Todas' }, { valor: 'no_leidas', texto: 'No leídas' }, { valor: 'leidas', texto: 'Leídas' }] },
        { clave: 'doc', etiqueta: 'Documento', valor: docTipo, onChange: (v) => { setDocTipo(v); setPagina(0); }, opciones: [{ valor: 'todos', texto: 'Todos' }, ...tiposDoc.map((t) => ({ valor: t, texto: t }))] },
      ]}>
        <div><label className="etiqueta" htmlFor="f-desde">Desde</label><input id="f-desde" type="date" className="campo" value={desde} onChange={(e) => { setDesde(e.target.value); setPagina(0); }} /></div>
        <div><label className="etiqueta" htmlFor="f-hasta">Hasta</label><input id="f-hasta" type="date" className="campo" value={hasta} onChange={(e) => { setHasta(e.target.value); setPagina(0); }} /></div>
      </FiltrosBar>
      <div className="tarjeta divide-y divide-concreto-300 overflow-hidden">
        {visibles.length === 0 ? <EstadoVacio titulo="Sin notificaciones" mensaje="Ajusta los filtros para ver más resultados." /> : visibles.map((n) => (
          <NotificacionItem key={n.id} n={n} leida={n.leidaPor.includes(usuario.id)} onClick={() => { marcarLeida(n.id); navigate(n.ruta); }} />
        ))}
      </div>
      {totalPaginas > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3 text-sm">
          <button className="btn-secundario !py-1" disabled={p === 0} onClick={() => setPagina(p - 1)}>Anterior</button>
          <span className="text-concreto-600">Página {p + 1} de {totalPaginas}</span>
          <button className="btn-secundario !py-1" disabled={p >= totalPaginas - 1} onClick={() => setPagina(p + 1)}>Siguiente</button>
        </div>
      )}
    </div>
  );
}

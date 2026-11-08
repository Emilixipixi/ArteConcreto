import { useMemo, useState } from 'react';
import { ClipboardCheck, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BotonConPermiso from '../../components/BotonConPermiso';
import DataTable from '../../components/DataTable';
import EstadoBadge from '../../components/EstadoBadge';
import FiltrosBar from '../../components/FiltrosBar';
import ModalConfirmar from '../../components/ModalConfirmar';
import PageHeader from '../../components/PageHeader';
import PrioridadChip from '../../components/PrioridadChip';
import { formatearFecha, tiempoRelativo } from '../../lib/formato';
import { puede, tieneAlgunRol } from '../../lib/permisos';
import { PRIORIDADES } from '../../lib/reglas';
import { useUsuarioActual } from '../../store/selectores';
import { useStore } from '../../store/useStore';
import type { Solicitud } from '../../types';

type Pestana = 'todas' | 'mis' | 'pendientes' | 'devueltas' | 'aprobadas';
const ESTADOS: Solicitud['estado'][] = ['borrador', 'pendiente', 'devuelta', 'aprobada', 'rechazada', 'en_compra', 'cerrada'];

// P-03 Solicitudes de materiales (listado)
export default function ListadoSolicitudes() {
  const u = useUsuarioActual()!;
  const navigate = useNavigate();
  const solicitudes = useStore((s) => s.solicitudes);
  const usuarios = useStore((s) => s.usuarios);
  const articulos = useStore((s) => s.articulos);
  const eliminar = useStore((s) => s.eliminarSolicitud);
  const veTodas = tieneAlgunRol(u, ['director', 'compras', 'admin']);
  const [pestana, setPestana] = useState<Pestana>(veTodas ? 'todas' : 'mis'); // el solicitante ve "Mis solicitudes" por defecto
  const [busqueda, setBusqueda] = useState('');
  const [estados, setEstados] = useState<string[]>([]);
  const [creador, setCreador] = useState('todos');
  const [prioridad, setPrioridad] = useState('todas');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [aEliminar, setAEliminar] = useState<Solicitud | null>(null);
  const nombre = (id: string) => usuarios.find((x) => x.id === id)?.nombre ?? id;

  const filas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return solicitudes.filter((s) => {
      if (!veTodas && s.creadoPor !== u.id) return false; // el solicitante solo ve las propias
      if (pestana === 'mis' && s.creadoPor !== u.id) return false;
      if (pestana === 'pendientes' && s.estado !== 'pendiente') return false;
      if (pestana === 'devueltas' && s.estado !== 'devuelta') return false;
      if (pestana === 'aprobadas' && !['aprobada', 'en_compra'].includes(s.estado)) return false;
      if (estados.length && !estados.includes(s.estado)) return false;
      if (creador !== 'todos' && s.creadoPor !== creador) return false;
      if (prioridad !== 'todas' && s.prioridad !== prioridad) return false;
      if (desde && s.creadoEn.slice(0, 10) < desde) return false;
      if (hasta && s.creadoEn.slice(0, 10) > hasta) return false;
      if (q) {
        const porArticulo = s.lineas.some((l) => { const a = articulos.find((x) => x.sku === l.sku); return l.sku.toLowerCase().includes(q) || (a?.nombre.toLowerCase().includes(q) ?? false); });
        if (!s.numero.toLowerCase().includes(q) && !porArticulo) return false;
      }
      return true;
    }).sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn));
  }, [solicitudes, pestana, busqueda, estados, creador, prioridad, desde, hasta, veTodas, u.id, articulos]);

  const limpiar = () => { setBusqueda(''); setEstados([]); setCreador('todos'); setPrioridad('todas'); setDesde(''); setHasta(''); };
  const creadores = [...new Set(solicitudes.map((s) => s.creadoPor))];
  const PESTANAS: { id: Pestana; texto: string }[] = [
    { id: 'todas', texto: 'Todas' }, { id: 'mis', texto: 'Mis solicitudes' }, { id: 'pendientes', texto: 'Pendientes' },
    { id: 'devueltas', texto: 'Devueltas' }, { id: 'aprobadas', texto: 'Aprobadas' },
  ];

  return (
    <div>
      <PageHeader titulo="Solicitudes de materiales" migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Solicitudes' }]}
        acciones={puede(u, 'solicitud.crear') ? <BotonConPermiso variante="primario" onClick={() => navigate('/solicitudes/nueva')}><Plus size={16} /> Nueva solicitud</BotonConPermiso> : undefined} />
      <div className="mb-3 flex flex-wrap gap-1 border-b border-concreto-300" role="tablist">
        {PESTANAS.filter((p) => veTodas || p.id === 'mis' || p.id === 'devueltas' || p.id === 'aprobadas' || p.id === 'pendientes').map((p) => (
          <button key={p.id} role="tab" aria-selected={pestana === p.id} onClick={() => setPestana(p.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${pestana === p.id ? 'border-marca-vino text-marca-vino' : 'border-transparent text-concreto-600 hover:text-texto'}`}>{p.texto}</button>
        ))}
      </div>
      <FiltrosBar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Número o artículo (ej. SOL-0001, cemento)" onLimpiar={limpiar}
        filtros={[
          { clave: 'creador', etiqueta: 'Creador', valor: creador, onChange: setCreador, opciones: [{ valor: 'todos', texto: 'Todos' }, ...creadores.map((c) => ({ valor: c, texto: nombre(c) }))] },
          { clave: 'prioridad', etiqueta: 'Prioridad', valor: prioridad, onChange: setPrioridad, opciones: [{ valor: 'todas', texto: 'Todas' }, ...PRIORIDADES.map((p) => ({ valor: p, texto: p }))] },
        ]}>
        <div><label className="etiqueta" htmlFor="s-desde">Desde</label><input id="s-desde" type="date" className="campo" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
        <div><label className="etiqueta" htmlFor="s-hasta">Hasta</label><input id="s-hasta" type="date" className="campo" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
        <fieldset className="w-full"><legend className="etiqueta">Estado (varios)</legend>
          <div className="flex flex-wrap gap-1.5">
            {ESTADOS.map((e) => (
              <button key={e} type="button" aria-pressed={estados.includes(e)} onClick={() => setEstados(estados.includes(e) ? estados.filter((x) => x !== e) : [...estados, e])}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${estados.includes(e) ? 'border-marca-vino bg-marca-vino text-white' : 'border-concreto-300 text-concreto-600 hover:border-marca-vino'}`}>{e.replace('_', ' ')}</button>
            ))}
          </div>
        </fieldset>
      </FiltrosBar>
      <DataTable<Solicitud> filas={filas} clave={(s) => s.id} vacioTitulo="No hay solicitudes con estos filtros" vacioMensaje="Cambia la pestaña o limpia los filtros. También puedes crear una nueva solicitud."
        columnas={[
          { clave: 'numero', titulo: 'Nº', ordenable: true, render: (s) => <span className="font-semibold text-marca-vino">{s.numero}</span> },
          { clave: 'creadoEn', titulo: 'Fecha', ordenable: true, render: (s) => formatearFecha(s.creadoEn), valor: (s) => s.creadoEn },
          { clave: 'area', titulo: 'Área', ordenable: true, className: 'hidden md:table-cell' },
          { clave: 'creadoPor', titulo: 'Creador', render: (s) => nombre(s.creadoPor), className: 'hidden lg:table-cell' },
          { clave: 'prioridad', titulo: 'Prioridad', render: (s) => <PrioridadChip prioridad={s.prioridad} /> },
          { clave: 'items', titulo: 'Ítems', render: (s) => s.lineas.length, valor: (s) => s.lineas.length, alinear: 'der' },
          { clave: 'estado', titulo: 'Estado', render: (s) => <EstadoBadge estado={s.estado} />, ordenable: true },
          { clave: 'actualizadoEn', titulo: 'Actualizada', render: (s) => tiempoRelativo(s.actualizadoEn), valor: (s) => s.actualizadoEn, ordenable: true, className: 'hidden lg:table-cell' },
          { clave: 'acc', titulo: 'Acciones', render: (s) => {
            const propia = s.creadoPor === u.id;
            return (
              <span className="flex gap-1">
                <button className="btn-fantasma !px-2 !py-1" title="Ver" aria-label={`Ver ${s.numero}`} onClick={() => navigate(`/solicitudes/${s.id}`)}><Eye size={15} /></button>
                {puede(u, 'solicitud.decidir') && s.estado === 'pendiente' && <button className="btn-fantasma !px-2 !py-1 text-marca-vino" title="Ir a la bandeja para aprobar" aria-label={`Aprobar ${s.numero} en la bandeja del director`} onClick={() => navigate(`/director/${s.id}`)}><ClipboardCheck size={15} /></button>}
                {propia && ['borrador', 'devuelta'].includes(s.estado) && <button className="btn-fantasma !px-2 !py-1" title="Editar" aria-label={`Editar ${s.numero}`} onClick={() => navigate(`/solicitudes/${s.id}/editar`)}><Pencil size={15} /></button>}
                {propia && s.estado === 'borrador' && <button className="btn-fantasma !px-2 !py-1 text-error" title="Eliminar" aria-label={`Eliminar ${s.numero}`} onClick={() => setAEliminar(s)}><Trash2 size={15} /></button>}
              </span>
            );
          } },
        ]} />
      <ModalConfirmar abierto={!!aEliminar} titulo="Eliminar borrador" mensaje={`Se eliminará el borrador ${aEliminar?.numero}. Esta acción no se puede deshacer.`} textoConfirmar="Eliminar" peligro
        onConfirmar={() => aEliminar && eliminar(aEliminar.id)} onCerrar={() => setAEliminar(null)} />
    </div>
  );
}

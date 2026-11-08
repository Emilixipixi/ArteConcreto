import { useMemo, useState } from 'react';
import { Plus, Truck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import BotonConPermiso from '../../components/BotonConPermiso';
import DataTable, { type Columna } from '../../components/DataTable';
import EstadoBadge from '../../components/EstadoBadge';
import FiltrosBar from '../../components/FiltrosBar';
import PageHeader from '../../components/PageHeader';
import { formatearFecha } from '../../lib/formato';
import { puede } from '../../lib/permisos';
import { useUsuarioActual } from '../../store/selectores';
import { enTransito } from '../../store/selectoresFase4';
import { useStore } from '../../store/useStore';
import type { Traslado } from '../../types';

const ESTADOS: Traslado['estado'][] = ['borrador', 'en_transito', 'recibido', 'recibido_con_diferencias', 'cancelado'];

// P-13 Traslados entre bodegas (listado + bloque destacado de transferencias en transito, RF-40)
export default function ListadoTraslados() {
  const e = useStore();
  const u = useUsuarioActual()!;
  const navigate = useNavigate();
  const [estado, setEstado] = useState('todos');
  const [origen, setOrigen] = useState('todas');
  const [destino, setDestino] = useState('todas');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const bod = (id: string) => e.bodegas.find((b) => b.id === id)?.codigo ?? id;
  const nombre = (id: string) => e.usuarios.find((x) => x.id === id)?.nombre ?? id;
  const transito = enTransito(e);
  const filas = useMemo(() => e.traslados.filter((t) => (estado === 'todos' || t.estado === estado) && (origen === 'todas' || t.origenId === origen) && (destino === 'todas' || t.destinoId === destino) &&
    (!desde || t.creadoEn.slice(0, 10) >= desde) && (!hasta || t.creadoEn.slice(0, 10) <= hasta)).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)),
  [e.traslados, estado, origen, destino, desde, hasta]);
  const opcBod = [{ valor: 'todas', texto: 'Todas' }, ...e.bodegas.map((b) => ({ valor: b.id, texto: b.nombre }))];
  const columnas: Columna<Traslado>[] = [
    { clave: 'numero', titulo: 'Nº', ordenable: true, render: (t) => <Link className="font-semibold text-marca-vino underline" to={`/traslados/${t.id}`}>{t.numero}</Link> },
    { clave: 'ruta', titulo: 'Origen → Destino', render: (t) => `${bod(t.origenId)} → ${bod(t.destinoId)}` },
    { clave: 'items', titulo: 'Ítems', render: (t) => t.lineas.map((l) => `${l.sku} x${l.cantidadEnviada}`).join(', ') },
    { clave: 'fecha', titulo: 'Fecha', ordenable: true, valor: (t) => t.creadoEn, render: (t) => formatearFecha(t.creadoEn) },
    { clave: 'estado', titulo: 'Estado', render: (t) => <EstadoBadge estado={t.estado} /> },
    { clave: 'resp', titulo: 'Responsables', render: (t) => { const rec = [...t.historial].reverse().find((h) => h.estadoNuevo === 'recibido' || h.estadoNuevo === 'recibido_con_diferencias'); return <span className="text-xs">Crea: {nombre(t.creadoPor)}{rec && <><br />Recibe: {nombre(rec.usuarioId)}</>}</span>; } },
  ];
  return (
    <div>
      <PageHeader titulo="Traslados entre bodegas" migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Traslados' }]} subtitulo="Lo que está en tránsito no es disponible ni en origen ni en destino."
        acciones={<BotonConPermiso variante="primario" permitido={puede(u, 'traslado.crear')} motivo="Solo Almacén crea traslados" onClick={() => navigate('/traslados/nuevo')}><Plus size={15} /> Nuevo traslado</BotonConPermiso>} />
      <section className="mb-4 rounded-md border-2 border-marca-amarillo bg-marca-amarillo-suave p-3" aria-label="Transferencias en tránsito">
        <h2 className="mb-2 flex items-center gap-2 text-base font-bold"><Truck size={16} aria-hidden="true" /> Transferencias en tránsito ({transito.length})</h2>
        {transito.length === 0 ? <p className="text-sm">No hay traslados en tránsito.</p> : (
          <ul className="grid gap-2 md:grid-cols-2">{transito.map((t) => <li key={t.id}><Link className="flex items-center justify-between gap-2 rounded-md border border-concreto-300 bg-superficie p-2 text-sm hover:border-marca-vino" to={`/traslados/${t.id}`}><span><span className="font-semibold">{t.numero}</span> {bod(t.origenId)} → {bod(t.destinoId)}</span><span className="text-xs text-concreto-600">{t.lineas.map((l) => `${l.sku} x${l.cantidadEnviada}`).join(', ')}</span></Link></li>)}</ul>)}
      </section>
      <FiltrosBar onLimpiar={() => { setEstado('todos'); setOrigen('todas'); setDestino('todas'); setDesde(''); setHasta(''); }} filtros={[
        { clave: 'est', etiqueta: 'Estado', valor: estado, opciones: [{ valor: 'todos', texto: 'Todos' }, ...ESTADOS.map((s) => ({ valor: s, texto: s.replace(/_/g, ' ') }))], onChange: setEstado },
        { clave: 'ori', etiqueta: 'Origen', valor: origen, opciones: opcBod, onChange: setOrigen },
        { clave: 'des', etiqueta: 'Destino', valor: destino, opciones: opcBod, onChange: setDestino },
      ]}>
        <div><label className="etiqueta" htmlFor="t-desde">Desde</label><input id="t-desde" type="date" className="campo" value={desde} onChange={(ev) => setDesde(ev.target.value)} /></div>
        <div><label className="etiqueta" htmlFor="t-hasta">Hasta</label><input id="t-hasta" type="date" className="campo" value={hasta} onChange={(ev) => setHasta(ev.target.value)} /></div>
      </FiltrosBar>
      <DataTable columnas={columnas} filas={filas} clave={(t) => t.id} vacioTitulo="Sin traslados" onFila={(t) => navigate(`/traslados/${t.id}`)} />
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import BotonConPermiso from '../../components/BotonConPermiso';
import DataTable, { type Columna } from '../../components/DataTable';
import EstadoBadge from '../../components/EstadoBadge';
import FiltrosBar from '../../components/FiltrosBar';
import InsigniaSimulado from '../../components/InsigniaSimulado';
import PageHeader from '../../components/PageHeader';
import { formatearFecha } from '../../lib/formato';
import { puede } from '../../lib/permisos';
import { useUsuarioActual } from '../../store/selectores';
import { useStore } from '../../store/useStore';
import type { Despacho } from '../../types';

export const CANALES: Record<Despacho['canal'], string> = { punto_venta: 'Punto de venta', despacho_cliente: 'Despacho a cliente', tienda_en_linea: 'Tienda en línea' };

// P-14 Ventas y despachos (listado)
export default function ListadoDespachos() {
  const e = useStore();
  const u = useUsuarioActual()!;
  const navigate = useNavigate();
  const [canal, setCanal] = useState('todos');
  const [estado, setEstado] = useState('todos');
  const [cliente, setCliente] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const filas = useMemo(() => e.despachos.filter((d) => (canal === 'todos' || d.canal === canal) && (estado === 'todos' || d.estado === estado) && (!cliente || d.cliente.toLowerCase().includes(cliente.toLowerCase())) &&
    (!desde || d.creadoEn.slice(0, 10) >= desde) && (!hasta || d.creadoEn.slice(0, 10) <= hasta) && (e.bodegaActivaId === 'todas' || d.bodegaId === e.bodegaActivaId)).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)),
  [e.despachos, canal, estado, cliente, desde, hasta, e.bodegaActivaId]);
  const columnas: Columna<Despacho>[] = [
    { clave: 'numero', titulo: 'Nº', ordenable: true, render: (d) => <Link className="font-semibold text-marca-vino underline" to={`/ventas/${d.id}`}>{d.numero}</Link> },
    { clave: 'canal', titulo: 'Canal', render: (d) => <span className="inline-flex items-center gap-1">{CANALES[d.canal]}{d.canal === 'tienda_en_linea' && <InsigniaSimulado />}</span> },
    { clave: 'cliente', titulo: 'Cliente', render: (d) => d.cliente },
    { clave: 'destino', titulo: 'Destino', render: (d) => d.destino || '-' },
    { clave: 'fecha', titulo: 'Fecha', ordenable: true, valor: (d) => d.creadoEn, render: (d) => formatearFecha(d.creadoEn) },
    { clave: 'ref', titulo: 'Referencia', render: (d) => d.documentoReferencia },
    { clave: 'estado', titulo: 'Estado', render: (d) => <EstadoBadge estado={d.estado} /> },
    { clave: 'adm', titulo: 'Administrativo', render: (d) => <EstadoBadge estado={d.estadoAdministrativo} /> },
  ];
  return (
    <div>
      <PageHeader titulo="Ventas y despachos" migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Ventas y despachos' }]} subtitulo="El stock se descuenta solo cuando Almacén confirma la salida física."
        acciones={<BotonConPermiso variante="primario" permitido={puede(u, 'despacho.crear')} motivo="Solo Ventas registra salidas" onClick={() => navigate('/ventas/nueva')}><Plus size={15} /> Nueva salida</BotonConPermiso>} />
      <FiltrosBar busqueda={cliente} onBusqueda={setCliente} placeholder="Cliente" onLimpiar={() => { setCanal('todos'); setEstado('todos'); setCliente(''); setDesde(''); setHasta(''); }} filtros={[
        { clave: 'can', etiqueta: 'Canal', valor: canal, opciones: [{ valor: 'todos', texto: 'Todos' }, ...Object.entries(CANALES).map(([v, t]) => ({ valor: v, texto: t }))], onChange: setCanal },
        { clave: 'est', etiqueta: 'Estado', valor: estado, opciones: [{ valor: 'todos', texto: 'Todos' }, ...['borrador', 'pendiente_salida', 'confirmado', 'anulado'].map((s) => ({ valor: s, texto: s.replace('_', ' ') }))], onChange: setEstado },
      ]}>
        <div><label className="etiqueta" htmlFor="d-desde">Desde</label><input id="d-desde" type="date" className="campo" value={desde} onChange={(ev) => setDesde(ev.target.value)} /></div>
        <div><label className="etiqueta" htmlFor="d-hasta">Hasta</label><input id="d-hasta" type="date" className="campo" value={hasta} onChange={(ev) => setHasta(ev.target.value)} /></div>
      </FiltrosBar>
      <DataTable columnas={columnas} filas={filas} clave={(d) => d.id} vacioTitulo="Sin salidas registradas" onFila={(d) => navigate(`/ventas/${d.id}`)} />
    </div>
  );
}

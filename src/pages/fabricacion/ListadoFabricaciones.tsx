import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import BotonConPermiso from '../../components/BotonConPermiso';
import DataTable, { type Columna } from '../../components/DataTable';
import EstadoBadge from '../../components/EstadoBadge';
import FiltrosBar from '../../components/FiltrosBar';
import PageHeader from '../../components/PageHeader';
import { formatearFecha } from '../../lib/formato';
import { puede } from '../../lib/permisos';
import { useUsuarioActual } from '../../store/selectores';
import { useStore } from '../../store/useStore';
import type { Fabricacion } from '../../types';

const ESTADOS: Fabricacion['estado'][] = ['borrador', 'pendiente_director', 'confirmada', 'anulada'];

// P-11 Registro de fabricacion (listado)
export default function ListadoFabricaciones() {
  const e = useStore();
  const u = useUsuarioActual()!;
  const navigate = useNavigate();
  const [estado, setEstado] = useState('todos');
  const [producto, setProducto] = useState('todos');
  const [responsable, setResponsable] = useState('todos');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const nombre = (id: string) => e.usuarios.find((x) => x.id === id)?.nombre ?? id;
  const filas = useMemo(() => e.fabricaciones.filter((f) =>
    (estado === 'todos' || f.estado === estado) && (producto === 'todos' || f.skuProducto === producto) && (responsable === 'todos' || f.creadoPor === responsable) &&
    (!desde || f.fechaFabricacion.slice(0, 10) >= desde) && (!hasta || f.fechaFabricacion.slice(0, 10) <= hasta) &&
    (e.bodegaActivaId === 'todas' || f.bodegaDestinoId === e.bodegaActivaId || f.bodegaOrigenInsumosId === e.bodegaActivaId),
  ).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)), [e.fabricaciones, estado, producto, responsable, desde, hasta, e.bodegaActivaId]);

  const columnas: Columna<Fabricacion>[] = [
    { clave: 'numero', titulo: 'Nº', ordenable: true, render: (f) => <Link className="font-semibold text-marca-vino underline" to={`/fabricacion/${f.id}`}>{f.numero}</Link> },
    { clave: 'lote', titulo: 'Lote', ordenable: true },
    { clave: 'producto', titulo: 'Producto', render: (f) => <span>{f.skuProducto}<span className="block text-xs text-concreto-600">{e.articulos.find((a) => a.sku === f.skuProducto)?.nombre}</span></span> },
    { clave: 'cant', titulo: 'Cantidad', alinear: 'der', valor: (f) => f.cantidadFabricada, render: (f) => <span className="tabular-nums">{f.cantidadFabricada}</span> },
    { clave: 'dest', titulo: 'Bodega destino', render: (f) => e.bodegas.find((b) => b.id === f.bodegaDestinoId)?.codigo },
    { clave: 'fecha', titulo: 'Fecha', ordenable: true, valor: (f) => f.fechaFabricacion, render: (f) => formatearFecha(f.fechaFabricacion) },
    { clave: 'resp', titulo: 'Responsable', render: (f) => nombre(f.creadoPor) },
    { clave: 'estado', titulo: 'Estado', render: (f) => <span className="inline-flex flex-wrap items-center gap-1"><EstadoBadge estado={f.estado} />{f.desviacionPct > e.parametros.toleranciaConsumo && <span className="chip !bg-aviso/10 !text-aviso">Desvío {f.desviacionPct} %</span>}</span> },
  ];
  return (
    <div>
      <PageHeader titulo="Registro de fabricación" migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Fabricación' }]} subtitulo="Los insumos se descuentan y el producto ingresa solo al confirmar."
        acciones={<BotonConPermiso variante="primario" permitido={puede(u, 'fabricacion.registrar')} motivo="Solo Producción registra fabricaciones" onClick={() => navigate('/fabricacion/nueva')}><Plus size={15} /> Nueva fabricación</BotonConPermiso>} />
      <FiltrosBar onLimpiar={() => { setEstado('todos'); setProducto('todos'); setResponsable('todos'); setDesde(''); setHasta(''); }} filtros={[
        { clave: 'est', etiqueta: 'Estado', valor: estado, opciones: [{ valor: 'todos', texto: 'Todos' }, ...ESTADOS.map((s) => ({ valor: s, texto: s.replace('_', ' ') }))], onChange: setEstado },
        { clave: 'prod', etiqueta: 'Producto', valor: producto, opciones: [{ valor: 'todos', texto: 'Todos' }, ...e.articulos.filter((a) => a.tipo === 'producto_terminado').map((a) => ({ valor: a.sku, texto: `${a.sku} - ${a.nombre}` }))], onChange: setProducto },
        { clave: 'resp', etiqueta: 'Responsable', valor: responsable, opciones: [{ valor: 'todos', texto: 'Todos' }, ...[...new Set(e.fabricaciones.map((f) => f.creadoPor))].map((id) => ({ valor: id, texto: nombre(id) }))], onChange: setResponsable },
      ]}>
        <div><label className="etiqueta" htmlFor="f-desde">Desde</label><input id="f-desde" type="date" className="campo" value={desde} onChange={(ev) => setDesde(ev.target.value)} /></div>
        <div><label className="etiqueta" htmlFor="f-hasta">Hasta</label><input id="f-hasta" type="date" className="campo" value={hasta} onChange={(ev) => setHasta(ev.target.value)} /></div>
      </FiltrosBar>
      <DataTable columnas={columnas} filas={filas} clave={(f) => f.id} vacioTitulo="Sin fabricaciones" vacioMensaje="Registra una nueva fabricación para empezar." onFila={(f) => navigate(`/fabricacion/${f.id}`)} />
    </div>
  );
}

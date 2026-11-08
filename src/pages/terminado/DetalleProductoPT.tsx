import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import BotonConPermiso from '../../components/BotonConPermiso';
import EstadoBadge from '../../components/EstadoBadge';
import EstadoVacio from '../../components/EstadoVacio';
import ModalReserva from '../../components/ModalReserva';
import PageHeader from '../../components/PageHeader';
import TablaMovimientosDoc from '../../components/TablaMovimientosDoc';
import { formatearFecha } from '../../lib/formato';
import { puede } from '../../lib/permisos';
import { formatearCantidad } from '../../lib/unidades';
import { useUsuarioActual } from '../../store/selectores';
import { disponibleTerminado, estadoProducto } from '../../store/selectoresFase4';
import { useStore } from '../../store/useStore';
import { InsigniaEstadoPT } from './InventarioPT';

const FILTROS = [
  { v: 'todos', t: 'Todos' }, { v: 'fabricacion', t: 'Fabricación' }, { v: 'traslado', t: 'Traslados' }, { v: 'venta', t: 'Ventas y despachos' }, { v: 'ajuste', t: 'Ajustes' },
];

// P-12 Detalle de producto terminado: existencias por bodega, lotes, receta, reservas e historial (RF-34)
export default function DetalleProductoPT() {
  const { sku } = useParams();
  const e = useStore();
  const u = useUsuarioActual()!;
  const [filtro, setFiltro] = useState('todos');
  const [reservar, setReservar] = useState(false);
  const liberar = e.liberarReservasVencidas;
  useEffect(() => { liberar(); }, [liberar]);
  const a = e.articulos.find((x) => x.sku === sku && x.tipo === 'producto_terminado');
  if (!a) return <EstadoVacio titulo="Producto no encontrado" accion={<Link className="btn-primario" to="/producto-terminado">Volver al inventario</Link>} />;
  const total = disponibleTerminado(e, a.sku);
  const lotes = e.fabricaciones.filter((f) => f.skuProducto === a.sku && f.estado === 'confirmada');
  const reservas = e.reservas.filter((r) => r.sku === a.sku).sort((x, y) => y.creadoEn.localeCompare(x.creadoEn));
  const movs = e.movimientos.filter((m) => m.sku === a.sku && (filtro === 'todos' || (filtro === 'fabricacion' && m.tipo.includes('fabricacion')) || (filtro === 'traslado' && m.tipo.startsWith('traslado')) ||
    (filtro === 'venta' && ['salida_venta', 'salida_despacho'].includes(m.tipo)) || (filtro === 'ajuste' && m.tipo === 'ajuste'))).sort((x, y) => y.fecha.localeCompare(x.fecha));
  const mp = (s: string) => e.articulos.find((x) => x.sku === s);

  return (
    <div>
      <PageHeader titulo={`${a.sku} - ${a.nombre}`} migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Producto terminado', ruta: '/producto-terminado' }, { texto: a.sku }]} subtitulo={a.categoria}
        acciones={<span className="flex flex-wrap items-center gap-2"><InsigniaEstadoPT estado={estadoProducto(total)} />
          <BotonConPermiso permitido={puede(u, 'reserva.crear')} motivo="Solo Ventas o Producción reservan producto" onClick={() => setReservar(true)}><Lock size={14} /> Reservar</BotonConPermiso>
          {puede(u, 'fabricacion.registrar') && <Link className="btn-primario" to={`/fabricacion/nueva?sku=${a.sku}`}>Crear fabricación</Link>}</span>} />
      <div className="space-y-4">
        <section className="tarjeta grid gap-4 p-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <div><p className="etiqueta">Físico</p><span className="text-lg font-bold tabular-nums">{total.fisica}</span></div>
          <div><p className="etiqueta">Comprometido</p><span className="text-lg font-bold tabular-nums">{total.comprometida}</span></div>
          <div><p className="etiqueta">Disponible</p><span className="text-lg font-bold tabular-nums">{total.disponible}</span></div>
          <div><p className="etiqueta">En tránsito (no disponible)</p><span className="text-lg font-bold tabular-nums">{total.enTransito}</span></div>
          <div><p className="etiqueta">Plazo estimado de fabricación</p>{a.plazoFabricacionDias ?? '-'} días</div>
        </section>
        <section className="tarjeta space-y-2 p-4"><h3 className="text-base font-bold">Existencias por bodega</h3>
          <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm">
            <thead className="text-xs uppercase text-concreto-600"><tr><th className="px-2 py-1 text-left">Bodega</th><th className="px-2 py-1 text-right">Físico</th><th className="px-2 py-1 text-right">Comprometido</th><th className="px-2 py-1 text-right">Disponible</th><th className="px-2 py-1 text-right">En tránsito</th></tr></thead>
            <tbody>{e.bodegas.filter((b) => b.activa).map((b) => { const s = disponibleTerminado(e, a.sku, b.id); return <tr key={b.id} className="border-t border-concreto-300"><td className="px-2 py-1">{b.nombre}</td><td className="px-2 py-1 text-right tabular-nums">{s.fisica}</td><td className="px-2 py-1 text-right tabular-nums">{s.comprometida}</td><td className="px-2 py-1 text-right font-semibold tabular-nums">{s.disponible}</td><td className="px-2 py-1 text-right tabular-nums text-concreto-600">{s.enTransito}</td></tr>; })}</tbody>
          </table></div></section>

        <section className="tarjeta space-y-2 p-4"><h3 className="text-base font-bold">Lotes de origen</h3>
          {lotes.length === 0 ? <p className="text-sm text-concreto-600">Aún no hay fabricaciones confirmadas de este producto.</p> : (
            <ul className="divide-y divide-concreto-300 text-sm">{lotes.map((f) => <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><Link className="font-semibold text-marca-vino underline" to={`/fabricacion/${f.id}`}>{f.numero}</Link> - lote {f.lote}</span><span className="text-concreto-600">{f.cantidadFabricada} und - {formatearFecha(f.fechaFabricacion)}</span></li>)}</ul>)}</section>

        <section className="tarjeta space-y-2 p-4"><h3 className="text-base font-bold">Receta estándar por unidad</h3>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">{(a.receta ?? []).map((r) => { const m = mp(r.sku); return <li key={r.sku} className="flex justify-between border-b border-concreto-300 py-1"><span>{r.sku} - {m?.nombre}</span><span className="tabular-nums">{formatearCantidad(r.cantidadBase, m?.unidadBaseId ?? '')}</span></li>; })}</ul></section>

        <section className="tarjeta space-y-2 p-4"><h3 className="text-base font-bold">Reservas</h3>
          {reservas.length === 0 ? <p className="text-sm text-concreto-600">Sin reservas para este producto.</p> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
              <thead className="text-xs uppercase text-concreto-600"><tr><th className="px-2 py-1 text-left">Cliente</th><th className="px-2 py-1 text-left">Referencia</th><th className="px-2 py-1 text-right">Cantidad</th><th className="px-2 py-1 text-left">Bodega</th><th className="px-2 py-1 text-left">Vence</th><th className="px-2 py-1 text-left">Estado</th><th /></tr></thead>
              <tbody>{reservas.map((r) => <tr key={r.id} className="border-t border-concreto-300"><td className="px-2 py-1">{r.cliente}</td><td className="px-2 py-1">{r.referencia}</td><td className="px-2 py-1 text-right tabular-nums">{r.cantidad}</td><td className="px-2 py-1">{e.bodegas.find((b) => b.id === r.bodegaId)?.codigo}</td><td className="px-2 py-1">{formatearFecha(r.vence)}</td><td className="px-2 py-1"><EstadoBadge estado={r.estado} /></td>
                <td className="px-2 py-1 text-right">{r.estado === 'activa' && <BotonConPermiso className="!py-0.5 text-xs" permitido={puede(u, 'reserva.crear')} motivo="Solo Ventas o Producción liberan reservas" onClick={() => { const x = e.liberarReserva(r.id, 'Liberada manualmente'); if (!x.ok) e.mostrarToast(x.error ?? 'No se pudo liberar', 'error'); }}>Liberar</BotonConPermiso>}</td></tr>)}</tbody>
            </table></div>)}</section>

        <section className="tarjeta space-y-3 p-4"><div className="flex flex-wrap items-end justify-between gap-2"><h3 className="text-base font-bold">Historial de movimientos</h3>
          <div><label className="etiqueta" htmlFor="hist-f">Tipo</label><select id="hist-f" className="campo" value={filtro} onChange={(ev) => setFiltro(ev.target.value)}>{FILTROS.map((f) => <option key={f.v} value={f.v}>{f.t}</option>)}</select></div></div>
          <TablaMovimientosDoc movimientos={movs} /></section>
      </div>
      {reservar && <ModalReserva sku={a.sku} onCerrar={() => setReservar(false)} />}
    </div>
  );
}

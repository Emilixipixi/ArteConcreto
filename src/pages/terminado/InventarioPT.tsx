import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Hammer, Lock, Package } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AlertaInventario from '../../components/AlertaInventario';
import BotonConPermiso from '../../components/BotonConPermiso';
import FiltrosBar from '../../components/FiltrosBar';
import ModalReserva from '../../components/ModalReserva';
import PageHeader from '../../components/PageHeader';
import { puede } from '../../lib/permisos';
import { useUsuarioActual } from '../../store/selectores';
import { disponibleTerminado, estadoProducto } from '../../store/selectoresFase4';
import { useStore } from '../../store/useStore';

const ESTADO = {
  disponible: { t: 'Disponible', c: 'text-ok bg-ok/10 border-ok/30' },
  reservado: { t: 'Reservado', c: 'text-aviso bg-aviso/10 border-aviso/30' },
  agotado: { t: 'Agotado', c: 'text-error bg-error/10 border-error/30' },
} as const;
export const InsigniaEstadoPT = ({ estado }: { estado: keyof typeof ESTADO }) => <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${ESTADO[estado].c}`}>{ESTADO[estado].t}</span>;

// P-12 Inventario de producto terminado (RF-34, RF-35): tarjetas en movil, tabla en escritorio, desglose por bodega
export default function InventarioPT() {
  const e = useStore();
  const u = useUsuarioActual()!;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const skuParam = params.get('sku');
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [estado, setEstado] = useState('todos');
  const [abiertos, setAbiertos] = useState<string[]>(skuParam ? [skuParam] : []);
  const [reservar, setReservar] = useState<string | null>(null);
  const liberarVencidas = e.liberarReservasVencidas;
  useEffect(() => { liberarVencidas(); }, [liberarVencidas]);

  const productos = e.articulos.filter((a) => a.tipo === 'producto_terminado' && a.activo);
  const categorias = [...new Set(productos.map((a) => a.categoria))];
  const filas = useMemo(() => productos.map((a) => ({ a, s: disponibleTerminado(e, a.sku, e.bodegaActivaId) })).map((x) => ({ ...x, est: estadoProducto(x.s) }))
    .filter((x) => (categoria === 'todas' || x.a.categoria === categoria) && (estado === 'todos' || x.est === estado) && (!q || `${x.a.sku} ${x.a.nombre}`.toLowerCase().includes(q.toLowerCase()))),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [e.existencias, e.articulos, e.bodegaActivaId, categoria, estado, q]);
  const alertas = productos.map((a) => ({ a, s: disponibleTerminado(e, a.sku) })).filter((x) => x.s.disponible < x.a.stockMinimo);
  const alterna = (sku: string) => setAbiertos((p) => (p.includes(sku) ? p.filter((x) => x !== sku) : [...p, sku]));
  const reservaOk = puede(u, 'reserva.crear');

  const desglose = (sku: string) => (
    <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm">
      <thead className="text-xs uppercase text-concreto-600"><tr><th className="px-2 py-1 text-left">Bodega</th><th className="px-2 py-1 text-right">Físico</th><th className="px-2 py-1 text-right">Comprometido</th><th className="px-2 py-1 text-right">Disponible</th><th className="px-2 py-1 text-right">En tránsito</th></tr></thead>
      <tbody>{e.bodegas.filter((b) => b.activa).map((b) => { const s = disponibleTerminado(e, sku, b.id); return (
        <tr key={b.id} className="border-t border-concreto-300"><td className="px-2 py-1">{b.nombre}</td><td className="px-2 py-1 text-right tabular-nums">{s.fisica}</td><td className="px-2 py-1 text-right tabular-nums">{s.comprometida}</td><td className="px-2 py-1 text-right font-semibold tabular-nums">{s.disponible}</td><td className="px-2 py-1 text-right tabular-nums text-concreto-600">{s.enTransito}</td></tr>); })}</tbody>
    </table></div>
  );
  const acciones = (sku: string, agotado: boolean) => (
    <div className="flex flex-wrap gap-2">
      <Link className="btn-secundario !py-1 text-xs" to={`/producto-terminado/${sku}`}>Ver detalle</Link>
      <BotonConPermiso permitido={reservaOk} motivo="Solo Ventas o Producción reservan producto" className="!py-1 text-xs" onClick={() => setReservar(sku)}><Lock size={13} /> Reservar</BotonConPermiso>
      {agotado && <BotonConPermiso variante="primario" permitido={puede(u, 'fabricacion.registrar')} motivo="Solo Producción registra fabricaciones" className="!py-1 text-xs" onClick={() => navigate(`/fabricacion/nueva?sku=${sku}`)}><Hammer size={13} /> Crear fabricación</BotonConPermiso>}
    </div>
  );

  return (
    <div>
      <PageHeader titulo="Inventario de producto terminado" migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Producto terminado' }]} subtitulo="El producto en tránsito no cuenta como disponible en ninguna bodega." />
      {alertas.length > 0 && <div className="mb-4 grid gap-2 md:grid-cols-2">{alertas.map(({ a, s }) => <AlertaInventario key={a.sku} alerta={{ id: a.sku, tipo: s.disponible <= 0 ? 'agotado' : 'bajo_minimo', severidad: s.disponible <= 0 ? 'error' : 'aviso', titulo: `${a.nombre} (${a.sku})`, detalle: s.disponible <= 0 ? 'Agotado' : `Disponible ${s.disponible}, mínimo ${a.stockMinimo}`, ruta: `/producto-terminado?sku=${a.sku}` }} />)}</div>}
      <FiltrosBar busqueda={q} onBusqueda={setQ} placeholder="SKU o nombre" onLimpiar={() => { setQ(''); setCategoria('todas'); setEstado('todos'); }} filtros={[
        { clave: 'cat', etiqueta: 'Categoría', valor: categoria, opciones: [{ valor: 'todas', texto: 'Todas' }, ...categorias.map((c) => ({ valor: c, texto: c }))], onChange: setCategoria },
        { clave: 'est', etiqueta: 'Estado', valor: estado, opciones: [{ valor: 'todos', texto: 'Todos' }, { valor: 'disponible', texto: 'Disponible' }, { valor: 'reservado', texto: 'Reservado' }, { valor: 'agotado', texto: 'Agotado' }], onChange: setEstado },
      ]} />

      {/* Movil: tarjetas */}
      <div className="space-y-3 md:hidden">
        {filas.length === 0 && <p className="tarjeta p-4 text-sm text-concreto-600">Sin productos para los filtros elegidos.</p>}
        {filas.map(({ a, s, est }) => (
          <article key={a.sku} className="tarjeta space-y-2 p-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-concreto-100 text-concreto-600"><Package size={20} aria-hidden="true" /></span>
              <div className="min-w-0 flex-1"><p className="text-xs text-concreto-600">{a.sku} - {a.categoria}</p><p className="font-semibold">{a.nombre}</p></div>
              <div className="text-right"><p className="text-2xl font-bold leading-none tabular-nums">{s.disponible}</p><p className="text-xs text-concreto-600">disponible</p></div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><InsigniaEstadoPT estado={est} /><span className="text-concreto-600">Físico {s.fisica} - Comprometido {s.comprometida} - En tránsito {s.enTransito}</span></div>
            <button className="flex items-center gap-1 text-xs font-semibold text-marca-vino" aria-expanded={abiertos.includes(a.sku)} onClick={() => alterna(a.sku)}>{abiertos.includes(a.sku) ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Desglose por bodega</button>
            {abiertos.includes(a.sku) && desglose(a.sku)}
            {acciones(a.sku, est === 'agotado')}
          </article>
        ))}
      </div>

      {/* Escritorio: tabla */}
      <div className="tarjeta hidden overflow-x-auto md:block"><table className="w-full text-sm">
        <thead className="bg-concreto-100 text-xs uppercase text-concreto-600"><tr><th className="w-8 px-2 py-2" /><th className="px-2 py-2 text-left">Producto</th><th className="px-2 py-2 text-left">Categoría</th><th className="px-2 py-2 text-right">Físico</th><th className="px-2 py-2 text-right">Comprometido</th><th className="px-2 py-2 text-right">Disponible</th><th className="px-2 py-2 text-right">En tránsito</th><th className="px-2 py-2 text-left">Estado</th></tr></thead>
        <tbody>
          {filas.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-concreto-600">Sin productos para los filtros elegidos.</td></tr>}
          {filas.map(({ a, s, est }) => (
            <Fragment key={a.sku}>
              <tr className={`border-t border-concreto-300 ${skuParam === a.sku ? 'bg-marca-vino/5' : ''}`}>
                <td className="px-2 py-2"><button aria-label={`Desglose de ${a.sku}`} aria-expanded={abiertos.includes(a.sku)} onClick={() => alterna(a.sku)}>{abiertos.includes(a.sku) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button></td>
                <td className="px-2 py-2"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-concreto-100 text-concreto-600"><Package size={16} aria-hidden="true" /></span><span><Link className="font-semibold text-marca-vino underline" to={`/producto-terminado/${a.sku}`}>{a.sku}</Link><span className="block text-xs text-concreto-600">{a.nombre}</span></span></div></td>
                <td className="px-2 py-2">{a.categoria}</td>
                <td className="px-2 py-2 text-right tabular-nums">{s.fisica}</td><td className="px-2 py-2 text-right tabular-nums">{s.comprometida}</td>
                <td className="px-2 py-2 text-right text-base font-bold tabular-nums">{s.disponible}</td><td className="px-2 py-2 text-right tabular-nums text-concreto-600">{s.enTransito}</td>
                <td className="px-2 py-2"><InsigniaEstadoPT estado={est} /></td>
              </tr>
              {abiertos.includes(a.sku) && <tr className="bg-concreto-50"><td /><td colSpan={7} className="space-y-2 px-2 py-3">{desglose(a.sku)}{acciones(a.sku, est === 'agotado')}</td></tr>}
            </Fragment>
          ))}
        </tbody>
      </table></div>
      <ModalReserva sku={reservar} onCerrar={() => setReservar(null)} />
    </div>
  );
}

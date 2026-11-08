import { useState } from 'react';
import { Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import BuscadorArticulo from '../../components/BuscadorArticulo';
import InsigniaSimulado from '../../components/InsigniaSimulado';
import PageHeader from '../../components/PageHeader';
import { formatearFecha } from '../../lib/formato';
import { respuestaDisponibilidad, type EstadoDisponibilidad } from '../../store/selectoresFase5';
import { useStore } from '../../store/useStore';

const ESTADO: Record<EstadoDisponibilidad, { t: string; c: string }> = {
  inmediata: { t: 'Disponible inmediato', c: 'border-ok/30 bg-ok/10 text-ok' },
  parcial: { t: 'Disponibilidad parcial', c: 'border-aviso/30 bg-aviso/10 text-aviso' },
  agotado: { t: 'Agotado', c: 'border-error/30 bg-error/10 text-error' },
};

// P-15 Consulta de disponibilidad (SIMULADO): consulta interna del vendedor
export default function Disponibilidad() {
  const e = useStore();
  const [params] = useSearchParams();
  const [sku, setSku] = useState(params.get('sku') ?? '');
  const [cantTxt, setCantTxt] = useState(params.get('cantidad') ?? '10');
  const [consulta, setConsulta] = useState<{ sku: string; cantidad: number } | null>(null);
  const [error, setError] = useState('');
  const productos = e.articulos.filter((a) => a.tipo === 'producto_terminado' && a.activo);

  const consultar = () => {
    const n = parseInt(cantTxt, 10);
    if (!sku) return setError('Elige un producto');
    if (!(n > 0) || String(n) !== cantTxt.trim()) return setError('La cantidad solicitada debe ser un entero mayor que cero');
    const r = e.consultarDisponibilidad(sku, n);
    if (!r.ok) return setError(r.error ?? 'No se pudo consultar');
    setError(''); setConsulta({ sku, cantidad: n });
  };
  // La respuesta se recalcula con el estado actual: si cambia el inventario, cambia el resultado
  const r = consulta ? respuestaDisponibilidad(e, consulta.sku, consulta.cantidad) : null;

  return (
    <div>
      <PageHeader titulo="Consulta de disponibilidad" migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Disponibilidad' }]} subtitulo="Existencias, disponible y alternativa de fabricación para el vendedor."
        acciones={<InsigniaSimulado texto="Simulación con datos ilustrativos." />} />
      <div className="space-y-4">
        <section className="tarjeta grid gap-3 p-4 sm:grid-cols-[1fr_160px_auto] sm:items-end">
          <div><label className="etiqueta">Producto (SKU o nombre)</label><BuscadorArticulo value={sku} onChange={setSku} articulos={productos} /></div>
          <div><label className="etiqueta" htmlFor="dp-cant">Cantidad solicitada</label><input id="dp-cant" inputMode="numeric" className="campo" value={cantTxt} onChange={(ev) => setCantTxt(ev.target.value)} onKeyDown={(ev) => ev.key === 'Enter' && consultar()} /></div>
          <button className="btn-primario" onClick={consultar}><Search size={15} /> Consultar</button>
          {error && <p role="alert" className="text-xs text-error sm:col-span-3">{error}</p>}
        </section>

        {r && (
          <>
            <section className="tarjeta space-y-4 p-4" aria-label="Resultado de la consulta">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="text-xs text-concreto-600">{r.sku}</p><h2 className="text-lg font-bold">{r.nombre}</h2></div>
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold ${ESTADO[r.estado].c}`}>{ESTADO[r.estado].t}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-5">
                <div><p className="etiqueta">Solicitadas</p><span className="text-xl font-bold tabular-nums">{r.cantidadSolicitada}</span></div>
                <div><p className="etiqueta">Física</p><span className="text-xl font-bold tabular-nums">{r.fisica}</span></div>
                <div><p className="etiqueta">Comprometida</p><span className="text-xl font-bold tabular-nums">{r.comprometida}</span></div>
                <div><p className="etiqueta">Disponible</p><span className="text-xl font-bold tabular-nums text-marca-vino">{r.disponible}</span></div>
                <div><p className="etiqueta">En tránsito (informativo)</p><span className="text-xl font-bold tabular-nums text-concreto-600">{r.enTransito}</span></div>
              </div>
              <div className="overflow-x-auto"><table className="w-full min-w-[380px] text-sm">
                <thead className="text-xs uppercase text-concreto-600"><tr><th className="px-2 py-1 text-left">Bodega</th><th className="px-2 py-1 text-right">Física</th><th className="px-2 py-1 text-right">Comprometida</th><th className="px-2 py-1 text-right">Disponible</th></tr></thead>
                <tbody>{r.bodegas.map((b) => <tr key={b.bodegaId} className="border-t border-concreto-300"><td className="px-2 py-1">{b.nombre}</td><td className="px-2 py-1 text-right tabular-nums">{b.fisica}</td><td className="px-2 py-1 text-right tabular-nums">{b.comprometida}</td><td className="px-2 py-1 text-right font-semibold tabular-nums">{b.disponible}</td></tr>)}</tbody>
              </table></div>
              <div className="rounded-md border border-concreto-300 bg-concreto-100 p-3 text-sm">
                <p className="font-semibold">Recomendación de entrega</p><p>{r.recomendacion}</p>
                {r.faltante > 0 && (
                  <p className="mt-2"><span className="font-semibold">Alternativa de fabricación:</span> faltan {r.faltante} unidades. {r.plazoDias === null
                    ? 'Plazo no informado por la operación: no se promete fecha.' : `Plazo estimado ${r.plazoDias} días (fecha estimada ${formatearFecha(r.fechaEstimada!)}).`}</p>)}
              </div>
            </section>

          </>
        )}
        {!r && <div className="tarjeta p-4 text-sm text-concreto-600">Elige un producto y la cantidad solicitada, y pulsa Consultar para ver existencias, alternativa de fabricación y la recomendación de entrega.</div>}

        <p className="text-center text-xs font-semibold text-marca-vino">Simulación con datos ilustrativos.</p>
      </div>

    </div>
  );
}

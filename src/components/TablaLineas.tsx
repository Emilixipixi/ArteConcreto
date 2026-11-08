import { useStore } from '../store/useStore';
import { stockPorSku } from '../store/selectores';
import { formatearMoneda } from '../lib/formato';
import { formatearCantidad } from '../lib/unidades';
import CantidadConEquivalencia from './CantidadConEquivalencia';
import SemaforoStock from './SemaforoStock';

export interface LineaVista { sku: string; cantidad: number; unidadId: string; observacion?: string; destinoBodegaId?: string; precioUnitario?: number }

interface Props { lineas: LineaVista[]; mostrarStock?: boolean; mostrarPrecios?: boolean }

// Tabla de items de solo lectura con equivalencia en unidad base, stock y/o precios
export default function TablaLineas({ lineas, mostrarStock, mostrarPrecios }: Props) {
  const estado = useStore();
  const art = (sku: string) => estado.articulos.find((a) => a.sku === sku);
  const bodega = (id?: string) => estado.bodegas.find((b) => b.id === id)?.codigo ?? '-';
  return (
    <div className="overflow-x-auto rounded-md border border-concreto-300">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-concreto-100 text-xs uppercase tracking-wide text-concreto-600">
          <tr>
            <th className="px-3 py-2">Artículo</th><th className="px-3 py-2">Cantidad</th>
            {lineas.some((l) => l.destinoBodegaId) && <th className="px-3 py-2">Destino</th>}
            {mostrarStock && <th className="px-3 py-2">Stock actual (todas las bodegas)</th>}
            {mostrarPrecios && <><th className="px-3 py-2 text-right">Precio unit.</th><th className="px-3 py-2 text-right">Subtotal</th></>}
          </tr>
        </thead>
        <tbody>
          {lineas.map((l, i) => {
            const a = art(l.sku);
            const s = a ? stockPorSku(estado, a.sku) : null;
            return (
              <tr key={l.sku + i} className="border-t border-concreto-300 align-top">
                <td className="px-3 py-2"><span className="font-semibold text-marca-vino">{l.sku}</span> {a?.nombre}{l.observacion && <span className="block text-xs text-concreto-600">{l.observacion}</span>}</td>
                <td className="px-3 py-2">{a ? <CantidadConEquivalencia cantidad={l.cantidad} unidadId={l.unidadId} articulo={a} /> : l.cantidad}</td>
                {lineas.some((x) => x.destinoBodegaId) && <td className="px-3 py-2">{bodega(l.destinoBodegaId)}</td>}
                {mostrarStock && (
                  <td className="px-3 py-2">
                    {a && s && (<><span className="tabular-nums">{formatearCantidad(s.disponible, a.unidadBaseId)}</span> <span className="text-xs text-concreto-600">(mín. {formatearCantidad(a.stockMinimo, a.unidadBaseId)})</span><div className="mt-1"><SemaforoStock disponible={s.disponible} minimo={a.stockMinimo} /></div></>)}
                  </td>
                )}
                {mostrarPrecios && <><td className="px-3 py-2 text-right tabular-nums">{l.precioUnitario ? formatearMoneda(l.precioUnitario) : '-'}</td><td className="px-3 py-2 text-right tabular-nums">{formatearMoneda(l.cantidad * (l.precioUnitario ?? 0))}</td></>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

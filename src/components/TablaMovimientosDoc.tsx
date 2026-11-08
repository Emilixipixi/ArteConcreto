import { Link } from 'react-router-dom';
import { formatearCantidad } from '../lib/unidades';
import { formatearFechaHora } from '../lib/formato';
import { useStore } from '../store/useStore';
import type { Movimiento } from '../types';

const ETIQUETA: Record<string, string> = {
  salida_fabricacion: 'Salida por fabricación', entrada_fabricacion: 'Entrada por fabricación', traslado_salida: 'Salida de traslado', traslado_entrada: 'Entrada de traslado',
  salida_venta: 'Salida por venta', salida_despacho: 'Salida por despacho', ajuste: 'Ajuste', entrada_compra: 'Entrada por compra',
};
const RUTA: Record<string, string> = { Fabricación: '/fabricacion', Traslado: '/traslados', Despacho: '/ventas' };

/** Movimientos de inventario generados por un documento (trazabilidad con enlaces a articulo y documento) */
export default function TablaMovimientosDoc({ movimientos }: { movimientos: Movimiento[] }) {
  const e = useStore();
  if (movimientos.length === 0) return <p className="text-sm text-concreto-600">Este documento aún no ha generado movimientos de inventario.</p>;
  const bod = (id?: string) => (id ? e.bodegas.find((b) => b.id === id)?.codigo ?? id : '-');
  return (
    <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
      <thead className="bg-concreto-100 text-xs uppercase text-concreto-600"><tr><th className="px-2 py-2 text-left">Fecha</th><th className="px-2 py-2 text-left">Tipo</th><th className="px-2 py-2 text-left">Artículo</th><th className="px-2 py-2 text-left">Bodega</th><th className="px-2 py-2 text-right">Cantidad</th></tr></thead>
      <tbody>{movimientos.map((m) => {
        const a = e.articulos.find((x) => x.sku === m.sku);
        const ruta = a?.tipo === 'producto_terminado' ? `/producto-terminado?sku=${m.sku}` : `/materias-primas?sku=${m.sku}`;
        return (
          <tr key={m.id} className="border-t border-concreto-300">
            <td className="px-2 py-2 whitespace-nowrap">{formatearFechaHora(m.fecha)}</td>
            <td className="px-2 py-2">{ETIQUETA[m.tipo] ?? m.tipo}{RUTA[m.documentoTipo] && <Link className="ml-1 text-xs text-marca-vino underline" to={`${RUTA[m.documentoTipo]}/${m.documentoId}`}>ver documento</Link>}</td>
            <td className="px-2 py-2"><Link className="font-semibold text-marca-vino underline" to={ruta}>{m.sku}</Link><span className="block text-xs text-concreto-600">{a?.nombre}</span></td>
            <td className="px-2 py-2">{bod(m.bodegaOrigenId)}{m.bodegaOrigenId && m.bodegaDestinoId ? ' → ' : ''}{m.bodegaOrigenId && !m.bodegaDestinoId ? '' : bod(m.bodegaDestinoId)}</td>
            <td className="px-2 py-2 text-right tabular-nums">{formatearCantidad(m.cantidadBase, a?.unidadBaseId ?? '')}</td>
          </tr>
        );
      })}</tbody>
    </table></div>
  );
}

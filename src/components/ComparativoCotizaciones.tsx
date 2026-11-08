import { CheckCircle2, Trophy } from 'lucide-react';
import type { Compra } from '../types';
import { useStore } from '../store/useStore';
import { formatearMoneda } from '../lib/formato';
import { formatearCantidad } from '../lib/unidades';

interface Props { compra: Pick<Compra, 'lineas' | 'cotizaciones' | 'proveedorId'>; onElegir?: (proveedorId: string) => void; deshabilitado?: boolean }

// Comparativo: filas = items, columnas = proveedores; resalta el menor precio por linea y el menor total
export default function ComparativoCotizaciones({ compra, onElegir, deshabilitado }: Props) {
  const proveedores = useStore((s) => s.proveedores);
  const articulos = useStore((s) => s.articulos);
  const cots = compra.cotizaciones;
  if (cots.length === 0) return <p className="rounded-md border border-dashed border-concreto-300 p-4 text-sm text-concreto-600">Aún no hay cotizaciones. Agrega ítems y guarda el borrador para generarlas.</p>;
  const precio = (c: (typeof cots)[number], sku: string) => c.precios.find((p) => p.sku === sku)?.precioUnitario ?? 0;
  const total = (c: (typeof cots)[number]) => compra.lineas.reduce((a, l) => a + l.cantidad * precio(c, l.sku), 0);
  const totales = cots.map(total);
  const menorTotal = Math.min(...totales);
  const menorDias = Math.min(...cots.map((c) => c.diasEntrega));
  const nombre = (id: string) => proveedores.find((p) => p.id === id)?.nombre ?? id;
  return (
    <div className="overflow-x-auto rounded-md border border-concreto-300">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-concreto-100 text-xs uppercase tracking-wide text-concreto-600">
          <tr><th className="px-3 py-2">Ítem</th>{cots.map((c) => <th key={c.proveedorId} className={`px-3 py-2 ${compra.proveedorId === c.proveedorId ? 'bg-marca-amarillo-suave/60 text-marca-vino-oscuro' : ''}`}>{nombre(c.proveedorId)}</th>)}</tr>
        </thead>
        <tbody>
          {compra.lineas.map((l) => {
            const a = articulos.find((x) => x.sku === l.sku);
            const min = Math.min(...cots.map((c) => precio(c, l.sku)));
            return (
              <tr key={l.sku} className="border-t border-concreto-300">
                <td className="px-3 py-2"><span className="font-semibold text-marca-vino">{l.sku}</span> {a?.nombre}<span className="block text-xs text-concreto-600">{formatearCantidad(l.cantidad, l.unidadId)}</span></td>
                {cots.map((c) => {
                  const p = precio(c, l.sku);
                  return <td key={c.proveedorId} className={`px-3 py-2 tabular-nums ${p === min ? 'font-semibold text-ok' : ''}`}>{formatearMoneda(p)}{p === min && <span className="ml-1 text-[10px] uppercase">menor</span>}</td>;
                })}
              </tr>
            );
          })}
          <tr className="border-t-2 border-concreto-300 bg-concreto-100/50 font-semibold">
            <td className="px-3 py-2">Total (sin impuesto)</td>
            {cots.map((c, i) => <td key={c.proveedorId} className={`px-3 py-2 tabular-nums ${totales[i] === menorTotal ? 'text-ok' : ''}`}>{formatearMoneda(totales[i])}{totales[i] === menorTotal && <Trophy size={13} className="ml-1 inline" aria-label="Menor total" />}</td>)}
          </tr>
          <tr className="border-t border-concreto-300">
            <td className="px-3 py-2 text-concreto-600">Días de entrega</td>
            {cots.map((c) => <td key={c.proveedorId} className={`px-3 py-2 ${c.diasEntrega === menorDias ? 'font-semibold text-ok' : ''}`}>{c.diasEntrega} días</td>)}
          </tr>
          <tr className="border-t border-concreto-300">
            <td className="px-3 py-2 text-concreto-600">Condiciones</td>
            {cots.map((c) => <td key={c.proveedorId} className="px-3 py-2 text-xs">{c.condiciones}</td>)}
          </tr>
          {onElegir && (
            <tr className="border-t border-concreto-300">
              <td className="px-3 py-2 text-concreto-600">Selección</td>
              {cots.map((c) => (
                <td key={c.proveedorId} className="px-3 py-2">
                  {compra.proveedorId === c.proveedorId
                    ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-ok"><CheckCircle2 size={14} /> Elegido</span>
                    : <button type="button" className="btn-secundario !py-1 text-xs" disabled={deshabilitado} onClick={() => onElegir(c.proveedorId)}>Elegir este proveedor</button>}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

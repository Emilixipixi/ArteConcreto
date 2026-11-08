import { Plus, Trash2 } from 'lucide-react';
import type { Articulo } from '../types';
import { useStore } from '../store/useStore';
import { aBase, formatearCantidad, validarDecimales } from '../lib/unidades';
import CantidadConEquivalencia from './CantidadConEquivalencia';
import SelectorUnidad from './SelectorUnidad';

export interface LineaForm { sku: string; cantidad: number; unidadId: string }

interface Props {
  lineas: LineaForm[]; onChange: (l: LineaForm[]) => void; tipo?: Articulo['tipo']; soloLectura?: boolean;
}

// Captura multi-item: articulo + cantidad + unidad, con conversion automatica y validacion de decimales
export default function FormMultiItem({ lineas, onChange, tipo, soloLectura }: Props) {
  const articulos = useStore((s) => s.articulos).filter((a) => a.activo && (!tipo || a.tipo === tipo));
  const todos = useStore((s) => s.articulos);
  const porSku = (sku: string) => todos.find((a) => a.sku === sku);

  const actualizar = (i: number, cambios: Partial<LineaForm>) => onChange(lineas.map((l, j) => (j === i ? { ...l, ...cambios } : l)));
  const elegir = (i: number, sku: string) => {
    const a = porSku(sku);
    // Por defecto se captura en la primera presentacion de compra (si existe)
    actualizar(i, { sku, unidadId: a?.presentaciones[0]?.unidadId ?? a?.unidadBaseId ?? '' });
  };
  const agregar = () => onChange([...lineas, { sku: '', cantidad: 0, unidadId: '' }]);

  return (
    <div className="space-y-2">
      {lineas.map((l, i) => {
        const a = porSku(l.sku);
        const error = a && l.cantidad > 0 ? validarDecimales(l.cantidad, l.unidadId) : null;
        return (
          <div key={i} className="grid grid-cols-1 items-start gap-2 rounded-md border border-concreto-300 bg-concreto-100/50 p-2 sm:grid-cols-[2fr_1fr_1fr_2fr_auto]">
            <div>
              <label className="etiqueta">Artículo</label>
              <select className="campo" value={l.sku} onChange={(e) => elegir(i, e.target.value)} disabled={soloLectura}>
                <option value="">Selecciona...</option>
                {articulos.map((x) => <option key={x.sku} value={x.sku}>{x.sku} - {x.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="etiqueta">Cantidad</label>
              <input type="number" min={0} step="any" className={`campo tabular-nums ${error ? 'border-error' : ''}`} value={l.cantidad || ''} onChange={(e) => actualizar(i, { cantidad: parseFloat(e.target.value) || 0 })} disabled={soloLectura} />
            </div>
            <div>
              <label className="etiqueta">Unidad</label>
              <SelectorUnidad articulo={a} value={l.unidadId} onChange={(u) => actualizar(i, { unidadId: u })} />
            </div>
            <div className="pt-0 sm:pt-5 text-sm">
              {a && l.cantidad > 0 && !error && <CantidadConEquivalencia cantidad={l.cantidad} unidadId={l.unidadId} articulo={a} />}
              {a && l.cantidad > 0 && !error && l.unidadId !== a.unidadBaseId && <span className="sr-only">{formatearCantidad(aBase(l.cantidad, l.unidadId, a), a.unidadBaseId)}</span>}
              {error && <span className="text-xs text-error">{error}</span>}
            </div>
            {!soloLectura && (
              <div className="pt-0 sm:pt-5">
                <button className="btn-fantasma !px-2 text-error" onClick={() => onChange(lineas.filter((_, j) => j !== i))} aria-label="Quitar línea"><Trash2 size={16} /></button>
              </div>
            )}
          </div>
        );
      })}
      {!soloLectura && <button type="button" className="btn-secundario" onClick={agregar}><Plus size={15} /> Agregar artículo</button>}
    </div>
  );
}

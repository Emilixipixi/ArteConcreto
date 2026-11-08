import { useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import type { Articulo } from '../types';

interface Props { value: string; onChange: (sku: string) => void; articulos: Articulo[]; deshabilitado?: boolean; invalido?: boolean; extra?: (a: Articulo) => ReactNode }

// Buscador por SKU o nombre con lista desplegable
export default function BuscadorArticulo({ value, onChange, articulos, deshabilitado, invalido, extra }: Props) {
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState(false);
  const sel = articulos.find((a) => a.sku === value);
  const lista = articulos.filter((a) => `${a.sku} ${a.nombre}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8);
  return (
    <div className="relative">
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-concreto-600" aria-hidden="true" />
      <input className={`campo pl-8 ${invalido ? 'border-error' : ''}`} disabled={deshabilitado} placeholder="Buscar por SKU o nombre"
        value={abierto ? q : sel ? `${sel.sku} - ${sel.nombre}` : ''}
        onFocus={() => { setQ(''); setAbierto(true); }} onChange={(e) => setQ(e.target.value)} onBlur={() => setTimeout(() => setAbierto(false), 120)} aria-label="Artículo" />
      {abierto && (
        <ul className="tarjeta absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto">
          {lista.length === 0 && <li className="px-3 py-2 text-sm text-concreto-600">Sin coincidencias</li>}
          {lista.map((a) => (
            <li key={a.sku}>
              <button type="button" className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-concreto-100"
                onMouseDown={(e) => { e.preventDefault(); onChange(a.sku); setAbierto(false); }}>
                <span><span className="font-semibold text-marca-vino">{a.sku}</span> {a.nombre}</span>
                {extra ? extra(a) : <span className="text-xs text-concreto-600">{a.categoria}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

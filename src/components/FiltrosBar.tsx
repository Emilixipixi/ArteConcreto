import { Search, X } from 'lucide-react';
import type { ReactNode } from 'react';

export interface FiltroSelect { clave: string; etiqueta: string; valor: string; opciones: { valor: string; texto: string }[]; onChange: (v: string) => void }

interface Props {
  busqueda?: string; onBusqueda?: (v: string) => void; placeholder?: string;
  filtros?: FiltroSelect[]; onLimpiar?: () => void; children?: ReactNode;
}

export default function FiltrosBar({ busqueda, onBusqueda, placeholder = 'Buscar...', filtros = [], onLimpiar, children }: Props) {
  return (
    <div className="tarjeta mb-4 flex flex-wrap items-end gap-3 p-3">
      {onBusqueda && (
        <div className="min-w-[200px] flex-1">
          <label className="etiqueta" htmlFor="filtro-busqueda">Búsqueda</label>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-concreto-600" aria-hidden="true" />
            <input id="filtro-busqueda" className="campo pl-8" value={busqueda ?? ''} onChange={(e) => onBusqueda(e.target.value)} placeholder={placeholder} />
          </div>
        </div>
      )}
      {filtros.map((f) => (
        <div key={f.clave} className="min-w-[140px]">
          <label className="etiqueta" htmlFor={`f-${f.clave}`}>{f.etiqueta}</label>
          <select id={`f-${f.clave}`} className="campo" value={f.valor} onChange={(e) => f.onChange(e.target.value)}>
            {f.opciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
          </select>
        </div>
      ))}
      {children}
      {onLimpiar && <button className="btn-fantasma" onClick={onLimpiar}><X size={14} /> Limpiar</button>}
    </div>
  );
}

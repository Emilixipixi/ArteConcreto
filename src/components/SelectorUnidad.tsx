import type { Articulo } from '../types';
import { unidadesDisponibles } from '../lib/unidades';

interface Props { articulo?: Articulo; value: string; onChange: (unidadId: string) => void; id?: string }

export default function SelectorUnidad({ articulo, value, onChange, id }: Props) {
  const opciones = articulo ? unidadesDisponibles(articulo) : [];
  return (
    <select id={id} className="campo" value={value} onChange={(e) => onChange(e.target.value)} disabled={!articulo} aria-label="Unidad">
      {opciones.map((u) => <option key={u.id} value={u.id}>{u.simbolo}{u.id === articulo?.unidadBaseId ? ' (base)' : ''}</option>)}
    </select>
  );
}

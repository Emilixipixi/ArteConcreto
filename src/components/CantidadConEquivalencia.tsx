import type { Articulo } from '../types';
import { equivalenciaTexto, formatearCantidad } from '../lib/unidades';

// Muestra la cantidad y su equivalencia en unidad base: "20 saco50 x 50 kg = 1.000 kg"
export default function CantidadConEquivalencia({ cantidad, unidadId, articulo }: { cantidad: number; unidadId: string; articulo: Articulo }) {
  const eq = equivalenciaTexto(cantidad, unidadId, articulo);
  return (
    <span className="tabular-nums">
      <span className="font-medium">{formatearCantidad(cantidad, unidadId)}</span>
      {eq && <span className="block text-xs text-concreto-600">{eq}</span>}
    </span>
  );
}

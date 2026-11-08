import type { ReactNode } from 'react';
import { Hexagon } from 'lucide-react';

interface Props { titulo: string; mensaje?: string; accion?: ReactNode }

export default function EstadoVacio({ titulo, mensaje, accion }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <Hexagon size={44} className="mb-3 text-marca-amarillo" strokeWidth={1.5} aria-hidden="true" />
      <p className="font-titulos text-base font-semibold text-marca-vino">{titulo}</p>
      {mensaje && <p className="mt-1 max-w-md text-sm text-concreto-600">{mensaje}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

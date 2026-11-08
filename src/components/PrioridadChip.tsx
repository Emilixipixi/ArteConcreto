import type { Prioridad } from '../types';

const ESTILOS: Record<Prioridad, string> = {
  baja: 'bg-concreto-100 text-concreto-600 border-concreto-300',
  media: 'bg-info/10 text-info border-info/30',
  alta: 'bg-aviso/10 text-aviso border-aviso/30',
  urgente: 'bg-error/10 text-error border-error/30',
};

export default function PrioridadChip({ prioridad }: { prioridad: Prioridad }) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${ESTILOS[prioridad]}`}>{prioridad}</span>;
}

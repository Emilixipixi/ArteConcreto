import { AlertOctagon, AlertTriangle, CalendarClock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AlertaInv } from '../store/selectores';

export default function AlertaInventario({ alerta }: { alerta: AlertaInv }) {
  const Icono = alerta.tipo === 'recepcion_vencida' ? CalendarClock : alerta.tipo === 'agotado' ? AlertOctagon : AlertTriangle;
  const color = alerta.severidad === 'error' ? 'text-error bg-error/10' : 'text-aviso bg-aviso/10';
  return (
    <Link to={alerta.ruta} className="flex items-center gap-3 rounded-md border border-concreto-300 bg-superficie p-2.5 transition hover:border-marca-vino">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${color}`}><Icono size={16} aria-hidden="true" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{alerta.titulo}</span>
        <span className="block text-xs text-concreto-600">{alerta.detalle}</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-concreto-600" aria-hidden="true" />
    </Link>
  );
}

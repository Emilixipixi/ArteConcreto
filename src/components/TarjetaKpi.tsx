import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  titulo: string; valor: number | string; texto: string; icono: LucideIcon; ruta: string;
  variacion?: number; // variacion simulada respecto del periodo anterior
  tono?: 'normal' | 'aviso' | 'error';
}

export default function TarjetaKpi({ titulo, valor, texto, icono: Icono, ruta, variacion, tono = 'normal' }: Props) {
  const color = tono === 'error' ? 'text-error' : tono === 'aviso' ? 'text-aviso' : 'text-marca-vino';
  const Flecha = variacion === undefined || variacion === 0 ? Minus : variacion > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <Link to={ruta} className="tarjeta group block p-4 transition hover:border-marca-vino hover:shadow-md">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-concreto-600">{titulo}</span>
        <Icono size={20} className={color} aria-hidden="true" />
      </div>
      <div className={`mt-2 font-titulos text-3xl font-bold tabular-nums ${color}`}>{valor}</div>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-concreto-600">
        <span>{texto}</span>
        {variacion !== undefined && (
          <span className="inline-flex shrink-0 items-center gap-0.5" title="Variación simulada">
            <Flecha size={13} aria-hidden="true" />{variacion > 0 ? `+${variacion}` : variacion}
          </span>
        )}
      </div>
    </Link>
  );
}

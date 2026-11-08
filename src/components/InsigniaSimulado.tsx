import { FlaskConical } from 'lucide-react';

export default function InsigniaSimulado({ texto, className = '' }: { texto?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title={texto}>
      <span className="inline-flex items-center gap-1 rounded border border-marca-vino bg-marca-amarillo-suave px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-marca-vino">
        <FlaskConical size={11} aria-hidden="true" /> Simulado
      </span>
      {texto && <span className="text-xs text-concreto-600">{texto}</span>}
    </span>
  );
}

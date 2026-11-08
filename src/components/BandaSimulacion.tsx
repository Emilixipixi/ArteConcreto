import { Info } from 'lucide-react';

export default function BandaSimulacion() {
  return (
    <div className="flex items-center justify-center gap-2 bg-marca-vino-oscuro px-3 py-1 text-center text-[11px] font-medium tracking-wide text-marca-amarillo-suave">
      <Info size={13} aria-hidden="true" />
      <span>PROTOTIPO - datos ilustrativos, sin conexión a sistemas reales</span>
    </div>
  );
}

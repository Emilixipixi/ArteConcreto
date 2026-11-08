import { Info } from 'lucide-react';

// Recordatorio en pantalla de RN-03, RN-04 y RN-16
export default function NotaReglasPago() {
  return (
    <p className="mb-4 flex items-start gap-2 rounded-md border border-info/30 bg-info/5 px-3 py-2 text-xs text-texto">
      <Info size={14} className="mt-0.5 shrink-0 text-info" aria-hidden="true" />
      <span>El estado del pago es independiente de la recepción: un anticipo no significa que la mercancía llegó, y aprobar o registrar un pago nunca aumenta el stock; solo la recepción de almacén lo hace.</span>
    </p>
  );
}

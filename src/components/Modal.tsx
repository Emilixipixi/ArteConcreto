import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props { abierto: boolean; titulo: string; onCerrar: () => void; children: ReactNode; pie?: ReactNode; ancho?: string }

export default function Modal({ abierto, titulo, onCerrar, children, pie, ancho = 'max-w-md' }: Props) {
  useEffect(() => {
    if (!abierto) return;
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [abierto, onCerrar]);
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-texto/50 p-3 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div role="dialog" aria-modal="true" aria-label={titulo} className={`tarjeta flex max-h-[90vh] w-full flex-col ${ancho}`}>
        <div className="flex items-center justify-between border-b border-concreto-300 px-4 py-3">
          <h2 className="text-base font-bold">{titulo}</h2>
          <button onClick={onCerrar} className="text-concreto-600 hover:text-texto" aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
        {pie && <div className="flex flex-wrap justify-end gap-2 border-t border-concreto-300 px-4 py-3">{pie}</div>}
      </div>
    </div>
  );
}

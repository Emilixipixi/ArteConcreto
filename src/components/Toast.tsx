import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function ToastContenedor() {
  const toasts = useStore((s) => s.toasts);
  const cerrar = useStore((s) => s.cerrarToast);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite">
      {toasts.map((t) => {
        const Icono = t.tipo === 'ok' ? CheckCircle2 : t.tipo === 'error' ? XCircle : Info;
        const color = t.tipo === 'ok' ? 'border-ok text-ok' : t.tipo === 'error' ? 'border-error text-error' : 'border-info text-info';
        return (
          <div key={t.id} className={`pointer-events-auto flex items-start gap-2 rounded-md border-l-4 bg-superficie p-3 shadow-lg ${color}`} role="status">
            <Icono size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="flex-1 text-sm text-texto">{t.mensaje}</p>
            <button onClick={() => cerrar(t.id)} className="text-concreto-600 hover:text-texto" aria-label="Cerrar aviso"><X size={16} /></button>
          </div>
        );
      })}
    </div>
  );
}

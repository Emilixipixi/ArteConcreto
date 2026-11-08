import { Circle } from 'lucide-react';
import type { HistorialItem } from '../types';
import { formatearFechaHora } from '../lib/formato';
import { useStore } from '../store/useStore';
import EstadoBadge from './EstadoBadge';

// Historial de un documento: autor, fecha, transicion y observacion (RN-02)
export default function LineaTiempoEstados({ historial }: { historial: HistorialItem[] }) {
  const usuarios = useStore((s) => s.usuarios);
  const nombre = (id: string) => usuarios.find((u) => u.id === id)?.nombre ?? id;
  return (
    <ol className="relative space-y-4 border-l-2 border-concreto-300 pl-5">
      {historial.map((h, i) => (
        <li key={i} className="relative">
          <Circle size={12} className="absolute -left-[27px] top-1 fill-marca-amarillo text-marca-vino" aria-hidden="true" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{h.accion}</span>
            {h.estadoAnterior && h.estadoNuevo && (
              <span className="inline-flex items-center gap-1 text-xs text-concreto-600"><EstadoBadge estado={h.estadoAnterior} /> a <EstadoBadge estado={h.estadoNuevo} /></span>
            )}
          </div>
          <p className="text-xs text-concreto-600">{nombre(h.usuarioId)} - {formatearFechaHora(h.fecha)}</p>
          {h.observacion && (
            <p className={`mt-1 rounded-md px-2 py-1 text-sm ${h.estadoNuevo === 'devuelta' ? 'border border-aviso/40 bg-aviso/10' : 'bg-marca-amarillo-suave/50'}`}>{h.observacion}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

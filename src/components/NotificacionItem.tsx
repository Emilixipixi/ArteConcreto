import { AlertTriangle, CheckCircle2, ClipboardCheck, Info } from 'lucide-react';
import type { Notificacion } from '../types';
import { tiempoRelativo } from '../lib/formato';

const ICONOS = { info: Info, accion: ClipboardCheck, alerta: AlertTriangle, exito: CheckCircle2 };
const COLORES = { info: 'text-info bg-info/10', accion: 'text-marca-vino bg-marca-amarillo-suave', alerta: 'text-aviso bg-aviso/10', exito: 'text-ok bg-ok/10' };

export default function NotificacionItem({ n, leida, onClick }: { n: Notificacion; leida: boolean; onClick: () => void }) {
  const Icono = ICONOS[n.tipo];
  return (
    <button onClick={onClick} className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-concreto-100 ${leida ? '' : 'bg-marca-amarillo-suave/25'}`}>
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${COLORES[n.tipo]}`}><Icono size={16} aria-hidden="true" /></span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm ${leida ? 'font-medium' : 'font-semibold'}`}>{n.titulo}</span>
        <span className="block text-xs text-concreto-600">{n.mensaje}</span>
        <span className="mt-0.5 block text-[11px] text-concreto-600">{tiempoRelativo(n.fecha)}</span>
      </span>
      {!leida && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-marca-amarillo ring-2 ring-marca-vino" aria-label="Sin leer" />}
    </button>
  );
}

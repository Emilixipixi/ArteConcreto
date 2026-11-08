// Semaforo de stock: agotado (rojo), bajo minimo (ambar), suficiente (verde). Lleva icono y texto.
import { AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react';

export type NivelStock = 'agotado' | 'bajo' | 'ok';
export const nivelStock = (disponible: number, minimo: number): NivelStock => (disponible <= 0 ? 'agotado' : disponible < minimo ? 'bajo' : 'ok');

export default function SemaforoStock({ disponible, minimo }: { disponible: number; minimo: number }) {
  const n = nivelStock(disponible, minimo);
  const def = {
    agotado: { t: 'Agotado', c: 'text-error bg-error/10 border-error/30', I: AlertOctagon },
    bajo: { t: 'Bajo mínimo', c: 'text-aviso bg-aviso/10 border-aviso/30', I: AlertTriangle },
    ok: { t: 'Suficiente', c: 'text-ok bg-ok/10 border-ok/30', I: CheckCircle2 },
  }[n];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${def.c}`}>
      <def.I size={12} aria-hidden="true" />{def.t}
    </span>
  );
}

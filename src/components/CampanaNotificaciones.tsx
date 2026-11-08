import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useNotificacionesUsuario, useUsuarioActual } from '../store/selectores';
import NotificacionItem from './NotificacionItem';
import type { Notificacion } from '../types';

export default function CampanaNotificaciones() {
  const [abierta, setAbierta] = useState(false);
  const [pestana, setPestana] = useState<'sin_leer' | 'todas'>('sin_leer');
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const usuario = useUsuarioActual();
  const { todas, sinLeer } = useNotificacionesUsuario();
  const marcarLeida = useStore((s) => s.marcarNotificacionLeida);
  const marcarTodas = useStore((s) => s.marcarTodasLeidas);

  useEffect(() => {
    const f = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setAbierta(false);
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, []);

  const lista = (pestana === 'sin_leer' ? sinLeer : todas).slice(0, 8);
  const abrir = (n: Notificacion) => { marcarLeida(n.id); setAbierta(false); navigate(n.ruta); };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setAbierta(!abierta)} className="relative rounded-md p-2 text-marca-vino hover:bg-concreto-100" aria-label={`Notificaciones, ${sinLeer.length} sin leer`} aria-expanded={abierta}>
        <Bell size={20} />
        {sinLeer.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-marca-amarillo px-1 text-[10px] font-bold text-marca-vino-oscuro ring-2 ring-superficie">
            {sinLeer.length > 9 ? '9+' : sinLeer.length}
          </span>
        )}
      </button>
      {abierta && (
        <div className="tarjeta fixed inset-x-2 top-24 z-50 flex max-h-[75vh] flex-col sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-concreto-300 px-3 py-2">
            <div className="flex gap-1" role="tablist">
              {(['sin_leer', 'todas'] as const).map((p) => (
                <button key={p} role="tab" aria-selected={pestana === p} onClick={() => setPestana(p)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${pestana === p ? 'bg-marca-vino text-white' : 'text-concreto-600 hover:bg-concreto-100'}`}>
                  {p === 'sin_leer' ? `Sin leer (${sinLeer.length})` : 'Todas'}
                </button>
              ))}
            </div>
            <button onClick={marcarTodas} disabled={sinLeer.length === 0} className="inline-flex items-center gap-1 text-xs font-semibold text-marca-vino hover:underline disabled:opacity-40">
              <CheckCheck size={14} /> Marcar todas como leídas
            </button>
          </div>
          <div className="divide-y divide-concreto-300 overflow-y-auto">
            {lista.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-8 text-center text-sm text-concreto-600">
                <BellOff size={26} className="mb-2" aria-hidden="true" />No tienes notificaciones {pestana === 'sin_leer' ? 'sin leer' : ''}
              </div>
            ) : lista.map((n) => <NotificacionItem key={n.id} n={n} leida={!!usuario && n.leidaPor.includes(usuario.id)} onClick={() => abrir(n)} />)}
          </div>
          <button onClick={() => { setAbierta(false); navigate('/notificaciones'); }} className="border-t border-concreto-300 px-3 py-2 text-center text-sm font-semibold text-marca-vino hover:bg-concreto-100">
            Ver todas
          </button>
        </div>
      )}
    </div>
  );
}

import { ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { GRUPOS, MENU } from '../lib/menu';
import { puedeVerRuta } from '../lib/permisos';
import { useUsuarioActual, usePendientes } from '../store/selectores';
import AvatarHex from './AvatarHex';
import Logo from './Logo';
import { ROL_NOMBRE } from '../data/roles';

interface Props { colapsado: boolean; onToggle: () => void; movilAbierto: boolean; onCerrarMovil: () => void }

export default function Sidebar({ colapsado, onToggle, movilAbierto, onCerrarMovil }: Props) {
  const usuario = useUsuarioActual();
  const pendientes = usePendientes();
  const contador = (ruta: string) => pendientes.filter((p) => p.modulo === ruta).length;

  const contenido = (compacto: boolean) => (
    <div className="flex h-full flex-col bg-gradient-to-b from-marca-vino-oscuro via-marca-vino-oscuro to-[#2b0d1a] text-white">
      {/* Marca arriba y boton para colapsar */}
      <div className={`flex items-center px-4 pb-3 pt-4 ${compacto ? 'flex-col gap-3 px-2' : 'justify-between'}`}>
        <Logo variante="blanco" mostrarTexto={!compacto} className="origin-left scale-90" />
        <button onClick={movilAbierto ? onCerrarMovil : onToggle} className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label={movilAbierto ? 'Cerrar menú' : compacto ? 'Expandir menú' : 'Colapsar menú'}>
          {movilAbierto ? <X size={16} /> : compacto ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>
      <div className="mx-4 h-px bg-gradient-to-r from-marca-amarillo/50 via-white/10 to-transparent" />
      <nav className="scroll-fino flex-1 overflow-y-auto px-3 pb-4" aria-label="Navegación principal">
        {GRUPOS.map((g) => {
          const items = MENU.filter((m) => m.grupo === g && puedeVerRuta(usuario, m.ruta === '/' || m.grupo === 'Utilidades' ? '__todos__' : m.ruta));
          if (items.length === 0) return null;
          return (
            <div key={g} className="mt-4">
              {!compacto && <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-marca-amarillo-suave/60">{g}</p>}
              <ul className="space-y-0.5">
                {items.map((m) => {
                  const n = contador(m.ruta);
                  return (
                    <li key={m.ruta}>
                      <NavLink to={m.ruta} end={m.ruta === '/'} onClick={onCerrarMovil} title={compacto ? m.etiqueta : m.etiqueta}
                        className={({ isActive }) => `group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] transition ${compacto ? 'justify-center' : ''} ${isActive ? 'bg-white/10 font-semibold text-white' : 'text-white/70 hover:bg-white/[0.06] hover:text-white'}`}>
                        {({ isActive }) => (
                          <>
                            {isActive && <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-marca-amarillo" aria-hidden="true" />}
                            <m.icono size={17} aria-hidden="true" className={`shrink-0 ${isActive ? 'text-marca-amarillo' : 'text-white/60 group-hover:text-marca-amarillo-suave'}`} />
                            {!compacto && <span className="flex-1 truncate">{m.etiqueta}</span>}
                            {n > 0 && (
                              <span className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-marca-amarillo px-1 text-[10px] font-bold text-marca-vino-oscuro ${compacto ? 'absolute right-0.5 top-0.5' : ''}`}>{n}</span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      {/* Persona en sesion y su rol */}
      {usuario && (
        <div className={`m-3 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.05] p-2.5 ${compacto ? 'justify-center' : ''}`}>
          <AvatarHex nombre={usuario.nombre} tam={32} />
          {!compacto && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-semibold">{usuario.nombre}</span>
              <span className="block truncate text-[11px] text-white/60">{usuario.roles.map((r) => ROL_NOMBRE[r] ?? r).join(' · ')}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className={`hidden shrink-0 transition-all md:block ${colapsado ? 'w-16' : 'w-60'}`}>{contenido(colapsado)}</aside>
      {movilAbierto && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <div className="absolute inset-0 bg-texto/50" onClick={onCerrarMovil} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw]">{contenido(false)}</aside>
        </div>
      )}
    </>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Compass, LogOut, Menu, RefreshCw, Search, UserCog } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROL_NOMBRE } from '../data/roles';
import { MENU } from '../lib/menu';
import { buscarGlobal } from '../lib/busqueda';
import { useStore } from '../store/useStore';
import { useUsuarioActual } from '../store/selectores';
import AvatarHex from './AvatarHex';
import CampanaNotificaciones from './CampanaNotificaciones';
import ChipsRoles from './ChipsRoles';
import { EVENTO_TOUR } from './RecorridoBienvenida';
import Modal from './Modal';
import ModalConfirmar from './ModalConfirmar';

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const usuario = useUsuarioActual();
  const estado = useStore();
  const [consulta, setConsulta] = useState('');
  const [menu, setMenu] = useState(false);
  const [cambiar, setCambiar] = useState(false);
  const [reiniciar, setReiniciar] = useState(false);
  const refMenu = useRef<HTMLDivElement>(null);
  const refBusq = useRef<HTMLDivElement>(null);
  const [busqAbierta, setBusqAbierta] = useState(false);

  const resultados = useMemo(() => buscarGlobal(estado, consulta), [estado, consulta]);

  useEffect(() => {
    const f = (e: MouseEvent) => {
      if (refMenu.current && !refMenu.current.contains(e.target as Node)) setMenu(false);
      if (refBusq.current && !refBusq.current.contains(e.target as Node)) setBusqAbierta(false);
    };
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, []);

  if (!usuario) return null;
  // Pantalla actual: coincidencia mas larga entre la ruta y el menu (cubre tambien las pantallas de detalle)
  const actual = [...MENU].filter((m) => (m.ruta === '/' ? pathname === '/' : pathname === m.ruta || pathname.startsWith(m.ruta + '/')))
    .sort((a, b) => b.ruta.length - a.ruta.length)[0];
  const rolesTexto = usuario.roles.map((r) => ROL_NOMBRE[r] ?? r).join(' · ');
  const ir = (ruta: string) => { setConsulta(''); setBusqAbierta(false); navigate(ruta); };

  return (
    <>
    <header className="flex items-center gap-2 border-b border-concreto-300 bg-superficie px-3 py-2 sm:gap-3 sm:px-4">
      <button onClick={onMenu} className="rounded-md p-2 text-marca-vino hover:bg-concreto-100 md:hidden" aria-label="Abrir menú"><Menu size={20} /></button>

      <div className="relative min-w-0 flex-1 sm:max-w-md" ref={refBusq}>
        <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-concreto-600" aria-hidden="true" />
        <input className="campo pl-8" placeholder="Buscar documento o SKU (ej. OC-0001, MP-01)" value={consulta}
          onChange={(e) => { setConsulta(e.target.value); setBusqAbierta(true); }} onFocus={() => setBusqAbierta(true)}
          onKeyDown={(e) => e.key === 'Enter' && resultados[0] && ir(resultados[0].ruta)} aria-label="Buscador global" />
        {busqAbierta && consulta.trim().length >= 2 && (
          <div className="tarjeta absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto">
            {resultados.length === 0 ? <p className="px-3 py-3 text-sm text-concreto-600">Sin coincidencias</p> : resultados.map((r) => (
              <button key={r.ruta + r.etiqueta} onClick={() => ir(r.ruta)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-concreto-100">
                <span className="font-semibold text-marca-vino">{r.etiqueta}</span><span className="truncate text-xs text-concreto-600">{r.detalle}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="hidden items-center gap-1.5 sm:flex">
        <Building2 size={16} className="text-concreto-600" aria-hidden="true" />
        <select className="campo !w-auto !py-1.5" value={estado.bodegaActivaId} onChange={(e) => estado.setBodegaActiva(e.target.value)} aria-label="Bodega activa">
          <option value="todas">Todas las bodegas</option>
          {estado.bodegas.filter((b) => b.activa).map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </select>
      </div>

      <CampanaNotificaciones />

      <div className="relative" ref={refMenu}>
        <button onClick={() => setMenu(!menu)} className="flex items-center gap-2 rounded-md p-1 hover:bg-concreto-100" aria-label="Menú de usuario" aria-expanded={menu}>
          <AvatarHex nombre={usuario.nombre} tam={34} />
          <span className="hidden text-left leading-tight lg:block"><span className="block text-sm font-semibold">{usuario.nombre}</span><span className="block max-w-[11rem] truncate text-[11px] text-concreto-600">{rolesTexto}</span></span>
        </button>
        {menu && (
          <div className="tarjeta absolute right-0 top-full z-50 mt-2 w-72 p-3">
            <p className="font-semibold">{usuario.nombre}</p>
            <p className="mb-2 text-xs text-concreto-600">{usuario.correo}</p>
            <ChipsRoles roles={usuario.roles} />
            <div className="mt-3 space-y-1 border-t border-concreto-300 pt-2">
              <button className="btn-fantasma w-full !justify-start" onClick={() => { setMenu(false); setCambiar(true); }}><UserCog size={16} /> Cambiar de usuario de demostración</button>
              <button className="btn-fantasma w-full !justify-start" onClick={() => { setMenu(false); window.dispatchEvent(new Event(EVENTO_TOUR)); }}><Compass size={16} /> Ver recorrido de bienvenida</button>
              <button className="btn-fantasma w-full !justify-start" onClick={() => { setMenu(false); setReiniciar(true); }}><RefreshCw size={16} /> Reiniciar datos de demostración</button>
              <button className="btn-fantasma w-full !justify-start" onClick={() => { estado.cerrarSesion(); navigate('/login'); }}><LogOut size={16} /> Cerrar sesión</button>
            </div>
          </div>
        )}
      </div>

      <Modal abierto={cambiar} titulo="Cambiar de usuario de demostración" onCerrar={() => setCambiar(false)} ancho="max-w-lg">
        <p className="mb-3 text-xs text-concreto-600">La campana y los pendientes se recalculan para el usuario elegido.</p>
        <ul className="space-y-1.5">
          {estado.usuarios.filter((u) => u.activo).map((u) => (
            <li key={u.id}>
              <button onClick={() => { estado.cambiarUsuario(u.id); estado.mostrarToast(`Ahora eres ${u.nombre}`, 'info'); setCambiar(false); navigate('/'); }}
                className={`flex w-full items-center gap-3 rounded-md border p-2 text-left hover:border-marca-vino ${u.id === usuario.id ? 'border-marca-vino bg-marca-amarillo-suave/40' : 'border-concreto-300'}`}>
                <AvatarHex nombre={u.nombre} tam={30} />
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{u.nombre}</span><ChipsRoles roles={u.roles} /></span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
      <ModalConfirmar abierto={reiniciar} titulo="Reiniciar datos de demostración" mensaje="Se borrarán los cambios hechos en esta sesión y se restaurarán los datos iniciales. ¿Deseas continuar?" textoConfirmar="Reiniciar" peligro
        onConfirmar={() => estado.reiniciarDemo()} onCerrar={() => setReiniciar(false)} />
    </header>
    {actual && (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-concreto-300 bg-concreto-100 px-4 py-1.5 text-xs text-concreto-600" aria-label="Ubicación actual">
        <actual.icono size={14} className="text-marca-vino" aria-hidden="true" />
        <span>Estás en:</span>
        <span className="font-semibold text-marca-vino">{actual.grupo}</span>
        <span aria-hidden="true">/</span>
        <span className="font-semibold text-texto" aria-current="page">{actual.etiqueta}</span>
        {actual.pantalla !== 'Extra' && <span className="rounded bg-marca-amarillo-suave px-1.5 py-0.5 font-medium text-marca-vino-oscuro">{actual.pantalla}</span>}
        <span className="ml-auto hidden sm:inline lg:hidden">Sesión: <b className="text-texto">{usuario.nombre}</b> · {rolesTexto}</span>
      </div>
    )}
    </>
  );
}

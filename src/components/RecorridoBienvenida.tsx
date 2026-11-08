import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { ROLES } from '../data/roles';
import { MENU } from '../lib/menu';
import { puedeVerRuta } from '../lib/permisos';
import { useUsuarioActual } from '../store/selectores';
import Modal from './Modal';

const CLAVE_TOUR = 'arteconcreto-tour-v1'; // usuarios que ya vieron o omitieron el recorrido
export const EVENTO_TOUR = 'arteconcreto-abrir-recorrido';

const leerVistos = (): string[] => {
  try { return JSON.parse(localStorage.getItem(CLAVE_TOUR) ?? '[]') as string[]; } catch { return []; }
};
const marcarVisto = (id: string) => {
  try { localStorage.setItem(CLAVE_TOUR, JSON.stringify([...new Set([...leerVistos(), id])])); } catch { /* sin acceso a localStorage */ }
};

const FLUJO = ['Solicitud', 'Aprobación', 'Compra', 'Pago', 'Recepción', 'Fabricación', 'Despacho'];
const TITULOS = ['Qué es Arte Concreto', 'Tu función en el sistema', 'Lo que puedes hacer', 'Cómo se cuida el control'];

// Recorrido de bienvenida: aparece la primera vez que entra cada usuario y se puede omitir en cualquier paso
export default function RecorridoBienvenida() {
  const usuario = useUsuarioActual();
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState(0);

  // Primera vez de este usuario
  useEffect(() => {
    if (usuario && !leerVistos().includes(usuario.id)) { setPaso(0); setAbierto(true); }
  }, [usuario?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reabrir desde el menu de usuario
  useEffect(() => {
    const f = () => { setPaso(0); setAbierto(true); };
    window.addEventListener(EVENTO_TOUR, f);
    return () => window.removeEventListener(EVENTO_TOUR, f);
  }, []);

  const cerrar = useCallback(() => { if (usuario) marcarVisto(usuario.id); setAbierto(false); }, [usuario]);

  if (!usuario || !abierto) return null;
  const roles = ROLES.filter((r) => usuario.roles.includes(r.id));
  const pantallas = MENU.filter((m) => m.grupo !== 'Utilidades' && m.ruta !== '/' && puedeVerRuta(usuario, m.ruta));
  const ultimo = paso === TITULOS.length - 1;

  return (
    <Modal abierto titulo={`Bienvenido, ${usuario.nombre.split(' ')[0]}`} onCerrar={cerrar} ancho="max-w-xl"
      pie={<>
        <button type="button" className="btn-fantasma mr-auto" onClick={cerrar}>Omitir recorrido</button>
        {paso > 0 && <button type="button" className="btn-secundario" onClick={() => setPaso(paso - 1)}>Atrás</button>}
        {ultimo
          ? <button type="button" className="btn-primario" onClick={cerrar}><Check size={16} aria-hidden="true" /> Empezar</button>
          : <button type="button" className="btn-primario" onClick={() => setPaso(paso + 1)}>Siguiente <ArrowRight size={16} aria-hidden="true" /></button>}
      </>}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-concreto-600">Paso {paso + 1} de {TITULOS.length}</p>
      <h3 className="text-lg font-bold">{TITULOS[paso]}</h3>
      <div className="mt-2 flex gap-1.5" aria-hidden="true">
        {TITULOS.map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= paso ? 'bg-marca-amarillo' : 'bg-concreto-300'}`} />)}
      </div>

      <div className="mt-4 min-h-[13rem] text-sm leading-6">
        {paso === 0 && (
          <>
            <p>Esta plataforma controla el material y el producto de la empresa de punta a punta: desde que alguien pide un material hasta que el mueble sale despachado.</p>
            <ol className="mt-4 flex flex-wrap items-center gap-1.5">
              {FLUJO.map((f, i) => (
                <li key={f} className="inline-flex items-center gap-1.5">
                  <span className="rounded-full bg-marca-amarillo-suave px-2.5 py-1 text-xs font-semibold text-marca-vino-oscuro">{f}</span>
                  {i < FLUJO.length - 1 && <ArrowRight size={12} className="text-concreto-600" aria-hidden="true" />}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-concreto-600">Cada persona participa en una parte del proceso, y todo queda registrado para saber quién hizo qué y cuándo.</p>
          </>
        )}
        {paso === 1 && (
          <>
            <p>Entraste como <b>{usuario.nombre}</b>. {roles.length > 1 ? 'Tienes estas funciones:' : 'Tu función es:'}</p>
            <ul className="mt-3 space-y-2">
              {roles.map((r) => (
                <li key={r.id} className="rounded-lg border border-concreto-300 p-3">
                  <span className="font-semibold text-marca-vino">{r.nombre}</span>
                  <span className="mt-0.5 block text-concreto-600">{r.responsabilidad}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {paso === 2 && (
          <>
            <p>Estas son las pantallas de tu menú. Solo ves lo que corresponde a tu función.</p>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <li className="flex items-center gap-2 rounded-lg border border-concreto-300 p-2.5"><span className="font-semibold">Panel general</span><span className="text-xs text-concreto-600">tus pendientes</span></li>
              {pantallas.map((m) => (
                <li key={m.ruta} className="flex items-center gap-2 rounded-lg border border-concreto-300 p-2.5">
                  <m.icono size={16} className="shrink-0 text-marca-vino" aria-hidden="true" /><span className="font-semibold">{m.etiqueta}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {paso === 3 && (
          <>
            <ul className="space-y-2.5">
              <li><b>Nadie aprueba lo que creó.</b> Cada paso importante lo revisa otra persona.</li>
              <li><b>Si un botón está desactivado,</b> pasa el cursor sobre él: te explica el motivo.</li>
              <li><b>La campana</b> te avisa lo que espera tu acción.</li>
              <li><b>Para cambiar de persona</b> o volver a ver este recorrido, abre el menú con tu nombre, arriba a la derecha.</li>
            </ul>
            <p className="mt-4 rounded-lg bg-marca-amarillo-suave/50 p-3 text-xs">Es un prototipo: los datos son ficticios y las conexiones externas están simuladas.</p>
          </>
        )}
      </div>
    </Modal>
  );
}

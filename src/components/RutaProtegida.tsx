import type { ReactNode } from 'react';
import { puedeVerRuta } from '../lib/permisos';
import { useUsuarioActual } from '../store/selectores';
import Prohibido from '../pages/Prohibido';

// Muestra la pagina 403 si el usuario activo no tiene un rol con acceso a la ruta base
export default function RutaProtegida({ base, children }: { base: string; children: ReactNode }) {
  const usuario = useUsuarioActual();
  return puedeVerRuta(usuario, base) ? <>{children}</> : <Prohibido />;
}

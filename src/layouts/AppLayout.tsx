import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import RecorridoBienvenida from '../components/RecorridoBienvenida';
import BandaSimulacion from '../components/BandaSimulacion';
import Sidebar from '../components/Sidebar';
import ToastContenedor from '../components/Toast';
import Topbar from '../components/Topbar';
import { useUsuarioActual } from '../store/selectores';

export default function AppLayout() {
  const usuario = useUsuarioActual();
  const ubicacion = useLocation();
  const [colapsado, setColapsado] = useState(false);
  const [movil, setMovil] = useState(false);
  if (!usuario) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />;
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <BandaSimulacion />
      <div className="flex min-h-0 flex-1">
        <Sidebar colapsado={colapsado} onToggle={() => setColapsado(!colapsado)} movilAbierto={movil} onCerrarMovil={() => setMovil(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setMovil(true)} />
          <main className="relative min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"><Outlet /></main>
        </div>
      </div>
      <RecorridoBienvenida />
      <ToastContenedor />
    </div>
  );
}

import { Outlet } from 'react-router-dom';
import BandaSimulacion from '../components/BandaSimulacion';
import ToastContenedor from '../components/Toast';

export default function AuthLayout() {
  return (
    <div className="flex min-h-full flex-col">
      <BandaSimulacion />
      <div className="relative flex-1 overflow-hidden"><Outlet /></div>
      <ToastContenedor />
    </div>
  );
}

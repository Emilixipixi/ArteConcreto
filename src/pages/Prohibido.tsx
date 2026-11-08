import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Prohibido() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <ShieldAlert size={48} className="mb-3 text-marca-vino" aria-hidden="true" />
      <h1 className="text-xl font-bold">No tienes permiso para ver esta sección</h1>
      <p className="mt-2 text-sm text-concreto-600">Tu usuario no tiene un rol con acceso a esta pantalla. Cambia de usuario de demostración o vuelve al panel.</p>
      <Link to="/" className="btn-primario mt-5">Volver al panel</Link>
    </div>
  );
}

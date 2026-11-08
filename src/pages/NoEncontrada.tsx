import { Link } from 'react-router-dom';
import EstadoVacio from '../components/EstadoVacio';

export default function NoEncontrada() {
  return <EstadoVacio titulo="Página no encontrada" mensaje="La dirección no existe en el prototipo." accion={<Link to="/" className="btn-primario">Ir al panel</Link>} />;
}

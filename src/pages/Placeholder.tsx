import { Link, useLocation } from 'react-router-dom';
import EstadoVacio from '../components/EstadoVacio';
import PageHeader from '../components/PageHeader';

export interface InfoPantalla { codigo: string; titulo: string; fase: number; descripcion: string }

// Esqueleto navegable de pantallas de fases futuras (P-03 a P-18)
export default function Placeholder({ info }: { info: InfoPantalla }) {
  const { pathname, search } = useLocation();
  return (
    <div>
      <PageHeader titulo={info.titulo} migas={[{ texto: 'Inicio', ruta: '/' }, { texto: info.titulo }]} subtitulo={`Pantalla ${info.codigo}`} />
      <div className="tarjeta">
        <EstadoVacio titulo={`Esta pantalla se construye en la fase ${info.fase}`} mensaje={`${info.descripcion} Ruta actual: ${pathname}${search}`}
          accion={<Link to="/" className="btn-secundario">Volver al panel</Link>} />
      </div>
    </div>
  );
}

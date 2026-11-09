import { useNavigate, useParams } from 'react-router-dom';
import NotaReglasPago from '../../components/NotaReglasPago';
import PageHeader from '../../components/PageHeader';
import TabAprobarPagos from './TabAprobarPagos';

// Aprobar pagos: bandeja de solicitudes de pago (mismo esquema que P-07 Aprobacion de compras)
export default function AprobacionPagos() {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader titulo="Aprobar pagos" migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Tesorería', ruta: '/tesoreria' }, { texto: 'Aprobar pagos' }]}
        subtitulo="Anticipos y pagos de lo recibido enviados a aprobación. Se aprueban o se devuelven con observación." />
      <NotaReglasPago />
      <TabAprobarPagos seleccion={id} onSeleccionar={(sid) => navigate(sid ? `/aprobacion-pagos/${sid}` : '/aprobacion-pagos')} />
    </div>
  );
}

import { AlertTriangle, Pencil } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import AdjuntoSimulado from '../../components/AdjuntoSimulado';
import BotonConPermiso from '../../components/BotonConPermiso';
import EstadoBadge from '../../components/EstadoBadge';
import LineaTiempoEstados from '../../components/LineaTiempoEstados';
import PageHeader from '../../components/PageHeader';
import PrioridadChip from '../../components/PrioridadChip';
import TablaLineas from '../../components/TablaLineas';
import { formatearFecha, formatearFechaHora } from '../../lib/formato';
import { tieneAlgunRol } from '../../lib/permisos';
import { useUsuarioActual } from '../../store/selectores';
import BotonesDocumento from '../../components/BotonesDocumento';
import { fichaSolicitud } from '../../lib/documentosDatos';
import { useStore } from '../../store/useStore';

// P-04 Detalle de solicitud (modo lectura)
export default function DetalleSolicitud() {
  const { id } = useParams();
  const navigate = useNavigate();
  const u = useUsuarioActual()!;
  const estado = useStore();
  const s = estado.solicitudes.find((x) => x.id === id);
  if (!s) return <Navigate to="/solicitudes" replace />;
  const veTodas = tieneAlgunRol(u, ['director', 'compras', 'admin']);
  if (!veTodas && s.creadoPor !== u.id) return <Navigate to="/403" replace />;

  const nombre = (uid: string) => estado.usuarios.find((x) => x.id === uid)?.nombre ?? uid;
  const compra = estado.compras.find((c) => c.solicitudId === s.id && c.estado !== 'rechazada');
  const devolucion = s.estado === 'devuelta' ? [...s.historial].reverse().find((h) => h.estadoNuevo === 'devuelta') : undefined;
  const esCreador = s.creadoPor === u.id;

  return (
    <div className="space-y-5">
      <PageHeader titulo={s.numero} migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Solicitudes', ruta: '/solicitudes' }, { texto: s.numero }]}
        acciones={<span className="flex flex-wrap items-center gap-2"><BotonesDocumento ficha={() => fichaSolicitud(estado, s)} />{s.estado === 'borrador' && esCreador ? <button className="btn-secundario" onClick={() => navigate(`/solicitudes/${s.id}/editar`)}><Pencil size={15} /> Editar borrador</button> : null}</span>} />

      {devolucion && (
        <div className="rounded-md border-2 border-aviso/50 bg-aviso/10 p-4" role="note">
          <p className="flex items-center gap-2 font-semibold text-aviso"><AlertTriangle size={18} /> Solicitud devuelta por {nombre(devolucion.usuarioId)} - {formatearFechaHora(devolucion.fecha)}</p>
          <p className="mt-2 text-sm">{devolucion.observacion}</p>
          <div className="mt-3">
            <BotonConPermiso variante="primario" permitido={esCreador} motivo="Solo quien creó la solicitud puede corregirla" onClick={() => navigate(`/solicitudes/${s.id}/editar`)}>Corregir y reenviar</BotonConPermiso>
          </div>
        </div>
      )}

      <section className="tarjeta grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-4">
        <div><p className="etiqueta">Estado</p><EstadoBadge estado={s.estado} /></div>
        <div><p className="etiqueta">Prioridad</p><PrioridadChip prioridad={s.prioridad} /></div>
        <div><p className="etiqueta">Área</p>{s.area || '-'}</div>
        <div><p className="etiqueta">Responsable</p>{nombre(s.creadoPor)}</div>
        <div><p className="etiqueta">Creada</p>{formatearFecha(s.creadoEn)}</div>
        <div><p className="etiqueta">Actualizada</p>{formatearFechaHora(s.actualizadoEn)}</div>
        <div><p className="etiqueta">Fecha requerida</p>{s.fechaRequerida ? formatearFecha(s.fechaRequerida) : '-'}</div>
        {compra && <div><p className="etiqueta">Compra vinculada</p><Link className="font-semibold text-marca-vino underline" to={tieneAlgunRol(u, ['compras', 'admin']) ? `/compras/${compra.id}` : '#'}>{compra.numero}</Link></div>}
        <div className="col-span-2 sm:col-span-4"><p className="etiqueta">Justificación</p>{s.justificacion || <span className="text-concreto-600">Sin justificación</span>}</div>
      </section>

      <section><h2 className="mb-2 text-base font-bold">Ítems</h2><TablaLineas lineas={s.lineas} mostrarStock /></section>
      <section><h2 className="mb-2 text-base font-bold">Adjuntos</h2><AdjuntoSimulado adjuntos={s.adjuntos} soloLectura /></section>
      <section className="tarjeta p-4"><h2 className="mb-3 text-base font-bold">Historial</h2><LineaTiempoEstados historial={s.historial} /></section>
    </div>
  );
}

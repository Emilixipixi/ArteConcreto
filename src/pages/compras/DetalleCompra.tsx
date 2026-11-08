import { Pencil, ShieldCheck } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import BotonConPermiso from '../../components/BotonConPermiso';
import EstadosCompra from '../../components/EstadosCompra';
import LineaTiempoEstados from '../../components/LineaTiempoEstados';
import PageHeader from '../../components/PageHeader';
import ResumenCompra from '../../components/ResumenCompra';
import { ordenCompraDocx } from '../../lib/documentos';
import { datosOrden, fichaRecepcion } from '../../lib/documentosDatos';
import { dentroUmbral } from '../../lib/reglas';
import { puede, reglaSegregacion } from '../../lib/permisos';
import { useUsuarioActual } from '../../store/selectores';
import BotonesDocumento from '../../components/BotonesDocumento';
import { useStore } from '../../store/useStore';

// P-06 Detalle de compra: estados independientes, documentos vinculados e historial
export default function DetalleCompra() {
  const { id } = useParams();
  const navigate = useNavigate();
  const u = useUsuarioActual()!;
  const estado = useStore();
  const c = estado.compras.find((x) => x.id === id);
  if (!c) return <Navigate to="/compras" replace />;
  const sol = estado.solicitudes.find((s) => s.id === c.solicitudId);
  const pagos = estado.solicitudesPago.filter((p) => p.compraId === c.id);
  const recs = estado.recepciones.filter((r) => r.compraId === c.id);
  const regla = reglaSegregacion(u, c, 'compra.aprobar', { parametros: estado.parametros });
  const dentro = dentroUmbral(c.total, estado.parametros);
  const devolucion = c.estado === 'devuelta' ? [...c.historial].reverse().find((h) => h.estadoNuevo === 'devuelta') : undefined;
  const editable = puede(u, 'compra.crear') && ['borrador', 'devuelta'].includes(c.estado);

  return (
    <div className="space-y-5">
      <PageHeader titulo={c.numero} migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Gestión de compras', ruta: '/compras' }, { texto: c.numero }]}
        acciones={<span className="flex gap-2"><button className="btn-secundario" onClick={() => ordenCompraDocx(datosOrden(estado, c))}>Descargar orden (Word)</button>{editable ? <button className="btn-primario" onClick={() => navigate(`/compras/${c.id}/editar`)}><Pencil size={15} /> {c.ordenGenerada ? 'Revisar y enviar' : 'Editar compra'}</button> : null}</span>} />
      <section className="tarjeta p-4"><EstadosCompra compra={c} /></section>

      {c.estado === 'pendiente_aprobacion' && (
        <section className="rounded-md border border-marca-amarillo bg-marca-amarillo-suave/40 p-4" aria-label="Aprobación pendiente">
          <p className="flex items-center gap-2 font-semibold text-marca-vino-oscuro"><ShieldCheck size={18} /> Esperando aprobación</p>
          <p className="mt-1 text-sm">{dentro ? 'Dentro del umbral: la aprueba el Director de solicitudes.' : 'Supera el umbral: requiere aprobación de Gerencia (Aprobador de compra).'} Hasta entonces no se puede pagar ni recibir.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <BotonConPermiso variante="primario" permitido={regla.permitido} motivo={regla.motivo} onClick={() => navigate(`/aprobacion-compras/${c.id}`)}>Aprobar</BotonConPermiso>
            {c.creadoPor === u.id && <span className="text-xs text-concreto-600">Quien genera la orden no puede aprobarla (segregación de funciones).</span>}
          </div>
        </section>
      )}
      {c.estado === 'aprobada' && <p className="rounded-md border border-ok/30 bg-ok/10 p-3 text-sm text-ok">Orden aprobada: lista para {c.modalidadPago === 'anticipo' ? 'solicitud de anticipo (Tesorería) y luego recepción' : 'recepción en bodega'}.</p>}
      {devolucion && <div className="rounded-md border-2 border-aviso/50 bg-aviso/10 p-3 text-sm" role="note"><p className="font-semibold text-aviso">Orden devuelta</p><p>{devolucion.observacion}</p></div>}

      <ResumenCompra compra={c} />

      <section className="tarjeta p-4 text-sm"><h2 className="mb-2 text-base font-bold">Documentos vinculados</h2>
        <ul className="space-y-1">
          {sol && <li>Solicitud: <Link className="font-semibold text-marca-vino underline" to={`/solicitudes/${sol.id}`}>{sol.numero}</Link></li>}
          {pagos.map((p) => <li key={p.id}>Solicitud de pago: <Link className="font-semibold text-marca-vino underline" to={`/tesoreria/${p.id}`}>{p.numero}</Link> ({p.tipo})</li>)}
          {recs.map((r) => <li key={r.id}>Recepción: <Link className="font-semibold text-marca-vino underline" to={`/recepcion/${r.id}`}>{r.numero}</Link> <BotonesDocumento ficha={() => fichaRecepcion(estado, r)} /></li>)}
          {!sol && pagos.length === 0 && recs.length === 0 && <li className="text-concreto-600">Sin documentos vinculados todavía</li>}
        </ul>
      </section>
      <section className="tarjeta p-4"><h2 className="mb-3 text-base font-bold">Historial</h2><LineaTiempoEstados historial={c.historial} /></section>
    </div>
  );
}

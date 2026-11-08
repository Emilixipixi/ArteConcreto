import { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import BotonConPermiso from '../../components/BotonConPermiso';
import DataTable, { type Columna } from '../../components/DataTable';
import EstadoBadge from '../../components/EstadoBadge';
import FiltrosBar from '../../components/FiltrosBar';
import PageHeader from '../../components/PageHeader';
import { formatearFecha } from '../../lib/formato';
import { reglaSegregacion } from '../../lib/permisos';
import { formatearCantidad } from '../../lib/unidades';
import { useUsuarioActual } from '../../store/selectores';
import { pendientesDeRecibir, type RecepcionPendiente } from '../../store/selectoresFase3';
import { useStore } from '../../store/useStore';

// P-09 Recepcion de almacen: bandeja de ordenes aprobadas o parcialmente recibidas (RF-24)
export default function BandejaRecepcion() {
  const e = useStore();
  const u = useUsuarioActual()!;
  const navigate = useNavigate();
  const [proveedor, setProveedor] = useState('todos');
  const [estado, setEstado] = useState('todos');
  const [bodega, setBodega] = useState('todas');
  const filas = useMemo(() => pendientesDeRecibir(e).filter((r) =>
    (proveedor === 'todos' || r.compra.proveedorId === proveedor) && (estado === 'todos' || r.compra.estado === estado) &&
    (bodega === 'todas' || (r.compra.lugarEntregaBodegaId ?? 'b1') === bodega) && (e.bodegaActivaId === 'todas' || (r.compra.lugarEntregaBodegaId ?? 'b1') === e.bodegaActivaId),
  ), [e, proveedor, estado, bodega]);

  const columnas: Columna<RecepcionPendiente>[] = [
    { clave: 'oc', titulo: 'OC', ordenable: true, valor: (r) => r.compra.numero, render: (r) => <Link className="font-semibold text-marca-vino underline" to={`/recepcion/${r.compra.id}`}>{r.compra.numero}</Link> },
    { clave: 'prov', titulo: 'Proveedor', ordenable: true, valor: (r) => e.proveedores.find((p) => p.id === r.compra.proveedorId)?.nombre ?? '', render: (r) => e.proveedores.find((p) => p.id === r.compra.proveedorId)?.nombre ?? '-' },
    { clave: 'fecha', titulo: 'Fecha estimada', ordenable: true, valor: (r) => r.compra.fechaEstimadaEntrega, render: (r) => formatearFecha(r.compra.fechaEstimadaEntrega) },
    { clave: 'pend', titulo: 'Pendiente de recibir', render: (r) => <ul className="text-xs">{r.lineas.filter((l) => l.pendiente > 0).map((l) => <li key={l.sku} className="tabular-nums">{l.sku}: {formatearCantidad(l.pendiente, l.unidadId)}</li>)}</ul> },
    { clave: 'atraso', titulo: 'Atraso', ordenable: true, valor: (r) => r.diasAtraso, render: (r) => r.diasAtraso === 0 ? <span className="text-concreto-600">En plazo</span> : <span className={`font-semibold ${r.vencida ? 'text-error' : 'text-aviso'}`}>{r.diasAtraso} {r.diasAtraso === 1 ? 'día' : 'días'}{r.vencida ? ' - vencida' : ''}</span> },
    { clave: 'estado', titulo: 'Estado', render: (r) => <span className="inline-flex flex-wrap gap-1"><EstadoBadge estado={r.compra.estado} /><EstadoBadge estado={r.compra.estadoPago} /></span> },
    {
      clave: 'acc', titulo: 'Acciones', render: (r) => {
        const regla = reglaSegregacion(u, r.compra, 'recepcion.confirmar', { parametros: e.parametros, solicitudesPago: e.solicitudesPago, pagos: e.pagos });
        const permitido = regla.permitido && !r.bloqueadaPorAnticipo;
        const motivo = r.bloqueadaPorAnticipo ? 'El anticipo debe estar pagado antes de recibir' : regla.motivo;
        return <BotonConPermiso variante="primario" className="!py-1 text-xs" permitido={permitido} motivo={motivo} onClick={() => navigate(`/recepcion/${r.compra.id}`)}>Recibir</BotonConPermiso>;
      },
    },
  ];
  const opcionesProv = [{ valor: 'todos', texto: 'Todos' }, ...e.proveedores.map((p) => ({ valor: p.id, texto: p.nombre }))];
  return (
    <div>
      <PageHeader titulo="Recepción de almacén" migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Recepción de almacén' }]} subtitulo="Solo la confirmación de la recepción aumenta el stock, y únicamente por lo recibido." />
      <FiltrosBar onLimpiar={() => { setProveedor('todos'); setEstado('todos'); setBodega('todas'); }} filtros={[
        { clave: 'prov', etiqueta: 'Proveedor', valor: proveedor, opciones: opcionesProv, onChange: setProveedor },
        { clave: 'est', etiqueta: 'Estado', valor: estado, opciones: [{ valor: 'todos', texto: 'Todos' }, { valor: 'aprobada', texto: 'Aprobada' }, { valor: 'recibida_parcial', texto: 'Recibida parcial' }], onChange: setEstado },
        { clave: 'bod', etiqueta: 'Bodega', valor: bodega, opciones: [{ valor: 'todas', texto: 'Todas' }, ...e.bodegas.map((b) => ({ valor: b.id, texto: b.nombre }))], onChange: setBodega },
      ]} />
      {filas.some((r) => r.bloqueadaPorAnticipo) && <p className="mb-3 flex items-center gap-2 text-xs text-concreto-600"><Lock size={13} aria-hidden="true" /> Las órdenes con anticipo se pueden recibir solo después de que Tesorería pague el anticipo.</p>}
      <DataTable columnas={columnas} filas={filas} clave={(r) => r.compra.id} vacioTitulo="No hay órdenes por recibir" vacioMensaje="Las órdenes aprobadas aparecerán aquí hasta que se reciban." onFila={(r) => navigate(`/recepcion/${r.compra.id}`)} />
    </div>
  );
}

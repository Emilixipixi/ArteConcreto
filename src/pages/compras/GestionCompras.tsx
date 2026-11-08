import { useMemo, useState } from 'react';
import { Eye, FilePlus2, Pencil, ShoppingCart } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BotonConPermiso from '../../components/BotonConPermiso';
import DataTable from '../../components/DataTable';
import EstadoBadge from '../../components/EstadoBadge';
import EstadoVacio from '../../components/EstadoVacio';
import FiltrosBar from '../../components/FiltrosBar';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import PrioridadChip from '../../components/PrioridadChip';
import { diasDesde, formatearFecha, formatearMoneda } from '../../lib/formato';
import { puede } from '../../lib/permisos';
import { useUsuarioActual } from '../../store/selectores';
import { useStore } from '../../store/useStore';
import type { Compra } from '../../types';

const ESTADOS_COMPRA = ['borrador', 'devuelta', 'pendiente_aprobacion', 'aprobada', 'recibida_parcial', 'recibida', 'cerrada', 'rechazada'];

// P-06 Gestion de compras
export default function GestionCompras() {
  const u = useUsuarioActual()!;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const destacada = params.get('solicitud');
  const estado = useStore();
  const [fEstado, setFEstado] = useState('todos');
  const [fProv, setFProv] = useState('todos');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [adm, setAdm] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [centro, setCentro] = useState('');
  const [errAdm, setErrAdm] = useState('');
  const puedeCrear = puede(u, 'compra.crear');
  const nombreProv = (id: string) => estado.proveedores.find((p) => p.id === id)?.nombre ?? 'Sin elegir';

  // RN-01: las compras nacen de solicitudes aprobadas sin compra vigente
  const sinCompra = estado.solicitudes.filter((s) => s.estado === 'aprobada' && !estado.compras.some((c) => c.solicitudId === s.id && c.estado !== 'rechazada'));
  const filas = useMemo(() => estado.compras.filter((c) => {
    if (fEstado !== 'todos' && c.estado !== fEstado) return false;
    if (fProv !== 'todos' && c.proveedorId !== fProv) return false;
    if (desde && c.creadoEn.slice(0, 10) < desde) return false;
    if (hasta && c.creadoEn.slice(0, 10) > hasta) return false;
    return true;
  }).sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn)), [estado.compras, fEstado, fProv, desde, hasta]);

  const iniciar = (solicitudId: string) => {
    const r = estado.crearCompraDesdeSolicitud(solicitudId);
    if (r.ok) navigate(`/compras/${r.id}/editar`); else estado.mostrarToast(r.error ?? 'No se pudo iniciar la compra', 'error');
  };
  const crearAdm = () => {
    const r = estado.crearCompraAdministrativa({ motivo, centroCosto: centro });
    if (!r.ok) return setErrAdm(r.error ?? 'Datos incompletos');
    setAdm(false); setMotivo(''); setCentro(''); setErrAdm('');
    navigate(`/compras/${r.id}/editar`);
  };

  return (
    <div className="space-y-6">
      <PageHeader titulo="Gestión de compras" migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Gestión de compras' }]}
        acciones={<BotonConPermiso variante="secundario" permitido={puedeCrear} motivo="Tu rol no puede gestionar compras" onClick={() => setAdm(true)}><FilePlus2 size={16} /> Compra administrativa</BotonConPermiso>} />

      <section aria-label="Solicitudes aprobadas sin compra">
        <h2 className="mb-2 text-base font-bold">Solicitudes aprobadas sin compra <span className="chip ml-1">{sinCompra.length}</span></h2>
        {sinCompra.length === 0 ? <div className="tarjeta"><EstadoVacio titulo="Todo gestionado" mensaje="Cuando el director apruebe una solicitud aparecerá aquí para iniciar la compra." /></div> : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sinCompra.map((s) => (
              <article key={s.id} className={`tarjeta p-4 ${destacada === s.id ? 'ring-2 ring-marca-amarillo' : ''}`}>
                <div className="flex items-center justify-between"><span className="font-semibold text-marca-vino">{s.numero}</span><PrioridadChip prioridad={s.prioridad} /></div>
                <p className="mt-1 text-xs text-concreto-600">{s.area} - {s.lineas.length} {s.lineas.length === 1 ? 'ítem' : 'ítems'} - aprobada hace {diasDesde(s.actualizadoEn)} d</p>
                <ul className="mt-2 space-y-0.5 text-sm">{s.lineas.slice(0, 3).map((l) => <li key={l.sku}>{l.sku} - {estado.articulos.find((a) => a.sku === l.sku)?.nombre}: {l.cantidad} {l.unidadId}</li>)}</ul>
                <div className="mt-3"><BotonConPermiso variante="primario" permitido={puedeCrear} motivo="Tu rol no puede gestionar compras" onClick={() => iniciar(s.id)}><ShoppingCart size={15} /> Iniciar compra</BotonConPermiso></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Compras en gestión">
        <h2 className="mb-2 text-base font-bold">Compras en gestión</h2>
        <FiltrosBar onLimpiar={() => { setFEstado('todos'); setFProv('todos'); setDesde(''); setHasta(''); }}
          filtros={[
            { clave: 'estado', etiqueta: 'Estado', valor: fEstado, onChange: setFEstado, opciones: [{ valor: 'todos', texto: 'Todos' }, ...ESTADOS_COMPRA.map((e) => ({ valor: e, texto: e.replace(/_/g, ' ') }))] },
            { clave: 'prov', etiqueta: 'Proveedor', valor: fProv, onChange: setFProv, opciones: [{ valor: 'todos', texto: 'Todos' }, ...estado.proveedores.map((p) => ({ valor: p.id, texto: p.nombre }))] },
          ]}>
          <div><label className="etiqueta" htmlFor="c-desde">Desde</label><input id="c-desde" type="date" className="campo" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
          <div><label className="etiqueta" htmlFor="c-hasta">Hasta</label><input id="c-hasta" type="date" className="campo" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
        </FiltrosBar>
        <DataTable<Compra> filas={filas} clave={(c) => c.id} vacioTitulo="Sin compras con estos filtros"
          columnas={[
            { clave: 'numero', titulo: 'Orden', ordenable: true, render: (c) => <span className="font-semibold text-marca-vino">{c.numero}</span> },
            { clave: 'origen', titulo: 'Origen', render: (c) => (c.origen === 'solicitud' ? estado.solicitudes.find((s) => s.id === c.solicitudId)?.numero ?? 'Solicitud' : 'Administrativa'), className: 'hidden md:table-cell' },
            { clave: 'proveedorId', titulo: 'Proveedor', render: (c) => nombreProv(c.proveedorId), valor: (c) => nombreProv(c.proveedorId), ordenable: true, className: 'hidden lg:table-cell' },
            { clave: 'total', titulo: 'Total', render: (c) => formatearMoneda(c.total), valor: (c) => c.total, alinear: 'der', ordenable: true },
            { clave: 'estado', titulo: 'Estado', render: (c) => <EstadoBadge estado={c.estado} /> },
            { clave: 'creadoEn', titulo: 'Fecha', render: (c) => formatearFecha(c.creadoEn), valor: (c) => c.creadoEn, ordenable: true, className: 'hidden md:table-cell' },
            { clave: 'acc', titulo: 'Acciones', render: (c) => (
              <span className="flex gap-1">
                <button className="btn-fantasma !px-2 !py-1" aria-label={`Ver ${c.numero}`} title="Ver" onClick={() => navigate(`/compras/${c.id}`)}><Eye size={15} /></button>
                {puedeCrear && ['borrador', 'devuelta'].includes(c.estado) && <button className="btn-fantasma !px-2 !py-1" aria-label={`Editar ${c.numero}`} title="Editar" onClick={() => navigate(`/compras/${c.id}/editar`)}><Pencil size={15} /></button>}
              </span>) },
          ]} />
      </section>

      <Modal abierto={adm} titulo="Compra administrativa" onCerrar={() => setAdm(false)}
        pie={<><button className="btn-fantasma" onClick={() => setAdm(false)}>Cancelar</button><button className="btn-primario" onClick={crearAdm}>Crear compra</button></>}>
        <p className="mb-3 text-sm text-concreto-600">Compra sin solicitud de materiales. Exige un motivo y un centro de costo (simulado) para quedar identificada.</p>
        <label className="etiqueta" htmlFor="adm-motivo">Motivo</label>
        <textarea id="adm-motivo" className="campo mb-3" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        <label className="etiqueta" htmlFor="adm-cc">Centro de costo (simulado)</label>
        <select id="adm-cc" className="campo" value={centro} onChange={(e) => setCentro(e.target.value)}>
          <option value="">Selecciona...</option><option>CC-100 Planta</option><option>CC-200 Mantenimiento</option><option>CC-300 Administración</option>
        </select>
        {errAdm && <p className="mt-2 text-xs text-error">{errAdm}</p>}
      </Modal>
    </div>
  );
}

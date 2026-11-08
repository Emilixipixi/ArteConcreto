import { useState } from 'react';
import { Printer } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import BotonConPermiso from '../../components/BotonConPermiso';
import EstadoBadge from '../../components/EstadoBadge';
import EstadoVacio from '../../components/EstadoVacio';
import InsigniaSimulado from '../../components/InsigniaSimulado';
import LineaTiempoEstados from '../../components/LineaTiempoEstados';
import Modal from '../../components/Modal';
import ModalConfirmar from '../../components/ModalConfirmar';
import ModalObservacion from '../../components/ModalObservacion';
import PageHeader from '../../components/PageHeader';
import TablaMovimientosDoc from '../../components/TablaMovimientosDoc';
import { formatearFecha, formatearFechaHora } from '../../lib/formato';
import { puede } from '../../lib/permisos';
import { useUsuarioActual } from '../../store/selectores';
import { disponibleTerminado } from '../../store/selectoresFase4';
import { useStore } from '../../store/useStore';
import BotonesDocumento from '../../components/BotonesDocumento';
import { fichaDespacho } from '../../lib/documentosDatos';
import { CANALES } from './ListadoDespachos';

// P-14 Detalle de salida: confirmar salida fisica (una sola vez), anular, marcar descargado y remision simulada
export default function DetalleDespacho() {
  const { id } = useParams();
  const e = useStore();
  const u = useUsuarioActual()!;
  const [modal, setModal] = useState<null | 'salida' | 'anular' | 'descargar' | 'remision'>(null);
  const d = e.despachos.find((x) => x.id === id);
  if (!d) return <EstadoVacio titulo="Salida no encontrada" accion={<Link className="btn-primario" to="/ventas">Volver al listado</Link>} />;
  const art = (s: string) => e.articulos.find((a) => a.sku === s);
  const nombre = (uid: string) => e.usuarios.find((x) => x.id === uid)?.nombre ?? uid;
  const bod = e.bodegas.find((b) => b.id === d.bodegaId)?.nombre ?? d.bodegaId;
  const res = (r: { ok: boolean; error?: string }) => { if (!r.ok) e.mostrarToast(r.error ?? 'No se pudo completar', 'error'); };
  const movs = e.movimientos.filter((m) => m.documentoTipo === 'Despacho' && m.documentoId === d.id);
  const soloLectura = d.canal === 'tienda_en_linea';
  // Mientras esta pendiente de salida, sus unidades estan comprometidas (no se vuelven a descontar de lo disponible)
  const excede = d.estado === 'pendiente_salida' && d.lineas.some((l) => disponibleTerminado(e, l.sku, d.bodegaId).fisica < l.cantidad);
  const total = d.lineas.reduce((a, l) => a + l.cantidad, 0);

  return (
    <div>
      <PageHeader titulo={`Salida ${d.numero}`} migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Ventas y despachos', ruta: '/ventas' }, { texto: d.numero }]} subtitulo={`${CANALES[d.canal]} - ${d.cliente}`}
        acciones={<span className="flex flex-wrap items-center gap-2"><EstadoBadge estado={d.estado} /><EstadoBadge estado={d.estadoAdministrativo} /><BotonesDocumento ficha={() => fichaDespacho(e, d)} />{soloLectura && <InsigniaSimulado />}
          {d.estado === 'borrador' && !soloLectura && <Link className="btn-secundario" to={`/ventas/${d.id}/editar`}>Editar</Link>}
          {d.estado === 'borrador' && !soloLectura && <BotonConPermiso variante="primario" permitido={puede(u, 'despacho.crear')} motivo="Solo Ventas envía salidas a Almacén" onClick={() => res(e.enviarASalida(d.id))}>Enviar a salida</BotonConPermiso>}
          {d.estado === 'pendiente_salida' && <BotonConPermiso variante="primario" permitido={puede(u, 'salida.confirmar') && !excede} motivo={!puede(u, 'salida.confirmar') ? 'Solo Almacén confirma la salida física' : 'La cantidad supera la existencia física'} onClick={() => setModal('salida')}>Confirmar salida</BotonConPermiso>}
          {d.estado === 'confirmado' && <BotonConPermiso variante="peligro" permitido={puede(u, 'documento.anular')} motivo="Solo el Director autoriza la anulación de una salida" onClick={() => setModal('anular')}>Anular salida</BotonConPermiso>}
          {d.estado === 'confirmado' && d.estadoAdministrativo === 'sin_descargar' && <BotonConPermiso permitido={puede(u, 'despacho.descargar')} motivo="Solo Administración o Ventas marcan la descarga" onClick={() => setModal('descargar')}>Marcar como descargado</BotonConPermiso>}
          {d.estado !== 'borrador' && d.estado !== 'anulado' && <button className="btn-secundario" onClick={() => setModal('remision')}>Ver remisión</button>}</span>} />
      <div className="space-y-4">
        {soloLectura && <p className="rounded-md border border-concreto-300 bg-concreto-100 px-3 py-2 text-sm">Esta salida proviene de la Tienda en línea (integración simulada) y es de solo lectura.</p>}
        {d.estado === 'anulado' && d.motivoAnulacion && <p className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-sm"><span className="font-semibold">Motivo de anulación:</span> {d.motivoAnulacion}</p>}
        <section className="tarjeta grid gap-4 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="etiqueta">Cliente</p>{d.cliente}{d.identificacionCliente && <span className="block text-xs text-concreto-600">{d.identificacionCliente}</span>}</div>
          <div><p className="etiqueta">Destino</p>{d.destino || '-'}</div>
          <div><p className="etiqueta">Bodega de salida</p>{bod}</div>
          <div><p className="etiqueta">Documento de referencia</p>{d.documentoReferencia}</div>
          <div><p className="etiqueta">Proyecto</p>{d.proyecto || '-'}</div>
          <div><p className="etiqueta">Registrada por</p>{nombre(d.creadoPor)}</div>
          <div><p className="etiqueta">Fecha</p>{formatearFecha(d.creadoEn)}</div>
          <div><p className="etiqueta">Reserva</p>{d.reservaId ? e.reservas.find((r) => r.id === d.reservaId)?.numero ?? d.reservaId : '-'}</div>
        </section>
        <section className="tarjeta space-y-2 p-4"><h3 className="text-base font-bold">Productos</h3>
          <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm">
            <thead className="bg-concreto-100 text-xs uppercase text-concreto-600"><tr><th className="px-2 py-2 text-left">Producto</th><th className="px-2 py-2 text-right">Cantidad</th><th className="px-2 py-2 text-right">Disponible en bodega</th></tr></thead>
            <tbody>{d.lineas.map((l) => <tr key={l.sku} className="border-t border-concreto-300"><td className="px-2 py-2 font-semibold"><Link className="text-marca-vino underline" to={`/producto-terminado/${l.sku}`}>{l.sku}</Link><span className="block text-xs font-normal text-concreto-600">{art(l.sku)?.nombre}</span></td><td className="px-2 py-2 text-right tabular-nums">{l.cantidad}</td><td className="px-2 py-2 text-right tabular-nums">{disponibleTerminado(e, l.sku, d.bodegaId).disponible}</td></tr>)}</tbody>
          </table></div></section>
        <section className="tarjeta space-y-2 p-4"><h3 className="text-base font-bold">Movimientos generados</h3><TablaMovimientosDoc movimientos={movs} /></section>
        <section className="tarjeta p-4"><h3 className="mb-2 text-base font-bold">Línea de tiempo</h3><LineaTiempoEstados historial={d.historial} /></section>
      </div>

      <ModalConfirmar abierto={modal === 'salida'} titulo="Confirmar salida física" textoConfirmar="Confirmar salida" onCerrar={() => setModal(null)}
        mensaje={`Se descontarán ${total} unidad(es) de ${bod}. Esta acción se aplica una sola vez y el documento quedará bloqueado.`} onConfirmar={() => { setModal(null); res(e.confirmarSalida(d.id)); }} />
      <ModalObservacion abierto={modal === 'anular'} titulo="Anular salida" etiqueta="Motivo de la anulación (mínimo 10 caracteres)" minimo={10} peligro textoConfirmar="Anular" onCerrar={() => setModal(null)} onConfirmar={(m) => { setModal(null); res(e.anularSalida(d.id, m)); }} />
      <ModalConfirmar abierto={modal === 'descargar'} titulo="Marcar como descargado" textoConfirmar="Marcar" onCerrar={() => setModal(null)}
        mensaje="Solo cambia el estado administrativo; no genera asientos contables." onConfirmar={() => { setModal(null); res(e.marcarDescargado(d.id)); }} />
      <Modal abierto={modal === 'remision'} titulo={`Remisión ${d.numero}`} ancho="max-w-2xl" onCerrar={() => setModal(null)}
        pie={<><button className="btn-fantasma" onClick={() => setModal(null)}>Cerrar</button><button className="btn-primario" onClick={() => { e.mostrarToast('Impresión simulada: no se envió nada a la impresora', 'info'); }}><Printer size={14} /> Imprimir</button></>}>
        <div className="space-y-3 rounded-md border border-concreto-300 bg-white p-4 text-sm text-texto">
          <div className="flex justify-between border-b border-concreto-300 pb-2"><div><p className="text-base font-bold">Arte Concreto</p><p className="text-xs text-concreto-600">Remisión de entrega - documento simulado</p></div><div className="text-right"><p className="font-bold">{d.numero}</p><p className="text-xs">{formatearFechaHora(d.creadoEn)}</p></div></div>
          <div className="grid grid-cols-2 gap-2"><p><span className="font-semibold">Cliente:</span> {d.cliente}</p><p><span className="font-semibold">Identificación:</span> {d.identificacionCliente || '-'}</p><p><span className="font-semibold">Destino:</span> {d.destino || '-'}</p><p><span className="font-semibold">Referencia:</span> {d.documentoReferencia}</p></div>
          <table className="w-full"><thead><tr className="border-b border-concreto-300 text-left text-xs uppercase"><th className="py-1">SKU</th><th>Descripción</th><th className="text-right">Cant.</th></tr></thead><tbody>{d.lineas.map((l) => <tr key={l.sku} className="border-b border-concreto-300"><td className="py-1">{l.sku}</td><td>{art(l.sku)?.nombre}</td><td className="text-right tabular-nums">{l.cantidad}</td></tr>)}</tbody></table>
          <div className="grid grid-cols-2 gap-6 pt-8 text-center text-xs"><div className="border-t border-texto pt-1">Entrega (firma ficticia)</div><div className="border-t border-texto pt-1">Recibe (firma ficticia)</div></div>
        </div>
      </Modal>
    </div>
  );
}

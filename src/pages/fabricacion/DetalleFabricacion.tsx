import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import BotonConPermiso from '../../components/BotonConPermiso';
import EstadoBadge from '../../components/EstadoBadge';
import EstadoVacio from '../../components/EstadoVacio';
import LineaTiempoEstados from '../../components/LineaTiempoEstados';
import ModalConfirmar from '../../components/ModalConfirmar';
import ModalObservacion from '../../components/ModalObservacion';
import PageHeader from '../../components/PageHeader';
import TablaMovimientosDoc from '../../components/TablaMovimientosDoc';
import { evaluarDesviacion, pctDesvio, validarSuficiencia } from '../../lib/fabricacion';
import { formatearFecha } from '../../lib/formato';
import { puede, reglaSegregacion } from '../../lib/permisos';
import { formatearCantidad } from '../../lib/unidades';
import { useUsuarioActual } from '../../store/selectores';
import BotonesDocumento from '../../components/BotonesDocumento';
import { fichaFabricacion } from '../../lib/documentosDatos';
import { useStore } from '../../store/useStore';

// P-11 Detalle de fabricacion: consumo estandar vs real, movimientos, linea de tiempo y trazabilidad del lote
export default function DetalleFabricacion() {
  const { id } = useParams();
  const e = useStore();
  const u = useUsuarioActual()!;
  const [modal, setModal] = useState<null | 'confirmar' | 'anular'>(null);
  const f = e.fabricaciones.find((x) => x.id === id);
  if (!f) return <EstadoVacio titulo="Fabricación no encontrada" accion={<Link className="btn-primario" to="/fabricacion">Volver al listado</Link>} />;
  const art = (s: string) => e.articulos.find((a) => a.sku === s)!;
  const nombre = (uid: string) => e.usuarios.find((x) => x.id === uid)?.nombre ?? uid;
  const bod = (b: string) => e.bodegas.find((x) => x.id === b)?.nombre ?? b;
  const tol = e.parametros.toleranciaConsumo;
  const { requiereDirector } = evaluarDesviacion(f.consumos, tol);
  const faltantes = f.estado === 'borrador' || f.estado === 'pendiente_director' ? validarSuficiencia(e.existencias, f.consumos, f.bodegaOrigenInsumosId) : [];
  const movs = e.movimientos.filter((m) => m.documentoTipo === 'Fabricación' && m.documentoId === f.id);
  const res = (r: { ok: boolean; error?: string }) => { if (!r.ok) e.mostrarToast(r.error ?? 'No se pudo completar', 'error'); };

  const regla = f.estado === 'pendiente_director' ? reglaSegregacion(u, f, 'fabricacion.confirmar_desvio', { parametros: e.parametros, usuarios: e.usuarios }) : { permitido: true, motivo: undefined as string | undefined };
  const rolOk = f.estado === 'pendiente_director' ? puede(u, 'fabricacion.confirmar_desvio') : puede(u, 'fabricacion.registrar');
  const motivoConfirmar = !rolOk ? (f.estado === 'pendiente_director' ? 'Solo el Director confirma una fabricación con desvío de consumo' : 'Solo Producción confirma fabricaciones') : !regla.permitido ? regla.motivo : faltantes.length > 0 ? 'Insumos insuficientes en la bodega de origen' : undefined;
  const textoConfirmar = f.estado === 'borrador' && requiereDirector ? 'Enviar al Director' : 'Confirmar fabricación';

  return (
    <div>
      <PageHeader titulo={`Fabricación ${f.numero}`} migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Fabricación', ruta: '/fabricacion' }, { texto: f.numero }]}
        subtitulo={`Lote ${f.lote} - registrada por ${nombre(f.creadoPor)}`}
        acciones={<span className="flex flex-wrap items-center gap-2"><EstadoBadge estado={f.estado} /><BotonesDocumento ficha={() => fichaFabricacion(e, f)} />
          {f.estado === 'borrador' && <Link className="btn-secundario" to={`/fabricacion/${f.id}/editar`}>Editar</Link>}
          {['borrador', 'pendiente_director'].includes(f.estado) && <BotonConPermiso variante="primario" permitido={rolOk && regla.permitido && faltantes.length === 0} motivo={motivoConfirmar} onClick={() => setModal('confirmar')}>{textoConfirmar}</BotonConPermiso>}
          {f.estado === 'confirmada' && <BotonConPermiso variante="peligro" permitido={puede(u, 'documento.anular')} motivo="Solo el Director anula una fabricación confirmada" onClick={() => setModal('anular')}>Anular fabricación</BotonConPermiso>}
        </span>} />
      <div className="space-y-4">
        {f.estado === 'pendiente_director' && <p className="flex items-start gap-2 rounded-md border border-aviso/40 bg-aviso/10 px-3 py-2 text-sm"><AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> El consumo real se desvía {f.desviacionPct} % del estándar (tolerancia {tol} %). Solo el Director puede confirmarla.</p>}
        {faltantes.length > 0 && (
          <div role="alert" className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-sm">
            <p className="font-semibold text-error">Insumos insuficientes en {bod(f.bodegaOrigenInsumosId)}: la confirmación está bloqueada.</p>
            <ul className="mt-1 list-disc pl-5">{faltantes.map((x) => <li key={x.sku}>{x.sku}: faltan {formatearCantidad(x.faltante, art(x.sku).unidadBaseId)}</li>)}</ul>
            {puede(u, 'solicitud.crear') && <Link className="btn-secundario mt-2 !py-1 text-xs" to={`/solicitudes/nueva?faltantes=${faltantes.map((x) => `${x.sku}:${Math.ceil(x.faltante * 1000) / 1000}`).join(',')}`}>Solicitar materiales</Link>}
          </div>
        )}
        {f.estado === 'anulada' && f.motivoAnulacion && <p className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-sm"><span className="font-semibold">Motivo de anulación:</span> {f.motivoAnulacion}</p>}

        <section className="tarjeta grid gap-4 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="etiqueta">Producto</p><Link className="font-semibold text-marca-vino underline" to={`/producto-terminado?sku=${f.skuProducto}`}>{f.skuProducto}</Link><span className="block text-xs text-concreto-600">{art(f.skuProducto).nombre}</span></div>
          <div><p className="etiqueta">Cantidad</p><span className="text-lg font-bold tabular-nums">{f.cantidadFabricada}</span></div>
          <div><p className="etiqueta">Fecha de fabricación</p>{formatearFecha(f.fechaFabricacion)}</div>
          <div><p className="etiqueta">Lote</p>{f.lote}</div>
          <div><p className="etiqueta">Insumos salen de</p>{bod(f.bodegaOrigenInsumosId)}</div>
          <div><p className="etiqueta">Producto ingresa a</p>{bod(f.bodegaDestinoId)}</div>
          <div><p className="etiqueta">Desvío máximo</p>{f.desviacionPct} %</div>
          <div><p className="etiqueta">Observación</p>{f.observacion || '-'}</div>
        </section>

        <section className="tarjeta space-y-2 p-4">
          <h3 className="text-base font-bold">Consumo estándar vs. real</h3>
          <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
            <thead className="bg-concreto-100 text-xs uppercase text-concreto-600"><tr><th className="px-2 py-2 text-left">Insumo</th><th className="px-2 py-2 text-right">Estándar</th><th className="px-2 py-2 text-right">Real</th><th className="px-2 py-2 text-right">Desvío</th></tr></thead>
            <tbody>{f.consumos.map((c) => { const pct = pctDesvio(c.estandar, c.real); const fuera = c.extra || Math.abs(pct) > tol; const a = art(c.sku); return (
              <tr key={c.sku + (c.extra ? 'x' : '')} className="border-t border-concreto-300">
                <td className="px-2 py-2 font-semibold">{c.sku}<span className="block text-xs font-normal text-concreto-600">{a.nombre}{c.extra ? ` (extra: ${c.justificacion})` : ''}</span></td>
                <td className="px-2 py-2 text-right tabular-nums">{formatearCantidad(c.estandar, a.unidadBaseId)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatearCantidad(c.real, a.unidadBaseId)}</td>
                <td className="px-2 py-2 text-right"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${fuera ? 'border-aviso/30 bg-aviso/10 text-aviso' : 'border-ok/30 bg-ok/10 text-ok'}`}>{c.extra ? 'Extra' : `${pct > 0 ? '+' : ''}${pct} %`}</span></td>
              </tr>); })}</tbody>
          </table></div>
        </section>

        <section className="tarjeta space-y-2 p-4"><h3 className="text-base font-bold">Movimientos generados</h3><TablaMovimientosDoc movimientos={movs} /></section>
        <section className="tarjeta p-4"><h3 className="mb-2 text-base font-bold">Línea de tiempo</h3><LineaTiempoEstados historial={f.historial} /></section>
      </div>

      <ModalConfirmar abierto={modal === 'confirmar'} titulo={textoConfirmar} peligro={false} textoConfirmar={textoConfirmar} onCerrar={() => setModal(null)}
        mensaje={f.estado === 'borrador' && requiereDirector ? `El consumo se desvía más de ${tol} %. Se enviará al Director y el inventario no cambia hasta su confirmación.` : `Se descontarán los insumos de ${bod(f.bodegaOrigenInsumosId)} y se agregarán ${f.cantidadFabricada} unidades de ${f.skuProducto} a ${bod(f.bodegaDestinoId)}.`}
        onConfirmar={() => { setModal(null); res(e.confirmarFabricacion(f.id)); }} />
      <ModalObservacion abierto={modal === 'anular'} titulo="Anular fabricación" etiqueta="Motivo de la anulación (mínimo 10 caracteres)" minimo={10} peligro textoConfirmar="Anular" onCerrar={() => setModal(null)}
        onConfirmar={(m) => { setModal(null); res(e.anularFabricacion(f.id, m)); }} />
    </div>
  );
}

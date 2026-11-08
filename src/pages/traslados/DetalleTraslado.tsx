import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BotonConPermiso from '../../components/BotonConPermiso';
import EstadoBadge from '../../components/EstadoBadge';
import EstadoVacio from '../../components/EstadoVacio';
import FlujoTraslado from '../../components/FlujoTraslado';
import LineaTiempoEstados from '../../components/LineaTiempoEstados';
import ModalConfirmar from '../../components/ModalConfirmar';
import PageHeader from '../../components/PageHeader';
import TablaMovimientosDoc from '../../components/TablaMovimientosDoc';
import { puede, reglaSegregacion } from '../../lib/permisos';
import { useUsuarioActual } from '../../store/selectores';
import { disponibleTerminado, perdidaEnTransito } from '../../store/selectoresFase4';
import BotonesDocumento from '../../components/BotonesDocumento';
import { fichaTraslado } from '../../lib/documentosDatos';
import { useStore } from '../../store/useStore';

// P-13 Detalle de traslado: tres momentos (borrador, en transito, recepcion) con cantidades por linea
export default function DetalleTraslado() {
  const { id } = useParams();
  const e = useStore();
  const u = useUsuarioActual()!;
  const [modal, setModal] = useState<null | 'despachar' | 'cancelar'>(null);
  const [recib, setRecib] = useState<Record<string, string>>({});
  const t = e.traslados.find((x) => x.id === id);
  if (!t) return <EstadoVacio titulo="Traslado no encontrado" accion={<Link className="btn-primario" to="/traslados">Volver al listado</Link>} />;
  const bod = (b: string) => e.bodegas.find((x) => x.id === b)?.nombre ?? b;
  const art = (s: string) => e.articulos.find((a) => a.sku === s);
  const res = (r: { ok: boolean; error?: string }) => { if (!r.ok) e.mostrarToast(r.error ?? 'No se pudo completar', 'error'); };
  const movs = e.movimientos.filter((m) => m.documentoTipo === 'Traslado' && m.documentoId === t.id);
  const perdida = perdidaEnTransito(t);
  const regla = reglaSegregacion(u, t, 'traslado.recibir', { parametros: e.parametros, usuarios: e.usuarios });
  const rolAlm = puede(u, 'traslado.crear');
  const valor = (sku: string, env: number) => recib[sku] ?? String(env);
  const numero = (sku: string, env: number) => { const n = Number(valor(sku, env).replace(',', '.')); return isFinite(n) ? n : NaN; };
  const errRecepcion = t.lineas.some((l) => { const n = numero(l.sku, l.cantidadEnviada); return !isFinite(n) || n < 0 || n > l.cantidadEnviada || !Number.isInteger(n); });
  const hayDif = t.lineas.some((l) => numero(l.sku, l.cantidadEnviada) < l.cantidadEnviada);

  return (
    <div>
      <PageHeader titulo={`Traslado ${t.numero}`} migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Traslados', ruta: '/traslados' }, { texto: t.numero }]} subtitulo={`${bod(t.origenId)} → ${bod(t.destinoId)}`}
        acciones={<span className="flex flex-wrap items-center gap-2"><EstadoBadge estado={t.estado} /><BotonesDocumento ficha={() => fichaTraslado(e, t)} />
          {t.estado === 'borrador' && <BotonConPermiso permitido={rolAlm} motivo="Solo Almacén cancela traslados" onClick={() => setModal('cancelar')}>Cancelar traslado</BotonConPermiso>}
          {t.estado === 'borrador' && <BotonConPermiso variante="primario" permitido={rolAlm} motivo="Solo Almacén despacha traslados" onClick={() => setModal('despachar')}>Despachar</BotonConPermiso>}</span>} />
      <div className="space-y-4">
        <section className="tarjeta p-4"><FlujoTraslado t={t} /></section>
        <section className="tarjeta space-y-3 p-4">
          <h3 className="text-base font-bold">Productos</h3>
          <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-sm">
            <thead className="bg-concreto-100 text-xs uppercase text-concreto-600"><tr><th className="px-2 py-2 text-left">Producto</th><th className="px-2 py-2 text-right">Enviadas</th><th className="px-2 py-2 text-right">Recibidas</th>{t.estado === 'borrador' && <th className="px-2 py-2 text-right">Disp. en origen</th>}</tr></thead>
            <tbody>{t.lineas.map((l) => (
              <tr key={l.sku} className="border-t border-concreto-300">
                <td className="px-2 py-2 font-semibold">{l.sku}<span className="block text-xs font-normal text-concreto-600">{art(l.sku)?.nombre}</span></td>
                <td className="px-2 py-2 text-right tabular-nums">{l.cantidadEnviada}</td>
                <td className="px-2 py-2 text-right">{t.estado === 'en_transito'
                  ? <input aria-label={`Cantidad recibida de ${l.sku}`} inputMode="numeric" className="campo w-24 text-right" value={valor(l.sku, l.cantidadEnviada)} onChange={(ev) => setRecib({ ...recib, [l.sku]: ev.target.value })} />
                  : <span className="tabular-nums">{l.cantidadRecibida ?? '-'}</span>}</td>
                {t.estado === 'borrador' && <td className="px-2 py-2 text-right tabular-nums">{disponibleTerminado(e, l.sku, t.origenId).disponible}</td>}
              </tr>))}</tbody>
          </table></div>
          {t.observacion && <p className="text-sm"><span className="font-semibold">Observación:</span> {t.observacion}</p>}
          {t.estado === 'en_transito' && (
            <div className="space-y-2 border-t border-concreto-300 pt-3">
              {hayDif && !errRecepcion && <p className="rounded-md border border-aviso/40 bg-aviso/10 px-3 py-2 text-sm">Hay diferencias: se registrará como recibido con diferencias y se notificará a Almacén de origen y al Director.</p>}
              {errRecepcion && <p role="alert" className="text-xs text-error">Cada cantidad recibida debe ser un entero entre 0 y lo enviado.</p>}
              <BotonConPermiso variante="primario" permitido={rolAlm && regla.permitido && !errRecepcion} motivo={!rolAlm ? 'Solo Almacén confirma la recepción' : !regla.permitido ? regla.motivo : 'Revisa las cantidades recibidas'}
                onClick={() => res(e.recibirTraslado(t.id, Object.fromEntries(t.lineas.map((l) => [l.sku, numero(l.sku, l.cantidadEnviada)]))))}>Confirmar recepción</BotonConPermiso>
            </div>)}
        </section>
        {perdida.length > 0 && (
          <section className="rounded-md border border-error/30 bg-error/5 p-4 text-sm" aria-label="Pérdida en tránsito">
            <h3 className="font-bold text-error">Pérdida en tránsito pendiente de ajuste autorizado</h3>
            <ul className="mt-1 list-disc pl-5">{perdida.map((p) => <li key={p.sku}>{p.sku}: {p.cantidad} unidad(es) no llegaron al destino.</li>)}</ul>
            <p className="mt-2 text-xs text-concreto-600">El inventario ya refleja la pérdida (esas unidades no ingresaron a ninguna bodega). El Director debe autorizar su regularización contable.</p>
          </section>)}
        <section className="tarjeta space-y-2 p-4"><h3 className="text-base font-bold">Movimientos generados</h3><TablaMovimientosDoc movimientos={movs} /></section>
        <section className="tarjeta p-4"><h3 className="mb-2 text-base font-bold">Línea de tiempo</h3><LineaTiempoEstados historial={t.historial} /></section>
      </div>
      <ModalConfirmar abierto={modal === 'despachar'} titulo="Despachar traslado" textoConfirmar="Despachar" onCerrar={() => setModal(null)}
        mensaje={`Las unidades salen de ${bod(t.origenId)} y quedan en tránsito: no estarán disponibles en ninguna bodega hasta la recepción.`} onConfirmar={() => { setModal(null); res(e.despacharTraslado(t.id)); }} />
      <ModalConfirmar abierto={modal === 'cancelar'} titulo="Cancelar traslado" textoConfirmar="Cancelar traslado" peligro onCerrar={() => setModal(null)}
        mensaje="El borrador se cancela y no afecta el inventario." onConfirmar={() => { setModal(null); res(e.cancelarTraslado(t.id)); }} />
    </div>
  );
}

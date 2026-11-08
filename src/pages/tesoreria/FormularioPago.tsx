import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import BotonConPermiso from '../../components/BotonConPermiso';
import EstadoVacio from '../../components/EstadoVacio';
import ModalConfirmar from '../../components/ModalConfirmar';
import NotaReglasPago from '../../components/NotaReglasPago';
import PageHeader from '../../components/PageHeader';
import ResumenPagosCompra from '../../components/ResumenPagosCompra';
import { formatearMoneda } from '../../lib/formato';
import { puede } from '../../lib/permisos';
import { formatearCantidad } from '../../lib/unidades';
import { useUsuarioActual } from '../../store/selectores';
import { anticipoPagado, comprasPorPreparar, maximoSolicitable, pagadoCompra, recibidoPorSku, saldoPorPagar, valorRecibido } from '../../store/selectoresFase3';
import { useStore } from '../../store/useStore';

// Formulario de solicitud de pago o anticipo (RF-18)
export default function FormularioPago() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const u = useUsuarioActual()!;
  const e = useStore();
  const compra = e.compras.find((c) => c.id === params.get('compra'));
  const sugerencia = useMemo(() => comprasPorPreparar(e).find((p) => p.compra.id === compra?.id), [e, compra?.id]);
  const [importeTxt, setImporteTxt] = useState<string | null>(null);
  const [observacion, setObservacion] = useState('');
  const [confirmar, setConfirmar] = useState(false);

  if (!compra) return <EstadoVacio titulo="Orden no encontrada" mensaje="Abre esta pantalla desde la bandeja de Tesorería." accion={<Link className="btn-primario" to="/tesoreria">Volver a Tesorería</Link>} />;

  // Tipo determinado por la modalidad; pago_final cubre lo recibido (total o parcial)
  const tipo: 'anticipo' | 'pago_final' = sugerencia?.tipo ?? (compra.modalidadPago === 'anticipo' && !anticipoPagado(e, compra.id) ? 'anticipo' : 'pago_final');
  const max = maximoSolicitable(e, compra.id, tipo);
  const sugerido = sugerencia?.importeSugerido ?? max;
  const importe = importeTxt === null ? sugerido : parseFloat(importeTxt.replace(',', '.'));
  const errImporte = !isFinite(importe) || importe <= 0 ? 'El importe debe ser mayor que cero' : importe - max > 0.005 ? `No puede superar el saldo disponible (${formatearMoneda(max)})` : null;
  const prov = e.proveedores.find((p) => p.id === compra.proveedorId);
  const recibido = recibidoPorSku(e, compra.id);
  const factor = 1 + e.parametros.impuestoInformativoPct / 100;
  const subtotalRecibido = compra.lineas.reduce((a, l) => a + (recibido[l.sku] ?? 0) * l.precioUnitario, 0);
  const parcial = compra.estadoRecepcion === 'parcial';

  const guardar = (enviar: boolean) => {
    const r = e.crearSolicitudPago(compra.id, tipo, importe, observacion);
    if (!r.ok) return e.mostrarToast(r.error ?? 'No se pudo guardar', 'error');
    if (enviar) {
      const r2 = e.enviarSolicitudPago(r.id!);
      if (!r2.ok) e.mostrarToast(r2.error ?? 'No se pudo enviar', 'error');
    }
    navigate(`/tesoreria/${r.id}`);
  };

  const permiso = puede(u, 'pago.preparar');
  return (
    <div>
      <PageHeader titulo={tipo === 'anticipo' ? 'Solicitud de anticipo' : 'Solicitud de pago'} migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Tesorería', ruta: '/tesoreria' }, { texto: `Preparar - ${compra.numero}` }]} />
      <NotaReglasPago />
      <div className="space-y-4">
        <ResumenPagosCompra compraId={compra.id} />
        <section className="tarjeta space-y-4 p-4">
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <div><p className="etiqueta">Proveedor</p>{prov?.nombre ?? '-'}</div>
            <div><p className="etiqueta">Tipo</p>{tipo === 'anticipo' ? 'Anticipo' : parcial ? 'Pago parcial de lo recibido' : 'Pago final de lo recibido'}</div>
            <div><p className="etiqueta">Medio de pago sugerido</p>Transferencia bancaria</div>
          </div>

          {tipo === 'pago_final' && (
            <div>
              <p className="etiqueta">Cálculo sobre lo efectivamente recibido (no sobre lo ordenado)</p>
              <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-sm">
                <thead className="bg-concreto-100 text-xs text-concreto-600"><tr><th className="px-2 py-1 text-left">SKU</th><th className="px-2 py-1 text-right">Ordenado</th><th className="px-2 py-1 text-right">Recibido</th><th className="px-2 py-1 text-right">Precio</th><th className="px-2 py-1 text-right">Valor recibido</th></tr></thead>
                <tbody>{compra.lineas.map((l) => (
                  <tr key={l.sku} className="border-t border-concreto-300">
                    <td className="px-2 py-1">{l.sku}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{formatearCantidad(l.cantidad, l.unidadId)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{formatearCantidad(recibido[l.sku] ?? 0, l.unidadId)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{formatearMoneda(l.precioUnitario)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{formatearMoneda((recibido[l.sku] ?? 0) * l.precioUnitario)}</td>
                  </tr>))}</tbody>
              </table></div>
              <dl className="mt-2 ml-auto max-w-xs space-y-0.5 text-sm">
                <div className="flex justify-between"><dt>Subtotal recibido</dt><dd className="tabular-nums">{formatearMoneda(subtotalRecibido)}</dd></div>
                <div className="flex justify-between"><dt>Impuesto informativo ({e.parametros.impuestoInformativoPct} %)</dt><dd className="tabular-nums">{formatearMoneda(subtotalRecibido * (factor - 1))}</dd></div>
                <div className="flex justify-between font-semibold"><dt>Valor recibido</dt><dd className="tabular-nums">{formatearMoneda(valorRecibido(e, compra.id))}</dd></div>
                <div className="flex justify-between"><dt>Menos: ya pagado</dt><dd className="tabular-nums">- {formatearMoneda(pagadoCompra(e, compra.id))}</dd></div>
                <div className="flex justify-between border-t border-concreto-300 pt-0.5 font-bold"><dt>Saldo por pagar</dt><dd className="tabular-nums">{formatearMoneda(saldoPorPagar(e, compra.id))}</dd></div>
              </dl>
            </div>
          )}
          {tipo === 'anticipo' && <p className="text-sm text-concreto-600">Anticipo sugerido: {compra.porcentajeAnticipo ?? 0} % de {formatearMoneda(compra.total)} = <strong className="text-texto">{formatearMoneda(sugerido)}</strong>.</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="etiqueta" htmlFor="pg-importe">Importe a solicitar (USD)</label>
              <input id="pg-importe" inputMode="decimal" className={`campo ${errImporte ? 'border-error' : ''}`} value={importeTxt ?? sugerido.toFixed(2)} onChange={(ev) => setImporteTxt(ev.target.value)} />
              {errImporte ? <p className="mt-1 text-xs text-error">{errImporte}</p> : <p className="mt-1 text-xs text-concreto-600">Máximo disponible: {formatearMoneda(max)}</p>}
            </div>
            <div>
              <label className="etiqueta" htmlFor="pg-obs">Observación (opcional)</label>
              <textarea id="pg-obs" className="campo min-h-[72px]" value={observacion} onChange={(ev) => setObservacion(ev.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-concreto-300 pt-3">
            <Link className="btn-fantasma" to="/tesoreria">Cancelar</Link>
            <BotonConPermiso variante="secundario" permitido={permiso} motivo="Solo Tesorería prepara solicitudes de pago" deshabilitado={!!errImporte} onClick={() => guardar(false)}>Guardar</BotonConPermiso>
            <BotonConPermiso variante="primario" permitido={permiso} motivo="Solo Tesorería prepara solicitudes de pago" deshabilitado={!!errImporte} onClick={() => setConfirmar(true)}>Enviar a aprobación</BotonConPermiso>
          </div>
        </section>
      </div>
      <ModalConfirmar abierto={confirmar} titulo="Enviar a aprobación" mensaje={`Se enviará una solicitud por ${formatearMoneda(importe)} a aprobación.`} textoConfirmar="Enviar" onCerrar={() => setConfirmar(false)} onConfirmar={() => guardar(true)} />
    </div>
  );
}

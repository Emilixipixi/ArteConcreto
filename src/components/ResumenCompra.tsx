import { Link } from 'react-router-dom';
import type { Compra } from '../types';
import { useStore } from '../store/useStore';
import { formatearFecha, formatearMoneda } from '../lib/formato';
import { importesAnticipo } from '../lib/reglas';
import ComparativoCotizaciones from './ComparativoCotizaciones';
import TablaLineas from './TablaLineas';

// Items, comparativo, condiciones y totales de una compra (solo lectura). Lo usan P-06 (detalle) y P-07.
export default function ResumenCompra({ compra }: { compra: Compra }) {
  const estado = useStore();
  const prov = estado.proveedores.find((p) => p.id === compra.proveedorId);
  const bodega = estado.bodegas.find((b) => b.id === compra.lugarEntregaBodegaId);
  const { anticipo, saldo } = importesAnticipo(compra.total, compra.porcentajeAnticipo ?? 0);
  return (
    <div className="space-y-4">
      <section className="tarjeta grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-4">
        <div><p className="etiqueta">Origen</p>{compra.origen === 'solicitud' ? (compra.solicitudId ? <span>Solicitud <Link className="font-semibold text-marca-vino underline" to={`/solicitudes/${compra.solicitudId}`}>{estado.solicitudes.find((s) => s.id === compra.solicitudId)?.numero}</Link></span> : 'Solicitud') : 'Administrativa'}</div>
        <div><p className="etiqueta">Proveedor</p>{prov?.nombre ?? <span className="text-concreto-600">Sin elegir</span>}</div>
        <div><p className="etiqueta">Entrega estimada</p>{formatearFecha(compra.fechaEstimadaEntrega)}</div>
        <div><p className="etiqueta">Lugar de entrega</p>{bodega?.nombre ?? '-'}</div>
        <div><p className="etiqueta">Modalidad de pago</p>{compra.modalidadPago === 'anticipo' ? `Anticipo ${compra.porcentajeAnticipo ?? 0} %` : 'Pago posterior'}</div>
        <div className="col-span-2"><p className="etiqueta">Condiciones</p>{compra.condiciones || '-'}</div>
        {compra.origen === 'administrativa' && <div className="col-span-2 sm:col-span-4"><p className="etiqueta">Motivo / centro de costo</p>{compra.motivoAdministrativo} - {compra.centroCosto}</div>}
        {compra.observaciones && <div className="col-span-2 sm:col-span-4"><p className="etiqueta">Observaciones</p>{compra.observaciones}</div>}
        {compra.justificacionCantidad && <div className="col-span-2 sm:col-span-4"><p className="etiqueta">Justificación de cantidad</p>{compra.justificacionCantidad}</div>}
      </section>
      <section><h3 className="mb-2 text-base font-bold">Ítems</h3><TablaLineas lineas={compra.lineas} mostrarPrecios /></section>
      <section><h3 className="mb-2 text-base font-bold">Comparativo de cotizaciones</h3><ComparativoCotizaciones compra={compra} /></section>
      <section className="tarjeta ml-auto max-w-sm p-4 text-sm">
        <div className="flex justify-between"><span className="text-concreto-600">Subtotal</span><span className="tabular-nums">{formatearMoneda(compra.subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-concreto-600">Impuesto informativo ({estado.parametros.impuestoInformativoPct} %)</span><span className="tabular-nums">{formatearMoneda(compra.impuestoInformativo)}</span></div>
        <div className="mt-1 flex justify-between border-t border-concreto-300 pt-1 text-base font-bold"><span>Total</span><span className="tabular-nums">{formatearMoneda(compra.total)}</span></div>
        {compra.modalidadPago === 'anticipo' && <div className="mt-2 rounded-md bg-concreto-100 p-2 text-xs"><div className="flex justify-between"><span>Anticipo</span><span className="tabular-nums">{formatearMoneda(anticipo)}</span></div><div className="flex justify-between"><span>Saldo</span><span className="tabular-nums">{formatearMoneda(saldo)}</span></div></div>}
        <p className="mt-2 text-[11px] text-concreto-600">El impuesto es solo informativo; no hay cálculo contable ni tributario.</p>
      </section>
    </div>
  );
}

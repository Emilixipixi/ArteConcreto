import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Receipt } from 'lucide-react';
import BotonConPermiso from '../../components/BotonConPermiso';
import DataTable, { type Columna } from '../../components/DataTable';
import EstadoBadge from '../../components/EstadoBadge';
import ExportarReporte from '../../components/ExportarReporte';
import FiltrosBar from '../../components/FiltrosBar';
import LineaTiempoEstados from '../../components/LineaTiempoEstados';
import Modal from '../../components/Modal';
import ModalObservacion from '../../components/ModalObservacion';
import { formatearFecha, formatearMoneda, tiempoRelativo } from '../../lib/formato';
import { facturaPdf } from '../../lib/documentos';
import { datosFactura } from '../../lib/documentosDatos';
import { puede } from '../../lib/permisos';
import { useUsuarioActual } from '../../store/selectores';
import { valorRecibido } from '../../store/selectoresFase3';
import { comprasSinFactura } from '../../store/selectoresTesoreria';
import { useStore } from '../../store/useStore';
import type { FacturaProveedor } from '../../types';
import ModalFactura from './ModalFactura';

// Facturas de proveedor: registro, cotejo contra orden y recepcion, diferencias y anulacion
export default function TabFacturas({ compraInicial }: { compraInicial?: string }) {
  const e = useStore();
  const u = useUsuarioActual()!;
  const [registrar, setRegistrar] = useState<null | { compra?: string }>(compraInicial ? { compra: compraInicial } : null);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [accion, setAccion] = useState<null | 'aceptar' | 'reclamar' | 'anular'>(null);
  const [q, setQ] = useState(''); const [estado, setEstado] = useState('todos'); const [prov, setProv] = useState('todos');

  const pendientes = useMemo(() => comprasSinFactura(e), [e]);
  const nombreProv = (id: string) => e.proveedores.find((p) => p.id === id)?.nombre ?? '-';
  const numCompra = (id: string) => e.compras.find((c) => c.id === id)?.numero ?? id;
  const filas = useMemo(() => e.facturas.filter((f) => {
    const t = `${f.numero} ${f.numeroFactura} ${numCompra(f.compraId)} ${nombreProv(f.proveedorId)}`.toLowerCase();
    return (!q || t.includes(q.toLowerCase())) && (estado === 'todos' || f.estado === estado) && (prov === 'todos' || f.proveedorId === prov);
  }).sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision)), [e.facturas, q, estado, prov]); // eslint-disable-line react-hooks/exhaustive-deps

  const detalle = e.facturas.find((f) => f.id === detalleId);
  const resultado = (r: { ok: boolean; error?: string }) => { if (!r.ok) e.mostrarToast(r.error ?? 'No se pudo completar la acción', 'error'); else { setAccion(null); } };

  const columnas: Columna<FacturaProveedor>[] = [
    { clave: 'numero', titulo: 'Registro', ordenable: true, render: (f) => <span className="font-semibold text-marca-vino">{f.numero}</span> },
    { clave: 'numeroFactura', titulo: 'Nº de factura', render: (f) => <span className="tabular-nums">{f.numeroFactura}</span> },
    { clave: 'compraId', titulo: 'Orden', render: (f) => <Link className="underline" to={`/compras/${f.compraId}`} onClick={(ev) => ev.stopPropagation()}>{numCompra(f.compraId)}</Link> },
    { clave: 'proveedorId', titulo: 'Proveedor', render: (f) => nombreProv(f.proveedorId), valor: (f) => nombreProv(f.proveedorId), ordenable: true },
    { clave: 'fechaEmision', titulo: 'Emisión', ordenable: true, valor: (f) => f.fechaEmision, render: (f) => formatearFecha(f.fechaEmision) },
    { clave: 'fechaVencimiento', titulo: 'Vence', ordenable: true, valor: (f) => f.fechaVencimiento, render: (f) => formatearFecha(f.fechaVencimiento) },
    { clave: 'total', titulo: 'Total', alinear: 'der', ordenable: true, valor: (f) => f.total, render: (f) => <span className="tabular-nums">{formatearMoneda(f.total)}</span> },
    { clave: 'diferencia', titulo: 'Diferencia', alinear: 'der', render: (f) => <span className={`tabular-nums ${Math.abs(f.diferencia) > 0.05 ? 'font-semibold text-aviso' : 'text-concreto-600'}`}>{formatearMoneda(f.diferencia)}</span> },
    { clave: 'estado', titulo: 'Cotejo', render: (f) => <EstadoBadge estado={f.estado} /> },
    { clave: 'acc', titulo: '', render: (f) => <button className="btn-secundario !py-1 text-xs" onClick={(ev) => { ev.stopPropagation(); setDetalleId(f.id); }}>Ver cotejo</button> },
  ];

  return (
    <div className="space-y-4">
      <section className="tarjeta p-4" aria-label="Facturas por registrar">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-bold"><Receipt size={17} aria-hidden="true" /> Facturas por registrar ({pendientes.length})</h2>
          <BotonConPermiso variante="primario" permitido={puede(u, 'factura.registrar')} motivo="Solo Tesorería registra facturas" onClick={() => setRegistrar({})}><Plus size={15} /> Registrar factura</BotonConPermiso>
        </div>
        <p className="mb-3 text-xs text-concreto-600">Órdenes ya recibidas cuyo proveedor aún no tiene factura cargada. La factura se coteja contra la orden y lo realmente recibido.</p>
        {pendientes.length === 0 ? <p className="text-sm text-concreto-600">Todas las órdenes recibidas tienen su factura.</p> : (
          <ul className="divide-y divide-concreto-300 text-sm">{pendientes.slice(0, 6).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span><Link className="font-semibold text-marca-vino underline" to={`/compras/${c.id}`}>{c.numero}</Link> - {nombreProv(c.proveedorId)}
                <span className="ml-2 text-xs text-concreto-600">recibida {tiempoRelativo(c.actualizadoEn)} - valor recibido {formatearMoneda(valorRecibido(e, c.id))}</span></span>
              <BotonConPermiso className="!py-1 text-xs" permitido={puede(u, 'factura.registrar')} motivo="Solo Tesorería registra facturas" onClick={() => setRegistrar({ compra: c.id })}>Registrar factura</BotonConPermiso>
            </li>))}
          </ul>)}
        {pendientes.length > 6 && <p className="mt-2 text-xs text-concreto-600">Y {pendientes.length - 6} más: elige la orden en el formulario.</p>}
      </section>

      <FiltrosBar busqueda={q} onBusqueda={setQ} placeholder="Buscar por factura, orden o proveedor"
        onLimpiar={() => { setQ(''); setEstado('todos'); setProv('todos'); }}
        filtros={[
          { clave: 'est', etiqueta: 'Cotejo', valor: estado, onChange: setEstado, opciones: [{ valor: 'todos', texto: 'Todos' }, { valor: 'cotejada', texto: 'Cotejada' }, { valor: 'con_diferencia', texto: 'Con diferencia' }, { valor: 'en_reclamo', texto: 'En reclamo' }, { valor: 'anulada', texto: 'Anulada' }] },
          { clave: 'prov', etiqueta: 'Proveedor', valor: prov, onChange: setProv, opciones: [{ valor: 'todos', texto: 'Todos' }, ...e.proveedores.map((p) => ({ valor: p.id, texto: p.nombre }))] },
        ]}>
        <ExportarReporte nombre="facturas_proveedor" filasCsv={() => [['Registro', 'Factura', 'Orden', 'Proveedor', 'Emisión', 'Vence', 'Total', 'Diferencia', 'Cotejo'],
          ...filas.map((f) => [f.numero, f.numeroFactura, numCompra(f.compraId), nombreProv(f.proveedorId), f.fechaEmision.slice(0, 10), f.fechaVencimiento.slice(0, 10), f.total, f.diferencia, f.estado])]} />
      </FiltrosBar>
      <DataTable columnas={columnas} filas={filas} clave={(f) => f.id} tamPagina={8} onFila={(f) => setDetalleId(f.id)} vacioTitulo="No hay facturas con esos filtros" />

      <ModalFactura abierto={!!registrar} compraInicial={registrar?.compra} onCerrar={() => setRegistrar(null)} />

      <Modal abierto={!!detalle} titulo={detalle ? `Cotejo de ${detalle.numero}` : ''} ancho="max-w-2xl" onCerrar={() => setDetalleId(null)}
        pie={detalle && <>
          {detalle.estado === 'con_diferencia' && <>
            <BotonConPermiso permitido={puede(u, 'factura.registrar')} motivo="Solo Tesorería resuelve diferencias" onClick={() => setAccion('reclamar')}>Reclamar nota de crédito</BotonConPermiso>
            <BotonConPermiso variante="primario" permitido={puede(u, 'factura.registrar')} motivo="Solo Tesorería resuelve diferencias" onClick={() => setAccion('aceptar')}>Aceptar diferencia</BotonConPermiso></>}
          {detalle.estado !== 'anulada' && <BotonConPermiso variante="peligro" permitido={puede(u, 'factura.registrar')} motivo="Solo Tesorería anula facturas" onClick={() => setAccion('anular')}>Anular factura</BotonConPermiso>}
          <button className="btn-fantasma" onClick={() => setDetalleId(null)}>Cerrar</button></>}>
        {detalle && (() => {
          const c = e.compras.find((x) => x.id === detalle.compraId);
          const hayDif = Math.abs(detalle.diferencia) > 0.05;
          return (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-3">
                <div><p className="etiqueta">Proveedor</p>{nombreProv(detalle.proveedorId)}</div>
                <div><p className="etiqueta">Nº de factura</p><span className="tabular-nums">{detalle.numeroFactura}</span></div>
                <div><p className="etiqueta">Cotejo</p><EstadoBadge estado={detalle.estado} /></div>
                <div><p className="etiqueta">Emisión</p>{formatearFecha(detalle.fechaEmision)}</div>
                <div><p className="etiqueta">Vencimiento</p>{formatearFecha(detalle.fechaVencimiento)}</div>
                <div><p className="etiqueta">Archivo</p><button type="button" className="inline-flex items-center gap-1 text-marca-vino underline" title="Descargar la factura de muestra en PDF" onClick={() => facturaPdf(datosFactura(e, detalle))}><FileText size={14} aria-hidden="true" />{detalle.archivo || 'Descargar factura (PDF)'}</button></div>
              </div>
              <div>
                <h3 className="mb-1 text-sm font-bold">Cotejo de tres vías</h3>
                <table className="w-full text-sm">
                  <thead className="bg-concreto-100 text-xs uppercase text-concreto-600"><tr><th className="px-2 py-1 text-left">Documento</th><th className="px-2 py-1 text-right">Valor (con impuesto)</th></tr></thead>
                  <tbody>
                    <tr className="border-t border-concreto-300"><td className="px-2 py-1.5">Orden de compra {c ? <Link className="underline" to={`/compras/${c.id}`}>{c.numero}</Link> : ''}</td><td className="px-2 py-1.5 text-right tabular-nums">{c ? formatearMoneda(c.total) : '-'}</td></tr>
                    <tr className="border-t border-concreto-300"><td className="px-2 py-1.5">Recibido en almacén</td><td className="px-2 py-1.5 text-right tabular-nums">{formatearMoneda(detalle.valorRecibido)}</td></tr>
                    <tr className="border-t border-concreto-300"><td className="px-2 py-1.5">Facturado (subtotal {formatearMoneda(detalle.subtotal)} + IVA {formatearMoneda(detalle.iva)})</td><td className="px-2 py-1.5 text-right font-semibold tabular-nums">{formatearMoneda(detalle.total)}</td></tr>
                    <tr className="border-t-2 border-concreto-300"><td className="px-2 py-1.5 font-semibold">Diferencia (facturado menos recibido)</td><td className={`px-2 py-1.5 text-right font-bold tabular-nums ${hayDif ? 'text-aviso' : 'text-ok'}`}>{formatearMoneda(detalle.diferencia)}</td></tr>
                  </tbody>
                </table>
              </div>
              {detalle.observacion && <p className="rounded-md border border-concreto-300 bg-concreto-100 p-2 text-xs">{detalle.observacion}</p>}
              <div><h3 className="mb-1 text-sm font-bold">Historial</h3><LineaTiempoEstados historial={detalle.historial} /></div>
            </div>);
        })()}
      </Modal>

      <ModalObservacion abierto={accion === 'aceptar'} titulo="Aceptar la diferencia" etiqueta="Motivo (obligatorio)" textoConfirmar="Aceptar" onCerrar={() => setAccion(null)} onConfirmar={(m) => detalle && resultado(e.resolverDiferenciaFactura(detalle.id, 'aceptar', m))} />
      <ModalObservacion abierto={accion === 'reclamar'} titulo="Reclamar nota de crédito al proveedor" etiqueta="Detalle del reclamo (obligatorio)" textoConfirmar="Registrar reclamo" onCerrar={() => setAccion(null)} onConfirmar={(m) => detalle && resultado(e.resolverDiferenciaFactura(detalle.id, 'reclamar', m))} />
      <ModalObservacion abierto={accion === 'anular'} titulo="Anular factura" etiqueta="Motivo de la anulación (obligatorio)" textoConfirmar="Anular" peligro onCerrar={() => setAccion(null)} onConfirmar={(m) => detalle && resultado(e.anularFactura(detalle.id, m))} />
    </div>
  );
}

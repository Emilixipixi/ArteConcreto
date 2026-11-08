import { useMemo, useState } from 'react';
import DataTable, { type Columna } from '../../components/DataTable';
import ExportarReporte from '../../components/ExportarReporte';
import { formatearFecha, formatearMoneda } from '../../lib/formato';
import { estadoCuentaProveedor, resumenProveedores, type LineaEstadoCuenta, type ResumenProveedor } from '../../store/selectoresTesoreria';
import BotonesDocumento from '../../components/BotonesDocumento';
import { fichaEstadoCuenta } from '../../lib/documentosDatos';
import { useStore } from '../../store/useStore';

// Estado de cuenta por proveedor: lo comprado, facturado, pagado y el libro de movimientos
export default function TabEstadoCuenta() {
  const e = useStore();
  const resumen = useMemo(() => resumenProveedores(e), [e]);
  const [provId, setProvId] = useState('');
  const sel = resumen.find((r) => r.proveedorId === provId) ?? resumen[0];
  const libro = useMemo(() => (sel ? estadoCuentaProveedor(e, sel.proveedorId) : []), [e, sel]);

  const cols: Columna<ResumenProveedor>[] = [
    { clave: 'nombre', titulo: 'Proveedor', ordenable: true, render: (r) => <span className="font-semibold">{r.nombre}</span> },
    { clave: 'ordenes', titulo: 'Órdenes', alinear: 'der', ordenable: true, valor: (r) => r.ordenes },
    { clave: 'comprado', titulo: 'Comprado', alinear: 'der', ordenable: true, valor: (r) => r.comprado, render: (r) => <span className="tabular-nums">{formatearMoneda(r.comprado)}</span> },
    { clave: 'facturado', titulo: 'Facturado', alinear: 'der', ordenable: true, valor: (r) => r.facturado, render: (r) => <span className="tabular-nums">{formatearMoneda(r.facturado)}</span> },
    { clave: 'pagado', titulo: 'Pagado', alinear: 'der', ordenable: true, valor: (r) => r.pagado, render: (r) => <span className="tabular-nums">{formatearMoneda(r.pagado)}</span> },
    { clave: 'vencido', titulo: 'Vencido', alinear: 'der', ordenable: true, valor: (r) => r.vencido, render: (r) => <span className={`tabular-nums ${r.vencido > 0 ? 'font-semibold text-error' : 'text-concreto-600'}`}>{formatearMoneda(r.vencido)}</span> },
    { clave: 'saldo', titulo: 'Saldo por pagar', alinear: 'der', ordenable: true, valor: (r) => r.saldo, render: (r) => <span className="font-bold tabular-nums">{formatearMoneda(r.saldo)}</span> },
  ];
  const colsLibro: Columna<LineaEstadoCuenta>[] = [
    { clave: 'fecha', titulo: 'Fecha', render: (l) => formatearFecha(l.fecha) },
    { clave: 'tipo', titulo: 'Tipo', render: (l) => <span className={`chip ${l.tipo === 'Factura' ? '' : '!bg-ok/10 !text-ok'}`}>{l.tipo}</span> },
    { clave: 'documento', titulo: 'Documento', render: (l) => <span className="tabular-nums">{l.documento}</span> },
    { clave: 'detalle', titulo: 'Detalle', render: (l) => <span className="text-xs">{l.detalle}</span> },
    { clave: 'cargo', titulo: 'Facturado', alinear: 'der', render: (l) => <span className="tabular-nums">{l.cargo ? formatearMoneda(l.cargo) : '-'}</span> },
    { clave: 'abono', titulo: 'Pagado', alinear: 'der', render: (l) => <span className="tabular-nums">{l.abono ? formatearMoneda(l.abono) : '-'}</span> },
    { clave: 'saldo', titulo: 'Saldo', alinear: 'der', render: (l) => <span className={`font-semibold tabular-nums ${l.saldo < 0 ? 'text-info' : ''}`}>{formatearMoneda(l.saldo)}</span> },
  ];

  return (
    <div className="space-y-4">
      <section aria-label="Resumen por proveedor">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-bold">Resumen por proveedor</h2>
          <ExportarReporte nombre="estado_cuenta_proveedores" filasCsv={() => [['Proveedor', 'Órdenes', 'Comprado', 'Facturado', 'Pagado', 'Vencido', 'Saldo por pagar'], ...resumen.map((r) => [r.nombre, r.ordenes, r.comprado, r.facturado, r.pagado, r.vencido, r.saldo])]} /></div>
        <DataTable columnas={cols} filas={resumen} clave={(r) => r.proveedorId} tamPagina={8} onFila={(r) => setProvId(r.proveedorId)} resaltar={(r) => r.proveedorId === sel?.proveedorId} vacioTitulo="Sin proveedores con compras" />
        <p className="mt-1 text-xs text-concreto-600">Elige una fila para ver su libro de movimientos.</p>
      </section>

      {sel && (
        <section aria-label="Libro del proveedor">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold">Libro de {sel.nombre}</h2>
            <BotonesDocumento ficha={() => fichaEstadoCuenta(e, sel.proveedorId)} />
            <ExportarReporte nombre={`libro_${sel.proveedorId}`} filasCsv={() => [['Fecha', 'Tipo', 'Documento', 'Detalle', 'Facturado', 'Pagado', 'Saldo'], ...libro.map((l) => [l.fecha.slice(0, 10), l.tipo, l.documento, l.detalle, l.cargo, l.abono, l.saldo])]} />
          </div>
          <DataTable columnas={colsLibro} filas={libro} clave={(l) => l.fecha + l.documento + l.tipo} tamPagina={8} vacioTitulo="Sin movimientos con este proveedor" />
          <p className="mt-1 text-xs text-concreto-600">Un saldo negativo indica anticipos pagados por mercancía todavía no facturada.</p>
        </section>
      )}
    </div>
  );
}

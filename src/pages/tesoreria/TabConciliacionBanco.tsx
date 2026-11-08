import { useMemo, useState } from 'react';
import { CheckCircle2, Landmark, Link2, Scale, Undo2, Upload, Zap } from 'lucide-react';
import BotonConPermiso from '../../components/BotonConPermiso';
import DataTable, { type Columna } from '../../components/DataTable';
import EstadoBadge from '../../components/EstadoBadge';
import ExportarReporte from '../../components/ExportarReporte';
import Modal from '../../components/Modal';
import ModalObservacion from '../../components/ModalObservacion';
import { formatearFecha, formatearMoneda } from '../../lib/formato';
import { puede } from '../../lib/permisos';
import { useUsuarioActual } from '../../store/selectores';
import { candidatosPago, pagosSinMovimiento, resumenBanco } from '../../store/selectoresTesoreria';
import { useStore } from '../../store/useStore';
import BotonesDocumento from '../../components/BotonesDocumento';
import { fichaConciliacion } from '../../lib/documentosDatos';
import type { MovimientoBanco } from '../../types';

// Conciliacion bancaria: extracto simulado frente a los pagos registrados
export default function TabConciliacionBanco() {
  const e = useStore();
  const u = useUsuarioActual()!;
  const [cuentaId, setCuentaId] = useState(e.cuentasBancarias[0]?.id ?? '');
  const [filtro, setFiltro] = useState<'todos' | 'sin_conciliar' | 'conciliado' | 'gasto_bancario'>('sin_conciliar');
  const [manual, setManual] = useState<MovimientoBanco | null>(null);
  const [pagoSel, setPagoSel] = useState('');
  const [gasto, setGasto] = useState<MovimientoBanco | null>(null);

  const cuenta = e.cuentasBancarias.find((c) => c.id === cuentaId);
  const r = resumenBanco(e, cuentaId);
  const movs = useMemo(() => e.movimientosBanco.filter((m) => m.cuentaId === cuentaId && (filtro === 'todos' || m.estado === filtro)).sort((a, b) => b.fecha.localeCompare(a.fecha)), [e.movimientosBanco, cuentaId, filtro]);
  const enTransito = pagosSinMovimiento(e, cuentaId);
  const spDe = (pagoId?: string) => e.solicitudesPago.find((s) => s.id === e.pagos.find((p) => p.id === pagoId)?.solicitudPagoId);
  const provDe = (pagoId: string) => e.proveedores.find((p) => p.id === e.compras.find((c) => c.id === spDe(pagoId)?.compraId)?.proveedorId)?.nombre ?? '-';
  const permiso = puede(u, 'banco.conciliar');
  const candidatos = manual ? candidatosPago(e, manual) : [];
  const resp = (x: { ok: boolean; error?: string }) => { if (!x.ok) e.mostrarToast(x.error ?? 'No se pudo completar la acción', 'error'); return x.ok; };
  const cuadra = Math.abs(r.diferencia - r.explicada) < 0.005;

  const columnas: Columna<MovimientoBanco>[] = [
    { clave: 'fecha', titulo: 'Fecha', ordenable: true, valor: (m) => m.fecha, render: (m) => formatearFecha(m.fecha) },
    { clave: 'descripcion', titulo: 'Descripción', render: (m) => <span>{m.descripcion}{m.nota && <span className="block text-xs text-concreto-600">{m.nota}</span>}</span> },
    { clave: 'referencia', titulo: 'Referencia', render: (m) => <span className="text-xs tabular-nums">{m.referencia || '-'}</span> },
    { clave: 'monto', titulo: 'Monto', alinear: 'der', ordenable: true, valor: (m) => m.monto, render: (m) => <span className={`tabular-nums ${m.monto < 0 ? '' : 'text-ok'}`}>{formatearMoneda(m.monto)}</span> },
    { clave: 'estado', titulo: 'Estado', render: (m) => <EstadoBadge estado={m.estado} /> },
    { clave: 'pago', titulo: 'Pago vinculado', render: (m) => m.pagoId ? <span className="text-xs font-semibold text-marca-vino">{spDe(m.pagoId)?.numero ?? m.pagoId}</span> : <span className="text-xs text-concreto-600">-</span> },
    { clave: 'acc', titulo: 'Acciones', render: (m) => m.estado === 'sin_conciliar' ? (
      <span className="flex flex-wrap gap-1">
        <BotonConPermiso className="!py-1 text-xs" variante="primario" permitido={permiso} motivo="Solo Tesorería concilia el extracto" onClick={() => { setManual(m); setPagoSel(''); }}><Link2 size={13} /> Conciliar</BotonConPermiso>
        <BotonConPermiso className="!py-1 text-xs" permitido={permiso && m.monto < 0} motivo={permiso ? 'Solo los cargos del banco son gastos bancarios' : 'Solo Tesorería concilia el extracto'} onClick={() => setGasto(m)}>Gasto bancario</BotonConPermiso>
      </span>
    ) : <BotonConPermiso className="!py-1 text-xs" permitido={permiso} motivo="Solo Tesorería deshace conciliaciones" onClick={() => resp(e.deshacerConciliacion(m.id))}><Undo2 size={13} /> Deshacer</BotonConPermiso> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Cuentas bancarias" className="flex flex-wrap gap-2">
          {e.cuentasBancarias.map((c) => (
            <button key={c.id} role="tab" aria-selected={cuentaId === c.id} onClick={() => setCuentaId(c.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${cuentaId === c.id ? 'border-marca-vino bg-marca-vino/5 text-marca-vino' : 'border-concreto-300 bg-superficie hover:border-marca-vino'}`}>
              <Landmark size={16} aria-hidden="true" /><span><span className="block font-semibold">{c.nombre}</span><span className="block text-xs text-concreto-600">{c.banco} ****{c.ultimos4}</span></span>
            </button>))}
        </div>
        <div className="flex flex-wrap gap-2">
          <BotonesDocumento ficha={() => fichaConciliacion(e, cuentaId)} />
          <BotonConPermiso permitido={permiso} motivo="Solo Tesorería importa el extracto" onClick={() => resp(e.importarExtracto())}><Upload size={15} /> Importar extracto (simulado)</BotonConPermiso>
          <BotonConPermiso variante="primario" permitido={permiso} motivo="Solo Tesorería concilia el extracto" onClick={() => resp(e.conciliarAutomatico())}><Zap size={15} /> Conciliar automáticamente</BotonConPermiso>
        </div>
      </div>

      <section className="tarjeta p-4" aria-label="Resumen de conciliación">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold"><Scale size={17} aria-hidden="true" /> Conciliación de {cuenta?.nombre}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[['Saldo según banco', r.saldoBanco, ''], ['Saldo según libros', r.saldoLibros, ''], ['Pagos en tránsito', r.enTransito, 'text-aviso'], ['Movimientos sin identificar', r.sinIdentificar, r.sinIdentificar < 0 ? 'text-error' : '']].map(([t, v, c]) => (
            <div key={String(t)} className="rounded-md border border-concreto-300 p-3"><p className="etiqueta">{t}</p><span className={`text-xl font-bold tabular-nums ${c}`}>{formatearMoneda(Number(v))}</span></div>))}
        </div>
        <p className={`mt-3 flex items-start gap-2 text-sm ${cuadra ? 'text-ok' : 'text-error'}`}>
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>La diferencia entre banco y libros es {formatearMoneda(r.diferencia)}: pagos en tránsito {formatearMoneda(r.enTransito)} {r.sinIdentificar < 0 ? 'menos' : 'más'} movimientos del banco sin identificar {formatearMoneda(Math.abs(r.sinIdentificar))}. {cuadra ? 'La diferencia está totalmente explicada.' : 'Hay una diferencia sin explicar: revisa los movimientos.'}{r.porConciliar > 0 && ` Además hay ${r.porConciliar} ${r.porConciliar === 1 ? 'movimiento' : 'movimientos'} con un pago que coincide, listos para conciliar.`}</span>
        </p>
      </section>

      <section aria-label="Movimientos del extracto">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold">Extracto bancario</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div role="tablist" aria-label="Filtro de movimientos" className="flex gap-1 rounded-md border border-concreto-300 p-0.5 text-xs">
              {([['sin_conciliar', `Sin conciliar (${r.sinConciliar})`], ['conciliado', 'Conciliados'], ['gasto_bancario', 'Gastos bancarios'], ['todos', 'Todos']] as const).map(([k, t]) => (
                <button key={k} role="tab" aria-selected={filtro === k} onClick={() => setFiltro(k)} className={`rounded px-2 py-1 font-semibold ${filtro === k ? 'bg-marca-vino text-white' : 'text-concreto-600 hover:text-texto'}`}>{t}</button>))}
            </div>
            <ExportarReporte nombre="extracto_bancario" filasCsv={() => [['Fecha', 'Descripción', 'Referencia', 'Monto', 'Estado'], ...movs.map((m) => [m.fecha.slice(0, 10), m.descripcion, m.referencia, m.monto, m.estado])]} />
          </div>
        </div>
        <DataTable columnas={columnas} filas={movs} clave={(m) => m.id} tamPagina={8} vacioTitulo="Sin movimientos en este filtro" vacioMensaje="Importa el extracto o cambia el filtro para ver otros movimientos." />
      </section>

      <section className="tarjeta p-4" aria-label="Pagos sin movimiento bancario">
        <h2 className="mb-1 text-base font-bold">Pagos registrados sin movimiento en el banco ({enTransito.length})</h2>
        <p className="mb-2 text-xs text-concreto-600">Cheques en circulación o pagos de hoy que el banco todavía no refleja (también aparecen aquí los pagos cuyo movimiento aún no se concilió). Se resuelven al importar el extracto y conciliar.</p>
        {enTransito.length === 0 ? <p className="text-sm text-concreto-600">Todos los pagos de esta cuenta ya figuran en el extracto.</p> : (
          <ul className="divide-y divide-concreto-300 text-sm">{enTransito.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span><span className="font-semibold text-marca-vino">{spDe(p.id)?.numero}</span> - {provDe(p.id)} <span className="text-xs text-concreto-600">{p.medio} {p.referencia} - {formatearFecha(p.fecha)}</span></span>
              <span className="font-semibold tabular-nums">{formatearMoneda(p.importe)}</span></li>))}</ul>)}
      </section>

      <Modal abierto={!!manual} titulo="Conciliar movimiento con un pago" ancho="max-w-xl" onCerrar={() => setManual(null)}
        pie={<><button className="btn-fantasma" onClick={() => setManual(null)}>Cancelar</button>
          <BotonConPermiso variante="primario" permitido={!!pagoSel} motivo="Elige el pago que corresponde al movimiento" onClick={() => { if (manual && resp(e.conciliarMovimiento(manual.id, pagoSel))) setManual(null); }}>Conciliar</BotonConPermiso></>}>
        {manual && (
          <div className="space-y-3 text-sm">
            <p className="rounded-md bg-concreto-100 p-2"><strong>{manual.descripcion}</strong><br />{formatearFecha(manual.fecha)} - {manual.referencia || 'sin referencia'} - <strong>{formatearMoneda(manual.monto)}</strong></p>
            {candidatos.length === 0 ? <p className="rounded-md border border-aviso/40 bg-aviso/10 p-2 text-xs">No hay pagos registrados por {formatearMoneda(Math.abs(manual.monto))} en esta cuenta. Si es un cargo del banco, usa "Gasto bancario"; si es un pago, registra primero el pago en la bandeja de Tesorería.</p> : (
              <fieldset><legend className="etiqueta">Pagos con el mismo importe</legend>
                <ul className="space-y-1">{candidatos.map((p) => (
                  <li key={p.id}><label className="flex cursor-pointer items-center gap-2 rounded-md border border-concreto-300 p-2 hover:border-marca-vino">
                    <input type="radio" name="pago-conc" checked={pagoSel === p.id} onChange={() => setPagoSel(p.id)} />
                    <span className="flex-1"><span className="font-semibold text-marca-vino">{spDe(p.id)?.numero}</span> - {provDe(p.id)}<span className="block text-xs text-concreto-600">{p.medio} {p.referencia} - {formatearFecha(p.fecha)}</span></span>
                    <span className="font-semibold tabular-nums">{formatearMoneda(p.importe)}</span></label></li>))}</ul></fieldset>)}
          </div>)}
      </Modal>
      <ModalObservacion abierto={!!gasto} titulo="Registrar como gasto bancario" etiqueta="Concepto del gasto (obligatorio)" textoConfirmar="Registrar gasto" onCerrar={() => setGasto(null)}
        onConfirmar={(n) => { if (gasto && resp(e.marcarGastoBancario(gasto.id, n))) setGasto(null); }} />
    </div>
  );
}

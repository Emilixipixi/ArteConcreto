import { useMemo, useState } from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import AlertaInventario from '../../components/AlertaInventario';
import BotonConPermiso from '../../components/BotonConPermiso';
import DataTable, { type Columna } from '../../components/DataTable';
import EstadoBadge from '../../components/EstadoBadge';
import ExportarReporte from '../../components/ExportarReporte';
import PageHeader from '../../components/PageHeader';
import { formatearFecha, formatearFechaHora, formatearMoneda } from '../../lib/formato';
import { cadenaDocumento, tiempoEntre } from '../../lib/trazabilidad';
import { puede } from '../../lib/permisos';
import { useAlertas, useUsuarioActual } from '../../store/selectores';
import { comprasPorRecibir, FILTROS_VACIOS, indicadores, movimientosFiltrados, pagosPendientes, type FiltrosReporte } from '../../store/selectoresReportes';
import { useStore } from '../../store/useStore';

const TABS = [
  { id: 'indicadores', t: 'Indicadores' }, { id: 'recibir', t: 'Compras por recibir' }, { id: 'pagos', t: 'Pagos pendientes' },
  { id: 'movimientos', t: 'Movimientos' }, { id: 'traza', t: 'Trazabilidad' }, { id: 'alertas', t: 'Alertas' },
] as const;
const PALETA = ['#6B1F3B', '#F2B705', '#2E7D5B', '#B7791F', '#4A6FA5', '#9A9488', '#A32D2D'];
const TIPOS_DOC = ['Solicitud', 'Compra', 'Pago', 'Recepción', 'Fabricación', 'Traslado', 'Despacho', 'Ajuste'];

// P-17 Reportes y trazabilidad (RF-49 a RF-54): todas las cifras salen de los mismos selectores que el resto de pantallas
export default function Reportes() {
  const e = useStore();
  const u = useUsuarioActual()!;
  const [params] = useSearchParams();
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>(params.get('doc') ? 'traza' : 'indicadores');
  const [f, setF] = useState<FiltrosReporte>(FILTROS_VACIOS);
  const [vistaMov, setVistaMov] = useState<'materia_prima' | 'producto_terminado'>('materia_prima');
  const [busqueda, setBusqueda] = useState(params.get('doc') ?? '');
  const [consultado, setConsultado] = useState(params.get('doc') ?? '');
  const [umbral, setUmbral] = useState(String(e.parametros.umbralStockPct ?? 100));
  const [dias, setDias] = useState(String(e.parametros.diasRecepcionVencida));
  const set = (k: keyof FiltrosReporte) => (v: string) => setF({ ...f, [k]: v });
  const nombre = (id: string) => e.usuarios.find((x) => x.id === id)?.nombre ?? id;
  const ind = useMemo(() => indicadores(e, f), [e, f]);
  const recibir = comprasPorRecibir(e, f);
  const pagos = pagosPendientes(e, f);
  const movs = movimientosFiltrados(e, f, vistaMov);
  const cadena = consultado ? cadenaDocumento(e, consultado) : null;
  const alertas = useAlertas().filter((a) => !f.sku || a.sku === f.sku);
  const estados = [...new Set([...e.solicitudes.map((s) => s.estado), ...e.compras.map((c) => c.estado), ...e.despachos.map((d) => d.estado)])];
  const guardarUmbral = () => { const r = e.guardarParametros({ umbralStockPct: Number(umbral), diasRecepcionVencida: Number(dias) }); if (!r.ok) e.mostrarToast(r.error ?? 'No se pudo guardar', 'error'); };
  const permisoParam = puede(u, 'admin.gestionar');

  const colsMov: Columna<(typeof movs)[number]>[] = [
    { clave: 'fecha', titulo: 'Fecha', ordenable: true, valor: (m) => m.fecha, render: (m) => formatearFechaHora(m.fecha) },
    { clave: 'tipo', titulo: 'Tipo', render: (m) => m.tipo.replace(/_/g, ' ') },
    { clave: 'sku', titulo: 'SKU', ordenable: true },
    { clave: 'bod', titulo: 'Bodega', render: (m) => [m.bodegaOrigenId, m.bodegaDestinoId].filter(Boolean).map((b) => e.bodegas.find((x) => x.id === b)?.codigo ?? b).join(' → ') },
    { clave: 'cant', titulo: 'Cantidad', alinear: 'der', valor: (m) => m.cantidadBase, render: (m) => <span className="tabular-nums">{m.cantidadBase}</span> },
    { clave: 'doc', titulo: 'Documento', render: (m) => <button className="text-marca-vino underline" onClick={() => { setBusqueda(m.documentoId.toUpperCase()); setConsultado(m.documentoId.toUpperCase()); setTab('traza'); }}>{m.documentoTipo} {m.documentoId.toUpperCase()}</button> },
    { clave: 'usr', titulo: 'Usuario', render: (m) => nombre(m.usuarioId) },
  ];
  const sel = (id: string, etiqueta: string, valor: string, opciones: { v: string; t: string }[], on: (v: string) => void) => (
    <div className="min-w-[130px]"><label className="etiqueta" htmlFor={id}>{etiqueta}</label><select id={id} className="campo" value={valor} onChange={(ev) => on(ev.target.value)}>{opciones.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}</select></div>
  );

  return (
    <div>
      <PageHeader titulo="Reportes y trazabilidad" migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Reportes' }]} subtitulo="Las cifras salen de los mismos datos que el resto de las pantallas." />
      <section className="tarjeta mb-4 flex flex-wrap items-end gap-3 p-3" aria-label="Filtros globales">
        {sel('r-bod', 'Bodega', f.bodega, [{ v: 'todas', t: 'Todas' }, ...e.bodegas.map((b) => ({ v: b.id, t: b.nombre }))], set('bodega'))}
        {sel('r-sku', 'Producto / SKU', f.sku, [{ v: '', t: 'Todos' }, ...e.articulos.map((a) => ({ v: a.sku, t: `${a.sku} - ${a.nombre}` }))], set('sku'))}
        {sel('r-est', 'Estado', f.estado, [{ v: 'todos', t: 'Todos' }, ...estados.map((s) => ({ v: s, t: s.replace(/_/g, ' ') }))], set('estado'))}
        {sel('r-resp', 'Responsable', f.responsable, [{ v: 'todos', t: 'Todos' }, ...e.usuarios.map((x) => ({ v: x.id, t: x.nombre }))], set('responsable'))}
        {sel('r-doc', 'Tipo de documento', f.tipoDoc, [{ v: 'todos', t: 'Todos' }, ...TIPOS_DOC.map((t) => ({ v: t, t }))], set('tipoDoc'))}
        <div><label className="etiqueta" htmlFor="r-desde">Desde</label><input id="r-desde" type="date" className="campo" value={f.desde} onChange={(ev) => set('desde')(ev.target.value)} /></div>
        <div><label className="etiqueta" htmlFor="r-hasta">Hasta</label><input id="r-hasta" type="date" className="campo" value={f.hasta} onChange={(ev) => set('hasta')(ev.target.value)} /></div>
        <button className="btn-fantasma border border-concreto-300" onClick={() => setF(FILTROS_VACIOS)}>Limpiar filtros</button>
      </section>

      <div role="tablist" aria-label="Bloques del reporte" className="mb-4 flex gap-1 overflow-x-auto border-b border-concreto-300">
        {TABS.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${tab === t.id ? 'border-marca-vino text-marca-vino' : 'border-transparent text-concreto-600 hover:text-texto'}`}>{t.t}</button>)}
      </div>

      {tab === 'indicadores' && (
        <div className="space-y-4">
          <div className="flex justify-end"><ExportarReporte nombre="indicadores" filasCsv={() => [['Indicador', 'Valor'], ['Aprobación promedio (h)', ind.promedioAprobacionHoras?.toFixed(1) ?? '-'], ['Anticipos abiertos', ind.anticiposAbiertos], ['Valor referencial inventario', ind.valorInventario.toFixed(2)], ['Despachos del período', ind.despachos.length], ...ind.solicitudesPorEstado.map((x) => [`Solicitudes ${x.nombre}`, x.cantidad]), ...ind.comprasPorEstado.map((x) => [`Compras ${x.nombre}`, x.cantidad])]} /></div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[['Aprobación promedio', ind.promedioAprobacionHoras === null ? 'Sin datos' : `${ind.promedioAprobacionHoras.toFixed(1)} h`], ['Anticipos abiertos', `${ind.anticiposAbiertos} (${formatearMoneda(ind.anticiposImporte)})`], ['Valor referencial inventario', formatearMoneda(ind.valorInventario)], ['Despachos del período', String(ind.despachos.length)]].map(([t, v]) => (
              <div key={t} className="tarjeta p-3"><p className="etiqueta">{t}</p><p className="text-lg font-bold tabular-nums text-marca-vino">{v}</p></div>))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="tarjeta p-4"><h3 className="mb-2 text-sm font-bold">Solicitudes por estado</h3><div className="h-56" role="img" aria-label="Gráfico de solicitudes por estado"><ResponsiveContainer><BarChart data={ind.solicitudesPorEstado}><CartesianGrid strokeDasharray="3 3" stroke="#D6D3CE" vertical={false} /><XAxis dataKey="nombre" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="cantidad" name="Solicitudes" fill="#6B1F3B" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
            <section className="tarjeta p-4"><h3 className="mb-2 text-sm font-bold">Compras por estado</h3><div className="h-56" role="img" aria-label="Gráfico de compras por estado"><ResponsiveContainer><PieChart><Pie data={ind.comprasPorEstado} dataKey="cantidad" nameKey="nombre" innerRadius={45} outerRadius={80}>{ind.comprasPorEstado.map((_, i) => <Cell key={i} fill={PALETA[i % PALETA.length]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer></div></section>
            <section className="tarjeta p-4"><h3 className="mb-2 text-sm font-bold">Compras por proveedor (USD)</h3><div className="h-56" role="img" aria-label="Gráfico de compras por proveedor"><ResponsiveContainer><BarChart data={ind.comprasPorProveedor} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#D6D3CE" horizontal={false} /><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="nombre" width={110} tick={{ fontSize: 10 }} /><Tooltip formatter={(v: number) => formatearMoneda(v)} /><Bar dataKey="total" name="Total" fill="#F2B705" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></section>
            <section className="tarjeta p-4"><h3 className="mb-2 text-sm font-bold">Existencias por categoría (unidad base)</h3><div className="h-56" role="img" aria-label="Gráfico de existencias por categoría"><ResponsiveContainer><BarChart data={ind.existenciasPorCategoria}><CartesianGrid strokeDasharray="3 3" stroke="#D6D3CE" vertical={false} /><XAxis dataKey="nombre" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="cantidad" name="Existencias" fill="#2E7D5B" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
            <section className="tarjeta p-4 lg:col-span-2"><h3 className="mb-2 text-sm font-bold">Despachos confirmados por día</h3>
              {ind.despachosPorDia.length === 0 ? <p className="text-sm text-concreto-600">Sin despachos en el período.</p> : <div className="h-48" role="img" aria-label="Gráfico de despachos por día"><ResponsiveContainer><LineChart data={ind.despachosPorDia}><CartesianGrid strokeDasharray="3 3" stroke="#D6D3CE" vertical={false} /><XAxis dataKey="nombre" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="cantidad" name="Despachos" stroke="#6B1F3B" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div>}</section>
          </div>
        </div>
      )}

      {tab === 'recibir' && (
        <div className="space-y-3"><div className="flex justify-end"><ExportarReporte nombre="compras_por_recibir" filasCsv={() => [['Orden', 'Proveedor', 'Entrega estimada', 'Atraso (días)', 'Vencida'], ...recibir.map((x) => [x.compra.numero, e.proveedores.find((p) => p.id === x.compra.proveedorId)?.nombre ?? '', x.compra.fechaEstimadaEntrega.slice(0, 10), x.diasAtraso, x.vencida ? 'Sí' : 'No'])]} /></div>
          <DataTable<(typeof recibir)[number]> filas={recibir} clave={(x) => x.compra.id} vacioTitulo="No hay compras pendientes de recibir" columnas={[
            { clave: 'oc', titulo: 'Orden', render: (x) => <Link className="font-semibold text-marca-vino underline" to={`/recepcion/${x.compra.id}`}>{x.compra.numero}</Link> },
            { clave: 'prov', titulo: 'Proveedor', render: (x) => e.proveedores.find((p) => p.id === x.compra.proveedorId)?.nombre },
            { clave: 'ent', titulo: 'Entrega estimada', render: (x) => formatearFecha(x.compra.fechaEstimadaEntrega) },
            { clave: 'pen', titulo: 'Pendiente', render: (x) => x.lineas.filter((l) => l.pendiente > 0).map((l) => `${l.sku}: ${l.pendiente}`).join(', ') },
            { clave: 'atr', titulo: 'Atraso', alinear: 'der', valor: (x) => x.diasAtraso, ordenable: true, render: (x) => `${x.diasAtraso} días` },
            { clave: 'al', titulo: 'Alerta', render: (x) => x.vencida ? <span className="chip !bg-error/10 !text-error"><AlertTriangle size={12} className="mr-1" aria-hidden="true" />Vencida</span> : <span className="text-xs text-concreto-600">En plazo</span> },
          ]} /></div>
      )}

      {tab === 'pagos' && (
        <div className="space-y-4"><div className="flex justify-end"><ExportarReporte nombre="pagos_pendientes" filasCsv={() => [['Orden', 'Recibido', 'Pagado', 'Saldo por pagar'], ...pagos.compras.map((x) => [x.compra.numero, x.recibido, x.pagado, x.saldo])]} /></div>
          <section><h3 className="mb-2 text-sm font-bold">Saldo por pagar</h3>
            <DataTable<(typeof pagos.compras)[number]> filas={pagos.compras} clave={(x) => x.compra.id} vacioTitulo="Sin saldos por pagar" columnas={[
              { clave: 'oc', titulo: 'Orden', render: (x) => <Link className="font-semibold text-marca-vino underline" to={`/compras/${x.compra.id}`}>{x.compra.numero}</Link> },
              { clave: 'rec', titulo: 'Recibido', alinear: 'der', render: (x) => formatearMoneda(x.recibido) },
              { clave: 'pag', titulo: 'Pagado', alinear: 'der', render: (x) => formatearMoneda(x.pagado) },
              { clave: 'sal', titulo: 'Saldo por pagar', alinear: 'der', valor: (x) => x.saldo, ordenable: true, render: (x) => <span className="font-semibold">{formatearMoneda(x.saldo)}</span> },
            ]} /></section>
          <section><h3 className="mb-2 text-sm font-bold">Anticipos sin conciliar (recepción cerrada)</h3>
            <DataTable<(typeof pagos.anticipos)[number]> filas={pagos.anticipos} clave={(x) => x.id} vacioTitulo="Sin anticipos por conciliar" columnas={[
              { clave: 'n', titulo: 'Anticipo', render: (x) => <Link className="font-semibold text-marca-vino underline" to={`/tesoreria/${x.id}`}>{x.numero}</Link> },
              { clave: 'oc', titulo: 'Orden', render: (x) => e.compras.find((c) => c.id === x.compraId)?.numero },
              { clave: 'imp', titulo: 'Importe', alinear: 'der', render: (x) => formatearMoneda(x.importe) },
              { clave: 'est', titulo: 'Estado', render: (x) => <EstadoBadge estado={x.estado} /> },
            ]} /></section></div>
      )}

      {tab === 'movimientos' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div role="group" aria-label="Tipo de inventario" className="inline-flex overflow-hidden rounded-md border border-concreto-300">
              {([['materia_prima', 'Materias primas'], ['producto_terminado', 'Producto terminado']] as const).map(([v, t]) => <button key={v} aria-pressed={vistaMov === v} onClick={() => setVistaMov(v)} className={`px-3 py-1.5 text-sm font-semibold ${vistaMov === v ? 'bg-marca-vino text-white' : 'bg-superficie'}`}>{t}</button>)}
            </div>
            <ExportarReporte nombre={`movimientos_${vistaMov}`} filasCsv={() => [['Fecha', 'Tipo', 'SKU', 'Origen', 'Destino', 'Cantidad', 'Documento', 'Usuario'], ...movs.map((m) => [m.fecha, m.tipo, m.sku, m.bodegaOrigenId ?? '', m.bodegaDestinoId ?? '', m.cantidadBase, `${m.documentoTipo} ${m.documentoId}`, nombre(m.usuarioId)])]} />
          </div>
          <DataTable columnas={colsMov} filas={movs} clave={(m) => m.id} vacioTitulo="Sin movimientos para los filtros" tamPagina={12} />
        </div>
      )}

      {tab === 'traza' && (
        <div className="space-y-4">
          <section className="tarjeta space-y-2 p-4">
            <label className="etiqueta" htmlFor="tz-doc">Número de documento (SOL, OC, PAG, REC, FAB o FT, TRS, DSP)</label>
            <div className="flex flex-wrap gap-2"><input id="tz-doc" className="campo max-w-xs" placeholder="OC-0001" value={busqueda} onChange={(ev) => setBusqueda(ev.target.value)} onKeyDown={(ev) => ev.key === 'Enter' && setConsultado(busqueda)} />
              <button className="btn-primario" onClick={() => setConsultado(busqueda)}><Search size={14} /> Buscar</button>
              {['OC-0001', 'FT-001', 'SOL-0001'].map((d) => <button key={d} className="btn-fantasma border border-concreto-300 text-xs" onClick={() => { setBusqueda(d); setConsultado(d); }}>{d}</button>)}</div>
          </section>
          {consultado && !cadena && <p role="alert" className="tarjeta p-4 text-sm text-error">No se encontró el documento {consultado.toUpperCase()}.</p>}
          {cadena && (
            <section className="tarjeta space-y-3 p-4" aria-label="Cadena del documento">
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-bold">Cadena de {cadena.raiz} ({cadena.pasos.length} pasos)</h3><ExportarReporte nombre={`trazabilidad_${cadena.raiz}`} filasCsv={() => [['Fecha', 'Etapa', 'Documento', 'Estado', 'Usuario', 'Observación'], ...cadena.pasos.map((p) => [p.fecha, p.etapa, p.numero, p.estado, nombre(p.usuarioId), p.observacion ?? ''])]} /></div>
              <ol className="relative ml-2 border-l-2 border-concreto-300">
                {cadena.pasos.map((p, i) => (
                  <li key={i} className="mb-4 ml-4">
                    <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-marca-amarillo ring-2 ring-white" aria-hidden="true" />
                    {i > 0 && <p className="mb-1 text-xs italic text-concreto-600">{tiempoEntre(cadena.pasos[i - 1].fecha, p.fecha)}{new Date(p.fecha) >= new Date(cadena.pasos[i - 1].fecha) ? ' desde la etapa anterior' : ''}</p>}
                    <p className="text-sm"><span className="font-semibold">{p.etapa}</span> - <Link className="text-marca-vino underline" to={p.ruta}>{p.numero}</Link> <EstadoBadge estado={p.estado} /></p>
                    <p className="text-xs text-concreto-600">{formatearFechaHora(p.fecha)} - {nombre(p.usuarioId)}{p.observacion ? ` - ${p.observacion}` : ''}{p.nota ? ` (${p.nota})` : ''}</p>
                  </li>))}
              </ol>
              <p className="text-xs text-concreto-600">Los vínculos entre compra, fabricación, traslado y despacho se infieren por SKU y se marcan en cada paso.</p>
            </section>)}
        </div>
      )}

      {tab === 'alertas' && (
        <div className="space-y-4">
          <section className="tarjeta space-y-3 p-4"><h3 className="text-base font-bold">Umbrales de alerta</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className="etiqueta" htmlFor="al-pct">Alerta de stock (% del mínimo)</label><input id="al-pct" inputMode="numeric" className="campo" value={umbral} onChange={(ev) => setUmbral(ev.target.value)} /></div>
              <div><label className="etiqueta" htmlFor="al-dias">Días de tolerancia de recepción vencida</label><input id="al-dias" inputMode="numeric" className="campo" value={dias} onChange={(ev) => setDias(ev.target.value)} /></div>
              <div className="flex items-end"><BotonConPermiso variante="primario" permitido={permisoParam} motivo="Solo el Administrador modifica los parámetros" onClick={guardarUmbral}>Aplicar umbrales</BotonConPermiso></div>
            </div>
            <p className="text-xs text-concreto-600">100 % alerta cuando el disponible baja del mínimo; 150 % alerta antes. Se guarda en Administración, Parámetros.</p></section>
          <section className="space-y-2"><h3 className="text-base font-bold">Alertas activas ({alertas.length})</h3>
            {alertas.length === 0 ? <p className="text-sm text-concreto-600">Sin alertas.</p> : <div className="grid gap-2 md:grid-cols-2">{alertas.map((a) => <AlertaInventario key={a.id} alerta={a} />)}</div>}
            <ExportarReporte nombre="alertas" filasCsv={() => [['Tipo', 'Detalle'], ...alertas.map((a) => [a.tipo, `${a.titulo}: ${a.detalle}`])]} /></section>
        </div>
      )}
    </div>
  );
}

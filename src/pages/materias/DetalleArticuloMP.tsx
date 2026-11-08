import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import DataTable, { type Columna } from '../../components/DataTable';
import EstadoVacio from '../../components/EstadoVacio';
import FiltrosBar from '../../components/FiltrosBar';
import PageHeader from '../../components/PageHeader';
import SemaforoStock from '../../components/SemaforoStock';
import { formatearFecha, formatearFechaHora, formatearNumero } from '../../lib/formato';
import { equivalenciaTexto, formatearCantidad, simbolo } from '../../lib/unidades';
import { stockPorSku } from '../../store/selectores';
import { efectoMovimiento } from '../../store/selectoresFase3';
import { useStore } from '../../store/useStore';
import type { Movimiento, TipoMovimiento } from '../../types';

const ETIQUETA_TIPO: Record<TipoMovimiento, string> = {
  entrada_compra: 'Entrada por compra', salida_fabricacion: 'Salida a fabricación', entrada_fabricacion: 'Entrada de fabricación', traslado_salida: 'Traslado (salida)',
  traslado_entrada: 'Traslado (entrada)', salida_venta: 'Salida por venta', salida_despacho: 'Salida por despacho', ajuste: 'Ajuste',
};

// Detalle de una materia prima: existencias, receta de uso, proveedores, grafico e historial de movimientos (RF-29)
export default function DetalleArticuloMP({ sku }: { sku: string }) {
  const e = useStore();
  const art = e.articulos.find((a) => a.sku === sku && a.tipo === 'materia_prima');
  const [tipo, setTipo] = useState('todos');
  const [bodega, setBodega] = useState('todas');
  const [responsable, setResponsable] = useState('todos');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const movs = useMemo(() => e.movimientos.filter((m) => m.sku === sku).sort((a, b) => b.fecha.localeCompare(a.fecha)), [e.movimientos, sku]);
  const filtrados = movs.filter((m) =>
    (tipo === 'todos' || m.tipo === tipo) && (bodega === 'todas' || m.bodegaOrigenId === bodega || m.bodegaDestinoId === bodega) &&
    (responsable === 'todos' || m.usuarioId === responsable) && (!desde || m.fecha.slice(0, 10) >= desde) && (!hasta || m.fecha.slice(0, 10) <= hasta));

  // Evolucion de la existencia total en los ultimos 30 dias (suma de movimientos)
  const serie = useMemo(() => {
    const ordenados = [...movs].reverse();
    const dias = 30; const hoy = new Date();
    return Array.from({ length: dias }, (_, i) => {
      const d = new Date(hoy.getTime() - (dias - 1 - i) * 86400000); d.setHours(23, 59, 59, 999);
      const total = ordenados.filter((m) => new Date(m.fecha).getTime() <= d.getTime()).reduce((a, m) => a + e.bodegas.reduce((t, b) => t + efectoMovimiento(m, b.id), 0), 0);
      return { dia: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, existencia: Math.round(total * 1000) / 1000 };
    });
  }, [movs, e.bodegas]);

  if (!art) return <EstadoVacio titulo="Materia prima no encontrada" mensaje="Este detalle solo muestra materias primas." accion={<Link className="btn-primario" to="/materias-primas">Volver al inventario</Link>} />;
  const s = stockPorSku(e, sku);
  const pres = art.presentaciones[0];
  const usadoEn = e.articulos.filter((a) => a.tipo === 'producto_terminado' && a.receta?.some((r) => r.sku === sku));
  const proveedores = [...new Set(e.compras.filter((c) => c.lineas.some((l) => l.sku === sku)).map((c) => c.proveedorId))].map((id) => e.proveedores.find((p) => p.id === id)).filter(Boolean);
  const nombre = (id: string) => e.usuarios.find((u) => u.id === id)?.nombre ?? id;
  const bodegaCod = (id?: string) => e.bodegas.find((b) => b.id === id)?.codigo ?? '-';
  const base = simbolo(art.unidadBaseId);
  const enPres = (v: number) => (pres ? `${formatearNumero(Math.abs(v) / pres.factorABase, 2)} ${simbolo(pres.unidadId)}` : '-');

  const enlace = (m: Movimiento) => {
    if (m.documentoId === 'saldo-inicial') return <span className="text-concreto-600">Saldo inicial</span>;
    const ruta = m.documentoTipo === 'Recepción' ? `/recepcion/${e.recepciones.find((r) => r.id === m.documentoId)?.compraId ?? ''}` : m.documentoTipo === 'Ajuste' ? `/materias-primas?doc=${m.documentoId}`
      : m.documentoTipo === 'Fabricación' ? `/fabricacion/${m.documentoId}` : m.documentoTipo === 'Traslado' ? `/traslados/${m.documentoId}` : `/ventas/${m.documentoId}`;
    const num = m.documentoTipo === 'Recepción' ? e.recepciones.find((r) => r.id === m.documentoId)?.numero : m.documentoId.toUpperCase();
    return <Link className="font-semibold text-marca-vino underline" to={ruta}>{num ?? m.documentoId}</Link>;
  };
  const columnas: Columna<Movimiento>[] = [
    { clave: 'fecha', titulo: 'Fecha', ordenable: true, valor: (m) => m.fecha, render: (m) => formatearFechaHora(m.fecha) },
    { clave: 'tipo', titulo: 'Tipo', render: (m) => ETIQUETA_TIPO[m.tipo] },
    { clave: 'bod', titulo: 'Origen / destino', render: (m) => `${bodegaCod(m.bodegaOrigenId)} a ${bodegaCod(m.bodegaDestinoId)}` },
    { clave: 'cant', titulo: 'Cantidad (base)', alinear: 'der', render: (m) => { const neg = ['salida_fabricacion', 'traslado_salida', 'salida_venta', 'salida_despacho'].includes(m.tipo) || (m.tipo === 'ajuste' && m.cantidadBase < 0); return <span className={`tabular-nums font-semibold ${neg ? 'text-error' : 'text-ok'}`}>{neg ? '-' : '+'}{formatearCantidad(Math.abs(m.cantidadBase), art.unidadBaseId)}</span>; } },
    { clave: 'pres', titulo: 'En presentación', alinear: 'der', render: (m) => <span className="tabular-nums text-xs">{enPres(m.cantidadBase)}</span> },
    { clave: 'doc', titulo: 'Documento', render: enlace },
    { clave: 'resp', titulo: 'Responsable', render: (m) => nombre(m.usuarioId) },
    { clave: 'obs', titulo: 'Observación', render: (m) => <span className="text-xs text-concreto-600">{m.observacion ?? ''}</span> },
  ];
  const responsables = [...new Set(movs.map((m) => m.usuarioId))];

  return (
    <div>
      <PageHeader titulo={`${art.sku} - ${art.nombre}`} migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Materias primas', ruta: '/materias-primas' }, { texto: art.sku }]} acciones={<SemaforoStock disponible={s.disponible} minimo={art.stockMinimo} />}
        subtitulo={`Categoría ${art.categoria}. Unidad base ${base}.${pres ? ` Presentación: ${equivalenciaTexto(1, pres.unidadId, art)}.` : ''}`} />
      <div className="space-y-4">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Existencias por bodega">
          {e.bodegas.filter((b) => b.activa).map((b) => {
            const x = e.existencias.find((y) => y.sku === sku && y.bodegaId === b.id);
            return <div key={b.id} className="tarjeta p-3"><p className="text-xs font-semibold text-concreto-600">{b.nombre}</p><p className="text-lg font-bold tabular-nums">{formatearCantidad(x?.fisica ?? 0, art.unidadBaseId)}</p><p className="text-xs text-concreto-600">{enPres(x?.fisica ?? 0)}</p></div>;
          })}
          <div className="tarjeta p-3"><p className="text-xs font-semibold text-concreto-600">Total / disponible / mínimo</p><p className="text-lg font-bold tabular-nums">{formatearNumero(s.fisica, 2)} / {formatearNumero(s.disponible, 2)} / {formatearNumero(art.stockMinimo, 2)}</p><p className="text-xs text-concreto-600">{base}</p></div>
        </section>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="tarjeta p-4"><h3 className="mb-2 text-base font-bold">Receta de uso</h3>
            {usadoEn.length === 0 ? <p className="text-sm text-concreto-600">No se consume en ninguna receta registrada.</p> : (
              <ul className="space-y-1 text-sm">{usadoEn.map((p) => <li key={p.sku}><strong>{p.sku}</strong> {p.nombre}: {p.receta!.find((r) => r.sku === sku)!.cantidadBase} {base} por unidad</li>)}</ul>)}
            <h3 className="mb-2 mt-4 text-base font-bold">Proveedores asociados</h3>
            {proveedores.length === 0 ? <p className="text-sm text-concreto-600">Aún no hay compras de este artículo.</p> : <ul className="space-y-1 text-sm">{proveedores.map((p) => <li key={p!.id}>{p!.nombre} <span className="text-xs text-concreto-600">- entrega en {p!.diasEntrega} días</span></li>)}</ul>}
          </section>
          <section className="tarjeta p-4"><h3 className="mb-2 text-base font-bold">Existencia total, últimos 30 días</h3>
            <div className="h-48"><ResponsiveContainer width="100%" height="100%"><LineChart data={serie} margin={{ left: -10, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D6D3CE" vertical={false} /><XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#6F6A64' }} interval={4} /><YAxis tick={{ fontSize: 11, fill: '#6F6A64' }} /><Tooltip />
              <Line type="stepAfter" dataKey="existencia" name={`Existencia (${base})`} stroke="#6B1F3B" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
          </section>
        </div>
        <section>
          <h3 className="mb-2 text-base font-bold">Historial de movimientos</h3>
          <FiltrosBar onLimpiar={() => { setTipo('todos'); setBodega('todas'); setResponsable('todos'); setDesde(''); setHasta(''); }} filtros={[
            { clave: 'tipo', etiqueta: 'Tipo', valor: tipo, opciones: [{ valor: 'todos', texto: 'Todos' }, ...Object.entries(ETIQUETA_TIPO).map(([valor, texto]) => ({ valor, texto }))], onChange: setTipo },
            { clave: 'bod', etiqueta: 'Bodega', valor: bodega, opciones: [{ valor: 'todas', texto: 'Todas' }, ...e.bodegas.map((b) => ({ valor: b.id, texto: b.codigo }))], onChange: setBodega },
            { clave: 'resp', etiqueta: 'Responsable', valor: responsable, opciones: [{ valor: 'todos', texto: 'Todos' }, ...responsables.map((id) => ({ valor: id, texto: nombre(id) }))], onChange: setResponsable },
          ]}>
            <div><label className="etiqueta" htmlFor="mv-desde">Desde</label><input id="mv-desde" type="date" className="campo" value={desde} onChange={(ev) => setDesde(ev.target.value)} /></div>
            <div><label className="etiqueta" htmlFor="mv-hasta">Hasta</label><input id="mv-hasta" type="date" className="campo" value={hasta} onChange={(ev) => setHasta(ev.target.value)} /></div>
          </FiltrosBar>
          <DataTable columnas={columnas} filas={filtrados} clave={(m) => m.id} tamPagina={10} vacioTitulo="Sin movimientos para este filtro" />
          <p className="mt-2 text-xs text-concreto-600">Última actualización del inventario de este artículo: {movs[0] ? formatearFecha(movs[0].fecha) : '-'}.</p>
        </section>
      </div>
    </div>
  );
}

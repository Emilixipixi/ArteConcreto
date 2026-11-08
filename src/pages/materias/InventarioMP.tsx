import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Settings, SlidersHorizontal, XCircle } from 'lucide-react';
import AlertaInventario from '../../components/AlertaInventario';
import BotonConPermiso from '../../components/BotonConPermiso';
import DataTable, { type Columna } from '../../components/DataTable';
import EstadoBadge from '../../components/EstadoBadge';
import FiltrosBar from '../../components/FiltrosBar';
import Modal from '../../components/Modal';
import ModalConfirmar from '../../components/ModalConfirmar';
import ModalObservacion from '../../components/ModalObservacion';
import PageHeader from '../../components/PageHeader';
import SemaforoStock, { nivelStock } from '../../components/SemaforoStock';
import { formatearFechaHora } from '../../lib/formato';
import { puede, reglaSegregacion, tieneAlgunRol } from '../../lib/permisos';
import { formatearCantidad, simbolo } from '../../lib/unidades';
import { alertasInventario, stockPorSku, useUsuarioActual } from '../../store/selectores';
import { unidadCompraDe } from '../../store/selectoresFase3';
import { useStore } from '../../store/useStore';
import type { Ajuste, Articulo } from '../../types';
import BotonesDocumento from '../../components/BotonesDocumento';
import { fichaAjuste } from '../../lib/documentosDatos';
import DetalleArticuloMP from './DetalleArticuloMP';

interface Fila { articulo: Articulo; porBodega: Record<string, number>; total: number; comprometida: number; disponible: number; minimo: number }

const TIPOS_AJUSTE: { valor: NonNullable<Ajuste['tipoAjuste']>; texto: string }[] = [
  { valor: 'merma', texto: 'Merma' }, { valor: 'conteo_fisico', texto: 'Conteo físico' }, { valor: 'correccion', texto: 'Corrección' },
];

// P-10 Inventario de materias primas (RN-05, CA-06): nunca muestra producto terminado
export default function InventarioMP() {
  const [params] = useSearchParams();
  const sku = params.get('sku');
  if (sku) return <DetalleArticuloMP sku={sku} />;
  return <ListaMP docInicial={params.get('doc')} />;
}

function ListaMP({ docInicial }: { docInicial: string | null }) {
  const e = useStore();
  const u = useUsuarioActual()!;
  const [bodegaFiltro, setBodegaFiltro] = useState<string | null>(null);
  const [categoria, setCategoria] = useState('todas');
  const [semaforo, setSemaforo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [unidadCompra, setUnidadCompra] = useState(false);
  const [modalAjuste, setModalAjuste] = useState(false);
  const [skuAjuste, setSkuAjuste] = useState('');
  const [decision, setDecision] = useState<{ id: string; tipo: 'aprobar' | 'rechazar' } | null>(null);
  const bodega = bodegaFiltro ?? e.bodegaActivaId; // respeta el selector de la topbar
  const bodegasVisibles = e.bodegas.filter((b) => b.activa && (bodega === 'todas' || b.id === bodega));

  const mps = useMemo(() => e.articulos.filter((a) => a.tipo === 'materia_prima' && a.activo), [e.articulos]);
  const categorias = [...new Set(mps.map((a) => a.categoria))];
  const filas: Fila[] = useMemo(() => mps.map((a) => {
    const s = stockPorSku(e, a.sku, bodega);
    const porBodega: Record<string, number> = {};
    for (const b of e.bodegas) porBodega[b.id] = e.existencias.find((x) => x.sku === a.sku && x.bodegaId === b.id)?.fisica ?? 0;
    return { articulo: a, porBodega, total: s.fisica, comprometida: s.comprometida, disponible: s.disponible, minimo: a.stockMinimo };
  }).filter((f) =>
    (categoria === 'todas' || f.articulo.categoria === categoria) &&
    (semaforo === 'todos' || nivelStock(f.disponible, f.minimo) === semaforo) &&
    (!busqueda || `${f.articulo.sku} ${f.articulo.nombre}`.toLowerCase().includes(busqueda.toLowerCase())),
  ), [e, mps, bodega, categoria, semaforo, busqueda]);

  // RF-28: el conmutador cambia entre unidad base y unidad de compra (presentacion principal)
  const cant = (skuA: string, base: number) => {
    const a = e.articulos.find((x) => x.sku === skuA)!;
    if (!unidadCompra) return formatearCantidad(base, a.unidadBaseId);
    const uc = unidadCompraDe(e, skuA);
    return `${new Intl.NumberFormat('es-EC', { maximumFractionDigits: 2 }).format(base / uc.factor)} ${simbolo(uc.unidadId)}`;
  };

  const alertas = alertasInventario(e).filter((a) => a.tipo !== 'recepcion_vencida' && a.sku && mps.some((m) => m.sku === a.sku));
  const columnas: Columna<Fila>[] = [
    { clave: 'sku', titulo: 'Artículo', ordenable: true, valor: (f) => f.articulo.sku, render: (f) => <Link className="font-semibold text-marca-vino underline" to={`/materias-primas?sku=${f.articulo.sku}`}>{f.articulo.sku}<span className="block text-xs font-normal text-texto no-underline">{f.articulo.nombre}</span></Link> },
    ...bodegasVisibles.map((b): Columna<Fila> => ({ clave: `b-${b.id}`, titulo: b.codigo, alinear: 'der', valor: (f) => f.porBodega[b.id], render: (f) => <span className="whitespace-nowrap tabular-nums">{cant(f.articulo.sku, f.porBodega[b.id])}</span> })),
    { clave: 'total', titulo: 'Total', alinear: 'der', ordenable: true, valor: (f) => f.total, render: (f) => <span className="whitespace-nowrap font-semibold tabular-nums">{cant(f.articulo.sku, f.total)}</span> },
    { clave: 'comp', titulo: 'Comprometida', alinear: 'der', render: (f) => <span className="whitespace-nowrap tabular-nums">{cant(f.articulo.sku, f.comprometida)}</span> },
    { clave: 'disp', titulo: 'Disponible', alinear: 'der', ordenable: true, valor: (f) => f.disponible, render: (f) => <span className="whitespace-nowrap tabular-nums">{cant(f.articulo.sku, f.disponible)}</span> },
    { clave: 'min', titulo: 'Mínimo', alinear: 'der', render: (f) => <span className="whitespace-nowrap tabular-nums text-concreto-600">{cant(f.articulo.sku, f.minimo)}</span> },
    { clave: 'sem', titulo: 'Semáforo', render: (f) => <SemaforoStock disponible={f.disponible} minimo={f.minimo} /> },
    { clave: 'acc', titulo: 'Acciones', render: (f) => <span className="inline-flex gap-1"><Link className="btn-secundario !py-1 text-xs" to={`/materias-primas?sku=${f.articulo.sku}`}>Detalle</Link>
      <BotonConPermiso className="!py-1 text-xs" permitido={puede(u, 'ajuste.crear')} motivo="Solo Almacén registra ajustes" onClick={() => { setSkuAjuste(f.articulo.sku); setModalAjuste(true); }}>Ajustar</BotonConPermiso></span> },
  ];

  const ajustes = e.ajustes.filter((a) => e.articulos.find((x) => x.sku === a.sku)?.tipo === 'materia_prima');
  const abrirDecision = docInicial && docInicial !== 'nuevo' ? ajustes.find((a) => a.id === docInicial) : undefined;
  return (
    <div>
      <PageHeader titulo="Inventario de materias primas" migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Materias primas' }]}
        subtitulo="Solo insumos. El producto terminado se gestiona en su propia pantalla."
        acciones={<BotonConPermiso variante="primario" permitido={puede(u, 'ajuste.crear')} motivo="Solo Almacén registra ajustes de inventario" onClick={() => setModalAjuste(true)}><SlidersHorizontal size={15} /> Registrar ajuste</BotonConPermiso>} />

      {alertas.length > 0 && (
        <section className="mb-4 grid gap-2 sm:grid-cols-2" aria-label="Alertas de inventario">
          {alertas.map((a) => <AlertaInventario key={a.id} alerta={a} />)}
        </section>
      )}

      <FiltrosBar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="SKU o nombre" onLimpiar={() => { setBodegaFiltro('todas'); setCategoria('todas'); setSemaforo('todos'); setBusqueda(''); }} filtros={[
        { clave: 'bod', etiqueta: 'Bodega', valor: bodega, opciones: [{ valor: 'todas', texto: 'Todas' }, ...e.bodegas.map((b) => ({ valor: b.id, texto: b.nombre }))], onChange: setBodegaFiltro },
        { clave: 'cat', etiqueta: 'Categoría', valor: categoria, opciones: [{ valor: 'todas', texto: 'Todas' }, ...categorias.map((c) => ({ valor: c, texto: c }))], onChange: setCategoria },
        { clave: 'sem', etiqueta: 'Semáforo', valor: semaforo, opciones: [{ valor: 'todos', texto: 'Todos' }, { valor: 'ok', texto: 'Suficiente' }, { valor: 'bajo', texto: 'Bajo mínimo' }, { valor: 'agotado', texto: 'Agotado' }], onChange: setSemaforo },
      ]}>
        <div>
          <span className="etiqueta">Mostrar cantidades en</span>
          <div role="group" aria-label="Unidad de visualización" className="inline-flex overflow-hidden rounded-md border border-concreto-300 text-sm">
            <button aria-pressed={!unidadCompra} className={`px-3 py-2 ${!unidadCompra ? 'bg-marca-vino text-white' : 'bg-superficie'}`} onClick={() => setUnidadCompra(false)}>Unidad base</button>
            <button aria-pressed={unidadCompra} className={`px-3 py-2 ${unidadCompra ? 'bg-marca-vino text-white' : 'bg-superficie'}`} onClick={() => setUnidadCompra(true)}>Unidad de compra</button>
          </div>
        </div>
      </FiltrosBar>

      <DataTable columnas={columnas} filas={filas} clave={(f) => f.articulo.sku} tamPagina={12} vacioTitulo="Sin materias primas para este filtro" />

      {tieneAlgunRol(u, ['director', 'admin']) && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-concreto-600"><Settings size={13} aria-hidden="true" /> Umbrales vigentes: recepción vencida a los {e.parametros.diasRecepcionVencida} días, compras sobre {e.parametros.umbralCompra} USD a Gerencia. <Link className="font-semibold text-marca-vino underline" to="/administracion">Configurar en Administración</Link></p>
      )}

      <section className="mt-6" aria-label="Ajustes de inventario">
        <h2 className="mb-2 text-base font-bold">Ajustes de inventario</h2>
        <p className="mb-2 text-xs text-concreto-600">Un ajuste no modifica el stock hasta que el Director lo aprueba.</p>
        <DataTable<Ajuste> columnas={[
          { clave: 'numero', titulo: 'Ajuste', render: (a) => <span className="font-semibold text-marca-vino">{a.numero}</span> },
          { clave: 'sku', titulo: 'SKU / Bodega', render: (a) => <span>{a.sku} - {e.bodegas.find((b) => b.id === a.bodegaId)?.codigo}</span> },
          { clave: 'tipo', titulo: 'Tipo', render: (a) => TIPOS_AJUSTE.find((t) => t.valor === a.tipoAjuste)?.texto ?? '-' },
          { clave: 'cant', titulo: 'Cantidad', alinear: 'der', render: (a) => <span className={`tabular-nums font-semibold ${a.cantidadBase < 0 ? 'text-error' : 'text-ok'}`}>{a.cantidadBase > 0 ? '+' : ''}{formatearCantidad(a.cantidadBase, e.articulos.find((x) => x.sku === a.sku)?.unidadBaseId ?? '')}</span> },
          { clave: 'motivo', titulo: 'Motivo', render: (a) => <span className="text-xs">{a.motivo}</span> },
          { clave: 'estado', titulo: 'Estado', render: (a) => <EstadoBadge estado={a.estado} /> },
          { clave: 'fecha', titulo: 'Fecha', render: (a) => <span className="text-xs text-concreto-600">{formatearFechaHora(a.creadoEn)}</span> },
          { clave: 'doc', titulo: 'Documento', render: (a) => <BotonesDocumento ficha={() => fichaAjuste(e, a)} /> },
          { clave: 'acc', titulo: 'Decisión', render: (a) => {
            if (a.estado !== 'pendiente') return <span className="text-xs text-concreto-600">{e.usuarios.find((x) => x.id === a.historial[a.historial.length - 1]?.usuarioId)?.nombre}</span>;
            const r = reglaSegregacion(u, a, 'ajuste.aprobar');
            return <span className="inline-flex gap-1">
              <BotonConPermiso className="!py-1 text-xs" variante="primario" permitido={r.permitido} motivo={r.motivo} onClick={() => setDecision({ id: a.id, tipo: 'aprobar' })}><CheckCircle2 size={13} /> Aprobar</BotonConPermiso>
              <BotonConPermiso className="!py-1 text-xs" permitido={r.permitido} motivo={r.motivo} onClick={() => setDecision({ id: a.id, tipo: 'rechazar' })}><XCircle size={13} /> Rechazar</BotonConPermiso></span>;
          } },
        ]} filas={ajustes} clave={(a) => a.id} resaltar={(a) => a.id === abrirDecision?.id} vacioTitulo="Sin ajustes registrados" />
      </section>

      <FormularioAjuste abierto={modalAjuste} skuInicial={skuAjuste} onCerrar={() => { setModalAjuste(false); setSkuAjuste(''); }} />
      <ModalConfirmar abierto={decision?.tipo === 'aprobar'} titulo="Aprobar ajuste" mensaje="Al aprobar se genera el movimiento de ajuste y el stock cambia de inmediato." textoConfirmar="Aprobar" onCerrar={() => setDecision(null)}
        onConfirmar={() => { const r = e.decidirAjuste(decision!.id, 'aprobar'); if (!r.ok) e.mostrarToast(r.error ?? 'No se pudo aprobar', 'error'); }} />
      <ModalObservacion abierto={decision?.tipo === 'rechazar'} titulo="Rechazar ajuste" textoConfirmar="Rechazar" peligro minimo={10} onCerrar={() => setDecision(null)}
        onConfirmar={(obs) => { const r = e.decidirAjuste(decision!.id, 'rechazar', obs); if (!r.ok) e.mostrarToast(r.error ?? 'No se pudo rechazar', 'error'); }} />
    </div>
  );
}

function FormularioAjuste({ abierto, skuInicial, onCerrar }: { abierto: boolean; skuInicial: string; onCerrar: () => void }) {
  const e = useStore();
  const mps = e.articulos.filter((a) => a.tipo === 'materia_prima' && a.activo);
  const [sku, setSku] = useState('');
  const [bodegaId, setBodegaId] = useState('b1');
  const [tipo, setTipo] = useState<NonNullable<Ajuste['tipoAjuste']>>('merma');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [tocado, setTocado] = useState(false);
  const skuSel = sku || skuInicial || mps[0]?.sku || '';
  const art = mps.find((a) => a.sku === skuSel);
  const fisica = e.existencias.find((x) => x.sku === skuSel && x.bodegaId === bodegaId)?.fisica ?? 0;
  const n = parseFloat(cantidad.replace(',', '.'));
  // Una merma siempre resta; el signo se asume negativo si el usuario escribe un valor positivo
  const firmada = tipo === 'merma' && n > 0 ? -n : n;
  const err = !isFinite(n) || n === 0 ? 'Indica una cantidad distinta de cero (con signo)' : fisica + firmada < 0 ? `Dejaría la existencia en negativo (hay ${fisica})` : null;
  const errMotivo = motivo.trim().length < 5 ? 'El motivo es obligatorio' : null;
  const cerrar = () => { setCantidad(''); setMotivo(''); setTocado(false); setSku(''); onCerrar(); };
  const guardar = () => {
    setTocado(true);
    if (err || errMotivo) return;
    const r = e.crearAjuste({ sku: skuSel, bodegaId, cantidadBase: firmada, motivo, tipoAjuste: tipo });
    if (!r.ok) return e.mostrarToast(r.error ?? 'No se pudo registrar', 'error');
    cerrar();
  };
  return (
    <Modal abierto={abierto} titulo="Registrar ajuste de inventario" onCerrar={cerrar}
      pie={<><button className="btn-fantasma" onClick={cerrar}>Cancelar</button><button className="btn-primario" onClick={guardar}>Enviar al director</button></>}>
      <div className="space-y-3">
        <div><label className="etiqueta" htmlFor="aj-sku">Materia prima</label>
          <select id="aj-sku" className="campo" value={skuSel} onChange={(ev) => setSku(ev.target.value)}>{mps.map((a) => <option key={a.sku} value={a.sku}>{a.sku} - {a.nombre}</option>)}</select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="etiqueta" htmlFor="aj-bod">Bodega</label>
            <select id="aj-bod" className="campo" value={bodegaId} onChange={(ev) => setBodegaId(ev.target.value)}>{e.bodegas.filter((b) => b.activa).map((b) => <option key={b.id} value={b.id}>{b.codigo}</option>)}</select></div>
          <div><label className="etiqueta" htmlFor="aj-tipo">Tipo</label>
            <select id="aj-tipo" className="campo" value={tipo} onChange={(ev) => setTipo(ev.target.value as NonNullable<Ajuste['tipoAjuste']>)}>{TIPOS_AJUSTE.map((t) => <option key={t.valor} value={t.valor}>{t.texto}</option>)}</select></div>
        </div>
        <div><label className="etiqueta" htmlFor="aj-cant">Cantidad con signo en {art ? simbolo(art.unidadBaseId) : 'unidad base'} (negativo = merma)</label>
          <input id="aj-cant" inputMode="decimal" className={`campo ${tocado && err ? 'border-error' : ''}`} value={cantidad} onChange={(ev) => setCantidad(ev.target.value)} placeholder="-4" />
          <p className="mt-1 text-xs text-concreto-600">Existencia actual en esa bodega: {fisica} {art ? simbolo(art.unidadBaseId) : ''}</p>
          {tocado && err && <p className="mt-1 text-xs text-error">{err}</p>}</div>
        <div><label className="etiqueta" htmlFor="aj-mot">Motivo (obligatorio)</label>
          <textarea id="aj-mot" className={`campo min-h-[72px] ${tocado && errMotivo ? 'border-error' : ''}`} value={motivo} onChange={(ev) => setMotivo(ev.target.value)} />
          {tocado && errMotivo && <p className="mt-1 text-xs text-error">{errMotivo}</p>}</div>
        <p className="text-xs text-concreto-600">El stock no cambia hasta que el Director apruebe el ajuste.</p>
      </div>
    </Modal>
  );
}

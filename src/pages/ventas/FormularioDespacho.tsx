import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import BotonConPermiso from '../../components/BotonConPermiso';
import BuscadorArticulo from '../../components/BuscadorArticulo';
import PageHeader from '../../components/PageHeader';
import { puede } from '../../lib/permisos';
import { useUsuarioActual } from '../../store/selectores';
import { disponibleTerminado, reservasActivas } from '../../store/selectoresFase4';
import { useStore } from '../../store/useStore';
import type { Despacho } from '../../types';

interface Linea { sku: string; cant: string }

// P-14 Formulario de salida (RF-38, RF-41): disponible en vivo por linea y bloqueo si se excede (RN-10)
export default function FormularioDespacho() {
  const { id } = useParams();
  const e = useStore();
  const u = useUsuarioActual()!;
  const navigate = useNavigate();
  const ex = id ? e.despachos.find((d) => d.id === id) : undefined;
  const bodegas = e.bodegas.filter((b) => b.activa);
  const [canal, setCanal] = useState<'punto_venta' | 'despacho_cliente'>(ex && ex.canal !== 'tienda_en_linea' ? ex.canal : 'despacho_cliente');
  const [bodegaId, setBodegaId] = useState(ex?.bodegaId ?? 'b3');
  const [cliente, setCliente] = useState(ex?.cliente ?? '');
  const [ident, setIdent] = useState(ex?.identificacionCliente ?? '');
  const [destino, setDestino] = useState(ex?.destino ?? '');
  const [ref, setRef] = useState(ex?.documentoReferencia ?? '');
  const [proyecto, setProyecto] = useState(ex?.proyecto ?? '');
  const [reservaId, setReservaId] = useState(ex?.reservaId ?? '');
  const [lineas, setLineas] = useState<Linea[]>(ex?.lineas.map((l) => ({ sku: l.sku, cant: String(l.cantidad) })) ?? [{ sku: '', cant: '1' }]);
  const [intento, setIntento] = useState(false);
  if (id && !ex) return <Navigate to="/ventas" replace />;
  if (ex && (ex.estado !== 'borrador' || ex.canal === 'tienda_en_linea')) return <Navigate to={`/ventas/${ex.id}`} replace />;
  if (!puede(u, 'despacho.crear')) return <Navigate to="/403" replace />;
  const productos = e.articulos.filter((a) => a.tipo === 'producto_terminado' && a.activo);
  const reservas = reservasActivas(e).filter((r) => r.bodegaId === bodegaId);
  const reserva = reservas.find((r) => r.id === reservaId);
  // Con reserva vinculada, sus unidades ya estan comprometidas y cuentan como disponibles para esta salida
  const dispLinea = (sku: string) => disponibleTerminado(e, sku, bodegaId).disponible + (reserva && reserva.sku === sku ? reserva.cantidad : 0);
  const errLinea = (l: Linea): string | null => {
    if (!l.sku) return 'Elige un producto';
    const n = parseInt(l.cant, 10);
    if (!(n > 0) || String(n) !== l.cant.trim()) return 'Cantidad entera mayor que cero';
    const disp = dispLinea(l.sku);
    if (n > disp) return `La cantidad supera el disponible de la bodega (${disp})`;
    if (lineas.filter((x) => x.sku === l.sku).length > 1) return 'Producto repetido';
    return null;
  };
  const errores: Record<string, string> = {};
  if (!cliente.trim()) errores.cliente = 'El cliente es obligatorio';
  if (!ref.trim()) errores.ref = 'El documento de referencia es obligatorio';
  if (canal === 'despacho_cliente' && !destino.trim()) errores.destino = 'Indica la ciudad o dirección de destino';
  const hayErr = Object.keys(errores).length > 0 || lineas.some((l) => errLinea(l));
  const datos = (): Partial<Despacho> => ({ canal, bodegaId, cliente: cliente.trim(), identificacionCliente: ident, destino, documentoReferencia: ref.trim(), proyecto, reservaId: reservaId || undefined, lineas: lineas.map((l) => ({ sku: l.sku, cantidad: parseInt(l.cant, 10) })) });
  const guardar = (enviar: boolean) => {
    setIntento(true); if (hayErr) return;
    const r = ex ? e.actualizarDespacho(ex.id, datos()) : e.crearDespacho(datos());
    if (!r.ok) return e.mostrarToast(r.error ?? 'No se pudo guardar', 'error');
    if (enviar) { const s = e.enviarASalida(r.id!); if (!s.ok) e.mostrarToast(s.error ?? 'No se pudo enviar', 'error'); }
    navigate(`/ventas/${r.id}`);
  };
  const campoErr = (k: string) => intento && errores[k] ? <p className="mt-1 text-xs text-error">{errores[k]}</p> : null;
  return (
    <div>
      <PageHeader titulo={ex ? `Editar ${ex.numero}` : 'Nueva salida'} migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Ventas y despachos', ruta: '/ventas' }, { texto: ex ? ex.numero : 'Nueva' }]} subtitulo="El canal Tienda en línea lo genera la integración simulada y es solo lectura." />
      <div className="space-y-4">
        <section className="tarjeta grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div><label className="etiqueta" htmlFor="ds-canal">Canal</label><select id="ds-canal" className="campo" value={canal} onChange={(ev) => setCanal(ev.target.value as typeof canal)}><option value="punto_venta">Punto de venta</option><option value="despacho_cliente">Despacho a cliente</option></select></div>
          <div><label className="etiqueta" htmlFor="ds-bod">Bodega de salida</label><select id="ds-bod" className="campo" value={bodegaId} onChange={(ev) => { setBodegaId(ev.target.value); setReservaId(''); }}>{bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select></div>
          <div><label className="etiqueta" htmlFor="ds-ref">Documento de referencia</label><input id="ds-ref" className={`campo ${intento && errores.ref ? 'border-error' : ''}`} placeholder="Cotización, orden de compra o remisión" value={ref} onChange={(ev) => setRef(ev.target.value)} />{campoErr('ref')}</div>
          <div><label className="etiqueta" htmlFor="ds-cli">Cliente</label><input id="ds-cli" className={`campo ${intento && errores.cliente ? 'border-error' : ''}`} value={cliente} onChange={(ev) => setCliente(ev.target.value)} />{campoErr('cliente')}</div>
          <div><label className="etiqueta" htmlFor="ds-id">Identificación fiscal (ficticia)</label><input id="ds-id" className="campo" value={ident} onChange={(ev) => setIdent(ev.target.value)} /></div>
          <div><label className="etiqueta" htmlFor="ds-dest">Destino {canal === 'despacho_cliente' ? '' : '(opcional)'}</label><input id="ds-dest" className={`campo ${intento && errores.destino ? 'border-error' : ''}`} placeholder="Ciudad o dirección ficticia" value={destino} onChange={(ev) => setDestino(ev.target.value)} />{campoErr('destino')}</div>
          <div><label className="etiqueta" htmlFor="ds-proy">Proyecto (opcional)</label><input id="ds-proy" className="campo" placeholder="Obra o cliente corporativo" value={proyecto} onChange={(ev) => setProyecto(ev.target.value)} /></div>
          {reservas.length > 0 && <div><label className="etiqueta" htmlFor="ds-res">Reserva vinculada (opcional)</label><select id="ds-res" className="campo" value={reservaId} onChange={(ev) => setReservaId(ev.target.value)}><option value="">Ninguna</option>{reservas.map((r) => <option key={r.id} value={r.id}>{r.numero} - {r.sku} x{r.cantidad} ({r.cliente})</option>)}</select></div>}
        </section>
        <section className="tarjeta space-y-3 p-4">
          <h3 className="text-base font-bold">Productos</h3>
          {lineas.map((l, i) => { const err = errLinea(l); return (
            <div key={i} className="grid items-start gap-2 rounded-md border border-concreto-300 p-2 sm:grid-cols-[1fr_120px_auto]">
              <div><label className="etiqueta">Producto {i + 1}</label><BuscadorArticulo value={l.sku} onChange={(s) => setLineas(lineas.map((x, j) => (j === i ? { ...x, sku: s } : x)))} articulos={productos} />
                {l.sku && <p className={`mt-1 text-xs ${err && err.startsWith('La cantidad supera') ? 'font-semibold text-error' : 'text-concreto-600'}`}>Disponible en bodega: {dispLinea(l.sku)}</p>}</div>
              <div><label className="etiqueta" htmlFor={`ds-c-${i}`}>Cantidad</label><input id={`ds-c-${i}`} inputMode="numeric" className={`campo ${err && l.sku ? 'border-error' : ''}`} value={l.cant} onChange={(ev) => setLineas(lineas.map((x, j) => (j === i ? { ...x, cant: ev.target.value } : x)))} /></div>
              <button aria-label={`Quitar línea ${i + 1}`} disabled={lineas.length === 1} className="mt-6 text-concreto-600 hover:text-error disabled:opacity-40" onClick={() => setLineas(lineas.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
              {err && (intento || l.sku) && <p role="alert" className="text-xs text-error sm:col-span-3">{err}</p>}
            </div>); })}
          <button type="button" className="btn-secundario !py-1 text-xs" onClick={() => setLineas([...lineas, { sku: '', cant: '1' }])}><Plus size={13} /> Agregar producto</button>
        </section>
        <div className="flex flex-wrap justify-end gap-2">
          <Link className="btn-fantasma" to="/ventas">Cancelar</Link>
          <BotonConPermiso permitido={puede(u, 'despacho.crear')} motivo="Solo Ventas registra salidas" onClick={() => guardar(false)}>Guardar borrador</BotonConPermiso>
          <BotonConPermiso variante="primario" permitido={puede(u, 'despacho.crear')} motivo="Solo Ventas registra salidas" onClick={() => guardar(true)}>Enviar a salida</BotonConPermiso>
        </div>
      </div>
    </div>
  );
}

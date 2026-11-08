import { useMemo, useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import BuscadorArticulo from '../../components/BuscadorArticulo';
import BotonConPermiso from '../../components/BotonConPermiso';
import PageHeader from '../../components/PageHeader';
import SelectorUnidad from '../../components/SelectorUnidad';
import { calcularConsumoEstandar, evaluarDesviacion, pctDesvio, validarSuficiencia } from '../../lib/fabricacion';
import { puede } from '../../lib/permisos';
import { siguienteLote } from '../../lib/numeracion';
import { hoyISO } from '../../lib/reglas';
import { aBase, convertir, equivalenciaTexto, formatearCantidad } from '../../lib/unidades';
import { stockPorSku, useUsuarioActual } from '../../store/selectores';
import { useStore } from '../../store/useStore';

interface Captura { unidadId: string; texto: string | null } // texto null = usa el estandar
interface Extra { sku: string; texto: string; unidadId: string; justificacion: string }

// P-11 Formulario de fabricacion (crear / editar borrador): receta estandar, consumo real y suficiencia
export default function FormularioFabricacion() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const e = useStore();
  const u = useUsuarioActual()!;
  const existente = id ? e.fabricaciones.find((f) => f.id === id) : undefined;
  const productos = e.articulos.filter((a) => a.tipo === 'producto_terminado' && a.activo);
  const insumos = e.articulos.filter((a) => a.tipo === 'materia_prima' && a.activo);
  const bodegas = e.bodegas.filter((b) => b.activa);

  const [sku, setSku] = useState(existente?.skuProducto ?? params.get('sku') ?? '');
  const [cantTxt, setCantTxt] = useState(String(existente?.cantidadFabricada ?? params.get('cantidad') ?? '1'));
  const [lote, setLote] = useState(existente?.lote ?? siguienteLote(e.fabricaciones.map((f) => f.lote)));
  const [fecha, setFecha] = useState(existente?.fechaFabricacion.slice(0, 10) ?? hoyISO());
  const [origen, setOrigen] = useState(existente?.bodegaOrigenInsumosId ?? 'b1');
  const [destino, setDestino] = useState(existente?.bodegaDestinoId ?? 'b1');
  const [observacion, setObservacion] = useState(existente?.observacion ?? '');
  // Al editar, los consumos reales guardados se cargan como capturas en unidad base
  const [capturas, setCapturas] = useState<Record<string, Captura>>(() => Object.fromEntries((existente?.consumos ?? []).filter((c) => !c.extra && c.real !== c.estandar).map((c) => [c.sku, { unidadId: e.articulos.find((a) => a.sku === c.sku)!.unidadBaseId, texto: String(c.real) }])));
  const [extras, setExtras] = useState<Extra[]>(() => (existente?.consumos ?? []).filter((c) => c.extra).map((c) => ({ sku: c.sku, texto: String(c.real), unidadId: e.articulos.find((a) => a.sku === c.sku)!.unidadBaseId, justificacion: c.justificacion ?? '' })));
  const [intento, setIntento] = useState(false);

  const cantidad = parseInt(cantTxt, 10);
  const cantidadValida = Number.isInteger(cantidad) && cantidad > 0 && String(cantidad) === cantTxt.trim();
  const estandar = useMemo(() => (sku && cantidadValida ? calcularConsumoEstandar(e.articulos, sku, cantidad) : []), [e.articulos, sku, cantidad, cantidadValida]);

  const art = (s: string) => e.articulos.find((a) => a.sku === s)!;
  const realBase = (s: string, est: number): number => {
    const c = capturas[s]; if (!c || c.texto === null) return est;
    const v = parseFloat(c.texto.replace(',', '.')); return isFinite(v) ? aBase(v, c.unidadId, art(s)) : NaN;
  };
  const consumos = [
    ...estandar.map((x) => ({ sku: x.sku, estandar: x.estandar, real: realBase(x.sku, x.estandar) })),
    ...extras.filter((x) => x.sku).map((x) => { const v = parseFloat(x.texto.replace(',', '.')); return { sku: x.sku, estandar: 0, real: isFinite(v) ? aBase(v, x.unidadId, art(x.sku)) : NaN, extra: true, justificacion: x.justificacion }; }),
  ];
  const consumosValidos = consumos.filter((c) => isFinite(c.real) && c.real >= 0);
  const faltantes = validarSuficiencia(e.existencias, consumosValidos, origen);
  const { desviacionPct, requiereDirector } = evaluarDesviacion(consumosValidos, e.parametros.toleranciaConsumo);
  const tol = e.parametros.toleranciaConsumo;

  if (id && !existente) return <Navigate to="/fabricacion" replace />;
  if (existente && existente.estado !== 'borrador') return <Navigate to={`/fabricacion/${existente.id}`} replace />;
  if (!puede(u, 'fabricacion.registrar')) return <Navigate to="/403" replace />;

  const errores: Record<string, string> = {};
  if (!sku) errores.sku = 'Elige un producto terminado';
  if (!cantidadValida) errores.cantidad = 'La cantidad debe ser un entero mayor que cero';
  if (!lote.trim()) errores.lote = 'El lote es obligatorio'; else if (e.fabricaciones.some((f) => f.lote === lote.trim() && f.id !== existente?.id && f.estado !== 'anulada')) errores.lote = 'Ese lote ya existe';
  if (fecha > hoyISO()) errores.fecha = 'La fecha no puede ser posterior a hoy';
  if (consumos.some((c) => !isFinite(c.real) || c.real < 0)) errores.consumo = 'Revisa los consumos reales: hay valores inválidos';
  if (extras.some((x) => !x.sku || !(parseFloat(x.texto) > 0) || x.justificacion.trim().length < 5)) errores.extra = 'Cada insumo extra necesita insumo, consumo y justificación';
  const hayErr = Object.keys(errores).length > 0;

  const guardar = () => {
    setIntento(true);
    if (hayErr) return;
    const datos = {
      skuProducto: sku, cantidadFabricada: cantidad, lote: lote.trim(), fechaFabricacion: fecha, bodegaOrigenInsumosId: origen, bodegaDestinoId: destino, observacion,
      consumos: consumos.map((c) => ({ ...c, real: Math.round(c.real * 10000) / 10000 })),
    };
    const r = existente ? e.actualizarFabricacion(existente.id, datos) : e.crearFabricacion(datos);
    if (!r.ok) return e.mostrarToast(r.error ?? 'No se pudo guardar', 'error');
    navigate(`/fabricacion/${r.id}`);
  };
  const cambiarUnidad = (s: string, nueva: string, est: number) => {
    const c = capturas[s] ?? { unidadId: art(s).unidadBaseId, texto: null };
    const base = realBase(s, est);
    setCapturas({ ...capturas, [s]: { unidadId: nueva, texto: isFinite(base) ? String(Math.round(convertir(base, art(s).unidadBaseId, nueva, art(s)) * 10000) / 10000) : c.texto } });
  };
  const textoMostrado = (s: string, est: number) => { const c = capturas[s]; if (c && c.texto !== null) return c.texto; const un = c?.unidadId ?? art(s).unidadBaseId; return String(Math.round(convertir(est, art(s).unidadBaseId, un, art(s)) * 10000) / 10000); };

  const filaConsumo = (c: { sku: string; estandar: number; real: number }, extra?: number) => {
    const a = art(c.sku); const unidadId = (extra === undefined ? capturas[c.sku]?.unidadId : extras[extra].unidadId) ?? a.unidadBaseId;
    const pct = pctDesvio(c.estandar, c.real); const fuera = Math.abs(pct) > tol;
    const disp = stockPorSku(e, c.sku, origen).disponible; const falta = isFinite(c.real) && c.real - disp > 1e-9;
    return (
      <tr key={`${c.sku}-${extra ?? 'r'}`} className="border-t border-concreto-300 align-top">
        <td className="px-2 py-2 font-semibold">{c.sku}<span className="block text-xs font-normal text-concreto-600">{a.nombre}{extra !== undefined ? ' (extra)' : ''}</span></td>
        <td className="px-2 py-2 text-right tabular-nums">{formatearCantidad(c.estandar, a.unidadBaseId)}</td>
        <td className="px-2 py-2">
          <div className="flex gap-1">
            <input aria-label={`Consumo real de ${c.sku}`} inputMode="decimal" className="campo w-28"
              value={extra === undefined ? textoMostrado(c.sku, c.estandar) : extras[extra].texto}
              onChange={(ev) => extra === undefined ? setCapturas({ ...capturas, [c.sku]: { unidadId, texto: ev.target.value } }) : setExtras(extras.map((x, j) => (j === extra ? { ...x, texto: ev.target.value } : x)))} />
            <div className="w-24"><SelectorUnidad articulo={a} value={unidadId} onChange={(un) => extra === undefined ? cambiarUnidad(c.sku, un, c.estandar) : setExtras(extras.map((x, j) => (j === extra ? { ...x, unidadId: un } : x)))} /></div>
          </div>
          {isFinite(c.real) && unidadId !== a.unidadBaseId && <p className="mt-1 text-xs text-concreto-600">{equivalenciaTexto(c.real / (aBase(1, unidadId, a)), unidadId, a)}</p>}
        </td>
        <td className="px-2 py-2 text-right"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${fuera ? 'border-aviso/30 bg-aviso/10 text-aviso' : 'border-ok/30 bg-ok/10 text-ok'}`}>{extra !== undefined ? 'Extra' : `${pct > 0 ? '+' : ''}${pct} %`}</span></td>
        <td className={`px-2 py-2 text-right tabular-nums ${falta ? 'font-semibold text-error' : ''}`}>{formatearCantidad(disp, a.unidadBaseId)}{falta && <span className="block text-xs">Faltan {formatearCantidad(c.real - disp, a.unidadBaseId)}</span>}</td>
        {extra !== undefined && <td className="px-2 py-2"><button aria-label={`Quitar ${c.sku}`} className="text-concreto-600 hover:text-error" onClick={() => setExtras(extras.filter((_, j) => j !== extra))}><Trash2 size={15} /></button></td>}
      </tr>
    );
  };

  const enlaceSolicitud = `/solicitudes/nueva?faltantes=${faltantes.map((f) => `${f.sku}:${Math.ceil(f.faltante * 1000) / 1000}`).join(',')}`;
  return (
    <div>
      <PageHeader titulo={existente ? `Editar ${existente.numero}` : 'Nueva fabricación'} migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Fabricación', ruta: '/fabricacion' }, { texto: existente ? existente.numero : 'Nueva' }]} />
      <div className="space-y-4">
        <section className="tarjeta grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2"><label className="etiqueta" htmlFor="fb-prod">Producto terminado</label>
            <BuscadorArticulo value={sku} onChange={(s) => { setSku(s); setCapturas({}); setExtras([]); }} articulos={productos} invalido={intento && !!errores.sku} />
            {intento && errores.sku && <p className="mt-1 text-xs text-error">{errores.sku}</p>}</div>
          <div><label className="etiqueta" htmlFor="fb-cant">Cantidad a fabricar</label>
            <input id="fb-cant" inputMode="numeric" className={`campo ${intento && errores.cantidad ? 'border-error' : ''}`} value={cantTxt} onChange={(ev) => { setCantTxt(ev.target.value); setCapturas({}); }} />
            {errores.cantidad && <p className="mt-1 text-xs text-error">{errores.cantidad}</p>}</div>
          <div><label className="etiqueta" htmlFor="fb-lote">Lote</label>
            <input id="fb-lote" className={`campo ${errores.lote ? 'border-error' : ''}`} value={lote} onChange={(ev) => setLote(ev.target.value)} />
            {errores.lote && <p className="mt-1 text-xs text-error">{errores.lote}</p>}</div>
          <div><label className="etiqueta" htmlFor="fb-fecha">Fecha de fabricación</label><input id="fb-fecha" type="date" max={hoyISO()} className="campo" value={fecha} onChange={(ev) => setFecha(ev.target.value)} />
            {errores.fecha && <p className="mt-1 text-xs text-error">{errores.fecha}</p>}</div>
          <div><label className="etiqueta" htmlFor="fb-orig">Bodega de origen de insumos</label>
            <select id="fb-orig" className="campo" value={origen} onChange={(ev) => setOrigen(ev.target.value)}>{bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select></div>
          <div><label className="etiqueta" htmlFor="fb-dest">Bodega de destino</label>
            <select id="fb-dest" className="campo" value={destino} onChange={(ev) => setDestino(ev.target.value)}>{bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select></div>
        </section>

        <section className="tarjeta space-y-3 p-4">
          <h3 className="text-base font-bold">Insumos consumidos</h3>
          {estandar.length === 0 ? <p className="text-sm text-concreto-600">Elige un producto y una cantidad para autocompletar la receta estándar.</p> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm">
              <thead className="bg-concreto-100 text-xs uppercase text-concreto-600"><tr><th className="px-2 py-2 text-left">Insumo</th><th className="px-2 py-2 text-right">Estándar</th><th className="px-2 py-2 text-left">Consumo real</th><th className="px-2 py-2 text-right">Desvío</th><th className="px-2 py-2 text-right">Disponible en origen</th></tr></thead>
              <tbody>{estandar.map((x) => filaConsumo({ sku: x.sku, estandar: x.estandar, real: realBase(x.sku, x.estandar) }))}{extras.map((x, i) => x.sku && filaConsumo({ sku: x.sku, estandar: 0, real: consumos.find((c) => c.sku === x.sku && (c as { extra?: boolean }).extra)?.real ?? NaN }, i))}</tbody>
            </table></div>
          )}
          {extras.map((x, i) => (
            <div key={i} className="grid gap-2 rounded-md border border-concreto-300 p-2 sm:grid-cols-[1fr_1fr]">
              <div><label className="etiqueta">Insumo extra {i + 1}</label><BuscadorArticulo value={x.sku} onChange={(s) => setExtras(extras.map((y, j) => (j === i ? { ...y, sku: s, unidadId: art(s).unidadBaseId } : y)))} articulos={insumos.filter((m) => !estandar.some((s) => s.sku === m.sku))} /></div>
              <div><label className="etiqueta" htmlFor={`ex-j-${i}`}>Justificación</label><input id={`ex-j-${i}`} className="campo" value={x.justificacion} onChange={(ev) => setExtras(extras.map((y, j) => (j === i ? { ...y, justificacion: ev.target.value } : y)))} /></div>
            </div>
          ))}
          {errores.extra && intento && <p className="text-xs text-error">{errores.extra}</p>}
          {errores.consumo && <p className="text-xs text-error">{errores.consumo}</p>}
          {sku && <button type="button" className="btn-secundario !py-1 text-xs" onClick={() => setExtras([...extras, { sku: '', texto: '', unidadId: '', justificacion: '' }])}><Plus size={13} /> Agregar insumo extra</button>}

          {requiereDirector && <p className="flex items-start gap-2 rounded-md border border-aviso/40 bg-aviso/10 px-3 py-2 text-sm"><AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> El consumo se desvía hasta {desviacionPct} % (tolerancia {tol} %): la fabricación pasará a confirmación del Director.</p>}
          {faltantes.length > 0 && (
            <div role="alert" className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-sm">
              <p className="font-semibold text-error">Insumos insuficientes en la bodega de origen: la confirmación quedará bloqueada.</p>
              <ul className="mt-1 list-disc pl-5">{faltantes.map((f) => <li key={f.sku}>{f.sku}: se necesitan {formatearCantidad(f.requerido, art(f.sku).unidadBaseId)}, hay {formatearCantidad(f.disponible, art(f.sku).unidadBaseId)} (faltan {formatearCantidad(f.faltante, art(f.sku).unidadBaseId)})</li>)}</ul>
              {puede(u, 'solicitud.crear') && <Link className="btn-secundario mt-2 !py-1 text-xs" to={enlaceSolicitud}>Solicitar materiales</Link>}
            </div>
          )}
        </section>
        <section className="tarjeta p-4"><label className="etiqueta" htmlFor="fb-obs">Observación (opcional)</label><textarea id="fb-obs" className="campo min-h-[64px]" value={observacion} onChange={(ev) => setObservacion(ev.target.value)} /></section>
        <div className="flex flex-wrap justify-end gap-2">
          <Link className="btn-fantasma" to="/fabricacion">Cancelar</Link>
          <BotonConPermiso variante="primario" permitido={puede(u, 'fabricacion.registrar')} motivo="Solo Producción registra fabricaciones" onClick={guardar}>Guardar borrador</BotonConPermiso>
        </div>
      </div>
    </div>
  );
}

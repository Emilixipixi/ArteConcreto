import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import BotonConPermiso from '../../components/BotonConPermiso';
import BuscadorArticulo from '../../components/BuscadorArticulo';
import PageHeader from '../../components/PageHeader';
import { puede } from '../../lib/permisos';
import { useUsuarioActual } from '../../store/selectores';
import { disponibleTerminado } from '../../store/selectoresFase4';
import { useStore } from '../../store/useStore';

interface Linea { sku: string; cant: string }

// P-13 Crear traslado (RF-36): origen distinto de destino, cantidades <= disponible en origen
export default function FormularioTraslado() {
  const e = useStore();
  const u = useUsuarioActual()!;
  const navigate = useNavigate();
  const bodegas = e.bodegas.filter((b) => b.activa);
  const [origen, setOrigen] = useState('b1');
  const [destino, setDestino] = useState('b2');
  const [lineas, setLineas] = useState<Linea[]>([{ sku: '', cant: '1' }]);
  const [obs, setObs] = useState('');
  const [intento, setIntento] = useState(false);
  if (!puede(u, 'traslado.crear')) return <Navigate to="/403" replace />;
  const nombreBodega = (id: string) => bodegas.find((b) => b.id === id)?.nombre ?? id;
  const productos = e.articulos.filter((a) => a.tipo === 'producto_terminado' && a.activo);
  const errLinea = (l: Linea): string | null => {
    if (!l.sku) return 'Elige un producto';
    const n = parseInt(l.cant, 10);
    if (!(n > 0) || String(n) !== l.cant.trim()) return 'Cantidad entera mayor que cero';
    const disp = disponibleTerminado(e, l.sku, origen).disponible;
    if (n > disp) return `Supera el disponible en origen (${disp})`;
    if (lineas.filter((x) => x.sku === l.sku).length > 1) return 'Producto repetido';
    return null;
  };
  const errGlobal = origen === destino ? 'El origen y el destino no pueden ser la misma bodega' : null;
  const hayErr = !!errGlobal || lineas.some((l) => errLinea(l));
  const guardar = () => {
    setIntento(true); if (hayErr) return;
    const r = e.crearTraslado({ origenId: origen, destinoId: destino, lineas: lineas.map((l) => ({ sku: l.sku, cantidadEnviada: parseInt(l.cant, 10) })), observacion: obs });
    if (!r.ok) return e.mostrarToast(r.error ?? 'No se pudo crear', 'error');
    navigate(`/traslados/${r.id}`);
  };
  return (
    <div>
      <PageHeader titulo="Nuevo traslado" migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Traslados', ruta: '/traslados' }, { texto: 'Nuevo' }]} />
      <div className="space-y-4">
        <section className="tarjeta grid gap-3 p-4 sm:grid-cols-2">
          <div><label className="etiqueta" htmlFor="tr-o">Bodega de origen</label><select id="tr-o" className="campo" value={origen} onChange={(ev) => setOrigen(ev.target.value)}>{bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select></div>
          <div><label className="etiqueta" htmlFor="tr-d">Bodega de destino</label><select id="tr-d" className="campo" value={destino} onChange={(ev) => setDestino(ev.target.value)}>{bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select></div>
          {errGlobal && <p role="alert" className="text-xs text-error sm:col-span-2">{errGlobal}</p>}
        </section>
        <section className="tarjeta space-y-3 p-4">
          <h3 className="text-base font-bold">Productos a trasladar</h3>
          <p className="text-xs text-concreto-600">La lista del buscador muestra el disponible de cada producto en la bodega de origen ({nombreBodega(origen)}).</p>
          {lineas.map((l, i) => { const err = errLinea(l); const disp = l.sku ? disponibleTerminado(e, l.sku, origen).disponible : null; return (
            <div key={i} className="grid items-start gap-2 rounded-md border border-concreto-300 p-2 sm:grid-cols-[1fr_120px_auto]">
              <div><label className="etiqueta">Producto {i + 1}</label><BuscadorArticulo value={l.sku} onChange={(s) => setLineas(lineas.map((x, j) => (j === i ? { ...x, sku: s } : x)))} articulos={productos}
                extra={(a) => { const d = disponibleTerminado(e, a.sku, origen).disponible; return <span className={`chip shrink-0 ${d <= 0 ? '!bg-error/10 !text-error' : ''}`}>{d <= 0 ? 'Sin disponible' : `Disponible: ${d}`}</span>; }} />
                {disp !== null && <p className="mt-1 text-xs text-concreto-600">Disponible en origen: <strong className={disp <= 0 ? 'text-error' : 'text-ok'}>{disp}</strong>
                  {' '}- Destino ({nombreBodega(destino)}): {disponibleTerminado(e, l.sku, destino).disponible} - En tránsito: {disponibleTerminado(e, l.sku).enTransito}</p>}</div>
              <div><label className="etiqueta" htmlFor={`tr-c-${i}`}>Cantidad</label><input id={`tr-c-${i}`} inputMode="numeric" className="campo" value={l.cant} onChange={(ev) => setLineas(lineas.map((x, j) => (j === i ? { ...x, cant: ev.target.value } : x)))} /></div>
              <button aria-label={`Quitar línea ${i + 1}`} disabled={lineas.length === 1} className="mt-6 text-concreto-600 hover:text-error disabled:opacity-40" onClick={() => setLineas(lineas.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
              {intento && err && <p role="alert" className="text-xs text-error sm:col-span-3">{err}</p>}
            </div>); })}
          <button type="button" className="btn-secundario !py-1 text-xs" onClick={() => setLineas([...lineas, { sku: '', cant: '1' }])}><Plus size={13} /> Agregar producto</button>
        </section>
        <section className="tarjeta p-4"><label className="etiqueta" htmlFor="tr-obs">Observación (opcional)</label><textarea id="tr-obs" className="campo min-h-[64px]" value={obs} onChange={(ev) => setObs(ev.target.value)} /></section>
        <div className="flex flex-wrap justify-end gap-2"><Link className="btn-fantasma" to="/traslados">Cancelar</Link><BotonConPermiso variante="primario" permitido={puede(u, 'traslado.crear')} motivo="Solo Almacén crea traslados" onClick={guardar}>Guardar borrador</BotonConPermiso></div>
      </div>
    </div>
  );
}

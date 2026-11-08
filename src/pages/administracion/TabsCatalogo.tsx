import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import DataTable, { type Columna } from '../../components/DataTable';
import EstadoBadge from '../../components/EstadoBadge';
import Modal from '../../components/Modal';
import { convertir, formatearCantidad } from '../../lib/unidades';
import { useStore } from '../../store/useStore';
import type { Articulo, Proveedor, Unidad } from '../../types';

type Edit = Articulo & { nuevo?: boolean };

// P-18, pestaña Catalogo (RF-03): materias primas y producto terminado separados
export function TabCatalogo() {
  const e = useStore();
  const [vista, setVista] = useState<'materia_prima' | 'producto_terminado'>('materia_prima');
  const [edit, setEdit] = useState<Edit | null>(null);
  const [err, setErr] = useState('');
  const [cat, setCat] = useState('');
  const abrir = (a?: Articulo) => { setErr(''); setEdit(a ? { ...a, presentaciones: a.presentaciones.map((p) => ({ ...p })), receta: a.receta?.map((r) => ({ ...r })) } : { nuevo: true, sku: '', nombre: '', tipo: vista, categoria: e.categorias[0] ?? '', unidadBaseId: vista === 'materia_prima' ? 'kg' : 'und', presentaciones: [], stockMinimo: 0, activo: true, receta: vista === 'producto_terminado' ? [] : undefined, plazoFabricacionDias: vista === 'producto_terminado' ? 5 : undefined, precioReferencia: 0 }); };
  const guardar = () => { const r = e.guardarArticulo(edit!); if (!r.ok) return setErr(r.error ?? 'No se pudo guardar'); setEdit(null); };
  const cols: Columna<Articulo>[] = [
    { clave: 'sku', titulo: 'SKU', ordenable: true }, { clave: 'nombre', titulo: 'Nombre', ordenable: true }, { clave: 'categoria', titulo: 'Categoría' },
    { clave: 'unidad', titulo: 'Unidad base', render: (a) => a.unidadBaseId }, { clave: 'min', titulo: 'Mínimo', alinear: 'der', render: (a) => a.stockMinimo },
    { clave: 'pres', titulo: 'Presentaciones', render: (a) => a.presentaciones.map((p) => `${p.unidadId} = ${p.factorABase}`).join(', ') || '-' },
    { clave: 'act', titulo: 'Estado', render: (a) => <EstadoBadge estado={a.activo ? 'activo' : 'inactivo'} /> },
    { clave: 'acc', titulo: '', render: (a) => <button className="btn-secundario !py-0.5 text-xs" onClick={() => abrir(a)}>Editar</button> },
  ];
  const mps = e.articulos.filter((a) => a.tipo === 'materia_prima');
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Tipo de artículo" className="inline-flex overflow-hidden rounded-md border border-concreto-300">
          {([['materia_prima', 'Materias primas'], ['producto_terminado', 'Producto terminado']] as const).map(([v, t]) => <button key={v} aria-pressed={vista === v} onClick={() => setVista(v)} className={`px-3 py-1.5 text-sm font-semibold ${vista === v ? 'bg-marca-vino text-white' : 'bg-superficie'}`}>{t}</button>)}
        </div>
        <button className="btn-primario" onClick={() => abrir()}><Plus size={14} /> Nuevo artículo</button>
      </div>
      <DataTable columnas={cols} filas={e.articulos.filter((a) => a.tipo === vista)} clave={(a) => a.sku} tamPagina={10} />
      <section className="tarjeta space-y-2 p-3"><h3 className="text-sm font-bold">Categorías (lista editable)</h3>
        <div className="flex flex-wrap gap-1.5">{e.categorias.map((c) => <span key={c} className="chip">{c}</span>)}</div>
        <div className="flex gap-2"><input aria-label="Nueva categoría" className="campo max-w-xs" placeholder="Nueva categoría" value={cat} onChange={(ev) => setCat(ev.target.value)} /><button className="btn-secundario" onClick={() => { const r = e.agregarCategoria(cat); if (r.ok) setCat(''); else e.mostrarToast(r.error ?? 'No se pudo agregar', 'error'); }}>Agregar</button></div></section>
      {edit && (
        <Modal abierto titulo={edit.nuevo ? 'Nuevo artículo' : `Editar ${edit.sku}`} ancho="max-w-2xl" onCerrar={() => setEdit(null)} pie={<><button className="btn-fantasma" onClick={() => setEdit(null)}>Cancelar</button><button className="btn-primario" onClick={guardar}>Guardar</button></>}>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div><label className="etiqueta" htmlFor="ar-sku">SKU</label><input id="ar-sku" className="campo" disabled={!edit.nuevo} value={edit.sku} onChange={(ev) => setEdit({ ...edit, sku: ev.target.value.toUpperCase() })} /></div>
            <div><label className="etiqueta" htmlFor="ar-n">Nombre</label><input id="ar-n" className="campo" value={edit.nombre} onChange={(ev) => setEdit({ ...edit, nombre: ev.target.value })} /></div>
            <div><label className="etiqueta" htmlFor="ar-c">Categoría</label><select id="ar-c" className="campo" value={edit.categoria} onChange={(ev) => setEdit({ ...edit, categoria: ev.target.value })}>{e.categorias.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className="etiqueta" htmlFor="ar-u">Unidad base</label><select id="ar-u" className="campo" value={edit.unidadBaseId} onChange={(ev) => setEdit({ ...edit, unidadBaseId: ev.target.value })}>{e.unidades.filter((u) => u.esBase).map((u) => <option key={u.id} value={u.id}>{u.nombre} ({u.simbolo})</option>)}</select></div>
            <div><label className="etiqueta" htmlFor="ar-m">Stock mínimo</label><input id="ar-m" inputMode="decimal" className="campo" value={edit.stockMinimo} onChange={(ev) => setEdit({ ...edit, stockMinimo: Number(ev.target.value) })} /></div>
            <div><label className="etiqueta" htmlFor="ar-p">Precio referencial (USD)</label><input id="ar-p" inputMode="decimal" className="campo" value={edit.precioReferencia ?? 0} onChange={(ev) => setEdit({ ...edit, precioReferencia: Number(ev.target.value) })} /></div>
            {edit.tipo === 'producto_terminado' && <div><label className="etiqueta" htmlFor="ar-pl">Plazo de fabricación (días)</label><input id="ar-pl" inputMode="numeric" className="campo" value={edit.plazoFabricacionDias ?? ''} onChange={(ev) => setEdit({ ...edit, plazoFabricacionDias: ev.target.value === '' ? undefined : Number(ev.target.value) })} /></div>}
            <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={edit.activo} onChange={(ev) => setEdit({ ...edit, activo: ev.target.checked })} /> Artículo activo</label>
            <fieldset className="sm:col-span-2"><legend className="etiqueta">Presentaciones de compra (unidad y factor a la unidad base)</legend>
              {edit.presentaciones.map((p, i) => <div key={i} className="mb-1 flex gap-2"><select aria-label={`Unidad de presentación ${i + 1}`} className="campo" value={p.unidadId} onChange={(ev) => setEdit({ ...edit, presentaciones: edit.presentaciones.map((x, j) => (j === i ? { ...x, unidadId: ev.target.value } : x)) })}><option value="">Elegir</option>{e.unidades.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select><input aria-label={`Factor de presentación ${i + 1}`} inputMode="decimal" className="campo w-28" value={p.factorABase} onChange={(ev) => setEdit({ ...edit, presentaciones: edit.presentaciones.map((x, j) => (j === i ? { ...x, factorABase: Number(ev.target.value) } : x)) })} /><button aria-label={`Quitar presentación ${i + 1}`} onClick={() => setEdit({ ...edit, presentaciones: edit.presentaciones.filter((_, j) => j !== i) })}><Trash2 size={15} /></button></div>)}
              <button className="btn-secundario !py-0.5 text-xs" onClick={() => setEdit({ ...edit, presentaciones: [...edit.presentaciones, { unidadId: '', factorABase: 1 }] })}><Plus size={12} /> Agregar presentación</button></fieldset>
            {edit.tipo === 'producto_terminado' && (
              <fieldset className="sm:col-span-2"><legend className="etiqueta">Receta por unidad (materias primas)</legend>
                {(edit.receta ?? []).map((r, i) => <div key={i} className="mb-1 flex gap-2"><select aria-label={`Insumo ${i + 1}`} className="campo" value={r.sku} onChange={(ev) => setEdit({ ...edit, receta: edit.receta!.map((x, j) => (j === i ? { ...x, sku: ev.target.value } : x)) })}><option value="">Elegir</option>{mps.map((m) => <option key={m.sku} value={m.sku}>{m.sku} - {m.nombre}</option>)}</select><input aria-label={`Cantidad base de ${i + 1}`} inputMode="decimal" className="campo w-28" value={r.cantidadBase} onChange={(ev) => setEdit({ ...edit, receta: edit.receta!.map((x, j) => (j === i ? { ...x, cantidadBase: Number(ev.target.value) } : x)) })} /><button aria-label={`Quitar insumo ${i + 1}`} onClick={() => setEdit({ ...edit, receta: edit.receta!.filter((_, j) => j !== i) })}><Trash2 size={15} /></button></div>)}
                <button className="btn-secundario !py-0.5 text-xs" onClick={() => setEdit({ ...edit, receta: [...(edit.receta ?? []), { sku: '', cantidadBase: 1 }] })}><Plus size={12} /> Agregar insumo</button></fieldset>)}
            {err && <p role="alert" className="text-xs text-error sm:col-span-2">{err}</p>}
          </div>
        </Modal>)}
    </div>
  );
}

// P-18, pestaña Unidades y conversiones
export function TabUnidades() {
  const e = useStore();
  const [edit, setEdit] = useState<(Unidad & { nuevo?: boolean }) | null>(null);
  const [err, setErr] = useState('');
  const [valor, setValor] = useState('3'); const [de, setDe] = useState('saco50'); const [a, setA] = useState('kg');
  const res = convertir(Number(valor.replace(',', '.')), de, a);
  const guardar = () => { const r = e.guardarUnidad(edit!); if (!r.ok) return setErr(r.error ?? 'No se pudo guardar'); setEdit(null); };
  const cols: Columna<Unidad>[] = [
    { clave: 'id', titulo: 'Id' }, { clave: 'nombre', titulo: 'Nombre' }, { clave: 'familia', titulo: 'Familia' },
    { clave: 'factor', titulo: 'Factor a base', alinear: 'der', render: (u) => u.factorABase }, { clave: 'dec', titulo: 'Decimales', alinear: 'der', render: (u) => u.decimales },
    { clave: 'acc', titulo: '', render: (u) => <button className="btn-secundario !py-0.5 text-xs" onClick={() => { setErr(''); setEdit({ ...u }); }}>Editar</button> },
  ];
  return (
    <div className="space-y-4">
      <section className="tarjeta space-y-2 p-4" aria-label="Previsualizador de conversión"><h3 className="text-sm font-bold">Previsualizador de conversión</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div><label className="etiqueta" htmlFor="cv-v">Convertir</label><input id="cv-v" inputMode="decimal" className="campo w-24" value={valor} onChange={(ev) => setValor(ev.target.value)} /></div>
          <div><label className="etiqueta" htmlFor="cv-d">De</label><select id="cv-d" className="campo" value={de} onChange={(ev) => setDe(ev.target.value)}>{e.unidades.map((u) => <option key={u.id} value={u.id}>{u.id}</option>)}</select></div>
          <div><label className="etiqueta" htmlFor="cv-a">A</label><select id="cv-a" className="campo" value={a} onChange={(ev) => setA(ev.target.value)}>{e.unidades.map((u) => <option key={u.id} value={u.id}>{u.id}</option>)}</select></div>
          <p className="pb-2 text-sm font-semibold" role="status">= {isFinite(res) ? formatearCantidad(res, a) : 'Unidades no convertibles'}</p>
        </div></section>
      <div className="flex justify-end"><button className="btn-primario" onClick={() => { setErr(''); setEdit({ nuevo: true, id: '', nombre: '', simbolo: '', familia: 'peso', decimales: 2, factorABase: 1, esBase: false }); }}><Plus size={14} /> Agregar unidad</button></div>
      <DataTable columnas={cols} filas={e.unidades} clave={(u) => u.id} tamPagina={12} />
      {edit && (
        <Modal abierto titulo={edit.nuevo ? 'Nueva unidad o presentación' : `Editar ${edit.id}`} onCerrar={() => setEdit(null)} pie={<><button className="btn-fantasma" onClick={() => setEdit(null)}>Cancelar</button><button className="btn-primario" onClick={guardar}>Guardar</button></>}>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div><label className="etiqueta" htmlFor="un-i">Identificador</label><input id="un-i" className="campo" disabled={!edit.nuevo} value={edit.id} onChange={(ev) => setEdit({ ...edit, id: ev.target.value })} /></div>
            <div><label className="etiqueta" htmlFor="un-n">Nombre</label><input id="un-n" className="campo" value={edit.nombre} onChange={(ev) => setEdit({ ...edit, nombre: ev.target.value })} /></div>
            <div><label className="etiqueta" htmlFor="un-s">Símbolo</label><input id="un-s" className="campo" value={edit.simbolo} onChange={(ev) => setEdit({ ...edit, simbolo: ev.target.value })} /></div>
            <div><label className="etiqueta" htmlFor="un-f">Familia</label><select id="un-f" className="campo" disabled={!edit.nuevo} value={edit.familia} onChange={(ev) => setEdit({ ...edit, familia: ev.target.value as Unidad['familia'] })}>{['peso', 'volumen', 'longitud', 'superficie', 'conteo'].map((f) => <option key={f}>{f}</option>)}</select></div>
            <div><label className="etiqueta" htmlFor="un-x">Factor a la unidad base</label><input id="un-x" inputMode="decimal" className="campo" value={edit.factorABase} onChange={(ev) => setEdit({ ...edit, factorABase: Number(ev.target.value) })} /></div>
            <div><label className="etiqueta" htmlFor="un-d">Decimales permitidos</label><input id="un-d" inputMode="numeric" className="campo" value={edit.decimales} onChange={(ev) => setEdit({ ...edit, decimales: Number(ev.target.value) })} /></div>
            {err && <p role="alert" className="text-xs text-error sm:col-span-2">{err}</p>}
          </div>
        </Modal>)}
    </div>
  );
}

// P-18, pestaña Proveedores (RF-04)
export function TabProveedores() {
  const e = useStore();
  const [edit, setEdit] = useState<Proveedor | null>(null);
  const [err, setErr] = useState('');
  const guardar = () => { const r = e.guardarProveedor(edit!); if (!r.ok) return setErr(r.error ?? 'No se pudo guardar'); setEdit(null); };
  const f = (k: keyof Proveedor, etiqueta: string, tipo = 'text') => <div><label className="etiqueta" htmlFor={`pv-${k}`}>{etiqueta}</label><input id={`pv-${k}`} type={tipo} className="campo" value={String(edit![k])} onChange={(ev) => setEdit({ ...edit!, [k]: tipo === 'number' ? Number(ev.target.value) : ev.target.value })} /></div>;
  const cols: Columna<Proveedor>[] = [
    { clave: 'nombre', titulo: 'Razón social', ordenable: true }, { clave: 'identificacionFiscal', titulo: 'Id. fiscal' }, { clave: 'ciudad', titulo: 'Ciudad' }, { clave: 'condicionesPago', titulo: 'Pago' },
    { clave: 'dias', titulo: 'Días entrega', alinear: 'der', render: (p) => p.diasEntrega }, { clave: 'act', titulo: 'Estado', render: (p) => <EstadoBadge estado={p.activo ? 'activo' : 'inactivo'} /> },
    { clave: 'acc', titulo: '', render: (p) => <button className="btn-secundario !py-0.5 text-xs" onClick={() => { setErr(''); setEdit({ ...p }); }}>Editar</button> },
  ];
  return (
    <div className="space-y-2">
      <div className="flex justify-end"><button className="btn-primario" onClick={() => { setErr(''); setEdit({ id: '', nombre: '', identificacionFiscal: '', contacto: '', correo: '', ciudad: '', condicionesPago: 'Crédito 30 días', diasEntrega: 5, activo: true }); }}><Plus size={14} /> Nuevo proveedor</button></div>
      <DataTable columnas={cols} filas={e.proveedores} clave={(p) => p.id} />
      {edit && (
        <Modal abierto titulo={edit.id ? `Editar ${edit.nombre}` : 'Nuevo proveedor'} ancho="max-w-lg" onCerrar={() => setEdit(null)} pie={<><button className="btn-fantasma" onClick={() => setEdit(null)}>Cancelar</button><button className="btn-primario" onClick={guardar}>Guardar</button></>}>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {f('nombre', 'Razón social')}{f('identificacionFiscal', 'Identificación fiscal (ficticia)')}{f('contacto', 'Contacto')}{f('correo', 'Correo')}{f('ciudad', 'Ciudad')}{f('condicionesPago', 'Condiciones de pago')}{f('diasEntrega', 'Días de entrega', 'number')}
            <label className="flex items-center gap-2 self-end"><input type="checkbox" checked={edit.activo} onChange={(ev) => setEdit({ ...edit, activo: ev.target.checked })} /> Activo</label>
            {err && <p role="alert" className="text-xs text-error sm:col-span-2">{err}</p>}
          </div>
        </Modal>)}
    </div>
  );
}

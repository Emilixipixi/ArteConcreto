import { useState } from 'react';
import { Plus } from 'lucide-react';
import ChipsRoles from '../../components/ChipsRoles';
import DataTable, { type Columna } from '../../components/DataTable';
import EstadoBadge from '../../components/EstadoBadge';
import Modal from '../../components/Modal';
import { MATRIZ, type Accion } from '../../lib/permisos';
import { useStore } from '../../store/useStore';
import type { Bodega, RolId, Usuario } from '../../types';

const ACCIONES: Record<Accion, string> = {
  'solicitud.crear': 'Crear solicitudes', 'solicitud.decidir': 'Decidir solicitudes', 'compra.crear': 'Crear compras', 'compra.aprobar': 'Aprobar compras',
  'pago.preparar': 'Preparar pagos', 'pago.aprobar': 'Aprobar pagos', 'pago.registrar': 'Registrar pagos', 'recepcion.confirmar': 'Confirmar recepciones',
  'ajuste.crear': 'Solicitar ajustes', 'ajuste.aprobar': 'Aprobar ajustes', 'fabricacion.registrar': 'Registrar fabricaciones', 'fabricacion.confirmar_desvio': 'Confirmar fabricación con desvío',
  'traslado.crear': 'Crear y despachar traslados', 'traslado.recibir': 'Recibir traslados', 'despacho.crear': 'Registrar ventas y despachos', 'salida.confirmar': 'Confirmar salida física',
  'reserva.crear': 'Reservar producto', 'documento.anular': 'Anular documentos', 'despacho.descargar': 'Marcar descargado', 'disponibilidad.consultar': 'Consultar disponibilidad',
  'admin.gestionar': 'Administrar el sistema', 'integracion.simular': 'Simular eventos de la tienda',
  'factura.registrar': 'Registrar y cotejar facturas de proveedor', 'banco.conciliar': 'Conciliar el extracto bancario',
};

// P-18, pestaña Usuarios y roles (RF-01, CA-13)
export function TabUsuarios() {
  const e = useStore();
  const [edit, setEdit] = useState<Usuario | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [err, setErr] = useState('');
  const abrir = (u?: Usuario) => { setErr(''); setNuevo(!u); setEdit(u ? { ...u, roles: [...u.roles] } : { id: '', nombre: '', correo: '', roles: [], activo: true }); };
  const guardar = () => { const r = e.guardarUsuario(edit!); if (!r.ok) return setErr(r.error ?? 'No se pudo guardar'); setEdit(null); };
  const alternar = (id: RolId) => setEdit((u) => u && ({ ...u, roles: u.roles.includes(id) ? u.roles.filter((x) => x !== id) : [...u.roles, id] }));
  const cols: Columna<Usuario>[] = [
    { clave: 'nombre', titulo: 'Nombre', ordenable: true }, { clave: 'correo', titulo: 'Correo' },
    { clave: 'roles', titulo: 'Roles', render: (u) => <ChipsRoles roles={u.roles} /> },
    { clave: 'activo', titulo: 'Acceso', render: (u) => <EstadoBadge estado={u.activo ? 'activo' : 'inactivo'} /> },
    { clave: 'acc', titulo: '', render: (u) => <button className="btn-secundario !py-0.5 text-xs" onClick={() => abrir(u)}>Editar</button> },
  ];
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="flex justify-end"><button className="btn-primario" onClick={() => abrir()}><Plus size={14} /> Nuevo usuario</button></div>
        <DataTable columnas={cols} filas={e.usuarios} clave={(u) => u.id} tamPagina={12} />
        <p className="text-xs text-concreto-600">Los cambios de roles se reflejan en el menú al iniciar sesión con ese usuario (Guía de demostración o pantalla de ingreso).</p>
      </section>
      <section className="space-y-2" aria-label="Roles">
        <h3 className="text-base font-bold">Roles del sistema</h3>
        <ul className="grid gap-2 md:grid-cols-2">{e.roles.map((r) => <li key={r.id} className="tarjeta p-3 text-sm"><p className="font-semibold">{r.nombre}</p><p className="text-xs text-concreto-600">{r.responsabilidad}</p></li>)}</ul>
      </section>
      <section className="space-y-2" aria-label="Matriz de permisos">
        <h3 className="text-base font-bold">Matriz de permisos (solo lectura)</h3>
        <div className="tarjeta overflow-x-auto"><table className="w-full min-w-[760px] text-xs">
          <thead className="bg-concreto-100 uppercase text-concreto-600"><tr><th className="px-2 py-2 text-left">Acción</th>{e.roles.map((r) => <th key={r.id} className="px-1 py-2 text-center">{r.nombre.split(' ')[0]}</th>)}</tr></thead>
          <tbody>{(Object.keys(MATRIZ) as Accion[]).map((a) => <tr key={a} className="border-t border-concreto-300"><td className="px-2 py-1.5">{ACCIONES[a]}</td>{e.roles.map((r) => <td key={r.id} className="px-1 py-1.5 text-center">{MATRIZ[a].includes(r.id) ? <span className="font-bold text-ok" aria-label="Permitido">Sí</span> : <span className="text-concreto-300" aria-label="No permitido">-</span>}</td>)}</tr>)}</tbody>
        </table></div>
      </section>
      {edit && (
        <Modal abierto titulo={nuevo ? 'Nuevo usuario' : `Editar ${edit.nombre}`} ancho="max-w-lg" onCerrar={() => setEdit(null)} pie={<><button className="btn-fantasma" onClick={() => setEdit(null)}>Cancelar</button><button className="btn-primario" onClick={guardar}>Guardar</button></>}>
          <div className="space-y-3 text-sm">
            <div><label className="etiqueta" htmlFor="us-n">Nombre</label><input id="us-n" className="campo" value={edit.nombre} onChange={(ev) => setEdit({ ...edit, nombre: ev.target.value })} /></div>
            <div><label className="etiqueta" htmlFor="us-c">Correo</label><input id="us-c" className="campo" value={edit.correo} onChange={(ev) => setEdit({ ...edit, correo: ev.target.value })} /></div>
            <fieldset><legend className="etiqueta">Roles (uno o varios)</legend>
              <div className="grid gap-1.5">{e.roles.map((r) => <label key={r.id} className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={edit.roles.includes(r.id)} onChange={() => alternar(r.id)} /><span><span className="font-semibold">{r.nombre}</span><span className="block text-xs text-concreto-600">{r.responsabilidad}</span></span></label>)}</div></fieldset>
            <label className="flex items-center gap-2"><input type="checkbox" checked={edit.activo} onChange={(ev) => setEdit({ ...edit, activo: ev.target.checked })} /> Acceso activo</label>
            {err && <p role="alert" className="text-xs text-error">{err}</p>}
          </div>
        </Modal>)}
    </div>
  );
}

// P-18, pestaña Bodegas (RF-02): agregar "Bodega N" sin limite
export function TabBodegas() {
  const e = useStore();
  const [edit, setEdit] = useState<Bodega | null>(null);
  const [err, setErr] = useState('');
  const nueva = () => { setErr(''); const n = e.bodegas.length + 1; setEdit({ id: '', codigo: `B${n}`, nombre: `Bodega ${n}`, ubicacion: '', activa: true }); };
  const guardar = () => { const r = e.guardarBodega(edit!); if (!r.ok) return setErr(r.error ?? 'No se pudo guardar'); setEdit(null); };
  const alternar = (b: Bodega) => { const r = e.guardarBodega({ ...b, activa: !b.activa }); if (!r.ok) e.mostrarToast(r.error ?? 'No se pudo cambiar', 'error'); };
  const cols: Columna<Bodega>[] = [
    { clave: 'codigo', titulo: 'Código' }, { clave: 'nombre', titulo: 'Nombre' }, { clave: 'ubicacion', titulo: 'Ubicación' },
    { clave: 'estado', titulo: 'Estado', render: (b) => <EstadoBadge estado={b.activa ? 'activo' : 'inactivo'} /> },
    { clave: 'acc', titulo: '', render: (b) => <span className="flex gap-1"><button className="btn-secundario !py-0.5 text-xs" onClick={() => { setErr(''); setEdit({ ...b }); }}>Editar</button><button className="btn-secundario !py-0.5 text-xs" onClick={() => alternar(b)}>{b.activa ? 'Desactivar' : 'Activar'}</button></span> },
  ];
  return (
    <div className="space-y-2">
      <div className="flex justify-end"><button className="btn-primario" onClick={nueva}><Plus size={14} /> Agregar bodega</button></div>
      <DataTable columnas={cols} filas={e.bodegas} clave={(b) => b.id} />
      <p className="text-xs text-concreto-600">No se puede desactivar una bodega con existencias. Las bodegas nuevas aparecen de inmediato en el selector global y en todas las pantallas.</p>
      {edit && (
        <Modal abierto titulo={edit.id ? `Editar ${edit.codigo}` : 'Nueva bodega'} onCerrar={() => setEdit(null)} pie={<><button className="btn-fantasma" onClick={() => setEdit(null)}>Cancelar</button><button className="btn-primario" onClick={guardar}>Guardar</button></>}>
          <div className="space-y-3 text-sm">
            <div><label className="etiqueta" htmlFor="bo-n">Nombre</label><input id="bo-n" className="campo" value={edit.nombre} onChange={(ev) => setEdit({ ...edit, nombre: ev.target.value })} /></div>
            <div><label className="etiqueta" htmlFor="bo-u">Ubicación</label><input id="bo-u" className="campo" value={edit.ubicacion} onChange={(ev) => setEdit({ ...edit, ubicacion: ev.target.value })} /></div>
            {err && <p role="alert" className="text-xs text-error">{err}</p>}
          </div>
        </Modal>)}
    </div>
  );
}

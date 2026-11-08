import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import { TabBodegas, TabUsuarios } from './TabsUsuariosBodegas';
import { TabCatalogo, TabProveedores, TabUnidades } from './TabsCatalogo';
import { TabAuditoria, TabParametros } from './TabsParametrosAuditoria';

const TABS = [
  { id: 'usuarios', t: 'Usuarios y roles' }, { id: 'bodegas', t: 'Bodegas' }, { id: 'catalogo', t: 'Catálogo' }, { id: 'unidades', t: 'Unidades' },
  { id: 'proveedores', t: 'Proveedores' }, { id: 'parametros', t: 'Parámetros' }, { id: 'auditoria', t: 'Auditoría' },
] as const;

// P-18 Administracion (rol Administrador)
export default function Administracion() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('usuarios');
  return (
    <div>
      <PageHeader titulo="Administración" migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Administración' }]} subtitulo="Usuarios, bodegas, catálogo, unidades, proveedores y parámetros del sistema." />
      <div role="tablist" aria-label="Secciones de administración" className="mb-4 flex gap-1 overflow-x-auto border-b border-concreto-300">
        {TABS.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${tab === t.id ? 'border-marca-vino text-marca-vino' : 'border-transparent text-concreto-600 hover:text-texto'}`}>{t.t}</button>)}
      </div>
      {tab === 'usuarios' && <TabUsuarios />}{tab === 'bodegas' && <TabBodegas />}{tab === 'catalogo' && <TabCatalogo />}{tab === 'unidades' && <TabUnidades />}
      {tab === 'proveedores' && <TabProveedores />}{tab === 'parametros' && <TabParametros />}{tab === 'auditoria' && <TabAuditoria />}
    </div>
  );
}

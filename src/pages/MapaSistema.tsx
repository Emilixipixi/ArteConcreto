import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import InsigniaSimulado from '../components/InsigniaSimulado';
import PageHeader from '../components/PageHeader';
import { MENU } from '../lib/menu';

interface Nodo { t: string; ruta: string; simulado?: boolean }
const FLUJOS: { titulo: string; nodos: Nodo[] }[] = [
  { titulo: 'Abastecimiento', nodos: [{ t: 'Solicitud', ruta: '/solicitudes' }, { t: 'Director', ruta: '/director' }, { t: 'Compras', ruta: '/compras' }, { t: 'Aprobación', ruta: '/aprobacion-compras' }, { t: 'Tesorería', ruta: '/tesoreria' }, { t: 'Recepción', ruta: '/recepcion' }, { t: 'Materias primas', ruta: '/materias-primas' }] },
  { titulo: 'Producción y distribución', nodos: [{ t: 'Materias primas', ruta: '/materias-primas' }, { t: 'Fabricación', ruta: '/fabricacion' }, { t: 'Producto terminado', ruta: '/producto-terminado' }, { t: 'Traslados', ruta: '/traslados' }, { t: 'Ventas y despachos', ruta: '/ventas' }] },
  { titulo: 'Canales y control', nodos: [{ t: 'Disponibilidad', ruta: '/disponibilidad', simulado: true }, { t: 'Conexiones tienda', ruta: '/conexiones', simulado: true }, { t: 'Ventas y despachos', ruta: '/ventas' }, { t: 'Reportes y trazabilidad', ruta: '/reportes' }, { t: 'Administración', ruta: '/administracion' }] },
];

// Entregable de mapa de pantallas: flujos principales y las 18 pantallas con enlaces
export default function MapaSistema() {
  const pantallas = MENU.filter((m) => /^P-\d+/.test(m.pantalla));
  return (
    <div className="space-y-6">
      <PageHeader titulo="Mapa del sistema" migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Mapa del sistema' }]} subtitulo="Flujos principales y pantallas. Cada recuadro lleva a su pantalla (según el rol, puede mostrarse sin acceso)." />
      {FLUJOS.map((f) => (
        <section key={f.titulo} className="tarjeta p-4"><h2 className="mb-3 text-base font-bold">{f.titulo}</h2>
          <ol className="flex flex-wrap items-center gap-2">{f.nodos.map((n, i) => (
            <li key={n.t + i} className="flex items-center gap-2">
              <Link to={n.ruta} className="inline-flex items-center gap-1 rounded-md border border-marca-vino bg-marca-amarillo-suave px-3 py-1.5 text-sm font-semibold text-marca-vino-oscuro hover:bg-marca-amarillo">{n.t}{n.simulado && <InsigniaSimulado />}</Link>
              {i < f.nodos.length - 1 && <ArrowRight size={16} className="text-concreto-600" aria-hidden="true" />}
            </li>))}</ol></section>))}
      <section className="tarjeta p-4"><h2 className="mb-3 text-base font-bold">Pantallas del sistema (P-02 a P-18)</h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{pantallas.map((p) => <li key={p.ruta}><Link to={p.ruta} className="flex items-center gap-2 rounded-md border border-concreto-300 p-2 text-sm hover:border-marca-vino"><span className="rounded bg-marca-vino px-1.5 py-0.5 font-titulos text-xs font-bold text-white">{p.pantalla}</span>{p.etiqueta}</Link></li>)}</ul>
        <p className="mt-3 text-xs text-concreto-600">Además: Ingreso (P-01), Notificaciones, Guía de demostración y este mapa.</p></section>
    </div>
  );
}

import { useState } from 'react';
import {
  AlertOctagon, ArrowRight, BadgeDollarSign, BookOpen, Boxes, ClipboardList, Inbox, PackageCheck, ShoppingCart, Truck, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AlertaInventario from '../components/AlertaInventario';
import DataTable from '../components/DataTable';
import EstadoBadge from '../components/EstadoBadge';
import EstadoVacio from '../components/EstadoVacio';
import PageHeader from '../components/PageHeader';
import TarjetaKpi from '../components/TarjetaKpi';
import { formatearFechaHora, tiempoRelativo } from '../lib/formato';
import { tieneAlgunRol } from '../lib/permisos';
import type { RolId } from '../types';
import { useStore } from '../store/useStore';
import { actividadReciente, comprasPorEstado, movimientosPorDia, useAlertas, useKpis, usePendientes, useUsuarioActual } from '../store/selectores';
import { useMemo } from 'react';

// Bandeja de trabajo de cada rol: donde aprueba, rechaza, devuelve o ejecuta sus acciones
const BANDEJAS: { rol: RolId; ruta: string; etiqueta: string }[] = [
  { rol: 'director', ruta: '/director', etiqueta: 'Aprobar o rechazar solicitudes' },
  { rol: 'aprobador_compra', ruta: '/aprobacion-compras', etiqueta: 'Aprobar compras' },
  { rol: 'tesoreria', ruta: '/tesoreria', etiqueta: 'Preparar y registrar pagos' },
  { rol: 'tesoreria', ruta: '/aprobacion-pagos', etiqueta: 'Aprobar pagos' },
  { rol: 'compras', ruta: '/compras', etiqueta: 'Gestionar compras' },
  { rol: 'almacen', ruta: '/recepcion', etiqueta: 'Recibir mercancía y confirmar salidas' },
  { rol: 'produccion', ruta: '/fabricacion', etiqueta: 'Registrar fabricaciones' },
  { rol: 'ventas', ruta: '/ventas', etiqueta: 'Despachos y ventas' },
  { rol: 'solicitante', ruta: '/solicitudes', etiqueta: 'Mis solicitudes' },
  { rol: 'admin', ruta: '/administracion', etiqueta: 'Administrar el sistema' },
];

const PRIORIDAD_TONO: Record<string, string> = { urgente: 'text-error', alta: 'text-aviso', media: 'text-concreto-600', baja: 'text-concreto-600' };

// P-02 Panel general
// Paginador sencillo para las listas del panel (evita que la pantalla se alargue)
function Paginador({ total, pagina, tam, onCambiar }: { total: number; pagina: number; tam: number; onCambiar: (p: number) => void }) {
  const paginas = Math.max(1, Math.ceil(total / tam));
  if (total <= tam) return null;
  const desde = pagina * tam + 1; const hasta = Math.min(total, (pagina + 1) * tam);
  return (
    <div className="flex items-center justify-between gap-2 border-t border-concreto-300 px-3 py-2 text-xs text-concreto-600">
      <span>{desde}-{hasta} de {total}</span>
      <span className="flex items-center gap-1">
        <button className="btn-fantasma !p-1 disabled:opacity-40" aria-label="Página anterior" disabled={pagina === 0} onClick={() => onCambiar(pagina - 1)}><ChevronLeft size={16} /></button>
        <span className="px-1 font-semibold">{pagina + 1} / {paginas}</span>
        <button className="btn-fantasma !p-1 disabled:opacity-40" aria-label="Página siguiente" disabled={pagina >= paginas - 1} onClick={() => onCambiar(pagina + 1)}><ChevronRight size={16} /></button>
      </span>
    </div>
  );
}

export default function Panel() {
  const usuario = useUsuarioActual()!;
  const estado = useStore();
  const navigate = useNavigate();
  const kpis = useKpis();
  const pendientes = usePendientes();
  const alertas = useAlertas();
  const [pagPend, setPagPend] = useState(0);
  const [pagAlert, setPagAlert] = useState(0);
  const actividad = useMemo(() => actividadReciente(estado, 8), [estado]);
  const datosCompras = useMemo(() => comprasPorEstado(estado), [estado]);
  const datosMov = useMemo(() => movimientosPorDia(estado, 14), [estado]);
  const nombreDe = (id: string) => estado.usuarios.find((u) => u.id === id)?.nombre ?? id;
  const primerNombre = usuario.nombre.split(' ')[0];
  // Un boton por bandeja del usuario (sin repetir la misma pantalla), con el numero de pendientes de ese modulo
  const bandejas = BANDEJAS.filter((b) => usuario.roles.includes(b.rol)).filter((b, i, l) => l.findIndex((x) => x.ruta === b.ruta) === i)
    .map((b) => ({ ...b, n: pendientes.filter((p) => p.modulo === b.ruta).length }));

  // Tarjetas segun rol; admin y director ven todas. Si ninguna aplica, se muestran todas.
  const todas: { roles: RolId[]; nodo: JSX.Element }[] = [
    { roles: ['admin', 'director', 'solicitante', 'compras'], nodo: <TarjetaKpi key="a" titulo="Solicitudes pendientes" valor={kpis.solicitudesPendientes} texto="Esperan decisión del director" icono={ClipboardList} ruta="/solicitudes" variacion={1} /> },
    { roles: ['admin', 'director', 'compras', 'aprobador_compra'], nodo: <TarjetaKpi key="b" titulo="Compras en curso" valor={kpis.comprasEnCurso} texto="Órdenes abiertas" icono={ShoppingCart} ruta="/compras" variacion={0} /> },
    { roles: ['admin', 'compras', 'almacen', 'tesoreria'], nodo: <TarjetaKpi key="c" titulo="Compras por recibir" valor={kpis.comprasPorRecibir} texto="Aprobadas sin recepción completa" icono={PackageCheck} ruta="/recepcion" variacion={-1} /> },
    { roles: ['admin', 'tesoreria', 'compras'], nodo: <TarjetaKpi key="d" titulo="Anticipos abiertos" valor={kpis.anticiposAbiertos} texto="Sin conciliar" icono={BadgeDollarSign} ruta="/tesoreria" variacion={1} /> },
    { roles: ['admin', 'tesoreria'], nodo: <TarjetaKpi key="e" titulo="Pagos pendientes de cerrar" valor={kpis.pagosPendientesCerrar} texto="En preparación, aprobación o pago" icono={Wallet} ruta="/tesoreria" variacion={0} /> },
    { roles: ['admin', 'director', 'almacen', 'produccion', 'compras'], nodo: <TarjetaKpi key="f" titulo="Stock crítico" valor={kpis.stockCritico} texto="Materias primas bajo mínimo" icono={Boxes} ruta="/materias-primas" tono={kpis.stockCritico ? 'aviso' : 'normal'} variacion={1} /> },
    { roles: ['admin', 'director', 'produccion', 'ventas', 'almacen'], nodo: <TarjetaKpi key="g" titulo="Productos agotados" valor={kpis.productosAgotados} texto="Producto terminado sin existencias" icono={AlertOctagon} ruta="/producto-terminado" tono={kpis.productosAgotados ? 'error' : 'normal'} variacion={0} /> },
    { roles: ['admin', 'director', 'ventas', 'almacen'], nodo: <TarjetaKpi key="h" titulo="Despachos recientes" valor={kpis.despachosRecientes} texto="Confirmados en 7 días" icono={Truck} ruta="/ventas" variacion={2} /> },
  ];
  const TAM_PEND = 6; const TAM_ALERTAS = 4;
  const pendPag = Math.min(pagPend, Math.max(0, Math.ceil(pendientes.length / TAM_PEND) - 1));
  const alertPag = Math.min(pagAlert, Math.max(0, Math.ceil(alertas.length / TAM_ALERTAS) - 1));
  const propias = todas.filter((k) => tieneAlgunRol(usuario, k.roles));
  const tarjetas = (propias.length ? propias : todas).map((k) => k.nodo);

  return (
    <div className="space-y-6">
      <PageHeader titulo={`Hola, ${primerNombre}`} subtitulo={pendientes.length > 0
        ? `Tienes ${pendientes.length} ${pendientes.length === 1 ? 'documento' : 'documentos'} esperando tu acción.`
        : 'No tienes documentos pendientes por ahora.'}
        acciones={<>
          {bandejas.map((b) => (
            <Link key={b.ruta} to={b.ruta} className="btn-primario" aria-label={`Ir a mi bandeja: ${b.etiqueta}${b.n ? `, ${b.n} pendientes` : ''}`}>
              <Inbox size={16} aria-hidden="true" /> Mi bandeja: {b.etiqueta}
              {b.n > 0 && <span className="ml-1 rounded-full bg-marca-vino px-1.5 py-0.5 text-[11px] font-bold text-white">{b.n}</span>}
            </Link>
          ))}
          <Link to="/guia-demo" className="btn-secundario"><BookOpen size={16} /> Guía de demostración</Link>
        </>} />

      <section aria-label="Indicadores" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{tarjetas}</section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2" aria-label="Mis pendientes">
          <h2 className="mb-2 text-base font-bold">Mis pendientes</h2>
          {pendientes.length === 0 ? (
            <div className="tarjeta"><EstadoVacio titulo="Todo al día" mensaje="Cuando un documento espere tu acción aparecerá aquí." /></div>
          ) : (
            <div className="tarjeta divide-y divide-concreto-300">
              {pendientes.slice(pendPag * TAM_PEND, (pendPag + 1) * TAM_PEND).map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm"><span className="font-semibold text-marca-vino">{p.numero}</span> <span className="text-concreto-600">- {p.tipoDoc}</span></p>
                    <p className="text-xs text-concreto-600">{p.descripcion}</p>
                  </div>
                  <EstadoBadge estado={p.estado} />
                  <span className={`text-xs font-semibold capitalize ${PRIORIDAD_TONO[p.prioridad]}`}>{p.prioridad}</span>
                  <span className="w-24 text-xs text-concreto-600">{p.antiguedadDias === 0 ? 'Hoy' : `hace ${p.antiguedadDias} d`}</span>
                  <button className="btn-secundario !py-1" onClick={() => navigate(p.ruta)}>Abrir <ArrowRight size={14} /></button>
                </div>
              ))}
              <Paginador total={pendientes.length} pagina={pendPag} tam={TAM_PEND} onCambiar={setPagPend} />
            </div>
          )}
        </section>

        <section aria-label="Alertas de inventario">
          <h2 className="mb-2 text-base font-bold">Alertas de inventario</h2>
          <div className="space-y-2">
            {alertas.length === 0 ? <div className="tarjeta"><EstadoVacio titulo="Sin alertas" /></div> : alertas.slice(alertPag * TAM_ALERTAS, (alertPag + 1) * TAM_ALERTAS).map((a) => <AlertaInventario key={a.id} alerta={a} />)}
          </div>
          {alertas.length > TAM_ALERTAS && <div className="tarjeta mt-2"><Paginador total={alertas.length} pagina={alertPag} tam={TAM_ALERTAS} onCambiar={setPagAlert} /></div>}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="tarjeta p-4" aria-label="Compras por estado">
          <h2 className="mb-3 text-base font-bold">Compras por estado</h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosCompras} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D6D3CE" vertical={false} />
                <XAxis dataKey="estado" tick={{ fontSize: 11, fill: '#6F6A64' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6F6A64' }} />
                <Tooltip />
                <Bar dataKey="cantidad" name="Órdenes" fill="#6B1F3B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="tarjeta p-4" aria-label="Movimientos de inventario">
          <h2 className="mb-3 text-base font-bold">Movimientos de inventario (14 días)</h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datosMov} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D6D3CE" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#6F6A64' }} interval={1} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6F6A64' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="materiaPrima" name="Materia prima" stroke="#6B1F3B" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="productoTerminado" name="Producto terminado" stroke="#F2B705" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section aria-label="Actividad reciente">
        <h2 className="mb-2 text-base font-bold">Actividad reciente</h2>
        <DataTable
          clave={(a) => a.fecha + a.numero + a.accion} filas={actividad} tamPagina={8} onFila={(a) => navigate(a.ruta)}
          columnas={[
            { clave: 'numero', titulo: 'Documento', render: (a) => <span className="font-semibold text-marca-vino">{a.numero}</span>, ordenable: true },
            { clave: 'docTipo', titulo: 'Tipo', className: 'hidden sm:table-cell' },
            { clave: 'accion', titulo: 'Acción' },
            { clave: 'usuarioId', titulo: 'Usuario', render: (a) => nombreDe(a.usuarioId), className: 'hidden md:table-cell' },
            { clave: 'fecha', titulo: 'Hora', render: (a) => <span title={formatearFechaHora(a.fecha)}>{tiempoRelativo(a.fecha)}</span>, valor: (a) => a.fecha, ordenable: true },
          ]} />
      </section>
    </div>
  );
}

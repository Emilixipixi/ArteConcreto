import { useMemo, useState } from 'react';
import { Mail, PackageX, PlugZap, Repeat, Send, ShoppingBag, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import BotonConPermiso from '../../components/BotonConPermiso';
import DataTable, { type Columna } from '../../components/DataTable';
import EstadoBadge from '../../components/EstadoBadge';
import FiltrosBar from '../../components/FiltrosBar';
import BuscadorArticulo from '../../components/BuscadorArticulo';
import InsigniaSimulado from '../../components/InsigniaSimulado';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import { formatearFechaHora, tiempoRelativo } from '../../lib/formato';
import { puede } from '../../lib/permisos';
import { useUsuarioActual } from '../../store/selectores';
import { agotadosEnTienda } from '../../store/selectoresFase5';
import { disponibleTerminado } from '../../store/selectoresFase4';
import { useStore } from '../../store/useStore';
import type { EventoIntegracion } from '../../types';

const CANAL: Record<EventoIntegracion['canal'], string> = { tienda_en_linea: 'Tienda en línea' };
const nuevoIdExterno = () => `ORD-${String(Math.floor(1000 + Math.random() * 9000))}`;

// P-16 Conexiones de la tienda en linea (todo SIMULADO)
export default function Conexiones() {
  const e = useStore();
  const u = useUsuarioActual()!;
  const prov = e.parametros.proveedorTienda;
  const [detalle, setDetalle] = useState<null | 'tienda' | 'crm'>(null);
  const [idExt, setIdExt] = useState(nuevoIdExterno());
  const [sku, setSku] = useState('');
  const [cant, setCant] = useState('1');
  const [cliente, setCliente] = useState('Cliente de prueba');
  const [ciudad, setCiudad] = useState('Cuenca');
  const [error, setError] = useState('');
  const [canal, setCanal] = useState('todos');
  const [estado, setEstado] = useState('todos');
  const [contrato, setContrato] = useState(false);
  const puedeSim = puede(u, 'integracion.simular');
  const productos = e.articulos.filter((a) => a.tipo === 'producto_terminado' && a.activo);
  const eventosTienda = e.eventos.filter((x) => x.canal === 'tienda_en_linea');
  const agotados = agotadosEnTienda(e);
  const ultimoEnviado = eventosTienda.find((x) => x.estado === 'aplicado' || x.estado === 'reintentado' || x.estado === 'error');
  const filas = useMemo(() => e.eventos.filter((x) => (canal === 'todos' || x.canal === canal) && (estado === 'todos' || x.estado === estado)).sort((a, b) => b.fecha.localeCompare(a.fecha)), [e.eventos, canal, estado]);

  const enviar = (id: string, s: string, c: number, cli?: string, ciu?: string) => {
    if (!id.trim()) return setError('El ID externo es obligatorio');
    if (!s) return setError('Elige un producto');
    if (!(c > 0) || !Number.isInteger(c)) return setError('La cantidad debe ser un entero mayor que cero');
    setError('');
    const r = e.simularEventoTienda(id, s, c, { cliente: cli, ciudad: ciu });
    if (!r.ok) setError(r.error ?? 'No se pudo enviar el evento'); else setIdExt(nuevoIdExterno());
  };
  const reintentar = (id: string) => { const r = e.reintentarEvento(id); if (!r.ok) e.mostrarToast(r.error ?? 'No se pudo reintentar', 'error'); };

  const tarjetas = [
    { k: 'tienda' as const, icono: ShoppingBag, titulo: `Tienda en línea (${prov})`, sub: 'Recepción de pedidos y sincronización de agotados', dato: `${eventosTienda.length} eventos - ${agotados.length} agotados reflejados`, sync: 'Última sincronización ficticia: hace 2 min' },
    { k: 'crm' as const, icono: Users, titulo: 'Conexión CRM', sub: 'Clientes y oportunidades de venta del CRM del cliente', dato: `${new Set(e.despachos.map((d) => d.cliente)).size} clientes con salidas registradas`, sync: 'Última sincronización ficticia: hace 15 min' },
  ];
  const columnas: Columna<EventoIntegracion>[] = [
    { clave: 'numero', titulo: 'Evento', render: (x) => <span className="font-semibold">{x.numero ?? x.id.toUpperCase()}</span> },
    { clave: 'canal', titulo: 'Canal', render: (x) => CANAL[x.canal] },
    { clave: 'idExterno', titulo: 'ID externo' },
    { clave: 'tipo', titulo: 'Tipo', render: (x) => x.tipo.replace(/_/g, ' ') },
    { clave: 'estado', titulo: 'Estado', render: (x) => <EstadoBadge estado={x.estado} /> },
    { clave: 'fecha', titulo: 'Fecha', valor: (x) => x.fecha, ordenable: true, render: (x) => formatearFechaHora(x.fecha) },
    { clave: 'intentos', titulo: 'Intentos', alinear: 'der', render: (x) => x.intentos },
    { clave: 'detalle', titulo: 'Detalle', render: (x) => <span className="text-xs">{x.detalle}</span> },
    { clave: 'acc', titulo: '', render: (x) => x.estado === 'error' && x.canal === 'tienda_en_linea' ? <BotonConPermiso className="!py-0.5 text-xs" permitido={puedeSim} motivo="Solo Ventas o Administración reintentan eventos" onClick={() => reintentar(x.id)}><Repeat size={12} /> Reintentar</BotonConPermiso> : null },
  ];

  return (
    <div>
      <PageHeader titulo="Conexiones de la tienda en línea" migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Conexiones' }]} subtitulo="Integraciones representadas con datos ficticios; no existe conexión real."
        acciones={<InsigniaSimulado texto="Todo lo de esta pantalla es simulado" />} />
      <div className="space-y-4">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Resumen de integraciones">
          {[
            { t: 'Eventos de la tienda', v: eventosTienda.length, c: '' },
            { t: 'Aplicados', v: e.eventos.filter((x) => x.estado === 'aplicado' || x.estado === 'reintentado').length, c: 'text-ok' },
            { t: 'Duplicados', v: e.eventos.filter((x) => x.estado === 'duplicado').length, c: 'text-concreto-600' },
            { t: 'Con error', v: e.eventos.filter((x) => x.estado === 'error').length, c: 'text-error' },
            { t: 'Agotados reflejados', v: agotados.length, c: 'text-aviso' },
          ].map((k) => <div key={k.t} className="tarjeta p-3"><p className="etiqueta">{k.t}</p><span className={`text-2xl font-bold tabular-nums ${k.c}`}>{k.v}</span></div>)}
        </section>

        <section className="grid gap-3 md:grid-cols-2" aria-label="Integraciones">
          {tarjetas.map((t) => (
            <article key={t.k} className="tarjeta space-y-2 p-4">
              <div className="flex items-start justify-between gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-concreto-100 text-marca-vino"><t.icono size={18} aria-hidden="true" /></span><InsigniaSimulado /></div>
              <h2 className="text-base font-bold">{t.titulo}</h2><p className="text-xs text-concreto-600">{t.sub}</p>
              <p className="text-sm"><span className="chip">Estado: Simulado</span></p>
              <p className="text-sm">{t.dato}</p><p className="text-xs text-concreto-600">{t.sync}</p>
              <button className="btn-secundario !py-1 text-xs" onClick={() => setDetalle(t.k)}>Ver detalle</button>
            </article>))}
        </section>

        <section className="tarjeta space-y-3 p-4" aria-label="Simulador de pedido de la tienda">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-bold">Simulador de pedido de la tienda</h2><InsigniaSimulado /></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div><label className="etiqueta" htmlFor="sm-id">ID externo</label><input id="sm-id" className="campo" value={idExt} onChange={(ev) => setIdExt(ev.target.value)} /></div>
            <div className="lg:col-span-2"><label className="etiqueta">Producto (SKU)</label><BuscadorArticulo value={sku} onChange={setSku} articulos={productos} />{sku && <p className="mt-1 text-xs text-concreto-600">Disponible total: {disponibleTerminado(e, sku).disponible}</p>}</div>
            <div><label className="etiqueta" htmlFor="sm-cant">Cantidad</label><input id="sm-cant" inputMode="numeric" className="campo" value={cant} onChange={(ev) => setCant(ev.target.value)} /></div>
            <div><label className="etiqueta" htmlFor="sm-cli">Cliente ficticio</label><input id="sm-cli" className="campo" value={cliente} onChange={(ev) => setCliente(ev.target.value)} /></div>
            <div><label className="etiqueta" htmlFor="sm-ciu">Ciudad ficticia</label><input id="sm-ciu" className="campo" value={ciudad} onChange={(ev) => setCiudad(ev.target.value)} /></div>
          </div>
          {error && <p role="alert" className="text-xs text-error">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <BotonConPermiso variante="primario" permitido={puedeSim} motivo="Solo Ventas o Administración simulan eventos" onClick={() => enviar(idExt, sku, parseInt(cant, 10), cliente, ciudad)}><Send size={14} /> Enviar evento</BotonConPermiso>
            <BotonConPermiso permitido={puedeSim && !!ultimoEnviado} motivo={!puedeSim ? 'Solo Ventas o Administración simulan eventos' : 'Aún no hay un evento para reenviar'}
              onClick={() => ultimoEnviado && enviar(ultimoEnviado.idExterno, ultimoEnviado.sku ?? '', ultimoEnviado.cantidad ?? 1, ultimoEnviado.cliente, ultimoEnviado.ciudad)}><Repeat size={14} /> Reenviar el último evento</BotonConPermiso>
          </div>
          <p className="text-xs text-concreto-600">Un ID nuevo descuenta stock una sola vez; el mismo ID reenviado queda como duplicado y no descuenta.</p>
        </section>

        <section className="tarjeta space-y-2 p-4" aria-label="Productos agotados reflejados en la tienda">
          <h2 className="flex items-center gap-2 text-base font-bold"><PackageX size={17} aria-hidden="true" /> Productos agotados reflejados en la tienda ({agotados.length})</h2>
          {agotados.length === 0 ? <p className="text-sm text-concreto-600">No hay productos agotados.</p> : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{agotados.map((a) => <li key={a.sku}><Link className="flex items-center justify-between gap-2 rounded-md border border-error/30 bg-error/5 p-2 text-sm hover:border-error" to={`/producto-terminado?sku=${a.sku}`}><span><span className="font-semibold">{a.sku}</span> {a.nombre}</span><span className="chip !bg-error/10 !text-error">Agotado</span></Link></li>)}</ul>)}
        </section>

        <section className="space-y-2" aria-label="Registro de sincronizaciones">
          <h2 className="text-base font-bold">Registro de sincronizaciones</h2>
          <FiltrosBar onLimpiar={() => { setCanal('todos'); setEstado('todos'); }} filtros={[
            { clave: 'can', etiqueta: 'Canal', valor: canal, opciones: [{ valor: 'todos', texto: 'Todos' }, ...Object.entries(CANAL).map(([v, t]) => ({ valor: v, texto: t }))], onChange: setCanal },
            { clave: 'est', etiqueta: 'Estado', valor: estado, opciones: [{ valor: 'todos', texto: 'Todos' }, ...['aplicado', 'duplicado', 'error', 'reintentado'].map((v) => ({ valor: v, texto: v }))], onChange: setEstado },
          ]} />
          <DataTable columnas={columnas} filas={filas} clave={(x) => x.id} vacioTitulo="Sin eventos" tamPagina={8}
            filaExpandida={(x) => <pre className="overflow-x-auto rounded-md bg-texto p-3 text-xs text-white">{JSON.stringify({ id_externo: x.idExterno, tipo_evento: x.tipo, canal: x.canal, sku: x.sku, cantidad: x.cantidad, estado: x.estado, intentos: x.intentos, fecha_proceso: x.fecha }, null, 2)}</pre>} />
          <div className="flex flex-wrap items-center gap-2 text-sm"><button className="btn-secundario !py-1 text-xs" onClick={() => setContrato(true)}>Ver contrato del endpoint</button><span className="text-xs text-concreto-600">POST /api/v1/integraciones/{prov.toLowerCase()}/eventos</span></div>
        </section>

        <section className="tarjeta space-y-2 p-4" aria-label="Correos y WhatsApp simulados">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-base font-bold"><Mail size={17} aria-hidden="true" /> Correos y WhatsApp simulados</h2><InsigniaSimulado /></div>
          {e.correosSimulados.length === 0 ? <p className="text-sm text-concreto-600">Aún no se enviaron avisos.</p> : (
            <ul className="divide-y divide-concreto-300 text-sm">{e.correosSimulados.slice(0, 10).map((c) => <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><span className="chip mr-2">{c.canal === 'correo' ? 'Correo' : 'WhatsApp'}</span>{c.asunto}</span><span className="text-xs text-concreto-600">Para: {c.para} - {tiempoRelativo(c.fecha)}</span></li>)}</ul>)}
        </section>
        <p className="flex items-center justify-center gap-2 text-center text-xs text-concreto-600"><PlugZap size={13} aria-hidden="true" /> Los conectores reales (credenciales, eventos exactos, reservas y reintentos) se definirán en la implementación.</p>
      </div>

      <Modal abierto={!!detalle} titulo={tarjetas.find((t) => t.k === detalle)?.titulo ?? ''} ancho="max-w-xl" onCerrar={() => setDetalle(null)} pie={<button className="btn-primario" onClick={() => setDetalle(null)}>Cerrar</button>}>
        <div className="space-y-3 text-sm"><InsigniaSimulado />
          {detalle === 'tienda' && <>
            <p>Proveedor configurado: <strong>{prov}</strong> (editable en Administración, Parámetros).</p>
            <p>Recibe pedidos (descuenta una sola vez por ID externo) y refleja los productos agotados.</p></>}
          {detalle === 'crm' && <p>Intercambia con el CRM del cliente los datos de clientes y los documentos de venta de referencia (cotizaciones y proyectos). El prototipo no escribe en ningún CRM real: es una conexión simulada con datos ilustrativos.</p>}
        </div>
      </Modal>
      <Modal abierto={contrato} titulo={`POST /api/v1/integraciones/${prov.toLowerCase()}/eventos`} ancho="max-w-xl" onCerrar={() => setContrato(false)} pie={<button className="btn-primario" onClick={() => setContrato(false)}>Cerrar</button>}>
        <div className="space-y-3 text-sm"><InsigniaSimulado texto="Contrato ilustrativo" />
          <p>Cuerpo: <code>id_externo</code>, <code>tipo_evento</code>, <code>sku</code>, <code>cantidad</code>. Idempotente por <code>id_externo</code>. Códigos: 200 aplicado o duplicado, 422 error de negocio (sin stock, SKU desconocido).</p>
          <pre className="overflow-x-auto rounded-md bg-texto p-3 text-xs text-white">{`{ "id_externo": "ORD-1001", "tipo_evento": "pedido_creado",
  "estado": "aplicado", "fecha_proceso": "2026-11-06T15:00:00Z" }`}</pre></div>
      </Modal>
    </div>
  );
}

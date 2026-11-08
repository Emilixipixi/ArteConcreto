import { createBrowserRouter } from 'react-router-dom';
import RutaProtegida from './components/RutaProtegida';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';
import GuiaDemo from './pages/GuiaDemo';
import Login from './pages/Login';
import NoEncontrada from './pages/NoEncontrada';
import Notificaciones from './pages/Notificaciones';
import Panel from './pages/Panel';
import Placeholder, { type InfoPantalla } from './pages/Placeholder';
import Prohibido from './pages/Prohibido';
import ListadoSolicitudes from './pages/solicitudes/ListadoSolicitudes';
import FormularioSolicitud from './pages/solicitudes/FormularioSolicitud';
import DetalleSolicitud from './pages/solicitudes/DetalleSolicitud';
import BandejaDirector from './pages/director/BandejaDirector';
import GestionCompras from './pages/compras/GestionCompras';
import FormularioCompra from './pages/compras/FormularioCompra';
import DetalleCompra from './pages/compras/DetalleCompra';
import AprobacionCompras from './pages/compras/AprobacionCompras';
import Tesoreria from './pages/tesoreria/Tesoreria';
import FormularioPago from './pages/tesoreria/FormularioPago';
import DetallePago from './pages/tesoreria/DetallePago';
import BandejaRecepcion from './pages/recepcion/BandejaRecepcion';
import RecepcionOrden from './pages/recepcion/RecepcionOrden';
import InventarioMP from './pages/materias/InventarioMP';
import ListadoFabricaciones from './pages/fabricacion/ListadoFabricaciones';
import FormularioFabricacion from './pages/fabricacion/FormularioFabricacion';
import DetalleFabricacion from './pages/fabricacion/DetalleFabricacion';
import InventarioPT from './pages/terminado/InventarioPT';
import DetalleProductoPT from './pages/terminado/DetalleProductoPT';
import ListadoTraslados from './pages/traslados/ListadoTraslados';
import FormularioTraslado from './pages/traslados/FormularioTraslado';
import DetalleTraslado from './pages/traslados/DetalleTraslado';
import Disponibilidad from './pages/disponibilidad/Disponibilidad';
import Conexiones from './pages/conexiones/Conexiones';
import Reportes from './pages/reportes/Reportes';
import Administracion from './pages/administracion/Administracion';
import MapaSistema from './pages/MapaSistema';
import ListadoDespachos from './pages/ventas/ListadoDespachos';
import FormularioDespacho from './pages/ventas/FormularioDespacho';
import DetalleDespacho from './pages/ventas/DetalleDespacho';
import type { ReactNode } from 'react';

// Rutas reales de la Fase 2 (P-03 a P-07), cada una protegida por la ruta base
const protegida = (base: string, el: ReactNode) => <RutaProtegida base={base}>{el}</RutaProtegida>;
const RUTAS_FASE2 = [
  { path: '/solicitudes', element: protegida('/solicitudes', <ListadoSolicitudes />) },
  { path: '/solicitudes/nueva', element: protegida('/solicitudes', <FormularioSolicitud />) },
  { path: '/solicitudes/:id', element: protegida('/solicitudes', <DetalleSolicitud />) },
  { path: '/solicitudes/:id/editar', element: protegida('/solicitudes', <FormularioSolicitud />) },
  { path: '/director', element: protegida('/director', <BandejaDirector />) },
  { path: '/director/:id', element: protegida('/director', <BandejaDirector />) },
  { path: '/compras', element: protegida('/compras', <GestionCompras />) },
  { path: '/compras/:id', element: protegida('/compras', <DetalleCompra />) },
  { path: '/compras/:id/editar', element: protegida('/compras', <FormularioCompra />) },
  { path: '/aprobacion-compras', element: protegida('/aprobacion-compras', <AprobacionCompras />) },
  { path: '/aprobacion-compras/:id', element: protegida('/aprobacion-compras', <AprobacionCompras />) },
];
// Rutas reales de la Fase 3 (P-08 a P-10)
const RUTAS_FASE3 = [
  { path: '/tesoreria', element: protegida('/tesoreria', <Tesoreria />) },
  { path: '/tesoreria/nueva', element: protegida('/tesoreria', <FormularioPago />) },
  { path: '/tesoreria/:id', element: protegida('/tesoreria', <DetallePago />) },
  { path: '/recepcion', element: protegida('/recepcion', <BandejaRecepcion />) },
  { path: '/recepcion/:id', element: protegida('/recepcion', <RecepcionOrden />) },
  { path: '/materias-primas', element: protegida('/materias-primas', <InventarioMP />) },
];
// Rutas reales de la Fase 4 (P-11 a P-14)
const RUTAS_FASE4 = [
  { path: '/fabricacion', element: protegida('/fabricacion', <ListadoFabricaciones />) },
  { path: '/fabricacion/nueva', element: protegida('/fabricacion', <FormularioFabricacion />) },
  { path: '/fabricacion/:id', element: protegida('/fabricacion', <DetalleFabricacion />) },
  { path: '/fabricacion/:id/editar', element: protegida('/fabricacion', <FormularioFabricacion />) },
  { path: '/producto-terminado', element: protegida('/producto-terminado', <InventarioPT />) },
  { path: '/producto-terminado/:sku', element: protegida('/producto-terminado', <DetalleProductoPT />) },
  { path: '/traslados', element: protegida('/traslados', <ListadoTraslados />) },
  { path: '/traslados/nuevo', element: protegida('/traslados', <FormularioTraslado />) },
  { path: '/traslados/:id', element: protegida('/traslados', <DetalleTraslado />) },
  { path: '/ventas', element: protegida('/ventas', <ListadoDespachos />) },
  { path: '/ventas/nueva', element: protegida('/ventas', <FormularioDespacho />) },
  { path: '/ventas/:id', element: protegida('/ventas', <DetalleDespacho />) },
  { path: '/ventas/:id/editar', element: protegida('/ventas', <FormularioDespacho />) },
];

// Rutas reales de la Fase 5 (P-15 a P-18)
const RUTAS_FASE5 = [
  { path: '/disponibilidad', element: protegida('/disponibilidad', <Disponibilidad />) },
  { path: '/conexiones', element: protegida('/conexiones', <Conexiones />) },
  { path: '/reportes', element: protegida('/reportes', <Reportes />) },
  { path: '/administracion', element: protegida('/administracion', <Administracion />) },
];

// Pantallas P-03 a P-18: rutas base con esqueleto hasta su fase (el comodin cubre subrutas /:id y /nueva)
const PANTALLAS: (InfoPantalla & { base: string })[] = [
  { base: '/solicitudes', codigo: 'P-03 / P-04', titulo: 'Solicitudes de materiales', fase: 2, descripcion: 'Listado, creación y detalle de solicitudes.' },
  { base: '/director', codigo: 'P-05', titulo: 'Bandeja del director', fase: 2, descripcion: 'Aprobar, devolver o rechazar solicitudes.' },
  { base: '/compras', codigo: 'P-06', titulo: 'Gestión de compras', fase: 2, descripcion: 'Cotizar, elegir proveedor y generar la orden.' },
  { base: '/aprobacion-compras', codigo: 'P-07', titulo: 'Aprobación de compras', fase: 2, descripcion: 'Autorizar o devolver órdenes de compra.' },
  { base: '/tesoreria', codigo: 'P-08', titulo: 'Tesorería y pagos', fase: 3, descripcion: 'Anticipos, pagos, comprobantes y conciliación.' },
  { base: '/recepcion', codigo: 'P-09', titulo: 'Recepción de almacén', fase: 3, descripcion: 'Recepciones totales y parciales.' },
  { base: '/materias-primas', codigo: 'P-10', titulo: 'Inventario de materias primas', fase: 3, descripcion: 'Existencias, movimientos y ajustes de insumos.' },
  { base: '/fabricacion', codigo: 'P-11', titulo: 'Registro de fabricación', fase: 4, descripcion: 'Consumos y producto terminado por lote.' },
  { base: '/producto-terminado', codigo: 'P-12', titulo: 'Inventario de producto terminado', fase: 4, descripcion: 'Existencias por bodega y trazabilidad.' },
  { base: '/traslados', codigo: 'P-13', titulo: 'Traslados entre bodegas', fase: 4, descripcion: 'Origen, tránsito y destino.' },
  { base: '/ventas', codigo: 'P-14', titulo: 'Ventas y despachos', fase: 4, descripcion: 'Ventas, despachos y confirmación de salida.' },
  { base: '/disponibilidad', codigo: 'P-15', titulo: 'Consulta de disponibilidad', fase: 5, descripcion: 'Existencias, disponible y alternativa de fabricación de un producto.' },
  { base: '/conexiones', codigo: 'P-16', titulo: 'Conexiones de la tienda en línea', fase: 5, descripcion: 'Integraciones simuladas y registro de eventos.' },
  { base: '/reportes', codigo: 'P-17', titulo: 'Reportes y trazabilidad', fase: 5, descripcion: 'Reportes y movimientos consolidados.' },
  { base: '/administracion', codigo: 'P-18', titulo: 'Administración', fase: 5, descripcion: 'Usuarios, roles, bodegas, catálogos y parámetros.' },
];

export const router = createBrowserRouter([
  { element: <AuthLayout />, children: [{ path: '/login', element: <Login /> }] },
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Panel /> },
      { path: '/notificaciones', element: <Notificaciones /> },
      { path: '/guia-demo', element: <GuiaDemo /> },
      { path: '/mapa-sistema', element: <MapaSistema /> },
      { path: '/403', element: <Prohibido /> },
      ...RUTAS_FASE2,
      ...RUTAS_FASE3,
      ...RUTAS_FASE4,
      ...RUTAS_FASE5,
      ...PANTALLAS.filter((p) => p.fase > 5).map((p) => ({
        path: `${p.base}/*`,
        element: <RutaProtegida base={p.base}><Placeholder info={p} /></RutaProtegida>,
      })),
      { path: '*', element: <NoEncontrada /> },
    ],
  },
]);

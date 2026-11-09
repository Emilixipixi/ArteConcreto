// Definicion del menu lateral (tabla de la Fase 1). Los roles viven en permisos.ts (ROLES_POR_RUTA).
import {
  BadgeCheck, Banknote, BookOpen, Bell, Boxes, Factory, Gauge, GitBranch, Hammer, LayoutDashboard, LineChart, PackageCheck, PlugZap,
  ClipboardList, ClipboardCheck, ShoppingCart, ShieldCheck, Settings, ShoppingBag, Truck, ArrowLeftRight, Search, Map as IconoMapa, type LucideIcon,
} from 'lucide-react';

export interface ItemMenu { etiqueta: string; ruta: string; icono: LucideIcon; grupo: string; pantalla: string }

export const GRUPOS = ['General', 'Operación', 'Inventarios', 'Comercial', 'Control', 'Administración', 'Utilidades'];

export const MENU: ItemMenu[] = [
  { grupo: 'General', etiqueta: 'Panel general', ruta: '/', icono: LayoutDashboard, pantalla: 'P-02' },
  { grupo: 'Operación', etiqueta: 'Solicitudes', ruta: '/solicitudes', icono: ClipboardList, pantalla: 'P-03' },
  { grupo: 'Operación', etiqueta: 'Bandeja del director', ruta: '/director', icono: ClipboardCheck, pantalla: 'P-05' },
  { grupo: 'Operación', etiqueta: 'Gestión de compras', ruta: '/compras', icono: ShoppingCart, pantalla: 'P-06' },
  { grupo: 'Operación', etiqueta: 'Aprobación de compras', ruta: '/aprobacion-compras', icono: ShieldCheck, pantalla: 'P-07' },
  { grupo: 'Operación', etiqueta: 'Tesorería y pagos', ruta: '/tesoreria', icono: Banknote, pantalla: 'P-08' },
  { grupo: 'Operación', etiqueta: 'Aprobar pagos', ruta: '/aprobacion-pagos', icono: BadgeCheck, pantalla: 'P-08' },
  { grupo: 'Operación', etiqueta: 'Recepción de almacén', ruta: '/recepcion', icono: PackageCheck, pantalla: 'P-09' },
  { grupo: 'Inventarios', etiqueta: 'Materias primas', ruta: '/materias-primas', icono: Boxes, pantalla: 'P-10' },
  { grupo: 'Inventarios', etiqueta: 'Fabricación', ruta: '/fabricacion', icono: Factory, pantalla: 'P-11' },
  { grupo: 'Inventarios', etiqueta: 'Producto terminado', ruta: '/producto-terminado', icono: Hammer, pantalla: 'P-12' },
  { grupo: 'Inventarios', etiqueta: 'Traslados', ruta: '/traslados', icono: ArrowLeftRight, pantalla: 'P-13' },
  { grupo: 'Comercial', etiqueta: 'Ventas y despachos', ruta: '/ventas', icono: Truck, pantalla: 'P-14' },
  { grupo: 'Comercial', etiqueta: 'Consulta de disponibilidad', ruta: '/disponibilidad', icono: Search, pantalla: 'P-15' },
  { grupo: 'Comercial', etiqueta: 'Conexiones tienda', ruta: '/conexiones', icono: PlugZap, pantalla: 'P-16' },
  { grupo: 'Control', etiqueta: 'Reportes y trazabilidad', ruta: '/reportes', icono: LineChart, pantalla: 'P-17' },
  { grupo: 'Administración', etiqueta: 'Administración', ruta: '/administracion', icono: Settings, pantalla: 'P-18' },
  { grupo: 'Utilidades', etiqueta: 'Notificaciones', ruta: '/notificaciones', icono: Bell, pantalla: 'Extra' },
  { grupo: 'Utilidades', etiqueta: 'Mapa del sistema', ruta: '/mapa-sistema', icono: IconoMapa, pantalla: 'Extra' },
  { grupo: 'Utilidades', etiqueta: 'Guía de demostración', ruta: '/guia-demo', icono: BookOpen, pantalla: 'Extra' },
];

// Iconos reservados para uso en otras pantallas
export const ICONOS_EXTRA = { Gauge, GitBranch, ShoppingBag };

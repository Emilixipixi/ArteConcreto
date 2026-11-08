import type { Rol } from '../types';

export const ROLES: Rol[] = [
  { id: 'admin', nombre: 'Administrador', responsabilidad: 'Configura usuarios, roles, bodegas, catalogos y parametros; ve la trazabilidad global. No aprueba documentos operativos.' },
  { id: 'solicitante', nombre: 'Solicitante / Planta', responsabilidad: 'Crea y envia solicitudes de materiales; ve estados y devoluciones.' },
  { id: 'director', nombre: 'Director de solicitudes', responsabilidad: 'Aprueba, rechaza o devuelve solicitudes; aprueba ajustes de inventario.' },
  { id: 'compras', nombre: 'Compras', responsabilidad: 'Convierte solicitudes aprobadas en compras, cotiza, elige proveedor y genera la orden.' },
  { id: 'aprobador_compra', nombre: 'Aprobador de compra', responsabilidad: 'Autoriza o devuelve ordenes de compra.' },
  { id: 'tesoreria', nombre: 'Tesoreria', responsabilidad: 'Prepara, aprueba y registra solicitudes de pago y anticipo, adjunta comprobantes y concilia. Es una sola persona: no hay un aprobador de pago aparte.' },
  { id: 'almacen', nombre: 'Almacen', responsabilidad: 'Confirma recepciones, custodia stock, ejecuta y confirma traslados y salidas fisicas.' },
  { id: 'produccion', nombre: 'Produccion', responsabilidad: 'Registra fabricaciones, consumos y producto terminado.' },
  { id: 'ventas', nombre: 'Ventas / Despacho', responsabilidad: 'Consulta disponibilidad, registra ventas y despachos.' },
];

export const ROL_NOMBRE: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.id, r.nombre]));

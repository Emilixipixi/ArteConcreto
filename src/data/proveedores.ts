import type { Proveedor } from '../types';

// Proveedores ficticios con identificacion fiscal ficticia
export const PROVEEDORES: Proveedor[] = [
  { id: 'p-cementos', nombre: 'Cementos del Valle S.A.', identificacionFiscal: '0990000001001', contacto: 'Mariana Lozada', correo: 'ventas@cementosdelvalle.test', ciudad: 'Guayaquil', condicionesPago: 'Pago a 15 dias', diasEntrega: 5, activo: true },
  { id: 'p-agregados', nombre: 'Agregados y Gravas del Norte', identificacionFiscal: '1790000002001', contacto: 'Hugo Calderon', correo: 'pedidos@agregadosnorte.test', ciudad: 'Quito', condicionesPago: 'Contra entrega', diasEntrega: 3, activo: true },
  { id: 'p-aceros', nombre: 'Aceros Andinos Cía. Ltda.', identificacionFiscal: '1790000003001', contacto: 'Patricia Vera', correo: 'comercial@acerosandinos.test', ciudad: 'Quito', condicionesPago: 'Anticipo 30 % y saldo contra entrega', diasEntrega: 7, activo: true },
  { id: 'p-quimicos', nombre: 'Químicos para Construcción S.A.', identificacionFiscal: '0990000004001', contacto: 'Esteban Mora', correo: 'ventas@quimicosconstruccion.test', ciudad: 'Guayaquil', condicionesPago: 'Anticipo 50 % y saldo a 30 dias', diasEntrega: 10, activo: true },
];

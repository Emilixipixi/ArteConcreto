import type { Usuario } from '../types';

// Usuarios de demostracion (ficticios). Andres Pineda tiene dos roles.
export const USUARIOS: Usuario[] = [
  { id: 'u-laura', nombre: 'Laura Mendoza', correo: 'laura.mendoza@demo.arteconcreto.test', roles: ['admin'], activo: true, descripcion: 'Configura usuarios, bodegas, catalogos y parametros, y revisa la trazabilidad global.' },
  { id: 'u-carlos', nombre: 'Carlos Rueda', correo: 'carlos.rueda@demo.arteconcreto.test', roles: ['solicitante'], activo: true, descripcion: 'Crea solicitudes de materiales desde planta y atiende las devoluciones.' },
  { id: 'u-marcela', nombre: 'Marcela Ortiz', correo: 'marcela.ortiz@demo.arteconcreto.test', roles: ['director'], activo: true, descripcion: 'Aprueba, devuelve o rechaza solicitudes y aprueba ajustes de inventario.' },
  { id: 'u-andres', nombre: 'Andrés Pineda', correo: 'andres.pineda@demo.arteconcreto.test', roles: ['compras', 'solicitante'], activo: true, descripcion: 'Gestiona compras y cotizaciones; tambien puede crear solicitudes propias.' },
  { id: 'u-julian', nombre: 'Julián Ardila', correo: 'julian.ardila@demo.arteconcreto.test', roles: ['aprobador_compra'], activo: true, descripcion: 'Autoriza o devuelve ordenes de compra de monto alto.' },
  { id: 'u-paola', nombre: 'Paola Suárez', correo: 'paola.suarez@demo.arteconcreto.test', roles: ['tesoreria'], activo: true, descripcion: 'Prepara, aprueba y registra pagos y anticipos, adjunta comprobantes y concilia.' },
  { id: 'u-sergio', nombre: 'Sergio Báez', correo: 'sergio.baez@demo.arteconcreto.test', roles: ['almacen'], activo: true, descripcion: 'Confirma recepciones, traslados y salidas fisicas de bodega.' },
  { id: 'u-daniela', nombre: 'Daniela Rojas', correo: 'daniela.rojas@demo.arteconcreto.test', roles: ['produccion'], activo: true, descripcion: 'Registra fabricaciones, consumos de insumos y producto terminado.' },
  { id: 'u-camila', nombre: 'Camila Vargas', correo: 'camila.vargas@demo.arteconcreto.test', roles: ['ventas'], activo: true, descripcion: 'Consulta disponibilidad, registra ventas y despachos.' },
];

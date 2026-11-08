// Semilla completa de la demostracion. Se calcula al cargar para que las fechas sean relativas a "hoy".
import type {
  Ajuste, Articulo, AuditoriaItem, Bodega, Compra, CorreoSimulado, Despacho, EventoIntegracion, ExistenciaItem, Fabricacion,
  CuentaBancaria, FacturaProveedor, Movimiento, MovimientoBanco, Notificacion, Pago, Parametros, Proveedor, Recepcion, Reserva, Rol, Solicitud, SolicitudPago, Traslado, Unidad, Usuario,
} from '../types';
import { ARTICULOS } from './articulos';
import { BODEGAS } from './bodegas';
import { crearCompras, crearPagos, crearRecepciones, crearSolicitudesPago } from './compras';
import { crearExistencias, crearMovimientos } from './existencias';
import { crearNotificaciones } from './notificaciones';
import { crearAjustes, crearDespachos, crearEventos, crearFabricaciones, crearTraslados } from './operacion';
import { PARAMETROS } from './parametros';
import { PROVEEDORES } from './proveedores';
import { ROLES } from './roles';
import { crearSolicitudes } from './solicitudes';
import { UNIDADES } from './unidades';
import { USUARIOS } from './usuarios';
import { hace } from '../lib/formato';
import * as X from './extra';
import { crearTesoreriaExtra } from './tesoreria';
import { crearFacturasYBanco } from './tesoreriaBanco';
import { ARTICULOS_EXTRA, AUDITORIA_EXTRA, NOTIFICACIONES_HIST, VOLUMEN } from './volumen';

export interface DatosDemo {
  roles: Rol[]; usuarios: Usuario[]; bodegas: Bodega[]; unidades: Unidad[]; articulos: Articulo[]; proveedores: Proveedor[];
  solicitudes: Solicitud[]; compras: Compra[]; solicitudesPago: SolicitudPago[]; pagos: Pago[]; recepciones: Recepcion[];
  movimientos: Movimiento[]; existencias: ExistenciaItem[]; fabricaciones: Fabricacion[]; traslados: Traslado[];
  despachos: Despacho[]; ajustes: Ajuste[]; eventos: EventoIntegracion[]; notificaciones: Notificacion[];
  correosSimulados: CorreoSimulado[]; parametros: Parametros;
  reservas: Reserva[]; // Fase 4 (sin semilla: se crean desde P-12)
  auditoria: AuditoriaItem[]; categorias: string[]; // Fase 5
  facturas: FacturaProveedor[]; cuentasBancarias: CuentaBancaria[]; movimientosBanco: MovimientoBanco[]; // Tesoreria ampliada
}

const maxDe = (lista: { numero: string }[], pref: string) => lista.reduce((m, x) => Math.max(m, Number(x.numero.match(new RegExp(`^${pref}-(\\d+)$`))?.[1] ?? 0)), 0);

export function crearDatosDemo(): DatosDemo {
  const d = crearBase();
  // Carga adicional de Tesoreria (anticipos en todas las etapas): continua la numeracion existente
  const t = crearTesoreriaExtra({ sol: maxDe(d.solicitudes, 'SOL'), oc: maxDe(d.compras, 'OC'), pag: maxDe(d.solicitudesPago, 'PAG'), pg: d.pagos.length });
  d.solicitudes.push(...t.solicitudes); d.compras.push(...t.compras); d.solicitudesPago.push(...t.solicitudesPago); d.pagos.push(...t.pagos);
  // Facturas de proveedor, cuentas bancarias y extracto: se derivan de las compras, recepciones y pagos ya generados
  const tb = crearFacturasYBanco(d);
  d.facturas = tb.facturas; d.cuentasBancarias = tb.cuentas; d.movimientosBanco = tb.movimientos; d.pagos = tb.pagos;
  return d;
}

function crearBase(): DatosDemo {
  return {
    roles: structuredClone(ROLES), usuarios: structuredClone(USUARIOS), bodegas: structuredClone(BODEGAS),
    unidades: structuredClone(UNIDADES), articulos: [...structuredClone(ARTICULOS), ...ARTICULOS_EXTRA], proveedores: [...structuredClone(PROVEEDORES), ...X.PROVEEDORES_EXTRA],
    solicitudes: [...crearSolicitudes(), ...X.crearSolicitudesExtra(), ...VOLUMEN.solicitudes], compras: [...crearCompras(), ...X.crearComprasExtra(), ...VOLUMEN.compras], solicitudesPago: [...crearSolicitudesPago(), ...X.crearSolicitudesPagoExtra(), ...VOLUMEN.solicitudesPago], pagos: [...crearPagos(), ...X.crearPagosExtra(), ...VOLUMEN.pagos],
    recepciones: [...crearRecepciones(), ...X.crearRecepcionesExtra(), ...VOLUMEN.recepciones], movimientos: crearMovimientos(), existencias: crearExistencias(),
    fabricaciones: [...crearFabricaciones(), ...X.crearFabricacionesExtra(), ...VOLUMEN.fabricaciones], traslados: [...crearTraslados(), ...X.crearTrasladosExtra(), ...VOLUMEN.traslados], despachos: [...crearDespachos(), ...X.crearDespachosExtra(), ...VOLUMEN.despachos], ajustes: [...crearAjustes(), ...X.crearAjustesExtra(), ...VOLUMEN.ajustes],
    eventos: [...crearEventos(), ...X.crearEventosExtra(), ...VOLUMEN.eventos], notificaciones: [...crearNotificaciones(), ...X.crearNotificacionesExtra(), ...NOTIFICACIONES_HIST],
    correosSimulados: [
      { id: 'cs-001', fecha: hace(0, 4), para: 'Aprobador de compra', asunto: 'Orden OC-0003 pendiente de aprobación', canal: 'correo' },
      { id: 'cs-002', fecha: hace(0, 1), para: 'Almacén y Compras', asunto: 'Recepción vencida: OC-0001', canal: 'correo' },
      ...X.crearCorreosExtra(),
    ],
    parametros: { ...PARAMETROS }, reservas: [],
    auditoria: [...AUDITORIA_EXTRA, { id: 'aud-0001', fecha: hace(5), usuarioId: 'u-laura', entidad: 'Parámetros', accion: 'Configuración inicial', detalle: 'Se cargaron los parámetros de la demostración (umbral de compra, tolerancia de consumo, días de recepción vencida).' }],
    facturas: [], cuentasBancarias: [], movimientosBanco: [], // se completan en crearDatosDemo
    categorias: ['Bancas', 'Mesas', 'Macetas', 'Bolardos', 'Canecas', 'Bicicleteros', 'Lavamanos', 'Cerramientos y calados', 'Pisos', 'Cemento y aglomerantes', 'Agregados', 'Acero', 'Aditivos', 'Pigmentos', 'Desmoldantes'],
  };
}

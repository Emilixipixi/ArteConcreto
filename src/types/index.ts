// Tipos de todas las entidades del prototipo (Prompt Maestro, seccion 8).

export type RolId =
  | 'admin' | 'solicitante' | 'director' | 'compras' | 'aprobador_compra'
  | 'tesoreria' | 'almacen' | 'produccion' | 'ventas';

export interface Rol { id: RolId; nombre: string; responsabilidad: string; }

export type Familia = 'peso' | 'volumen' | 'longitud' | 'superficie' | 'conteo';
export interface Unidad {
  id: string; nombre: string; simbolo: string; familia: Familia;
  decimales: number; factorABase: number; esBase: boolean;
}

export interface Presentacion { unidadId: string; factorABase: number; etiqueta?: string; } // ej. saco50 -> 50 kg
export interface Articulo {
  sku: string; nombre: string; tipo: 'materia_prima' | 'producto_terminado'; categoria: string;
  unidadBaseId: string; presentaciones: Presentacion[]; stockMinimo: number; activo: boolean;
  receta?: { sku: string; cantidadBase: number }[]; // solo producto terminado: consumo estandar por unidad
  plazoFabricacionDias?: number;                    // solo producto terminado
  precioReferencia?: number;                        // USD, ilustrativo
}

export interface Bodega { id: string; codigo: string; nombre: string; ubicacion: string; activa: boolean; }
export interface Usuario { id: string; nombre: string; correo: string; roles: RolId[]; activo: boolean; descripcion?: string; }

// SUPUESTO: el maestro no define Proveedor; se agrega con los campos pedidos en la seccion 13.
export interface Proveedor {
  id: string; nombre: string; identificacionFiscal: string; contacto: string; correo: string;
  ciudad: string; condicionesPago: string; diasEntrega: number; activo: boolean;
}

export interface HistorialItem {
  fecha: string; usuarioId: string; accion: string;
  estadoAnterior?: string; estadoNuevo?: string; observacion?: string;
}

export interface Base {
  id: string; numero: string; creadoPor: string; creadoEn: string; actualizadoEn: string;
  historial: HistorialItem[];
}

export type Prioridad = 'baja' | 'media' | 'alta' | 'urgente';

export interface LineaSolicitud { sku: string; cantidad: number; unidadId: string; observacion?: string; destinoBodegaId?: string; }
export interface Solicitud extends Base {
  estado: 'borrador' | 'pendiente' | 'devuelta' | 'aprobada' | 'rechazada' | 'en_compra' | 'cerrada';
  area: string; prioridad: Prioridad; justificacion: string; lineas: LineaSolicitud[]; adjuntos: string[];
  fechaRequerida?: string; // yyyy-mm-dd (Fase 2)
}

export interface Cotizacion {
  proveedorId: string; precios: { sku: string; precioUnitario: number }[];
  condiciones: string; diasEntrega: number; seleccionada: boolean;
}
export interface LineaCompra { sku: string; cantidad: number; unidadId: string; precioUnitario: number; }
export interface Compra extends Base {
  solicitudId?: string; origen: 'solicitud' | 'administrativa'; proveedorId: string;
  lineas: LineaCompra[]; cotizaciones: Cotizacion[]; modalidadPago: 'anticipo' | 'pago_posterior';
  porcentajeAnticipo?: number; condiciones: string; fechaEstimadaEntrega: string;
  subtotal: number; impuestoInformativo: number; total: number;
  estado: 'borrador' | 'pendiente_aprobacion' | 'devuelta' | 'aprobada' | 'rechazada' | 'recibida_parcial' | 'recibida' | 'cerrada';
  estadoRecepcion: 'pendiente' | 'parcial' | 'completa';
  estadoPago: 'sin_pago' | 'anticipo' | 'pago_parcial' | 'pagado';
  // Campos opcionales agregados en la Fase 2
  ordenGenerada?: boolean;           // la orden ya fue generada y puede enviarse a aprobacion
  lugarEntregaBodegaId?: string; observaciones?: string;
  motivoAdministrativo?: string; centroCosto?: string; // solo origen 'administrativa' (RN-01)
  justificacionCantidad?: string;    // si se aumenta la cantidad respecto de la solicitud
}

export interface SolicitudPago extends Base {
  compraId: string; tipo: 'anticipo' | 'pago_final'; importe: number; observacion?: string;
  estado: 'preparada' | 'pendiente_aprobacion' | 'devuelta' | 'aprobada' | 'pagada' | 'conciliada';
}
export interface Pago {
  id: string; solicitudPagoId: string; fecha: string; importe: number;
  medio: 'transferencia' | 'cheque' | 'efectivo' | 'tarjeta'; comprobante: string; registradoPor: string;
  referencia?: string; // Fase 3: Nº de comprobante o referencia bancaria
  cuentaId?: string;   // Tesoreria: cuenta bancaria desde la que se pago (no aplica al efectivo)
}

// ---- Tesoreria ampliada: facturas de proveedor, cuentas bancarias y conciliacion bancaria ----
/** Factura del proveedor vinculada a una orden de compra. El cotejo compara orden, recepcion y factura. */
export interface FacturaProveedor extends Base {
  compraId: string; proveedorId: string; numeroFactura: string; fechaEmision: string; fechaVencimiento: string;
  subtotal: number; iva: number; total: number; archivo: string;
  valorRecibido: number; diferencia: number; // valor recibido (con impuesto) al registrar y total facturado menos recibido
  estado: 'cotejada' | 'con_diferencia' | 'en_reclamo' | 'anulada'; observacion?: string;
}
export interface CuentaBancaria { id: string; nombre: string; banco: string; ultimos4: string; saldoInicial: number }
/** Linea del extracto bancario (simulado). monto negativo = egreso. */
export interface MovimientoBanco {
  id: string; cuentaId: string; fecha: string; descripcion: string; referencia: string; monto: number;
  estado: 'sin_conciliar' | 'conciliado' | 'gasto_bancario'; pagoId?: string; nota?: string; conciliadoPor?: string; conciliadoEn?: string;
}

export interface LineaRecepcion {
  sku: string; ordenado: number; recibidoAntes: number; recibidoAhora: number; faltante: number; unidadId: string;
  observacion?: string; exceso?: boolean; // Fase 3: nota por linea y marca de "Exceso aceptado"
}
export interface Recepcion extends Base {
  compraId: string; bodegaId: string; lineas: LineaRecepcion[]; observacion?: string; esCierre: boolean; estado: 'confirmada';
  // Campos opcionales agregados en la Fase 3
  fechaRecepcion?: string; remision?: string; adjuntos?: string[]; motivoExceso?: string; motivoCierre?: string;
}

export type TipoMovimiento =
  | 'entrada_compra' | 'salida_fabricacion' | 'entrada_fabricacion' | 'traslado_salida'
  | 'traslado_entrada' | 'salida_venta' | 'salida_despacho' | 'ajuste';
export interface Movimiento {
  id: string; fecha: string; sku: string; tipoArticulo: 'materia_prima' | 'producto_terminado';
  tipo: TipoMovimiento; bodegaOrigenId?: string; bodegaDestinoId?: string; cantidadBase: number;
  documentoTipo: string; documentoId: string; usuarioId: string; observacion?: string;
}

export interface ExistenciaItem { sku: string; bodegaId: string; fisica: number; comprometida: number; enTransito: number; } // unidad base

export interface Fabricacion extends Base {
  skuProducto: string; lote: string; cantidadFabricada: number; bodegaDestinoId: string; bodegaOrigenInsumosId: string;
  consumos: { sku: string; estandar: number; real: number; extra?: boolean; justificacion?: string }[]; desviacionPct: number; requiereConfirmacionDirector: boolean;
  estado: 'borrador' | 'pendiente_director' | 'confirmada' | 'anulada'; fechaFabricacion: string;
  observacion?: string; motivoAnulacion?: string; // Fase 4
}

export interface Traslado extends Base {
  origenId: string; destinoId: string; lineas: { sku: string; cantidadEnviada: number; cantidadRecibida?: number }[];
  estado: 'borrador' | 'en_transito' | 'recibido' | 'recibido_con_diferencias' | 'cancelado';
  observacion?: string; // Fase 4
}

export interface Despacho extends Base {
  canal: 'punto_venta' | 'despacho_cliente' | 'tienda_en_linea'; bodegaId: string; cliente: string; destino: string;
  documentoReferencia: string; proyecto?: string; lineas: { sku: string; cantidad: number }[];
  estado: 'borrador' | 'pendiente_salida' | 'confirmado' | 'anulado';
  estadoAdministrativo: 'sin_descargar' | 'descargado_contabilidad';
  identificacionCliente?: string; reservaId?: string; motivoAnulacion?: string; // Fase 4
}

// SUPUESTO: el maestro nombra AJU-0001 y el movimiento 'ajuste' pero no define la entidad; se agrega.
export interface Ajuste extends Base {
  sku: string; bodegaId: string; cantidadBase: number; // con signo: negativo = merma
  motivo: string; estado: 'pendiente' | 'aprobado' | 'rechazado';
  tipoAjuste?: 'merma' | 'conteo_fisico' | 'correccion'; // Fase 3
}

export interface EventoIntegracion {
  id: string; canal: 'tienda_en_linea'; idExterno: string; tipo: string;
  estado: 'aplicado' | 'duplicado' | 'error' | 'reintentado'; fecha: string; detalle: string; intentos: number;
  // Fase 5 (opcionales): numero visible, datos del pedido simulado y despacho generado
  numero?: string; sku?: string; cantidad?: number; cliente?: string; ciudad?: string; despachoId?: string;
}

// Fase 5: bitacora de cambios de configuracion (RF-05)
export interface AuditoriaItem { id: string; fecha: string; usuarioId: string; entidad: string; accion: string; detalle: string; }

export interface Notificacion {
  id: string; fecha: string; destinatarioRoles: RolId[]; destinatarioUsuarios?: string[];
  tipo: 'info' | 'accion' | 'alerta' | 'exito'; titulo: string; mensaje: string;
  docTipo: string; docId: string; ruta: string; leidaPor: string[];
}

// Registro de correos/WhatsApp simulados (seccion 12, punto 6)
export interface CorreoSimulado { id: string; fecha: string; para: string; asunto: string; canal: 'correo' | 'whatsapp'; }

export interface Parametros {
  umbralCompra: number; toleranciaConsumo: number; diasRecepcionVencida: number;
  proveedorTienda: string; impuestoInformativoPct: number;
  umbralStockPct?: number; // Fase 5: porcentaje del minimo bajo el cual se alerta (100 = por debajo del minimo)
}

export type ResultadoAccion = { ok: boolean; error?: string; id?: string };

// SUPUESTO: el maestro habla de reservas (RN-07) sin definir la entidad; se agrega (Fase 4).
export interface Reserva extends Base {
  sku: string; bodegaId: string; cantidad: number; cliente: string; referencia: string; vence: string; // vence: yyyy-mm-dd
  estado: 'activa' | 'liberada' | 'vencida' | 'consumida';
}

// Entidades que llevan numero consecutivo
export type PrefijoNumero = 'RES' | 'SOL' | 'OC' | 'PAG' | 'REC' | 'FAB' | 'TRS' | 'DSP' | 'AJU' | 'EVT' | 'FAC';

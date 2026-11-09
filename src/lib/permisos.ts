// Permisos por funcion y reglas de segregacion (maestro, secciones 7 y 7.2).
import type { Compra, HistorialItem, Pago, Parametros, RolId, SolicitudPago, Usuario } from '../types';

export type Accion =
  | 'solicitud.crear' | 'solicitud.decidir' | 'compra.crear' | 'compra.aprobar'
  | 'pago.preparar' | 'pago.aprobar' | 'pago.registrar' | 'recepcion.confirmar'
  | 'ajuste.crear' | 'ajuste.aprobar' | 'fabricacion.registrar' | 'fabricacion.confirmar_desvio'
  | 'traslado.crear' | 'traslado.recibir' | 'despacho.crear' | 'salida.confirmar'
  | 'reserva.crear' | 'documento.anular' | 'despacho.descargar'
  | 'disponibilidad.consultar' | 'admin.gestionar' | 'integracion.simular'
  | 'factura.registrar' | 'banco.conciliar';

// Matriz accion -> roles. Un usuario con varios roles combina los permisos (RN-15).
export const MATRIZ: Record<Accion, RolId[]> = {
  'solicitud.crear': ['solicitante', 'produccion'], // Fase 4: Produccion solicita los materiales faltantes
  'solicitud.decidir': ['director'],
  'compra.crear': ['compras'],
  'compra.aprobar': ['aprobador_compra', 'director'], // el director solo hasta el umbral (ver reglaSegregacion)
  'pago.preparar': ['tesoreria'],
  'pago.aprobar': ['tesoreria'], // SUPUESTO: quien prepara el pago tambien lo aprueba y lo registra (es la misma persona en la operacion)
  'pago.registrar': ['tesoreria'],
  'recepcion.confirmar': ['almacen'],
  'ajuste.crear': ['almacen'],
  'ajuste.aprobar': ['director'],
  'fabricacion.registrar': ['produccion'],
  'fabricacion.confirmar_desvio': ['director'],
  'traslado.crear': ['almacen'],
  'traslado.recibir': ['almacen'],
  'despacho.crear': ['ventas'],
  'salida.confirmar': ['almacen'],
  'reserva.crear': ['ventas', 'produccion'],
  'documento.anular': ['director'],
  'despacho.descargar': ['admin', 'ventas'],
  'disponibilidad.consultar': ['ventas', 'almacen', 'produccion', 'compras', 'admin'],
  'admin.gestionar': ['admin'],
  'integracion.simular': ['ventas', 'admin'],
  'factura.registrar': ['tesoreria'], // Tesoreria registra y coteja facturas de proveedor
  'banco.conciliar': ['tesoreria'],   // Tesoreria concilia el extracto bancario con los pagos
};

export const tieneRol = (usuario: Usuario | null | undefined, rol: RolId): boolean => !!usuario && usuario.roles.includes(rol);
export const tieneAlgunRol = (usuario: Usuario | null | undefined, roles: RolId[]): boolean => !!usuario && roles.some((r) => usuario.roles.includes(r));

export function puede(usuario: Usuario | null | undefined, accion: Accion): boolean {
  return tieneAlgunRol(usuario, MATRIZ[accion]);
}

/** Quien aprobo un documento, segun su historial (ultima transicion a un estado aprobado) */
export function quienAprobo(historial: HistorialItem[]): string | undefined {
  const aprobados = ['aprobada', 'aprobado', 'confirmada'];
  return [...historial].reverse().find((x) => x.estadoNuevo && aprobados.includes(x.estadoNuevo))?.usuarioId;
}

export interface ContextoRegla {
  parametros: Parametros;
  solicitudesPago?: SolicitudPago[];
  pagos?: Pago[];
  usuarios?: Usuario[]; // Fase 4: permite saber si existe otro usuario que pueda recibir un traslado
}
export interface ResultadoRegla { permitido: boolean; motivo?: string }

/**
 * Aplica permisos por rol y las 4 reglas de segregacion.
 * `documento` es el documento afectado (Solicitud, Compra, SolicitudPago, Ajuste, Fabricacion...).
 */
export function reglaSegregacion(
  usuario: Usuario | null | undefined,
  documento: { creadoPor?: string; historial?: HistorialItem[]; total?: number; id?: string } | null | undefined,
  accion: Accion,
  ctx?: ContextoRegla,
): ResultadoRegla {
  if (!usuario) return { permitido: false, motivo: 'Debes iniciar sesión' };

  // Regla 1: nadie aprueba lo que el mismo creo (se evalua primero para explicar el motivo real)
  const aprobaciones: Accion[] = ['solicitud.decidir', 'compra.aprobar', 'ajuste.aprobar', 'fabricacion.confirmar_desvio'];
  if (documento && aprobaciones.includes(accion) && documento.creadoPor === usuario.id) {
    const nombre = accion === 'solicitud.decidir' ? 'una solicitud' : accion === 'compra.aprobar' ? 'una compra' : 'un documento';
    return { permitido: false, motivo: `No puedes aprobar ${nombre} que tú creaste` };
  }
  if (!puede(usuario, accion)) return { permitido: false, motivo: 'Tu rol no tiene permiso para esta acción' };
  if (!documento) return { permitido: true };

  // Matriz 7.1: por monto, hasta el umbral aprueba el director; por encima, el aprobador de compra
  if (accion === 'compra.aprobar' && ctx && typeof documento.total === 'number') {
    const dentroUmbral = documento.total <= ctx.parametros.umbralCompra;
    if (dentroUmbral && !tieneRol(usuario, 'director')) {
      return { permitido: false, motivo: `Hasta ${ctx.parametros.umbralCompra} USD la aprueba el Director de solicitudes` };
    }
    if (!dentroUmbral && !tieneRol(usuario, 'aprobador_compra')) {
      return { permitido: false, motivo: 'El monto supera el umbral: la aprueba el Aprobador de compra' };
    }
  }

  // Regla 2 (retirada): en la operacion la misma persona de Tesoreria prepara, aprueba y registra el pago.

  // Regla 4: quien recibe no es quien compro ni quien pago (documento = Compra)
  if (accion === 'recepcion.confirmar') {
    if (documento.creadoPor === usuario.id) {
      return { permitido: false, motivo: 'Quien recibe la mercancía no puede ser quien generó la compra' };
    }
    if (ctx?.solicitudesPago && ctx.pagos) {
      const compraId = documento.id;
      const idsSp = ctx.solicitudesPago.filter((s) => s.compraId === compraId).map((s) => s.id);
      if (ctx.pagos.some((p) => idsSp.includes(p.solicitudPagoId) && p.registradoPor === usuario.id)) {
        return { permitido: false, motivo: 'Quien recibe la mercancía no puede ser quien registró su pago' };
      }
      // Fase 3: tampoco quien aprobó alguno de los pagos de la compra
      if (ctx.solicitudesPago.some((s) => s.compraId === compraId && quienAprobo(s.historial) === usuario.id)) {
        return { permitido: false, motivo: 'Quien recibe la mercancía no puede ser quien aprobó su pago' };
      }
    }
  }
  // Fase 4: quien despacha un traslado no confirma su recepcion. SUPUESTO: si Sergio es el unico usuario de
  // Almacen activo, la regla se relaja para que el recorrido D-05 sea demostrable con una sola persona.
  if (accion === 'traslado.recibir') {
    const despacho = [...(documento.historial ?? [])].reverse().find((x) => x.estadoNuevo === 'en_transito')?.usuarioId;
    const otros = (ctx?.usuarios ?? []).filter((x) => x.activo && x.id !== usuario.id && x.roles.includes('almacen'));
    if (despacho === usuario.id && otros.length > 0) {
      return { permitido: false, motivo: 'Quien despacha el traslado no puede confirmar su recepción' };
    }
  }
  return { permitido: true };
}

/** Roles que ven cada ruta base (tabla de la Fase 1). Vacio = todos. */
export const ROLES_POR_RUTA: Record<string, RolId[]> = {
  '/solicitudes': ['admin', 'solicitante', 'director', 'compras', 'produccion'],
  '/director': ['director', 'admin'],
  '/compras': ['compras', 'admin'],
  '/aprobacion-compras': ['aprobador_compra', 'director', 'admin'],
  '/tesoreria': ['tesoreria', 'admin'],
  '/aprobacion-pagos': ['tesoreria', 'admin'],
  '/recepcion': ['almacen', 'compras', 'admin'],
  '/materias-primas': ['almacen', 'produccion', 'compras', 'director', 'admin'],
  '/fabricacion': ['produccion', 'director', 'admin'],
  '/producto-terminado': ['almacen', 'produccion', 'ventas', 'director', 'admin'],
  '/traslados': ['almacen', 'director', 'admin'],
  '/ventas': ['ventas', 'almacen', 'admin', 'director'],
  '/disponibilidad': ['ventas', 'almacen', 'produccion', 'compras', 'admin'],
  '/conexiones': ['ventas', 'admin'],
  '/reportes': ['director', 'aprobador_compra', 'tesoreria', 'admin'],
  '/administracion': ['admin'],
};

export function puedeVerRuta(usuario: Usuario | null | undefined, rutaBase: string): boolean {
  const roles = ROLES_POR_RUTA[rutaBase];
  if (!roles) return !!usuario;
  return tieneAlgunRol(usuario, roles);
}

// Tipo auxiliar re-exportado para pantallas de fases siguientes
export type { Compra };

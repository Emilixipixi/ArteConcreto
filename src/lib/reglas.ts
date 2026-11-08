// Reglas y calculos de negocio reutilizables (solicitudes y compras).
import type { Articulo, Compra, Cotizacion, LineaCompra, LineaSolicitud, Parametros, Proveedor, Solicitud } from '../types';
import { aBase, validarDecimales } from './unidades';

export const AREAS = ['Planta', 'Mantenimiento', 'Calidad', 'Logística', 'Administración'];
export const PRIORIDADES: Solicitud['prioridad'][] = ['baja', 'media', 'alta', 'urgente'];
export const MAX_ADJUNTOS = 5;

/** Fecha local yyyy-mm-dd */
export function hoyISO(offsetDias = 0): string {
  const d = new Date(Date.now() + offsetDias * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type Errores = Record<string, string>;

export interface DatosValidablesSolicitud {
  area?: string; prioridad?: string; fechaRequerida?: string; justificacion?: string; lineas?: LineaSolicitud[]; adjuntos?: string[];
}

/** Validacion completa de una solicitud antes de enviarla. Devuelve errores por campo (vacio = valida). */
export function validarSolicitud(d: DatosValidablesSolicitud, articulos: Articulo[]): Errores {
  const e: Errores = {};
  if (!d.area) e.area = 'Selecciona el área solicitante';
  if (!d.prioridad) e.prioridad = 'Selecciona la prioridad';
  if (!d.fechaRequerida) e.fechaRequerida = 'Indica la fecha requerida';
  else if (d.fechaRequerida < hoyISO()) e.fechaRequerida = 'La fecha requerida no puede ser anterior a hoy';
  const just = (d.justificacion ?? '').trim();
  if (just.length < 20) e.justificacion = `La justificación debe tener al menos 20 caracteres (${just.length}/20)`;
  const lineas = d.lineas ?? [];
  if (lineas.length === 0) e.lineas = 'Agrega al menos un artículo';
  const vistos = new Set<string>();
  lineas.forEach((l, i) => {
    const a = articulos.find((x) => x.sku === l.sku);
    if (!a || a.tipo !== 'materia_prima' || !a.activo) e[`linea-${i}`] = 'Selecciona un artículo válido';
    else if (!(l.cantidad > 0)) e[`linea-${i}`] = 'La cantidad debe ser mayor que cero';
    else {
      const dec = validarDecimales(l.cantidad, l.unidadId);
      if (dec) e[`linea-${i}`] = dec;
      else if (!l.destinoBodegaId) e[`linea-${i}`] = 'Selecciona la bodega de destino';
      else if (vistos.has(l.sku)) e[`linea-${i}`] = 'Artículo repetido';
    }
    vistos.add(l.sku);
  });
  if ((d.adjuntos ?? []).length > MAX_ADJUNTOS) e.adjuntos = `Máximo ${MAX_ADJUNTOS} adjuntos`;
  return e;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Subtotal, impuesto informativo (no contable) y total en USD */
export function calcularTotales(lineas: LineaCompra[], impuestoPct: number) {
  const subtotal = r2(lineas.reduce((a, l) => a + l.cantidad * l.precioUnitario, 0));
  const impuestoInformativo = r2((subtotal * impuestoPct) / 100);
  return { subtotal, impuestoInformativo, total: r2(subtotal + impuestoInformativo) };
}

/** Umbral de aprobacion: hasta el umbral aprueba el Director; por encima, el Aprobador de compra (gerencia) */
export const dentroUmbral = (total: number, p: Parametros) => total <= p.umbralCompra;

/** Importe del anticipo y saldo para una compra con anticipo */
export function importesAnticipo(total: number, pct: number) {
  const anticipo = r2((total * pct) / 100);
  return { anticipo, saldo: r2(total - anticipo) };
}

// Factores simulados por proveedor para generar cotizaciones ilustrativas
const FACTOR_PROVEEDOR: Record<string, number> = { 'p-cementos': 1, 'p-agregados': 0.95, 'p-aceros': 1.08, 'p-quimicos': 1.03 };

/** Cotizaciones simuladas (hasta 3 proveedores activos) a partir del precio de referencia de cada articulo */
export function generarCotizaciones(lineas: LineaCompra[], proveedores: Proveedor[], articulos: Articulo[], previas: Cotizacion[] = []): Cotizacion[] {
  return proveedores.filter((p) => p.activo).slice(0, 3).map((p) => {
    const prev = previas.find((c) => c.proveedorId === p.id);
    return {
      proveedorId: p.id, condiciones: p.condicionesPago, diasEntrega: p.diasEntrega, seleccionada: prev?.seleccionada ?? false,
      precios: lineas.map((l) => {
        const a = articulos.find((x) => x.sku === l.sku);
        const base = (a?.precioReferencia ?? 0) * (a ? aBase(1, l.unidadId, a) : 1);
        return { sku: l.sku, precioUnitario: r2(base * (FACTOR_PROVEEDOR[p.id] ?? 1)) };
      }),
    };
  });
}

export interface DatosValidablesCompra extends Partial<Omit<Compra, 'id' | 'numero' | 'historial'>> {}

/** Validacion al generar la orden de compra */
export function validarCompra(c: DatosValidablesCompra, solicitud: Solicitud | undefined, articulos: Articulo[]): Errores {
  const e: Errores = {};
  const lineas = c.lineas ?? [];
  if (!c.proveedorId) e.proveedor = 'Elige un proveedor en el comparativo';
  if (lineas.length === 0) e.lineas = 'La orden no tiene ítems';
  let sube = false;
  lineas.forEach((l, i) => {
    const a = articulos.find((x) => x.sku === l.sku);
    if (!(l.cantidad > 0)) e[`linea-${i}`] = 'La cantidad debe ser mayor que cero';
    else if (validarDecimales(l.cantidad, l.unidadId)) e[`linea-${i}`] = validarDecimales(l.cantidad, l.unidadId)!;
    else if (!(l.precioUnitario > 0)) e[`linea-${i}`] = 'Falta el precio unitario (elige proveedor)';
    const sol = solicitud?.lineas.find((x) => x.sku === l.sku);
    if (a && sol && aBase(l.cantidad, l.unidadId, a) > aBase(sol.cantidad, sol.unidadId, a) + 1e-9) sube = true;
  });
  if (sube && (c.justificacionCantidad ?? '').trim().length < 10) e.justificacionCantidad = 'Justifica el aumento de cantidad respecto de la solicitud (mín. 10 caracteres)';
  if (!c.lugarEntregaBodegaId) e.lugarEntrega = 'Selecciona la bodega de entrega';
  if (!c.condiciones || !c.condiciones.trim()) e.condiciones = 'Indica la forma de pago';
  if (!c.fechaEstimadaEntrega) e.fecha = 'Indica la fecha estimada de entrega';
  else if (c.fechaEstimadaEntrega.slice(0, 10) < hoyISO()) e.fecha = 'La fecha estimada no puede ser anterior a hoy';
  if (c.modalidadPago === 'anticipo') {
    const pct = c.porcentajeAnticipo ?? 0;
    if (!(pct > 0 && pct <= 100)) e.anticipo = 'El porcentaje de anticipo debe estar entre 1 y 100';
  }
  if (c.origen === 'administrativa') {
    if (!(c.motivoAdministrativo ?? '').trim()) e.motivo = 'La compra administrativa exige un motivo';
    if (!(c.centroCosto ?? '').trim()) e.centroCosto = 'Indica el centro de costo';
  }
  return e;
}

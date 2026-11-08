// Selectores de la Fase 5: respuesta de disponibilidad (asistente simulado) y productos agotados en la tienda.
import { enDias } from '../lib/formato';
import type { Estado } from './useStore';
import { disponibleTerminado } from './selectoresFase4';

export type EstadoDisponibilidad = 'inmediata' | 'parcial' | 'agotado';
export interface DisponibilidadBodega { bodegaId: string; codigo: string; nombre: string; fisica: number; comprometida: number; disponible: number; enTransito: number }
export interface RespuestaDisponibilidad {
  sku: string; nombre: string; cantidadSolicitada: number; estado: EstadoDisponibilidad;
  fisica: number; comprometida: number; disponible: number; enTransito: number; bodegas: DisponibilidadBodega[];
  entregaInmediata: number; faltante: number; plazoDias: number | null; fechaEstimada: string | null;
  recomendacion: string; frase: string; actualizadoEn: string;
  jsonDisponibilidad: Record<string, unknown>; jsonPlazo: Record<string, unknown>;
}

/** Calcula la respuesta completa para una consulta de disponibilidad. Todo sale del estado actual del store (RN-13). */
export function respuestaDisponibilidad(e: Estado, sku: string, cantidad: number): RespuestaDisponibilidad | null {
  const a = e.articulos.find((x) => x.sku === sku && x.tipo === 'producto_terminado');
  if (!a) return null;
  const t = disponibleTerminado(e, sku);
  const bodegas = e.bodegas.filter((b) => b.activa).map((b) => ({ bodegaId: b.id, codigo: b.codigo, nombre: b.nombre, ...disponibleTerminado(e, sku, b.id) }));
  const entregaInmediata = Math.max(0, Math.min(cantidad, t.disponible));
  const faltante = Math.max(0, cantidad - entregaInmediata);
  const estado: EstadoDisponibilidad = t.disponible <= 0 ? 'agotado' : faltante > 0 ? 'parcial' : 'inmediata';
  const plazoDias = typeof a.plazoFabricacionDias === 'number' ? a.plazoFabricacionDias : null; // RN-13: sin dato no se promete fecha
  const fechaEstimada = faltante > 0 && plazoDias !== null ? enDias(plazoDias) : null;
  const dondeEsta = bodegas.filter((b) => b.disponible > 0).map((b) => `${b.disponible} en ${b.nombre}`).join(', ');
  const plazoTxt = plazoDias === null ? 'Plazo no informado por la operación' : `aproximadamente ${plazoDias} días`;
  let recomendacion: string; let frase: string;
  if (estado === 'inmediata') {
    recomendacion = `Entrega inmediata de ${entregaInmediata} unidades (${dondeEsta}).`;
    frase = `Sí, tenemos ${t.disponible} unidades de ${a.nombre} disponibles, así que las ${cantidad} que necesita puede recibirlas de inmediato.`;
  } else if (estado === 'parcial') {
    recomendacion = plazoDias === null ? `Entrega inmediata de ${entregaInmediata} unidades; las ${faltante} restantes sin plazo informado por la operación.` : `Entrega inmediata de ${entregaInmediata} unidades; las ${faltante} restantes en ${plazoTxt}.`;
    frase = plazoDias === null
      ? `Por ahora tenemos ${entregaInmediata} unidades de ${a.nombre} para entrega inmediata. Para las ${faltante} restantes aún no tenemos un plazo confirmado; un asesor se lo confirmará.`
      : `Por ahora tenemos ${entregaInmediata} unidades de ${a.nombre} para entrega inmediata. Las ${faltante} restantes podemos fabricarlas en ${plazoTxt}.`;
  } else {
    recomendacion = plazoDias === null ? 'Sin existencias. Plazo no informado por la operación: no se promete fecha.' : `Sin existencias. Se puede fabricar en ${plazoTxt}.`;
    frase = plazoDias === null
      ? `En este momento no tenemos ${a.nombre} disponible y aún no tenemos un plazo confirmado de fabricación; un asesor se comunicará con usted.`
      : `En este momento no tenemos ${a.nombre} disponible, pero podemos fabricarlo en ${plazoTxt}.`;
  }
  const actualizadoEn = new Date().toISOString();
  return {
    sku, nombre: a.nombre, cantidadSolicitada: cantidad, estado, fisica: t.fisica, comprometida: t.comprometida, disponible: t.disponible, enTransito: t.enTransito,
    bodegas, entregaInmediata, faltante, plazoDias, fechaEstimada, recomendacion, frase, actualizadoEn,
    jsonDisponibilidad: { sku, cantidad_fisica: t.fisica, comprometida: t.comprometida, disponible: t.disponible, bodegas: bodegas.map((b) => ({ codigo: b.codigo, fisica: b.fisica, comprometida: b.comprometida, disponible: b.disponible })), actualizado_en: actualizadoEn },
    jsonPlazo: { sku, disponibilidad_inmediata: t.disponible > 0, plazo_estimado_dias: plazoDias },
  };
}

/** Productos terminados agotados que la tienda en linea debe reflejar como agotados (RF-47) */
export const agotadosEnTienda = (e: Estado) =>
  e.articulos.filter((a) => a.tipo === 'producto_terminado' && a.activo && disponibleTerminado(e, a.sku).disponible <= 0);

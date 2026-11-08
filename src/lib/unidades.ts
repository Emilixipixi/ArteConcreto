// Conversion de unidades. Todo se almacena en la unidad base del articulo.
import type { Articulo, Unidad } from '../types';
import { UNIDADES } from '../data/unidades';
import { LOCALE } from './formato';

const mapa = new Map<string, Unidad>(UNIDADES.map((u) => [u.id, u]));

/** Fase 5: sincroniza el catalogo con las unidades administradas en el store (altas y cambios de decimales o factores) */
export function registrarUnidades(lista: Unidad[]) {
  mapa.clear();
  for (const u of lista) mapa.set(u.id, u);
}

// Unidades de conteo cuyo factor depende del articulo (se resuelven solo por presentacion)
const POR_ARTICULO = new Set(['jgo', 'caja', 'paq', 'bolsa', 'rollo', 'plancha', 'tubo']);

export const obtenerUnidad = (id: string): Unidad | undefined => mapa.get(id);

export const simbolo = (id: string) => mapa.get(id)?.simbolo ?? id;

/** Factor de una unidad expresado en la unidad base del articulo (NaN si no son convertibles) */
function factorEnBase(unidadId: string, articulo: Articulo): number {
  if (unidadId === articulo.unidadBaseId) return 1;
  const pres = articulo.presentaciones.find((p) => p.unidadId === unidadId);
  if (pres) return pres.factorABase;
  const u = mapa.get(unidadId);
  const b = mapa.get(articulo.unidadBaseId);
  if (!u || !b || u.familia !== b.familia || POR_ARTICULO.has(unidadId)) return NaN; // no se mezclan familias
  return u.factorABase / b.factorABase;
}

/** Convierte un valor de una unidad a otra. Con articulo usa sus presentaciones. NaN si es incompatible. */
export function convertir(valor: number, deUnidadId: string, aUnidadId: string, articulo?: Articulo): number {
  if (deUnidadId === aUnidadId) return valor;
  if (articulo) return (valor * factorEnBase(deUnidadId, articulo)) / factorEnBase(aUnidadId, articulo);
  const de = mapa.get(deUnidadId);
  const a = mapa.get(aUnidadId);
  if (!de || !a || de.familia !== a.familia || POR_ARTICULO.has(de.id) || POR_ARTICULO.has(a.id)) return NaN;
  return (valor * de.factorABase) / a.factorABase;
}

/** Convierte a la unidad base del articulo */
export function aBase(valor: number, unidadId: string, articulo: Articulo): number {
  return convertir(valor, unidadId, articulo.unidadBaseId, articulo);
}

/** Unidades en las que se puede capturar un articulo: base, presentaciones y unidades fijas de su familia */
export function unidadesDisponibles(articulo: Articulo): Unidad[] {
  const base = mapa.get(articulo.unidadBaseId);
  if (!base) return [];
  const ids = new Set<string>([articulo.unidadBaseId, ...articulo.presentaciones.map((p) => p.unidadId)]);
  for (const u of mapa.values()) {
    if (u.familia === base.familia && !POR_ARTICULO.has(u.id) && base.familia !== 'conteo') ids.add(u.id);
    if (u.familia === 'conteo' && base.familia === 'conteo' && ['und', 'par', 'doc'].includes(u.id) && articulo.unidadBaseId === 'und') ids.add(u.id);
  }
  return [...ids].map((id) => mapa.get(id)!).filter(Boolean);
}

/** Valida decimales segun la unidad. Devuelve mensaje de error o null. */
export function validarDecimales(valor: number, unidadId: string): string | null {
  const u = mapa.get(unidadId);
  if (!u) return 'Unidad desconocida';
  if (!isFinite(valor) || valor < 0) return 'Cantidad invalida';
  const f = Math.pow(10, u.decimales);
  if (Math.abs(Math.round(valor * f) / f - valor) > 1e-9) {
    return u.decimales === 0 ? `${u.nombre} no admite decimales` : `${u.nombre} admite hasta ${u.decimales} decimales`;
  }
  return null;
}

export function formatearCantidad(valor: number, unidadId: string, conSimbolo = true): string {
  const u = mapa.get(unidadId);
  const dec = u ? u.decimales : 0;
  const txt = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 0, maximumFractionDigits: dec, useGrouping: 'always',
  } as unknown as Intl.NumberFormatOptions).format(valor);
  return conSimbolo && u ? `${txt} ${u.simbolo}` : txt;
}

/** Texto de equivalencia: "20 saco50 x 50 kg = 1.000 kg". Vacio si la unidad es la base. */
export function equivalenciaTexto(cantidad: number, unidadId: string, articulo: Articulo): string {
  if (unidadId === articulo.unidadBaseId) return '';
  const f = factorEnBase(unidadId, articulo);
  if (!isFinite(f)) return 'Unidad no compatible con el articulo';
  const base = cantidad * f;
  const dec = (id: string) => mapa.get(id)?.decimales ?? 2;
  const fmt = (n: number, d: number) => new Intl.NumberFormat(LOCALE, { maximumFractionDigits: d, useGrouping: 'always' } as unknown as Intl.NumberFormatOptions).format(n);
  return `${fmt(cantidad, dec(unidadId))} ${simbolo(unidadId)} x ${fmt(f, 3)} ${simbolo(articulo.unidadBaseId)} = ${fmt(base, dec(articulo.unidadBaseId))} ${simbolo(articulo.unidadBaseId)}`;
}

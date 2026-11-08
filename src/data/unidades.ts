import type { Unidad } from '../types';

const u = (id: string, nombre: string, simbolo: string, familia: Unidad['familia'], decimales: number, factorABase: number, esBase = false): Unidad =>
  ({ id, nombre, simbolo, familia, decimales, factorABase, esBase });

// Propuesta de la seccion 11 del maestro (pendiente de validar con el cliente).
// SUPUESTO: las unidades de conteo "por articulo" llevan factor 1 aqui; su equivalencia real vive en la presentacion del articulo.
export const UNIDADES: Unidad[] = [
  u('kg', 'Kilogramo', 'kg', 'peso', 3, 1, true),
  u('g', 'Gramo', 'g', 'peso', 0, 0.001),
  u('lb', 'Libra', 'lb', 'peso', 2, 0.45359),
  u('t', 'Tonelada metrica', 't', 'peso', 3, 1000),
  u('saco50', 'Saco 50 kg', 'saco50', 'peso', 0, 50),
  u('saco25', 'Saco 25 kg', 'saco25', 'peso', 0, 25),
  u('L', 'Litro', 'L', 'volumen', 3, 1, true),
  u('mL', 'Mililitro', 'mL', 'volumen', 0, 0.001),
  u('gal', 'Galon', 'gal', 'volumen', 2, 3.785),
  u('cub19', 'Cubeta 19 L', 'cub19', 'volumen', 0, 19),
  u('tamb200', 'Tambor 200 L', 'tamb200', 'volumen', 0, 200),
  u('m3', 'Metro cubico', 'm3', 'volumen', 3, 1000),
  u('m', 'Metro', 'm', 'longitud', 2, 1, true),
  u('cm', 'Centimetro', 'cm', 'longitud', 1, 0.01),
  u('mm', 'Milimetro', 'mm', 'longitud', 0, 0.001),
  u('var6', 'Varilla 6 m', 'var6', 'longitud', 0, 6),
  u('var12', 'Varilla 12 m', 'var12', 'longitud', 0, 12),
  u('m2', 'Metro cuadrado', 'm2', 'superficie', 2, 1, true),
  u('und', 'Unidad', 'und', 'conteo', 0, 1, true),
  u('par', 'Par', 'par', 'conteo', 0, 2),
  u('doc', 'Docena', 'doc', 'conteo', 0, 12),
  u('jgo', 'Juego', 'jgo', 'conteo', 0, 1),
  u('caja', 'Caja', 'caja', 'conteo', 0, 1),
  u('paq', 'Paquete', 'paq', 'conteo', 0, 1),
  u('bolsa', 'Bolsa', 'bolsa', 'conteo', 0, 1),
  u('rollo', 'Rollo', 'rollo', 'conteo', 0, 1),
  u('plancha', 'Plancha / lamina', 'plancha', 'conteo', 0, 1),
  u('tubo', 'Tubo', 'tubo', 'conteo', 0, 1),
];

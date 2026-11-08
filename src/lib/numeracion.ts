// Numeracion consecutiva de documentos: SOL-0001, OC-0001, etc.
import type { PrefijoNumero } from '../types';

/** Devuelve el siguiente numero a partir de los existentes (maximo + 1). No se repite tras reiniciar. */
export function siguienteNumero(prefijo: PrefijoNumero, existentes: string[]): string {
  let max = 0;
  for (const n of existentes) {
    const m = n.match(new RegExp(`^${prefijo}-(\\d+)$`));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefijo}-${String(max + 1).padStart(4, '0')}`;
}

/** Lote de fabricacion FT-001, FT-002... */
export function siguienteLote(existentes: string[]): string {
  let max = 0;
  for (const n of existentes) {
    const m = n.match(/^FT-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `FT-${String(max + 1).padStart(3, '0')}`;
}

/** id interno derivado del numero: SOL-0001 -> sol-0001 */
export const idDesdeNumero = (numero: string) => numero.toLowerCase();

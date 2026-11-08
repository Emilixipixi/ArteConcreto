import type { HistorialItem } from '../types';

/** Atajo para armar entradas de historial en las semillas */
export const h = (fecha: string, usuarioId: string, accion: string, estadoAnterior?: string, estadoNuevo?: string, observacion?: string): HistorialItem =>
  ({ fecha, usuarioId, accion, estadoAnterior, estadoNuevo, observacion });

export const redondear = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

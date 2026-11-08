import type { Parametros } from '../types';

export const PARAMETROS: Parametros = {
  umbralCompra: 500,
  toleranciaConsumo: 5,
  diasRecepcionVencida: 3,
  proveedorTienda: 'Shopify',
  umbralStockPct: 100, impuestoInformativoPct: 15, // SUPUESTO: tarifa informativa; no hay calculo tributario real
};

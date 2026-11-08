// Buscador global simulado: busca por numero de documento o SKU en los datos de la demostracion
import type { Estado } from '../store/useStore';
import { rutaDocumento } from './rutas';

export interface ResultadoBusqueda { etiqueta: string; detalle: string; ruta: string }

export function buscarGlobal(e: Estado, consulta: string, max = 8): ResultadoBusqueda[] {
  const q = consulta.trim().toLowerCase();
  if (q.length < 2) return [];
  const r: ResultadoBusqueda[] = [];
  const docs: [string, string, { id: string; numero: string }[]][] = [
    ['Solicitud', 'Solicitud', e.solicitudes], ['Compra', 'Orden de compra', e.compras], ['SolicitudPago', 'Solicitud de pago', e.solicitudesPago],
    ['Recepción', 'Recepción', e.recepciones], ['Fabricación', 'Fabricación', e.fabricaciones], ['Traslado', 'Traslado', e.traslados],
    ['Despacho', 'Despacho', e.despachos], ['Ajuste', 'Ajuste', e.ajustes],
  ];
  for (const [tipo, nombre, lista] of docs)
    for (const d of lista) if (d.numero.toLowerCase().includes(q)) r.push({ etiqueta: d.numero, detalle: nombre, ruta: rutaDocumento(tipo, d.id) });
  for (const f of e.fabricaciones) if (f.lote.toLowerCase().includes(q)) r.push({ etiqueta: f.lote, detalle: `Lote de ${f.numero}`, ruta: rutaDocumento('Fabricación', f.id) });
  for (const a of e.articulos)
    if (a.sku.toLowerCase().includes(q) || a.nombre.toLowerCase().includes(q))
      r.push({ etiqueta: a.sku, detalle: a.nombre, ruta: a.tipo === 'materia_prima' ? `/materias-primas?sku=${a.sku}` : `/producto-terminado?sku=${a.sku}` });
  return r.slice(0, max);
}

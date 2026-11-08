// Trazabilidad por documento (RF-05, RF-52): reconstruye la cadena solicitud -> compra -> pago -> recepcion -> movimientos
// -> fabricacion -> traslado -> despacho a partir de un numero de documento.
// SUPUESTO: el vinculo compra -> fabricacion -> traslado/despacho se infiere por SKU (insumos consumidos y producto fabricado),
// porque el modelo no arrastra el lote hasta el despacho; cada paso inferido lo indica en "nota".
import type { Estado } from '../store/useStore';
import type { Fabricacion } from '../types';

export interface PasoTraza { fecha: string; etapa: string; numero: string; ruta: string; estado: string; usuarioId: string; observacion?: string; nota?: string }
export interface Cadena { raiz: string; tipo: string; pasos: PasoTraza[] }

const ultimo = (h: { fecha: string; usuarioId: string; observacion?: string }[]) => h[h.length - 1];
const PREFIJOS: Record<string, string> = { SOL: 'Solicitud', OC: 'Compra', PAG: 'Pago', REC: 'Recepción', FAB: 'Fabricación', FT: 'Fabricación (lote)', TRS: 'Traslado', DSP: 'Despacho', AJU: 'Ajuste' };

export function cadenaDocumento(e: Estado, entrada: string): Cadena | null {
  const num = entrada.trim().toUpperCase();
  if (!num) return null;
  const pref = num.split('-')[0];
  if (!PREFIJOS[pref]) return null;

  const compras = new Set<string>(), fabs = new Set<string>(), traslados = new Set<string>(), despachos = new Set<string>();
  const inferidos = new Set<string>(); // ids inferidos por SKU
  const skusRecibidos = (cid: string) => new Set(e.compras.find((c) => c.id === cid)?.lineas.map((l) => l.sku) ?? []);
  const fabsDeInsumos = (cid: string) => e.fabricaciones.filter((f) => f.estado !== 'anulada' && f.consumos.some((c) => skusRecibidos(cid).has(c.sku)));
  const comprasDeFab = (f: Fabricacion) => e.compras.filter((c) => e.recepciones.some((r) => r.compraId === c.id) && c.lineas.some((l) => f.consumos.some((k) => k.sku === l.sku)));

  let tipo = PREFIJOS[pref]; let ok = false;
  if (pref === 'SOL') { const s = e.solicitudes.find((x) => x.numero === num); if (s) { ok = true; e.compras.filter((c) => c.solicitudId === s.id).forEach((c) => compras.add(c.id)); } }
  else if (pref === 'OC') { const c = e.compras.find((x) => x.numero === num); if (c) { ok = true; compras.add(c.id); } }
  else if (pref === 'PAG') { const p = e.solicitudesPago.find((x) => x.numero === num); if (p) { ok = true; compras.add(p.compraId); } }
  else if (pref === 'REC') { const r = e.recepciones.find((x) => x.numero === num); if (r) { ok = true; compras.add(r.compraId); } }
  else if (pref === 'FAB' || pref === 'FT') {
    const f = e.fabricaciones.find((x) => x.numero === num || x.lote === num); if (f) { ok = true; fabs.add(f.id); comprasDeFab(f).forEach((c) => { compras.add(c.id); inferidos.add(c.id); }); }
  } else if (pref === 'TRS') {
    const t = e.traslados.find((x) => x.numero === num); if (t) { ok = true; traslados.add(t.id); e.fabricaciones.filter((f) => f.estado !== 'anulada' && t.lineas.some((l) => l.sku === f.skuProducto)).forEach((f) => { fabs.add(f.id); inferidos.add(f.id); }); }
  } else if (pref === 'DSP') {
    const d = e.despachos.find((x) => x.numero === num); if (d) { ok = true; despachos.add(d.id); e.fabricaciones.filter((f) => f.estado !== 'anulada' && d.lineas.some((l) => l.sku === f.skuProducto)).forEach((f) => { fabs.add(f.id); inferidos.add(f.id); }); }
  } else if (pref === 'AJU') { ok = !!e.ajustes.find((x) => x.numero === num); }
  if (!ok) return null;

  // Expansion hacia adelante: de las compras a las fabricaciones que consumen sus insumos, y de estas a traslados y despachos
  if (['SOL', 'OC', 'PAG', 'REC'].includes(pref)) for (const cid of compras) fabsDeInsumos(cid).forEach((f) => { fabs.add(f.id); inferidos.add(f.id); });
  if (['FAB', 'FT', 'SOL', 'OC', 'PAG', 'REC', 'TRS', 'DSP'].includes(pref)) {
    for (const fid of fabs) {
      const f = e.fabricaciones.find((x) => x.id === fid)!;
      e.traslados.filter((t) => t.estado !== 'cancelado' && t.lineas.some((l) => l.sku === f.skuProducto)).forEach((t) => { if (pref !== 'TRS' || t.numero === num) { traslados.add(t.id); if (t.numero !== num) inferidos.add(t.id); } });
      e.despachos.filter((d) => d.estado !== 'anulado' && d.lineas.some((l) => l.sku === f.skuProducto)).forEach((d) => { if (pref !== 'DSP' || d.numero === num) { despachos.add(d.id); if (d.numero !== num) inferidos.add(d.id); } });
    }
  }
  if (pref === 'TRS' || pref === 'DSP') { /* la raiz ya esta agregada */ }

  const pasos: PasoTraza[] = [];
  const nota = (id: string) => (inferidos.has(id) ? 'Vínculo inferido por SKU' : undefined);
  // Orden logico de la cadena (no por fecha): por compra [solicitud, compra, pago, recepcion, movimientos], luego fabricacion, traslado y despacho
  const comprasOrden = [...compras].sort((a, b) => (e.compras.find((x) => x.id === a)?.creadoEn ?? '').localeCompare(e.compras.find((x) => x.id === b)?.creadoEn ?? ''));
  for (const cid of comprasOrden) {
    const c = e.compras.find((x) => x.id === cid)!;
    const s = c.solicitudId ? e.solicitudes.find((x) => x.id === c.solicitudId) : undefined;
    if (s) pasos.push({ fecha: s.creadoEn, etapa: 'Solicitud', numero: s.numero, ruta: `/solicitudes/${s.id}`, estado: s.estado, usuarioId: s.creadoPor, observacion: ultimo(s.historial)?.observacion });
    pasos.push({ fecha: c.creadoEn, etapa: 'Compra', numero: c.numero, ruta: `/compras/${c.id}`, estado: c.estado, usuarioId: c.creadoPor, observacion: ultimo(c.historial)?.observacion, nota: nota(c.id) });
    for (const p of e.solicitudesPago.filter((x) => x.compraId === c.id)) {
      const pg = e.pagos.find((x) => x.solicitudPagoId === p.id);
      pasos.push({ fecha: pg?.fecha ?? p.creadoEn, etapa: p.tipo === 'anticipo' ? 'Pago (anticipo)' : 'Pago', numero: p.numero, ruta: `/tesoreria/${p.id}`, estado: p.estado, usuarioId: pg?.registradoPor ?? p.creadoPor, observacion: ultimo(p.historial)?.observacion });
    }
    for (const r of e.recepciones.filter((x) => x.compraId === c.id)) {
      pasos.push({ fecha: r.fechaRecepcion ?? r.creadoEn, etapa: 'Recepción', numero: r.numero, ruta: `/recepcion/${c.id}`, estado: r.esCierre ? 'cierre' : 'confirmada', usuarioId: r.creadoPor, observacion: r.observacion });
      const movs = e.movimientos.filter((m) => m.documentoTipo === 'Recepción' && m.documentoId === r.id);
      if (movs.length) pasos.push({ fecha: movs[0].fecha, etapa: 'Movimientos de inventario', numero: r.numero, ruta: `/materias-primas`, estado: `${movs.length} entrada(s)`, usuarioId: movs[0].usuarioId, observacion: movs.map((m) => `${m.sku} +${m.cantidadBase}`).join(', ') });
    }
  }
  for (const fid of fabs) {
    const f = e.fabricaciones.find((x) => x.id === fid)!;
    const conf = f.historial.find((h) => h.estadoNuevo === 'confirmada');
    pasos.push({ fecha: conf?.fecha ?? f.fechaFabricacion, etapa: 'Fabricación', numero: `${f.numero} (lote ${f.lote})`, ruta: `/fabricacion/${f.id}`, estado: f.estado, usuarioId: conf?.usuarioId ?? f.creadoPor, observacion: ultimo(f.historial)?.observacion, nota: nota(f.id) });
    const movs = e.movimientos.filter((m) => m.documentoTipo === 'Fabricación' && m.documentoId === f.id);
    if (movs.length) pasos.push({ fecha: movs[0].fecha, etapa: 'Movimientos de inventario', numero: f.numero, ruta: `/producto-terminado/${f.skuProducto}`, estado: `${movs.length} movimiento(s)`, usuarioId: movs[0].usuarioId, observacion: movs.map((m) => `${m.sku} ${m.tipo === 'salida_fabricacion' ? '-' : '+'}${m.cantidadBase}`).join(', ') });
  }
  for (const tid of traslados) {
    const t = e.traslados.find((x) => x.id === tid)!; const h = ultimo(t.historial);
    pasos.push({ fecha: h?.fecha ?? t.creadoEn, etapa: 'Traslado', numero: t.numero, ruta: `/traslados/${t.id}`, estado: t.estado, usuarioId: h?.usuarioId ?? t.creadoPor, observacion: h?.observacion, nota: nota(t.id) });
  }
  for (const did of despachos) {
    const d = e.despachos.find((x) => x.id === did)!; const h = ultimo(d.historial);
    pasos.push({ fecha: h?.fecha ?? d.creadoEn, etapa: 'Despacho', numero: d.numero, ruta: `/ventas/${d.id}`, estado: d.estado, usuarioId: h?.usuarioId ?? d.creadoPor, observacion: h?.observacion ?? d.documentoReferencia, nota: nota(d.id) });
  }
  if (pref === 'AJU') {
    const a = e.ajustes.find((x) => x.numero === num)!; const h = ultimo(a.historial);
    pasos.push({ fecha: a.creadoEn, etapa: 'Ajuste', numero: a.numero, ruta: '/materias-primas', estado: a.estado, usuarioId: a.creadoPor, observacion: a.motivo });
    if (h && h !== a.historial[0]) pasos.push({ fecha: h.fecha, etapa: 'Decisión del ajuste', numero: a.numero, ruta: '/materias-primas', estado: a.estado, usuarioId: h.usuarioId, observacion: h.observacion });
  }
  return { raiz: num, tipo, pasos };
}

/** Tiempo legible entre dos fechas ISO */
export function tiempoEntre(a: string, b: string): string {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (ms < 0) return 'sin orden cronológico (dato de demostración)';
  const h = ms / 36e5;
  if (h < 1) return `${Math.round(ms / 60000)} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} días`;
}

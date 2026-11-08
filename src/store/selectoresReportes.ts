// Selectores de los reportes (P-17). Usan los mismos selectores base que el resto de pantallas (CA-14).
import type { Estado } from './useStore';
import { stockPorSku } from './selectores';
import { anticiposPorConciliar, pendientesDeRecibir, saldoPorPagar, pagadoCompra, valorRecibido } from './selectoresFase3';

export interface FiltrosReporte { bodega: string; sku: string; estado: string; responsable: string; tipoDoc: string; desde: string; hasta: string }
export const FILTROS_VACIOS: FiltrosReporte = { bodega: 'todas', sku: '', estado: 'todos', responsable: 'todos', tipoDoc: 'todos', desde: '', hasta: '' };

export const enRango = (f: FiltrosReporte, iso: string) => (!f.desde || iso.slice(0, 10) >= f.desde) && (!f.hasta || iso.slice(0, 10) <= f.hasta);
const cuenta = <T,>(xs: T[], k: (x: T) => string) => { const m: Record<string, number> = {}; for (const x of xs) m[k(x)] = (m[k(x)] ?? 0) + 1; return Object.entries(m).map(([nombre, cantidad]) => ({ nombre, cantidad })); };

export function indicadores(e: Estado, f: FiltrosReporte) {
  const solicitudes = e.solicitudes.filter((s) => enRango(f, s.creadoEn) && (f.estado === 'todos' || s.estado === f.estado) && (f.responsable === 'todos' || s.creadoPor === f.responsable) && (!f.sku || s.lineas.some((l) => l.sku === f.sku)));
  const compras = e.compras.filter((c) => enRango(f, c.creadoEn) && (f.estado === 'todos' || c.estado === f.estado) && (f.responsable === 'todos' || c.creadoPor === f.responsable) && (!f.sku || c.lineas.some((l) => l.sku === f.sku)));
  // Tiempo promedio de aprobacion: desde que pasa a pendiente hasta que se aprueba
  const tiempos: number[] = [];
  for (const s of e.solicitudes) {
    const ini = s.historial.find((h) => h.estadoNuevo === 'pendiente'); const fin = [...s.historial].reverse().find((h) => h.estadoNuevo === 'aprobada');
    if (ini && fin) tiempos.push((new Date(fin.fecha).getTime() - new Date(ini.fecha).getTime()) / 36e5);
  }
  const promedioAprobacionHoras = tiempos.length ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length : null;
  const porProveedor = Object.values(compras.reduce<Record<string, { nombre: string; total: number }>>((acc, c) => {
    const n = e.proveedores.find((p) => p.id === c.proveedorId)?.nombre ?? c.proveedorId;
    acc[n] = { nombre: n, total: (acc[n]?.total ?? 0) + c.total }; return acc;
  }, {}));
  const bodegaFiltro = f.bodega === 'todas' ? undefined : f.bodega;
  const activos = e.articulos.filter((a) => a.activo && (!f.sku || a.sku === f.sku));
  const categorias: Record<string, number> = {};
  let valor = 0;
  for (const a of activos) { const s = stockPorSku(e, a.sku, bodegaFiltro); categorias[a.categoria] = (categorias[a.categoria] ?? 0) + s.fisica; valor += s.fisica * (a.precioReferencia ?? 0); }
  const despachos = e.despachos.filter((d) => d.estado === 'confirmado' && enRango(f, d.actualizadoEn) && (!bodegaFiltro || d.bodegaId === bodegaFiltro) && (!f.sku || d.lineas.some((l) => l.sku === f.sku)) && (f.responsable === 'todos' || d.creadoPor === f.responsable));
  const anticiposAbiertos = e.solicitudesPago.filter((s) => s.tipo === 'anticipo' && s.estado !== 'conciliada' && enRango(f, s.creadoEn));
  return {
    solicitudesPorEstado: cuenta(solicitudes, (s) => s.estado), comprasPorEstado: cuenta(compras, (c) => c.estado), comprasPorProveedor: porProveedor,
    promedioAprobacionHoras, anticiposAbiertos: anticiposAbiertos.length, anticiposImporte: anticiposAbiertos.reduce((a, s) => a + s.importe, 0),
    existenciasPorCategoria: Object.entries(categorias).map(([nombre, cantidad]) => ({ nombre, cantidad: Math.round(cantidad) })), valorInventario: valor, despachos,
    despachosPorDia: cuenta(despachos, (d) => d.actualizadoEn.slice(0, 10)).sort((a, b) => a.nombre.localeCompare(b.nombre)),
  };
}

export const comprasPorRecibir = (e: Estado, f: FiltrosReporte) => pendientesDeRecibir(e).filter((x) => (!f.sku || x.compra.lineas.some((l) => l.sku === f.sku)) && (f.responsable === 'todos' || x.compra.creadoPor === f.responsable));

export function pagosPendientes(e: Estado, f: FiltrosReporte) {
  const compras = e.compras.filter((c) => c.estado !== 'rechazada' && c.estado !== 'borrador' && (!f.sku || c.lineas.some((l) => l.sku === f.sku))).map((c) => ({ compra: c, recibido: valorRecibido(e, c.id), pagado: pagadoCompra(e, c.id), saldo: saldoPorPagar(e, c.id) })).filter((x) => x.saldo > 0);
  return { compras, anticipos: anticiposPorConciliar(e) };
}

export function movimientosFiltrados(e: Estado, f: FiltrosReporte, tipo: 'materia_prima' | 'producto_terminado') {
  return e.movimientos.filter((m) => m.tipoArticulo === tipo && enRango(f, m.fecha) && (f.bodega === 'todas' || m.bodegaOrigenId === f.bodega || m.bodegaDestinoId === f.bodega) && (!f.sku || m.sku === f.sku)
    && (f.responsable === 'todos' || m.usuarioId === f.responsable) && (f.tipoDoc === 'todos' || m.documentoTipo === f.tipoDoc)).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

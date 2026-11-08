// Acciones de Tesoreria ampliada: facturas de proveedor (con cotejo contra orden y recepcion) y conciliacion bancaria.
import type { StoreApi } from 'zustand';
import { puede } from '../lib/permisos';
import { siguienteNumero } from '../lib/numeracion';
import { hoyISO } from '../lib/reglas';
import type { FacturaProveedor, HistorialItem, MovimientoBanco, ResultadoAccion, Usuario } from '../types';
import { valorRecibido } from './selectoresFase3';
import { candidatosPago, facturaVigente, pagosSinMovimiento } from './selectoresTesoreria';
import type { Acciones, Store } from './useStore';

type Set = StoreApi<Store>['setState'];
type Get = StoreApi<Store>['getState'];

const falla = (error: string): ResultadoAccion => ({ ok: false, error });
const ahora = () => new Date().toISOString();
const entrada = (u: Usuario, accion: string, ant?: string, nuevo?: string, obs?: string): HistorialItem =>
  ({ fecha: ahora(), usuarioId: u.id, accion, estadoAnterior: ant, estadoNuevo: nuevo, observacion: obs });
const r2 = (n: number) => Math.round(n * 100) / 100;
const TOLERANCIA = 0.05; // SUPUESTO: diferencias de hasta 5 centavos por redondeo no se consideran diferencia de cotejo

export function crearAccionesTesoreria(set: Set, get: Get): Partial<Acciones> {
  const usuario = (): Usuario | null => get().usuarios.find((u) => u.id === get().usuarioActualId) ?? null;
  const auditar = (u: Usuario, entidad: string, accion: string, detalle: string) =>
    set((s) => ({ auditoria: [{ id: `aud-${String(s.auditoria.length + 1).padStart(4, '0')}-${Date.now() % 100000}`, fecha: ahora(), usuarioId: u.id, entidad, accion, detalle }, ...s.auditoria] }));
  const actualizarFactura = (id: string, cambios: Partial<FacturaProveedor>, h: HistorialItem) =>
    set((s) => ({ facturas: s.facturas.map((f) => (f.id === id ? { ...f, ...cambios, actualizadoEn: ahora(), historial: [...f.historial, h] } : f)) }));
  const actualizarMov = (id: string, cambios: Partial<MovimientoBanco>) =>
    set((s) => ({ movimientosBanco: s.movimientosBanco.map((m) => (m.id === id ? { ...m, ...cambios } : m)) }));

  return {
    registrarFactura: (d) => {
      const u = usuario();
      if (!u) return falla('Debes iniciar sesión');
      if (!puede(u, 'factura.registrar')) return falla('Solo Tesorería registra facturas de proveedor');
      const c = get().compras.find((x) => x.id === d.compraId);
      if (!c) return falla('Elige la orden de compra de la factura');
      if (c.estadoRecepcion === 'pendiente') return falla('La orden aún no tiene recepción: registra la factura cuando llegue la mercancía');
      if (facturaVigente(get(), c.id)) return falla('Esa orden ya tiene una factura vigente; anúlala si necesitas registrar otra');
      const num = d.numeroFactura.trim();
      if (!/^\d{3}-\d{3}-\d{9}$/.test(num)) return falla('El número de factura debe tener el formato 001-001-000000123');
      if (get().facturas.some((f) => f.proveedorId === c.proveedorId && f.numeroFactura === num && f.estado !== 'anulada')) return falla('Ese proveedor ya tiene registrada una factura con ese número');
      if (!d.fechaEmision || !d.fechaVencimiento) return falla('Indica la fecha de emisión y la de vencimiento');
      if (d.fechaEmision.slice(0, 10) > hoyISO()) return falla('La fecha de emisión no puede ser posterior a hoy');
      if (d.fechaVencimiento < d.fechaEmision) return falla('El vencimiento no puede ser anterior a la emisión');
      if (!isFinite(d.subtotal) || d.subtotal <= 0) return falla('El subtotal debe ser mayor que cero');
      if (!isFinite(d.iva) || d.iva < 0) return falla('El IVA no puede ser negativo');
      if (!d.archivo?.trim()) return falla('Adjunta el archivo de la factura (PDF)');

      const total = r2(d.subtotal + d.iva);
      const recibido = valorRecibido(get(), c.id);
      const diferencia = r2(total - recibido);
      const conDif = Math.abs(diferencia) > TOLERANCIA;
      const numero = siguienteNumero('FAC', get().facturas.map((f) => f.numero));
      const estado: FacturaProveedor['estado'] = conDif ? 'con_diferencia' : 'cotejada';
      const factura: FacturaProveedor = {
        id: numero.toLowerCase(), numero, creadoPor: u.id, creadoEn: ahora(), actualizadoEn: ahora(), compraId: c.id, proveedorId: c.proveedorId, numeroFactura: num,
        fechaEmision: new Date(`${d.fechaEmision.slice(0, 10)}T12:00:00`).toISOString(), fechaVencimiento: new Date(`${d.fechaVencimiento.slice(0, 10)}T12:00:00`).toISOString(),
        subtotal: r2(d.subtotal), iva: r2(d.iva), total, archivo: d.archivo.trim(), valorRecibido: recibido, diferencia, estado, observacion: d.observacion?.trim() || undefined,
        historial: [entrada(u, conDif ? `Factura registrada con diferencia de ${diferencia > 0 ? '+' : ''}${diferencia.toFixed(2)} frente a lo recibido` : 'Factura registrada y cotejada con la orden y la recepción', undefined, estado)],
      };
      set((s) => ({ facturas: [factura, ...s.facturas] }));
      auditar(u, 'Factura de proveedor', 'Registro', `${numero} (${num}) de ${c.numero} por ${total.toFixed(2)}${conDif ? ' con diferencia' : ''}`);
      get().mostrarToast(conDif ? `Factura ${numero} registrada con diferencia: revísala en el cotejo` : `Factura ${numero} registrada y cotejada`, conDif ? 'info' : 'ok');
      return { ok: true, id: factura.id };
    },

    resolverDiferenciaFactura: (id, decision, motivo) => {
      const u = usuario(); const f = get().facturas.find((x) => x.id === id);
      if (!u || !f) return falla('Factura no encontrada');
      if (!puede(u, 'factura.registrar')) return falla('Solo Tesorería resuelve diferencias de facturas');
      if (f.estado !== 'con_diferencia') return falla('La factura no tiene una diferencia por resolver');
      if (motivo.trim().length < 5) return falla('Escribe el motivo (mínimo 5 letras)');
      if (decision === 'aceptar') {
        actualizarFactura(id, { estado: 'cotejada', observacion: `Diferencia aceptada: ${motivo.trim()}` }, entrada(u, 'Diferencia aceptada', 'con_diferencia', 'cotejada', motivo.trim()));
        auditar(u, 'Factura de proveedor', 'Diferencia aceptada', `${f.numero}: ${motivo.trim()}`);
      } else {
        actualizarFactura(id, { estado: 'en_reclamo', observacion: `En reclamo al proveedor: ${motivo.trim()}` }, entrada(u, 'Diferencia en reclamo al proveedor', 'con_diferencia', 'en_reclamo', motivo.trim()));
        auditar(u, 'Factura de proveedor', 'Reclamo al proveedor', `${f.numero}: ${motivo.trim()}`);
      }
      return { ok: true };
    },

    anularFactura: (id, motivo) => {
      const u = usuario(); const f = get().facturas.find((x) => x.id === id);
      if (!u || !f) return falla('Factura no encontrada');
      if (!puede(u, 'factura.registrar')) return falla('Solo Tesorería anula facturas');
      if (f.estado === 'anulada') return falla('La factura ya está anulada');
      if (motivo.trim().length < 5) return falla('Escribe el motivo de la anulación (mínimo 5 letras)');
      actualizarFactura(id, { estado: 'anulada' }, entrada(u, 'Factura anulada', f.estado, 'anulada', motivo.trim()));
      auditar(u, 'Factura de proveedor', 'Anulación', `${f.numero} (${f.numeroFactura}): ${motivo.trim()}`);
      return { ok: true };
    },

    // Simula la descarga del extracto del banco: aparecen las lineas de los pagos ya registrados que todavia no figuraban
    importarExtracto: () => {
      const u = usuario();
      if (!u) return falla('Debes iniciar sesión');
      if (!puede(u, 'banco.conciliar')) return falla('Solo Tesorería importa el extracto bancario');
      const nuevos: MovimientoBanco[] = [];
      let n = get().movimientosBanco.length;
      for (const p of pagosSinMovimiento(get())) {
        const sp = get().solicitudesPago.find((s) => s.id === p.solicitudPagoId);
        const c = get().compras.find((x) => x.id === sp?.compraId);
        const prov = get().proveedores.find((x) => x.id === c?.proveedorId)?.nombre ?? 'Proveedor';
        n += 1;
        nuevos.push({ id: `mb-${String(n).padStart(4, '0')}`, cuentaId: p.cuentaId!, fecha: new Date().toISOString(), referencia: p.referencia ?? '',
          descripcion: `${p.medio === 'cheque' ? 'Cheque cobrado' : 'Transferencia enviada'} - ${prov}`, monto: -p.importe, estado: 'sin_conciliar' });
      }
      if (nuevos.length === 0) { get().mostrarToast('El extracto está al día: no hay pagos sin movimiento bancario', 'info'); return { ok: true, cantidad: 0 }; }
      set((s) => ({ movimientosBanco: [...nuevos, ...s.movimientosBanco] }));
      auditar(u, 'Conciliación bancaria', 'Importación de extracto (simulada)', `${nuevos.length} movimientos nuevos`);
      get().mostrarToast(`Extracto importado: ${nuevos.length} ${nuevos.length === 1 ? 'movimiento nuevo' : 'movimientos nuevos'}`, 'ok');
      return { ok: true, cantidad: nuevos.length };
    },

    conciliarMovimiento: (movimientoId, pagoId) => {
      const u = usuario(); const m = get().movimientosBanco.find((x) => x.id === movimientoId);
      if (!u || !m) return falla('Movimiento no encontrado');
      if (!puede(u, 'banco.conciliar')) return falla('Solo Tesorería concilia el extracto bancario');
      if (m.estado !== 'sin_conciliar') return falla('El movimiento ya fue resuelto');
      const p = candidatosPago(get(), m).find((x) => x.id === pagoId);
      if (!p) return falla('Ese pago no coincide con el movimiento (distinto importe, cuenta o ya conciliado)');
      actualizarMov(movimientoId, { estado: 'conciliado', pagoId: p.id, conciliadoPor: u.id, conciliadoEn: ahora() });
      auditar(u, 'Conciliación bancaria', 'Movimiento conciliado', `${m.referencia || m.id} con pago ${p.id}`);
      return { ok: true };
    },

    conciliarAutomatico: () => {
      const u = usuario();
      if (!u) return falla('Debes iniciar sesión');
      if (!puede(u, 'banco.conciliar')) return falla('Solo Tesorería concilia el extracto bancario');
      let cantidad = 0;
      const usados = new Set<string>();
      const cambios = new Map<string, string>();
      for (const m of get().movimientosBanco.filter((x) => x.estado === 'sin_conciliar')) {
        // Mismo importe y cuenta; si hay referencia, debe coincidir; el primer candidato libre se asigna
        const p = candidatosPago(get(), m).find((x) => !usados.has(x.id) && (!m.referencia || !x.referencia || x.referencia === m.referencia));
        if (p) { usados.add(p.id); cambios.set(m.id, p.id); cantidad += 1; }
      }
      if (cantidad === 0) { get().mostrarToast('No se encontraron coincidencias automáticas: revisa los movimientos manualmente', 'info'); return { ok: true, cantidad: 0 }; }
      set((s) => ({ movimientosBanco: s.movimientosBanco.map((m) => (cambios.has(m.id) ? { ...m, estado: 'conciliado', pagoId: cambios.get(m.id), conciliadoPor: u.id, conciliadoEn: ahora() } : m)) }));
      auditar(u, 'Conciliación bancaria', 'Conciliación automática', `${cantidad} movimientos conciliados por importe y referencia`);
      get().mostrarToast(`Conciliados automáticamente: ${cantidad}`, 'ok');
      return { ok: true, cantidad };
    },

    marcarGastoBancario: (movimientoId, nota) => {
      const u = usuario(); const m = get().movimientosBanco.find((x) => x.id === movimientoId);
      if (!u || !m) return falla('Movimiento no encontrado');
      if (!puede(u, 'banco.conciliar')) return falla('Solo Tesorería registra gastos bancarios');
      if (m.estado !== 'sin_conciliar') return falla('El movimiento ya fue resuelto');
      if (m.monto >= 0) return falla('Solo los cargos del banco se registran como gasto bancario');
      if (nota.trim().length < 5) return falla('Escribe el concepto del gasto (mínimo 5 letras)');
      actualizarMov(movimientoId, { estado: 'gasto_bancario', nota: nota.trim(), conciliadoPor: u.id, conciliadoEn: ahora() });
      auditar(u, 'Conciliación bancaria', 'Gasto bancario registrado', `${m.referencia || m.id} por ${Math.abs(m.monto).toFixed(2)}: ${nota.trim()}`);
      return { ok: true };
    },

    deshacerConciliacion: (movimientoId) => {
      const u = usuario(); const m = get().movimientosBanco.find((x) => x.id === movimientoId);
      if (!u || !m) return falla('Movimiento no encontrado');
      if (!puede(u, 'banco.conciliar')) return falla('Solo Tesorería deshace conciliaciones');
      if (m.estado === 'sin_conciliar') return falla('El movimiento no está conciliado');
      actualizarMov(movimientoId, { estado: 'sin_conciliar', pagoId: undefined, nota: undefined, conciliadoPor: undefined, conciliadoEn: undefined });
      auditar(u, 'Conciliación bancaria', 'Conciliación deshecha', `${m.referencia || m.id}`);
      return { ok: true };
    },
  };
}

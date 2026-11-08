// Arma los datos de los documentos de muestra a partir del estado (compras, facturas, pagos).
import type { Compra, FacturaProveedor, Pago, SolicitudPago } from '../types';
import type { Estado } from '../store/useStore';
import type { DatosComprobanteDoc, DatosFacturaDoc, DatosOrdenDoc, LineaDoc } from './documentos';

const lineasDe = (e: Estado, c: Compra): LineaDoc[] => c.lineas.map((l) => ({
  codigo: l.sku, descripcion: e.articulos.find((a) => a.sku === l.sku)?.nombre ?? l.sku, cantidad: l.cantidad,
  unidad: e.unidades.find((u) => u.id === l.unidadId)?.simbolo ?? '', precio: l.precioUnitario,
}));
const nombreUsuario = (e: Estado, id?: string) => e.usuarios.find((u) => u.id === id)?.nombre ?? '-';

export function datosFactura(e: Estado, f: FacturaProveedor): DatosFacturaDoc {
  const c = e.compras.find((x) => x.id === f.compraId); const p = e.proveedores.find((x) => x.id === f.proveedorId);
  return { numeroFactura: f.numeroFactura, interno: f.numero, fechaEmision: f.fechaEmision, fechaVencimiento: f.fechaVencimiento, ordenNumero: c?.numero ?? '-',
    proveedor: p?.nombre ?? '-', ruc: p?.identificacionFiscal ?? '-', ciudad: p?.ciudad ?? '-', lineas: c ? lineasDe(e, c) : [], subtotal: f.subtotal, iva: f.iva, total: f.total,
    ivaPct: e.parametros.impuestoInformativoPct, condiciones: c?.condiciones ?? '' };
}

export function datosComprobante(e: Estado, sp: SolicitudPago, pago: Pago): DatosComprobanteDoc {
  const c = e.compras.find((x) => x.id === sp.compraId); const cta = e.cuentasBancarias.find((x) => x.id === pago.cuentaId);
  const aprob = [...sp.historial].reverse().find((h) => h.estadoNuevo === 'aprobada');
  return { numero: sp.numero, fecha: pago.fecha, tipo: sp.tipo === 'anticipo' ? 'Anticipo' : 'Pago', proveedor: e.proveedores.find((p) => p.id === c?.proveedorId)?.nombre ?? '-',
    ordenNumero: c?.numero ?? '-', importe: pago.importe, medio: pago.medio, referencia: pago.referencia ?? pago.comprobante, cuenta: cta ? `${cta.banco} ****${cta.ultimos4}` : '',
    preparadoPor: nombreUsuario(e, sp.creadoPor), aprobadoPor: nombreUsuario(e, aprob?.usuarioId), registradoPor: nombreUsuario(e, pago.registradoPor) };
}

export function datosOrden(e: Estado, c: Compra): DatosOrdenDoc {
  const p = e.proveedores.find((x) => x.id === c.proveedorId);
  return { numero: c.numero, fecha: c.creadoEn, proveedor: p?.nombre ?? '-', ruc: p?.identificacionFiscal ?? '-', contacto: p?.contacto ?? '-', correo: p?.correo ?? '-',
    condiciones: c.condiciones, entrega: c.fechaEstimadaEntrega, bodega: e.bodegas.find((b) => b.id === c.lugarEntregaBodegaId)?.nombre ?? 'bodega principal',
    lineas: lineasDe(e, c), subtotal: c.subtotal, iva: c.impuestoInformativo, total: c.total, observaciones: c.observaciones, solicitante: nombreUsuario(e, c.creadoPor) };
}

// ---------------- Fichas genericas (PDF / Word) ----------------
import { textoEstado } from '../components/EstadoBadge';
import type { Ajuste, Despacho, Fabricacion, Recepcion, Solicitud, Traslado } from '../types';
import { formatearCantidad } from './unidades';
import { formatearFecha, formatearFechaHora, formatearMoneda } from './formato';
import { resumenBanco, estadoCuentaProveedor } from '../store/selectoresTesoreria';
import type { FichaDoc } from './documentos';

const art = (e: Estado, sku: string) => e.articulos.find((a) => a.sku === sku);
const bodega = (e: Estado, id: string) => e.bodegas.find((b) => b.id === id)?.nombre ?? id;
const cantBase = (e: Estado, sku: string, v: number) => formatearCantidad(v, art(e, sku)?.unidadBaseId ?? '');
const CANALES: Record<string, string> = { punto_venta: 'Punto de venta', despacho_cliente: 'Despacho a cliente', tienda_en_linea: 'Tienda en línea (simulada)' };

export function fichaSolicitud(e: Estado, s: Solicitud): FichaDoc {
  return { archivo: `solicitud-${s.numero}`, titulo: 'Solicitud de materiales', numero: s.numero, estado: textoEstado(s.estado),
    datos: [['Área', s.area], ['Solicitante', nombreUsuario(e, s.creadoPor)], ['Prioridad', s.prioridad], ['Fecha', formatearFecha(s.creadoEn)], ['Fecha requerida', s.fechaRequerida ? formatearFecha(s.fechaRequerida) : '-'], ['Justificación', s.justificacion || '-']],
    tablaTitulo: 'Artículos solicitados', columnas: ['Código', 'Artículo', 'Cantidad', 'Observación'],
    filas: s.lineas.map((l) => [l.sku, art(e, l.sku)?.nombre ?? l.sku, formatearCantidad(l.cantidad, l.unidadId), l.observacion ?? '']), firmas: ['Solicitante', 'Director de solicitudes'] };
}

export function fichaRecepcion(e: Estado, r: Recepcion): FichaDoc {
  const c = e.compras.find((x) => x.id === r.compraId);
  return { archivo: `acta-recepcion-${r.numero}`, titulo: 'Acta de recepción', numero: r.numero,
    datos: [['Orden de compra', c?.numero ?? '-'], ['Proveedor', e.proveedores.find((p) => p.id === c?.proveedorId)?.nombre ?? '-'], ['Bodega', bodega(e, r.bodegaId)],
      ['Fecha de recepción', formatearFecha(r.fechaRecepcion ?? r.creadoEn)], ['Remisión del proveedor', r.remision ?? '-'], ['Recibido por', nombreUsuario(e, r.creadoPor)], ['Tipo', r.esCierre ? 'Cierre de la orden' : 'Recepción'], ['Observación', r.observacion ?? '-']],
    tablaTitulo: 'Detalle recibido', columnas: ['Código', 'Artículo', 'Ordenado', 'Recibido antes', 'Recibido ahora', 'Faltante', 'Nota'],
    filas: r.lineas.map((l) => [l.sku, art(e, l.sku)?.nombre ?? l.sku, formatearCantidad(l.ordenado, l.unidadId), formatearCantidad(l.recibidoAntes, l.unidadId), formatearCantidad(l.recibidoAhora, l.unidadId), formatearCantidad(l.faltante, l.unidadId), `${l.exceso ? 'Exceso aceptado. ' : ''}${l.observacion ?? ''}`]),
    notas: r.motivoExceso || r.motivoCierre ? `Motivo: ${r.motivoExceso ?? r.motivoCierre}` : undefined, firmas: ['Almacén', 'Transportista / proveedor'] };
}

export function fichaTraslado(e: Estado, t: Traslado): FichaDoc {
  return { archivo: `guia-traslado-${t.numero}`, titulo: 'Guía de traslado entre bodegas', numero: t.numero, estado: textoEstado(t.estado),
    datos: [['Bodega de origen', bodega(e, t.origenId)], ['Bodega de destino', bodega(e, t.destinoId)], ['Creado por', nombreUsuario(e, t.creadoPor)], ['Fecha', formatearFecha(t.creadoEn)], ['Observación', t.observacion ?? '-']],
    tablaTitulo: 'Productos trasladados', columnas: ['Código', 'Artículo', 'Enviado', 'Recibido'],
    filas: t.lineas.map((l) => [l.sku, art(e, l.sku)?.nombre ?? l.sku, cantBase(e, l.sku, l.cantidadEnviada), l.cantidadRecibida === undefined ? '-' : cantBase(e, l.sku, l.cantidadRecibida)]), firmas: ['Entrega (origen)', 'Recibe (destino)'] };
}

export function fichaDespacho(e: Estado, d: Despacho): FichaDoc {
  return { archivo: `nota-entrega-${d.numero}`, titulo: 'Nota de entrega / salida', numero: d.numero, estado: textoEstado(d.estado),
    datos: [['Canal', CANALES[d.canal] ?? d.canal], ['Cliente', d.cliente], ['Identificación', d.identificacionCliente ?? '-'], ['Destino', d.destino || '-'], ['Bodega de salida', bodega(e, d.bodegaId)],
      ['Documento de referencia', d.documentoReferencia || '-'], ['Proyecto', d.proyecto ?? '-'], ['Estado administrativo', textoEstado(d.estadoAdministrativo)]],
    tablaTitulo: 'Productos despachados', columnas: ['Código', 'Producto', 'Cantidad'], filas: d.lineas.map((l) => [l.sku, art(e, l.sku)?.nombre ?? l.sku, cantBase(e, l.sku, l.cantidad)]), firmas: ['Almacén', 'Recibí conforme (cliente)'] };
}

export function fichaFabricacion(e: Estado, f: Fabricacion): FichaDoc {
  return { archivo: `orden-fabricacion-${f.numero}`, titulo: 'Orden de fabricación', numero: f.numero, estado: textoEstado(f.estado),
    datos: [['Producto', `${f.skuProducto} - ${art(e, f.skuProducto)?.nombre ?? ''}`], ['Lote', f.lote], ['Cantidad fabricada', String(f.cantidadFabricada)], ['Fecha de fabricación', formatearFecha(f.fechaFabricacion)],
      ['Bodega de insumos', bodega(e, f.bodegaOrigenInsumosId)], ['Bodega de destino', bodega(e, f.bodegaDestinoId)], ['Desviación de consumo', `${f.desviacionPct.toFixed(1)} %`], ['Responsable', nombreUsuario(e, f.creadoPor)], ['Observación', f.observacion ?? '-']],
    tablaTitulo: 'Consumo de materia prima', columnas: ['Código', 'Material', 'Estándar', 'Real', 'Justificación'],
    filas: f.consumos.map((c) => [c.sku, art(e, c.sku)?.nombre ?? c.sku, cantBase(e, c.sku, c.estandar), cantBase(e, c.sku, c.real), `${c.extra ? 'Insumo extra. ' : ''}${c.justificacion ?? ''}`]), firmas: ['Producción', 'Director (si hay desvío)'] };
}

export function fichaAjuste(e: Estado, a: Ajuste): FichaDoc {
  return { archivo: `ajuste-${a.numero}`, titulo: 'Ajuste de inventario', numero: a.numero, estado: textoEstado(a.estado),
    datos: [['Artículo', `${a.sku} - ${art(e, a.sku)?.nombre ?? ''}`], ['Bodega', bodega(e, a.bodegaId)], ['Tipo', a.tipoAjuste ?? '-'], ['Cantidad (con signo)', cantBase(e, a.sku, a.cantidadBase)], ['Motivo', a.motivo], ['Registrado por', nombreUsuario(e, a.creadoPor)], ['Fecha', formatearFechaHora(a.creadoEn)]], firmas: ['Almacén', 'Aprobador'] };
}

export function fichaConciliacion(e: Estado, cuentaId: string): FichaDoc {
  const c = e.cuentasBancarias.find((x) => x.id === cuentaId); const r = resumenBanco(e, cuentaId);
  const movs = e.movimientosBanco.filter((m) => m.cuentaId === cuentaId).sort((a, b) => b.fecha.localeCompare(a.fecha));
  return { archivo: `conciliacion-bancaria-${c?.ultimos4 ?? cuentaId}`, titulo: 'Conciliación bancaria', numero: c ? `${c.banco} ****${c.ultimos4}` : cuentaId,
    datos: [['Cuenta', c?.nombre ?? '-'], ['Fecha de corte', formatearFecha(new Date())], ['Saldo según banco', formatearMoneda(r.saldoBanco)], ['Saldo según libros', formatearMoneda(r.saldoLibros)],
      ['Pagos en tránsito', formatearMoneda(r.enTransito)], ['Movimientos sin identificar', formatearMoneda(r.sinIdentificar)], ['Diferencia (banco menos libros)', formatearMoneda(r.diferencia)]],
    tablaTitulo: 'Movimientos del extracto', columnas: ['Fecha', 'Descripción', 'Referencia', 'Monto', 'Estado'],
    filas: movs.map((m) => [formatearFecha(m.fecha), m.descripcion, m.referencia, formatearMoneda(m.monto), textoEstado(m.estado)]), firmas: ['Elaboró (Tesorería)', 'Revisó'] };
}

export function fichaEstadoCuenta(e: Estado, proveedorId: string): FichaDoc {
  const p = e.proveedores.find((x) => x.id === proveedorId); const libro = estadoCuentaProveedor(e, proveedorId); const saldo = libro[libro.length - 1]?.saldo ?? 0;
  return { archivo: `estado-cuenta-${proveedorId}`, titulo: 'Estado de cuenta del proveedor', numero: p?.nombre ?? proveedorId,
    datos: [['Proveedor', p?.nombre ?? '-'], ['ID fiscal', p?.identificacionFiscal ?? '-'], ['Condiciones de pago', p?.condicionesPago ?? '-'], ['Fecha de corte', formatearFecha(new Date())]],
    tablaTitulo: 'Libro de movimientos', columnas: ['Fecha', 'Tipo', 'Documento', 'Detalle', 'Facturado', 'Pagado', 'Saldo'],
    filas: libro.map((l) => [formatearFecha(l.fecha), l.tipo, l.documento, l.detalle, l.cargo ? formatearMoneda(l.cargo) : '-', l.abono ? formatearMoneda(l.abono) : '-', formatearMoneda(l.saldo)]), totales: [['SALDO', formatearMoneda(saldo)]], firmas: ['Tesorería'] };
}

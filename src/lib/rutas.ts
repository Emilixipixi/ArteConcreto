// Rutas de la aplicacion y utilidades para enlazar documentos
export const RUTAS = {
  login: '/login', panel: '/', solicitudes: '/solicitudes', director: '/director', compras: '/compras',
  aprobacionCompras: '/aprobacion-compras', tesoreria: '/tesoreria', recepcion: '/recepcion',
  materiasPrimas: '/materias-primas', fabricacion: '/fabricacion', productoTerminado: '/producto-terminado',
  traslados: '/traslados', ventas: '/ventas', disponibilidad: '/disponibilidad', conexiones: '/conexiones',
  reportes: '/reportes', administracion: '/administracion', notificaciones: '/notificaciones', guia: '/guia-demo',
} as const;

/** Ruta del detalle de un documento segun su tipo */
export function rutaDocumento(docTipo: string, id: string): string {
  switch (docTipo) {
    case 'Solicitud': return `${RUTAS.solicitudes}/${id}`;
    case 'Compra': return `${RUTAS.compras}/${id}`;
    case 'SolicitudPago': return `${RUTAS.tesoreria}/${id}`;
    case 'Recepción': case 'Recepcion': return `${RUTAS.recepcion}/${id}`;
    case 'Fabricación': case 'Fabricacion': return `${RUTAS.fabricacion}/${id}`;
    case 'Traslado': return `${RUTAS.traslados}/${id}`;
    case 'Despacho': return `${RUTAS.ventas}/${id}`;
    case 'Ajuste': return `${RUTAS.materiasPrimas}?doc=${id}`;
    case 'Evento': return RUTAS.conexiones;
    default: return RUTAS.panel;
  }
}

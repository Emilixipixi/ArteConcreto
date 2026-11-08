// Store global (Zustand). Las pantallas nunca modifican datos directamente: usan acciones.
// Cada accion de negocio: valida permisos/reglas, cambia estado, agrega historial, genera movimientos y notificaciones.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { crearDatosDemo, type DatosDemo } from '../data';
import { esParaUsuario, notificar, type ContextoNotif, type EventoNotif } from '../lib/notificaciones';
import type {
  Ajuste, Articulo, Bodega, Reserva, Compra, Despacho, Fabricacion, LineaCompra, LineaRecepcion, Parametros, Proveedor,
  ResultadoAccion, Solicitud, Traslado, Unidad, Usuario, Pago,
} from '../types';
import { ROL_NOMBRE } from '../data/roles';
import { crearAccionesFase2 } from './accionesFase2';
import { crearAccionesFase3 } from './accionesFase3';
import { crearAccionesFase4 } from './accionesFase4';
import { registrarUnidades } from '../lib/unidades';
import { crearAccionesFase5 } from './accionesFase5';
import { crearAccionesTesoreria } from './accionesTesoreria';

export const CLAVE_STORAGE = 'arteconcreto-demo-v1';

export interface ToastItem { id: string; tipo: 'ok' | 'error' | 'info'; mensaje: string }

export interface Estado extends DatosDemo {
  usuarioActualId: string | null;
  bodegaActivaId: string; // 'todas' o id de bodega (filtro visual)
  toasts: ToastItem[];
}

// Cargas utiles de las acciones de fases siguientes (campos opcionales para poder ampliarlas)
export type DatosSolicitud = Partial<Pick<Solicitud, 'area' | 'prioridad' | 'justificacion' | 'lineas' | 'adjuntos' | 'fechaRequerida'>>;
export type DatosCompra = Partial<Omit<Compra, 'id' | 'numero' | 'historial' | 'creadoPor' | 'creadoEn' | 'actualizadoEn'>>;
export type Decision = 'aprobar' | 'devolver' | 'rechazar';
export type DatosPago = { fecha?: string; medio: Pago['medio']; comprobante: string; importe?: number; referencia?: string; cuentaId?: string };
export type DatosFactura = { compraId: string; numeroFactura: string; fechaEmision: string; fechaVencimiento: string; subtotal: number; iva: number; archivo: string; observacion?: string };
// Datos adicionales de la recepcion (Fase 3): todos opcionales para no alterar la firma original
export type ExtraRecepcion = {
  bodegaId?: string; fecha?: string; remision?: string; adjuntos?: string[]; motivoExceso?: string;
  observacionesLinea?: Record<string, string>;
};

export interface Acciones {
  // Tesoreria ampliada: facturas de proveedor y conciliacion bancaria (accionesTesoreria.ts)
  registrarFactura: (d: DatosFactura) => ResultadoAccion;
  resolverDiferenciaFactura: (id: string, decision: 'aceptar' | 'reclamar', motivo: string) => ResultadoAccion;
  anularFactura: (id: string, motivo: string) => ResultadoAccion;
  importarExtracto: () => ResultadoAccion & { cantidad?: number };
  conciliarMovimiento: (movimientoId: string, pagoId: string) => ResultadoAccion;
  conciliarAutomatico: () => ResultadoAccion & { cantidad?: number };
  marcarGastoBancario: (movimientoId: string, nota: string) => ResultadoAccion;
  deshacerConciliacion: (movimientoId: string) => ResultadoAccion;
  // Sesion y utilidades (Fase 1)
  cambiarUsuario: (usuarioId: string) => ResultadoAccion;
  cerrarSesion: () => void;
  reiniciarDemo: () => void;
  setBodegaActiva: (bodegaId: string) => void;
  mostrarToast: (mensaje: string, tipo?: ToastItem['tipo']) => void;
  cerrarToast: (id: string) => void;
  emitirNotificacion: (evento: EventoNotif, ctx: ContextoNotif) => void;
  generarNotificacionPrueba: () => void;
  marcarNotificacionLeida: (id: string) => void;
  marcarTodasLeidas: () => void;
  // Fase 2
  crearSolicitud: (d: DatosSolicitud) => ResultadoAccion;
  guardarBorradorSolicitud: (d: DatosSolicitud, id?: string) => ResultadoAccion;
  enviarSolicitud: (id: string) => ResultadoAccion;
  decidirSolicitud: (id: string, decision: Decision, observacion?: string) => ResultadoAccion;
  reenviarSolicitud: (id: string, d?: DatosSolicitud) => ResultadoAccion;
  eliminarSolicitud: (id: string) => ResultadoAccion; // Fase 2: eliminar borradores
  crearCompraDesdeSolicitud: (solicitudId: string) => ResultadoAccion;
  crearCompraAdministrativa: (d: { motivo: string; centroCosto: string }) => ResultadoAccion;
  elegirProveedor: (compraId: string, proveedorId: string) => ResultadoAccion;
  generarOrdenCompra: (id: string) => ResultadoAccion;
  guardarCompra: (d: DatosCompra, id?: string) => ResultadoAccion;
  enviarCompraAAprobacion: (id: string) => ResultadoAccion;
  decidirCompra: (id: string, decision: Decision, observacion?: string) => ResultadoAccion;
  // Fase 3
  crearSolicitudPago: (compraId: string, tipo: 'anticipo' | 'pago_final', importe: number, observacion?: string) => ResultadoAccion;
  decidirSolicitudPago: (id: string, decision: Decision, observacion?: string) => ResultadoAccion;
  registrarPago: (solicitudPagoId: string, d: DatosPago) => ResultadoAccion;
  conciliarAnticipo: (solicitudPagoId: string) => ResultadoAccion;
  enviarSolicitudPago: (id: string, d?: { importe?: number; observacion?: string }) => ResultadoAccion;
  registrarRecepcion: (compraId: string, lineas: Pick<LineaRecepcion, 'sku' | 'recibidoAhora'>[], observacion?: string, extra?: ExtraRecepcion) => ResultadoAccion;
  cerrarRecepcion: (compraId: string, observacion?: string) => ResultadoAccion;
  crearAjuste: (d: Pick<Ajuste, 'sku' | 'bodegaId' | 'cantidadBase' | 'motivo'> & Partial<Pick<Ajuste, 'tipoAjuste'>>) => ResultadoAccion;
  decidirAjuste: (id: string, decision: Decision, observacion?: string) => ResultadoAccion;
  // Fase 4
  crearFabricacion: (d: Partial<Fabricacion>) => ResultadoAccion;
  actualizarFabricacion: (id: string, d: Partial<Fabricacion>) => ResultadoAccion;
  confirmarFabricacion: (id: string, observacion?: string) => ResultadoAccion;
  anularFabricacion: (id: string, motivo: string) => ResultadoAccion;
  crearReserva: (d: Pick<Reserva, 'sku' | 'bodegaId' | 'cantidad' | 'cliente' | 'referencia' | 'vence'>) => ResultadoAccion;
  liberarReserva: (id: string, motivo?: string) => ResultadoAccion;
  liberarReservasVencidas: () => void;
  crearTraslado: (d: Pick<Traslado, 'origenId' | 'destinoId' | 'lineas'> & Partial<Pick<Traslado, 'observacion'>>) => ResultadoAccion;
  cancelarTraslado: (id: string) => ResultadoAccion;
  actualizarDespacho: (id: string, d: Partial<Despacho>) => ResultadoAccion;
  enviarASalida: (id: string) => ResultadoAccion;
  anularSalida: (id: string, motivo: string) => ResultadoAccion;
  marcarDescargado: (id: string) => ResultadoAccion;
  despacharTraslado: (id: string) => ResultadoAccion;
  recibirTraslado: (id: string, recibidas: Record<string, number>) => ResultadoAccion;
  crearDespacho: (d: Partial<Despacho>) => ResultadoAccion;
  confirmarSalida: (id: string) => ResultadoAccion;
  // Fase 5
  consultarDisponibilidad: (sku: string, cantidad: number) => ResultadoAccion;
  simularEventoTienda: (idExterno: string, sku: string, cantidad: number, extra?: { cliente?: string; ciudad?: string }) => ResultadoAccion;
  reintentarEvento: (id: string) => ResultadoAccion;
  guardarUsuario: (u: Usuario) => ResultadoAccion;
  guardarBodega: (b: Bodega) => ResultadoAccion;
  guardarArticulo: (a: Articulo & { nuevo?: boolean }) => ResultadoAccion;
  agregarCategoria: (nombre: string) => ResultadoAccion;
  guardarUnidad: (u: Unidad) => ResultadoAccion;
  guardarProveedor: (p: Proveedor) => ResultadoAccion;
  guardarParametros: (p: Partial<Parametros>) => ResultadoAccion;
}

// Cuerpo temporal de las acciones que se completan en fases siguientes
const pendienteFase = (fase: number) => (): ResultadoAccion => ({ ok: false, error: `Esta acción estará disponible en la fase ${fase}` });

export type Store = Estado & Acciones;

let contadorToast = 0;

const estadoInicial = (): Estado => ({
  ...crearDatosDemo(),
  usuarioActualId: null,
  bodegaActivaId: 'todas',
  toasts: [],
});

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...estadoInicial(),

      cambiarUsuario: (usuarioId) => {
        const u = get().usuarios.find((x) => x.id === usuarioId && x.activo);
        if (!u) return { ok: false, error: 'Usuario no encontrado' };
        set({ usuarioActualId: u.id });
        return { ok: true, id: u.id };
      },
      cerrarSesion: () => set({ usuarioActualId: null }),
      reiniciarDemo: () => {
        // Borra la persistencia y restaura la semilla conservando la sesion actual
        const sesion = get().usuarioActualId;
        try { localStorage.removeItem(CLAVE_STORAGE); } catch { /* sin acceso a localStorage */ }
        try { localStorage.removeItem('arteconcreto-tour-v1'); } catch { /* sin acceso a localStorage */ } // el recorrido de bienvenida vuelve a mostrarse
        set({ ...estadoInicial(), usuarioActualId: sesion });
        get().mostrarToast('Datos de demostración restaurados', 'ok');
      },
      setBodegaActiva: (bodegaId) => set({ bodegaActivaId: bodegaId }),

      mostrarToast: (mensaje, tipo = 'ok') => {
        const id = `t-${Date.now()}-${contadorToast++}`;
        set((s) => ({ toasts: [...s.toasts, { id, tipo, mensaje }] }));
        setTimeout(() => get().cerrarToast(id), 4500);
      },
      cerrarToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      // Genera notificaciones desde REGLAS_NOTIFICACION; las alertas agregan un correo simulado (opcional, seccion 12)
      emitirNotificacion: (evento, ctx) => {
        const nuevas = notificar(evento, ctx);
        if (nuevas.length === 0) return;
        const correos = nuevas
          .filter((n) => n.tipo === 'alerta')
          .map((n, i) => ({
            id: `cs-${Date.now()}-${i}`, fecha: n.fecha, canal: 'correo' as const, asunto: n.titulo,
            para: n.destinatarioRoles.map((r) => ROL_NOMBRE[r]).join(', ') || 'Usuario creador',
          }));
        set((s) => ({ notificaciones: [...nuevas, ...s.notificaciones], correosSimulados: [...correos, ...s.correosSimulados] }));
      },
      generarNotificacionPrueba: () => {
        const uid = get().usuarioActualId;
        if (!uid) return;
        get().emitirNotificacion('prueba', { numero: 'PRUEBA', docId: 'prueba', creadoPor: uid, detalle: 'Notificación de prueba generada en vivo para verificar la campana.' });
        get().mostrarToast('Notificación de prueba generada', 'info');
      },
      marcarNotificacionLeida: (id) =>
        set((s) => ({
          notificaciones: s.notificaciones.map((n) =>
            n.id === id && s.usuarioActualId && !n.leidaPor.includes(s.usuarioActualId) ? { ...n, leidaPor: [...n.leidaPor, s.usuarioActualId] } : n),
        })),
      marcarTodasLeidas: () =>
        set((s) => {
          const u = s.usuarios.find((x) => x.id === s.usuarioActualId);
          if (!u) return {};
          return {
            notificaciones: s.notificaciones.map((n) =>
              esParaUsuario(n, u.id, u.roles) && !n.leidaPor.includes(u.id) ? { ...n, leidaPor: [...n.leidaPor, u.id] } : n),
          };
        }),

      // Fase 2: implementadas en accionesFase2.ts (se reemplazan las de abajo al final del objeto)
      crearSolicitud: pendienteFase(2), guardarBorradorSolicitud: pendienteFase(2), enviarSolicitud: pendienteFase(2),
      decidirSolicitud: pendienteFase(2), reenviarSolicitud: pendienteFase(2), crearCompraDesdeSolicitud: pendienteFase(2),
      guardarCompra: pendienteFase(2), enviarCompraAAprobacion: pendienteFase(2), decidirCompra: pendienteFase(2),
      eliminarSolicitud: pendienteFase(2), crearCompraAdministrativa: pendienteFase(2), elegirProveedor: pendienteFase(2), generarOrdenCompra: pendienteFase(2),
      // Fase 3: implementadas en accionesFase3.ts (se reemplazan al final del objeto)
      enviarSolicitudPago: pendienteFase(3),
      crearSolicitudPago: pendienteFase(3), decidirSolicitudPago: pendienteFase(3), registrarPago: pendienteFase(3),
      conciliarAnticipo: pendienteFase(3), registrarRecepcion: pendienteFase(3), cerrarRecepcion: pendienteFase(3),
      crearAjuste: pendienteFase(3), decidirAjuste: pendienteFase(3),
      // Fase 4: implementadas en accionesFase4.ts (se reemplazan al final del objeto)
      actualizarFabricacion: pendienteFase(4), anularFabricacion: pendienteFase(4), crearReserva: pendienteFase(4), liberarReserva: pendienteFase(4),
      liberarReservasVencidas: () => undefined, cancelarTraslado: pendienteFase(4), actualizarDespacho: pendienteFase(4), enviarASalida: pendienteFase(4),
      anularSalida: pendienteFase(4), marcarDescargado: pendienteFase(4),
      crearFabricacion: pendienteFase(4), confirmarFabricacion: pendienteFase(4), crearTraslado: pendienteFase(4),
      despacharTraslado: pendienteFase(4), recibirTraslado: pendienteFase(4), crearDespacho: pendienteFase(4), confirmarSalida: pendienteFase(4),
      // Fase 5: implementadas en accionesFase5.ts (se reemplazan al final del objeto)
      registrarFactura: pendienteFase(6), resolverDiferenciaFactura: pendienteFase(6), anularFactura: pendienteFase(6), importarExtracto: pendienteFase(6),
      conciliarMovimiento: pendienteFase(6), conciliarAutomatico: pendienteFase(6), marcarGastoBancario: pendienteFase(6), deshacerConciliacion: pendienteFase(6),
      agregarCategoria: pendienteFase(5),
      consultarDisponibilidad: pendienteFase(5), simularEventoTienda: pendienteFase(5), reintentarEvento: pendienteFase(5),
      guardarUsuario: pendienteFase(5), guardarBodega: pendienteFase(5), guardarArticulo: pendienteFase(5),
      guardarUnidad: pendienteFase(5), guardarProveedor: pendienteFase(5), guardarParametros: pendienteFase(5),

      ...crearAccionesFase2(set, get),
      ...crearAccionesFase3(set, get),
      ...crearAccionesFase4(set, get),
      ...crearAccionesFase5(set, get),
      ...crearAccionesTesoreria(set, get),
    }),
    {
      name: CLAVE_STORAGE,
      // v4: el modelo cambio en las Fases 2 a 5 (p. ej. reservas, auditoria); una persistencia anterior se descarta y se usa la semilla nueva
      version: 11,
      migrate: () => estadoInicial() as unknown as Store,
      // No se persisten funciones ni los toasts
      partialize: (s) => {
        const copia: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(s)) if (typeof v !== 'function' && k !== 'toasts') copia[k] = v;
        return copia as Partial<Store>;
      },
    },
  ),
);

// Fase 5: el catalogo de unidades del store alimenta las conversiones (se actualiza tambien al rehidratar la persistencia)
let ultimasUnidades: unknown = null;
registrarUnidades(useStore.getState().unidades);
useStore.subscribe((s) => { if (s.unidades !== ultimasUnidades) { ultimasUnidades = s.unidades; registrarUnidades(s.unidades); } });

// Tipos auxiliares exportados para fases siguientes
export type { LineaCompra };

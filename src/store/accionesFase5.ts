// Acciones de la Fase 5: eventos de la tienda en linea (simulados) y administracion.
// Todo lo externo es SIMULADO: no hay conexion real con ningun sistema.
import type { StoreApi } from 'zustand';
import { idDesdeNumero } from '../lib/numeracion';
import { puede } from '../lib/permisos';
import type { Articulo, Bodega, Despacho, EventoIntegracion, ExistenciaItem, Movimiento, Parametros, Proveedor, ResultadoAccion, Usuario } from '../types';
import { nivelDe } from './accionesFase3';
import { disponibleTerminado } from './selectoresFase4';
import type { Acciones, Store } from './useStore';

type Set = StoreApi<Store>['setState'];
type Get = StoreApi<Store>['getState'];
const falla = (error: string): ResultadoAccion => ({ ok: false, error });
const ahora = () => new Date().toISOString();
const redondear = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

export function crearAccionesFase5(set: Set, get: Get): Partial<Acciones> {
  const usuario = (): Usuario | null => get().usuarios.find((u) => u.id === get().usuarioActualId) ?? null;
  const aviso = (m: string, t: 'ok' | 'error' | 'info' = 'ok') => get().mostrarToast(m, t);
  const sigNum = (lista: { numero?: string }[], pref: string) => {
    let max = 0; for (const x of lista) { const m = (x.numero ?? '').match(new RegExp(`^${pref}-(\\d+)$`)); if (m) max = Math.max(max, parseInt(m[1], 10)); }
    return `${pref}-${String(max + 1).padStart(4, '0')}`;
  };
  const auditar = (u: Usuario, entidad: string, accion: string, detalle: string) =>
    set((s) => ({ auditoria: [{ id: `aud-${String(s.auditoria.length + 1).padStart(4, '0')}-${Date.now() % 100000}`, fecha: ahora(), usuarioId: u.id, entidad, accion, detalle }, ...s.auditoria] }));
  const nuevoEvento = (c: Omit<EventoIntegracion, 'id' | 'numero' | 'fecha'>): EventoIntegracion => {
    const numero = sigNum(get().eventos, 'EVT');
    return { ...c, id: idDesdeNumero(numero), numero, fecha: ahora() };
  };

  /** Aplica un pedido de la tienda: crea el despacho confirmado y descuenta una sola vez. Devuelve error si no alcanza. */
  const aplicarPedido = (u: Usuario, idExterno: string, sku: string, cantidad: number, cliente: string, ciudad: string): { ok: boolean; error?: string; despachoId?: string } => {
    const st = get();
    const art = st.articulos.find((a) => a.sku === sku && a.tipo === 'producto_terminado' && a.activo);
    if (!art) return { ok: false, error: `SKU no reconocido en el pedido (${sku}). No se descontó stock.` };
    if (!Number.isInteger(cantidad) || cantidad <= 0) return { ok: false, error: 'Cantidad inválida: debe ser un entero mayor que cero.' };
    // La salida se toma de una sola bodega: la que tenga mayor disponible y cubra la cantidad
    const cand = st.bodegas.filter((b) => b.activa).map((b) => ({ b, d: disponibleTerminado(st, sku, b.id).disponible })).sort((x, y) => y.d - x.d)[0];
    const total = disponibleTerminado(st, sku).disponible;
    if (!cand || cand.d < cantidad) return { ok: false, error: `Sin stock suficiente: se piden ${cantidad} y hay ${total} disponibles${total > 0 ? ' repartidos en varias bodegas' : ''}.` };
    const bodegaId = cand.b.id;
    const numero = sigNum(st.despachos, 'DSP');
    const despId = idDesdeNumero(numero);
    const antes = st.existencias;
    const i = antes.findIndex((x) => x.sku === sku && x.bodegaId === bodegaId);
    const despues: ExistenciaItem[] = antes.map((x, j) => (j === i ? { ...x, fisica: redondear(x.fisica - cantidad) } : x));
    let maxMov = 0; for (const m of st.movimientos) { const k = parseInt(m.id.replace(/\D/g, ''), 10); if (!isNaN(k)) maxMov = Math.max(maxMov, k); }
    const mov: Movimiento = { id: `mov-${String(maxMov + 1).padStart(4, '0')}`, fecha: ahora(), sku, tipoArticulo: 'producto_terminado', tipo: 'salida_despacho', bodegaOrigenId: bodegaId, cantidadBase: cantidad, documentoTipo: 'Despacho', documentoId: despId, usuarioId: u.id, observacion: `${numero} - tienda en línea (${idExterno})` };
    const desp: Despacho = {
      id: despId, numero, creadoPor: u.id, creadoEn: ahora(), actualizadoEn: ahora(), canal: 'tienda_en_linea', bodegaId, cliente, destino: ciudad, documentoReferencia: idExterno,
      lineas: [{ sku, cantidad }], estado: 'confirmado', estadoAdministrativo: 'sin_descargar',
      historial: [{ fecha: ahora(), usuarioId: u.id, accion: `Pedido de tienda ${idExterno} recibido (simulado): salida aplicada`, estadoNuevo: 'confirmado' }],
    };
    set((s) => ({ despachos: [desp, ...s.despachos], movimientos: [...s.movimientos, mov], existencias: despues }));
    // Alertas de stock: solo cuando cambia el nivel (agotado en la tienda notifica a Ventas y Produccion, CA-11)
    const n0 = nivelDe(antes, art), n1 = nivelDe(despues, art);
    if (n1 !== n0 && n1 === 'agotado') {
      get().emitirNotificacion('producto_agotado_tienda', { numero: sku, docId: sku, creadoPor: u.id, detalle: `${sku} - ${art.nombre}: agotado. La tienda en línea (${get().parametros.proveedorTienda}) lo refleja como agotado.` });
      get().emitirNotificacion('producto_agotado', { numero: sku, docId: sku, ruta: `/producto-terminado?sku=${sku}`, detalle: `${sku} - ${art.nombre}: agotado tras el pedido ${idExterno}.` });
    } else if (n1 !== n0 && n1 === 'bajo') {
      get().emitirNotificacion('stock_bajo', { numero: sku, docId: sku, ruta: `/producto-terminado?sku=${sku}`, detalle: `${sku} - ${art.nombre}: quedó por debajo del mínimo (${art.stockMinimo}).` });
    }
    return { ok: true, despachoId: despId };
  };

  return {
    consultarDisponibilidad: (sku, cantidad) => {
      const u = usuario();
      if (!u) return falla('Debes iniciar sesión');
      if (!puede(u, 'disponibilidad.consultar')) return falla('Tu rol no puede consultar disponibilidad');
      const a = get().articulos.find((x) => x.sku === sku && x.tipo === 'producto_terminado');
      if (!a) return falla('Elige un producto terminado');
      if (!Number.isInteger(cantidad) || cantidad <= 0) return falla('La cantidad solicitada debe ser un entero mayor que cero');
      return { ok: true }; // consulta interna: no genera evento de integracion
    },

    simularEventoTienda: (idExterno, sku, cantidad, extra) => {
      const u = usuario();
      if (!u) return falla('Debes iniciar sesión');
      if (!puede(u, 'integracion.simular')) return falla('Solo Ventas o Administración simulan eventos de la tienda');
      const id = idExterno.trim();
      if (!id) return falla('El ID externo es obligatorio');
      const prov = get().parametros.proveedorTienda;
      // Idempotencia (RN-11): el mismo ID ya aplicado no vuelve a descontar
      const previo = get().eventos.find((e) => e.canal === 'tienda_en_linea' && e.idExterno === id && (e.estado === 'aplicado' || e.estado === 'reintentado'));
      if (previo) {
        const ev = nuevoEvento({ canal: 'tienda_en_linea', idExterno: id, tipo: 'pedido_creado', estado: 'duplicado', intentos: 1, sku, cantidad, detalle: `Pedido ${id} ya fue aplicado (${previo.numero ?? previo.id}). No se descontó stock.` });
        set((s) => ({ eventos: [ev, ...s.eventos] }));
        get().emitirNotificacion('evento_tienda_duplicado', { numero: ev.numero!, docId: ev.id });
        aviso(`Evento duplicado: ${id} ya estaba aplicado`, 'info');
        return { ok: true, id: ev.id };
      }
      const cliente = extra?.cliente?.trim() || 'Cliente tienda en línea', ciudad = extra?.ciudad?.trim() || 'Quito';
      const r = aplicarPedido(u, id, sku, cantidad, cliente, ciudad);
      if (!r.ok) {
        const ev = nuevoEvento({ canal: 'tienda_en_linea', idExterno: id, tipo: 'pedido_creado', estado: 'error', intentos: 1, sku, cantidad, cliente, ciudad, detalle: r.error! });
        set((s) => ({ eventos: [ev, ...s.eventos] }));
        get().emitirNotificacion('evento_tienda_error', { numero: ev.numero!, docId: ev.id, detalle: `Pedido ${id} (${prov}): ${r.error}` });
        aviso(`Evento con error: ${r.error}`, 'error');
        return { ok: true, id: ev.id };
      }
      const ev = nuevoEvento({ canal: 'tienda_en_linea', idExterno: id, tipo: 'pedido_creado', estado: 'aplicado', intentos: 1, sku, cantidad, cliente, ciudad, despachoId: r.despachoId,
        detalle: `Pedido ${id}: ${cantidad} x ${sku} descontado (${r.despachoId!.toUpperCase()}).` });
      set((s) => ({ eventos: [ev, ...s.eventos] }));
      get().emitirNotificacion('evento_tienda_aplicado', { numero: ev.numero!, docId: ev.id, detalle: `Pedido ${id} de ${prov}: ${cantidad} x ${sku} descontado. Despacho ${r.despachoId!.toUpperCase()}.` });
      aviso(`Evento ${ev.numero} aplicado: stock descontado una vez`);
      return { ok: true, id: ev.id };
    },

    reintentarEvento: (id) => {
      const u = usuario(); const ev = get().eventos.find((e) => e.id === id);
      if (!u || !ev) return falla('Evento no encontrado');
      if (!puede(u, 'integracion.simular')) return falla('Solo Ventas o Administración reintentan eventos');
      if (ev.estado !== 'error') return falla('Solo se reintentan los eventos con error'); // RN-18
      if (ev.canal !== 'tienda_en_linea') return falla('Solo se reintentan eventos de la tienda en línea');
      const yaAplicado = get().eventos.some((e) => e.id !== ev.id && e.canal === 'tienda_en_linea' && e.idExterno === ev.idExterno && (e.estado === 'aplicado' || e.estado === 'reintentado'));
      if (yaAplicado) return falla('Ese pedido ya fue aplicado: no se descuenta dos veces');
      const r = aplicarPedido(u, ev.idExterno, ev.sku ?? '', ev.cantidad ?? 0, ev.cliente ?? 'Cliente tienda en línea', ev.ciudad ?? 'Quito');
      if (!r.ok) {
        set((s) => ({ eventos: s.eventos.map((e) => (e.id === id ? { ...e, intentos: e.intentos + 1, fecha: ahora(), detalle: `${r.error} (reintento ${e.intentos + 1})` } : e)) }));
        aviso(`El reintento falló: ${r.error}`, 'error');
        return { ok: false, error: r.error, id };
      }
      set((s) => ({ eventos: s.eventos.map((e) => (e.id === id ? { ...e, estado: 'reintentado' as const, intentos: e.intentos + 1, fecha: ahora(), despachoId: r.despachoId, detalle: `Reintento exitoso: ${e.cantidad} x ${e.sku} descontado (${r.despachoId!.toUpperCase()}).` } : e)) }));
      get().emitirNotificacion('evento_tienda_aplicado', { numero: ev.numero ?? ev.id, docId: ev.id, detalle: `Pedido ${ev.idExterno} aplicado en el reintento.` });
      aviso(`Evento ${ev.numero ?? ev.id} reintentado y aplicado`);
      return { ok: true, id };
    },

    // ---------- Administracion (RF-01 a RF-05) ----------
    guardarUsuario: (x) => {
      const u = usuario(); if (!u) return falla('Debes iniciar sesión');
      if (!puede(u, 'admin.gestionar')) return falla('Solo el Administrador gestiona usuarios');
      if (!x.nombre.trim()) return falla('El nombre es obligatorio');
      if (!/^\S+@\S+\.\S+$/.test(x.correo.trim())) return falla('Ingresa un correo válido');
      if (x.roles.length === 0) return falla('Asigna al menos un rol');
      const st = get(); const existe = st.usuarios.find((y) => y.id === x.id);
      if (st.usuarios.some((y) => y.id !== x.id && y.correo.toLowerCase() === x.correo.trim().toLowerCase())) return falla('Ya existe un usuario con ese correo');
      const quedaAdmin = st.usuarios.some((y) => y.id !== x.id && y.activo && y.roles.includes('admin')) || (x.activo && x.roles.includes('admin'));
      if (!quedaAdmin) return falla('Debe quedar al menos un Administrador activo');
      if (existe && x.id === u.id && !x.activo) return falla('No puedes desactivar tu propio acceso');
      const nuevo: Usuario = { ...x, nombre: x.nombre.trim(), correo: x.correo.trim() };
      const id = existe ? x.id : `u-${nuevo.nombre.split(' ')[0].toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}-${st.usuarios.length + 1}`;
      set((s) => ({ usuarios: existe ? s.usuarios.map((y) => (y.id === x.id ? { ...nuevo, id } : y)) : [...s.usuarios, { ...nuevo, id }] }));
      auditar(u, 'Usuario', existe ? 'Edición' : 'Alta', `${nuevo.nombre}: roles ${nuevo.roles.join(', ')}; ${nuevo.activo ? 'activo' : 'inactivo'}`);
      aviso(`Usuario ${nuevo.nombre} guardado`);
      return { ok: true, id };
    },

    guardarBodega: (b) => {
      const u = usuario(); if (!u) return falla('Debes iniciar sesión');
      if (!puede(u, 'admin.gestionar')) return falla('Solo el Administrador gestiona bodegas');
      if (!b.nombre.trim()) return falla('El nombre es obligatorio');
      const st = get(); const existe = st.bodegas.find((y) => y.id === b.id);
      if (existe && existe.activa && !b.activa && st.existencias.some((x) => x.bodegaId === b.id && (x.fisica > 0 || x.enTransito > 0 || x.comprometida > 0))) return falla('No se puede desactivar una bodega con existencias');
      if (existe && existe.activa && !b.activa && st.bodegas.filter((y) => y.activa).length <= 1) return falla('Debe quedar al menos una bodega activa');
      const n = existe ? 0 : st.bodegas.length + 1;
      const nueva: Bodega = existe ? { ...b, nombre: b.nombre.trim() } : { ...b, id: `b${n}`, codigo: `B${n}`, nombre: b.nombre.trim() };
      set((s) => ({ bodegas: existe ? s.bodegas.map((y) => (y.id === b.id ? nueva : y)) : [...s.bodegas, nueva] }));
      auditar(u, 'Bodega', existe ? 'Edición' : 'Alta', `${nueva.codigo} ${nueva.nombre}; ${nueva.activa ? 'activa' : 'inactiva'}`);
      aviso(`Bodega ${nueva.codigo} guardada`);
      return { ok: true, id: nueva.id };
    },

    guardarArticulo: (a) => {
      const u = usuario(); if (!u) return falla('Debes iniciar sesión');
      if (!puede(u, 'admin.gestionar')) return falla('Solo el Administrador gestiona el catálogo');
      const st = get(); const sku = a.sku.trim().toUpperCase(); const existe = st.articulos.some((y) => y.sku === sku);
      if (!sku) return falla('El SKU es obligatorio');
      if (a.nuevo && existe) return falla(`El SKU ${sku} ya existe`);
      if (!a.nombre.trim()) return falla('El nombre es obligatorio');
      if (!a.categoria.trim()) return falla('La categoría es obligatoria');
      if (!st.unidades.some((x) => x.id === a.unidadBaseId)) return falla('Elige una unidad base');
      if (!(a.stockMinimo >= 0)) return falla('El stock mínimo no puede ser negativo');
      if (a.presentaciones.some((p) => !(p.factorABase > 0) || !st.unidades.some((x) => x.id === p.unidadId))) return falla('Cada presentación necesita unidad y factor mayor que cero');
      if (a.tipo === 'producto_terminado') {
        if (a.plazoFabricacionDias !== undefined && !(a.plazoFabricacionDias >= 0)) return falla('El plazo de fabricación no puede ser negativo');
        if ((a.receta ?? []).some((r) => !(r.cantidadBase > 0) || !st.articulos.some((m) => m.sku === r.sku && m.tipo === 'materia_prima'))) return falla('La receta solo admite materias primas con cantidad mayor que cero');
      }
      const { nuevo: _n, ...limpio } = a as Articulo & { nuevo?: boolean }; void _n;
      const final: Articulo = { ...limpio, sku, nombre: a.nombre.trim() };
      set((s) => ({ articulos: existe ? s.articulos.map((y) => (y.sku === sku ? final : y)) : [...s.articulos, final],
        categorias: s.categorias.includes(final.categoria) ? s.categorias : [...s.categorias, final.categoria] }));
      auditar(u, 'Artículo', existe ? 'Edición' : 'Alta', `${sku} ${final.nombre} (${final.tipo === 'materia_prima' ? 'materia prima' : 'producto terminado'})`);
      aviso(`Artículo ${sku} guardado`);
      return { ok: true, id: sku };
    },

    guardarUnidad: (x) => {
      const u = usuario(); if (!u) return falla('Debes iniciar sesión');
      if (!puede(u, 'admin.gestionar')) return falla('Solo el Administrador gestiona unidades');
      const id = x.id.trim(); if (!id) return falla('El identificador es obligatorio');
      if (!x.nombre.trim() || !x.simbolo.trim()) return falla('Nombre y símbolo son obligatorios');
      if (!(x.factorABase > 0)) return falla('El factor a la unidad base debe ser mayor que cero');
      if (!Number.isInteger(x.decimales) || x.decimales < 0 || x.decimales > 6) return falla('Los decimales permitidos van de 0 a 6');
      const existe = get().unidades.some((y) => y.id === id);
      set((s) => ({ unidades: existe ? s.unidades.map((y) => (y.id === id ? { ...x, id } : y)) : [...s.unidades, { ...x, id }] }));
      auditar(u, 'Unidad', existe ? 'Edición' : 'Alta', `${id}: factor ${x.factorABase}, ${x.decimales} decimales`);
      aviso(`Unidad ${id} guardada`);
      return { ok: true, id };
    },

    guardarProveedor: (p) => {
      const u = usuario(); if (!u) return falla('Debes iniciar sesión');
      if (!puede(u, 'admin.gestionar')) return falla('Solo el Administrador gestiona proveedores');
      if (!p.nombre.trim()) return falla('La razón social es obligatoria');
      if (!p.identificacionFiscal.trim()) return falla('La identificación fiscal es obligatoria');
      if (!(p.diasEntrega >= 0)) return falla('Los días de entrega no pueden ser negativos');
      const st = get(); const existe = st.proveedores.some((y) => y.id === p.id);
      const id = existe ? p.id : `p-${String(st.proveedores.length + 1).padStart(2, '0')}-${Date.now() % 1000}`;
      set((s) => ({ proveedores: existe ? s.proveedores.map((y) => (y.id === p.id ? { ...p, nombre: p.nombre.trim() } : y)) : [...s.proveedores, { ...p, id, nombre: p.nombre.trim() } as Proveedor] }));
      auditar(u, 'Proveedor', existe ? 'Edición' : 'Alta', `${p.nombre.trim()}; ${p.activo ? 'activo' : 'inactivo'}`);
      aviso(`Proveedor ${p.nombre.trim()} guardado`);
      return { ok: true, id };
    },

    guardarParametros: (p: Partial<Parametros>) => {
      const u = usuario(); if (!u) return falla('Debes iniciar sesión');
      if (!puede(u, 'admin.gestionar')) return falla('Solo el Administrador cambia parámetros');
      const num = (k: keyof Parametros, min: number, max: number, nombre: string): string | null => { const v = p[k]; if (v === undefined) return null; return typeof v === 'number' && isFinite(v) && v >= min && v <= max ? null : `${nombre}: valor entre ${min} y ${max}`; };
      const err = num('umbralCompra', 0, 10000000, 'Umbral de compra') ?? num('toleranciaConsumo', 0, 100, 'Tolerancia de consumo') ?? num('diasRecepcionVencida', 0, 365, 'Días de recepción vencida')
        ?? num('impuestoInformativoPct', 0, 100, 'Impuesto informativo') ?? num('umbralStockPct', 0, 500, 'Umbral de alerta de stock');
      if (err) return falla(err);
      if (p.proveedorTienda !== undefined && !p.proveedorTienda.trim()) return falla('El proveedor de la tienda no puede quedar vacío');
      const antes = get().parametros; const cambios = (Object.keys(p) as (keyof Parametros)[]).filter((k) => p[k] !== antes[k]);
      if (cambios.length === 0) return falla('No hay cambios que guardar');
      set((s) => ({ parametros: { ...s.parametros, ...p } }));
      auditar(u, 'Parámetros', 'Edición', cambios.map((k) => `${k}: ${antes[k] ?? '-'} -> ${p[k]}`).join('; '));
      aviso('Parámetros actualizados');
      return { ok: true };
    },

    agregarCategoria: (nombre) => {
      const u = usuario(); if (!u) return falla('Debes iniciar sesión');
      if (!puede(u, 'admin.gestionar')) return falla('Solo el Administrador gestiona categorías');
      const n = nombre.trim(); if (!n) return falla('Escribe el nombre de la categoría');
      if (get().categorias.some((c) => c.toLowerCase() === n.toLowerCase())) return falla('Esa categoría ya existe');
      set((s) => ({ categorias: [...s.categorias, n] }));
      auditar(u, 'Categoría', 'Alta', n);
      aviso(`Categoría ${n} agregada`);
      return { ok: true };
    },
  };
}

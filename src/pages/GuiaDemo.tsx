import { useState } from 'react';
import { Bell, Map as IconoMapa, PlayCircle, Wrench } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AdjuntoSimulado from '../components/AdjuntoSimulado';
import BotonConPermiso from '../components/BotonConPermiso';
import EstadoBadge from '../components/EstadoBadge';
import FormMultiItem, { type LineaForm } from '../components/FormMultiItem';
import LineaTiempoEstados from '../components/LineaTiempoEstados';
import ModalConfirmar from '../components/ModalConfirmar';
import ModalObservacion from '../components/ModalObservacion';
import PageHeader from '../components/PageHeader';
import SemaforoStock from '../components/SemaforoStock';
import { useStore } from '../store/useStore';

interface Paso { texto: string; dice: string; usuarioId: string; ruta: string; pantalla: string }
interface Recorrido { id: string; titulo: string; objetivo: string; pasos: Paso[] }

const RECORRIDOS: Recorrido[] = [
  { id: 'D-01', titulo: 'Solicitud y aprobación', objetivo: 'Planta crea una solicitud, el director la devuelve con observación, planta corrige y el director aprueba; Compras recibe la notificación.',
    pasos: [
      { texto: 'Carlos abre SOL-0001 (devuelta por falta de justificación), lee la observación, agrega la justificación y la reenvía. También puede crear una solicitud nueva.', dice: 'Planta no compra directamente: pide materiales y deja constancia del motivo. Si falta información, el director la devuelve con observación y nadie pierde el hilo.', usuarioId: 'u-carlos', ruta: '/solicitudes/sol-0001', pantalla: 'Detalle de solicitud' },
      { texto: 'Marcela revisa la solicitud reenviada y la aprueba.', dice: 'El director decide con la solicitud completa y su historial. Quien crea un documento no lo aprueba.', usuarioId: 'u-marcela', ruta: '/director', pantalla: 'Bandeja del director' },
      { texto: 'Andrés recibe la notificación y ve la solicitud en "Aprobadas sin compra".', dice: 'Compras se entera sin que nadie le escriba: la notificación llega sola y lleva al documento.', usuarioId: 'u-andres', ruta: '/compras', pantalla: 'Gestión de compras' },
    ] },
  { id: 'D-02', titulo: 'Compra con pago posterior', objetivo: 'Compras prepara la orden, el aprobador autoriza, Almacén recibe parcialmente, el inventario sube por lo realmente recibido y Tesorería paga el saldo.',
    pasos: [
      { texto: 'Andrés prepara la orden OC-0001 (25 saco50 de cemento).', dice: 'La orden nace de una solicitud aprobada, con cotizaciones comparadas y proveedor elegido.', usuarioId: 'u-andres', ruta: '/compras', pantalla: 'Gestión de compras' },
      { texto: 'La orden se autoriza (monto dentro del umbral: Marcela; sobre el umbral: Julián).', dice: 'El umbral es un parámetro: bajo el límite autoriza el director; sobre el límite, el aprobador de compra.', usuarioId: 'u-julian', ruta: '/aprobacion-compras', pantalla: 'Aprobación de compras' },
      { texto: 'Sergio recibe 18 de 25 sacos: MP-01 sube 900 kg, no 1.250 kg.', dice: 'El inventario sube solo por lo que realmente llegó. Los 7 sacos faltantes quedan pendientes.', usuarioId: 'u-sergio', ruta: '/recepcion/oc-0001', pantalla: 'Recepción de almacén' },
      { texto: 'Paola prepara el pago por lo recibido.', dice: 'Tesorería paga lo recibido, no lo ordenado: el sistema sugiere el importe.', usuarioId: 'u-paola', ruta: '/tesoreria', pantalla: 'Tesorería y pagos' },
      { texto: 'Paola aprueba el pago.', dice: 'En Tesorería la misma persona prepara, aprueba y registra el pago; el sistema deja cada paso en el historial.', usuarioId: 'u-paola', ruta: '/tesoreria', pantalla: 'Tesorería y pagos' },
      { texto: 'Paola registra el pago y adjunta el comprobante.', dice: 'El pago queda con comprobante y trazable hasta la recepción.', usuarioId: 'u-paola', ruta: '/tesoreria', pantalla: 'Tesorería y pagos' },
    ] },
  { id: 'D-03', titulo: 'Compra con anticipo', objetivo: 'Orden aprobada, solicitud de anticipo, aprobación del pago, comprobante, llegada de mercancía y conciliación del anticipo.',
    pasos: [
      { texto: 'Paola revisa el anticipo PAG-0002 de OC-0002, ya aprobado, y registra el pago con comprobante.', dice: 'Con anticipo, la mercancía no se puede recibir hasta que el anticipo esté pagado.', usuarioId: 'u-paola', ruta: '/tesoreria/pag-0002', pantalla: 'Tesorería y pagos' },
      { texto: 'Sergio recibe la mercancía de OC-0002 (solo posible con el anticipo pagado).', dice: 'Antes del pago, el botón de recibir aparece bloqueado y explica por qué.', usuarioId: 'u-sergio', ruta: '/recepcion/oc-0002', pantalla: 'Recepción de almacén' },
      { texto: 'Paola concilia el anticipo y ve el saldo a favor o por pagar.', dice: 'La conciliación compara lo anticipado con lo recibido y muestra el saldo.', usuarioId: 'u-paola', ruta: '/tesoreria', pantalla: 'Tesorería y pagos' },
    ] },
  { id: 'D-04', titulo: 'Transformación en planta', objetivo: 'Ver stock de insumos, registrar la fabricación, consumir materiales e ingresar producto terminado.',
    pasos: [
      { texto: 'Daniela revisa el stock de insumos.', dice: 'Antes de fabricar, Producción ve qué insumos hay en la bodega.', usuarioId: 'u-daniela', ruta: '/materias-primas', pantalla: 'Materias primas' },
      { texto: 'Daniela abre el lote FT-001 (2 bancas BC-01) y lo confirma: MP-01 baja 400 kg.', dice: 'La receta se autocompleta. Si falta un insumo, se bloquea; si el consumo se desvía más del 5 %, decide el director.', usuarioId: 'u-daniela', ruta: '/fabricacion/fab-0001', pantalla: 'Fabricación' },
      { texto: 'BC-01 sube 2 unidades; se verifican los movimientos.', dice: 'Los insumos salen y el producto entra en un solo paso, con movimientos trazables.', usuarioId: 'u-daniela', ruta: '/producto-terminado?sku=BC-01', pantalla: 'Producto terminado' },
    ] },
  { id: 'D-05', titulo: 'Traslado y salida', objetivo: 'Mover producto terminado de Bodega 1 a Bodega 2, confirmar recepción, registrar la venta y ver el descuento de stock.',
    pasos: [
      { texto: 'Sergio traslada 3 bancas BC-01 de B1 a B2 y confirma la recepción.', dice: 'Lo que está en tránsito no es disponible ni en origen ni en destino; el total no se pierde ni se duplica.', usuarioId: 'u-sergio', ruta: '/traslados', pantalla: 'Traslados' },
      { texto: 'Camila registra la venta de 2 bancas desde B3 (ref. COT-2026-018).', dice: 'Ventas pide la salida; no puede superar el disponible y exige un documento de referencia.', usuarioId: 'u-camila', ruta: '/ventas', pantalla: 'Ventas y despachos' },
      { texto: 'Sergio confirma la salida física; el stock se descuenta una sola vez.', dice: 'Almacén confirma la salida física. Confirmar de nuevo no descuenta dos veces.', usuarioId: 'u-sergio', ruta: '/ventas', pantalla: 'Ventas y despachos' },
    ] },
  { id: 'D-06', titulo: 'Consulta de disponibilidad', objetivo: 'El vendedor consulta 10 unidades de un producto y el sistema informa existencias, disponible y alternativa de fabricación.',
    pasos: [
      { texto: 'Camila consulta 10 bancas BC-01 y revisa el resultado.', dice: 'Muestra existencia física, comprometida y disponible por bodega, la recomendación de entrega y, si falta, el plazo de fabricación. Cambia solo si cambia el inventario.', usuarioId: 'u-camila', ruta: '/disponibilidad?sku=BC-01&cantidad=10', pantalla: 'Consulta de disponibilidad' },
    ] },
  { id: 'D-07', titulo: 'Venta de comercio electrónico', objetivo: 'La tienda en línea simulada registra un pedido, el sistema aplica la salida una sola vez, marca agotado y muestra el estado de sincronización.',
    pasos: [
      { texto: 'Camila simula un pedido, lo reenvía (duplicado) y revisa el registro de eventos.', dice: 'El pedido descuenta stock una vez. Si la tienda lo reenvía con el mismo ID, queda como duplicado y no descuenta.', usuarioId: 'u-camila', ruta: '/conexiones', pantalla: 'Conexiones tienda' },
      { texto: 'Camila pide más unidades de las disponibles para ver el error y el reintento.', dice: 'Sin stock suficiente, el evento queda con error y se puede reintentar cuando haya existencias.', usuarioId: 'u-camila', ruta: '/conexiones', pantalla: 'Conexiones tienda' },
      { texto: 'Sergio revisa el producto agotado en el inventario de producto terminado.', dice: 'El agotado se refleja en inventario, en la tienda simulada y en las alertas.', usuarioId: 'u-sergio', ruta: '/producto-terminado', pantalla: 'Producto terminado' },
    ] },
  { id: 'D-08', titulo: 'Facturas y conciliación bancaria', objetivo: 'Tesorería registra la factura del proveedor, la coteja con lo recibido, la paga desde una cuenta y concilia el extracto del banco.',
    pasos: [
      { texto: 'Paola abre Facturas, elige una compra recibida sin factura y registra la factura (número, fechas, total y archivo).', dice: 'El sistema coteja orden, recepción y factura. Si el total facturado difiere de lo recibido, queda con diferencia y se puede aceptar, reclamar o anular.', usuarioId: 'u-paola', ruta: '/tesoreria?vista=facturas', pantalla: 'Tesorería - Facturas' },
      { texto: 'Paola revisa Cuentas por pagar y prepara el pago desde una obligación abierta.', dice: 'Muestra antigüedad de saldos, vencimientos de los próximos 30 días y saldos por proveedor. El pago se registra con su cuenta de origen.', usuarioId: 'u-paola', ruta: '/tesoreria?vista=cxp', pantalla: 'Tesorería - Cuentas por pagar' },
      { texto: 'Paola importa el extracto (simulado) y concilia cada movimiento con su pago, o lo registra como gasto bancario.', dice: 'La diferencia entre banco y libros se explica con pagos en tránsito y movimientos sin identificar. Conciliar puede deshacerse.', usuarioId: 'u-paola', ruta: '/tesoreria?vista=banco', pantalla: 'Tesorería - Conciliación bancaria' },
      { texto: 'Paola consulta el estado de cuenta de un proveedor.', dice: 'Libro cronológico de facturas y pagos con saldo acumulado.', usuarioId: 'u-paola', ruta: '/tesoreria?vista=proveedores', pantalla: 'Tesorería - Estado de cuenta' },
    ] },
];

// Guia de demostracion: recorridos D-01 a D-08 + utilidades de desarrollo
export default function GuiaDemo() {
  const navigate = useNavigate();
  const usuarios = useStore((s) => s.usuarios);
  const cambiarUsuario = useStore((s) => s.cambiarUsuario);
  const reiniciarDemo = useStore((s) => s.reiniciarDemo);
  const generarPrueba = useStore((s) => s.generarNotificacionPrueba);
  const mostrarToast = useStore((s) => s.mostrarToast);
  const solicitud = useStore((s) => s.solicitudes[0]);
  const [reiniciar, setReiniciar] = useState(false);
  const [modalObs, setModalObs] = useState(false);
  const [lineas, setLineas] = useState<LineaForm[]>([{ sku: 'MP-01', cantidad: 20, unidadId: 'saco50' }]);
  const [adjuntos, setAdjuntos] = useState<string[]>(['plano-molde.pdf']);
  const nombre = (id: string) => usuarios.find((u) => u.id === id)?.nombre ?? id;

  const ir = (p: Paso) => { cambiarUsuario(p.usuarioId); mostrarToast(`Ahora eres ${nombre(p.usuarioId)}`, 'info'); navigate(p.ruta); };

  return (
    <div className="space-y-6">
      <PageHeader titulo="Guía de demostración" migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Guía de demostración' }]}
        subtitulo="Siete recorridos con guion sugerido. Cada botón cambia de usuario y abre la pantalla correspondiente. Antes de presentar, pulsa Preparar demostración."
        acciones={<span className="flex flex-wrap gap-2"><Link className="btn-secundario" to="/mapa-sistema"><IconoMapa size={16} /> Mapa del sistema</Link><button className="btn-primario" onClick={() => setReiniciar(true)}><PlayCircle size={16} /> Preparar demostración</button></span>} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {RECORRIDOS.map((r) => (
          <article key={r.id} className="tarjeta p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-marca-vino px-2 py-0.5 font-titulos text-xs font-bold text-white">{r.id}</span>
              <h2 className="text-base font-bold">{r.titulo}</h2>
              <span className="chip ml-auto">Disponible</span>
            </div>
            <p className="mt-2 text-sm text-concreto-600">{r.objetivo}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-concreto-600">Usuarios en orden</p>
            <p className="text-sm">{[...new Set(r.pasos.map((p) => nombre(p.usuarioId)))].join(' - ')}</p>
            <ol className="mt-3 space-y-3">
              {r.pasos.map((p, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marca-amarillo-suave text-xs font-bold text-marca-vino-oscuro">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{p.texto}</p>
                    <p className="mt-0.5 text-xs italic text-concreto-600">Qué decir: {p.dice}</p>
                    <button className="btn-secundario mt-1.5 !py-1 text-xs" onClick={() => ir(p)}>Cambiar a {nombre(p.usuarioId).split(' ')[0]} e ir a {p.pantalla}</button>
                  </div>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>

      <details className="tarjeta border-dashed p-4" aria-label="Utilidades de desarrollo">
        <summary className="flex cursor-pointer items-center gap-2 text-base font-bold"><Wrench size={18} aria-hidden="true" /> Utilidades de desarrollo</summary>
        <p className="mb-3 text-xs text-concreto-600">Para verificar componentes y flujos durante la construcción. No forman parte de la demostración al cliente.</p>
        <div className="mb-5 flex flex-wrap gap-2">
          <button className="btn-fantasma border border-concreto-300" onClick={generarPrueba}><Bell size={15} /> Generar notificación de prueba</button>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-bold">Captura multi-ítem con conversión de unidades</h3>
            <FormMultiItem lineas={lineas} onChange={setLineas} tipo="materia_prima" />
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-bold">Estados y semáforo</h3>
              <div className="flex flex-wrap gap-1.5">
                {['borrador', 'pendiente', 'devuelta', 'aprobada', 'rechazada', 'en_transito', 'recibida_parcial', 'recibida', 'cerrada', 'anulada'].map((e) => <EstadoBadge key={e} estado={e} />)}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5"><SemaforoStock disponible={0} minimo={4} /><SemaforoStock disponible={2} minimo={4} /><SemaforoStock disponible={9} minimo={4} /></div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-bold">Botón con permiso, observación y adjuntos</h3>
              <div className="flex flex-wrap gap-2">
                <BotonConPermiso permitido={false} motivo="No puedes aprobar una solicitud que tú creaste" variante="primario">Aprobar (bloqueado)</BotonConPermiso>
                <button className="btn-secundario" onClick={() => setModalObs(true)}>Devolver con observación</button>
              </div>
              <div className="mt-3"><AdjuntoSimulado adjuntos={adjuntos} onChange={setAdjuntos} /></div>
            </div>
          </div>
        </div>
        <h3 className="mb-2 mt-5 text-sm font-bold">Línea de tiempo de {solicitud.numero}</h3>
        <LineaTiempoEstados historial={solicitud.historial} />
      </details>

      <ModalObservacion abierto={modalObs} titulo="Devolver con observación" textoConfirmar="Devolver" onConfirmar={(o) => mostrarToast(`Observación registrada: ${o}`, 'info')} onCerrar={() => setModalObs(false)} />
      <ModalConfirmar abierto={reiniciar} titulo="Preparar demostración" mensaje="Se borrarán los cambios hechos y se restaurará el estado inicial limpio (la sesión actual se conserva). ¿Deseas continuar?" textoConfirmar="Preparar" peligro onConfirmar={() => { reiniciarDemo(); navigate('/guia-demo'); }} onCerrar={() => setReiniciar(false)} />
    </div>
  );
}

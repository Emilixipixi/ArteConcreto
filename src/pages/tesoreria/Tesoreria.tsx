import { MOSTRAR_CONCILIACION_BANCARIA } from '../../lib/funciones';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CalendarClock, Landmark, Receipt, Scale, Users, Wallet } from 'lucide-react';
import BotonConPermiso from '../../components/BotonConPermiso';
import { type Columna } from '../../components/DataTable';
import DataTable from '../../components/DataTable';
import EstadoBadge from '../../components/EstadoBadge';
import NotaReglasPago from '../../components/NotaReglasPago';
import PageHeader from '../../components/PageHeader';
import { formatearMoneda, tiempoRelativo } from '../../lib/formato';
import { puede } from '../../lib/permisos';
import { useUsuarioActual } from '../../store/selectores';
import { anticiposPorConciliar, comprasPorPreparar } from '../../store/selectoresFase3';
import { kpisTesoreria } from '../../store/selectoresTesoreria';
import TabConciliacionBanco from './TabConciliacionBanco';
import TabCuentasPorPagar from './TabCuentasPorPagar';
import TabEstadoCuenta from './TabEstadoCuenta';
import TabFacturas from './TabFacturas';
import { useStore } from '../../store/useStore';

type Vista = 'pagos' | 'facturas' | 'cxp' | 'banco' | 'proveedores';
type Pestana = 'preparar' | 'pendientes' | 'aprobados' | 'anticipados' | 'cerrados';
interface Fila { clave: string; numero: string; compraId: string; compraNumero: string; proveedor: string; concepto: string; importe: number; estado: string; fecha: string; ruta: string; accion?: 'preparar' | 'aprobar' | 'pagar' }

// P-08 Tesoreria y pagos (RF-18 a RF-23)
export default function Tesoreria() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const u = useUsuarioActual()!;
  const e = useStore();
  const [pestana, setPestana] = useState<Pestana>('preparar');
  const compraParam = params.get('compra');
  const vistaParam = params.get('vista');
  const [vista, setVista] = useState<Vista>((['pagos', 'facturas', 'cxp', ...(MOSTRAR_CONCILIACION_BANCARIA ? ['banco' as const] : []), 'proveedores'] as const).find((v) => v === vistaParam) ?? 'pagos');
  const [facturaDe, setFacturaDe] = useState<string | undefined>(params.get('factura') ?? undefined);
  const kpi = useMemo(() => kpisTesoreria(e), [e]);
  useEffect(() => { if (vista !== 'facturas') setFacturaDe(undefined); }, [vista]);
  // Enlaces de pendientes y notificaciones: /tesoreria?vista=banco o ?vista=facturas&factura=ID
  useEffect(() => { const v = (['pagos', 'facturas', 'cxp', ...(MOSTRAR_CONCILIACION_BANCARIA ? ['banco' as const] : []), 'proveedores'] as const).find((x) => x === vistaParam); if (v) setVista(v); setFacturaDe(params.get('factura') ?? undefined); }, [vistaParam, params]);

  const nombreProv = (cid: string) => e.proveedores.find((p) => p.id === e.compras.find((c) => c.id === cid)?.proveedorId)?.nombre ?? '-';
  const numeroCompra = (cid: string) => e.compras.find((c) => c.id === cid)?.numero ?? cid;

  const grupos = useMemo(() => {
    const deSp = (s: (typeof e.solicitudesPago)[number]): Fila => ({
      clave: s.id, numero: s.numero, compraId: s.compraId, compraNumero: numeroCompra(s.compraId), proveedor: nombreProv(s.compraId),
      concepto: s.tipo === 'anticipo' ? 'Anticipo' : 'Pago de lo recibido', importe: s.importe, estado: s.estado, fecha: s.actualizadoEn, ruta: `/tesoreria/${s.id}`,
    });
    const preparar: Fila[] = [
      ...comprasPorPreparar(e).map((p): Fila => ({
        clave: `c-${p.compra.id}-${p.tipo}`, numero: '-', compraId: p.compra.id, compraNumero: p.compra.numero, proveedor: nombreProv(p.compra.id),
        concepto: p.tipo === 'anticipo' ? 'Anticipo por solicitar' : p.motivo, importe: p.importeSugerido, estado: p.compra.estado, fecha: p.compra.actualizadoEn,
        ruta: `/tesoreria/nueva?compra=${p.compra.id}`, accion: 'preparar',
      })),
      ...e.solicitudesPago.filter((s) => ['preparada', 'devuelta'].includes(s.estado)).map(deSp),
    ];
    const conciliables = new Set(anticiposPorConciliar(e).map((s) => s.id));
    return {
      preparar,
      pendientes: e.solicitudesPago.filter((s) => s.estado === 'pendiente_aprobacion').map((s) => ({ ...deSp(s), accion: 'aprobar' as const })),
      aprobados: e.solicitudesPago.filter((s) => s.estado === 'aprobada').map((s) => ({ ...deSp(s), accion: 'pagar' as const })),
      anticipados: e.solicitudesPago.filter((s) => s.tipo === 'anticipo' && s.estado === 'pagada').map((s) => ({ ...deSp(s), concepto: conciliables.has(s.id) ? 'Anticipo: listo para conciliar' : 'Anticipo pagado: esperando recepción' })),
      cerrados: e.solicitudesPago.filter((s) => s.estado === 'conciliada' || (s.estado === 'pagada' && s.tipo === 'pago_final')).map(deSp),
    } as Record<Pestana, Fila[]>;
  }, [e]); // eslint-disable-line react-hooks/exhaustive-deps

  // Los enlaces de notificaciones y pendientes llegan como /tesoreria?compra=ID
  if (compraParam) return <Navigate to={`/tesoreria/nueva?compra=${compraParam}`} replace />;

  const pestanas: [Pestana, string][] = [['preparar', 'Por preparar'], ['pendientes', 'Pendientes de aprobación'], ['aprobados', 'Aprobados'], ['anticipados', 'Anticipados'], ['cerrados', 'Cerrados']];
  const columnas: Columna<Fila>[] = [
    { clave: 'numero', titulo: 'Solicitud', ordenable: true, render: (f) => <span className="font-semibold text-marca-vino">{f.numero}</span> },
    { clave: 'compraNumero', titulo: 'Orden', ordenable: true, render: (f) => <Link className="underline" to={`/compras/${f.compraId}`} onClick={(ev) => ev.stopPropagation()}>{f.compraNumero}</Link> },
    { clave: 'proveedor', titulo: 'Proveedor', ordenable: true },
    { clave: 'concepto', titulo: 'Concepto' },
    { clave: 'importe', titulo: 'Importe', alinear: 'der', ordenable: true, valor: (f) => f.importe, render: (f) => <span className="tabular-nums">{formatearMoneda(f.importe)}</span> },
    { clave: 'estado', titulo: 'Estado', render: (f) => <EstadoBadge estado={f.estado} /> },
    { clave: 'fecha', titulo: 'Actualizado', render: (f) => <span className="text-xs text-concreto-600">{tiempoRelativo(f.fecha)}</span> },
    {
      clave: 'acciones', titulo: 'Acciones', render: (f) => f.accion === 'preparar'
        ? <BotonConPermiso variante="primario" className="!py-1 text-xs" permitido={puede(u, 'pago.preparar')} motivo="Solo Tesorería prepara solicitudes de pago" onClick={() => navigate(f.ruta)}>Preparar solicitud de pago</BotonConPermiso>
        : f.accion === 'aprobar'
        ? <BotonConPermiso variante="primario" className="!py-1 text-xs" permitido={puede(u, 'pago.aprobar')} motivo="Solo Tesorería aprueba pagos" onClick={() => navigate(`${f.ruta}?accion=aprobar`)}>Aprobar pago</BotonConPermiso>
        : f.accion === 'pagar'
        ? <BotonConPermiso variante="primario" className="!py-1 text-xs" permitido={puede(u, 'pago.registrar')} motivo="Solo Tesorería registra pagos" onClick={() => navigate(`${f.ruta}?accion=pagar`)}>Registrar pago</BotonConPermiso>
        : <Link className="btn-secundario !py-1 text-xs" to={f.ruta}>Abrir</Link>,
    },
  ];

  const vistas: { k: Vista; t: string; icono: typeof Wallet; n?: number }[] = [
    { k: 'pagos', t: 'Pagos y anticipos', icono: Wallet, n: grupos.preparar.length + grupos.pendientes.length + grupos.aprobados.length },
    { k: 'facturas', t: 'Facturas', icono: Receipt, n: kpi.sinFactura + kpi.conDiferencia },
    { k: 'cxp', t: 'Cuentas por pagar', icono: CalendarClock },
    ...(MOSTRAR_CONCILIACION_BANCARIA ? [{ k: 'banco' as Vista, t: 'Conciliación bancaria', icono: Landmark, n: kpi.sinConciliar }] : []),
    { k: 'proveedores', t: 'Estado de cuenta', icono: Users },
  ];
  const tarjetasKpi: { t: string; v: string; tono: string; icono: typeof Wallet; ir: Vista }[] = [
    { t: 'Total por pagar', v: formatearMoneda(kpi.porPagar), tono: 'text-marca-vino', icono: Scale, ir: 'cxp' },
    { t: 'Vencido', v: formatearMoneda(kpi.vencido), tono: kpi.vencido > 0 ? 'text-error' : 'text-marca-vino', icono: AlertTriangle, ir: 'cxp' },
    { t: 'Vence en 7 días', v: formatearMoneda(kpi.porVencer7), tono: kpi.porVencer7 > 0 ? 'text-aviso' : 'text-marca-vino', icono: CalendarClock, ir: 'cxp' },
    { t: 'Facturas por registrar', v: String(kpi.sinFactura), tono: kpi.sinFactura > 0 ? 'text-aviso' : 'text-marca-vino', icono: Receipt, ir: 'facturas' },
    ...(MOSTRAR_CONCILIACION_BANCARIA ? [{ t: 'Movimientos sin conciliar', v: String(kpi.sinConciliar), tono: kpi.sinConciliar > 0 ? 'text-aviso' : 'text-marca-vino', icono: Landmark, ir: 'banco' as Vista }] : []),
  ];

  return (
    <div>
      <PageHeader titulo="Tesorería y pagos" migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Tesorería y pagos' }]} subtitulo="Pagos, facturas de proveedor, cuentas por pagar y conciliación bancaria." />
      <section aria-label="Indicadores de tesorería" className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tarjetasKpi.map((k) => (
          <button key={k.t} onClick={() => setVista(k.ir)} className="tarjeta p-3 text-left transition hover:border-marca-vino">
            <span className="flex items-start justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-concreto-600">{k.t}</span><k.icono size={16} className={k.tono} aria-hidden="true" /></span>
            <span className={`mt-1 block font-titulos text-2xl font-bold tabular-nums ${k.tono}`}>{k.v}</span>
          </button>))}
      </section>
      <div role="tablist" aria-label="Secciones de tesorería" className="mb-4 flex flex-wrap gap-2">
        {vistas.map((v) => (
          <button key={v.k} role="tab" aria-selected={vista === v.k} onClick={() => setVista(v.k)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${vista === v.k ? 'border-marca-vino bg-marca-vino text-white' : 'border-concreto-300 bg-superficie text-texto hover:border-marca-vino'}`}>
            <v.icono size={15} aria-hidden="true" />{v.t}
            {!!v.n && <span className={`rounded-full px-1.5 text-xs ${vista === v.k ? 'bg-white/20' : 'bg-marca-amarillo-suave text-marca-vino-oscuro'}`}>{v.n}</span>}
          </button>))}
      </div>
      {vista === 'facturas' && <TabFacturas compraInicial={facturaDe} key={facturaDe ?? 'f'} />}
      {vista === 'cxp' && <TabCuentasPorPagar onRegistrarFactura={(id) => { setFacturaDe(id); setVista('facturas'); }} />}
      {MOSTRAR_CONCILIACION_BANCARIA && vista === 'banco' && <TabConciliacionBanco />}
      {vista === 'proveedores' && <TabEstadoCuenta />}
      {vista === 'pagos' && (<>
      <NotaReglasPago />
      <div role="tablist" aria-label="Estados de pago" className="mb-4 flex flex-wrap gap-1 border-b border-concreto-300">
        {pestanas.map(([k, t]) => (
          <button key={k} role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${pestana === k ? 'border-marca-vino text-marca-vino' : 'border-transparent text-concreto-600 hover:text-texto'}`}>
            {t} <span className="ml-1 rounded-full bg-concreto-100 px-1.5 text-xs">{grupos[k].length}</span>
          </button>
        ))}
      </div>
      <DataTable columnas={columnas} filas={grupos[pestana]} clave={(f) => f.clave} vacioTitulo="Nada en esta bandeja" vacioMensaje="Cuando una orden o solicitud llegue a este estado aparecerá aquí." onFila={(f) => navigate(f.ruta)} />
      </>)}
    </div>
  );
}

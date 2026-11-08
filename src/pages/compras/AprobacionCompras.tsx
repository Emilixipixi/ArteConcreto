import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BotonConPermiso from '../../components/BotonConPermiso';
import EstadoBadge from '../../components/EstadoBadge';
import EstadoVacio from '../../components/EstadoVacio';
import EstadosCompra from '../../components/EstadosCompra';
import LineaTiempoEstados from '../../components/LineaTiempoEstados';
import ModalConfirmar from '../../components/ModalConfirmar';
import ModalObservacion from '../../components/ModalObservacion';
import PageHeader from '../../components/PageHeader';
import ResumenCompra from '../../components/ResumenCompra';
import { diasDesde, formatearMoneda } from '../../lib/formato';
import { reglaSegregacion, tieneRol } from '../../lib/permisos';
import { dentroUmbral } from '../../lib/reglas';
import { useUsuarioActual } from '../../store/selectores';
import { useStore } from '../../store/useStore';

type Pestana = 'pendientes' | 'mias' | 'todas';

// P-07 Aprobacion de compras
export default function AprobacionCompras() {
  const { id } = useParams();
  const navigate = useNavigate();
  const u = useUsuarioActual()!;
  const estado = useStore();
  const [pestana, setPestana] = useState<Pestana>('pendientes');
  const [modal, setModal] = useState<null | 'aprobar' | 'devolver' | 'rechazar'>(null);
  const { umbralCompra } = estado.parametros;
  const nombreProv = (pid: string) => estado.proveedores.find((p) => p.id === pid)?.nombre ?? 'Sin elegir';
  const nombre = (uid: string) => estado.usuarios.find((x) => x.id === uid)?.nombre ?? uid;

  // El usuario ve lo que puede aprobar segun el umbral (admin solo consulta)
  const aplicaAlUsuario = (total: number) => (tieneRol(u, 'director') && dentroUmbral(total, estado.parametros)) || (tieneRol(u, 'aprobador_compra') && !dentroUmbral(total, estado.parametros)) || (!tieneRol(u, 'director') && !tieneRol(u, 'aprobador_compra'));
  const lista = useMemo(() => estado.compras.filter((c) => {
    if (pestana === 'pendientes') return c.estado === 'pendiente_aprobacion' && aplicaAlUsuario(c.total);
    if (pestana === 'mias') return c.historial.some((h) => h.usuarioId === u.id && h.estadoAnterior === 'pendiente_aprobacion');
    return c.estado !== 'borrador';
  }).sort((a, b) => a.actualizadoEn.localeCompare(b.actualizadoEn)), [estado.compras, pestana, estado.parametros]); // eslint-disable-line react-hooks/exhaustive-deps

  const sel = estado.compras.find((c) => c.id === id);
  const sol = estado.solicitudes.find((s) => s.id === sel?.solicitudId);
  const regla = sel ? reglaSegregacion(u, sel, 'compra.aprobar', { parametros: estado.parametros }) : { permitido: false, motivo: '' };
  const decidir = (d: 'aprobar' | 'devolver' | 'rechazar', obs?: string) => { if (!sel) return; const r = estado.decidirCompra(sel.id, d, obs); if (!r.ok) estado.mostrarToast(r.error ?? 'No se pudo completar', 'error'); };

  // Por que el proveedor elegido es el mas conveniente (precio y plazo)
  const justificacionProveedor = () => {
    if (!sel || sel.cotizaciones.length === 0) return null;
    const tot = (q: (typeof sel.cotizaciones)[number]) => sel.lineas.reduce((a, l) => a + l.cantidad * (q.precios.find((p) => p.sku === l.sku)?.precioUnitario ?? 0), 0);
    const elegido = sel.cotizaciones.find((q) => q.proveedorId === sel.proveedorId);
    if (!elegido) return null;
    const menor = Math.min(...sel.cotizaciones.map(tot)); const menorDias = Math.min(...sel.cotizaciones.map((q) => q.diasEntrega));
    const partes = [tot(elegido) === menor ? 'tiene el menor precio total' : `su total supera al menor en ${formatearMoneda(tot(elegido) - menor)}`, elegido.diasEntrega === menorDias ? 'ofrece el menor plazo de entrega' : `entrega en ${elegido.diasEntrega} días (el menor es ${menorDias})`];
    return `${nombreProv(elegido.proveedorId)}: ${partes.join(' y ')}.`;
  };
  const previas = sel?.historial.filter((h) => h.observacion) ?? [];

  return (
    <div>
      <PageHeader titulo="Aprobación de compras" migas={[{ texto: 'Inicio', ruta: '/' }, { texto: 'Aprobación de compras' }]}
        subtitulo={`Hasta ${formatearMoneda(umbralCompra)} aprueba Dirección; por encima, Gerencia.`} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(300px,400px)_1fr]">
        <div className={id ? 'hidden lg:block' : ''}>
          <div className="mb-2 flex gap-1 border-b border-concreto-300" role="tablist">
            {([['pendientes', 'Pendientes'], ['mias', 'Decididas por mí'], ['todas', 'Todas']] as const).map(([k, t]) => (
              <button key={k} role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)} className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${pestana === k ? 'border-marca-vino text-marca-vino' : 'border-transparent text-concreto-600'}`}>{t}</button>
            ))}
          </div>
          {lista.length === 0 ? <div className="tarjeta"><EstadoVacio titulo="Sin órdenes" mensaje="No hay órdenes en esta vista." /></div> : (
            <ul className="space-y-2">
              {lista.map((c) => {
                const dentro = dentroUmbral(c.total, estado.parametros);
                return (
                  <li key={c.id}>
                    <Link to={`/aprobacion-compras/${c.id}`} className={`tarjeta block p-3 hover:border-marca-vino ${c.id === id ? 'border-marca-vino ring-1 ring-marca-vino' : ''}`}>
                      <div className="flex items-center justify-between"><span className="font-semibold text-marca-vino">{c.numero}</span><span className="font-semibold tabular-nums">{formatearMoneda(c.total)}</span></div>
                      <p className="mt-1 text-xs text-concreto-600">{nombreProv(c.proveedorId)} - creada por {nombre(c.creadoPor)}</p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
                        <EstadoBadge estado={c.estado} />
                        <span className={`text-xs font-semibold ${dentro ? 'text-ok' : 'text-aviso'}`}>{dentro ? 'Dentro del umbral' : 'Fuera del umbral'} - hace {diasDesde(c.actualizadoEn)} d</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className={id ? '' : 'hidden lg:block'}>
          {!sel ? <div className="tarjeta"><EstadoVacio titulo="Selecciona una orden" mensaje="El detalle y el comparativo aparecerán aquí." /></div> : (
            <div className="space-y-4">
              <button className="btn-fantasma lg:hidden" onClick={() => navigate('/aprobacion-compras')}><ArrowLeft size={15} /> Volver a la lista</button>
              <div className="tarjeta space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">{sel.numero}</h2>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${dentroUmbral(sel.total, estado.parametros) ? 'border-ok/30 bg-ok/10 text-ok' : 'border-aviso/30 bg-aviso/10 text-aviso'}`}>
                    {dentroUmbral(sel.total, estado.parametros) ? 'Dentro del umbral' : 'Fuera del umbral - requiere aprobación de Gerencia'}</span></div>
                <EstadosCompra compra={sel} />
                {sol && <p className="text-sm">Solicitud de origen: <Link className="font-semibold text-marca-vino underline" to={tieneRol(u, 'admin') || tieneRol(u, 'director') ? `/solicitudes/${sol.id}` : '#'}>{sol.numero}</Link> - {sol.justificacion}</p>}
                {justificacionProveedor() && <p className="rounded-md bg-marca-amarillo-suave/50 p-2 text-sm"><span className="font-semibold">Proveedor elegido.</span> {justificacionProveedor()}</p>}
              </div>
              <ResumenCompra compra={sel} />
              {sel.estado === 'pendiente_aprobacion' && (
                <div className="tarjeta flex flex-wrap items-center gap-2 p-3">
                  <BotonConPermiso variante="primario" permitido={regla.permitido} motivo={regla.motivo} onClick={() => setModal('aprobar')}><CheckCircle2 size={16} /> Aprobar</BotonConPermiso>
                  <BotonConPermiso variante="secundario" permitido={regla.permitido} motivo={regla.motivo} onClick={() => setModal('devolver')}><RotateCcw size={16} /> Devolver</BotonConPermiso>
                  <BotonConPermiso variante="peligro" permitido={regla.permitido} motivo={regla.motivo} onClick={() => setModal('rechazar')}><XCircle size={16} /> Rechazar</BotonConPermiso>
                </div>
              )}
              {previas.length > 0 && <div className="tarjeta p-4 text-sm"><h3 className="mb-1 text-base font-bold">Observaciones previas</h3><ul className="list-inside list-disc">{previas.map((h, i) => <li key={i}>{nombre(h.usuarioId)}: {h.observacion}</li>)}</ul></div>}
              <div className="tarjeta p-4"><h3 className="mb-3 text-base font-bold">Historial</h3><LineaTiempoEstados historial={sel.historial} /></div>
            </div>
          )}
        </div>
      </div>
      <ModalConfirmar abierto={modal === 'aprobar'} titulo="Aprobar orden de compra" mensaje={`Se aprobará ${sel?.numero}. Quedará lista para recepción${sel?.modalidadPago === 'anticipo' ? ' y para solicitud de anticipo' : ''}.`} textoConfirmar="Aprobar" onConfirmar={() => decidir('aprobar')} onCerrar={() => setModal(null)} />
      <ModalObservacion abierto={modal === 'devolver'} titulo={`Devolver ${sel?.numero ?? ''}`} textoConfirmar="Devolver" minimo={10} onConfirmar={(o) => decidir('devolver', o)} onCerrar={() => setModal(null)} />
      <ModalObservacion abierto={modal === 'rechazar'} titulo={`Rechazar ${sel?.numero ?? ''}`} etiqueta="Motivo del rechazo (obligatorio)" textoConfirmar="Rechazar" peligro minimo={10} onConfirmar={(o) => decidir('rechazar', o)} onCerrar={() => setModal(null)} />
    </div>
  );
}

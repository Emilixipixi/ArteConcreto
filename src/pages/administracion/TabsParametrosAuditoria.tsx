import { useState } from 'react';
import { formatearFechaHora } from '../../lib/formato';
import { useStore } from '../../store/useStore';

// P-18, pestaña Parametros: cada cambio muestra un toast y se refleja donde se usa
export function TabParametros() {
  const e = useStore();
  const p = e.parametros;
  const [v, setV] = useState({ umbralCompra: String(p.umbralCompra), toleranciaConsumo: String(p.toleranciaConsumo), diasRecepcionVencida: String(p.diasRecepcionVencida), umbralStockPct: String(p.umbralStockPct ?? 100), impuestoInformativoPct: String(p.impuestoInformativoPct), proveedorTienda: p.proveedorTienda });
  const [err, setErr] = useState('');
  const guardar = () => {
    const r = e.guardarParametros({ umbralCompra: Number(v.umbralCompra), toleranciaConsumo: Number(v.toleranciaConsumo), diasRecepcionVencida: Number(v.diasRecepcionVencida), umbralStockPct: Number(v.umbralStockPct), impuestoInformativoPct: Number(v.impuestoInformativoPct), proveedorTienda: v.proveedorTienda });
    setErr(r.ok ? '' : r.error ?? 'No se pudo guardar');
  };
  const campo = (k: keyof typeof v, etiqueta: string, ayuda: string) => (
    <div><label className="etiqueta" htmlFor={`pm-${k}`}>{etiqueta}</label><input id={`pm-${k}`} className="campo" inputMode={k === 'proveedorTienda' ? 'text' : 'decimal'} value={v[k]} onChange={(ev) => setV({ ...v, [k]: ev.target.value })} /><p className="mt-1 text-xs text-concreto-600">{ayuda}</p></div>
  );
  return (
    <section className="tarjeta space-y-4 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {campo('umbralCompra', 'Umbral de compra (USD)', 'Hasta este monto la compra la autoriza el Director; sobre el umbral, el Aprobador de compra.')}
        {campo('toleranciaConsumo', 'Tolerancia de consumo (%)', 'Desvío permitido en fabricación antes de exigir al Director.')}
        {campo('diasRecepcionVencida', 'Días de recepción vencida', 'Tolerancia tras la fecha estimada de entrega.')}
        {campo('umbralStockPct', 'Alerta de stock (% del mínimo)', '100 alerta al bajar del mínimo; un valor mayor alerta antes.')}
        {campo('impuestoInformativoPct', 'Impuesto informativo (%)', 'Solo informativo; no hay cálculo tributario real.')}
        {campo('proveedorTienda', 'Proveedor de la tienda en línea', 'Se muestra en Conexiones tienda.')}
      </div>
      {err && <p role="alert" className="text-xs text-error">{err}</p>}
      <button className="btn-primario" onClick={guardar}>Guardar parámetros</button>
    </section>
  );
}

// P-18, pestaña Auditoria (RF-05)
export function TabAuditoria() {
  const e = useStore();
  const nombre = (id: string) => e.usuarios.find((u) => u.id === id)?.nombre ?? id;
  return (
    <section className="tarjeta overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
      <thead className="bg-concreto-100 text-xs uppercase text-concreto-600"><tr><th className="px-2 py-2 text-left">Fecha</th><th className="px-2 py-2 text-left">Usuario</th><th className="px-2 py-2 text-left">Entidad</th><th className="px-2 py-2 text-left">Acción</th><th className="px-2 py-2 text-left">Detalle</th></tr></thead>
      <tbody>{e.auditoria.map((a) => <tr key={a.id} className="border-t border-concreto-300 align-top"><td className="whitespace-nowrap px-2 py-2">{formatearFechaHora(a.fecha)}</td><td className="px-2 py-2">{nombre(a.usuarioId)}</td><td className="px-2 py-2">{a.entidad}</td><td className="px-2 py-2">{a.accion}</td><td className="px-2 py-2 text-xs">{a.detalle}</td></tr>)}</tbody>
    </table></section>
  );
}

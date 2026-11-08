import { ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Traslado } from '../types';

// Linea horizontal Origen -> En transito -> Destino con las cantidades de cada etapa y la variacion (CA-08)
export default function FlujoTraslado({ t }: { t: Traslado }) {
  const e = useStore();
  const bod = (id: string) => e.bodegas.find((b) => b.id === id)?.nombre ?? id;
  const enviado = t.lineas.reduce((a, l) => a + l.cantidadEnviada, 0);
  const recibido = t.lineas.reduce((a, l) => a + (l.cantidadRecibida ?? 0), 0);
  const cerrado = t.estado === 'recibido' || t.estado === 'recibido_con_diferencias';
  const salio = t.estado !== 'borrador' && t.estado !== 'cancelado';
  const enTransito = t.estado === 'en_transito' ? enviado : 0;
  const variacion = cerrado ? recibido - enviado : 0;
  const caja = (titulo: string, sub: string, valor: number, activo: boolean) => (
    <div className={`flex-1 rounded-md border p-3 text-center ${activo ? 'border-marca-vino bg-marca-vino/5' : 'border-concreto-300'}`}>
      <p className="text-xs uppercase text-concreto-600">{titulo}</p><p className="truncate text-sm font-semibold">{sub}</p><p className="text-2xl font-bold tabular-nums">{valor}</p>
    </div>
  );
  return (
    <div aria-label="Origen, tránsito y destino">
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        {caja('Origen', bod(t.origenId), salio ? enviado : 0, t.estado === 'borrador')}
        <ArrowRight className="mx-auto shrink-0 rotate-90 text-concreto-600 sm:rotate-0" size={18} aria-hidden="true" />
        {caja('En tránsito', 'no disponible', enTransito, t.estado === 'en_transito')}
        <ArrowRight className="mx-auto shrink-0 rotate-90 text-concreto-600 sm:rotate-0" size={18} aria-hidden="true" />
        {caja('Destino', bod(t.destinoId), cerrado ? recibido : 0, cerrado)}
      </div>
      {cerrado && <p className={`mt-2 text-sm font-semibold ${variacion < 0 ? 'text-error' : 'text-ok'}`}>Variación: {variacion} unidades {variacion < 0 ? '(pérdida en tránsito)' : '(sin diferencias)'}</p>}
    </div>
  );
}

import type { Compra } from '../types';
import EstadoBadge from './EstadoBadge';

// Estados independientes de compra, recepcion y pago (RN-03): recibir no significa pagar
export default function EstadosCompra({ compra }: { compra: Pick<Compra, 'estado' | 'estadoRecepcion' | 'estadoPago'> }) {
  return (
    <div className="flex flex-wrap gap-4">
      <div><p className="etiqueta">Compra</p><EstadoBadge estado={compra.estado} /></div>
      <div><p className="etiqueta">Recepción</p><EstadoBadge estado={compra.estadoRecepcion} /></div>
      <div><p className="etiqueta">Pago</p><EstadoBadge estado={compra.estadoPago} /></div>
    </div>
  );
}

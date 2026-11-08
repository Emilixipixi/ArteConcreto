import {
  AlertTriangle, Ban, CheckCircle2, CircleDashed, Clock, FileEdit, Lock, PackageCheck, PackageOpen, RotateCcw, Truck, XCircle, Repeat, CircleDollarSign, Copy,
  type LucideIcon,
} from 'lucide-react';

interface Def { label: string; clases: string; icono: LucideIcon }

const gris = 'bg-concreto-100 text-concreto-600 border-concreto-300';
const amarillo = 'bg-marca-amarillo-suave text-marca-vino-oscuro border-marca-amarillo';
const ambar = 'bg-aviso/10 text-aviso border-aviso/30';
const verde = 'bg-ok/10 text-ok border-ok/30';
const rojo = 'bg-error/10 text-error border-error/30';
const azul = 'bg-info/10 text-info border-info/30';
const oscuro = 'bg-concreto-600 text-white border-concreto-600';
const rojoTenue = 'bg-error/5 text-error/70 border-error/20';

// Cada estado lleva icono, no solo color
const DEFS: Record<string, Def> = {
  borrador: { label: 'Borrador', clases: gris, icono: FileEdit },
  pendiente: { label: 'Pendiente', clases: amarillo, icono: Clock },
  pendiente_aprobacion: { label: 'En aprobación', clases: amarillo, icono: Clock },
  pendiente_director: { label: 'Pendiente del director', clases: amarillo, icono: Clock },
  pendiente_salida: { label: 'Pendiente de salida', clases: amarillo, icono: Clock },
  preparada: { label: 'Preparada', clases: gris, icono: FileEdit },
  devuelta: { label: 'Devuelta', clases: ambar, icono: RotateCcw },
  aprobada: { label: 'Aprobada', clases: verde, icono: CheckCircle2 },
  aprobado: { label: 'Aprobado', clases: verde, icono: CheckCircle2 },
  rechazada: { label: 'Rechazada', clases: rojo, icono: XCircle },
  rechazado: { label: 'Rechazado', clases: rojo, icono: XCircle },
  en_compra: { label: 'En compra', clases: azul, icono: Truck },
  en_transito: { label: 'En tránsito', clases: azul, icono: Truck },
  recibida_parcial: { label: 'Recibida parcial', clases: `${ambar} border-2`, icono: PackageOpen },
  parcial: { label: 'Parcial', clases: `${ambar} border-2`, icono: PackageOpen },
  recibida: { label: 'Recibida', clases: verde, icono: PackageCheck },
  recibido: { label: 'Recibido', clases: verde, icono: PackageCheck },
  completa: { label: 'Completa', clases: verde, icono: PackageCheck },
  recibido_con_diferencias: { label: 'Recibido con diferencias', clases: `${ambar} border-2`, icono: AlertTriangle },
  cerrada: { label: 'Cerrada', clases: oscuro, icono: Lock },
  anulada: { label: 'Anulada', clases: rojoTenue, icono: Ban },
  anulado: { label: 'Anulado', clases: rojoTenue, icono: Ban },
  cancelado: { label: 'Cancelado', clases: rojoTenue, icono: Ban },
  confirmada: { label: 'Confirmada', clases: verde, icono: CheckCircle2 },
  confirmado: { label: 'Confirmado', clases: verde, icono: CheckCircle2 },
  pagada: { label: 'Pagada', clases: verde, icono: CircleDollarSign },
  pagado: { label: 'Pagado', clases: verde, icono: CircleDollarSign },
  conciliada: { label: 'Conciliada', clases: oscuro, icono: Lock },
  sin_pago: { label: 'Sin pago', clases: gris, icono: CircleDashed },
  anticipo: { label: 'Anticipo', clases: azul, icono: CircleDollarSign },
  pago_parcial: { label: 'Pago parcial', clases: ambar, icono: CircleDollarSign },
  aplicado: { label: 'Aplicado', clases: verde, icono: CheckCircle2 },
  duplicado: { label: 'Duplicado', clases: ambar, icono: Copy },
  error: { label: 'Error', clases: rojo, icono: XCircle },
  reintentado: { label: 'Reintentado', clases: azul, icono: Repeat },
  sin_descargar: { label: 'Sin descargar', clases: gris, icono: CircleDashed },
  descargado_contabilidad: { label: 'Descargado', clases: oscuro, icono: Lock },
  activa: { label: 'Activa', clases: ambar, icono: Lock },
  liberada: { label: 'Liberada', clases: gris, icono: CircleDashed },
  vencida: { label: 'Vencida', clases: rojoTenue, icono: Clock },
  consumida: { label: 'Consumida', clases: verde, icono: CheckCircle2 },
  // Tesoreria ampliada: facturas y extracto bancario
  cotejada: { label: 'Cotejada', clases: verde, icono: CheckCircle2 },
  con_diferencia: { label: 'Con diferencia', clases: `${ambar} border-2`, icono: AlertTriangle },
  en_reclamo: { label: 'En reclamo', clases: azul, icono: RotateCcw },
  conciliado: { label: 'Conciliado', clases: oscuro, icono: Lock },
  sin_conciliar: { label: 'Sin conciliar', clases: amarillo, icono: Clock },
  gasto_bancario: { label: 'Gasto bancario', clases: gris, icono: CircleDollarSign },
};

/** Texto legible de un estado (para documentos generados) */
export const textoEstado = (estado: string) => DEFS[estado]?.label ?? estado.replace(/_/g, ' ');

export default function EstadoBadge({ estado, className = '' }: { estado: string; className?: string }) {
  const def = DEFS[estado] ?? { label: estado.replace(/_/g, ' '), clases: gris, icono: CircleDashed };
  const Icono = def.icono;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${def.clases} ${className}`}>
      <Icono size={12} aria-hidden="true" />{def.label}
    </span>
  );
}

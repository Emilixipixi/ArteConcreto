import { useState } from 'react';
import Modal from './Modal';
import { hoyISO } from '../lib/reglas';
import { disponibleTerminado } from '../store/selectoresFase4';
import { useStore } from '../store/useStore';

// Reserva de producto terminado para un cliente o proyecto (RN-07): compromete unidades hasta su vencimiento
export default function ModalReserva({ sku, bodegaId, onCerrar }: { sku: string | null; bodegaId?: string; onCerrar: () => void }) {
  const e = useStore();
  const [bod, setBod] = useState(bodegaId ?? '');
  const [cant, setCant] = useState('1');
  const [cliente, setCliente] = useState('');
  const [ref, setRef] = useState('');
  const [vence, setVence] = useState(hoyISO(7));
  const [intento, setIntento] = useState(false);
  if (!sku) return null;
  const bodegaSel = bod || e.bodegas.find((b) => b.activa && disponibleTerminado(e, sku, b.id).disponible > 0)?.id || 'b1';
  const disp = disponibleTerminado(e, sku, bodegaSel).disponible;
  const n = parseInt(cant, 10);
  const err = !(n > 0) || String(n) !== cant.trim() ? 'La cantidad debe ser un entero mayor que cero' : n > disp ? `Solo hay ${disp} disponibles en esta bodega` : !cliente.trim() ? 'Indica el cliente o proyecto' : !ref.trim() ? 'La referencia es obligatoria' : vence < hoyISO() ? 'El vencimiento no puede ser anterior a hoy' : null;
  const guardar = () => {
    setIntento(true); if (err) return;
    const r = e.crearReserva({ sku, bodegaId: bodegaSel, cantidad: n, cliente: cliente.trim(), referencia: ref.trim(), vence });
    if (!r.ok) return e.mostrarToast(r.error ?? 'No se pudo reservar', 'error');
    onCerrar();
  };
  return (
    <Modal abierto titulo={`Reservar ${sku}`} onCerrar={onCerrar} pie={<><button className="btn-fantasma" onClick={onCerrar}>Cancelar</button><button className="btn-primario" onClick={guardar}>Reservar</button></>}>
      <div className="space-y-3 text-sm">
        <div><label className="etiqueta" htmlFor="rs-bod">Bodega</label><select id="rs-bod" className="campo" value={bodegaSel} onChange={(ev) => setBod(ev.target.value)}>{e.bodegas.filter((b) => b.activa).map((b) => <option key={b.id} value={b.id}>{b.nombre} (disp. {disponibleTerminado(e, sku, b.id).disponible})</option>)}</select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="etiqueta" htmlFor="rs-cant">Cantidad</label><input id="rs-cant" inputMode="numeric" className="campo" value={cant} onChange={(ev) => setCant(ev.target.value)} /></div>
          <div><label className="etiqueta" htmlFor="rs-vence">Vence</label><input id="rs-vence" type="date" className="campo" value={vence} onChange={(ev) => setVence(ev.target.value)} /></div>
        </div>
        <div><label className="etiqueta" htmlFor="rs-cli">Cliente o proyecto</label><input id="rs-cli" className="campo" value={cliente} onChange={(ev) => setCliente(ev.target.value)} /></div>
        <div><label className="etiqueta" htmlFor="rs-ref">Referencia (cotización, orden)</label><input id="rs-ref" className="campo" value={ref} onChange={(ev) => setRef(ev.target.value)} /></div>
        {intento && err && <p role="alert" className="text-xs text-error">{err}</p>}
      </div>
    </Modal>
  );
}

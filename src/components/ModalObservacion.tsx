import { useState } from 'react';
import Modal from './Modal';

interface Props {
  abierto: boolean; titulo: string; etiqueta?: string; textoConfirmar: string; peligro?: boolean;
  onConfirmar: (observacion: string) => void; onCerrar: () => void; minimo?: number;
}

// Observacion obligatoria al devolver o rechazar (RN-02)
export default function ModalObservacion({ abierto, titulo, etiqueta = 'Observación (obligatoria)', textoConfirmar, peligro, onConfirmar, onCerrar, minimo = 5 }: Props) {
  const [texto, setTexto] = useState('');
  const valido = texto.trim().length >= minimo;
  const cerrar = () => { setTexto(''); onCerrar(); };
  return (
    <Modal abierto={abierto} titulo={titulo} onCerrar={cerrar}
      pie={<>
        <button className="btn-fantasma" onClick={cerrar}>Cancelar</button>
        <button className={peligro ? 'btn-peligro' : 'btn-primario'} disabled={!valido} onClick={() => { onConfirmar(texto.trim()); setTexto(''); onCerrar(); }}>{textoConfirmar}</button>
      </>}>
      <label className="etiqueta" htmlFor="obs-modal">{etiqueta}</label>
      <textarea id="obs-modal" className="campo min-h-[96px]" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Explica el motivo para que quede en el historial" />
      {!valido && texto.length > 0 && <p className="mt-1 text-xs text-error">Escribe al menos {minimo} caracteres.</p>}
    </Modal>
  );
}

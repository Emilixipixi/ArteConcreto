import Modal from './Modal';

interface Props {
  abierto: boolean; titulo: string; mensaje: string; onConfirmar: () => void; onCerrar: () => void;
  textoConfirmar?: string; peligro?: boolean;
}

export default function ModalConfirmar({ abierto, titulo, mensaje, onConfirmar, onCerrar, textoConfirmar = 'Confirmar', peligro }: Props) {
  return (
    <Modal abierto={abierto} titulo={titulo} onCerrar={onCerrar}
      pie={<>
        <button className="btn-fantasma" onClick={onCerrar}>Cancelar</button>
        <button className={peligro ? 'btn-peligro' : 'btn-primario'} onClick={() => { onConfirmar(); onCerrar(); }}>{textoConfirmar}</button>
      </>}>
      <p className="text-sm">{mensaje}</p>
    </Modal>
  );
}

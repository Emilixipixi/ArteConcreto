import { useId, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  permitido?: boolean;          // resultado de puede() / reglaSegregacion()
  motivo?: string;              // explicacion cuando esta bloqueado
  variante?: 'primario' | 'secundario' | 'peligro' | 'fantasma';
  deshabilitado?: boolean;      // bloqueo ajeno a permisos (ej. cargando)
  children: ReactNode;
}

// Boton deshabilitado con aviso que explica el motivo (segregacion de funciones, seccion 7.2).
// El aviso se dibuja en el <body> con posicion fija: asi nunca queda cortado por tablas con scroll ni por los bordes de la pantalla.
export default function BotonConPermiso({ permitido = true, motivo, variante = 'secundario', deshabilitado, children, className = '', ...rest }: Props) {
  const bloqueado = !permitido || !!deshabilitado;
  const clase = { primario: 'btn-primario', secundario: 'btn-secundario', peligro: 'btn-peligro', fantasma: 'btn-fantasma' }[variante];
  const hayAviso = !permitido && !!motivo;
  const idAviso = useId();
  const refSpan = useRef<HTMLSpanElement>(null);
  const refAviso = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Coloca el aviso encima del boton (o debajo si no cabe) y lo mantiene dentro de la ventana
  useLayoutEffect(() => {
    if (!visible || !refSpan.current || !refAviso.current) { setPos(null); return; }
    const r = refSpan.current.getBoundingClientRect();
    const a = refAviso.current.getBoundingClientRect();
    const margen = 8;
    let left = r.left + r.width / 2 - a.width / 2;
    left = Math.max(margen, Math.min(left, window.innerWidth - a.width - margen));
    let top = r.top - a.height - 8;
    if (top < margen) top = r.bottom + 8;
    setPos({ top, left });
  }, [visible, motivo]);

  return (
    <span ref={refSpan} className="relative inline-flex"
      onPointerEnter={() => hayAviso && setVisible(true)} onPointerLeave={() => setVisible(false)}
      onFocus={() => hayAviso && setVisible(true)} onBlur={() => setVisible(false)}
      onClick={() => hayAviso && setVisible((v) => !v)} tabIndex={hayAviso ? 0 : undefined}>
      <button {...rest} disabled={bloqueado} className={`${clase} ${className} ${bloqueado ? 'pointer-events-none' : ''}`} aria-describedby={hayAviso ? idAviso : undefined}>{children}</button>
      {hayAviso && visible && createPortal(
        <span ref={refAviso} id={idAviso} role="tooltip"
          style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, maxWidth: 'min(320px, calc(100vw - 16px))' }}
          className="pointer-events-none z-[200] w-max whitespace-normal rounded-md bg-texto px-3 py-2 text-xs font-medium leading-snug text-white shadow-lg">
          {motivo}
        </span>, document.body)}
    </span>
  );
}

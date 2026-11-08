import { FileText, Paperclip, X } from 'lucide-react';

interface Props { adjuntos: string[]; onChange?: (a: string[]) => void; soloLectura?: boolean }

// Los adjuntos son solo nombres ficticios: no se sube ningun archivo
export default function AdjuntoSimulado({ adjuntos, onChange, soloLectura }: Props) {
  const agregar = () => onChange?.([...adjuntos, `documento-adjunto-${adjuntos.length + 1}.pdf`]);
  return (
    <div>
      <ul className="space-y-1">
        {adjuntos.map((a, i) => (
          <li key={a + i} className="flex items-center gap-2 rounded-md border border-concreto-300 bg-concreto-100 px-2 py-1 text-sm">
            <FileText size={14} className="text-marca-vino" aria-hidden="true" />
            <span className="flex-1 truncate">{a}</span>
            {!soloLectura && <button onClick={() => onChange?.(adjuntos.filter((_, j) => j !== i))} aria-label={`Quitar ${a}`} className="text-concreto-600 hover:text-error"><X size={14} /></button>}
          </li>
        ))}
        {adjuntos.length === 0 && <li className="text-xs text-concreto-600">Sin adjuntos</li>}
      </ul>
      {!soloLectura && (
        <button type="button" className="btn-secundario mt-2 !py-1 text-xs" onClick={agregar}>
          <Paperclip size={13} /> Adjuntar archivo (simulado)
        </button>
      )}
    </div>
  );
}

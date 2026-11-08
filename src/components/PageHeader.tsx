import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Miga { texto: string; ruta?: string }
interface Props { titulo: string; migas?: Miga[]; acciones?: ReactNode; subtitulo?: string }

export default function PageHeader({ titulo, migas, acciones, subtitulo }: Props) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {migas && migas.length > 0 && (
          <nav aria-label="Migas de pan" className="mb-1 flex flex-wrap items-center gap-1 text-xs text-concreto-600">
            {migas.map((m, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                {m.ruta ? <Link to={m.ruta} className="hover:text-marca-vino hover:underline">{m.texto}</Link> : <span>{m.texto}</span>}
                {i < migas.length - 1 && <ChevronRight size={12} aria-hidden="true" />}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-xl font-bold sm:text-2xl">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-concreto-600">{subtitulo}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}

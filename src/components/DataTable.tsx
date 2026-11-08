import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown } from 'lucide-react';
import EstadoVacio from './EstadoVacio';

export interface Columna<T> {
  clave: string; titulo: string; render?: (fila: T) => ReactNode; valor?: (fila: T) => string | number;
  ordenable?: boolean; className?: string; alinear?: 'izq' | 'der';
}

interface Props<T> {
  columnas: Columna<T>[]; filas: T[]; clave: (fila: T) => string; tamPagina?: number;
  vacioTitulo?: string; vacioMensaje?: string; onFila?: (fila: T) => void;
  filaExpandida?: (fila: T) => ReactNode; resaltar?: (fila: T) => boolean;
}

export default function DataTable<T>({ columnas, filas, clave, tamPagina = 10, vacioTitulo = 'Sin resultados', vacioMensaje, onFila, filaExpandida, resaltar }: Props<T>) {
  const [orden, setOrden] = useState<{ clave: string; asc: boolean } | null>(null);
  const [pagina, setPagina] = useState(0);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());

  const ordenadas = useMemo(() => {
    if (!orden) return filas;
    const col = columnas.find((c) => c.clave === orden.clave);
    if (!col) return filas;
    const val = (f: T) => (col.valor ? col.valor(f) : String((f as Record<string, unknown>)[col.clave] ?? ''));
    return [...filas].sort((a, b) => {
      const x = val(a), y = val(b);
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es', { numeric: true });
      return orden.asc ? c : -c;
    });
  }, [filas, orden, columnas]);

  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / tamPagina));
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const visibles = ordenadas.slice(paginaActual * tamPagina, paginaActual * tamPagina + tamPagina);

  const alternar = (k: string) => { const s = new Set(abiertas); s.has(k) ? s.delete(k) : s.add(k); setAbiertas(s); };

  if (filas.length === 0) return <div className="tarjeta"><EstadoVacio titulo={vacioTitulo} mensaje={vacioMensaje} /></div>;

  return (
    <div className="tarjeta overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-concreto-100 text-xs uppercase tracking-wide text-concreto-600">
            <tr>
              {filaExpandida && <th className="w-8" />}
              {columnas.map((c) => (
                <th key={c.clave} className={`px-3 py-2 font-semibold ${c.alinear === 'der' ? 'text-right' : ''} ${c.className ?? ''}`}>
                  {c.ordenable ? (
                    <button className="inline-flex items-center gap-1 hover:text-marca-vino" onClick={() => setOrden(orden?.clave === c.clave ? { clave: c.clave, asc: !orden.asc } : { clave: c.clave, asc: true })}>
                      {c.titulo}
                      {orden?.clave === c.clave ? (orden.asc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronsUpDown size={12} />}
                    </button>
                  ) : c.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) => {
              const k = clave(f);
              const abierta = abiertas.has(k);
              return (
                <FilaTabla key={k} abierta={abierta}
                  extra={filaExpandida && abierta ? filaExpandida(f) : null} columnas={columnas.length + (filaExpandida ? 1 : 0)}>
                  {filaExpandida && (
                    <td className="w-8 pl-2">
                      <button onClick={() => alternar(k)} aria-label={abierta ? 'Contraer fila' : 'Expandir fila'} className="text-concreto-600 hover:text-marca-vino">
                        {abierta ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </td>
                  )}
                  {columnas.map((c) => (
                    <td key={c.clave} onClick={() => onFila?.(f)}
                      className={`px-3 py-2.5 ${onFila ? 'cursor-pointer' : ''} ${c.alinear === 'der' ? 'text-right' : ''} ${resaltar?.(f) ? 'bg-marca-amarillo-suave/40' : ''} ${c.className ?? ''}`}>
                      {c.render ? c.render(f) : String((f as Record<string, unknown>)[c.clave] ?? '')}
                    </td>
                  ))}
                </FilaTabla>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between border-t border-concreto-300 px-3 py-2 text-xs text-concreto-600">
          <span>{ordenadas.length} registros</span>
          <span className="inline-flex items-center gap-2">
            <button className="btn-fantasma !px-2 !py-1" disabled={paginaActual === 0} onClick={() => setPagina(paginaActual - 1)} aria-label="Página anterior"><ChevronLeft size={14} /></button>
            Página {paginaActual + 1} de {totalPaginas}
            <button className="btn-fantasma !px-2 !py-1" disabled={paginaActual >= totalPaginas - 1} onClick={() => setPagina(paginaActual + 1)} aria-label="Página siguiente"><ChevronRight size={14} /></button>
          </span>
        </div>
      )}
    </div>
  );
}

function FilaTabla({ children, extra, columnas, abierta }: { children: ReactNode; extra: ReactNode; columnas: number; abierta: boolean }) {
  return (
    <>
      <tr className={`border-t border-concreto-300 hover:bg-concreto-100/60 ${abierta ? 'bg-concreto-100/60' : ''}`}>{children}</tr>
      {extra && <tr className="bg-concreto-100/40"><td colSpan={columnas} className="px-4 py-3">{extra}</td></tr>}
    </>
  );
}

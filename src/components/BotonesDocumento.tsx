import { FileText, FileType } from 'lucide-react';
import { fichaPdf, fichaWord, type FichaDoc } from '../lib/documentos';
import { useStore } from '../store/useStore';

/** Descarga de un documento de muestra en PDF y en Word (SIMULADO: sin validez fiscal) */
export default function BotonesDocumento({ ficha }: { ficha: () => FichaDoc }) {
  const toast = useStore((s) => s.mostrarToast);
  const ir = async (fn: (f: FichaDoc) => Promise<void>, ext: string) => {
    try { const f = ficha(); await fn(f); toast(`Documento de muestra generado: ${f.archivo}.${ext}`, 'ok'); } catch { toast('No se pudo generar el documento', 'error'); }
  };
  return (
    <span className="inline-flex gap-1">
      <button type="button" className="btn-secundario !py-1 text-xs" title="Descargar documento de muestra en PDF" onClick={() => ir(fichaPdf, 'pdf')}><FileText size={13} /> PDF</button>
      <button type="button" className="btn-secundario !py-1 text-xs" title="Descargar documento de muestra en Word" onClick={() => ir(fichaWord, 'docx')}><FileType size={13} /> Word</button>
    </span>
  );
}

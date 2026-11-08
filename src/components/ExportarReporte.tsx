import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, FileType } from 'lucide-react';
import { exportarExcel, exportarPdfTabla, exportarWord } from '../lib/documentos';
import { useStore } from '../store/useStore';
import Modal from './Modal';

/** Exportacion simulada (RF-54): modal de progreso y toast; opcionalmente descarga un CSV real del bloque visible */
export default function ExportarReporte({ nombre, filasCsv }: { nombre: string; filasCsv?: () => (string | number)[][] }) {
  const mostrarToast = useStore((s) => s.mostrarToast);
  const [progreso, setProgreso] = useState<{ archivo: string; pct: number } | null>(null);

  // Genera un archivo real de muestra (Excel, PDF o Word) con el bloque visible del reporte
  const generar = async (ext: 'xlsx' | 'pdf' | 'docx') => {
    const filas = filasCsv?.() ?? [];
    if (!filas.length) { mostrarToast('No hay datos para exportar', 'error'); return; }
    setProgreso({ archivo: `reporte_${nombre}.${ext}`, pct: 60 });
    try {
      if (ext === 'xlsx') await exportarExcel(nombre, filas); else if (ext === 'pdf') await exportarPdfTabla(nombre, filas); else await exportarWord(nombre, filas);
      mostrarToast(`Documento de muestra generado: reporte_${nombre}.${ext}`, 'ok');
    } catch { mostrarToast('No se pudo generar el documento', 'error'); }
    setProgreso(null);
  };
  const csv = () => {
    const filas = filasCsv?.() ?? [];
    const texto = filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    try {
      const url = URL.createObjectURL(new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a'); a.href = url; a.download = `reporte_${nombre}.csv`; a.click(); URL.revokeObjectURL(url);
      mostrarToast(`CSV descargado: reporte_${nombre}.csv`, 'ok');
    } catch { mostrarToast('No se pudo generar el CSV', 'error'); }
  };
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button className="btn-secundario !py-1 text-xs" onClick={() => generar('xlsx')}><FileSpreadsheet size={13} /> Exportar a Excel</button>
        <button className="btn-secundario !py-1 text-xs" onClick={() => generar('pdf')}><FileText size={13} /> Exportar a PDF</button>
        <button className="btn-secundario !py-1 text-xs" onClick={() => generar('docx')}><FileType size={13} /> Exportar a Word</button>
        {filasCsv && <button className="btn-fantasma border border-concreto-300 !py-1 text-xs" onClick={csv}><Download size={13} /> Descargar CSV</button>}
      </div>
      <Modal abierto={!!progreso} titulo="Generando documento de muestra" onCerrar={() => undefined}>
        <p className="mb-2 text-sm">{progreso?.archivo}</p>
        <div className="h-2 w-full overflow-hidden rounded bg-concreto-100"><div className="h-full bg-marca-vino transition-all" style={{ width: `${progreso?.pct ?? 0}%` }} role="progressbar" aria-valuenow={progreso?.pct ?? 0} aria-label="Progreso de exportación" /></div>
      </Modal>
    </>
  );
}

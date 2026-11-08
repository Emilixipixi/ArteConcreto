// Generacion de documentos de MUESTRA (Excel, PDF y Word) en el navegador. SIMULADO: no son documentos fiscales ni oficiales.
// Las librerias se cargan bajo demanda (import dinamico) para no aumentar el peso inicial de la aplicacion.
import { formatearFecha, formatearMoneda } from './formato';

type Fila = (string | number)[];
const VINO: [number, number, number] = [107, 31, 59]; // SUPUESTO: color de marca aproximado para los documentos
const AVISO = 'DOCUMENTO DE MUESTRA - SIMULADO - sin validez fiscal';

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------- Reportes en tabla ----------------------------
export async function exportarExcel(nombre: string, filas: Fila[]) {
  const XLSX = await import('xlsx');
  const hoja = XLSX.utils.aoa_to_sheet([['Arte Concreto - ' + nombre.replace(/_/g, ' ')], [AVISO], [], ...filas]);
  const anchos = (filas[0] ?? []).map((_, i) => ({ wch: Math.min(40, Math.max(10, ...filas.map((f) => String(f[i] ?? '').length + 2))) }));
  hoja['!cols'] = anchos;
  const libro = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(libro, hoja, 'Reporte');
  XLSX.writeFile(libro, `reporte_${nombre}.xlsx`);
}

export async function exportarPdfTabla(nombre: string, filas: Fila[]) {
  const { jsPDF } = await import('jspdf'); const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: (filas[0]?.length ?? 0) > 6 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  doc.setFontSize(15); doc.setTextColor(...VINO); doc.text('Arte Concreto - ' + nombre.replace(/_/g, ' '), 40, 44);
  doc.setFontSize(8); doc.setTextColor(120); doc.text(`${AVISO}  |  Generado el ${formatearFecha(new Date())}`, 40, 58);
  autoTable(doc, { startY: 72, head: filas.slice(0, 1).map((f) => f.map(String)), body: filas.slice(1).map((f) => f.map(String)), headStyles: { fillColor: VINO }, styles: { fontSize: 8 }, alternateRowStyles: { fillColor: [247, 245, 242] } });
  doc.save(`reporte_${nombre}.pdf`);
}

export async function exportarWord(nombre: string, filas: Fila[]) {
  const d = await import('docx');
  const celda = (t: string, enc = false) => new d.TableCell({ shading: enc ? { fill: '6B1F3B', type: d.ShadingType.CLEAR, color: 'auto' } : undefined,
    children: [new d.Paragraph({ children: [new d.TextRun({ text: t, bold: enc, color: enc ? 'FFFFFF' : undefined, size: 18 })] })] });
  const tabla = new d.Table({ width: { size: 100, type: d.WidthType.PERCENTAGE }, rows: filas.map((f, i) => new d.TableRow({ tableHeader: i === 0, children: f.map((c) => celda(String(c), i === 0)) })) });
  const doc = new d.Document({ sections: [{ properties: { page: { size: { orientation: d.PageOrientation.LANDSCAPE } } }, children: [
    new d.Paragraph({ heading: d.HeadingLevel.HEADING_1, children: [new d.TextRun({ text: 'Arte Concreto - ' + nombre.replace(/_/g, ' '), color: '6B1F3B' })] }),
    new d.Paragraph({ children: [new d.TextRun({ text: `${AVISO}  |  Generado el ${formatearFecha(new Date())}`, size: 16, color: '777777' })] }), new d.Paragraph(''), tabla] }] });
  descargar(await d.Packer.toBlob(doc), `reporte_${nombre}.docx`);
}

// ---------------------------- Documentos individuales ----------------------------
export interface LineaDoc { codigo: string; descripcion: string; cantidad: number; unidad: string; precio: number }
export interface DatosFacturaDoc {
  numeroFactura: string; interno: string; fechaEmision: string; fechaVencimiento: string; ordenNumero: string;
  proveedor: string; ruc: string; ciudad: string; lineas: LineaDoc[]; subtotal: number; iva: number; total: number; ivaPct: number; condiciones: string;
}

/** Factura del proveedor con formato de comprobante (muestra) */
export async function facturaPdf(f: DatosFacturaDoc) {
  const { jsPDF } = await import('jspdf'); const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFillColor(...VINO); doc.rect(0, 0, 595, 70, 'F');
  doc.setTextColor(255); doc.setFontSize(18); doc.text('FACTURA', 40, 44); doc.setFontSize(10); doc.text(`Nº ${f.numeroFactura}`, 555, 34, { align: 'right' }); doc.text(`Registro interno ${f.interno}`, 555, 50, { align: 'right' });
  doc.setTextColor(40); doc.setFontSize(12); doc.text(f.proveedor, 40, 104);
  doc.setFontSize(9); doc.setTextColor(90); doc.text([`RUC / ID fiscal: ${f.ruc}`, `Ciudad: ${f.ciudad}`, `Condiciones: ${f.condiciones || '-'}`], 40, 120);
  doc.text(['Cliente: Arte Concreto Mobiliario', `Fecha de emisión: ${formatearFecha(f.fechaEmision)}`, `Fecha de vencimiento: ${formatearFecha(f.fechaVencimiento)}`, `Orden de compra: ${f.ordenNumero}`], 340, 104);
  autoTable(doc, { startY: 170, head: [['Código', 'Descripción', 'Cant.', 'Unidad', 'P. unitario', 'Total']], headStyles: { fillColor: VINO }, styles: { fontSize: 9 },
    body: f.lineas.map((l) => [l.codigo, l.descripcion, String(l.cantidad), l.unidad, formatearMoneda(l.precio), formatearMoneda(l.cantidad * l.precio)]),
    columnStyles: { 2: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } } });
  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  autoTable(doc, { startY: y, margin: { left: 340 }, theme: 'plain', styles: { fontSize: 10 }, columnStyles: { 1: { halign: 'right' } },
    body: [['Subtotal', formatearMoneda(f.subtotal)], [`IVA ${f.ivaPct}%`, formatearMoneda(f.iva)], [{ content: 'TOTAL', styles: { fontStyle: 'bold' } }, { content: formatearMoneda(f.total), styles: { fontStyle: 'bold' } }]] });
  doc.setFontSize(9); doc.setTextColor(180, 35, 24); doc.text(AVISO, 297, 800, { align: 'center' });
  doc.save(`factura-${f.numeroFactura}.pdf`);
}

export interface DatosComprobanteDoc {
  numero: string; fecha: string; tipo: string; proveedor: string; ordenNumero: string; importe: number; medio: string; referencia: string;
  cuenta: string; registradoPor: string; aprobadoPor: string; preparadoPor: string;
}

/** Comprobante de egreso (pago o anticipo) */
export async function comprobantePagoPdf(p: DatosComprobanteDoc) {
  const { jsPDF } = await import('jspdf'); const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFillColor(...VINO); doc.rect(0, 0, 595, 70, 'F'); doc.setTextColor(255); doc.setFontSize(18); doc.text('COMPROBANTE DE EGRESO', 40, 44); doc.setFontSize(10); doc.text(`Nº ${p.numero}`, 555, 44, { align: 'right' });
  autoTable(doc, { startY: 100, theme: 'grid', styles: { fontSize: 10 }, columnStyles: { 0: { fontStyle: 'bold', fillColor: [247, 245, 242], cellWidth: 150 } }, body: [
    ['Fecha de pago', formatearFecha(p.fecha)], ['Concepto', `${p.tipo} - orden ${p.ordenNumero}`], ['Beneficiario', p.proveedor], ['Importe', formatearMoneda(p.importe)],
    ['Medio de pago', p.medio], ['Referencia', p.referencia || '-'], ['Cuenta de origen', p.cuenta || '-'] ] });
  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 90;
  [['Preparó', p.preparadoPor], ['Aprobó', p.aprobadoPor], ['Registró el pago', p.registradoPor]].forEach(([r, n], i) => {
    const x = 40 + i * 180; doc.line(x, y, x + 150, y); doc.setFontSize(9); doc.setTextColor(60); doc.text(n, x + 75, y + 14, { align: 'center' }); doc.setTextColor(120); doc.text(r, x + 75, y + 26, { align: 'center' }); });
  doc.setTextColor(180, 35, 24); doc.text(AVISO, 297, 800, { align: 'center' });
  doc.save(`comprobante-${p.numero}.pdf`);
}

export interface DatosOrdenDoc {
  numero: string; fecha: string; proveedor: string; ruc: string; contacto: string; correo: string; condiciones: string; entrega: string; bodega: string;
  lineas: LineaDoc[]; subtotal: number; iva: number; total: number; observaciones?: string; solicitante: string;
}

/** Orden de compra en Word (editable) */
export async function ordenCompraDocx(o: DatosOrdenDoc) {
  const d = await import('docx');
  const p = (t: string, o2: { bold?: boolean; size?: number; color?: string } = {}) => new d.Paragraph({ children: [new d.TextRun({ text: t, ...o2 })] });
  const celda = (t: string, enc = false, der = false) => new d.TableCell({ shading: enc ? { fill: '6B1F3B', type: d.ShadingType.CLEAR, color: 'auto' } : undefined,
    children: [new d.Paragraph({ alignment: der ? d.AlignmentType.RIGHT : d.AlignmentType.LEFT, children: [new d.TextRun({ text: t, bold: enc, color: enc ? 'FFFFFF' : undefined, size: 20 })] })] });
  const enc = ['Código', 'Descripción', 'Cantidad', 'Unidad', 'P. unitario', 'Total'];
  const tabla = new d.Table({ width: { size: 100, type: d.WidthType.PERCENTAGE }, rows: [
    new d.TableRow({ tableHeader: true, children: enc.map((t, i) => celda(t, true, i > 1 && i !== 3)) }),
    ...o.lineas.map((l) => new d.TableRow({ children: [celda(l.codigo), celda(l.descripcion), celda(String(l.cantidad), false, true), celda(l.unidad), celda(formatearMoneda(l.precio), false, true), celda(formatearMoneda(l.cantidad * l.precio), false, true)] })),
  ] });
  const doc = new d.Document({ sections: [{ children: [
    new d.Paragraph({ heading: d.HeadingLevel.HEADING_1, children: [new d.TextRun({ text: `ORDEN DE COMPRA ${o.numero}`, color: '6B1F3B' })] }),
    p('Arte Concreto Mobiliario', { bold: true }), p(`Fecha: ${formatearFecha(o.fecha)}    Solicitante: ${o.solicitante}`), p(''),
    p('Proveedor', { bold: true, color: '6B1F3B' }), p(o.proveedor), p(`RUC / ID fiscal: ${o.ruc}`), p(`Contacto: ${o.contacto} - ${o.correo}`), p(''),
    p('Condiciones', { bold: true, color: '6B1F3B' }), p(`Pago: ${o.condiciones || '-'}`), p(`Entrega estimada: ${formatearFecha(o.entrega)} en ${o.bodega}`), p(''), tabla, p(''),
    new d.Paragraph({ alignment: d.AlignmentType.RIGHT, children: [new d.TextRun({ text: `Subtotal: ${formatearMoneda(o.subtotal)}`, break: 0 })] }),
    new d.Paragraph({ alignment: d.AlignmentType.RIGHT, children: [new d.TextRun({ text: `IVA: ${formatearMoneda(o.iva)}` })] }),
    new d.Paragraph({ alignment: d.AlignmentType.RIGHT, children: [new d.TextRun({ text: `TOTAL: ${formatearMoneda(o.total)}`, bold: true })] }),
    ...(o.observaciones ? [p(''), p('Observaciones', { bold: true, color: '6B1F3B' }), p(o.observaciones)] : []),
    p(''), p(AVISO, { size: 16, color: 'B42318' }) ] }] });
  descargar(await d.Packer.toBlob(doc), `orden-de-compra-${o.numero}.docx`);
}

// ---------------------------- Ficha generica de documento (PDF y Word) ----------------------------
export interface FichaDoc {
  archivo: string; titulo: string; numero: string; estado?: string; datos: [string, string][];
  tablaTitulo?: string; columnas?: string[]; filas?: (string | number)[][]; totales?: [string, string][]; notas?: string; firmas?: string[];
}

export async function fichaPdf(f: FichaDoc) {
  const { jsPDF } = await import('jspdf'); const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' }); const fin = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFillColor(...VINO); doc.rect(0, 0, 595, 70, 'F'); doc.setTextColor(255); doc.setFontSize(17); doc.text(f.titulo.toUpperCase(), 40, 44);
  doc.setFontSize(10); doc.text(`Nº ${f.numero}`, 555, 34, { align: 'right' }); if (f.estado) doc.text(f.estado, 555, 50, { align: 'right' });
  doc.setTextColor(90); doc.setFontSize(9); doc.text('Arte Concreto Mobiliario', 40, 90);
  autoTable(doc, { startY: 100, theme: 'grid', styles: { fontSize: 9 }, columnStyles: { 0: { fontStyle: 'bold', fillColor: [247, 245, 242], cellWidth: 150 } }, body: f.datos });
  if (f.columnas && f.filas) {
    doc.setFontSize(11); doc.setTextColor(...VINO); doc.text(f.tablaTitulo ?? 'Detalle', 40, fin() + 24);
    autoTable(doc, { startY: fin() + 30, head: [f.columnas], body: f.filas.map((r) => r.map(String)), headStyles: { fillColor: VINO }, styles: { fontSize: 9 }, alternateRowStyles: { fillColor: [247, 245, 242] } });
  }
  if (f.totales?.length) autoTable(doc, { startY: fin() + 12, margin: { left: 340 }, theme: 'plain', styles: { fontSize: 10 }, columnStyles: { 1: { halign: 'right' } }, body: f.totales });
  if (f.notas) { doc.setFontSize(9); doc.setTextColor(60); doc.text(doc.splitTextToSize(f.notas, 515), 40, fin() + 24); }
  if (f.firmas?.length) { const y = Math.min(fin() + 90, 760); f.firmas.forEach((t, i) => { const x = 40 + i * 175; doc.setDrawColor(120); doc.line(x, y, x + 150, y); doc.setFontSize(9); doc.setTextColor(110); doc.text(t, x + 75, y + 14, { align: 'center' }); }); }
  doc.setFontSize(9); doc.setTextColor(180, 35, 24); doc.text(AVISO, 297, 815, { align: 'center' });
  doc.save(`${f.archivo}.pdf`);
}

export async function fichaWord(f: FichaDoc) {
  const d = await import('docx');
  const par = (t: string, o: { bold?: boolean; size?: number; color?: string; right?: boolean } = {}) => new d.Paragraph({ alignment: o.right ? d.AlignmentType.RIGHT : undefined, children: [new d.TextRun({ text: t, bold: o.bold, size: o.size, color: o.color })] });
  const celda = (t: string, o: { enc?: boolean; neg?: boolean } = {}) => new d.TableCell({ shading: o.enc ? { fill: '6B1F3B', type: d.ShadingType.CLEAR, color: 'auto' } : undefined,
    children: [new d.Paragraph({ children: [new d.TextRun({ text: t, bold: o.enc || o.neg, color: o.enc ? 'FFFFFF' : undefined, size: 20 })] })] });
  const hijos: (InstanceType<typeof d.Paragraph> | InstanceType<typeof d.Table>)[] = [
    new d.Paragraph({ heading: d.HeadingLevel.HEADING_1, children: [new d.TextRun({ text: `${f.titulo} ${f.numero}`, color: '6B1F3B' })] }),
    par(`Arte Concreto Mobiliario${f.estado ? `  |  Estado: ${f.estado}` : ''}`, { size: 18, color: '555555' }), par(''),
    new d.Table({ width: { size: 100, type: d.WidthType.PERCENTAGE }, rows: f.datos.map(([k, v]) => new d.TableRow({ children: [celda(k, { neg: true }), celda(v)] })) }), par(''),
  ];
  if (f.columnas && f.filas) hijos.push(par(f.tablaTitulo ?? 'Detalle', { bold: true, color: '6B1F3B' }), new d.Table({ width: { size: 100, type: d.WidthType.PERCENTAGE }, rows: [
    new d.TableRow({ tableHeader: true, children: f.columnas.map((c) => celda(c, { enc: true })) }), ...f.filas.map((r) => new d.TableRow({ children: r.map((c) => celda(String(c))) }))] }), par(''));
  f.totales?.forEach(([k, v]) => hijos.push(par(`${k}: ${v}`, { right: true, bold: k.toUpperCase() === k })));
  if (f.notas) hijos.push(par(''), par(f.notas));
  if (f.firmas?.length) hijos.push(par(''), par(''), par(f.firmas.map(() => '______________________').join('   ')), par(f.firmas.join('          '), { size: 16, color: '777777' }));
  hijos.push(par(''), par(AVISO, { size: 16, color: 'B42318' }));
  descargar(await d.Packer.toBlob(new d.Document({ sections: [{ children: hijos }] })), `${f.archivo}.docx`);
}

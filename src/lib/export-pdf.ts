import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportColumn<T> {
  header: string;
  key: keyof T;
}

export function exportToPDF<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[],
  title: string,
  filename: string
) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(title, 14, 20);

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

  autoTable(doc, {
    startY: 35,
    head: [columns.map((c) => c.header)],
    body: data.map((row) =>
      columns.map((c) => String(row[c.key] ?? ''))
    ),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`${filename}.pdf`);
}

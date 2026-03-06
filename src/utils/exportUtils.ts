import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Generate a PDF with a title, optional subtitle, and a data table.
 */
export function exportToPdf(options: {
  filename: string;
  title: string;
  subtitle?: string;
  columns: string[];
  rows: (string | number)[][];
  orientation?: 'portrait' | 'landscape';
}): void {
  const { filename, title, subtitle, columns, rows, orientation = 'portrait' } = options;
  const doc = new jsPDF({ orientation });

  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 22);

  // Subtitle
  if (subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 30);
  }

  // Table
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: subtitle ? 36 : 30,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [5, 150, 105] }, // emerald-600
  });

  doc.save(`${filename}.pdf`);
}

/**
 * Generate an Excel workbook with one or more sheets.
 */
export function exportToExcel(options: {
  filename: string;
  sheets: Array<{
    name: string;
    columns: string[];
    rows: (string | number | null)[][];
  }>;
}): void {
  const { filename, sheets } = options;
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const data = [sheet.columns, ...sheet.rows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto-width columns
    const colWidths = sheet.columns.map((col, i) => {
      const maxLen = Math.max(
        col.length,
        ...sheet.rows.map(row => String(row[i] ?? '').length)
      );
      return { wch: Math.min(maxLen + 2, 40) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 31)); // Excel 31-char limit
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Generate and download a CSV file from column headers + row data.
 */
export function exportToCsv(options: {
  filename: string;
  columns: string[];
  rows: (string | number | null)[][];
}): void {
  const { filename, columns, rows } = options;
  const escape = (v: string | number | null): string => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    columns.map(escape).join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

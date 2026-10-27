import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { translate, Language } from '../i18n/translate';

export interface ReportPdfColumn {
  label: string;
  key: string;
  align?: 'left' | 'right';
}

export interface ReportPdfSection {
  title: string;
  note?: string;
  columns: ReportPdfColumn[];
  rows: Array<Record<string, any>>;
  totalRow?: Record<string, any>;
}

export interface BuildReportPdfOptions {
  title: string;
  hotelName: string;
  branchName: string;
  from: string;
  to: string;
  generatedBy: string;
  generatedAt: string;
  sections: ReportPdfSection[];
  tOrLang?: ((key: any, vars?: any) => string) | Language | string;
}

/**
 * Sanitizes input text so characters are supported by standard PDF fonts (Latin-1).
 * Replaces any unsupported character with "?" instead of failing.
 */
export function sanitizePdfText(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val)
    .replace(/→/g, 'to')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/•/g, '*');

  // In standard PDF Helvetica, character codes 0x20 through 0xFF (plus whitespace) are valid
  return str.replace(/[^\x20-\xFF\r\n\t]/g, '?');
}

/**
 * Formats monetary amounts with commas as thousands separators (no decimal places for FCFA).
 */
export function formatPdfMoney(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0';
  const isNeg = amount < 0;
  const abs = Math.abs(Math.round(amount));
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return isNeg ? `-${formatted}` : formatted;
}

/**
 * Pure function that generates an A4 portrait jsPDF document containing the report sections.
 * Handles header, titles, notes, right-aligned monetary values, wrapping, and "Page X of Y" footer.
 */
export function buildReportPdf(options: BuildReportPdfOptions): jsPDF {
  const tr =
    typeof options.tOrLang === 'function'
      ? options.tOrLang
      : typeof options.tOrLang === 'string'
      ? (k: string, v?: any) => translate(options.tOrLang as Language, k, v)
      : (k: string, v?: any) => translate('en', k, v);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let currentY = 14;

  // Header: Hotel Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(sanitizePdfText(options.hotelName), 14, currentY);
  currentY += 6.5;

  // Report Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(sanitizePdfText(options.title), 14, currentY);
  currentY += 5.5;

  // Header Meta: Branch, Date Range, Printed by
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(
    sanitizePdfText(
      tr('pdf.branchPeriod', { branch: options.branchName, from: options.from, to: options.to })
    ),
    14,
    currentY
  );
  currentY += 4.5;

  doc.text(
    sanitizePdfText(
      tr('pdf.printedBy', { name: options.generatedBy, date: options.generatedAt })
    ),
    14,
    currentY
  );
  currentY += 4;

  // Divider Line
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.4);
  doc.line(14, currentY, 196, currentY);
  currentY += 6;

  // Render each section
  for (let sIdx = 0; sIdx < options.sections.length; sIdx++) {
    const section = options.sections[sIdx];

    // Check remaining space; if too low, move to next page
    if (currentY > 245) {
      doc.addPage();
      currentY = 16;
    }

    // Section Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(sanitizePdfText(section.title), 14, currentY);
    currentY += 4.5;

    // Section Note (if provided)
    if (section.note) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(sanitizePdfText(section.note), 14, currentY);
      currentY += 4;
    }

    // Empty section handling
    if (!section.rows || section.rows.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(sanitizePdfText(tr('pdf.noData')), 14, currentY + 1.5);
      currentY += 9;
      continue;
    }

    const head = [section.columns.map((c) => sanitizePdfText(c.label))];
    const body = section.rows.map((row) =>
      section.columns.map((c) => sanitizePdfText(row[c.key]))
    );

    const foot = section.totalRow
      ? [section.columns.map((c) => sanitizePdfText(section.totalRow![c.key]))]
      : undefined;

    const columnStyles: Record<number, any> = {};
    section.columns.forEach((col, idx) => {
      if (col.align === 'right') {
        columnStyles[idx] = { halign: 'right' };
      }
    });

    const tableFontSize = section.columns.length > 5 ? 7 : 8;

    autoTable(doc, {
      startY: currentY,
      head,
      body,
      foot,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: tableFontSize,
        cellPadding: 1.8,
        overflow: 'linebreak',
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: tableFontSize
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: tableFontSize
      },
      columnStyles,
      margin: { left: 14, right: 14 },
      tableWidth: 182
    });

    const finalY = (doc as any).lastAutoTable?.finalY;
    currentY = (finalY || currentY) + 7;
  }

  // Add "Page X of Y" footer to every page
  const pageCount = typeof (doc as any).getNumberOfPages === 'function'
    ? (doc as any).getNumberOfPages()
    : doc.internal.pages
    ? doc.internal.pages.length - 1
    : 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(sanitizePdfText(tr('pdf.pageOf', { page: i, total: pageCount })), 105, 290, { align: 'center' });
  }

  return doc;
}

/**
 * Triggers browser download of a jsPDF document.
 */
export function downloadReportPdf(filename: string, doc: jsPDF): void {
  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(safeFilename);
}

import { describe, it, expect } from 'vitest';
import { buildReportPdf, sanitizePdfText, formatPdfMoney } from '../src/utils/reportPdf';

describe('PDF helpers', () => {
  it('formats money with thousands separators and a minus sign', () => {
    expect(formatPdfMoney(1234567)).toBe('1,234,567'); expect(formatPdfMoney(-7500)).toBe('-7,500'); expect(formatPdfMoney(NaN)).toBe('0');
  });
  it('keeps accents, replaces unsupported characters with ?', () => {
    expect(sanitizePdfText('Café déjà vu — Hôtel')).toBe('Café déjà vu - Hôtel');
    expect(sanitizePdfText('Hi 😀 ŋ')).toBe('Hi ?? ?');
    expect(sanitizePdfText(null)).toBe('');
  });
});

describe('buildReportPdf', () => {
  const base = { title: 'Full Report', hotelName: 'Hôtel Mont Fébé', branchName: 'Main', from: '2026-11-01', to: '2026-11-30', generatedBy: 'Mia', generatedAt: '2026-11-30 18:00' };
  const many = Array.from({ length: 90 }, (_, i) => ({ name: i % 7 === 0 ? 'Jean-Pierre Nkoulou Mbarga of a Very Long Family Name' : 'Ann', amount: formatPdfMoney(i % 5 === 0 ? -7500 : 25000 * (i + 1)) }));
  const sections = [
    { title: 'S1', note: 'A note', columns: [{ label: 'Name', key: 'name' }, { label: 'Amount (FCFA)', key: 'amount', align: 'right' as const }], rows: many.slice(0, 3), totalRow: { name: 'Total', amount: '27,500' } },
    { title: 'S2 empty', columns: [{ label: 'A', key: 'a' }], rows: [] },
    { title: 'S3 long', columns: [{ label: 'Name', key: 'name' }, { label: 'Amount (FCFA)', key: 'amount', align: 'right' as const }], rows: many }
  ];
  it('builds a multi-page A4 document with a footer on every page, in English', () => {
    const doc = buildReportPdf({ ...base, sections, tOrLang: 'en' });
    const pages = doc.getNumberOfPages();
    expect(pages).toBeGreaterThan(1);
    const raw = doc.output();
    expect(raw.startsWith('%PDF-')).toBe(true);
    for (let p = 1; p <= pages; p++) expect(raw).toContain(`Page ${p} of ${pages}`);
    expect(raw).toContain('No data for this period');
    expect(raw).toContain('Printed by Mia');
  });
  it('uses the French wording when asked for French', () => {
    const doc = buildReportPdf({ ...base, sections, tOrLang: 'fr' });
    const pages = doc.getNumberOfPages(); const raw = doc.output();
    expect(raw).toContain(`Page 1 sur ${pages}`);
    expect(raw).toContain('Aucune donn');
    expect(raw).toContain('Imprim');
  });
  it('does not fail on an empty report or unsupported characters', () => {
    expect(() => buildReportPdf({ ...base, sections: [], tOrLang: 'en' })).not.toThrow();
    expect(() => buildReportPdf({ ...base, hotelName: 'Hotel 😀', sections: [{ title: '😀', columns: [{ label: 'ŋ', key: 'a' }], rows: [{ a: '😀' }] }], tOrLang: 'fr' })).not.toThrow();
  });
});

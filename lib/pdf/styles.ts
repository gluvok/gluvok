/**
 * @file lib/pdf/styles.ts
 * @description PDF generation template or style definition for exports (styles).
 */

export const PDF_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 40px; line-height: 1.5; background-color: #ffffff; }
  header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 32px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand-text { display: flex; flex-direction: column; }
  h1 { font-size: 26px; font-weight: 700; color: #0f172a; margin: 0; letter-spacing: -0.02em; }
  .subtitle { margin: 4px 0 0 0; font-size: 13px; color: #64748b; font-weight: 500; }
  .meta { font-size: 12px; color: #64748b; text-align: right; line-height: 1.5; }
  .meta-value { color: #0f172a; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  th { background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600; text-align: left; padding: 12px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  tr:nth-child(even) td { background-color: #f8fafc; }
  footer { text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 60px; font-weight: 500; }
  
  @page {
    size: auto;
    margin: 0mm;
  }
  
  @media print {
    body { padding: 20mm; margin: 0; }
    header { margin-bottom: 24px; }
    footer { position: fixed; bottom: 20mm; left: 20mm; right: 20mm; width: auto; margin-top: 0; }
  }
`;

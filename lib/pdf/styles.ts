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
  td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; vertical-align: middle; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  tr:nth-child(even) td { background-color: #f8fafc; }

  .pdf-cell-thumbs { display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
  .pdf-cell-thumb { width: 36px; height: 36px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1; }

  .pdf-scans-header { margin-top: 36px; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
  .pdf-scans-header h2 { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; }
  .pdf-scans-grid { display: flex; flex-direction: column; gap: 20px; }
  .pdf-scan-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background-color: #f8fafc; page-break-inside: avoid; break-inside: avoid; }
  .pdf-scan-card-header { font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 10px; }
  .pdf-scan-card-images { display: flex; flex-wrap: wrap; gap: 12px; }
  .pdf-scan-img-container { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .pdf-scan-full-img { max-width: 220px; max-height: 160px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; }
  .pdf-scan-caption { font-size: 10px; color: #64748b; }

  footer { text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 60px; font-weight: 500; }
  
  @page {
    size: auto;
    margin: 0mm;
  }
  
  @media print {
    body { padding: 20mm; margin: 0; }
    header { margin-bottom: 24px; }
    .pdf-scan-card { page-break-inside: avoid; break-inside: avoid; }
    footer { position: fixed; bottom: 20mm; left: 20mm; right: 20mm; width: auto; margin-top: 0; }
  }
`;

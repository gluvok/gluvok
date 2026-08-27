/**
 * @file lib/pdf/styles.ts
 * @description PDF generation template or style definition for exports (styles).
 */

export const PDF_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  
  @page {
    size: auto;
    margin: 0mm;
  }

  html, body {
    margin: 0;
    padding: 0;
    min-height: 100%;
    background-color: #ffffff;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #0f172a;
    padding: 15mm 20mm 20mm 20mm;
    line-height: 1.5;
    background-color: #ffffff;
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .pdf-content-wrapper {
    flex: 1 0 auto;
    width: 100%;
    padding-bottom: 25mm;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #f1f5f9;
    padding-bottom: 20px;
    margin-bottom: 24px;
  }

  .brand { display: flex; align-items: center; gap: 12px; }
  .brand-text { display: flex; flex-direction: column; }
  h1 { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0; letter-spacing: -0.02em; }
  .subtitle { margin: 4px 0 0 0; font-size: 13px; color: #64748b; font-weight: 500; }
  .meta { font-size: 12px; color: #64748b; text-align: right; line-height: 1.5; }
  .meta-value { color: #0f172a; font-weight: 600; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600; text-align: left; padding: 10px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; vertical-align: middle; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  tr:nth-child(even) td { background-color: #f8fafc; }

  .pdf-cell-thumbs { display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
  .pdf-cell-thumb { width: 36px; height: 36px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1; }

  .pdf-images-section {
    margin-top: 12px;
    margin-bottom: 20px;
  }

  .pdf-scans-header {
    margin-top: 0;
    margin-bottom: 12px;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 6px;
    page-break-after: avoid;
    break-after: avoid;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .pdf-scans-header h2 {
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
    page-break-after: avoid;
    break-after: avoid;
  }

  .pdf-scans-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 10px;
    margin-bottom: 16px;
  }

  .pdf-scan-card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 16px;
    background-color: #f8fafc;
    page-break-inside: avoid;
    break-inside: avoid;
    margin-top: 12mm;
    margin-bottom: 6mm;
  }

  .pdf-scan-card:first-child {
    page-break-before: avoid;
    break-before: avoid;
    margin-top: 0;
  }

  .pdf-scan-card-header { font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 10px; }
  .pdf-scan-card-images { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 8px; margin-bottom: 8px; }
  .pdf-scan-img-container { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-top: 4px; margin-bottom: 4px; }
  .pdf-scan-full-img { max-width: 220px; max-height: 160px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; margin-top: 4px; margin-bottom: 4px; }
  .pdf-scan-caption { font-size: 10px; color: #64748b; margin-top: 2px; }

  footer {
    position: fixed;
    bottom: 12mm;
    left: 20mm;
    right: 20mm;
    border-top: 1px solid #f1f5f9;
    padding-top: 10px;
    text-align: center;
    font-size: 11px;
    color: #94a3b8;
    font-weight: 500;
  }
  
  @media print {
    @page {
      size: auto;
      margin: 0mm;
    }
    html, body {
      min-height: 100%;
      height: auto;
    }
    body {
      padding: 15mm 20mm 20mm 20mm;
      margin: 0;
      position: relative;
    }
    .pdf-content-wrapper {
      padding-bottom: 25mm;
    }
    header { margin-bottom: 20px; }
    .pdf-scans-header { page-break-after: avoid; break-after: avoid; page-break-inside: avoid; break-inside: avoid; }
    .pdf-scans-header h2 { page-break-after: avoid; break-after: avoid; }
    .pdf-scan-card {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-top: 12mm;
      margin-bottom: 6mm;
    }
    .pdf-scan-card:first-child {
      page-break-before: avoid;
      break-before: avoid;
      margin-top: 0;
    }
    footer {
      position: fixed;
      bottom: 12mm;
      left: 20mm;
      right: 20mm;
      width: auto;
      border-top: 1px solid #f1f5f9;
      padding-top: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
  }
`;

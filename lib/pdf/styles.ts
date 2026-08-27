/**
 * @file lib/pdf/styles.ts
 * @description PDF generation print styles and pagination rules.
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
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .pdf-scan-card {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .pdf-scan-card:first-child {
    page-break-before: avoid;
    break-before: avoid;
    margin-top: 0;
  }

  .pdf-scans-header {
    page-break-after: avoid;
    break-after: avoid;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  footer {
    position: fixed;
    bottom: 12mm;
    left: 20mm;
    right: 20mm;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  @media print {
    @page {
      size: auto;
      margin: 0mm;
    }
    body {
      padding: 15mm 20mm 20mm 20mm;
      margin: 0;
      position: relative;
    }
    .pdf-content-wrapper {
      padding-bottom: 25mm;
    }
    footer {
      position: fixed;
      bottom: 12mm;
      left: 20mm;
      right: 20mm;
    }
  }
`;

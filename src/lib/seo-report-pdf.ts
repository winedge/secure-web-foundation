import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Brand palette (RGB)
const NAVY: [number, number, number] = [15, 23, 42];
const NAVY_SOFT: [number, number, number] = [30, 41, 59];
const EMERALD: [number, number, number] = [16, 185, 129];
const AMBER: [number, number, number] = [245, 158, 11];
const RED: [number, number, number] = [220, 38, 38];
const MUTED: [number, number, number] = [100, 116, 139];
const LIGHT: [number, number, number] = [241, 245, 249];
const WHITE: [number, number, number] = [255, 255, 255];
const BORDER: [number, number, number] = [226, 232, 240];

type Scan = {
  id: string;
  url: string;
  overall_score: number | null;
  pages_crawled: number;
  errors_count: number;
  warnings_count: number;
  summary: Record<string, any>;
  created_at: string;
};

type Issue = {
  id: string;
  severity: string;
  category: string;
  message: string;
  recommendation: string | null;
  page_url: string | null;
};

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

function sevColor(sev: string): [number, number, number] {
  if (sev === 'critical' || sev === 'error') return RED;
  if (sev === 'warning') return AMBER;
  return MUTED;
}

function scoreColor(score: number): [number, number, number] {
  if (score >= 80) return EMERALD;
  if (score >= 60) return AMBER;
  return RED;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - 22) {
    doc.addPage();
    return MARGIN + 4;
  }
  return y;
}

function sectionHeader(doc: jsPDF, title: string, y: number): number {
  y = ensureSpace(doc, y, 18);
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, y, 3, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text(title, MARGIN + 6, y + 6);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y + 11, PAGE_W - MARGIN, y + 11);
  return y + 16;
}

function kv(doc: jsPDF, label: string, value: string, y: number): number {
  y = ensureSpace(doc, y, 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(label.toUpperCase(), MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY_SOFT);
  const lines = doc.splitTextToSize(value || '|', CONTENT_W);
  doc.text(lines, MARGIN, y + 5);
  return y + 5 + lines.length * 4.5 + 3;
}

function checkRow(doc: jsPDF, label: string, ok: boolean, x: number, y: number, w: number) {
  const color = ok ? EMERALD : RED;
  doc.setFillColor(...color);
  doc.circle(x + 2.5, y - 1.5, 1.8, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY_SOFT);
  const lines = doc.splitTextToSize(label, w - 8);
  doc.text(lines, x + 7, y);
}

function addFooters(doc: jsPDF, generated: string) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, PAGE_H - 14, PAGE_W - MARGIN, PAGE_H - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('SEO Deep Scan Report  |  ABA 512 / GDPR / EU AI Act compliant', MARGIN, PAGE_H - 9);
    doc.text(`Generated ${generated}`, PAGE_W / 2, PAGE_H - 9, { align: 'center' });
    doc.text(`Page ${i} of ${total}`, PAGE_W - MARGIN, PAGE_H - 9, { align: 'right' });
  }
}

function coverPage(doc: jsPDF, scan: Scan) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Accent bar
  doc.setFillColor(...EMERALD);
  doc.rect(0, 0, 6, PAGE_H, 'F');

  // Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...EMERALD);
  doc.text('SEO INTELLIGENCE  |  2026', MARGIN, 28);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(34);
  doc.setTextColor(...WHITE);
  doc.text('SEO Deep Scan', MARGIN, 70);
  doc.text('Report', MARGIN, 84);

  // URL
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(203, 213, 225);
  const urlLines = doc.splitTextToSize(scan.url, CONTENT_W);
  doc.text(urlLines, MARGIN, 100);

  // Score panel
  const score = scan.overall_score ?? 0;
  const [r, g, b] = scoreColor(score);
  doc.setFillColor(r, g, b);
  doc.roundedRect(MARGIN, 130, 80, 80, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(56);
  doc.setTextColor(...WHITE);
  doc.text(String(score), MARGIN + 40, 178, { align: 'center' });
  doc.setFontSize(10);
  doc.text('OVERALL SCORE / 100', MARGIN + 40, 195, { align: 'center' });

  // Metric stack
  const mx = MARGIN + 90;
  const metrics: Array<[string, string]> = [
    ['Pages Crawled', String(scan.pages_crawled)],
    ['Errors', String(scan.errors_count)],
    ['Warnings', String(scan.warnings_count)],
    ['Scan Date', new Date(scan.created_at).toLocaleDateString()],
  ];
  let my = 138;
  metrics.forEach(([k, v]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(k.toUpperCase(), mx, my);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...WHITE);
    doc.text(v, mx, my + 7);
    my += 18;
  });

  // Footer compliance
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('ABA 512  |  GDPR  |  EU AI Act compliant', MARGIN, PAGE_H - 20);
  doc.setFontSize(8);
  doc.text(`Generated ${new Date().toLocaleString()}`, MARGIN, PAGE_H - 14);
}

export function generateSeoReportPdf(scan: Scan, issues: Issue[]) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const summary = scan.summary || {};
  const generated = new Date().toLocaleString();

  // 1. Cover
  coverPage(doc, scan);

  // 2. Executive summary page
  doc.addPage();
  let y = MARGIN + 4;
  y = sectionHeader(doc, 'Executive Summary', y);
  const aiSummary = (summary.ai_summary as string) || 'No AI summary was generated for this scan.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY_SOFT);
  const summaryLines = doc.splitTextToSize(aiSummary, CONTENT_W);
  summaryLines.forEach((line: string) => {
    y = ensureSpace(doc, y, 5);
    doc.text(line, MARGIN, y);
    y += 5;
  });
  y += 4;

  // Page vitals
  y = sectionHeader(doc, 'Page Vitals', y);
  y = kv(doc, `Title (${(summary.title?.length ?? 0)} chars)`, summary.title || '|', y);
  y = kv(doc, `Meta Description (${(summary.description?.length ?? 0)} chars)`, summary.description || '|', y);

  const stats: Array<[string, string]> = [
    ['Word Count', String(summary.word_count ?? 0)],
    ['Internal Links', String(summary.internal_links ?? 0)],
    ['External Links', String(summary.external_links ?? 0)],
    ['Images', `${summary.images ?? 0} (${summary.images_missing_alt ?? 0} missing alt)`],
    ['Headings', `H1: ${summary.h1_count ?? 0}  H2: ${summary.h2_count ?? 0}  H3: ${summary.h3_count ?? 0}`],
    ['Schema Types', (summary.schema_types || []).join(', ') || '|'],
  ];
  y = ensureSpace(doc, y, 8 + stats.length * 7);
  const colW = CONTENT_W / 2;
  stats.forEach((row, i) => {
    const col = i % 2;
    const rowI = Math.floor(i / 2);
    const x = MARGIN + col * colW;
    const ry = y + rowI * 13;
    doc.setFillColor(...LIGHT);
    doc.roundedRect(x, ry, colW - 3, 11, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(row[0].toUpperCase(), x + 3, ry + 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(doc.splitTextToSize(row[1], colW - 8)[0], x + 3, ry + 9);
  });
  y += Math.ceil(stats.length / 2) * 13 + 4;

  // 3. Site Health Checks
  y = sectionHeader(doc, 'Site Health Checks', y);
  const sec = summary.security_headers || {};
  const checks: Array<[string, boolean, string]> = [
    ['robots.txt', !!summary.has_robots_txt, 'Crawl & AI'],
    ['sitemap.xml', !!summary.has_sitemap, 'Crawl & AI'],
    ['llms.txt (AI readiness)', !!summary.has_llms_txt, 'Crawl & AI'],
    ['hreflang', !!summary.has_hreflang, 'Crawl & AI'],
    ['HSTS', !!sec.hsts, 'Security'],
    ['Content-Security-Policy', !!sec.csp, 'Security'],
    ['X-Content-Type-Options', !!sec.xcto, 'Security'],
    ['Referrer-Policy', !!sec.referrer, 'Security'],
    ['Canonical', !!summary.has_canonical, 'On-Page'],
    ['Viewport', !!summary.has_viewport, 'On-Page'],
    ['Open Graph', !!summary.has_og, 'On-Page'],
    ['Twitter Cards', !!summary.has_twitter, 'On-Page'],
    ['JSON-LD', !!summary.has_json_ld, 'On-Page'],
    ['Favicon', !!summary.has_favicon, 'On-Page'],
  ];
  const checkColW = CONTENT_W / 2;
  const ROW_H = 7;
  for (let i = 0; i < checks.length; i += 2) {
    y = ensureSpace(doc, y, ROW_H);
    checkRow(doc, checks[i][0], checks[i][1], MARGIN, y + 2, checkColW);
    if (checks[i + 1]) {
      checkRow(doc, checks[i + 1][0], checks[i + 1][1], MARGIN + checkColW, y + 2, checkColW);
    }
    y += ROW_H;
  }
  y += 6;

  // 4. Priority Actions
  const actions: any[] = Array.isArray(summary.priority_actions) ? summary.priority_actions : [];
  if (actions.length) {
    y = sectionHeader(doc, `Priority Actions (${actions.length})`, y);
    actions.forEach((a) => {
      const actionText = String(a.action || '');
      const lines = doc.splitTextToSize(actionText, CONTENT_W - 8);
      const blockH = 14 + lines.length * 4.5;
      y = ensureSpace(doc, y, blockH + 4);
      doc.setFillColor(...LIGHT);
      doc.roundedRect(MARGIN, y, CONTENT_W, blockH, 2, 2, 'F');
      doc.setFillColor(...EMERALD);
      doc.rect(MARGIN, y, 2, blockH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...NAVY);
      doc.text(String(a.title || 'Action'), MARGIN + 5, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      const meta = [
        a.impact ? `Impact: ${a.impact}` : null,
        a.effort ? `Effort: ${a.effort}` : null,
        a.category ? String(a.category) : null,
      ].filter(Boolean).join('   |   ');
      doc.text(meta, MARGIN + 5, y + 11);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...NAVY_SOFT);
      doc.text(lines, MARGIN + 5, y + 16);
      y += blockH + 4;
    });
  }

  // 5. Issues table
  if (issues.length) {
    doc.addPage();
    y = MARGIN + 4;
    y = sectionHeader(doc, `All Issues (${issues.length})`, y);
    const sevOrder: Record<string, number> = { critical: 0, error: 1, warning: 2, info: 3 };
    const sorted = [...issues].sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9));
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, bottom: 18 },
      head: [['Severity', 'Category', 'Issue', 'Recommendation', 'Page']],
      body: sorted.map((i) => [
        i.severity.toUpperCase(),
        i.category,
        i.message,
        i.recommendation || '|',
        i.page_url || '|',
      ]),
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.5, textColor: NAVY_SOFT, lineColor: BORDER, lineWidth: 0.1, valign: 'top' },
      headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 18, fontStyle: 'bold' },
        1: { cellWidth: 22 },
        2: { cellWidth: 50 },
        3: { cellWidth: 58 },
        4: { cellWidth: 'auto', textColor: MUTED, fontSize: 7.5 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          const sev = String(data.cell.raw).toLowerCase();
          data.cell.styles.textColor = sevColor(sev);
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // 6. Pages crawled table
  const pageReports: any[] = Array.isArray(summary.page_reports) ? summary.page_reports : [];
  if (pageReports.length) {
    y = ensureSpace(doc, y, 20);
    y = sectionHeader(doc, `Pages Crawled (${pageReports.length})`, y);
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, bottom: 18 },
      head: [['URL', 'Title', 'Words', 'H1', 'Alt-missing', 'Issues']],
      body: pageReports.map((p) => {
        const pUrl = typeof p.url === 'string' ? p.url : (p.url?.url ?? '');
        const pTitle = typeof p.title === 'string' && p.title ? p.title : (typeof p.url === 'object' ? p.url?.title : '') || '|';
        return [pUrl, pTitle, String(p.wordCount ?? 0), String(p.h1Count ?? 0), String(p.imagesMissingAlt ?? 0), String(p.issueCount ?? 0)];
      }),
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, textColor: NAVY_SOFT, lineColor: BORDER, lineWidth: 0.1 },
      headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 65, fontSize: 7 },
        1: { cellWidth: 55 },
        2: { cellWidth: 14, halign: 'right' },
        3: { cellWidth: 12, halign: 'right' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 'auto', halign: 'right' },
      },
    });
  }

  // 7. Additional AI Recommendations
  if (summary.ai_recommendations) {
    doc.addPage();
    let ay = MARGIN + 4;
    ay = sectionHeader(doc, 'Additional AI Recommendations', ay);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY_SOFT);
    const lines = doc.splitTextToSize(String(summary.ai_recommendations), CONTENT_W);
    lines.forEach((line: string) => {
      ay = ensureSpace(doc, ay, 5);
      doc.text(line, MARGIN, ay);
      ay += 5;
    });
  }

  addFooters(doc, generated);

  const slug = (scan.url || 'report').replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
  doc.save(`seo-deep-scan-${slug}-${scan.id.slice(0, 8)}.pdf`);
}

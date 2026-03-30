import type { jsPDF } from "jspdf";

type JsPDFWithAutoTable = InstanceType<typeof import("jspdf").jsPDF> & {
  lastAutoTable: { finalY: number };
};

export interface ReportPdfData {
  totalLeads: number;
  closedDeals: number;
  conversionRate: string | number;
  sources: { name: string; value: number }[];
  agents: { name: string; count: number; deals: number; rate?: string }[];
  generatedAt?: Date;
}

interface PdfLabels {
  reportTitle: string;
  generatedOn: string;
  totalLeads: string;
  closedDeals: string;
  conversionRate: string;
  leadSources: string;
  source: string;
  leads: string;
  teamPerformance: string;
  agent: string;
  deals: string;
  rate: string;
  arabicNote?: string;
}

const EN_LABELS: PdfLabels = {
  reportTitle: "Performance Report",
  generatedOn: "Generated on",
  totalLeads: "Total Leads",
  closedDeals: "Closed Deals",
  conversionRate: "Conversion Rate",
  leadSources: "Lead Sources",
  source: "Source",
  leads: "Leads",
  teamPerformance: "Team Performance",
  agent: "Agent",
  deals: "Deals",
  rate: "Rate",
};

const AR_LABELS: PdfLabels = {
  reportTitle: "تقرير الأداء",
  generatedOn: "تم الإنشاء في",
  totalLeads: "إجمالي الليدز",
  closedDeals: "الصفقات المغلقة",
  conversionRate: "نسبة التحويل",
  leadSources: "مصادر الليدز",
  source: "المصدر",
  leads: "الليدز",
  teamPerformance: "أداء الفريق",
  agent: "المندوب",
  deals: "الصفقات",
  rate: "النسبة",
};

let cairoFontBase64: string | null = null;

async function loadCairoFont(): Promise<string | null> {
  if (cairoFontBase64 !== null) return cairoFontBase64;
  try {
    const res = await fetch("/cairo-regular-b64.txt");
    if (!res.ok) return null;
    const b64 = await res.text();
    cairoFontBase64 = b64.trim().replace(/\s+/g, "");
    return cairoFontBase64;
  } catch {
    return null;
  }
}

function addCairoFont(doc: JsPDFWithAutoTable, fontBase64: string): void {
  doc.addFileToVFS("Cairo-Regular.ttf", fontBase64);
  doc.addFont("Cairo-Regular.ttf", "Cairo", "normal");
  doc.addFileToVFS("Cairo-Regular-bold.ttf", fontBase64);
  doc.addFont("Cairo-Regular-bold.ttf", "Cairo", "bold");
}

function reverseArabicText(text: string): string {
  return text.split("").reverse().join("");
}

export async function generateReportPdf(
  data: ReportPdfData,
  language: "ar" | "en",
  fileName?: string
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const isAr = language === "ar";
  const labels = isAr ? AR_LABELS : EN_LABELS;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  }) as JsPDFWithAutoTable;

  const pageW = doc.internal.pageSize.getWidth();

  let arabicFontLoaded = false;
  if (isAr) {
    const fontB64 = await loadCairoFont();
    if (fontB64) {
      addCairoFont(doc, fontB64);
      arabicFontLoaded = true;
    }
  }

  const setBodyFont = (style: "normal" | "bold" = "normal") => {
    if (isAr && arabicFontLoaded) {
      doc.setFont("Cairo", style);
    } else {
      doc.setFont("helvetica", style);
    }
  };

  const now = (data.generatedAt ?? new Date()).toLocaleDateString(
    isAr ? "ar-EG" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  const headerHeight = 42;

  // Header banner
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageW, headerHeight, "F");

  // Logo mark
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(11, 6, 22, 22, 3, 3, "F");
  doc.setTextColor(99, 102, 241);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("H", 22, 21, { align: "center" });

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  setBodyFont("bold");
  doc.text("HomeAdvisor CRM", isAr ? pageW - 38 : 38, 15, {
    align: isAr ? "right" : "left",
  });

  // Report title
  doc.setFontSize(10);
  setBodyFont("normal");
  doc.setTextColor(220, 220, 255);
  doc.text(labels.reportTitle, isAr ? pageW - 38 : 38, 25, {
    align: isAr ? "right" : "left",
  });

  // Date
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 240);
  const dateText = `${labels.generatedOn}: ${now}`;
  doc.text(dateText, isAr ? pageW - 38 : 38, 33, {
    align: isAr ? "right" : "left",
  });

  doc.setTextColor(17, 24, 39);
  let y = headerHeight + 8;

  // KPI cards row
  const cardW = 54;
  const cardH = 22;
  const cardGap = 14;
  const cardY = y;

  doc.setFillColor(245, 243, 255);
  doc.roundedRect(14, cardY, cardW, cardH, 3, 3, "F");
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14 + cardW + cardGap, cardY, cardW, cardH, 3, 3, "F");
  doc.setFillColor(255, 247, 237);
  doc.roundedRect(14 + (cardW + cardGap) * 2, cardY, cardW, cardH, 3, 3, "F");

  const cx1 = 14 + cardW / 2;
  const cx2 = 14 + cardW + cardGap + cardW / 2;
  const cx3 = 14 + (cardW + cardGap) * 2 + cardW / 2;

  doc.setFontSize(18);
  setBodyFont("bold");
  doc.setTextColor(99, 102, 241);
  doc.text(String(data.totalLeads), cx1, cardY + 11, { align: "center" });
  doc.setTextColor(22, 163, 74);
  doc.text(String(data.closedDeals), cx2, cardY + 11, { align: "center" });
  doc.setTextColor(234, 88, 12);
  doc.text(`${data.conversionRate}%`, cx3, cardY + 11, { align: "center" });

  doc.setFontSize(8);
  setBodyFont("normal");
  doc.setTextColor(107, 114, 128);
  doc.text(labels.totalLeads, cx1, cardY + 19, { align: "center" });
  doc.text(labels.closedDeals, cx2, cardY + 19, { align: "center" });
  doc.text(labels.conversionRate, cx3, cardY + 19, { align: "center" });

  y = cardY + cardH + 10;

  const tableStyles = {
    fontSize: 9,
    cellPadding: 3,
    ...(isAr && arabicFontLoaded ? { font: "Cairo" } : {}),
  };
  const headStyles = {
    fillColor: [99, 102, 241] as [number, number, number],
    textColor: 255 as number,
    fontStyle: "bold" as const,
    ...(isAr && arabicFontLoaded ? { font: "Cairo" } : {}),
  };

  if (data.sources.length > 0) {
    doc.setFontSize(11);
    setBodyFont("bold");
    doc.setTextColor(17, 24, 39);
    doc.text(labels.leadSources, isAr ? pageW - 14 : 14, y, {
      align: isAr ? "right" : "left",
    });
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [[labels.source, labels.leads]],
      body: data.sources.map((s) => [s.name, s.value]),
      theme: "striped",
      styles: tableStyles,
      headStyles,
      columnStyles: { 1: { halign: "center" } },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (data.agents.length > 0) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(11);
    setBodyFont("bold");
    doc.setTextColor(17, 24, 39);
    doc.text(labels.teamPerformance, isAr ? pageW - 14 : 14, y, {
      align: isAr ? "right" : "left",
    });
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [[labels.agent, labels.leads, labels.deals, labels.rate]],
      body: data.agents.map((a) => [
        a.name,
        a.count,
        a.deals,
        a.rate ?? (a.count > 0 ? `${((a.deals / a.count) * 100).toFixed(1)}%` : "0%"),
      ]),
      theme: "striped",
      styles: tableStyles,
      headStyles,
      columnStyles: {
        1: { halign: "center" },
        2: { halign: "center" },
        3: { halign: "center" },
      },
      margin: { left: 14, right: 14 },
    });
  }

  const outputFileName =
    fileName ??
    `report-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(outputFileName);
}

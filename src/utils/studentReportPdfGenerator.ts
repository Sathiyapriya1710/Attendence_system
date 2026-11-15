import { jsPDF } from 'jspdf';
import { Student } from '../types';
import { formatStudentReportDate, formatFullReportDate } from './dateUtils';

export interface StudentDateEntry {
  date: string; // YYYY-MM-DD
  status: 'present' | 'leave' | 'od';
  reason?: string;
}

export interface StudentMonthStats {
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  odDays: number;
  presentPercentage: number;
}

export interface StudentReportPdfData {
  student: Student;
  className: string;
  monthLabel: string;
  stats: StudentMonthStats;
  presentDates: StudentDateEntry[];
  leaveDates: StudentDateEntry[];
  odDates: StudentDateEntry[];
}

export function generateStudentReportPDFDocument(data: StudentReportPdfData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 18;

  // Header Banner Background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('STUDENT ATTENDANCE REPORT', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    `Class: ${data.className} | Period: ${data.monthLabel}`,
    margin,
    20
  );

  y = 36;

  // Student Details Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 2, 2, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`${data.student.name} (#${data.student.sNo})`, margin + 5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Register No: ${data.student.regNo}`, margin + 5, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text(`Present %: ${data.stats.presentPercentage}%`, pageWidth - margin - 50, y + 14);

  y += 28;

  // 5 Metric Summary Cards
  const totalCards = 5;
  const gap = 3;
  const cardWidth = (pageWidth - margin * 2 - gap * (totalCards - 1)) / totalCards;
  const cardHeight = 18;

  drawMetricCard(doc, margin, y, cardWidth, cardHeight, 'WORKING DAYS', `${data.stats.workingDays}`, [71, 85, 105], [241, 245, 249]);
  drawMetricCard(doc, margin + (cardWidth + gap), y, cardWidth, cardHeight, 'PRESENT', `${data.stats.presentDays}`, [22, 163, 74], [240, 253, 244]);
  drawMetricCard(doc, margin + (cardWidth + gap) * 2, y, cardWidth, cardHeight, 'LEAVE (ABS)', `${data.stats.leaveDays}`, [220, 38, 38], [254, 242, 242]);
  drawMetricCard(doc, margin + (cardWidth + gap) * 3, y, cardWidth, cardHeight, 'ON DUTY (OD)', `${data.stats.odDays}`, [37, 99, 235], [239, 246, 255]);
  drawMetricCard(doc, margin + (cardWidth + gap) * 4, y, cardWidth, cardHeight, 'PRESENT %', `${data.stats.presentPercentage}%`, [13, 148, 136], [240, 253, 250]);

  y += cardHeight + 10;

  // 1. Present Section
  y = renderDateListSection(
    doc,
    `Present (${data.presentDates.length} days)`,
    data.presentDates,
    false,
    y,
    [22, 163, 74],
    margin,
    pageWidth,
    pageHeight
  );

  // 2. Absent - Leave Section (with reasons)
  y = renderDateListSection(
    doc,
    `Absent - Leave (${data.leaveDates.length} ${data.leaveDates.length === 1 ? 'day' : 'days'})`,
    data.leaveDates,
    true,
    y,
    [220, 38, 38],
    margin,
    pageWidth,
    pageHeight
  );

  // 3. On Duty - OD Section (with reasons)
  y = renderDateListSection(
    doc,
    `On Duty - OD (${data.odDates.length} ${data.odDates.length === 1 ? 'day' : 'days'})`,
    data.odDates,
    true,
    y,
    [37, 99, 235],
    margin,
    pageWidth,
    pageHeight
  );

  // Footer notes on every page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `CR Attendance App • Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  return doc;
}

export async function downloadStudentReportPDF(
  data: StudentReportPdfData
): Promise<{ success: boolean; method: string }> {
  try {
    const doc = generateStudentReportPDFDocument(data);
    const fileName = `${data.student.name.replace(/\s+/g, '_')}_Attendance_Report.pdf`;
    const pdfBlob = doc.output('blob');

    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth <= 768;

    if (isMobile && typeof navigator !== 'undefined' && 'canShare' in navigator) {
      try {
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
        if (navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            files: [pdfFile],
            title: `Student Attendance Report - ${data.student.name}`,
            text: `Attendance report for ${data.student.name} (${data.monthLabel})`,
          });
          return { success: true, method: 'shared' };
        }
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') return { success: true, method: 'aborted' };
      }
    }

    const blobUrl = URL.createObjectURL(pdfBlob);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isIOS) {
      window.open(blobUrl, '_blank');
      return { success: true, method: 'opened_ios' };
    }

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 5000);

    return { success: true, method: 'downloaded' };
  } catch (err: any) {
    console.error('Failed to download student report PDF:', err);
    return { success: false, method: 'error' };
  }
}

function drawMetricCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
  textColor: [number, number, number],
  bgColor: [number, number, number]
) {
  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
  doc.roundedRect(x, y, width, height, 2, 2, 'F');

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text(label, x + width / 2, y + 6, { align: 'center' });

  doc.setFontSize(12);
  doc.text(value, x + width / 2, y + 14, { align: 'center' });
}

function renderDateListSection(
  doc: jsPDF,
  title: string,
  entries: StudentDateEntry[],
  showReason: boolean,
  currentY: number,
  color: [number, number, number],
  margin: number,
  pageWidth: number,
  pageHeight: number
): number {
  let y = currentY;

  if (y + 16 > pageHeight - 20) {
    doc.addPage();
    y = 20;
  }

  // Section Header bar
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(margin, y, 3, 6, 'F');

  doc.setTextColor(color[0], color[1], color[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title, margin + 6, y + 5);

  y += 10;

  if (entries.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('None', margin + 6, y);
    return y + 8;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  entries.forEach((entry) => {
    if (y + 6 > pageHeight - 15) {
      doc.addPage();
      y = 20;
    }

    const formattedDate = formatStudentReportDate(entry.date);
    let lineText = `- ${formattedDate}`;

    if (showReason) {
      const reasonText = entry.reason && entry.reason.trim() ? entry.reason.trim() : 'No reason given';
      lineText += ` - ${reasonText}`;
    }

    doc.text(lineText, margin + 6, y);
    y += 5.5;
  });

  return y + 4;
}

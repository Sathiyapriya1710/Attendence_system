import { jsPDF } from 'jspdf';
import { ReportData, groupODStudents } from './reportGenerator';
import { formatFullReportDate, formatReportDate } from './dateUtils';

/**
 * Builds the jsPDF document instance with styling and layout matching the new report format
 */
export function generateAttendancePDFDocument(data: ReportData, className?: string): jsPDF {
  const activeClassName = (className || data.className || 'II Year AI&DS - B').trim();
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

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('COLLEGE ATTENDANCE REPORT', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Class: ${activeClassName} | Date: ${formatFullReportDate(data.date)}`, margin, 20);

  y = 36;

  // Addressed to
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10.5);
  doc.text(`Good morning, ${data.salutation.trim() || 'Mam'}.`, margin, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Attendance Report', margin, y);
  y += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Class: ${activeClassName}`, margin, y);
  y += 5;
  doc.text(`Date: ${formatFullReportDate(data.date)}`, margin, y);
  y += 9;

  // 5 Metric Cards
  const totalCards = 5;
  const gap = 3;
  const cardWidth = (pageWidth - margin * 2 - gap * (totalCards - 1)) / totalCards;
  const cardHeight = 18;

  const odCount = data.odStudents.length;
  const presentAndOd = data.presentCount + odCount;

  // 1. Total
  drawMetricCard(doc, margin, y, cardWidth, cardHeight, 'TOTAL', `${data.totalStudents}`, [71, 85, 105], [241, 245, 249]);
  // 2. Present
  drawMetricCard(doc, margin + (cardWidth + gap), y, cardWidth, cardHeight, 'PRESENT', `${data.presentCount}`, [22, 163, 74], [240, 253, 244]);
  // 3. Leave (Absent)
  drawMetricCard(doc, margin + (cardWidth + gap) * 2, y, cardWidth, cardHeight, 'LEAVE (ABS)', `${data.leaveStudents.length}`, [220, 38, 38], [254, 242, 242]);
  // 4. On Duty (OD)
  drawMetricCard(doc, margin + (cardWidth + gap) * 3, y, cardWidth, cardHeight, 'ON DUTY (OD)', `${odCount}`, [37, 99, 235], [239, 246, 255]);
  // 5. Present + OD
  drawMetricCard(doc, margin + (cardWidth + gap) * 4, y, cardWidth, cardHeight, 'PRES + OD', `${presentAndOd}`, [13, 148, 136], [240, 253, 250]);

  y += cardHeight + 10;

  // 1. Leave Section (only if > 0)
  if (data.leaveStudents.length > 0) {
    y = renderStudentSection(doc, 'Leave (Absent)', data.leaveStudents, y, [220, 38, 38], margin, pageWidth, pageHeight);
  }

  // 2. On Duty (OD) Section (only if > 0)
  if (odCount > 0) {
    if (y + 16 > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }

    // Section Header Bar
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, y, 3, 6, 'F');
    doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`On Duty (OD): (${odCount})`, margin + 6, y + 5);
    y += 10;

    const groups = groupODStudents(data.odStudents);
    groups.forEach((group) => {
      if (y + 14 > pageHeight - 15) {
        doc.addPage();
        y = 20;
      }

      // Group Sub-heading (if non-empty)
      if (group.displayReason) {
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(group.displayReason, margin + 4, y);
        y += 5.5;
      }

      // Group student list
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);

      group.students.forEach((student, idx) => {
        if (y + 6 > pageHeight - 15) {
          doc.addPage();
          y = 20;
        }
        doc.text(`${idx + 1}. ${student.name}`, margin + 6, y);
        y += 5.5;
      });

      y += 3;
    });
  }

  // 100% Attendance note if all are present
  if (data.leaveStudents.length === 0 && odCount === 0) {
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 14, 2, 2, 'F');
    doc.setTextColor(22, 163, 74);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('✓ 100% Attendance: All students are marked present today.', margin + 6, y + 9);
    y += 20;
  }

  // Closing note
  if (y > pageHeight - 25) {
    doc.addPage();
    y = 20;
  }
  y += 4;
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.text(`Thank you, ${data.salutation.trim() || 'Mam'}.`, margin, y);

  // Footer note on bottom of every page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated by CR Attendance App • ${new Date().toLocaleTimeString()} • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  return doc;
}

/**
 * Downloads or shares the attendance PDF with mobile-first handling
 */
export async function downloadAttendancePDF(
  data: ReportData,
  className?: string
): Promise<{ success: boolean; method: string; message?: string }> {
  try {
    const activeClassName = className || data.className || 'II Year AI&DS - B';
    const doc = generateAttendancePDFDocument(data, activeClassName);
    const fileName = `Attendance_Report_${data.date}.pdf`;
    const pdfBlob = doc.output('blob');

    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth <= 768;

    // Mobile Method 1: Web Share API with File
    if (isMobile && typeof navigator !== 'undefined' && 'canShare' in navigator) {
      try {
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
        if (navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            files: [pdfFile],
            title: `Attendance Report - ${formatReportDate(data.date)}`,
            text: `Attendance Report for ${activeClassName} on ${formatFullReportDate(data.date)}`,
          });
          return { success: true, method: 'shared' };
        }
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') {
          return { success: true, method: 'aborted' };
        }
        console.warn('Native share failed, proceeding with direct download/view:', shareErr);
      }
    }

    // Method 2: Blob Object URL
    const blobUrl = URL.createObjectURL(pdfBlob);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isIOS) {
      window.open(blobUrl, '_blank');
      return { success: true, method: 'opened_ios' };
    }

    // Android and Desktop: standard blob download link
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
    console.error('PDF generation or download failed:', err);
    return { success: false, method: 'error', message: err.message || 'Failed to download PDF' };
  }
}

/**
 * Open the PDF directly in a new browser tab/viewer
 */
export function openAttendancePDFInNewTab(data: ReportData, className?: string): void {
  try {
    const activeClassName = className || data.className || 'II Year AI&DS - B';
    const doc = generateAttendancePDFDocument(data, activeClassName);
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, '_blank');
  } catch (err) {
    console.error('Failed to open PDF in new tab:', err);
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
  doc.setFontSize(6.8);
  doc.text(label, x + width / 2, y + 6, { align: 'center' });

  doc.setFontSize(13);
  doc.text(value, x + width / 2, y + 14, { align: 'center' });
}

function renderStudentSection(
  doc: jsPDF,
  title: string,
  students: { name: string; regNo?: string }[],
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
  doc.text(`${title}: (${students.length})`, margin + 6, y + 5);

  y += 10;

  // Student list
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  students.forEach((student, idx) => {
    if (y + 6 > pageHeight - 15) {
      doc.addPage();
      y = 20;
    }
    doc.text(`${idx + 1}. ${student.name}`, margin + 4, y);
    y += 5.5;
  });

  return y + 4;
}

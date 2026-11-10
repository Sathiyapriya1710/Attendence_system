import { Student } from '../types';
import { formatFullReportDate } from './dateUtils';

export interface ODStudentEntry {
  student: Student;
  reason?: string;
}

export interface ReportData {
  date: string;
  salutation: string; // e.g. "Mam" or "Sir"
  className: string; // e.g. "II Year AI&DS - B"
  greetingPrefix?: string; // e.g. "Good morning"
  totalStudents: number;
  presentCount: number;
  leaveStudents: Student[];
  odStudents: ODStudentEntry[];
  totalAbsent: number; // Leave only
}

export interface ODGroup {
  reasonKey: string; // lowercased
  displayReason: string;
  students: Student[];
}

/**
 * Groups OD students by reason (case-insensitive).
 * Groups with non-empty reasons come first (in order of first encounter or appearance),
 * and the empty-reason group comes last.
 */
export function groupODStudents(odStudents: ODStudentEntry[]): ODGroup[] {
  const groupsMap = new Map<string, ODGroup>();
  const noReasonStudents: Student[] = [];

  odStudents.forEach((entry) => {
    const rawReason = (entry.reason || '').trim();
    if (!rawReason) {
      noReasonStudents.push(entry.student);
      return;
    }

    const key = rawReason.toLowerCase();
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        reasonKey: key,
        // Preserve first encountered capitalization or nicely formatted reason
        displayReason: rawReason,
        students: [entry.student],
      });
    } else {
      groupsMap.get(key)!.students.push(entry.student);
    }
  });

  const result: ODGroup[] = Array.from(groupsMap.values());

  // Students with no reason go in the last group with an empty displayReason
  if (noReasonStudents.length > 0) {
    result.push({
      reasonKey: '',
      displayReason: '',
      students: noReasonStudents,
    });
  }

  return result;
}

/**
 * Generates the report text matching the exact specification:
 * 
 * Good morning, {faculty}.
 * 
 * Attendance Report
 * Class: {class name}
 * Date: {Weekday}, {DD Mon YYYY}
 * 
 * Total Students: {total}
 * Present: {present}
 * Absent (Leave): {leave}
 * On Duty (OD): {od count}
 * Present + OD: {present + od}
 * 
 * Leave:
 * 1. ...
 * 2. ...
 * 
 * On Duty (OD):
 * {Reason A}
 * 1. ...
 * 2. ...
 * 
 * {Reason B}
 * 1. ...
 * 
 * Thank you, {faculty}.
 */
export function generateAttendanceReportText(data: ReportData): string {
  const greeting = data.greetingPrefix || 'Good morning';
  const salutation = data.salutation.trim() || 'Mam';
  const className = data.className.trim() || 'II Year AI&DS - B';
  const formattedDate = formatFullReportDate(data.date);

  const lines: string[] = [];

  // Salutation Header
  lines.push(`${greeting}, ${salutation}.`);
  lines.push('');
  lines.push('Attendance Report');
  lines.push(`Class: ${className}`);
  lines.push(`Date: ${formattedDate}`);
  lines.push('');

  // Counts block
  const odCount = data.odStudents.length;
  const presentAndOd = data.presentCount + odCount;

  lines.push(`Total Students: ${data.totalStudents}`);
  lines.push(`Present: ${data.presentCount}`);
  lines.push(`Absent (Leave): ${data.leaveStudents.length}`);
  lines.push(`On Duty (OD): ${odCount}`);
  lines.push(`Present + OD: ${presentAndOd}`);

  // Leave section (only if > 0)
  if (data.leaveStudents.length > 0) {
    lines.push('');
    lines.push('Leave:');
    data.leaveStudents.forEach((student, index) => {
      lines.push(`${index + 1}. ${student.name}`);
    });
  }

  // OD section (only if > 0)
  if (odCount > 0) {
    lines.push('');
    lines.push('On Duty (OD):');

    const groups = groupODStudents(data.odStudents);

    groups.forEach((group, groupIdx) => {
      if (groupIdx > 0) {
        lines.push('');
      }

      // If group has a reason, display it as sub-heading line
      // Students with no reason have NO sub-heading line
      if (group.displayReason) {
        lines.push(group.displayReason);
      }

      // Number each group separately starting at 1
      group.students.forEach((student, studentIdx) => {
        lines.push(`${studentIdx + 1}. ${student.name}`);
      });
    });
  }

  // Footer note
  lines.push('');
  lines.push(`Thank you, ${salutation}.`);

  return lines.join('\n');
}

/**
 * Builds the WhatsApp share URL
 */
export function buildWhatsAppShareUrl(reportText: string, phoneNumber?: string): string {
  const encodedText = encodeURIComponent(reportText);
  if (phoneNumber && phoneNumber.trim().length > 0) {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

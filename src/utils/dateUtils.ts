const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getTodayISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODate(isoStr: string): Date {
  const [year, month, day] = isoStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/**
 * Returns date in format: "09 Nov 2026"
 */
export function formatReportDate(isoDateStr: string): string {
  try {
    const d = parseISODate(isoDateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return isoDateStr;
  }
}

/**
 * Returns exact full format for the report:
 * e.g. "Monday, 09 Nov 2026"
 */
export function formatFullReportDate(isoDateStr: string): string {
  try {
    const d = parseISODate(isoDateStr);
    const weekday = FULL_DAYS[d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const month = MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${weekday}, ${day} ${month} ${year}`;
  } catch {
    return isoDateStr;
  }
}

/**
 * Returns user-friendly date: "Mon, 09 Nov 2026"
 */
export function formatDisplayDate(isoDateStr: string): string {
  try {
    const d = parseISODate(isoDateStr);
    const dayName = SHORT_DAYS[d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const month = MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${dayName}, ${day} ${month} ${year}`;
  } catch {
    return isoDateStr;
  }
}

export function shiftDate(isoDateStr: string, daysDelta: number): string {
  const d = parseISODate(isoDateStr);
  d.setDate(d.getDate() + daysDelta);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Returns formatted saved date & time: "09 Nov 2026, 09:30 AM"
 */
export function formatSavedDateTime(isoOrDateStr: string): string {
  try {
    const d = new Date(isoOrDateStr);
    if (isNaN(d.getTime())) return isoOrDateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = MONTHS[d.getMonth()];
    const year = d.getFullYear();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${day} ${month} ${year}, ${timeStr}`;
  } catch {
    return isoOrDateStr;
  }
}

/**
 * Returns full date with weekday: "Monday, 09 Nov 2026"
 */
export function formatDateAndWeekday(isoDateStr: string): string {
  return formatFullReportDate(isoDateStr);
}

/**
 * Returns date in format: "03 Nov, Mon"
 */
export function formatStudentReportDate(isoDateStr: string): string {
  try {
    const d = parseISODate(isoDateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = MONTHS[d.getMonth()];
    const weekday = SHORT_DAYS[d.getDay()];
    return `${day} ${month}, ${weekday}`;
  } catch {
    return isoDateStr;
  }
}

/**
 * Extracts "YYYY-MM" from "YYYY-MM-DD"
 */
export function getYearMonth(isoDateStr: string): string {
  return isoDateStr.slice(0, 7);
}

/**
 * Formats "YYYY-MM" to readable label: "November 2026"
 */
export function formatMonthName(yearMonth: string): string {
  try {
    const [year, month] = yearMonth.split('-').map(Number);
    const fullMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${fullMonths[(month || 1) - 1]} ${year}`;
  } catch {
    return yearMonth;
  }
}



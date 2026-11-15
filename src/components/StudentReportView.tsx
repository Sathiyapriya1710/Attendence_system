import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  GraduationCap,
  Loader2,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Student, DailyAttendanceRecord } from '../types';
import { formatStudentReportDate, formatMonthName, getYearMonth } from '../utils/dateUtils';
import { downloadStudentReportPDF, StudentDateEntry } from '../utils/studentReportPdfGenerator';

interface StudentReportViewProps {
  student: Student;
  history: Record<string, DailyAttendanceRecord>;
  classNameTitle: string;
  onBack: () => void;
}

export const StudentReportView: React.FC<StudentReportViewProps> = ({
  student,
  history,
  classNameTitle,
  onBack,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Extract all saved dates sorted chronologically (oldest first for date lists)
  const savedDatesOldestFirst = useMemo(() => {
    return Object.keys(history).sort((a, b) => a.localeCompare(b));
  }, [history]);

  // Extract distinct months with saved records (sorted newest first for dropdown)
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    savedDatesOldestFirst.forEach((date) => {
      monthSet.add(getYearMonth(date));
    });
    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [savedDatesOldestFirst]);

  // Compute stats and date lists for any given set of dates
  const computeStudentMonthData = (dates: string[]) => {
    let presentCount = 0;
    let leaveCount = 0;
    let odCount = 0;

    const presentDates: StudentDateEntry[] = [];
    const leaveDates: StudentDateEntry[] = [];
    const odDates: StudentDateEntry[] = [];

    dates.forEach((date) => {
      const record = history[date];
      if (!record) return;

      const rawStatus = (record.attendance?.[student.id] || 'present') as any;

      if (rawStatus === 'leave') {
        leaveCount++;
        const reason = record.leaveReasons?.[student.id] || '';
        leaveDates.push({ date, status: 'leave', reason });
      } else if (rawStatus === 'od' || rawStatus === 'hackathon' || rawStatus === 'sports') {
        odCount++;
        let reason = record.odReasons?.[student.id] || '';
        if (!reason) {
          if (rawStatus === 'hackathon') reason = 'Hackathon';
          else if (rawStatus === 'sports') reason = 'Sports';
        }
        odDates.push({ date, status: 'od', reason });
      } else {
        // Default to present
        presentCount++;
        presentDates.push({ date, status: 'present' });
      }
    });

    const workingDays = dates.length;
    // Rule: Present + Leave + OD must equal Working days
    // Rule: Present % = (Present + OD) / Working days x 100, rounded to 1 decimal
    const attended = presentCount + odCount;
    const presentPercentage = workingDays > 0 ? Math.round((attended / workingDays) * 1000) / 10 : 0;

    return {
      workingDays,
      presentDays: presentCount,
      leaveDays: leaveCount,
      odDays: odCount,
      presentPercentage,
      presentDates,
      leaveDates,
      odDates,
    };
  };

  // Filter dates according to selectedMonth
  const filteredDates = useMemo(() => {
    if (selectedMonth === 'all') {
      return savedDatesOldestFirst;
    }
    return savedDatesOldestFirst.filter((d) => getYearMonth(d) === selectedMonth);
  }, [savedDatesOldestFirst, selectedMonth]);

  // Active view data
  const currentData = useMemo(() => {
    return computeStudentMonthData(filteredDates);
  }, [filteredDates, history, student.id]);

  // Overall data for All Months
  const overallData = useMemo(() => {
    return computeStudentMonthData(savedDatesOldestFirst);
  }, [savedDatesOldestFirst, history, student.id]);

  // Month-wise table data when "All months" is selected
  const monthWiseTableData = useMemo(() => {
    return availableMonths.map((ym) => {
      const datesForMonth = savedDatesOldestFirst.filter((d) => getYearMonth(d) === ym);
      const data = computeStudentMonthData(datesForMonth);
      return {
        yearMonth: ym,
        monthName: formatMonthName(ym),
        ...data,
      };
    });
  }, [availableMonths, savedDatesOldestFirst, history, student.id]);

  const handleDownloadPDF = async () => {
    setIsDownloadingPdf(true);
    try {
      const monthLabel =
        selectedMonth === 'all'
          ? 'All Months (Cumulative)'
          : formatMonthName(selectedMonth);

      await downloadStudentReportPDF({
        student,
        className: classNameTitle,
        monthLabel,
        stats: {
          workingDays: currentData.workingDays,
          presentDays: currentData.presentDays,
          leaveDays: currentData.leaveDays,
          odDays: currentData.odDays,
          presentPercentage: currentData.presentPercentage,
        },
        presentDates: currentData.presentDates,
        leaveDates: currentData.leaveDates,
        odDates: currentData.odDates,
      });
    } catch (err) {
      console.error('Error generating student report PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 space-y-4">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-all touch-target cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to Students</span>
        </button>

        {/* Download PDF button */}
        <button
          type="button"
          onClick={handleDownloadPDF}
          disabled={isDownloadingPdf}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 touch-target cursor-pointer disabled:opacity-50"
          title="Download Student Report PDF"
        >
          {isDownloadingPdf ? (
            <Loader2 size={14} className="animate-spin text-white" />
          ) : (
            <Download size={14} />
          )}
          <span>Download PDF</span>
        </button>
      </div>

      {/* Student Identity Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                #{student.sNo}
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                {student.name}
              </h2>
            </div>
            <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 mt-1">
              Reg No: {student.regNo}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {classNameTitle}
            </span>
          </div>
        </div>
      </div>

      {/* Month Filter Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <label htmlFor="month-select" className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Filter by Month:
          </label>
        </div>

        <select
          id="month-select"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-bold focus:outline-emerald-500 cursor-pointer"
        >
          <option value="all">All months</option>
          {availableMonths.map((ym) => (
            <option key={ym} value={ym}>
              {formatMonthName(ym)}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards for Selected Period */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center text-xs">
        {/* Working Days */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 truncate">
            Working Days
          </div>
          <div className="text-base sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
            {currentData.workingDays}
          </div>
        </div>

        {/* Present Days */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 shadow-xs">
          <div className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 truncate">
            Present
          </div>
          <div className="text-base sm:text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">
            {currentData.presentDays}
          </div>
        </div>

        {/* Absent (Leave) Days */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 shadow-xs">
          <div className="text-[9px] sm:text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 truncate">
            Leave
          </div>
          <div className="text-base sm:text-xl font-extrabold text-rose-700 dark:text-rose-300 mt-0.5">
            {currentData.leaveDays}
          </div>
        </div>

        {/* OD Days */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 shadow-xs">
          <div className="text-[9px] sm:text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400 truncate">
            OD
          </div>
          <div className="text-base sm:text-xl font-extrabold text-blue-700 dark:text-blue-300 mt-0.5">
            {currentData.odDays}
          </div>
        </div>

        {/* Present % */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 shadow-xs">
          <div className="text-[9px] sm:text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400 truncate">
            Present %
          </div>
          <div className="text-base sm:text-xl font-extrabold text-teal-700 dark:text-teal-300 mt-0.5">
            {currentData.presentPercentage}%
          </div>
        </div>
      </div>

      {/* When "All months" selected: Show month-wise table (Requirement 2) */}
      {selectedMonth === 'all' && monthWiseTableData.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs space-y-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Month-wise Breakdown (Tap any month to filter)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 font-bold">
                  <th className="py-2 px-2">Month</th>
                  <th className="py-2 px-1 text-center">Working</th>
                  <th className="py-2 px-1 text-center text-emerald-600">Pres</th>
                  <th className="py-2 px-1 text-center text-rose-600">Leave</th>
                  <th className="py-2 px-1 text-center text-blue-600">OD</th>
                  <th className="py-2 px-2 text-right text-teal-600">Pres %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {monthWiseTableData.map((row) => (
                  <tr
                    key={row.yearMonth}
                    onClick={() => setSelectedMonth(row.yearMonth)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 px-2 font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 flex items-center gap-1">
                      <span>{row.monthName}</span>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                    <td className="py-2.5 px-1 text-center">{row.workingDays}</td>
                    <td className="py-2.5 px-1 text-center font-bold text-emerald-600">{row.presentDays}</td>
                    <td className="py-2.5 px-1 text-center font-bold text-rose-600">{row.leaveDays}</td>
                    <td className="py-2.5 px-1 text-center font-bold text-blue-600">{row.odDays}</td>
                    <td className="py-2.5 px-2 text-right font-extrabold text-teal-600">{row.presentPercentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Date Lists: Present, Absent (Leave), On Duty (OD) */}
      <div className="space-y-3">
        {/* 1. Present List (Green) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs space-y-2 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs sm:text-sm text-emerald-700 dark:text-emerald-400">
              Present ({currentData.presentDates.length} days)
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Sorted oldest first</span>
          </div>

          {currentData.presentDates.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-1">None</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {currentData.presentDates.map((entry) => (
                <div
                  key={entry.date}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 text-xs font-semibold border border-emerald-100 dark:border-emerald-900/40"
                >
                  - {formatStudentReportDate(entry.date)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Absent - Leave List (Red) with Reasons */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs space-y-2 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs sm:text-sm text-rose-700 dark:text-rose-400">
              Absent - Leave ({currentData.leaveDates.length} {currentData.leaveDates.length === 1 ? 'day' : 'days'})
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Sorted oldest first</span>
          </div>

          {currentData.leaveDates.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-1">None</p>
          ) : (
            <div className="space-y-1.5 pt-1">
              {currentData.leaveDates.map((entry) => {
                const reasonText = entry.reason && entry.reason.trim() ? entry.reason.trim() : 'No reason given';
                return (
                  <div
                    key={entry.date}
                    className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-300 text-xs font-semibold border border-rose-100 dark:border-rose-900/40 flex items-center justify-between gap-2"
                  >
                    <span>- {formatStudentReportDate(entry.date)}</span>
                    <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded-md">
                      {reasonText}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. On Duty - OD List (Blue) with Reasons */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs space-y-2 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs sm:text-sm text-blue-700 dark:text-blue-400">
              On Duty - OD ({currentData.odDates.length} {currentData.odDates.length === 1 ? 'day' : 'days'})
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Sorted oldest first</span>
          </div>

          {currentData.odDates.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-1">None</p>
          ) : (
            <div className="space-y-1.5 pt-1">
              {currentData.odDates.map((entry) => {
                const reasonText = entry.reason && entry.reason.trim() ? entry.reason.trim() : 'No reason given';
                return (
                  <div
                    key={entry.date}
                    className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-300 text-xs font-semibold border border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-2"
                  >
                    <span>- {formatStudentReportDate(entry.date)}</span>
                    <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-md">
                      {reasonText}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

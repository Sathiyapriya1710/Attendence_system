import React, { useState } from 'react';
import { Calendar, Users, ChevronRight, Trash2, ArrowLeft, Download, Upload, CheckCircle2, AlertTriangle, Search, Filter, Loader2, FileDown, FileText } from 'lucide-react';
import { Student, DailyAttendanceRecord } from '../types';
import { formatDisplayDate, formatDateAndWeekday, formatSavedDateTime } from '../utils/dateUtils';
import { attendanceService } from '../services/attendanceService';
import { downloadAttendancePDF } from '../utils/pdfGenerator';
import { ODStudentEntry } from '../utils/reportGenerator';
import { StudentReportView } from './StudentReportView';

interface HistoryViewProps {
  history: Record<string, DailyAttendanceRecord>;
  students: Student[];
  onSelectDate: (date: string) => void;
  onDeleteRecord: (date: string) => Promise<void>;
  onBack: () => void;
  onDataImported: () => void;
  classNameTitle?: string;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  students,
  onSelectDate,
  onDeleteRecord,
  onBack,
  onDataImported,
  classNameTitle = 'II Year AI&DS - B',
}) => {
  const [activeTab, setActiveTab] = useState<'dates' | 'stats'>('dates');
  const [searchStudent, setSearchStudent] = useState('');
  const [statsFilter, setStatsFilter] = useState<'all' | 'critical' | 'warning' | 'good'>('all');
  const [deleteConfirmDate, setDeleteConfirmDate] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [downloadingDate, setDownloadingDate] = useState<string | null>(null);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);

  // Sorted list of dates descending (newest first)
  const sortedDates = Object.keys(history).sort((a, b) => b.localeCompare(a));

  // Compute student stats
  const studentStats = attendanceService.computeStudentStatistics(students, history);

  const filteredStats = studentStats.filter((item) => {
    const matchesSearch =
      item.student.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
      item.student.regNo.toLowerCase().includes(searchStudent.toLowerCase()) ||
      String(item.student.sNo).includes(searchStudent);

    if (!matchesSearch) return false;

    if (statsFilter === 'critical') return item.attendancePercentage < 65;
    if (statsFilter === 'warning') return item.attendancePercentage >= 65 && item.attendancePercentage < 75;
    if (statsFilter === 'good') return item.attendancePercentage >= 75;
    return true;
  });

  const handleDownloadPDFForRecord = async (dateStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const record = history[dateStr];
    if (!record) return;

    setDownloadingDate(dateStr);
    try {
      const presentStudents: Student[] = [];
      const leaveStudents: Student[] = [];
      const odStudents: ODStudentEntry[] = [];

      students.forEach((s) => {
        const status = (record.attendance?.[s.id] || 'present') as any;
        if (status === 'present') {
          presentStudents.push(s);
        } else if (status === 'leave') {
          leaveStudents.push(s);
        } else if (status === 'od' || status === 'hackathon' || status === 'sports') {
          odStudents.push({
            student: s,
            reason: record.odReasons?.[s.id] || (status === 'hackathon' ? 'Hackathon' : status === 'sports' ? 'Sports' : ''),
          });
        }
      });

      const reportData = {
        date: dateStr,
        salutation: record.salutation || record.facultyAddress || 'Mam',
        className: record.className || 'II Year AI&DS - B',
        totalStudents: students.length,
        presentCount: presentStudents.length,
        leaveStudents,
        odStudents,
        totalAbsent: leaveStudents.length, // OD students never absent
      };

      await downloadAttendancePDF(reportData, record.className || 'II Year AI&DS - B');
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setDownloadingDate(null);
    }
  };

  const handleExport = async () => {
    try {
      const jsonStr = await attendanceService.exportBackup();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export data');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = await attendanceService.importBackup(content);
        if (result.success) {
          setImportStatus('Data restored successfully!');
          onDataImported();
          setTimeout(() => setImportStatus(null), 3000);
        } else {
          alert(`Import failed: ${result.message}`);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // If a student is selected for detailed report, show StudentReportView
  if (selectedStudentForReport) {
    return (
      <StudentReportView
        student={selectedStudentForReport}
        history={history}
        classNameTitle={classNameTitle}
        onBack={() => setSelectedStudentForReport(null)}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-all touch-target"
        >
          <ArrowLeft size={16} />
          <span>Back to Attendance</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
            title="Download JSON Backup"
          >
            <Download size={13} />
            <span>Export</span>
          </button>

          <label className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer">
            <Upload size={13} />
            <span>Import</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>
      </div>

      {importStatus && (
        <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{importStatus}</span>
        </div>
      )}

      {/* Tabs Switcher: Saved Records vs Student Reports */}
      <div className="flex p-1 bg-slate-200 dark:bg-slate-800/80 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('dates')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'dates'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Calendar size={14} />
          <span>Saved Records ({sortedDates.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'stats'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Users size={14} />
          <span>Student Reports</span>
        </button>
      </div>

      {/* TAB 1: Recorded Dates List */}
      {activeTab === 'dates' && (
        <div className="space-y-2.5">
          {sortedDates.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <Calendar size={32} className="mx-auto text-slate-400" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                No saved attendance records yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Mark attendance on the Attendance tab and tap <strong>Save</strong> to store a record. Saved records will appear here.
              </p>
            </div>
          ) : (
            sortedDates.map((dateStr) => {
              const record = history[dateStr];
              // Calculate live counts matching full roster
              let present = 0;
              let leave = 0;
              let od = 0;

              students.forEach((s) => {
                const status = (record.attendance?.[s.id] || 'present') as any;
                if (status === 'present') present++;
                else if (status === 'leave') leave++;
                else if (status === 'od' || status === 'hackathon' || status === 'sports') od++;
              });

              const counts = {
                total: students.length,
                present,
                leave,
                od,
                presentAndOd: present + od,
                totalAbsent: leave,
              };

              const isConfirmDelete = deleteConfirmDate === dateStr;
              const isDownloading = downloadingDate === dateStr;
              const savedTimeDisplay = record.savedAt || record.lastUpdated;

              return (
                <div
                  key={dateStr}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800/80 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => onSelectDate(dateStr)}
                      className="text-left group flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Date and weekday */}
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition-colors">
                          {formatDateAndWeekday(dateStr)}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          Total: {counts.total}
                        </span>
                      </div>

                      {/* Saved time */}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {savedTimeDisplay ? `Saved: ${formatSavedDateTime(savedTimeDisplay)}` : `Date: ${dateStr}`}
                      </p>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Download PDF button directly on row */}
                      <button
                        type="button"
                        onClick={(e) => handleDownloadPDFForRecord(dateStr, e)}
                        disabled={isDownloading}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all touch-target disabled:opacity-50"
                        title="Download PDF for this date"
                      >
                        {isDownloading ? (
                          <Loader2 size={13} className="animate-spin text-emerald-600" />
                        ) : (
                          <FileDown size={13} className="text-emerald-600 dark:text-emerald-400" />
                        )}
                        <span className="hidden xs:inline">{isDownloading ? 'PDF...' : 'Download PDF'}</span>
                        <span className="xs:hidden">PDF</span>
                      </button>

                      {/* Delete button with confirmation */}
                      {isConfirmDelete ? (
                        <div className="flex items-center gap-1 animate-in fade-in">
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteRecord(dateStr);
                              setDeleteConfirmDate(null);
                            }}
                            className="px-2 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 active:scale-95"
                          >
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmDate(null)}
                            className="px-2 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmDate(dateStr)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete saved record"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}

                      {/* Open & Edit button */}
                      <button
                        type="button"
                        onClick={() => onSelectDate(dateStr)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all touch-target"
                        title="Open this date's record to view or edit"
                      >
                        <span>Open</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Metrics Badges: Total, Present, Leave, OD, Present + OD */}
                  <div
                    onClick={() => onSelectDate(dateStr)}
                    className="grid grid-cols-5 gap-1.5 text-center text-xs mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 cursor-pointer"
                  >
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300">
                      <div className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Total</div>
                      <div className="font-extrabold text-sm">{counts.total}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">
                      <div className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Present</div>
                      <div className="font-extrabold text-sm">{counts.present}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300">
                      <div className="text-[9px] uppercase font-bold text-rose-600 dark:text-rose-400">Leave</div>
                      <div className="font-extrabold text-sm">{counts.leave}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300">
                      <div className="text-[9px] uppercase font-bold text-blue-600 dark:text-blue-400">OD</div>
                      <div className="font-extrabold text-sm">{counts.od}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300">
                      <div className="text-[9px] uppercase font-bold text-teal-600 dark:text-teal-400">Pres + OD</div>
                      <div className="font-extrabold text-sm">{counts.presentAndOd}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: Per-Student Cumulative Attendance Statistics (%) */}
      {activeTab === 'stats' && (
        <div className="space-y-3">
          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                placeholder="Search student in stats..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'good', label: '≥75%' },
                { id: 'warning', label: '65-74%' },
                { id: 'critical', label: '<65%' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatsFilter(f.id as any)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    statsFilter === f.id
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Total Recorded Days: <strong>{sortedDates.length}</strong></span>
            <span className="italic">* OD counted towards attended days</span>
          </div>

          {/* Stats List */}
          <div className="space-y-2">
            {filteredStats.map((stat) => {
              const pct = stat.attendancePercentage;
              let badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200';
              if (pct < 65) {
                badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200';
              } else if (pct < 75) {
                badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200';
              }

              return (
                <div
                  key={stat.student.id}
                  onClick={() => setSelectedStudentForReport(stat.student)}
                  className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2 hover:border-emerald-400 dark:hover:border-emerald-700 cursor-pointer transition-all group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        #{stat.student.sNo}
                      </span>
                      <span className="text-xs font-mono text-slate-500">{stat.student.regNo}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate mt-0.5 group-hover:text-emerald-600 transition-colors">
                      {stat.student.name}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                      <span>Pres: <strong>{stat.presentDays}</strong></span>
                      <span>OD: <strong>{stat.odDays}</strong></span>
                      <span>Leave: <strong className="text-rose-600">{stat.leaveDays}</strong></span>
                    </div>
                  </div>

                  {/* Percentage badge and Open Report action */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-extrabold border ${badgeColor}`}>
                        {pct}%
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                        {stat.totalDays > 0 ? `${stat.presentDays + stat.odDays}/${stat.totalDays} days` : '0 days'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStudentForReport(stat.student);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all touch-target"
                      title="View Student Attendance Report"
                    >
                      <FileText size={13} />
                      <span className="hidden xs:inline">Report</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

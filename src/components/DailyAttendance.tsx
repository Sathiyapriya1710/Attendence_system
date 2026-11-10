import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Search,
  X,
  RotateCcw,
  FileText,
  CheckSquare,
  Square,
  Edit2,
  Check,
  User,
  GraduationCap
} from 'lucide-react';
import { Student, AttendanceStatus } from '../types';
import { StudentRow } from './StudentRow';
import { StickyCounter } from './StickyCounter';
import { ODReasonSheet } from './ODReasonSheet';
import { shiftDate, formatDisplayDate, getTodayISODate } from '../utils/dateUtils';

interface DailyAttendanceProps {
  currentDate: string;
  onDateChange: (newDate: string) => void;
  students: Student[];
  attendance: Record<string, AttendanceStatus>;
  odReasons: Record<string, string>;
  onStatusChange: (studentId: string, status: AttendanceStatus) => void;
  onSaveODReason: (studentId: string, reason: string) => void;
  onBatchStatusChange: (studentIds: string[], status: AttendanceStatus, reason?: string) => void;
  onResetDay: () => void;
  onMarkAllPresent: () => void;
  onOpenReport: () => void;
  classNameTitle: string;
  onChangeClassName: (newClassName: string) => void;
  facultySalutation: string;
  onChangeFacultySalutation: (newSalutation: string) => void;
  recentOdReasons: string[];
}

export const DailyAttendance: React.FC<DailyAttendanceProps> = ({
  currentDate,
  onDateChange,
  students,
  attendance,
  odReasons,
  onStatusChange,
  onSaveODReason,
  onBatchStatusChange,
  onResetDay,
  onMarkAllPresent,
  onOpenReport,
  classNameTitle,
  onChangeClassName,
  facultySalutation,
  onChangeFacultySalutation,
  recentOdReasons,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Editable Class Name and Faculty state
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [tempClassName, setTempClassName] = useState(classNameTitle);

  // "Select Many" Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // OD Reason Bottom Sheet State
  const [sheetStudentIds, setSheetStudentIds] = useState<string[] | null>(null);

  const todayStr = getTodayISODate();
  const isToday = currentDate === todayStr;

  // Live Counts Calculation: Total, Present, Leave, OD
  const counts = useMemo(() => {
    let present = 0;
    let leave = 0;
    let od = 0;

    students.forEach((s) => {
      const status = attendance[s.id] || 'present';
      if (status === 'present') present++;
      else if (status === 'leave') leave++;
      else if (status === 'od') od++;
    });

    const total = students.length;
    // INVARIANT: OD students NEVER counted as absent. Total Absent = leave only.
    const totalAbsent = leave;

    return {
      total,
      present,
      leave,
      od,
      presentAndOd: present + od,
      totalAbsent,
    };
  }, [students, attendance]);

  // Filter students based on search query and category filter
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const status = attendance[s.id] || 'present';

      // Category filter check
      if (activeFilter === 'present' && status !== 'present') return false;
      if (activeFilter === 'leave' && status !== 'leave') return false;
      if (activeFilter === 'od' && status !== 'od') return false;

      // Search query check (matches name or register number)
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        s.name.toLowerCase().includes(q) ||
        s.regNo.toLowerCase().includes(q) ||
        String(s.sNo).includes(q)
      );
    });
  }, [students, attendance, activeFilter, searchQuery]);

  // Handle Multi-Select Toggles
  const handleToggleSelect = (studentId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  // Batch actions
  const handleBatchMark = (status: AttendanceStatus) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (status === 'od') {
      // Open OD reason sheet for all selected
      setSheetStudentIds(ids);
    } else {
      onBatchStatusChange(ids, status);
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    }
  };

  // OD Sheet Handlers
  const handleOpenODSheetForStudent = (studentId: string) => {
    setSheetStudentIds([studentId]);
  };

  const handleSaveODReasonFromSheet = (reason: string) => {
    if (!sheetStudentIds || sheetStudentIds.length === 0) return;

    if (sheetStudentIds.length === 1) {
      onSaveODReason(sheetStudentIds[0], reason);
    } else {
      onBatchStatusChange(sheetStudentIds, 'od', reason);
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    }
    setSheetStudentIds(null);
  };

  const handleSaveClassName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempClassName.trim()) {
      onChangeClassName(tempClassName.trim());
      setIsEditingClass(false);
    }
  };

  // Get student names for sheet title
  const sheetStudentNames = useMemo(() => {
    if (!sheetStudentIds) return [];
    return sheetStudentIds
      .map((id) => students.find((s) => s.id === id)?.name || id)
      .filter(Boolean);
  }, [sheetStudentIds, students]);

  const sheetInitialReason = useMemo(() => {
    if (sheetStudentIds && sheetStudentIds.length === 1) {
      return odReasons[sheetStudentIds[0]] || '';
    }
    return '';
  }, [sheetStudentIds, odReasons]);

  return (
    <div className="pb-28">
      {/* Sticky Live Counter Bar (Total, Present, Leave, OD) */}
      <StickyCounter
        total={counts.total}
        present={counts.present}
        leave={counts.leave}
        od={counts.od}
        totalAbsent={counts.totalAbsent}
        onOpenReport={onOpenReport}
        onResetDay={() => setShowResetConfirm(true)}
        activeFilter={activeFilter}
        onSelectFilter={(f) => setActiveFilter((prev) => (prev === f ? 'all' : f))}
      />

      <div className="max-w-2xl mx-auto px-3 py-3 space-y-3">
        {/* Header Metadata Banner: Editable Class Name, Date, and Faculty Address */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs space-y-2.5">
          {/* Top row: Editable Class Name and Faculty Salutation */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Class Name */}
            <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
              <GraduationCap size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              {isEditingClass ? (
                <form onSubmit={handleSaveClassName} className="flex items-center gap-1.5 flex-1">
                  <input
                    type="text"
                    value={tempClassName}
                    onChange={(e) => setTempClassName(e.target.value)}
                    placeholder="e.g. II Year AI&DS - B"
                    className="px-2 py-0.5 text-xs font-bold rounded-lg border border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden w-full max-w-[220px]"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="p-1 bg-emerald-600 text-white rounded-md text-xs hover:bg-emerald-700"
                    title="Save Class Name"
                  >
                    <Check size={13} />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTempClassName(classNameTitle);
                    setIsEditingClass(true);
                  }}
                  className="group flex items-center gap-1 text-xs font-extrabold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 text-left transition-colors"
                  title="Click to edit Class Name"
                >
                  <span>{classNameTitle || 'II Year AI&DS - B'}</span>
                  <Edit2 size={12} className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
                </button>
              )}
            </div>

            {/* Faculty Address */}
            <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
              <User size={13} className="text-slate-400" />
              <span>To:</span>
              <button
                type="button"
                onClick={() => onChangeFacultySalutation(facultySalutation === 'Mam' ? 'Sir' : 'Mam')}
                className="font-bold text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                title="Tap to toggle faculty salutation (Mam / Sir)"
              >
                {facultySalutation || 'Mam'}
              </button>
            </div>
          </div>

          {/* Date Selector Navigation Bar */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Previous Day */}
            <button
              type="button"
              onClick={() => onDateChange(shiftDate(currentDate, -1))}
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all touch-target flex items-center justify-center shrink-0"
              title="Previous Day"
              aria-label="Previous Day"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Date Picker Input & Display */}
            <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
              <div className="relative flex items-center gap-1.5">
                <CalendarIcon size={15} className="text-emerald-600 shrink-0" />
                <input
                  type="date"
                  value={currentDate}
                  onChange={(e) => {
                    if (e.target.value) onDateChange(e.target.value);
                  }}
                  className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 bg-transparent border-0 cursor-pointer focus:ring-0 focus:outline-hidden p-0"
                  aria-label="Select Attendance Date"
                />
              </div>

              {!isToday && (
                <button
                  type="button"
                  onClick={() => onDateChange(todayStr)}
                  className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] hover:bg-emerald-200 transition-colors shrink-0"
                >
                  Today
                </button>
              )}
            </div>

            {/* Next Day */}
            <button
              type="button"
              onClick={() => onDateChange(shiftDate(currentDate, 1))}
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all touch-target flex items-center justify-center shrink-0"
              title="Next Day"
              aria-label="Next Day"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Search Box & "Select Many" Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or register number..."
              className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-emerald-500 shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Select Many Mode Button */}
          <button
            type="button"
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              setSelectedIds(new Set());
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 touch-target ${
              isSelectionMode
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CheckSquare size={15} />
            <span className="hidden sm:inline">Select Many</span>
            <span className="sm:hidden">Multi</span>
          </button>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar" role="tablist">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-full font-bold transition-all whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}
          >
            All ({students.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('present')}
            className={`px-3 py-1 rounded-full font-bold transition-all whitespace-nowrap ${
              activeFilter === 'present'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
            }`}
          >
            Present ({counts.present})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('leave')}
            className={`px-3 py-1 rounded-full font-bold transition-all whitespace-nowrap ${
              activeFilter === 'leave'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
            }`}
          >
            Leave ({counts.leave})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('od')}
            className={`px-3 py-1 rounded-full font-bold transition-all whitespace-nowrap ${
              activeFilter === 'od'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50'
            }`}
          >
            OD ({counts.od})
          </button>
        </div>

        {/* Multi-Select Floating/Sticky Action Bar when Select Many is Active */}
        {isSelectionMode && (
          <div className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl p-2.5 flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="text-xs font-bold text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1"
              >
                {selectedIds.size === filteredStudents.length && filteredStudents.length > 0 ? (
                  <CheckSquare size={15} />
                ) : (
                  <Square size={15} />
                )}
                <span>{selectedIds.size === filteredStudents.length && filteredStudents.length > 0 ? 'Deselect All' : 'Select All'}</span>
              </button>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                ({selectedIds.size} selected)
              </span>
            </div>

            {/* Quick Batch Actions: P, L, OD */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-medium hidden xs:inline">Mark as:</span>
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={() => handleBatchMark('present')}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 disabled:opacity-40 active:scale-95 transition-all"
              >
                P
              </button>
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={() => handleBatchMark('leave')}
                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 disabled:opacity-40 active:scale-95 transition-all"
              >
                L
              </button>
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={() => handleBatchMark('od')}
                className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 disabled:opacity-40 active:scale-95 transition-all"
              >
                OD...
              </button>
            </div>
          </div>
        )}

        {/* Reset Day Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Reset day to All Present?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                This will mark all {students.length} students as Present for {formatDisplayDate(currentDate)} and clear any OD reasons for this date.
              </p>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetDay();
                    setShowResetConfirm(false);
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700"
                >
                  Yes, Reset All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Legend */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
          <span>Tap buttons to mark:</span>
          <div className="flex items-center gap-2 font-bold">
            <span className="text-emerald-600">P = Present</span>
            <span className="text-rose-600">L = Leave</span>
            <span className="text-blue-600">OD = On Duty</span>
          </div>
        </div>

        {/* Students List */}
        <div className="space-y-2">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                No students match your filter
              </p>
              <p className="text-xs text-slate-400">
                Try clearing the search or category filter.
              </p>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <StudentRow
                key={student.id}
                student={student}
                status={attendance[student.id] || 'present'}
                odReason={odReasons[student.id]}
                onChangeStatus={onStatusChange}
                onOpenODSheet={handleOpenODSheetForStudent}
                isSelectionMode={isSelectionMode}
                isSelected={selectedIds.has(student.id)}
                onToggleSelect={handleToggleSelect}
              />
            ))
          )}
        </div>
      </div>

      {/* OD Reason Bottom Sheet */}
      <ODReasonSheet
        isOpen={Boolean(sheetStudentIds && sheetStudentIds.length > 0)}
        onClose={() => setSheetStudentIds(null)}
        studentNames={sheetStudentNames}
        initialReason={sheetInitialReason}
        recentReasons={recentOdReasons}
        onSaveReason={handleSaveODReasonFromSheet}
      />

      {/* Floating Bottom Bar on Mobile for Instant Faculty Report */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 safe-bottom shadow-lg">
        <div className="max-w-2xl mx-auto px-3 py-2 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Ready for WhatsApp?
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {counts.leave} Leave · {counts.od} OD · {counts.present} Present
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenReport}
            className="flex items-center gap-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all touch-target"
          >
            <FileText size={16} />
            <span>View & Send Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};

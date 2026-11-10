import React from 'react';
import { Student, AttendanceStatus } from '../types';
import { Tag, Edit3, CheckSquare, Square } from 'lucide-react';

interface StudentRowProps {
  student: Student;
  status: AttendanceStatus;
  odReason?: string;
  onChangeStatus: (studentId: string, status: AttendanceStatus) => void;
  onOpenODSheet: (studentId: string) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (studentId: string) => void;
}

export const StudentRow: React.FC<StudentRowProps> = ({
  student,
  status,
  odReason,
  onChangeStatus,
  onOpenODSheet,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
}) => {
  // Row styling depending on status
  const getRowStyle = (currentStatus: AttendanceStatus) => {
    switch (currentStatus) {
      case 'present':
        return 'border-l-4 border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 border-slate-200 dark:border-slate-800';
      case 'leave':
        return 'border-l-4 border-l-rose-500 bg-rose-50/70 dark:bg-rose-950/35 border-rose-200 dark:border-rose-900';
      case 'od':
        return 'border-l-4 border-l-blue-500 bg-blue-50/70 dark:bg-blue-950/35 border-blue-200 dark:border-blue-900';
      default:
        return 'border-l-4 border-l-slate-300 dark:border-l-slate-700 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800';
    }
  };

  const handleTapOD = () => {
    // If not already OD, change status to OD and prompt for reason
    onChangeStatus(student.id, 'od');
    onOpenODSheet(student.id);
  };

  return (
    <div
      className={`student-row-transition rounded-xl border p-2.5 shadow-xs transition-all ${getRowStyle(
        status
      )} ${isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Selection Checkbox (When Select Many Mode is active) */}
        {isSelectionMode && (
          <button
            type="button"
            onClick={() => onToggleSelect && onToggleSelect(student.id)}
            className="p-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 shrink-0 touch-target flex items-center justify-center"
            aria-label={`Select ${student.name}`}
          >
            {isSelected ? (
              <CheckSquare size={22} className="text-blue-600 dark:text-blue-400" />
            ) : (
              <Square size={22} className="text-slate-400 dark:text-slate-600" />
            )}
          </button>
        )}

        {/* Student Identification: Name on top, Register Number small text under name */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              #{student.sNo}
            </span>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-snug truncate" title={student.name}>
              {student.name}
            </h3>
          </div>

          {/* Register number as small text under student's name */}
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold tracking-tight mt-0.5 ml-0.5">
            {student.regNo}
          </div>

          {/* Small blue label under name when marked OD */}
          {status === 'od' && (
            <div className="mt-1">
              <button
                type="button"
                onClick={() => onOpenODSheet(student.id)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-semibold hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors group"
                title="Tap to edit OD reason"
              >
                <Tag size={11} className="text-blue-600 dark:text-blue-400" />
                <span className="truncate max-w-[170px] sm:max-w-[240px]">
                  {odReason && odReason.trim() ? `OD: ${odReason.trim()}` : 'OD: add reason'}
                </span>
                <Edit3 size={10} className="opacity-60 group-hover:opacity-100 text-blue-700 dark:text-blue-300" />
              </button>
            </div>
          )}
        </div>

        {/* 3 One-tap Status Buttons: P, L, OD (Min 40px tap target each) */}
        <div className="flex items-center gap-1.5 shrink-0" role="group" aria-label={`Attendance status for ${student.name}`}>
          {/* Present Button */}
          <button
            type="button"
            aria-label={`Mark ${student.name} as Present`}
            onClick={() => onChangeStatus(student.id, 'present')}
            className={`w-11 h-10 min-w-[42px] min-h-[40px] rounded-lg text-sm font-extrabold flex items-center justify-center transition-transform active:scale-90 ${
              status === 'present'
                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-slate-900'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300'
            }`}
          >
            P
          </button>

          {/* Leave Button */}
          <button
            type="button"
            aria-label={`Mark ${student.name} as Leave (Absent)`}
            onClick={() => onChangeStatus(student.id, 'leave')}
            className={`w-11 h-10 min-w-[42px] min-h-[40px] rounded-lg text-sm font-extrabold flex items-center justify-center transition-transform active:scale-90 ${
              status === 'leave'
                ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500 ring-offset-1 dark:ring-offset-slate-900'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-300'
            }`}
          >
            L
          </button>

          {/* OD Button */}
          <button
            type="button"
            aria-label={`Mark ${student.name} as On Duty (OD)`}
            onClick={handleTapOD}
            className={`w-11 h-10 min-w-[42px] min-h-[40px] rounded-lg text-xs font-extrabold flex items-center justify-center transition-transform active:scale-90 ${
              status === 'od'
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300'
            }`}
          >
            OD
          </button>
        </div>
      </div>
    </div>
  );
};

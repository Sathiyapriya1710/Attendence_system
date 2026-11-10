import React from 'react';
import { FileText, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface StickyCounterProps {
  total: number;
  present: number;
  leave: number;
  od: number;
  totalAbsent: number;
  onOpenReport: () => void;
  onResetDay: () => void;
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
}

export const StickyCounter: React.FC<StickyCounterProps> = ({
  total,
  present,
  leave,
  od,
  totalAbsent,
  onOpenReport,
  onResetDay,
  activeFilter,
  onSelectFilter,
}) => {
  const presentAndOd = present + od;

  return (
    <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="max-w-2xl mx-auto px-2.5 py-2">
        {/* Metric Badges Grid - 4 Columns: Total, Present, Leave, OD */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {/* Total */}
          <button
            type="button"
            onClick={() => onSelectFilter('all')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all ${
              activeFilter === 'all'
                ? 'bg-slate-200 dark:bg-slate-700 border-slate-400 dark:border-slate-500 font-bold'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700/60 hover:bg-slate-200/70 dark:hover:bg-slate-700/50'
            }`}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Total</span>
            <span className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 leading-tight">{total}</span>
          </button>

          {/* Present */}
          <button
            type="button"
            onClick={() => onSelectFilter('present')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all ${
              activeFilter === 'present'
                ? 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-500 font-bold'
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100/60'
            }`}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">Present</span>
            <span className="text-lg sm:text-xl font-extrabold text-emerald-700 dark:text-emerald-300 leading-tight">{present}</span>
          </button>

          {/* Leave (Absent) */}
          <button
            type="button"
            onClick={() => onSelectFilter('leave')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all ${
              activeFilter === 'leave'
                ? 'bg-rose-100 dark:bg-rose-950/70 border-rose-500 font-bold'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 hover:bg-rose-100/60'
            }`}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700 dark:text-rose-400">Leave</span>
            <span className="text-lg sm:text-xl font-extrabold text-rose-700 dark:text-rose-300 leading-tight">{leave}</span>
          </button>

          {/* OD (On Duty) */}
          <button
            type="button"
            onClick={() => onSelectFilter('od')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all ${
              activeFilter === 'od'
                ? 'bg-blue-100 dark:bg-blue-950/70 border-blue-500 font-bold'
                : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50 hover:bg-blue-100/60'
            }`}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 dark:text-blue-400">OD</span>
            <span className="text-lg sm:text-xl font-extrabold text-blue-700 dark:text-blue-300 leading-tight">{od}</span>
          </button>
        </div>

        {/* Live Invariant & Summary Bar */}
        <div className="mt-2 flex items-center justify-between gap-1.5 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800 text-[11px]">
              <AlertCircle size={11} className="text-rose-600 dark:text-rose-400" />
              Absent (Leave): {totalAbsent}
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800 text-[11px]">
              <CheckCircle2 size={11} className="text-teal-600 dark:text-teal-400" />
              Present + OD: {presentAndOd}
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={onResetDay}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all touch-target sm:min-w-0"
              title="Reset all students to Present"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={onOpenReport}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-sm transition-all touch-target sm:min-w-0"
            >
              <FileText size={13} />
              <span>Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

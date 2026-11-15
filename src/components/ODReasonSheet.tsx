import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Clock, Tag } from 'lucide-react';

interface ODReasonSheetProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'od' | 'leave';
  studentNames: string[];
  initialReason?: string;
  recentReasons: string[];
  onSaveReason: (reason: string) => void;
}

export const ODReasonSheet: React.FC<ODReasonSheetProps> = ({
  isOpen,
  onClose,
  type = 'od',
  studentNames,
  initialReason = '',
  recentReasons,
  onSaveReason,
}) => {
  const [reason, setReason] = useState(initialReason);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLeave = type === 'leave';
  const titleText = isLeave ? 'Reason for leave' : 'Reason for OD';
  const placeholderText = isLeave
    ? 'e.g. Fever, Family function, Medical, Personal'
    : 'e.g. Hackathon - IFET, Sports, Paper presentation';

  useEffect(() => {
    if (isOpen) {
      setReason(initialReason || '');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, initialReason]);

  if (!isOpen) return null;

  const handleSelectChip = (chipReason: string) => {
    setReason(chipReason);
    inputRef.current?.focus();
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveReason(reason.trim());
    onClose();
  };

  const handleSkip = () => {
    onSaveReason('');
    onClose();
  };

  const targetLabel =
    studentNames.length === 1
      ? studentNames[0]
      : `${studentNames.length} selected students`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop tap to close */}
      <div className="fixed inset-0" onClick={handleSkip} />

      <div
        className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-6 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reason-sheet-title"
      >
        {/* Mobile handle indicator */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Sheet Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 id="reason-sheet-title" className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Tag size={16} className={isLeave ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'} />
              <span>{titleText} <span className="text-xs font-normal text-slate-500">(Optional)</span></span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-md">
              Assign to: <strong className={isLeave ? 'text-rose-700 dark:text-rose-300' : 'text-blue-700 dark:text-blue-300'}>{targetLabel}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sheet Body */}
        <form onSubmit={handleSave} className="p-4 space-y-3.5">
          {/* Recent Reasons Chips */}
          {recentReasons && recentReasons.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                <Clock size={12} />
                <span>Recent Reasons (Tap to select)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentReasons.map((chip) => {
                  const isSelected = reason.trim().toLowerCase() === chip.trim().toLowerCase();
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleSelectChip(chip)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all touch-target sm:min-w-0 sm:min-h-0 cursor-pointer ${
                        isSelected
                          ? isLeave
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-blue-600 text-white shadow-xs'
                          : isLeave
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-900/60'
                          : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-900/60'
                      }`}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Text Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isLeave ? 'Enter Reason for Leave (Optional)' : 'Enter Reason for OD (Optional)'}
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={placeholderText}
                className={`w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs ${
                  isLeave ? 'focus:outline-rose-500' : 'focus:outline-blue-500'
                }`}
              />
              {reason && (
                <button
                  type="button"
                  onClick={() => setReason('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 italic">
              * The reason is optional. If left blank, student is marked without reason.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all touch-target cursor-pointer"
            >
              Skip / No Reason
            </button>

            <button
              type="submit"
              className={`flex-1 py-2.5 px-3 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 touch-target active:scale-95 cursor-pointer ${
                isLeave ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Check size={16} />
              <span>Save Reason</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


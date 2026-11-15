import React from 'react';
import { Calendar, FileText, History, Users, Settings, Moon, Sun, CheckCircle } from 'lucide-react';

interface HeaderProps {
  currentTab: 'attendance' | 'history' | 'roster';
  onSelectTab: (tab: 'attendance' | 'history' | 'roster') => void;
  onOpenSettings: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  classNameTitle: string;
  hasUnsavedChanges?: boolean;
  saveMessage?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
  darkMode,
  onToggleDarkMode,
  classNameTitle,
  hasUnsavedChanges,
  saveMessage,
}) => {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-2xl mx-auto px-3 py-2.5">
        {/* Top bar: Title + Quick Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
              CR
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                  Attendance
                </h1>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                  {classNameTitle}
                </span>
              </div>
              {saveMessage ? (
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold animate-in fade-in">
                  <CheckCircle size={10} />
                  <span>{saveMessage}</span>
                </div>
              ) : hasUnsavedChanges ? (
                <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold animate-in fade-in">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Unsaved changes</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors touch-target flex items-center justify-center"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
            </button>

            {/* Settings button */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors touch-target flex items-center justify-center"
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <nav className="flex items-center gap-1 mt-2.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl" aria-label="Main tabs">
          <button
            type="button"
            onClick={() => onSelectTab('attendance')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 touch-target ${
              currentTab === 'attendance'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Calendar size={14} />
            <span>Attendance</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('history')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 touch-target ${
              currentTab === 'history'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <History size={14} />
            <span>Saved records</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('roster')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 touch-target ${
              currentTab === 'roster'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users size={14} />
            <span>Edit Roster</span>
          </button>
        </nav>
      </div>
    </header>
  );
};


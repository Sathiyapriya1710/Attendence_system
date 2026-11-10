import React, { useState } from 'react';
import { X, Save, Sun, Moon, Phone, User, BookOpen, AlertTriangle } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  onResetAllData: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetAllData,
}) => {
  const [salutation, setSalutation] = useState(settings.facultySalutation);
  const [phone, setPhone] = useState(settings.facultyPhone);
  const [className, setClassName] = useState(settings.className);
  const [darkMode, setDarkMode] = useState(settings.darkMode);
  const [confirmReset, setConfirmReset] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings({
      facultySalutation: salutation.trim() || 'Mam',
      facultyPhone: phone.trim(),
      className: className.trim() || 'II Year AI&DS - B',
      darkMode,
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">
            App Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          {/* Faculty Form of Address */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              <User size={14} className="text-emerald-600" />
              <span>Faculty Form of Address (Salutation)</span>
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Used in report: "Good morning, [Mam]." and "Thank you, [Mam]."
            </p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {['Mam', 'Sir'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSalutation(opt)}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                    salutation === opt
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {opt}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  if (salutation === 'Mam' || salutation === 'Sir') setSalutation('');
                }}
                className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                  salutation !== 'Mam' && salutation !== 'Sir'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Custom
              </button>
            </div>
            <input
              type="text"
              value={salutation}
              onChange={(e) => setSalutation(e.target.value)}
              placeholder="e.g. Mam, Sir, Dr. Shalini"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
              required
            />
          </div>

          {/* Faculty WhatsApp Phone Number */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              <Phone size={14} className="text-emerald-600" />
              <span>Faculty WhatsApp Number (Optional)</span>
            </label>
            <p className="text-[11px] text-slate-500 mb-1.5">
              Include country code (e.g. 919876543210). If left blank, WhatsApp lets you choose any contact.
            </p>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 919876543210"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500 font-mono"
            />
          </div>

          {/* Class / Department Name */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              <BookOpen size={14} className="text-emerald-600" />
              <span>Class / Section Name</span>
            </label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. AI&DS Section B"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
            />
          </div>

          {/* Dark Mode Switcher */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              {darkMode ? <Moon size={18} className="text-blue-400" /> : <Sun size={18} className="text-amber-500" />}
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Dark Mode</div>
                <div className="text-[11px] text-slate-500">Toggle dark / light appearance</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                darkMode ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
            </button>
          </div>

          {/* Danger Zone: Reset All Data */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            {confirmReset ? (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 rounded-xl space-y-2">
                <p className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1">
                  <AlertTriangle size={14} />
                  <span>Wipe all data and start fresh?</span>
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await onResetAllData();
                      setConfirmReset(false);
                      onClose();
                    }}
                    className="px-3 py-1 bg-rose-600 text-white font-bold text-xs rounded-lg"
                  >
                    Yes, Wipe All Data
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-xs font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
              >
                Clear all records & reset app
              </button>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 touch-target"
          >
            <Save size={16} />
            <span>{saveSuccess ? 'Saved!' : 'Save Settings'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Copy, Check, Share2, Download, MessageSquare, Edit3, ExternalLink, Loader2 } from 'lucide-react';
import { Student, AttendanceStatus } from '../types';
import { generateAttendanceReportText, buildWhatsAppShareUrl, ODStudentEntry } from '../utils/reportGenerator';
import { downloadAttendancePDF, openAttendancePDFInNewTab } from '../utils/pdfGenerator';
import { formatFullReportDate } from '../utils/dateUtils';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  students: Student[];
  attendance: Record<string, AttendanceStatus>;
  odReasons?: Record<string, string>;
  salutation: string;
  onUpdateSalutation: (newSalutation: string) => void;
  facultyPhone?: string;
  className?: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  date,
  students,
  attendance,
  odReasons = {},
  salutation,
  onUpdateSalutation,
  facultyPhone,
  className = 'II Year AI&DS - B',
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditingSalutation, setIsEditingSalutation] = useState(false);
  const [salutationInput, setSalutationInput] = useState(salutation);
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [pdfFeedback, setPdfFeedback] = useState<string>('');

  if (!isOpen) return null;

  // Filter students by category
  const presentStudents: Student[] = [];
  const leaveStudents: Student[] = [];
  const odStudents: ODStudentEntry[] = [];

  students.forEach((s) => {
    const status = attendance[s.id] || 'present';
    if (status === 'present') {
      presentStudents.push(s);
    } else if (status === 'leave') {
      leaveStudents.push(s);
    } else if (status === 'od') {
      odStudents.push({
        student: s,
        reason: odReasons[s.id] || '',
      });
    }
  });

  const totalStudents = students.length;
  const presentCount = presentStudents.length;
  const totalAbsent = leaveStudents.length; // IMPORTANT: OD never counted as absent

  const reportData = {
    date,
    salutation,
    className,
    totalStudents,
    presentCount,
    leaveStudents,
    odStudents,
    totalAbsent,
  };

  const reportText = generateAttendanceReportText(reportData);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = reportText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsApp = () => {
    const url = buildWhatsAppShareUrl(reportText, facultyPhone);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Attendance Report - ${className}`,
          text: reportText,
        });
      } catch (err) {
        console.log('Share dismissed', err);
      }
    } else {
      handleCopy();
    }
  };

  const handleDownloadPDF = async () => {
    setPdfStatus('generating');
    setPdfFeedback('Generating PDF...');
    try {
      const result = await downloadAttendancePDF(reportData, className);
      if (result.success) {
        if (result.method === 'shared') {
          setPdfStatus('success');
          setPdfFeedback('Opened in system share menu! You can save or send to WhatsApp.');
        } else if (result.method === 'opened_ios') {
          setPdfStatus('success');
          setPdfFeedback('PDF opened in Safari! Tap the share icon to save.');
        } else {
          setPdfStatus('success');
          setPdfFeedback('PDF download started successfully!');
        }
      } else {
        setPdfStatus('error');
        setPdfFeedback('Download blocked. Please tap "Preview / Print" to view and save.');
      }
    } catch {
      setPdfStatus('error');
      setPdfFeedback('Please tap "Preview / Print" to view and save.');
    } finally {
      setTimeout(() => setPdfStatus('idle'), 4500);
    }
  };

  const handlePreviewPDF = () => {
    openAttendancePDFInNewTab(reportData, className);
  };

  const handleSaveSalutation = (e: React.FormEvent) => {
    e.preventDefault();
    if (salutationInput.trim()) {
      onUpdateSalutation(salutationInput.trim());
      setIsEditingSalutation(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden border border-slate-200 dark:border-slate-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div>
            <h2 id="report-modal-title" className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">
              Faculty Attendance Report
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatFullReportDate(date)} · {className}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close report dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {/* Editable Faculty Form of Address */}
          <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 px-3 py-2 rounded-xl text-xs sm:text-sm">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Faculty address:</span>
            {isEditingSalutation ? (
              <form onSubmit={handleSaveSalutation} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={salutationInput}
                  onChange={(e) => setSalutationInput(e.target.value)}
                  placeholder="e.g. Mam, Sir, Dr. Rao"
                  className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold focus:outline-emerald-500 w-28"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700"
                >
                  Save
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {['Mam', 'Sir'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setSalutationInput(opt);
                        onUpdateSalutation(opt);
                      }}
                      className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                        salutation === opt
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                  {salutation !== 'Mam' && salutation !== 'Sir' && (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      "{salutation}"
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingSalutation(true)}
                  className="p-1 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                  title="Edit faculty title"
                >
                  <Edit3 size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Formatted Report Card */}
          <div className="relative">
            <div className="bg-slate-900 text-slate-100 rounded-xl p-3.5 sm:p-4 text-xs sm:text-sm font-mono whitespace-pre-wrap leading-relaxed shadow-inner border border-slate-800 selection:bg-emerald-600">
              {reportText}
            </div>
            {copied && (
              <div className="absolute top-3 right-3 bg-emerald-500 text-white px-2.5 py-1 rounded-md text-xs font-bold shadow-md flex items-center gap-1 animate-in fade-in">
                <Check size={13} />
                <span>Copied to clipboard!</span>
              </div>
            )}
          </div>

          {/* Quick Notice */}
          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
            * Note: OD students are grouped by reason and never counted as absent.
          </p>
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {/* Primary Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {/* WhatsApp Send Button */}
            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-2 py-3 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-sm shadow-md transition-all touch-target"
            >
              <MessageSquare size={17} />
              <span>Send WhatsApp</span>
            </button>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 py-3 px-3 bg-slate-800 dark:bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-xl text-sm shadow-sm transition-all touch-target"
            >
              {copied ? <Check size={17} className="text-emerald-400" /> : <Copy size={17} />}
              <span>{copied ? 'Copied!' : 'Copy Report'}</span>
            </button>
          </div>

          {/* PDF Status / Feedback Banner */}
          {pdfStatus !== 'idle' && (
            <div
              className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
                pdfStatus === 'generating'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  : pdfStatus === 'success'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              {pdfStatus === 'generating' && <Loader2 size={14} className="animate-spin shrink-0 text-blue-600" />}
              {pdfStatus === 'success' && <Check size={14} className="text-emerald-600 shrink-0" />}
              <span className="flex-1 leading-snug">{pdfFeedback}</span>
            </div>
          )}

          {/* Secondary Actions: PDF Download, PDF Preview & Native Share */}
          <div className="grid grid-cols-2 gap-2">
            {/* Download / Share PDF */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={pdfStatus === 'generating'}
              className="flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-all touch-target disabled:opacity-60"
            >
              {pdfStatus === 'generating' ? (
                <Loader2 size={15} className="animate-spin text-emerald-600" />
              ) : (
                <Download size={15} className="text-emerald-600" />
              )}
              <span>{pdfStatus === 'generating' ? 'Creating...' : 'Download PDF'}</span>
            </button>

            {/* Preview / Print PDF */}
            <button
              type="button"
              onClick={handlePreviewPDF}
              className="flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-all touch-target"
              title="Open PDF directly in a new tab to view, save, or print"
            >
              <ExternalLink size={15} className="text-blue-500" />
              <span>Preview / Print</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Student, AttendanceStatus, DailyAttendanceRecord, AppSettings, SavedStudentItem } from './types';
import { attendanceService } from './services/attendanceService';
import { getTodayISODate, formatDisplayDate } from './utils/dateUtils';
import { generateAttendanceReportText, buildWhatsAppShareUrl, ODStudentEntry } from './utils/reportGenerator';
import { downloadAttendancePDF } from './utils/pdfGenerator';
import { Header } from './components/Header';
import { DailyAttendance } from './components/DailyAttendance';
import { HistoryView } from './components/HistoryView';
import { RosterManager } from './components/RosterManager';

export const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [currentDate, setCurrentDate] = useState<string>(getTodayISODate());
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [odReasons, setOdReasons] = useState<Record<string, string>>({});
  const [leaveReasons, setLeaveReasons] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, DailyAttendanceRecord>>({});
  const [settings, setSettings] = useState<AppSettings>({
    facultySalutation: 'Mam',
    facultyGreetingTime: 'auto',
    facultyPhone: '',
    className: 'II Year AI&DS - B',
    darkMode: false,
    recentOdReasons: ['Hackathon', 'Sports', 'Paper presentation', 'Symposium', 'Workshop'],
    recentLeaveReasons: ['Fever', 'Family function', 'Medical', 'Personal', 'Out of station'],
  });

  const [currentTab, setCurrentTab] = useState<'attendance' | 'history' | 'roster'>('attendance');
  const [isLoading, setIsLoading] = useState(true);

  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Dialog State: Replace confirmation when record for date already exists
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  // Dialog State: Navigation guard modal when leaving with unsaved changes
  const [pendingNavigation, setPendingNavigation] = useState<{
    type: 'date' | 'tab';
    target: string;
  } | null>(null);

  // Apply dark mode class to root HTML element
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // Warn on browser unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Load initial data on mount
  useEffect(() => {
    async function init() {
      try {
        const [loadedStudents, loadedHistory, loadedSettings] = await Promise.all([
          attendanceService.getStudents(),
          attendanceService.getAllAttendanceHistory(),
          attendanceService.getSettings(),
        ]);

        setStudents(loadedStudents);
        setHistory(loadedHistory);
        setSettings(loadedSettings);

        // Load attendance and reasons for today
        const todayStr = getTodayISODate();
        const existingRecord = loadedHistory[todayStr];
        const defaultAtt: Record<string, AttendanceStatus> = {};
        loadedStudents.forEach((s) => {
          defaultAtt[s.id] = (existingRecord?.attendance?.[s.id] as AttendanceStatus) || 'present';
        });
        setAttendance(defaultAtt);
        setOdReasons(existingRecord?.odReasons || {});
        setLeaveReasons(existingRecord?.leaveReasons || {});
        // Since we loaded fresh data without modifications, unsaved is false
        setHasUnsavedChanges(false);
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Helper to load attendance data for a date
  const loadDateAttendance = useCallback(
    async (dateToLoad: string, currentHistory: Record<string, DailyAttendanceRecord>, studentList: Student[]) => {
      setCurrentDate(dateToLoad);
      const record = currentHistory[dateToLoad] || (await attendanceService.getDailyAttendance(dateToLoad));

      const dateAtt: Record<string, AttendanceStatus> = {};
      studentList.forEach((s) => {
        dateAtt[s.id] = (record?.attendance?.[s.id] as AttendanceStatus) || 'present';
      });
      setAttendance(dateAtt);
      setOdReasons(record?.odReasons || {});
      setLeaveReasons(record?.leaveReasons || {});
      setHasUnsavedChanges(false);
    },
    []
  );

  // Generate ReportData object in background
  const getReportDataObject = useCallback(() => {
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
    // INVARIANT: OD students NEVER counted as absent. Total Absent = leave only.
    const totalAbsent = leaveStudents.length;

    return {
      date: currentDate,
      salutation: settings.facultySalutation || 'Mam',
      className: settings.className || 'II Year AI&DS - B',
      totalStudents,
      presentCount,
      leaveStudents,
      odStudents,
      totalAbsent,
    };
  }, [students, attendance, odReasons, currentDate, settings]);

  // Background report text computation
  const currentReportText = useMemo(() => {
    return generateAttendanceReportText(getReportDataObject());
  }, [getReportDataObject]);

  // Execute Save Snapshot
  const executeSaveSnapshot = useCallback(async () => {
    setIsSaving(true);
    try {
      let present = 0;
      let leave = 0;
      let od = 0;

      const studentsList: SavedStudentItem[] = students.map((s) => {
        const status = attendance[s.id] || 'present';
        if (status === 'present') present++;
        else if (status === 'leave') leave++;
        else if (status === 'od') od++;

        return {
          id: s.id,
          sNo: s.sNo,
          regNo: s.regNo,
          name: s.name,
          status,
          odReason: odReasons[s.id] || '',
          leaveReason: leaveReasons[s.id] || '',
        };
      });

      const total = students.length;
      const totalAbsent = leave; // Invariant: leave only
      const nowIso = new Date().toISOString();

      const record: DailyAttendanceRecord = {
        date: currentDate,
        className: settings.className,
        facultyAddress: settings.facultySalutation,
        salutation: settings.facultySalutation,
        savedAt: nowIso,
        lastUpdated: nowIso,
        reportText: currentReportText,
        studentsList,
        attendance,
        odReasons,
        leaveReasons,
        totalStudents: total,
        counts: {
          total,
          present,
          leave,
          od,
          presentAndOd: present + od,
          totalAbsent,
        },
      };

      const savedRecord = await attendanceService.saveDailyAttendance(record);

      setHistory((prev) => ({
        ...prev,
        [currentDate]: savedRecord,
      }));

      setHasUnsavedChanges(false);
      setShowReplaceConfirm(false);

      // Flash short confirmation
      const msg = `Saved for ${formatDisplayDate(currentDate)}`;
      setSaveMessage(msg);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Error saving attendance snapshot:', err);
    } finally {
      setIsSaving(false);
    }
  }, [students, attendance, odReasons, leaveReasons, currentDate, settings, currentReportText]);

  // User taps "Save" button
  const handleTapSave = useCallback(() => {
    // One record per date.
    // If a record already exists for the selected date, ask:
    // "A record for this date already exists. Replace it?"
    if (history[currentDate]) {
      setShowReplaceConfirm(true);
    } else {
      executeSaveSnapshot();
    }
  }, [history, currentDate, executeSaveSnapshot]);

  // Navigation Guard: Changing date
  const requestDateChange = useCallback(
    (newDate: string) => {
      if (newDate === currentDate) return;

      if (hasUnsavedChanges) {
        setPendingNavigation({ type: 'date', target: newDate });
      } else {
        loadDateAttendance(newDate, history, students);
      }
    },
    [currentDate, hasUnsavedChanges, history, students, loadDateAttendance]
  );

  // Navigation Guard: Switching Tab
  const requestTabChange = useCallback(
    (newTab: 'attendance' | 'history' | 'roster') => {
      if (newTab === currentTab) return;

      if (hasUnsavedChanges && currentTab === 'attendance') {
        setPendingNavigation({ type: 'tab', target: newTab });
      } else {
        setCurrentTab(newTab);
      }
    },
    [currentTab, hasUnsavedChanges]
  );

  // Confirm navigation without saving (discard)
  const handleDiscardAndContinue = () => {
    if (!pendingNavigation) return;

    if (pendingNavigation.type === 'date') {
      loadDateAttendance(pendingNavigation.target, history, students);
    } else if (pendingNavigation.type === 'tab') {
      setCurrentTab(pendingNavigation.target as any);
      setHasUnsavedChanges(false);
    }
    setPendingNavigation(null);
  };

  // Confirm navigation with save first
  const handleSaveAndContinue = async () => {
    await executeSaveSnapshot();
    if (!pendingNavigation) return;

    if (pendingNavigation.type === 'date') {
      loadDateAttendance(pendingNavigation.target, history, students);
    } else if (pendingNavigation.type === 'tab') {
      setCurrentTab(pendingNavigation.target as any);
    }
    setPendingNavigation(null);
  };

  // Student status change (marks unsaved)
  const handleStatusChange = useCallback((studentId: string, status: AttendanceStatus) => {
    setAttendance((prevAtt) => {
      const nextAtt = { ...prevAtt, [studentId]: status };
      return nextAtt;
    });
    setOdReasons((prevReasons) => {
      const nextReasons = { ...prevReasons };
      if (status === 'present' || status === 'leave') {
        delete nextReasons[studentId];
      }
      return nextReasons;
    });
    setLeaveReasons((prevReasons) => {
      const nextReasons = { ...prevReasons };
      if (status === 'present' || status === 'od') {
        delete nextReasons[studentId];
      }
      return nextReasons;
    });
    setHasUnsavedChanges(true);
  }, []);

  // Save OD Reason for single student (marks unsaved)
  const handleSaveODReason = useCallback(
    async (studentId: string, reason: string) => {
      const trimmed = reason.trim();
      if (trimmed) {
        await attendanceService.addRecentOdReason(trimmed);
        const updatedSettings = await attendanceService.getSettings();
        setSettings(updatedSettings);
      }

      setAttendance((prevAtt) => ({ ...prevAtt, [studentId]: 'od' as AttendanceStatus }));
      setOdReasons((prevReasons) => {
        const nextReasons = { ...prevReasons };
        if (trimmed) {
          nextReasons[studentId] = trimmed;
        } else {
          delete nextReasons[studentId];
        }
        return nextReasons;
      });
      setLeaveReasons((prevReasons) => {
        const nextReasons = { ...prevReasons };
        delete nextReasons[studentId];
        return nextReasons;
      });
      setHasUnsavedChanges(true);
    },
    []
  );

  // Save Leave Reason for single student (marks unsaved)
  const handleSaveLeaveReason = useCallback(
    async (studentId: string, reason: string) => {
      const trimmed = reason.trim();
      if (trimmed) {
        await attendanceService.addRecentLeaveReason(trimmed);
        const updatedSettings = await attendanceService.getSettings();
        setSettings(updatedSettings);
      }

      setAttendance((prevAtt) => ({ ...prevAtt, [studentId]: 'leave' as AttendanceStatus }));
      setLeaveReasons((prevReasons) => {
        const nextReasons = { ...prevReasons };
        if (trimmed) {
          nextReasons[studentId] = trimmed;
        } else {
          delete nextReasons[studentId];
        }
        return nextReasons;
      });
      setOdReasons((prevReasons) => {
        const nextReasons = { ...prevReasons };
        delete nextReasons[studentId];
        return nextReasons;
      });
      setHasUnsavedChanges(true);
    },
    []
  );

  // Batch Status Change for "Select Many" (marks unsaved)
  const handleBatchStatusChange = useCallback(
    async (studentIds: string[], status: AttendanceStatus, reason?: string) => {
      const trimmedReason = (reason || '').trim();
      if (status === 'od' && trimmedReason) {
        await attendanceService.addRecentOdReason(trimmedReason);
        const updatedSettings = await attendanceService.getSettings();
        setSettings(updatedSettings);
      } else if (status === 'leave' && trimmedReason) {
        await attendanceService.addRecentLeaveReason(trimmedReason);
        const updatedSettings = await attendanceService.getSettings();
        setSettings(updatedSettings);
      }

      setAttendance((prevAtt) => {
        const nextAtt = { ...prevAtt };
        studentIds.forEach((id) => {
          nextAtt[id] = status;
        });
        return nextAtt;
      });

      setOdReasons((prevReasons) => {
        const nextReasons = { ...prevReasons };
        studentIds.forEach((id) => {
          if (status === 'od') {
            if (trimmedReason) {
              nextReasons[id] = trimmedReason;
            } else {
              delete nextReasons[id];
            }
          } else {
            delete nextReasons[id];
          }
        });
        return nextReasons;
      });

      setLeaveReasons((prevReasons) => {
        const nextReasons = { ...prevReasons };
        studentIds.forEach((id) => {
          if (status === 'leave') {
            if (trimmedReason) {
              nextReasons[id] = trimmedReason;
            } else {
              delete nextReasons[id];
            }
          } else {
            delete nextReasons[id];
          }
        });
        return nextReasons;
      });

      setHasUnsavedChanges(true);
    },
    []
  );

  // Reset entire day to All Present (marks unsaved)
  const handleResetDay = useCallback(() => {
    const resetAtt: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      resetAtt[s.id] = 'present';
    });
    setAttendance(resetAtt);
    setOdReasons({});
    setLeaveReasons({});
    setHasUnsavedChanges(true);
  }, [students]);

  // Background action: Download PDF
  const handleDownloadPDF = async () => {
    setIsPdfGenerating(true);
    try {
      const reportData = getReportDataObject();
      await downloadAttendancePDF(reportData, settings.className);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // Background action: Send to WhatsApp
  const handleSendWhatsApp = () => {
    const url = buildWhatsAppShareUrl(currentReportText, settings.facultyPhone);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Background action: Copy Report text
  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(currentReportText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = currentReportText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  // Roster Management Actions
  const handleAddStudent = async (studentData: Omit<Student, 'id'>) => {
    const updatedStudents = await attendanceService.addStudent(studentData);
    setStudents(updatedStudents);
    const newStudent = updatedStudents[updatedStudents.length - 1];
    if (newStudent) {
      setAttendance((prev) => ({ ...prev, [newStudent.id]: 'present' as AttendanceStatus }));
      setHasUnsavedChanges(true);
    }
  };

  const handleUpdateStudent = async (student: Student) => {
    const updated = await attendanceService.updateStudent(student);
    setStudents(updated);
  };

  const handleDeleteStudent = async (studentId: string) => {
    const updated = await attendanceService.deleteStudent(studentId);
    setStudents(updated);
    setAttendance((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
    setOdReasons((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
    setLeaveReasons((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const handleResetRoster = async () => {
    const original = await attendanceService.resetStudentsToDefault();
    setStudents(original);
    const resetAtt: Record<string, AttendanceStatus> = {};
    original.forEach((s) => {
      resetAtt[s.id] = 'present';
    });
    setAttendance(resetAtt);
    setOdReasons({});
    setLeaveReasons({});
    setHasUnsavedChanges(true);
  };

  // History delete
  const handleDeleteRecord = async (date: string) => {
    await attendanceService.deleteDailyAttendance(date);
    setHistory((prev) => {
      const next = { ...prev };
      delete next[date];
      return next;
    });
    if (date === currentDate) {
      handleResetDay();
      setHasUnsavedChanges(false);
    }
  };

  const handleUpdateSalutation = async (newSalutation: string) => {
    const updated = await attendanceService.saveSettings({ facultySalutation: newSalutation });
    setSettings(updated);
    setHasUnsavedChanges(true);
  };

  const handleChangeClassName = async (newClassName: string) => {
    const updated = await attendanceService.saveSettings({ className: newClassName });
    setSettings(updated);
    setHasUnsavedChanges(true);
  };

  const handleToggleDarkMode = async () => {
    const updated = await attendanceService.saveSettings({ darkMode: !settings.darkMode });
    setSettings(updated);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Loading AI&DS Roster...</p>
        </div>
      </div>
    );
  }

  const isSavedForDate = Boolean(history[currentDate]);
  const savedAtTime = history[currentDate]?.savedAt || history[currentDate]?.lastUpdated;

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Navigation & App Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={requestTabChange}
        darkMode={settings.darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        classNameTitle={settings.className}
        hasUnsavedChanges={hasUnsavedChanges}
        saveMessage={saveMessage}
      />

      {/* Main Screen Body */}
      <main className="flex-1">
        {currentTab === 'attendance' && (
          <DailyAttendance
            currentDate={currentDate}
            onDateChange={requestDateChange}
            students={students}
            attendance={attendance}
            odReasons={odReasons}
            leaveReasons={leaveReasons}
            onStatusChange={handleStatusChange}
            onSaveODReason={handleSaveODReason}
            onSaveLeaveReason={handleSaveLeaveReason}
            onBatchStatusChange={handleBatchStatusChange}
            onResetDay={handleResetDay}
            classNameTitle={settings.className}
            onChangeClassName={handleChangeClassName}
            facultySalutation={settings.facultySalutation}
            onChangeFacultySalutation={handleUpdateSalutation}
            recentOdReasons={settings.recentOdReasons || []}
            recentLeaveReasons={settings.recentLeaveReasons || []}
            // Save & Status props
            onSaveDay={handleTapSave}
            isSavedForDate={isSavedForDate}
            hasUnsavedChanges={hasUnsavedChanges}
            savedAtTime={savedAtTime}
            isSaving={isSaving}
            saveMessage={saveMessage}
            // Direct background report actions
            onDownloadPDF={handleDownloadPDF}
            onSendWhatsApp={handleSendWhatsApp}
            onCopyReport={handleCopyReport}
            isPdfGenerating={isPdfGenerating}
            isCopied={isCopied}
          />
        )}

        {currentTab === 'history' && (
          <HistoryView
            history={history}
            students={students}
            classNameTitle={settings.className}
            onSelectDate={(date) => {
              loadDateAttendance(date, history, students);
              setCurrentTab('attendance');
            }}
            onDeleteRecord={handleDeleteRecord}
            onBack={() => setCurrentTab('attendance')}
          />
        )}

        {currentTab === 'roster' && (
          <RosterManager
            students={students}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onResetRoster={handleResetRoster}
            onBack={() => setCurrentTab('attendance')}
          />
        )}
      </main>

      {/* Replace Confirmation Modal (Requirement 3: "A record for this date already exists. Replace it?") */}
      {showReplaceConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Replace existing record?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              A record for this date already exists. Replace it?
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowReplaceConfirm(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSaveSnapshot}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Navigation Guard Modal (Requirement 3: Warn before leaving with unsaved changes) */}
      {pendingNavigation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Unsaved changes
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              You have unsaved changes for {formatDisplayDate(currentDate)}. Leaving without saving will discard your latest edits.
            </p>
            <div className="flex gap-2 justify-end pt-2 flex-wrap">
              <button
                type="button"
                onClick={() => setPendingNavigation(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={handleDiscardAndContinue}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
              >
                Discard & Leave
              </button>
              <button
                type="button"
                onClick={handleSaveAndContinue}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;

import React, { useState, useEffect, useCallback } from 'react';
import { Student, AttendanceStatus, DailyAttendanceRecord, AppSettings } from './types';
import { attendanceService } from './services/attendanceService';
import { getTodayISODate } from './utils/dateUtils';
import { Header } from './components/Header';
import { DailyAttendance } from './components/DailyAttendance';
import { HistoryView } from './components/HistoryView';
import { RosterManager } from './components/RosterManager';
import { ReportModal } from './components/ReportModal';
import { SettingsModal } from './components/SettingsModal';

export const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [currentDate, setCurrentDate] = useState<string>(getTodayISODate());
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [odReasons, setOdReasons] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, DailyAttendanceRecord>>({});
  const [settings, setSettings] = useState<AppSettings>({
    facultySalutation: 'Mam',
    facultyGreetingTime: 'auto',
    facultyPhone: '',
    className: 'II Year AI&DS - B',
    darkMode: false,
    recentOdReasons: ['Hackathon', 'Sports', 'Paper presentation', 'Symposium', 'Workshop'],
  });

  const [currentTab, setCurrentTab] = useState<'attendance' | 'history' | 'roster'>('attendance');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAutoSaved, setIsAutoSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Apply dark mode class to root HTML element
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

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
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // When date changes, load that date's attendance and OD reasons
  const handleDateChange = useCallback(
    async (newDate: string) => {
      setCurrentDate(newDate);
      const record = history[newDate] || (await attendanceService.getDailyAttendance(newDate));

      const dateAtt: Record<string, AttendanceStatus> = {};
      students.forEach((s) => {
        dateAtt[s.id] = (record?.attendance?.[s.id] as AttendanceStatus) || 'present';
      });
      setAttendance(dateAtt);
      setOdReasons(record?.odReasons || {});
    },
    [history, students]
  );

  // Helper to persist attendance changes
  const saveCurrentAttendance = useCallback(
    async (
      updatedAttendance: Record<string, AttendanceStatus>,
      updatedReasons: Record<string, string>,
      date: string,
      studentList: Student[]
    ) => {
      let present = 0;
      let leave = 0;
      let od = 0;

      studentList.forEach((s) => {
        const status = updatedAttendance[s.id] || 'present';
        if (status === 'present') present++;
        else if (status === 'leave') leave++;
        else if (status === 'od') od++;
      });

      const total = studentList.length;
      // INVARIANT: OD students NEVER counted as absent. Total Absent = leave only.
      const totalAbsent = leave;

      const record: DailyAttendanceRecord = {
        date,
        attendance: updatedAttendance,
        odReasons: updatedReasons,
        lastUpdated: new Date().toISOString(),
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

      await attendanceService.saveDailyAttendance(record);

      setHistory((prev) => ({
        ...prev,
        [date]: record,
      }));

      // Flash auto-saved indicator
      setIsAutoSaved(true);
      setTimeout(() => setIsAutoSaved(false), 2000);
    },
    []
  );

  // Single Student Status Change
  // Rule: Changing a student back to P or L clears their OD reason.
  const handleStatusChange = useCallback(
    (studentId: string, status: AttendanceStatus) => {
      setAttendance((prevAtt) => {
        const nextAtt = { ...prevAtt, [studentId]: status };
        setOdReasons((prevReasons) => {
          const nextReasons = { ...prevReasons };
          if (status === 'present' || status === 'leave') {
            delete nextReasons[studentId];
          }
          saveCurrentAttendance(nextAtt, nextReasons, currentDate, students);
          return nextReasons;
        });
        return nextAtt;
      });
    },
    [currentDate, students, saveCurrentAttendance]
  );

  // Save OD Reason for a single student
  const handleSaveODReason = useCallback(
    async (studentId: string, reason: string) => {
      const trimmed = reason.trim();
      if (trimmed) {
        await attendanceService.addRecentOdReason(trimmed);
        const updatedSettings = await attendanceService.getSettings();
        setSettings(updatedSettings);
      }

      setAttendance((prevAtt) => {
        const nextAtt = { ...prevAtt, [studentId]: 'od' as AttendanceStatus };
        setOdReasons((prevReasons) => {
          const nextReasons = { ...prevReasons };
          if (trimmed) {
            nextReasons[studentId] = trimmed;
          } else {
            delete nextReasons[studentId];
          }
          saveCurrentAttendance(nextAtt, nextReasons, currentDate, students);
          return nextReasons;
        });
        return nextAtt;
      });
    },
    [currentDate, students, saveCurrentAttendance]
  );

  // Batch Status Change for "Select Many" Mode
  const handleBatchStatusChange = useCallback(
    async (studentIds: string[], status: AttendanceStatus, reason?: string) => {
      const trimmedReason = (reason || '').trim();
      if (status === 'od' && trimmedReason) {
        await attendanceService.addRecentOdReason(trimmedReason);
        const updatedSettings = await attendanceService.getSettings();
        setSettings(updatedSettings);
      }

      setAttendance((prevAtt) => {
        const nextAtt = { ...prevAtt };
        studentIds.forEach((id) => {
          nextAtt[id] = status;
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
          saveCurrentAttendance(nextAtt, nextReasons, currentDate, students);
          return nextReasons;
        });

        return nextAtt;
      });
    },
    [currentDate, students, saveCurrentAttendance]
  );

  // Reset entire day to All Present (clears OD reasons for this day)
  const handleResetDay = useCallback(() => {
    const resetAtt: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      resetAtt[s.id] = 'present';
    });
    setAttendance(resetAtt);
    setOdReasons({});
    saveCurrentAttendance(resetAtt, {}, currentDate, students);
  }, [students, currentDate, saveCurrentAttendance]);

  // Mark all present
  const handleMarkAllPresent = useCallback(() => {
    handleResetDay();
  }, [handleResetDay]);

  // Roster Management Actions
  const handleAddStudent = async (studentData: Omit<Student, 'id'>) => {
    const updatedStudents = await attendanceService.addStudent(studentData);
    setStudents(updatedStudents);

    // Initialize new student as present in current attendance
    const newStudent = updatedStudents[updatedStudents.length - 1];
    if (newStudent) {
      setAttendance((prev) => {
        const next = { ...prev, [newStudent.id]: 'present' as AttendanceStatus };
        saveCurrentAttendance(next, odReasons, currentDate, updatedStudents);
        return next;
      });
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
      const nextReasons = { ...odReasons };
      delete nextReasons[studentId];
      setOdReasons(nextReasons);
      saveCurrentAttendance(next, nextReasons, currentDate, updated);
      return next;
    });
  };

  const handleResetRoster = async () => {
    const original = await attendanceService.resetStudentsToDefault();
    setStudents(original);
    // Reset today's attendance to default
    const resetAtt: Record<string, AttendanceStatus> = {};
    original.forEach((s) => {
      resetAtt[s.id] = 'present';
    });
    setAttendance(resetAtt);
    setOdReasons({});
    saveCurrentAttendance(resetAtt, {}, currentDate, original);
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
    }
  };

  // Settings Save
  const handleSaveSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = await attendanceService.saveSettings(newSettings);
    setSettings(updated);
  };

  const handleUpdateSalutation = async (newSalutation: string) => {
    const updated = await attendanceService.saveSettings({ facultySalutation: newSalutation });
    setSettings(updated);
  };

  const handleChangeClassName = async (newClassName: string) => {
    const updated = await attendanceService.saveSettings({ className: newClassName });
    setSettings(updated);
  };

  const handleToggleDarkMode = async () => {
    const updated = await attendanceService.saveSettings({ darkMode: !settings.darkMode });
    setSettings(updated);
  };

  const handleResetAllData = async () => {
    localStorage.clear();
    const defaultStudents = await attendanceService.resetStudentsToDefault();
    setStudents(defaultStudents);
    setHistory({});
    const defaultAtt: Record<string, AttendanceStatus> = {};
    defaultStudents.forEach((s) => {
      defaultAtt[s.id] = 'present';
    });
    setAttendance(defaultAtt);
    setOdReasons({});
    setSettings({
      facultySalutation: 'Mam',
      facultyGreetingTime: 'auto',
      facultyPhone: '',
      className: 'II Year AI&DS - B',
      darkMode: false,
      recentOdReasons: ['Hackathon', 'Sports', 'Paper presentation', 'Symposium', 'Workshop'],
    });
  };

  const handleReloadAfterImport = async () => {
    const [loadedStudents, loadedHistory, loadedSettings] = await Promise.all([
      attendanceService.getStudents(),
      attendanceService.getAllAttendanceHistory(),
      attendanceService.getSettings(),
    ]);
    setStudents(loadedStudents);
    setHistory(loadedHistory);
    setSettings(loadedSettings);
    handleDateChange(currentDate);
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

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Navigation & App Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        darkMode={settings.darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        classNameTitle={settings.className}
        isSaved={isAutoSaved}
      />

      {/* Main Screen Body */}
      <main className="flex-1">
        {currentTab === 'attendance' && (
          <DailyAttendance
            currentDate={currentDate}
            onDateChange={handleDateChange}
            students={students}
            attendance={attendance}
            odReasons={odReasons}
            onStatusChange={handleStatusChange}
            onSaveODReason={handleSaveODReason}
            onBatchStatusChange={handleBatchStatusChange}
            onResetDay={handleResetDay}
            onMarkAllPresent={handleMarkAllPresent}
            onOpenReport={() => setIsReportOpen(true)}
            classNameTitle={settings.className}
            onChangeClassName={handleChangeClassName}
            facultySalutation={settings.facultySalutation}
            onChangeFacultySalutation={handleUpdateSalutation}
            recentOdReasons={settings.recentOdReasons || []}
          />
        )}

        {currentTab === 'history' && (
          <HistoryView
            history={history}
            students={students}
            onSelectDate={(date) => {
              handleDateChange(date);
              setCurrentTab('attendance');
            }}
            onDeleteRecord={handleDeleteRecord}
            onBack={() => setCurrentTab('attendance')}
            onDataImported={handleReloadAfterImport}
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

      {/* Faculty Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        date={currentDate}
        students={students}
        attendance={attendance}
        odReasons={odReasons}
        salutation={settings.facultySalutation}
        onUpdateSalutation={handleUpdateSalutation}
        facultyPhone={settings.facultyPhone}
        className={settings.className}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onResetAllData={handleResetAllData}
      />
    </div>
  );
};

export default App;

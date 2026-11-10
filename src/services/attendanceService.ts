import { Student, DailyAttendanceRecord, AttendanceStatus, AppSettings, StudentAttendanceStat } from '../types';
import { INITIAL_ROSTER } from '../data/initialRoster';

const STORAGE_KEYS = {
  STUDENTS: 'cr_attendance_students_v1',
  RECORDS: 'cr_attendance_records_v1',
  SETTINGS: 'cr_attendance_settings_v1',
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  facultySalutation: 'Mam',
  facultyGreetingTime: 'auto',
  facultyPhone: '',
  className: 'II Year AI&DS - B',
  darkMode: false,
  recentOdReasons: ['Hackathon', 'Sports', 'Paper presentation', 'Symposium', 'Workshop'],
};

/**
 * Attendance Service Layer
 * All read and write operations are isolated here.
 * Future migration to Firebase Firestore or Supabase requires modifying only this service file.
 */
class AttendanceService {
  /**
   * Get student roster. Initializes with default 63 students if empty,
   * and merges any missing students from INITIAL_ROSTER without duplicating.
   */
  async getStudents(): Promise<Student[]> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (!data) {
        // Initialize with default roster (63 students)
        await this.saveStudents(INITIAL_ROSTER);
        return [...INITIAL_ROSTER];
      }
      const parsed: Student[] = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        await this.saveStudents(INITIAL_ROSTER);
        return [...INITIAL_ROSTER];
      }

      // Check for any students from INITIAL_ROSTER (e.g. 61 to 63) not yet present in roster
      const existingRegNos = new Set(parsed.map((s) => s.regNo.trim().toUpperCase()));
      const existingIds = new Set(parsed.map((s) => s.id));
      let updated = false;
      const mergedList = [...parsed];

      for (const initStudent of INITIAL_ROSTER) {
        const regMatch = existingRegNos.has(initStudent.regNo.trim().toUpperCase());
        const idMatch = existingIds.has(initStudent.id);
        if (!regMatch && !idMatch) {
          mergedList.push(initStudent);
          existingRegNos.add(initStudent.regNo.trim().toUpperCase());
          existingIds.add(initStudent.id);
          updated = true;
        }
      }

      if (updated) {
        await this.saveStudents(mergedList);
        return mergedList;
      }

      return parsed;
    } catch (err) {
      console.error('Error reading students:', err);
      return [...INITIAL_ROSTER];
    }
  }

  /**
   * Save student roster
   */
  async saveStudents(students: Student[]): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    } catch (err) {
      console.error('Error saving students:', err);
      throw err;
    }
  }

  /**
   * Reset roster to initial 63 students
   */
  async resetStudentsToDefault(): Promise<Student[]> {
    await this.saveStudents(INITIAL_ROSTER);
    return [...INITIAL_ROSTER];
  }

  /**
   * Add a new student
   */
  async addStudent(studentData: Omit<Student, 'id'>): Promise<Student[]> {
    const students = await this.getStudents();
    const newStudent: Student = {
      ...studentData,
      id: String(Date.now()),
    };
    const updated = [...students, newStudent];
    await this.saveStudents(updated);
    return updated;
  }

  /**
   * Update student details
   */
  async updateStudent(student: Student): Promise<Student[]> {
    const students = await this.getStudents();
    const updated = students.map((s) => (s.id === student.id ? student : s));
    await this.saveStudents(updated);
    return updated;
  }

  /**
   * Delete student
   */
  async deleteStudent(studentId: string): Promise<Student[]> {
    const students = await this.getStudents();
    const updated = students.filter((s) => s.id !== studentId);
    await this.saveStudents(updated);
    return updated;
  }

  /**
   * Get attendance record for a specific date (YYYY-MM-DD)
   */
  async getDailyAttendance(date: string): Promise<DailyAttendanceRecord | null> {
    try {
      const allRecords = await this.getAllAttendanceHistory();
      return allRecords[date] || null;
    } catch (err) {
      console.error(`Error getting attendance for ${date}:`, err);
      return null;
    }
  }

  /**
   * Save or update attendance record for a date
   */
  async saveDailyAttendance(record: DailyAttendanceRecord): Promise<void> {
    try {
      const allRecords = await this.getAllAttendanceHistory();
      allRecords[record.date] = record;
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(allRecords));
    } catch (err) {
      console.error(`Error saving attendance for ${record.date}:`, err);
      throw err;
    }
  }

  /**
   * Get all past attendance records with automatic data migration:
   * Converts legacy "hackathon" to "od" with reason "Hackathon",
   * and "sports" to "od" with reason "Sports".
   */
  async getAllAttendanceHistory(): Promise<Record<string, DailyAttendanceRecord>> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
      if (!data) return {};
      const parsed: Record<string, any> = JSON.parse(data);
      let hasMigration = false;

      const migratedRecords: Record<string, DailyAttendanceRecord> = {};

      for (const [date, rec] of Object.entries(parsed)) {
        const attendance: Record<string, AttendanceStatus> = {};
        const odReasons: Record<string, string> = { ...(rec.odReasons || {}) };

        for (const [sId, rawStatus] of Object.entries(rec.attendance || {})) {
          if (rawStatus === 'hackathon') {
            attendance[sId] = 'od';
            if (!odReasons[sId]) odReasons[sId] = 'Hackathon';
            hasMigration = true;
          } else if (rawStatus === 'sports') {
            attendance[sId] = 'od';
            if (!odReasons[sId]) odReasons[sId] = 'Sports';
            hasMigration = true;
          } else if (rawStatus === 'leave') {
            attendance[sId] = 'leave';
          } else if (rawStatus === 'od') {
            attendance[sId] = 'od';
          } else {
            attendance[sId] = 'present';
          }
        }

        let present = 0;
        let leave = 0;
        let od = 0;
        for (const st of Object.values(attendance)) {
          if (st === 'present') present++;
          else if (st === 'leave') leave++;
          else if (st === 'od') od++;
        }

        const totalStudents = rec.totalStudents || 63;
        migratedRecords[date] = {
          date: rec.date || date,
          attendance,
          odReasons,
          lastUpdated: rec.lastUpdated || new Date().toISOString(),
          totalStudents,
          counts: {
            total: totalStudents,
            present,
            leave,
            od,
            presentAndOd: present + od,
            totalAbsent: leave,
          },
        };
      }

      if (hasMigration) {
        localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(migratedRecords));
      }

      return migratedRecords;
    } catch (err) {
      console.error('Error getting attendance history:', err);
      return {};
    }
  }

  /**
   * Delete attendance record for a date
   */
  async deleteDailyAttendance(date: string): Promise<void> {
    const allRecords = await this.getAllAttendanceHistory();
    if (allRecords[date]) {
      delete allRecords[date];
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(allRecords));
    }
  }

  /**
   * Get app settings
   */
  async getSettings(): Promise<AppSettings> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        recentOdReasons: Array.isArray(parsed.recentOdReasons) && parsed.recentOdReasons.length > 0
          ? parsed.recentOdReasons
          : DEFAULT_SETTINGS.recentOdReasons,
      };
    } catch (err) {
      console.error('Error reading settings:', err);
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Save app settings
   */
  async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      return updated;
    } catch (err) {
      console.error('Error saving settings:', err);
      throw err;
    }
  }

  /**
   * Add a reason to the recent OD reasons list (max 8, case-insensitive deduplication, most recent first)
   */
  async addRecentOdReason(reason: string): Promise<string[]> {
    const trimmed = reason.trim();
    if (!trimmed) {
      const s = await this.getSettings();
      return s.recentOdReasons;
    }

    const current = await this.getSettings();
    const existingList = current.recentOdReasons || [];

    // Filter out existing reason with same lowercase to avoid duplication
    const filtered = existingList.filter((r) => r.trim().toLowerCase() !== trimmed.toLowerCase());
    const updated = [trimmed, ...filtered].slice(0, 8); // Keep last 8

    await this.saveSettings({ recentOdReasons: updated });
    return updated;
  }

  /**
   * Compute per-student attendance percentage and breakdown across all saved dates
   */
  computeStudentStatistics(
    students: Student[],
    history: Record<string, DailyAttendanceRecord>
  ): StudentAttendanceStat[] {
    const dateEntries = Object.values(history);
    const totalRecordedDays = dateEntries.length;

    return students.map((student) => {
      let presentDays = 0;
      let leaveDays = 0;
      let odDays = 0;

      dateEntries.forEach((record) => {
        const rawStatus = (record.attendance[student.id] || 'present') as any;
        if (rawStatus === 'present') presentDays++;
        else if (rawStatus === 'leave') leaveDays++;
        else if (rawStatus === 'od' || rawStatus === 'hackathon' || rawStatus === 'sports') odDays++;
      });

      // In college rules, OD is On Duty (considered attended)
      const attendedDays = presentDays + odDays;
      const percentage = totalRecordedDays > 0 ? (attendedDays / totalRecordedDays) * 100 : 100;

      return {
        student,
        totalDays: totalRecordedDays,
        presentDays,
        leaveDays,
        odDays,
        attendancePercentage: Math.round(percentage * 10) / 10,
      };
    });
  }

  /**
   * Export all data as JSON
   */
  async exportBackup(): Promise<string> {
    const students = await this.getStudents();
    const history = await this.getAllAttendanceHistory();
    const settings = await this.getSettings();

    const backupData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      students,
      history,
      settings,
    };

    return JSON.stringify(backupData, null, 2);
  }

  /**
   * Import data from JSON
   */
  async importBackup(jsonStr: string): Promise<{ success: boolean; message: string }> {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.students || !data.history) {
        return { success: false, message: 'Invalid backup file format.' };
      }

      await this.saveStudents(data.students);
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(data.history));
      if (data.settings) {
        await this.saveSettings(data.settings);
      }

      return { success: true, message: 'Data imported successfully!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to parse JSON backup.' };
    }
  }
}

export const attendanceService = new AttendanceService();

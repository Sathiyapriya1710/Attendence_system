export type AttendanceStatus = 'present' | 'leave' | 'od';
export type LegacyAttendanceStatus = 'present' | 'leave' | 'hackathon' | 'sports' | 'od';

export interface Student {
  id: string;
  sNo: number;
  regNo: string;
  name: string;
}

export interface DailyAttendanceRecord {
  date: string; // ISO date 'YYYY-MM-DD'
  attendance: Record<string, AttendanceStatus>; // studentId -> status
  odReasons?: Record<string, string>; // studentId -> reason (free text)
  lastUpdated: string;
  totalStudents: number;
  counts: {
    total: number;
    present: number;
    leave: number;
    od: number;
    presentAndOd: number;
    totalAbsent: number; // Leave only
  };
}

export interface AppSettings {
  facultySalutation: string; // e.g. "Mam" or "Sir"
  facultyGreetingTime: 'auto' | 'morning' | 'afternoon' | 'evening';
  facultyPhone: string; // optional WhatsApp phone number with country code, e.g. 919876543210
  className: string; // default "II Year AI&DS - B"
  darkMode: boolean;
  recentOdReasons: string[]; // last 8 reasons used
}

export interface StudentAttendanceStat {
  student: Student;
  totalDays: number;
  presentDays: number;
  leaveDays: number;
  odDays: number;
  attendancePercentage: number; // (present + OD) / totalDays * 100
}

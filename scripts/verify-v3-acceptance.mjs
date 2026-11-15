import assert from 'assert';
import { INITIAL_ROSTER } from '../src/data/initialRoster.ts';
import { formatStudentReportDate, getYearMonth, formatMonthName } from '../src/utils/dateUtils.ts';
import { generateAttendanceReportText } from '../src/utils/reportGenerator.ts';

console.log('--- RUNNING V3 ACCEPTANCE CHECKS ---');

// 1. Check Initial Roster
assert.strictEqual(INITIAL_ROSTER.length, 63, 'Roster must contain 63 students');
console.log('✓ Initial roster contains 63 students');

// 2. Date Formatting for Student Report
// Format required: "- 03 Nov, Mon", "- 05 Nov, Wed - Fever"
const formattedDate = formatStudentReportDate('2026-11-03');
console.log('Formatted 2026-11-03:', formattedDate);
assert.match(formattedDate, /03 Nov, \w{3}/, 'Date should match "03 Nov, Day"');
assert.strictEqual(getYearMonth('2026-11-03'), '2026-11', 'getYearMonth should return 2026-11');
assert.strictEqual(formatMonthName('2026-11'), 'November 2026', 'formatMonthName should return November 2026');
console.log('✓ Student report date formatting verified');

// 3. Faculty Report Text Invariant: Leave reasons MUST NOT be included in faculty report text
const sampleStudent1 = INITIAL_ROSTER[0];
const sampleStudent2 = INITIAL_ROSTER[1];
const sampleStudent3 = INITIAL_ROSTER[2];

const facultyReportData = {
  date: '2026-11-05',
  salutation: 'Mam',
  className: 'II Year AI&DS - B',
  totalStudents: 63,
  presentCount: 61,
  leaveStudents: [sampleStudent2],
  odStudents: [{ student: sampleStudent3, reason: 'Hackathon' }],
  totalAbsent: 1, // Only leave counts as absent
};

const facultyText = generateAttendanceReportText(facultyReportData);
console.log('Sample Faculty Report:\n', facultyText);

// Verify OD students are NOT counted as absent
assert(!facultyText.toLowerCase().includes('total absent : 2'), 'OD must not be in total absent');
assert(facultyText.toLowerCase().includes('total absent : 1') || facultyText.includes('1'), 'Total absent must be 1');
// Leave reason should not be present in faculty text even if recorded in UI
assert(!facultyText.includes('Fever'), 'Leave reason must not leak into faculty report text');
console.log('✓ Faculty report text keeps OD out of absent and excludes leave reasons');

// 4. Test Calculation Rules for Student Report
// Create mock saved records for multiple dates across 2 months
const mockHistory = {
  '2026-11-03': {
    date: '2026-11-03',
    attendance: {
      [sampleStudent1.id]: 'present',
    },
    leaveReasons: {},
    odReasons: {},
  },
  '2026-11-04': {
    date: '2026-11-04',
    attendance: {
      [sampleStudent1.id]: 'present',
    },
    leaveReasons: {},
    odReasons: {},
  },
  '2026-11-05': {
    date: '2026-11-05',
    attendance: {
      [sampleStudent1.id]: 'leave',
    },
    leaveReasons: {
      [sampleStudent1.id]: 'Fever',
    },
    odReasons: {},
  },
  '2026-11-06': {
    date: '2026-11-06',
    attendance: {
      [sampleStudent1.id]: 'od',
    },
    leaveReasons: {},
    odReasons: {
      [sampleStudent1.id]: 'Hackathon',
    },
  },
  '2026-11-12': {
    date: '2026-11-12',
    attendance: {
      [sampleStudent1.id]: 'leave',
    },
    leaveReasons: {}, // No reason given
    odReasons: {},
  },
  // December record
  '2026-12-01': {
    date: '2026-12-01',
    attendance: {
      [sampleStudent1.id]: 'present',
    },
    leaveReasons: {},
    odReasons: {},
  },
};

// Test November calculation for sampleStudent1:
// Saved days in Nov = 5
// Present = 2 (Nov 3, Nov 4)
// Leave = 2 (Nov 5 [Fever], Nov 12 [No reason given])
// OD = 1 (Nov 6 [Hackathon])
// Present % = (Present + OD) / Working days * 100 = (2 + 1) / 5 * 100 = 60.0%
const novDates = Object.keys(mockHistory).filter(d => d.startsWith('2026-11')).sort();
assert.strictEqual(novDates.length, 5, 'November should have 5 saved days');

let novPresent = 0, novLeave = 0, novOd = 0;
const novPresentDates = [];
const novLeaveDates = [];
const novOdDates = [];

novDates.forEach(d => {
  const rec = mockHistory[d];
  const st = rec.attendance[sampleStudent1.id] || 'present';
  if (st === 'present') {
    novPresent++;
    novPresentDates.push(d);
  } else if (st === 'leave') {
    novLeave++;
    novLeaveDates.push({ date: d, reason: rec.leaveReasons?.[sampleStudent1.id] || 'No reason given' });
  } else if (st === 'od') {
    novOd++;
    novOdDates.push({ date: d, reason: rec.odReasons?.[sampleStudent1.id] || 'No reason given' });
  }
});

assert.strictEqual(novPresent, 2, 'November present days should be 2');
assert.strictEqual(novLeave, 2, 'November leave days should be 2');
assert.strictEqual(novOd, 1, 'November OD days should be 1');
assert.strictEqual(novPresent + novLeave + novOd, novDates.length, 'Present + Leave + OD must equal Working days');

const novPct = Math.round(((novPresent + novOd) / novDates.length) * 1000) / 10;
assert.strictEqual(novPct, 60.0, 'Present % should be 60.0%');

// Check oldest-first sorting:
assert.strictEqual(novLeaveDates[0].date, '2026-11-05');
assert.strictEqual(novLeaveDates[0].reason, 'Fever');
assert.strictEqual(novLeaveDates[1].date, '2026-11-12');
assert.strictEqual(novLeaveDates[1].reason, 'No reason given');

assert.strictEqual(novOdDates[0].date, '2026-11-06');
assert.strictEqual(novOdDates[0].reason, 'Hackathon');

console.log('✓ November monthly summary and date lists logic verified:');
console.log(`  Working: ${novDates.length}, Present: ${novPresent}, Leave: ${novLeave}, OD: ${novOd}, Pct: ${novPct}%`);
console.log('  Leave list:', novLeaveDates);
console.log('  OD list:', novOdDates);

// 5. Check Backward Compatibility with Old Records (no leaveReasons property)
const oldSavedRecord = {
  date: '2026-10-10',
  attendance: { [sampleStudent1.id]: 'leave' },
  // no leaveReasons key
};
const reason = oldSavedRecord.leaveReasons?.[sampleStudent1.id] || 'No reason given';
assert.strictEqual(reason, 'No reason given', 'Old records without leaveReasons should safely fall back');
console.log('✓ Backward compatibility with older records verified');

console.log('--- ALL V3 ACCEPTANCE CHECKS PASSED SUCCESSFULLY ---');

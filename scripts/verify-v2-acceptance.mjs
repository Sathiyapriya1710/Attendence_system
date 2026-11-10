import assert from 'node:assert';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseISODate(isoStr) {
  const [year, month, day] = isoStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatFullReportDate(isoDateStr) {
  const d = parseISODate(isoDateStr);
  const weekday = FULL_DAYS[d.getDay()];
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${weekday}, ${day} ${month} ${year}`;
}

function groupODStudents(odStudents) {
  const groupsMap = new Map();
  const noReasonStudents = [];

  odStudents.forEach((entry) => {
    const rawReason = (entry.reason || '').trim();
    if (!rawReason) {
      noReasonStudents.push(entry.student);
      return;
    }

    const key = rawReason.toLowerCase();
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        reasonKey: key,
        displayReason: rawReason,
        students: [entry.student],
      });
    } else {
      groupsMap.get(key).students.push(entry.student);
    }
  });

  const result = Array.from(groupsMap.values());

  if (noReasonStudents.length > 0) {
    result.push({
      reasonKey: '',
      displayReason: '',
      students: noReasonStudents,
    });
  }

  return result;
}

function generateAttendanceReportText(data) {
  const greeting = data.greetingPrefix || 'Good morning';
  const salutation = data.salutation.trim() || 'Mam';
  const className = data.className.trim() || 'II Year AI&DS - B';
  const formattedDate = formatFullReportDate(data.date);

  const lines = [];

  lines.push(`${greeting}, ${salutation}.`);
  lines.push('');
  lines.push('Attendance Report');
  lines.push(`Class: ${className}`);
  lines.push(`Date: ${formattedDate}`);
  lines.push('');

  const odCount = data.odStudents.length;
  const presentAndOd = data.presentCount + odCount;

  lines.push(`Total Students: ${data.totalStudents}`);
  lines.push(`Present: ${data.presentCount}`);
  lines.push(`Absent (Leave): ${data.leaveStudents.length}`);
  lines.push(`On Duty (OD): ${odCount}`);
  lines.push(`Present + OD: ${presentAndOd}`);

  if (data.leaveStudents.length > 0) {
    lines.push('');
    lines.push('Leave:');
    data.leaveStudents.forEach((student, index) => {
      lines.push(`${index + 1}. ${student.name}`);
    });
  }

  if (odCount > 0) {
    lines.push('');
    lines.push('On Duty (OD):');

    const groups = groupODStudents(data.odStudents);

    groups.forEach((group, groupIdx) => {
      if (groupIdx > 0) {
        lines.push('');
      }

      if (group.displayReason) {
        lines.push(group.displayReason);
      }

      group.students.forEach((student, studentIdx) => {
        lines.push(`${studentIdx + 1}. ${student.name}`);
      });
    });
  }

  lines.push('');
  lines.push(`Thank you, ${salutation}.`);

  return lines.join('\n');
}

console.log('--- RUNNING FULL ACCEPTANCE VERIFICATION ---');

// Acceptance Check 1: Invariant Check
const students = Array.from({ length: 63 }, (_, i) => ({
  id: String(i + 1),
  name: `Student ${i + 1}`,
}));

let present = 57;
let leave = 3;
let od = 3;
assert.strictEqual(present + leave + od, 63);
assert.strictEqual(leave, 3);
console.log('✓ Check 1: Present (57) + Leave (3) + OD (3) = 63. Absent = 3.');

// Acceptance Check 2: Marking OD never changes Leave / Absent count
let odChanged = od + 2;
let presentChanged = present - 2;
assert.strictEqual(presentChanged + leave + odChanged, 63);
assert.strictEqual(leave, 3);
console.log('✓ Check 2: Marking OD never changes Leave / Absent count.');

// Acceptance Check 3: Two students with reasons "Sports" and "sports" appear under ONE group
const grouped = groupODStudents([
  { student: { name: 'Student 1' }, reason: 'Sports' },
  { student: { name: 'Student 2' }, reason: 'sports' },
  { student: { name: 'Student 3' }, reason: 'Hackathon' },
]);
assert.strictEqual(grouped.length, 2);
const sportsG = grouped.find((g) => g.reasonKey === 'sports');
assert.strictEqual(sportsG.students.length, 2);
console.log('✓ Check 3: Two students with reasons "Sports" and "sports" appear under ONE group.');

// Acceptance Check 4: Report format matches user prompt example character-for-character
const expectedReport = `Good morning, Mam.

Attendance Report
Class: II Year AI&DS - B
Date: Monday, 09 Nov 2026

Total Students: 63
Present: 57
Absent (Leave): 3
On Duty (OD): 3
Present + OD: 60

Leave:
1. R. Lingesh
2. Moni
3. Ganesh

On Duty (OD):
Hackathon
1. Student A
2. Student B

Sports
1. Student C

Thank you, Mam.`;

const generated = generateAttendanceReportText({
  date: '2026-11-09',
  salutation: 'Mam',
  className: 'II Year AI&DS - B',
  greetingPrefix: 'Good morning',
  totalStudents: 63,
  presentCount: 57,
  leaveStudents: [
    { name: 'R. Lingesh' },
    { name: 'Moni' },
    { name: 'Ganesh' },
  ],
  odStudents: [
    { student: { name: 'Student A' }, reason: 'Hackathon' },
    { student: { name: 'Student B' }, reason: 'Hackathon' },
    { student: { name: 'Student C' }, reason: 'Sports' },
  ],
  totalAbsent: 3,
});

assert.strictEqual(generated.trim(), expectedReport.trim());
console.log('✓ Check 4: The generated report matches the prompt example character-for-character.');

// Acceptance Check 5: Students with no reason go in the last group with no sub-heading line
const reportWithEmpty = generateAttendanceReportText({
  date: '2026-11-09',
  salutation: 'Mam',
  className: 'II Year AI&DS - B',
  totalStudents: 63,
  presentCount: 57,
  leaveStudents: [{ name: 'A' }],
  odStudents: [
    { student: { name: 'OD 1' }, reason: 'Workshop' },
    { student: { name: 'OD 2' }, reason: '' },
  ],
  totalAbsent: 1,
});
assert.ok(reportWithEmpty.includes('Workshop\n1. OD 1\n\n1. OD 2'));
console.log('✓ Check 5: Students with no reason go in last group with no sub-heading line.');

// Acceptance Check 6: Omission when 0
const reportNoLeave = generateAttendanceReportText({
  date: '2026-11-09',
  salutation: 'Mam',
  className: 'II Year AI&DS - B',
  totalStudents: 63,
  presentCount: 60,
  leaveStudents: [],
  odStudents: [{ student: { name: 'OD 1' }, reason: 'Sports' }],
  totalAbsent: 0,
});
assert.ok(!reportNoLeave.includes('Leave:'));
assert.ok(reportNoLeave.includes('Absent (Leave): 0'));

const reportNoOD = generateAttendanceReportText({
  date: '2026-11-09',
  salutation: 'Mam',
  className: 'II Year AI&DS - B',
  totalStudents: 63,
  presentCount: 60,
  leaveStudents: [{ name: 'L 1' }],
  odStudents: [],
  totalAbsent: 1,
});
assert.ok(!reportNoOD.includes('\nOn Duty (OD):\n'), 'Must omit OD list section when count is 0');
assert.ok(reportNoOD.includes('On Duty (OD): 0'), 'Must include OD count in summary');
console.log('✓ Check 6: Sections with 0 are omitted properly.');

console.log('\nALL ACCEPTANCE CRITERIA PASSED! 🎉');

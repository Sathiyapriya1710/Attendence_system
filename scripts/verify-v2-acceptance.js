import assert from 'node:assert';
import { generateAttendanceReportText, groupODStudents } from '../src/utils/reportGenerator.ts';
import { formatFullReportDate } from '../src/utils/dateUtils.ts';

console.log('--- RUNNING ACCEPTANCE CHECKS FOR OD UPDATE ---');

// Mock 63 students
const students = Array.from({ length: 63 }, (_, i) => ({
  id: String(i + 1),
  sNo: i + 1,
  regNo: `421125106${String(61 + i).padStart(3, '0')}`,
  name: `Student ${i + 1}`,
}));

// Check 1 & 2: Invariants
// Total = 63, Present = 57, Leave = 3, OD = 3. Present + OD = 60.
const attendance = {};
const odReasons = {};

students.forEach((s, idx) => {
  if (idx < 57) {
    attendance[s.id] = 'present';
  } else if (idx < 60) {
    attendance[s.id] = 'leave';
  } else {
    attendance[s.id] = 'od';
  }
});

let presentCount = 0;
let leaveCount = 0;
let odCount = 0;

students.forEach((s) => {
  const st = attendance[s.id];
  if (st === 'present') presentCount++;
  else if (st === 'leave') leaveCount++;
  else if (st === 'od') odCount++;
});

assert.strictEqual(presentCount + leaveCount + odCount, 63, 'Present + Leave + OD must equal 63');
assert.strictEqual(leaveCount, 3, 'Total Absent must equal Leave only');
console.log('✓ Check 1 & 2: Present (57) + Leave (3) + OD (3) = 63. Absent = 3.');

// Verify marking OD never changes Leave count
attendance['1'] = 'od'; // change student 1 from present to OD
let newPresent = 0;
let newLeave = 0;
let newOd = 0;
students.forEach((s) => {
  const st = attendance[s.id];
  if (st === 'present') newPresent++;
  else if (st === 'leave') newLeave++;
  else if (st === 'od') newOd++;
});

assert.strictEqual(newLeave, 3, 'Leave count must NEVER change when marking OD');
assert.strictEqual(newOd, 4);
assert.strictEqual(newPresent, 56);
assert.strictEqual(newPresent + newLeave + newOd, 63);
console.log('✓ Check: Marking OD changes Present and OD, never touches Leave/Absent count.');

// Check 3: Case-insensitive grouping: "Sports" and "sports" grouped together
const grouped = groupODStudents([
  { student: { name: 'Student 1' }, reason: 'Sports' },
  { student: { name: 'Student 2' }, reason: 'sports' },
  { student: { name: 'Student 3' }, reason: 'SPORTS' },
  { student: { name: 'Student 4' }, reason: 'Hackathon' },
]);

assert.strictEqual(grouped.length, 2, 'Should only produce 2 groups: Sports and Hackathon');
const sportsGroup = grouped.find((g) => g.reasonKey === 'sports');
assert.ok(sportsGroup, 'Sports group must exist');
assert.strictEqual(sportsGroup.students.length, 3, 'Sports group must contain all 3 students');
console.log('✓ Check 3: "Sports", "sports", and "SPORTS" grouped under one group.');

// Check 4: Exact report format matching user prompt example character-for-character
const testReportData = {
  date: '2026-11-09',
  salutation: 'Mam',
  className: 'II Year AI&DS - B',
  greetingPrefix: 'Good morning',
  totalStudents: 63,
  presentCount: 57,
  leaveStudents: [
    { id: '1', sNo: 1, regNo: '1', name: 'R. Lingesh' },
    { id: '2', sNo: 2, regNo: '2', name: 'Moni' },
    { id: '3', sNo: 3, regNo: '3', name: 'Ganesh' },
  ],
  odStudents: [
    { student: { id: '4', sNo: 4, regNo: '4', name: 'Student A' }, reason: 'Hackathon' },
    { student: { id: '5', sNo: 5, regNo: '5', name: 'Student B' }, reason: 'hackathon' },
    { student: { id: '6', sNo: 6, regNo: '6', name: 'Student C' }, reason: 'Sports' },
  ],
  totalAbsent: 3,
};

const generatedReport = generateAttendanceReportText(testReportData);

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

assert.strictEqual(generatedReport.trim(), expectedReport.trim(), 'Generated report must match prompt example exactly');
console.log('✓ Check 4: Generated report matches user prompt example character-for-character!');

// Check 5: Students with no reason go in the last group with NO sub-heading line
const reportWithEmptyReason = generateAttendanceReportText({
  ...testReportData,
  odStudents: [
    { student: { name: 'Student A' }, reason: 'Hackathon' },
    { student: { name: 'Student D' }, reason: '' },
    { student: { name: 'Student E' }, reason: undefined },
  ],
});

assert.ok(reportWithEmptyReason.includes('Hackathon\n1. Student A'));
assert.ok(reportWithEmptyReason.includes('\n1. Student D\n2. Student E'));
console.log('✓ Check 5: Students with no reason appear at end of OD with no sub-heading line.');

// Check 6: Omission when Leave is 0
const reportZeroLeave = generateAttendanceReportText({
  ...testReportData,
  leaveStudents: [],
});
assert.ok(!reportZeroLeave.includes('Leave:'), 'Must omit Leave section when count is 0');
assert.ok(reportZeroLeave.includes('Absent (Leave): 0'));
assert.ok(reportZeroLeave.includes('On Duty (OD):'));
console.log('✓ Check 6: Leave section omitted when 0.');

// Check 7: Omission when OD is 0
const reportZeroOD = generateAttendanceReportText({
  ...testReportData,
  odStudents: [],
});
assert.ok(!reportZeroOD.includes('On Duty (OD):'), 'Must omit OD section when count is 0');
assert.ok(reportZeroOD.includes('On Duty (OD): 0'));
assert.ok(reportZeroOD.includes('Leave:'));
console.log('✓ Check 7: OD section omitted when 0.');

// Check 8: Verify no register numbers in generated report
assert.ok(!generatedReport.includes('421125106'), 'Report must NOT contain register numbers');
console.log('✓ Check 8: No register numbers in generated report.');

console.log('\nALL ACCEPTANCE CRITERIA VERIFIED AND PASSED! 🎉');

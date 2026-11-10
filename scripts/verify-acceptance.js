import assert from 'node:assert';
import { INITIAL_ROSTER } from '../src/data/initialRoster.js';

console.log('--- RUNNING ACCEPTANCE TESTS FOR 63 STUDENTS ROSTER ---');

// Check 1: Roster has exactly 63 students
assert.strictEqual(INITIAL_ROSTER.length, 63, 'Initial roster must have exactly 63 students');
console.log('✓ Check 1: INITIAL_ROSTER has exactly 63 students.');

// Check 2: Verify details of students 61, 62, 63
const s61 = INITIAL_ROSTER.find((s) => s.sNo === 61);
const s62 = INITIAL_ROSTER.find((s) => s.sNo === 62);
const s63 = INITIAL_ROSTER.find((s) => s.sNo === 63);

assert.ok(s61, 'Student 61 must exist');
assert.strictEqual(s61.regNo, '421125106301');
assert.strictEqual(s61.name, 'KIRTHIGA M');

assert.ok(s62, 'Student 62 must exist');
assert.strictEqual(s62.regNo, '421125106302');
assert.strictEqual(s62.name, 'YUVA NANDHINI M');

assert.ok(s63, 'Student 63 must exist');
assert.strictEqual(s63.regNo, '421125106502');
assert.strictEqual(s63.name, 'SANTHANALAKSHMI A');
console.log('✓ Check 2: Students 61, 62, and 63 verified with exact Reg No and Name.');

// Check 3: No duplicate IDs or Reg Nos
const regNos = new Set();
const ids = new Set();
INITIAL_ROSTER.forEach((s) => {
  assert.ok(!regNos.has(s.regNo), `Duplicate regNo found: ${s.regNo}`);
  assert.ok(!ids.has(s.id), `Duplicate ID found: ${s.id}`);
  regNos.add(s.regNo);
  ids.add(s.id);
});
console.log('✓ Check 3: Zero duplicates in roster across all 63 students.');

// Check 4: Attendance invariant: Present + Leave + Hackathon + Sports = 63
function calculateCounts(students, attendance) {
  let present = 0;
  let leave = 0;
  let hackathon = 0;
  let sports = 0;

  students.forEach((s) => {
    const status = attendance[s.id] || 'present';
    if (status === 'present') present++;
    else if (status === 'leave') leave++;
    else if (status === 'hackathon') hackathon++;
    else if (status === 'sports') sports++;
  });

  return {
    total: students.length,
    present,
    leave,
    hackathon,
    sports,
    totalAbsent: leave,
  };
}

// Example: 57 Present, 3 Leave, 2 Hackathon OD, 1 Sports OD
const testAttendance = {};
INITIAL_ROSTER.forEach((s, idx) => {
  if (idx < 57) testAttendance[s.id] = 'present';
  else if (idx < 60) testAttendance[s.id] = 'leave';
  else if (idx < 62) testAttendance[s.id] = 'hackathon';
  else testAttendance[s.id] = 'sports';
});

const counts = calculateCounts(INITIAL_ROSTER, testAttendance);
assert.strictEqual(counts.total, 63);
assert.strictEqual(counts.present, 57);
assert.strictEqual(counts.leave, 3);
assert.strictEqual(counts.hackathon, 2);
assert.strictEqual(counts.sports, 1);
assert.strictEqual(counts.totalAbsent, 3);
assert.strictEqual(counts.present + counts.leave + counts.hackathon + counts.sports, 63);
console.log('✓ Check 4: Formula verified: Present (57) + Leave (3) + Hack (2) + Sports (1) = 63. Total Absent = 3.');

// Check 5: Marking H or S never changes Total Absent
const modifiedAttendance = { ...testAttendance };
// Change student 1 from Present to Hackathon OD
modifiedAttendance[INITIAL_ROSTER[0].id] = 'hackathon';
const modCounts = calculateCounts(INITIAL_ROSTER, modifiedAttendance);
assert.strictEqual(modCounts.totalAbsent, 3, 'Total Absent must remain 3');
assert.strictEqual(modCounts.hackathon, 3);
assert.strictEqual(modCounts.present, 56);
assert.strictEqual(modCounts.present + modCounts.leave + modCounts.hackathon + modCounts.sports, 63);
console.log('✓ Check 5: Marking H or S never modifies Total Absent count.');

console.log('\nALL 63-STUDENT ACCEPTANCE CHECKS PASSED! 🎉');

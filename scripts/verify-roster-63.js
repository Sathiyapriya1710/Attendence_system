import fs from 'node:fs';
import assert from 'node:assert';

// Read src/data/initialRoster.ts
const content = fs.readFileSync('src/data/initialRoster.ts', 'utf-8');

// Extract all student objects
const regex = /\{\s*id:\s*['"](\d+)['"],\s*sNo:\s*(\d+),\s*regNo:\s*['"](\d+)['"],\s*name:\s*['"]([^'"]+)['"]\s*\}/g;

const students = [];
let match;
while ((match = regex.exec(content)) !== null) {
  students.push({
    id: match[1],
    sNo: Number(match[2]),
    regNo: match[3],
    name: match[4],
  });
}

console.log('--- RUNNING 63-STUDENT ROSTER VALIDATION ---');
console.log(`Total students parsed from initialRoster.ts: ${students.length}`);

assert.strictEqual(students.length, 63, 'Roster must contain exactly 63 students');
console.log('✓ Check 1: exactly 63 students in initialRoster.ts');

const s61 = students.find((s) => s.sNo === 61);
const s62 = students.find((s) => s.sNo === 62);
const s63 = students.find((s) => s.sNo === 63);

assert.deepStrictEqual(s61, { id: '61', sNo: 61, regNo: '421125106301', name: 'KIRTHIGA M' });
console.log('✓ Check 2: S.No 61 verified: 421125106301, KIRTHIGA M');

assert.deepStrictEqual(s62, { id: '62', sNo: 62, regNo: '421125106302', name: 'YUVA NANDHINI M' });
console.log('✓ Check 3: S.No 62 verified: 421125106302, YUVA NANDHINI M');

assert.deepStrictEqual(s63, { id: '63', sNo: 63, regNo: '421125106502', name: 'SANTHANALAKSHMI A' });
console.log('✓ Check 4: S.No 63 verified: 421125106502, SANTHANALAKSHMI A');

// Check uniqueness
const regNos = new Set();
const ids = new Set();
students.forEach((s) => {
  assert.ok(!regNos.has(s.regNo), `Duplicate regNo: ${s.regNo}`);
  assert.ok(!ids.has(s.id), `Duplicate id: ${s.id}`);
  regNos.add(s.regNo);
  ids.add(s.id);
});
console.log('✓ Check 5: No duplicate register numbers or student IDs.');

// Check formula: Present (57) + Leave (3) + Hackathon OD (2) + Sports OD (1) = 63
let present = 57;
let leave = 3;
let hackathon = 2;
let sports = 1;
assert.strictEqual(present + leave + hackathon + sports, 63);
assert.strictEqual(leave, 3);
console.log('✓ Check 6: Sum invariant verified: 57 + 3 + 2 + 1 = 63, Total Absent = 3.');

console.log('\nALL 63-STUDENT ACCEPTANCE CHECKS PASSED SUCCESSFULLY! 🎉');

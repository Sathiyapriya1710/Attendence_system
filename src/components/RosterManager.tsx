import React, { useState } from 'react';
import { UserPlus, Trash2, Edit2, RotateCcw, Search, Check, X, Users, ArrowLeft } from 'lucide-react';
import { Student } from '../types';

interface RosterManagerProps {
  students: Student[];
  onAddStudent: (student: Omit<Student, 'id'>) => Promise<void>;
  onUpdateStudent: (student: Student) => Promise<void>;
  onDeleteStudent: (studentId: string) => Promise<void>;
  onResetRoster: () => Promise<void>;
  onBack: () => void;
}

export const RosterManager: React.FC<RosterManagerProps> = ({
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onResetRoster,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  // New Student Form State
  const nextSNo = students.length > 0 ? Math.max(...students.map((s) => s.sNo)) + 1 : 1;
  const lastRegNo = students.length > 0 ? students[students.length - 1].regNo : '421125106120';
  // Compute next suggested regNo if it's numeric
  const nextSuggestedRegNo = !isNaN(Number(lastRegNo)) ? String(BigInt(lastRegNo) + 1n) : '';

  const [newSNo, setNewSNo] = useState<number>(nextSNo);
  const [newRegNo, setNewRegNo] = useState<string>(nextSuggestedRegNo);
  const [newName, setNewName] = useState<string>('');

  // Editing State
  const [editSNo, setEditSNo] = useState<number>(1);
  const [editRegNo, setEditRegNo] = useState<string>('');
  const [editName, setEditName] = useState<string>('');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Filter students based on search
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.regNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(s.sNo).includes(searchQuery)
  );

  const handleStartAdd = () => {
    setNewSNo(students.length > 0 ? Math.max(...students.map((s) => s.sNo)) + 1 : 1);
    setNewRegNo(!isNaN(Number(lastRegNo)) ? String(BigInt(lastRegNo) + 1n) : '');
    setNewName('');
    setShowAddForm(true);
  };

  const handleSaveNewStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newRegNo.trim()) return;

    await onAddStudent({
      sNo: Number(newSNo) || nextSNo,
      regNo: newRegNo.trim().toUpperCase(),
      name: newName.trim().toUpperCase(),
    });

    setNewName('');
    setNewSNo((prev) => prev + 1);
    if (!isNaN(Number(newRegNo))) {
      setNewRegNo(String(BigInt(newRegNo) + 1n));
    }
    setShowAddForm(false);
  };

  const handleStartEdit = (student: Student) => {
    setEditingStudentId(student.id);
    setEditSNo(student.sNo);
    setEditRegNo(student.regNo);
    setEditName(student.name);
  };

  const handleSaveEdit = async (studentId: string) => {
    if (!editName.trim() || !editRegNo.trim()) return;
    await onUpdateStudent({
      id: studentId,
      sNo: Number(editSNo),
      regNo: editRegNo.trim().toUpperCase(),
      name: editName.trim().toUpperCase(),
    });
    setEditingStudentId(null);
  };

  // Helper to add the remaining 3 students (S.No 61, 62, 63)
  const handleQuickAddRemainingThree = async () => {
    const remainingToAdd = [
      { sNo: 61, regNo: '421125106301', name: 'KIRTHIGA M' },
      { sNo: 62, regNo: '421125106302', name: 'YUVA NANDHINI M' },
      { sNo: 63, regNo: '421125106502', name: 'SANTHANALAKSHMI A' },
    ];
    for (const item of remainingToAdd) {
      if (!students.some((s) => s.regNo === item.regNo || s.sNo === item.sNo)) {
        await onAddStudent(item);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 space-y-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-all touch-target"
        >
          <ArrowLeft size={16} />
          <span>Back to Attendance</span>
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-full font-bold text-xs border border-emerald-200 dark:border-emerald-800">
          <Users size={14} />
          <span>{students.length} Students in Roster</span>
        </div>
      </div>

      {/* Screen Title & Quick Add Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              Edit Class Roster
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage student register numbers and names (AI&DS Section B)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {students.length === 60 && (
              <button
                type="button"
                onClick={handleQuickAddRemainingThree}
                className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
                title="Quickly add students 61 to 63"
              >
                + Quick Add 61-63
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-lg text-xs shadow-sm transition-all touch-target"
            >
              <UserPlus size={15} />
              <span>{showAddForm ? 'Cancel' : 'Add Student'}</span>
            </button>
          </div>
        </div>

        {/* Add Student Form */}
        {showAddForm && (
          <form
            onSubmit={handleSaveNewStudent}
            className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl space-y-3 animate-in fade-in"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Add New Student
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  S.No
                </label>
                <input
                  type="number"
                  value={newSNo}
                  onChange={(e) => setNewSNo(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Register Number
                </label>
                <input
                  type="text"
                  value={newRegNo}
                  onChange={(e) => setNewRegNo(e.target.value)}
                  placeholder="e.g. 421125106121"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-mono font-semibold focus:outline-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. SATHISH K"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
              >
                Save Student
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by student name or reg number..."
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-emerald-500 shadow-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Student List */}
      <div className="space-y-2">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              No students found matching "{searchQuery}"
            </p>
          </div>
        ) : (
          filteredStudents.map((student) => {
            const isEditing = editingStudentId === student.id;

            if (isEditing) {
              return (
                <div
                  key={student.id}
                  className="bg-white dark:bg-slate-900 p-3 rounded-xl border-2 border-emerald-500 shadow-md space-y-2"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500">S.No</label>
                      <input
                        type="number"
                        value={editSNo}
                        onChange={(e) => setEditSNo(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500">Reg No</label>
                      <input
                        type="text"
                        value={editRegNo}
                        onChange={(e) => setEditRegNo(e.target.value)}
                        className="w-full px-2 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500">Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingStudentId(null)}
                      className="px-2.5 py-1 text-xs rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(student.id)}
                      className="px-3 py-1 text-xs rounded bg-emerald-600 text-white font-bold inline-flex items-center gap-1"
                    >
                      <Check size={14} />
                      Save
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={student.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      #{student.sNo}
                    </span>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-semibold">
                      {student.regNo}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate mt-0.5">
                    {student.name}
                  </h4>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(student)}
                    className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors touch-target"
                    title={`Edit ${student.name}`}
                  >
                    <Edit2 size={16} />
                  </button>

                  {confirmDeleteId === student.id ? (
                    <div className="flex items-center gap-1 animate-in fade-in">
                      <button
                        type="button"
                        onClick={async () => {
                          await onDeleteStudent(student.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2 py-1 bg-rose-600 text-white rounded text-xs font-bold"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="p-1 text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(student.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors touch-target"
                      title={`Delete ${student.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reset to Default 60 Students */}
      <div className="pt-4 pb-8 border-t border-slate-200 dark:border-slate-800">
        {confirmReset ? (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 rounded-xl space-y-2">
            <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
              Reset roster back to the original 63 students? Custom edits will be overwritten.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await onResetRoster();
                  setConfirmReset(false);
                }}
                className="px-3 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-lg hover:bg-rose-700"
              >
                Yes, Reset Roster
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
          >
            <RotateCcw size={14} />
            <span>Restore Default AI&DS Roster (63 students)</span>
          </button>
        )}
      </div>
    </div>
  );
};

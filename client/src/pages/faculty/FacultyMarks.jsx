import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { attendanceApi, marksApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  Award,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  BookOpen,
  FileSpreadsheet
} from 'lucide-react';

const EXAM_TYPES = [
  { id: 'internal_1', label: 'Internal Assessment 1' },
  { id: 'internal_2', label: 'Internal Assessment 2' },
  { id: 'assignment', label: 'Continuous Lab & Assignment' },
  { id: 'final', label: 'Semester Final Examination' }
];

export default function FacultyMarks() {
  const toast = useToast();
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('internal_1');
  const [students, setStudents] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Load courses
  useEffect(() => {
    async function loadCourses() {
      setLoadingCourses(true);
      setError(null);
      try {
        const res = await attendanceApi.getCourses();
        if (res.success && res.courses?.length > 0) {
          setCourses(res.courses);
          setSelectedCourseId(String(res.courses[0].id));
        }
      } catch (err) {
        console.error('Error fetching faculty courses:', err);
        setError('Failed to load courses.');
      } finally {
        setLoadingCourses(false);
      }
    }
    loadCourses();
  }, []);

  // Load marks sheet
  const loadSheet = async () => {
    if (!selectedCourseId || !selectedExamType) return;
    setLoadingSheet(true);
    setError(null);
    try {
      const res = await marksApi.getSheet(selectedCourseId, selectedExamType);
      if (res.success) {
        const mapped = (res.students || []).map((s) => ({
          student_id: s.student_id,
          name: s.name,
          email: s.email,
          avatar_url: s.avatar_url,
          score: s.score !== null && s.score !== undefined ? String(s.score) : '',
          max_score: s.max_score || 100,
          remarks: s.remarks || '',
          isInvalid: false
        }));
        setStudents(mapped);
      } else {
        setError(res.message || 'Failed to load marks sheet.');
      }
    } catch (err) {
      console.error('Error loading marks sheet:', err);
      setError(err.message || 'Failed to fetch marks sheet.');
    } finally {
      setLoadingSheet(false);
    }
  };

  useEffect(() => {
    if (selectedCourseId && selectedExamType) {
      loadSheet();
    }
  }, [selectedCourseId, selectedExamType]);

  // Update score with instant client-side validation
  const handleScoreChange = (studentId, rawValue) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.student_id !== studentId) return s;

        const val = rawValue.trim();
        let isInvalid = false;

        if (val !== '') {
          const num = Number(val);
          if (isNaN(num) || num < 0 || num > s.max_score) {
            isInvalid = true;
          }
        }

        return { ...s, score: rawValue, isInvalid };
      })
    );
  };

  const handleRemarksChange = (studentId, remarks) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, remarks } : s))
    );
  };

  // Has any invalid score?
  const hasInvalidScores = students.some((s) => s.isInvalid);

  // Save marks
  const handleSave = async () => {
    if (hasInvalidScores) return;

    // Filter students who have a score entered
    const validRecords = students
      .filter((s) => s.score !== '')
      .map((s) => ({
        student_id: s.student_id,
        score: Number(s.score),
        max_score: Number(s.max_score) || 100,
        remarks: s.remarks
      }));

    if (validRecords.length === 0) {
      setError('Please enter at least one score before saving.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await marksApi.save({
        course_id: Number(selectedCourseId),
        exam_type: selectedExamType,
        records: validRecords
      });

      if (res.success) {
        setToastMessage(`✓ Successfully saved evaluation marks for ${res.count} student(s)!`);
        toast.success(`Successfully saved evaluation marks for ${res.count} student(s)!`, 'Marks Recorded');
        setTimeout(() => setToastMessage(null), 4000);
        loadSheet();
      } else {
        setError(res.message || 'Failed to save marks.');
        toast.error(res.message || 'Failed to save marks.');
      }
    } catch (err) {
      console.error('Error saving marks:', err);
      setError(err.message || 'Failed to save marks.');
      toast.error(err.message || 'Failed to save marks.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCourse = courses.find((c) => String(c.id) === String(selectedCourseId));

  return (
    <AppLayout title="Course Marks Entry">
      <div className="space-y-6">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-bounce text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            {toastMessage}
          </div>
        )}

        {/* Hero Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider">
                Faculty Workspace
              </span>
              <span className="text-blue-200 text-xs">• Assessment Grading Matrix</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Enter & Freeze Examination Marks</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Grade students across internal exams, laboratory assignments, and final semester tests with instant range validation and atomic database locking.
            </p>
          </div>

          <button
            onClick={loadSheet}
            disabled={loadingSheet}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSheet ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl p-4 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Controls Bar */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 grow">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Select Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                disabled={loadingCourses || courses.length === 0}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Evaluation Exam Type
              </label>
              <select
                value={selectedExamType}
                onChange={(e) => setSelectedExamType(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100"
              >
                {EXAM_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="self-end md:self-auto pt-2 md:pt-0">
            <button
              onClick={handleSave}
              disabled={saving || loadingSheet || hasInvalidScores || students.length === 0}
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all ${
                hasInvalidScores
                  ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-500/20'
              }`}
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save & Lock Scores
            </button>
          </div>
        </div>

        {/* Invalid score notification if any */}
        {hasInvalidScores && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-2xl p-3.5 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Please correct highlighted scores (must be between 0 and maximum score) before saving.</span>
          </div>
        )}

        {/* Scores Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Evaluation Matrix — {selectedCourse?.name || 'Class'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Enter numerical scores for each student. Maximum score is fixed at 100.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
              {EXAM_TYPES.find((t) => t.id === selectedExamType)?.label}
            </span>
          </div>

          {loadingSheet ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Loading student marks register...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
              No students enrolled in this course.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4 w-44">Score (Max 100)</th>
                    <th className="py-3 px-4">Feedback Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-200">
                  {students.map((student, idx) => (
                    <tr key={student.student_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400 dark:text-slate-500 font-bold">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={student.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`}
                            alt={student.name}
                            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover bg-slate-100 dark:bg-slate-800"
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{student.name}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={student.max_score}
                            placeholder="Score"
                            value={student.score}
                            onChange={(e) => handleScoreChange(student.student_id, e.target.value)}
                            className={`w-24 px-3 py-1.5 text-xs font-bold rounded-lg border text-center transition-all ${
                              student.isInvalid
                                ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 focus:ring-1 focus:ring-rose-500'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-600 text-slate-900 dark:text-white'
                            }`}
                          />
                          <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold">/ {student.max_score}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Optional examiner remarks..."
                          value={student.remarks}
                          onChange={(e) => handleRemarksChange(student.student_id, e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-600"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

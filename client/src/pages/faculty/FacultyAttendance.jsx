import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { attendanceApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  BookOpen,
  Save,
  Check,
  AlertCircle,
  Users,
  RefreshCw,
  Radio
} from 'lucide-react';

function getTodayString() {
  const d = new Date();
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
}

export default function FacultyAttendance() {
  const toast = useToast();
  const today = getTodayString();
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedDate, setSelectedDate] = useState(today);
  const [students, setStudents] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Load faculty's courses
  useEffect(() => {
    async function loadCourses() {
      setLoadingCourses(true);
      setError(null);
      try {
        const res = await attendanceApi.getCourses();
        if (res.success && res.courses?.length > 0) {
          setCourses(res.courses);
          setSelectedCourseId(String(res.courses[0].id));
        } else {
          setCourses([]);
        }
      } catch (err) {
        console.error('Error loading courses:', err);
        setError('Failed to load assigned courses. Please check your network connection.');
      } finally {
        setLoadingCourses(false);
      }
    }
    loadCourses();
  }, []);

  // Load attendance sheet when course or date changes
  const loadSheet = async () => {
    if (!selectedCourseId) return;
    setLoadingSheet(true);
    setError(null);
    try {
      const res = await attendanceApi.getSheet(selectedCourseId, selectedDate);
      if (res.success) {
        // Map student records, default to null if not marked yet
        const mapped = (res.students || []).map((s) => ({
          student_id: s.student_id,
          name: s.name,
          email: s.email,
          avatar_url: s.avatar_url,
          status: s.status || null,
          remarks: s.remarks || ''
        }));
        setStudents(mapped);
      } else {
        setError(res.message || 'Failed to load attendance sheet.');
      }
    } catch (err) {
      console.error('Error loading attendance sheet:', err);
      setError(err.message || 'Error fetching attendance sheet.');
    } finally {
      setLoadingSheet(false);
    }
  };

  useEffect(() => {
    if (selectedCourseId) {
      loadSheet();
    }
  }, [selectedCourseId, selectedDate]);

  // Handle individual status change
  const setStudentStatus = (studentId, status) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status } : s))
    );
  };

  // "Mark All Present" button
  const markAllPresent = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, status: 'present' })));
  };

  // Calculate live counts
  const presentCount = students.filter((s) => s.status === 'present').length;
  const lateCount = students.filter((s) => s.status === 'late').length;
  const absentCount = students.filter((s) => s.status === 'absent').length;
  const unmarkedCount = students.filter((s) => !s.status).length;

  // Save attendance
  const handleSave = async () => {
    if (students.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      // Any student unmarked defaults to 'present' or require explicit mark
      const recordsToSubmit = students.map((s) => ({
        student_id: s.student_id,
        status: s.status || 'present',
        remarks: s.remarks || 'Regular class session'
      }));

      const res = await attendanceApi.mark({
        course_id: Number(selectedCourseId),
        date: selectedDate,
        records: recordsToSubmit
      });

      if (res.success) {
        setToastMessage(`✓ Attendance for ${res.count} student(s) successfully recorded for ${selectedDate}.`);
        toast.success(`Attendance for ${res.count} student(s) recorded for ${selectedDate}.`, 'Attendance Saved');
        setTimeout(() => setToastMessage(null), 4000);
        // Reload sheet to confirm persistence
        loadSheet();
      } else {
        setError(res.message || 'Failed to record attendance.');
        toast.error(res.message || 'Failed to record attendance.');
      }
    } catch (err) {
      console.error('Error saving attendance:', err);
      setError(err.message || 'Failed to submit attendance.');
      toast.error(err.message || 'Failed to submit attendance.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCourse = courses.find((c) => String(c.id) === String(selectedCourseId));

  return (
    <AppLayout title="Course Attendance Register">
      <div className="space-y-6">
        {/* Toast Notification */}
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
              <span className="text-blue-200 text-xs">• Daily Roll Call Register</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Record Course Attendance</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Conduct daily class attendance, toggle individual student presence, and lock records into the institutional audit database.
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

        {/* Controls Bar: Course Selector + Date Picker */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 grow">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Select Teaching Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                disabled={loadingCourses || courses.length === 0}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name} ({c.enrolled_count} Students)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Attendance Date (No Future Dates)
              </label>
              <input
                type="date"
                max={today}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto pt-2 md:pt-0">
            <button
              onClick={markAllPresent}
              disabled={loadingSheet || students.length === 0}
              className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-800 transition-all disabled:opacity-50"
            >
              Mark All Present
            </button>

            <button
              onClick={handleSave}
              disabled={saving || loadingSheet || students.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Attendance
            </button>
          </div>
        </div>

        {/* Live Status Counter Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 p-3.5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Present</span>
              <div className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200">{presentCount}</div>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 p-3.5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase">Late (Attended)</span>
              <div className="text-xl font-extrabold text-blue-900 dark:text-blue-200">{lateCount}</div>
            </div>
            <Clock className="w-6 h-6 text-blue-500" />
          </div>

          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 p-3.5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">Absent</span>
              <div className="text-xl font-extrabold text-rose-900 dark:text-rose-200">{absentCount}</div>
            </div>
            <XCircle className="w-6 h-6 text-rose-500" />
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total Enrolled</span>
              <div className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{students.length}</div>
            </div>
            <Users className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          </div>
        </div>

        {/* Student Roster Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Student Roster — {selectedCourse?.name || 'Class'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Mark each student as Present, Absent, or Late. Changes take effect upon clicking "Save Attendance".
              </p>
            </div>
            {unmarkedCount > 0 && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {unmarkedCount} Unmarked
              </span>
            )}
          </div>

          {loadingSheet ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Loading student attendance register...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
              No students are currently enrolled in this course.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Student Details</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Roll Call Status</th>
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
                        {student.remarks && student.remarks.includes('Live check-in') ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <Radio className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                            Live check-in
                          </span>
                        ) : student.status ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            Manual
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Unmarked</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800 gap-1">
                          <button
                            type="button"
                            onClick={() => setStudentStatus(student.student_id, 'present')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                              student.status === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <Check className="w-3 h-3" /> Present
                          </button>

                          <button
                            type="button"
                            onClick={() => setStudentStatus(student.student_id, 'late')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                              student.status === 'late'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <Clock className="w-3 h-3" /> Late
                          </button>

                          <button
                            type="button"
                            onClick={() => setStudentStatus(student.student_id, 'absent')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                              student.status === 'absent'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <XCircle className="w-3 h-3" /> Absent
                          </button>
                        </div>
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

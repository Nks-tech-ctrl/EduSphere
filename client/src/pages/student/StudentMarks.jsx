import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { marksApi } from '../../services/api';
import {
  Award,
  BookOpen,
  TrendingUp,
  RefreshCw,
  XCircle,
  CheckCircle2,
  HelpCircle,
  FileText
} from 'lucide-react';

const EXAM_TYPE_LABELS = {
  internal_1: { label: 'Internal Assessment 1', badge: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  internal_2: { label: 'Internal Assessment 2', badge: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  assignment: { label: 'Continuous Lab & Assignments', badge: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  final: { label: 'Semester Final Examination', badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' }
};

export default function StudentMarks() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMarks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await marksApi.getMine();
      if (res.success) {
        setData(res);
      } else {
        setError(res.message || 'Failed to load gradebook.');
      }
    } catch (err) {
      console.error('Error fetching marks:', err);
      setError(err.message || 'Unable to connect to marks service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarks();
  }, []);

  const overall = data?.overall || { overall_average: 0, courses_count: 0, evaluated_courses_count: 0 };
  const courses = data?.courses || [];

  const getScoreBadge = (pct) => {
    if (pct >= 85) return 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
    if (pct >= 70) return 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
    if (pct >= 50) return 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
    return 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
  };

  return (
    <AppLayout title="Academic Marks & Gradebook">
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider">
                Student Portal
              </span>
              <span className="text-blue-200 text-xs">• Semester Gradebook</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Evaluations & Results</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Inspect your internal assessments, assignment coursework scores, and university grading rubrics across all registered curriculum courses.
            </p>
          </div>

          <button
            onClick={fetchMarks}
            disabled={loading}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-28 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-64 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800"></div>
              <div className="h-64 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800"></div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl p-6 text-center">
            <XCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">Failed to Load Marks</h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{error}</p>
            <button
              onClick={fetchMarks}
              className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Top Aggregate Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cumulative Average</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{overall.overall_average}%</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">across courses</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">Weighted average of evaluated subjects</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Evaluated Courses</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {overall.evaluated_courses_count} <span className="text-base font-normal text-slate-400 dark:text-slate-500">/ {overall.courses_count}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">Active syllabus enrollments</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Academic Standing</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {overall.overall_average >= 85 ? 'First Class Distinction' : overall.overall_average >= 70 ? 'First Class' : 'Second Class'}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">Based on current internal indicators</p>
              </div>
            </div>

            {/* Course Gradebooks */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Course Gradebooks</h3>

              {courses.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                  No courses enrolled for this academic semester.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {courses.map((course) => (
                    <div key={course.course_id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col justify-between transition-colors">
                      {/* Course Header */}
                      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                              {course.course_code}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{course.credits} Credits</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{course.course_name}</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Instructor: {course.faculty_name || 'Faculty'}</p>
                        </div>

                        <div className="text-right">
                          <div className="text-xl font-black text-slate-900 dark:text-white">{course.course_average}%</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Average</div>
                        </div>
                      </div>

                      {/* Marks List */}
                      <div className="p-4 sm:p-5 space-y-3 grow">
                        {course.marks.length === 0 ? (
                          <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs italic">
                            No evaluations have been finalized for this subject yet.
                          </div>
                        ) : (
                          course.marks.map((m) => {
                            const meta = EXAM_TYPE_LABELS[m.exam_type] || { label: m.exam_type, badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' };
                            return (
                              <div key={m.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/30">
                                <div className="flex items-center justify-between text-xs mb-1.5">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{meta.label}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-slate-900 dark:text-white">
                                      {m.score} <span className="font-normal text-slate-400 dark:text-slate-500">/ {m.max_score}</span>
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getScoreBadge(m.percentage)}`}>
                                      {m.percentage}%
                                    </span>
                                  </div>
                                </div>

                                {/* Progress bar */}
                                <div className="w-full bg-slate-200/70 dark:bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${m.percentage >= 85 ? 'bg-emerald-500' : m.percentage >= 70 ? 'bg-blue-600' : 'bg-amber-500'}`}
                                    style={{ width: `${Math.min(100, m.percentage)}%` }}
                                  ></div>
                                </div>

                                {m.remarks && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-1.5">
                                    Feedback: {m.remarks}
                                  </p>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="px-4 py-3 bg-slate-50/75 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between items-center">
                        <span>{course.evaluated_exams_count} exam evaluation(s) recorded</span>
                        <span className="font-medium text-blue-700 dark:text-blue-400">Department of {course.department_code}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

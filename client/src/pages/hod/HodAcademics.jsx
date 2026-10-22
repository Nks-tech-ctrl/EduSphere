import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { attendanceApi, marksApi } from '../../services/api';
import {
  UserCheck,
  Award,
  AlertTriangle,
  BookOpen,
  Users,
  RefreshCw,
  XCircle,
  TrendingUp,
  BarChart3,
  Calendar,
  CheckCircle2
} from 'lucide-react';

export default function HodAcademics() {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'marks'

  // Attendance state
  const [attendanceData, setAttendanceData] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [attendanceError, setAttendanceError] = useState(null);

  // Marks state
  const [marksData, setMarksData] = useState(null);
  const [loadingMarks, setLoadingMarks] = useState(true);
  const [marksError, setMarksError] = useState(null);

  const fetchAttendance = async () => {
    setLoadingAttendance(true);
    setAttendanceError(null);
    try {
      const res = await attendanceApi.getDepartment();
      if (res.success) {
        setAttendanceData(res);
      } else {
        setAttendanceError(res.message || 'Failed to load department attendance.');
      }
    } catch (err) {
      console.error(err);
      setAttendanceError('Network error loading department attendance.');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const fetchMarks = async () => {
    setLoadingMarks(true);
    setMarksError(null);
    try {
      const res = await marksApi.getDepartment();
      if (res.success) {
        setMarksData(res);
      } else {
        setMarksError(res.message || 'Failed to load department marks.');
      }
    } catch (err) {
      console.error(err);
      setMarksError('Network error loading department marks.');
    } finally {
      setLoadingMarks(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    fetchMarks();
  }, []);

  const dept = attendanceData?.department || marksData?.department || { name: 'Department', code: 'DEPT' };
  const attCourses = attendanceData?.courses || [];
  const atRiskStudents = attendanceData?.at_risk_students || [];
  const marksCourses = marksData?.courses || [];

  return (
    <AppLayout title="Department Academic Oversight">
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider">
                Head of Department
              </span>
              <span className="text-blue-200 text-xs">• Department of {dept.name} ({dept.code})</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Academic Progress & Attendance Register</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Monitor department-level attendance metrics, identify students with attendance shortfalls below 75%, and review course examination marks distributions.
            </p>
          </div>

          <button
            onClick={() => {
              fetchAttendance();
              fetchMarks();
            }}
            disabled={loadingAttendance || loadingMarks}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loadingAttendance || loadingMarks) ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === 'attendance'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Department Attendance Register
            {atRiskStudents.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-extrabold">
                {atRiskStudents.length} Shortfall
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('marks')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === 'marks'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            Department Marks & Gradebooks
          </button>
        </div>

        {/* TAB 1: ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            {loadingAttendance && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800"></div>
                ))}
              </div>
            )}

            {attendanceError && !loadingAttendance && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl p-5 text-center text-xs text-rose-800 dark:text-rose-300 font-medium">
                {attendanceError}
              </div>
            )}

            {!loadingAttendance && !attendanceError && (
              <>
                {/* Shortfall Alert Banner */}
                {atRiskStudents.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-xs">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                        {atRiskStudents.length} Student Attendance Shortfall(s) Detected (&lt;75%)
                      </h4>
                      <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                        The statutory university minimum attendance required for examination hall ticket eligibility is 75%. HOD review recommended.
                      </p>
                    </div>
                  </div>
                )}

                {/* Course Attendance Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {attCourses.map((c) => (
                    <div key={c.course_id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {c.course_code}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            c.average_percentage >= 75
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}>
                            {c.average_percentage}% Avg
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{c.course_name}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Faculty: {c.faculty_name || 'Department Faculty'}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-center text-xs">
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                          <div className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold">Enrolled</div>
                          <div className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{c.enrolled_count}</div>
                        </div>

                        <div className={`p-2 rounded-xl ${
                          c.below_75_count > 0
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                            : 'bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                        }`}>
                          <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Below 75%</div>
                          <div className="font-extrabold text-sm">{c.below_75_count}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* At-Risk Students Detailed Roster */}
                {atRiskStudents.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
                    <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Attendance Deficit Registry (&lt;75%)</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Students who require immediate attendance escalation notice</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                          <tr>
                            <th className="py-3 px-4">Student</th>
                            <th className="py-3 px-4">Subject</th>
                            <th className="py-3 px-4">Attendance Percentage</th>
                            <th className="py-3 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-200">
                          {atRiskStudents.map((st, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                {st.name} <span className="text-slate-400 dark:text-slate-500 font-normal text-[11px]">({st.email})</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-bold text-slate-900 dark:text-white">{st.course_code}</span> — {st.course_name}
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  {st.rate}%
                                </span>
                              </td>
                              <td className="py-3 px-4 text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Deficit Shortfall
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: MARKS */}
        {activeTab === 'marks' && (
          <div className="space-y-6">
            {loadingMarks && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                {[1, 2].map((i) => (
                  <div key={i} className="h-44 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800"></div>
                ))}
              </div>
            )}

            {marksError && !loadingMarks && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl p-5 text-center text-xs text-rose-800 dark:text-rose-300 font-medium">
                {marksError}
              </div>
            )}

            {!loadingMarks && !marksError && (
              <>
                {/* Department Average KPI */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
                  <div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Department Overall Academic Average</span>
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                      {marksData?.department_average || 0}%
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Aggregated across all evaluated syllabus examinations</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Award className="w-6 h-6" />
                  </div>
                </div>

                {/* Course Marks Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {marksCourses.map((course) => (
                    <div key={course.course_id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between transition-colors">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                            {course.course_code}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{course.enrolled_students} Enrolled</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{course.course_name}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Faculty: {course.faculty_name || 'Faculty'}</p>
                      </div>

                      {/* Performance Metric Strip */}
                      <div className="grid grid-cols-3 gap-2 my-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Average</div>
                          <div className="text-sm font-extrabold text-blue-700 dark:text-blue-400">{course.average_score}%</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Highest</div>
                          <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">{course.highest_score}%</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Lowest</div>
                          <div className="text-sm font-extrabold text-rose-700 dark:text-rose-400">{course.lowest_score}%</div>
                        </div>
                      </div>

                      {/* Exam Breakdown */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Exam Breakdown</span>
                        {course.exam_breakdown?.map((ex, i) => (
                          <div key={i} className="flex items-center justify-between text-xs py-1">
                            <span className="capitalize text-slate-700 dark:text-slate-300 font-medium">
                              {ex.exam_type.replace('_', ' ')}:
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 dark:text-slate-500 text-[11px]">({ex.students_evaluated} graded)</span>
                              <span className="font-bold text-slate-900 dark:text-white">{ex.average}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

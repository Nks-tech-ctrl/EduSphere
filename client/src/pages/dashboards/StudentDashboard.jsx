import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { dashboardApi, resourcesApi, liveAttendanceApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  BookOpen,
  UserCheck,
  Award,
  Bell,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  AlertCircle,
  FileText,
  Radio
} from 'lucide-react';
import TodayScheduleCard from '../../components/timetable/TodayScheduleCard';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [recentResources, setRecentResources] = useState([]);
  const [openLiveSession, setOpenLiveSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [dashRes, resRes, liveRes] = await Promise.allSettled([
          dashboardApi.getSummary(),
          resourcesApi.getMine({ limit: 3 }),
          liveAttendanceApi.getStudentOpenSessions()
        ]);
        if (dashRes.status === 'fulfilled' && dashRes.value.success) {
          setData(dashRes.value);
        }
        if (resRes.status === 'fulfilled' && resRes.value.success) {
          setRecentResources(resRes.value.resources?.slice(0, 3) || []);
        }
        if (liveRes.status === 'fulfilled' && liveRes.value.success) {
          const sessions = liveRes.value.sessions || [];
          if (sessions.length > 0) {
            setOpenLiveSession(sessions[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load student stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const stats = data?.stats || {
    enrolledCount: 3,
    attendancePercentage: 92,
    totalCredits: 11,
    pendingAssignments: 0
  };

  const courses = data?.enrolledCourses || [];
  const attendance = data?.attendanceRecords || [];
  const marks = data?.marks || [];
  const notices = data?.notices || [];

  const isAtRisk = stats.attendancePercentage < 75;

  return (
    <AppLayout title="Student Academic Workspace">
      <div className="space-y-6">
        {/* Student Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider">
                B.Tech Undergraduate
              </span>
              <span className="text-blue-200 text-xs">
                {user?.department_code ? `• Department: ${user.department_code}` : ''}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              Welcome back, {user?.name}
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Track your semester coursework, attendance percentage against the 75% threshold, internal continuous assessments, and university announcements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/student/attendance"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-xl shadow-md transition-all shrink-0"
            >
              <UserCheck className="w-4 h-4" />
              Attendance Record
            </Link>

            <Link
              to="/student/complaints/new"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold rounded-xl transition-all shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              File Complaint
            </Link>
          </div>
        </div>

        {/* Live Class Attendance Banner */}
        {openLiveSession && (
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-5 sm:p-6 text-white shadow-lg shadow-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <span className="p-3 rounded-2xl bg-white/20 backdrop-blur-md text-white shrink-0">
                <Radio className="w-6 h-6 animate-pulse" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/30 text-white">
                    Live Session Active
                  </span>
                  <span className="text-xs text-emerald-100 font-semibold">• {openLiveSession.course_code}</span>
                </div>
                <h3 className="text-base font-extrabold text-white mt-0.5">
                  Class in progress, mark attendance
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  {openLiveSession.course_name} — Instructor has opened the live check-in window.
                </p>
              </div>
            </div>

            <Link
              to="/student/attendance"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-black rounded-xl shadow-md transition-all shrink-0 self-start sm:self-auto"
            >
              Enter Passcode
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Shortfall Alert Banner if below 75% */}
        {isAtRisk && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">Attendance Shortfall Alert</h4>
              <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-1 leading-relaxed">
                Your cumulative attendance is currently {stats.attendancePercentage}%, which is below the required 75% threshold. Visit your{' '}
                <Link to="/student/attendance" className="font-bold underline text-amber-950 dark:text-amber-200">
                  Attendance Portal
                </Link>{' '}
                to see course-wise statistics.
              </p>
            </div>
          </div>
        )}

        {/* Quick Module Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
          <Link
            to="/student/timetable"
            className="group bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Timetable
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Class Schedule</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/student/assignments"
            className="group bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Assignments
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{stats.pendingAssignments || 0} Pending</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/student/attendance"
            className="group bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  My Attendance
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{stats.attendancePercentage}% Cumulative</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/student/marks"
            className="group bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Marks & Results
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">View Gradebook</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/student/notices"
            className="group bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Notice Bulletin
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Official Circulars</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/student/complaints"
            className="group bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  My Complaints
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Track Grievances</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

        {/* Today's Schedule Card */}
        <TodayScheduleCard timetableLink="/student/timetable" isFaculty={false} />

        {/* Enrolled Courses */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Enrolled Curriculum Modules</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">{courses.length} Subjects Registered</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {courses.map((course) => (
              <div key={course.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                    {course.code}
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{course.credits} Credits</span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">{course.name}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  Instructor: <strong className="text-slate-700 dark:text-slate-300">{course.faculty_name || 'Department Faculty'}</strong>
                </p>
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 dark:text-slate-500">Semester {course.semester}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Enrolled
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grid: Attendance & Marks Quick View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Attendance Logs */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Recent Attendance Entries</span>
                </h3>
                <Link to="/student/attendance" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                  View Full History →
                </Link>
              </div>

              <div className="space-y-2.5">
                {attendance.length > 0 ? (
                  attendance.slice(0, 5).map((att, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white">{att.course_code}</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{att.course_name}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            att.status === 'present'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : att.status === 'late'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                          }`}
                        >
                          {att.status}
                        </span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">{att.date}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">No attendance records yet.</p>
                )}
              </div>
            </div>

            <Link
              to="/student/attendance"
              className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 block text-center text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Open Complete Course Attendance Breakdown →
            </Link>
          </div>

          {/* Academic Marks */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Assessment Marks Snapshot</span>
                </h3>
                <Link to="/student/marks" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                  View Gradebook →
                </Link>
              </div>

              <div className="space-y-3">
                {marks.length > 0 ? (
                  marks.slice(0, 5).map((m, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-white">{m.course_code}</span>
                          <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-semibold uppercase">
                            {m.exam_type.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-right font-black text-sm text-blue-700 dark:text-blue-400">
                          {m.score} / {m.max_score}
                        </div>
                      </div>
                      {m.remarks && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                          "{m.remarks}"
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 rounded-xl">
                    Examinations are in progress.
                  </div>
                )}
              </div>
            </div>

            <Link
              to="/student/marks"
              className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 block text-center text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Open Full Course Gradebook →
            </Link>
          </div>
        </div>

        {/* New Study Resources (Phase 9) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>New Study Resources</span>
            </h3>
            <Link to="/student/resources" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
              View All Study Materials →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentResources.length > 0 ? (
              recentResources.map((res) => (
                <div
                  key={res.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-mono">
                        {res.course_code}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
                        {res.category.replace('_', ' ')}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1">
                      {res.title}
                    </h4>
                    {res.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {res.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">
                      {res.file_name ? 'Document' : 'Web Link'}
                    </span>
                    <Link
                      to="/student/resources"
                      className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <span>Access</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-6 text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                No new study resources uploaded recently.
              </div>
            )}
          </div>
        </div>

        {/* Notices */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Campus Announcements</span>
            </h3>
            <Link to="/student/notices" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
              View All Bulletins →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notices.map((notice, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 uppercase">
                    {notice.department_code ? `${notice.department_code} Dept` : 'All Campus'}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">• {notice.created_at?.split(' ')[0] || 'Notice'}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white">{notice.title}</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed line-clamp-2">{notice.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

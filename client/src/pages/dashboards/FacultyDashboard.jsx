import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { dashboardApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen,
  UserCheck,
  Award,
  Bell,
  Users,
  Calendar,
  CheckCircle2,
  ArrowRight,
  PlusCircle,
  Clock,
  Sparkles,
  FileText
} from 'lucide-react';
import TodayScheduleCard from '../../components/timetable/TodayScheduleCard';

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await dashboardApi.getSummary();
        if (res.success) {
          setData(res);
        }
      } catch (err) {
        console.error('Failed to load faculty stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const stats = data?.stats || {
    assignedCourses: 2,
    totalAttendanceLogged: 10,
    assignmentsToGrade: 0
  };

  const courses = data?.myCourses || [];
  const notices = data?.notices || [];

  return (
    <AppLayout title="Faculty Academic Workspace">
      <div className="space-y-6">
        {/* Faculty Hero Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider">
                Faculty Instructor
              </span>
              <span className="text-blue-200 text-xs">
                {user?.department_code ? `• Department: ${user.department_code}` : ''}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              Welcome, {user?.name || 'Professor'}
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Manage your course lectures, record daily attendance, enter internal marks, and publish announcements to your classes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/faculty/assignments"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-xl shadow-md transition-all shrink-0"
            >
              <FileText className="w-4 h-4" />
              Assignments ({stats.assignmentsToGrade || 0} to Grade)
            </Link>

            <Link
              to="/faculty/attendance"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition-all shrink-0"
            >
              <UserCheck className="w-4 h-4" />
              Mark Attendance
            </Link>

            <Link
              to="/faculty/marks"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold rounded-xl transition-all shrink-0"
            >
              <Award className="w-4 h-4" />
              Enter Marks
            </Link>
          </div>
        </div>

        {/* Quick Academic Action Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Link
            to="/faculty/timetable"
            className="group bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Teaching Schedule
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Weekly Timetable</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/faculty/assignments"
            className="group bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Assignments to Grade
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{stats.assignmentsToGrade || 0} Submissions Pending</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/faculty/attendance"
            className="group bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Daily Attendance
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Record roll call for today</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/faculty/marks"
            className="group bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Examination Marks
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Grade internal & final exams</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/faculty/notices"
            className="group bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Post Class Notice
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Broadcast to class cohort</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

        {/* Today's Schedule Card */}
        <TodayScheduleCard timetableLink="/faculty/timetable" isFaculty={true} />

        {/* KPI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Teaching Subjects</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{courses.length}</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Autonomous Syllabus Modules</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Students Taught</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {courses.reduce((sum, c) => sum + (c.enrolled_students || 0), 0) || 10}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Active B.Tech Cohort</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Attendance Logged</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.totalAttendanceLogged || 0}</div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Ready for Live Roll Call
            </p>
          </div>
        </div>

        {/* Assigned Courses Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Allocated Subjects & Course Management</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Autonomous Curriculum</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((c) => (
              <div key={c.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                        {c.code}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Semester {c.semester}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-1.5">{c.name}</h4>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {c.credits} Credits
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Enrolled Students: <strong className="text-slate-800 dark:text-slate-200">{c.enrolled_students || 10}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/faculty/attendance"
                      className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 font-bold text-[11px] transition-colors"
                    >
                      Attendance →
                    </Link>
                    <Link
                      to="/faculty/marks"
                      className="px-2.5 py-1 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900 font-bold text-[11px] transition-colors"
                    >
                      Marks →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Bulletins */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Campus Announcements</span>
            </h3>
            <Link to="/faculty/notices" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
              Manage Notices →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notices.map((notice, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 uppercase">
                    {notice.department_code || 'All'}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">• {notice.created_at?.split(' ')[0] || 'Notice'}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white">{notice.title}</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">{notice.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

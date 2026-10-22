import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { dashboardApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  GraduationCap,
  BookOpen,
  Bell,
  Building,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckCircle2
} from 'lucide-react';

export default function HodDashboard() {
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
        console.error('Failed to load HOD stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const deptName = user?.department_name || data?.department?.name || 'Academic Department';
  const deptCode = user?.department_code || data?.department?.code || '';
  const stats = data?.stats || {
    departmentStudents: 0,
    departmentFaculty: 0,
    departmentCourses: 0,
    deptComplaints: 0,
    deptPendingComplaints: 0,
    deptEscalatedComplaints: 0
  };

  return (
    <AppLayout title={`${deptCode} Department Leadership Portal`}>
      <div className="space-y-6">
        {/* HOD Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-indigo-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider">
                HOD Authority Console
              </span>
              <span className="text-blue-200 text-xs">• Department: {deptCode}</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              {deptName}
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Departmental academic governance, faculty curriculum allocation, and student performance oversight.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/20 text-center">
              <div className="text-sm font-bold text-white">{user?.name}</div>
              <div className="text-[10px] text-blue-200 font-medium uppercase tracking-wider">Head of Department</div>
            </div>
          </div>
        </div>

        {/* KPI Cards: Academic Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Registered Students</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.departmentStudents}</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Undergraduate B.Tech Students</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Teaching Faculty</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.departmentFaculty}</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Assigned Department Professors</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Courses</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.departmentCourses}</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Curriculum Subjects in Session</p>
          </div>
        </div>

        {/* Department Grievance Redressal Banner & KPI Strip */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white border border-slate-700/60 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Department Grievance Queue</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/20 uppercase tracking-wider">
                    Phase 3 SLA
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Academic & Faculty complaints routed to {deptCode}. Tickets unresolved after 3 days escalate to Admin.
                </p>
              </div>
            </div>

            <Link
              to="/hod/complaints"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm self-start sm:self-auto"
            >
              <span>Manage Department Complaints</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-700/60">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Dept Tickets</div>
                <div className="text-xl font-extrabold text-white mt-0.5">{stats.deptComplaints ?? 0}</div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Redressal</div>
                <div className="text-xl font-extrabold text-amber-400 mt-0.5">{stats.deptPendingComplaints ?? 0}</div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Escalated to Admin</div>
                <div className="text-xl font-extrabold text-rose-400 mt-0.5">{stats.deptEscalatedComplaints ?? 0}</div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Grid: Faculty Members & Courses */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Department Faculty List */}
          <div id="faculty" className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Department Faculty Roster</span>
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">{stats.departmentFaculty} Members</span>
            </div>

            <div className="space-y-3">
              {(data?.facultyList || [
                { name: 'Prof. Vikram Sharma', email: 'faculty.sharma@edusphere.edu', phone: '+91 98765 00011' },
                { name: 'Prof. Neha Patel', email: 'faculty.patel@edusphere.edu', phone: '+91 98765 00012' }
              ]).map((faculty, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white">{faculty.name}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{faculty.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      Faculty
                    </span>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{faculty.phone}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Department Courses */}
          <div id="courses" className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Offered Curriculum Modules</span>
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">Autonomous Syllabus</span>
            </div>

            <div className="space-y-3">
              {(data?.courses || []).map((course, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                        {course.code}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white">{course.name}</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Faculty: {course.faculty_name || 'Assigned'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{course.credits} Credits</span>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Sem {course.semester}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Notices & Department Announcements */}
        <div id="notices" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Department & Institutional Bulletins</span>
            </h3>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Live Updates</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(data?.notices || []).map((notice, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                <h4 className="text-xs font-bold text-slate-800 dark:text-white">{notice.title}</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{notice.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

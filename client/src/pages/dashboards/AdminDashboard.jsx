import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { dashboardApi, adminApi, analyticsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Tooltip as RechartsTooltip
} from 'recharts';
import {
  Users,
  Building2,
  GraduationCap,
  BookOpen,
  Bell,
  ShieldCheck,
  TrendingUp,
  Award,
  Layers,
  CheckCircle,
  Clock,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Flame,
  ArrowRight,
  BarChart3,
  PieChart as PieIcon,
  CheckCircle2
} from 'lucide-react';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reset Demo modal & state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [lastResetTime, setLastResetTime] = useState(() => {
    try {
      return localStorage.getItem('edusphere_last_reset') || null;
    } catch {
      return null;
    }
  });

  const toast = useToast();
  const { isDark } = useTheme();

  const loadStats = async () => {
    try {
      const [res, analyticsRes] = await Promise.all([
        dashboardApi.getSummary(),
        analyticsApi.getComplaintAnalytics().catch(() => null)
      ]);
      if (res && res.success) {
        setData(res);
      }
      if (analyticsRes && analyticsRes.success) {
        setAnalyticsData(analyticsRes);
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      const res = await adminApi.resetDemoData();
      if (res.success) {
        const timeNow = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastResetTime(timeNow);
        try {
          localStorage.setItem('edusphere_last_reset', timeNow);
        } catch {}
        setShowResetModal(false);
        // Instant full reload with fresh data
        await loadStats();
        toast.success(`Demo data restored to initial pristine state at ${timeNow}. All metrics reloaded without stale counts.`, 'Database Reset Complete');
      } else {
        toast.error(res.message || 'Reset failed.', 'Reset Error');
      }
    } catch (err) {
      toast.error(err.message || 'Error resetting demo data.', 'Reset Failed');
    } finally {
      setResetting(false);
    }
  };

  const stats = data?.stats || {
    totalStudents: 20,
    totalFaculty: 3,
    totalHods: 2,
    totalDepartments: 2,
    totalCourses: 5,
    totalComplaints: 8,
    pendingComplaints: 5,
    escalatedComplaints: 1,
    resolvedComplaints: 2,
  };

  return (
    <AppLayout title="Central Administrator Console">
      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetDemo}
        loading={resetting}
        danger={true}
        title="Reset Demo Data to Initial State?"
        message="This restores pristine departments, courses, 26 demo accounts, and 8 un-escalated complaints with fresh relative dates. Today's attendance sheet and final marks will remain ready for live entry."
        confirmText="Confirm Reset"
        cancelText="Cancel"
      />

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider">
              Central Administration
            </span>
            <span className="text-blue-200 text-xs">• Institute Operational Status: Optimal</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Welcome to Edusphere Institution Control
          </h2>
          <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
            Centralized management for departments, curriculum structures, academic staff, student directories, and institutional grievances.
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-1.5 flex-shrink-0">
          {/* Reset Demo Data Button */}
          <button
            onClick={() => setShowResetModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white backdrop-blur-md transition shadow-xs"
            title="Re-seed SQLite database with fresh demo data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
          {lastResetTime && (
            <span className="text-[11px] text-blue-200/90 font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-300" />
              <span>Last reset: {lastResetTime}</span>
            </span>
          )}
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Departments</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.totalDepartments}</div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />{' '}
            {data?.departments?.length > 0
              ? `${data.departments.map((d) => d.code).join(' & ')} Active`
              : 'All Departments Active'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Students</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.totalStudents}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">20 Enrolled for 2026</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Faculty</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.totalFaculty}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Active Professors</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">HODs</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.totalHods}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Department Heads</p>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Courses</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.totalCourses}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Curriculum Modules</p>
        </div>
      </div>

      {/* Complaint Governance Live KPI Strip (Phase 3 Active) */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Flame className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Campus Grievance & SLA Oversight</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Phase 3 Live
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              3-Day automated SLA monitoring, HOD escalation handling, and administrative dispatch.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 text-center">
            <div className="text-lg font-black text-amber-400">{stats.pendingComplaints ?? 5}</div>
            <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Pending</div>
          </div>

          <div className="bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 text-center">
            <div className="text-lg font-black text-red-400">{stats.escalatedComplaints ?? 1}</div>
            <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Escalated (&gt;3d)</div>
          </div>

          <div className="bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 text-center">
            <div className="text-lg font-black text-emerald-400">{stats.resolvedComplaints ?? 2}</div>
            <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Resolved</div>
          </div>

          <Link
            to="/admin/complaints"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition ml-1"
          >
            <span>Manage Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Compact Visual Analytics Section (Phase 4 Recharts Preview) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Institutional Grievance Analytics Snapshot</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                Recharts Live
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Compact overview of grievance status distribution and 14-day registration volume.
            </p>
          </div>

          <Link
            to="/admin/analytics"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold transition border border-blue-200 dark:border-blue-800 self-start sm:self-auto"
          >
            <span>View Full Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Compact Donut */}
          <div className="md:col-span-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-36 h-36 relative flex items-center justify-center flex-shrink-0">
              <ResponsiveContainer key={`admin-pie-${isDark ? 'dark' : 'light'}`} width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData?.byStatus || [
                      { label: 'Submitted', count: 3, color: '#3b82f6' },
                      { label: 'Under Review', count: 3, color: '#f59e0b' },
                      { label: 'In Progress', count: 3, color: '#6366f1' },
                      { label: 'Resolved', count: 24, color: '#10b981' }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={62}
                    paddingAngle={3}
                    dataKey="count"
                    isAnimationActive={true}
                  >
                    {(analyticsData?.byStatus || [
                      { color: '#3b82f6' }, { color: '#f59e0b' }, { color: '#6366f1' }, { color: '#10b981' }
                    ]).map((entry, index) => (
                      <Cell key={`donut-${index}`} fill={entry.color} stroke={isDark ? '#0f172a' : '#ffffff'} strokeWidth={2} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: isDark ? '#f1f5f9' : '#0f172a'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-extrabold text-slate-900 dark:text-white leading-none">
                  {analyticsData?.kpis?.total ?? stats.totalComplaints}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Tickets</span>
              </div>
            </div>

            <div className="flex-1 space-y-1.5 w-full text-xs">
              {(analyticsData?.byStatus || [
                { label: 'Submitted', count: 3, color: '#3b82f6' },
                { label: 'Under Review', count: 3, color: '#f59e0b' },
                { label: 'In Progress', count: 3, color: '#6366f1' },
                { label: 'Resolved', count: 24, color: '#10b981' }
              ]).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="font-bold text-slate-800 dark:text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Compact 14-day Trend */}
          <div className="md:col-span-7 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>14-Day Grievance Activity Curve</span>
              </span>
              <span className="text-[10px] text-slate-400">Daily Registrations</span>
            </div>

            <div className="h-28 w-full">
              <ResponsiveContainer key={`admin-area-${isDark ? 'dark' : 'light'}`} width="100%" height="100%">
                <AreaChart
                  data={analyticsData?.dailyTrend || []}
                  margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="compactAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: isDark ? '#f1f5f9' : '#0f172a'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Complaints"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#compactAreaGrad)"
                    isAnimationActive={true}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Department Breakdown Section */}
      <div id="departments" className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Academic Departments Overview</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data?.departments || []).map((dept) => (
            <div key={dept.code} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {dept.code}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{dept.name}</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Autonomous Academic Department</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="block text-base font-extrabold text-slate-800 dark:text-white">{dept.student_count || 0}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Students</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="block text-base font-extrabold text-slate-800 dark:text-white">{dept.faculty_count || 0}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Faculty</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="block text-base font-extrabold text-slate-800 dark:text-white">{dept.course_count || 0}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Courses</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Recent Users & Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Registered Users */}
        <div id="students" className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Institutional Directory Registry</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">26 Seeded Accounts</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="pb-2">User</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Dept</th>
                  <th className="pb-2">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(data?.recentUsers || []).map((u, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">{u.name}</td>
                    <td className="py-2.5">
                      <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 font-semibold text-blue-700 dark:text-blue-400">{u.dept_code || 'Central'}</td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">{u.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notices Bulletin */}
        <div id="notices" className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Campus Announcements</span>
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Live Broadcasts
              </span>
            </div>

            <div className="space-y-3">
              {(data?.notices || [
                {
                  title: 'Annual Tech Fest "Innovasia 2026" Registrations Open',
                  content: 'All student tracks and project displays are now live for registrations.',
                  created_at: '2026-10-17'
                },
                {
                  title: 'CSE Department: Research Paper Review Session',
                  content: 'Dr. Rajesh Gupta will be conducting project draft reviews this Thursday.',
                  created_at: '2026-10-16'
                }
              ]).map((notice, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">{notice.title}</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{notice.content}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Institutional Governance: <strong>Verified</strong></span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">Edusphere Core</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { analyticsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';
import {
  BarChart3,
  RefreshCw,
  Download,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building,
  GraduationCap,
  Calendar,
  Sparkles,
  PieChart as PieIcon,
  TrendingUp,
  Layers,
  ShieldCheck,
  Pause,
  Play
} from 'lucide-react';

const AUTO_REFRESH_INTERVAL = 30; // seconds

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const isAdmin = user?.role === 'admin';
  const isHod = user?.role === 'hod';

  // Data states
  const [complaintData, setComplaintData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Tab visibility & countdown states
  const [countdown, setCountdown] = useState(AUTO_REFRESH_INTERVAL);
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden);

  // Animation active only for first load
  const hasInitiallyRenderedRef = useRef(false);
  const [isAnimationActive, setIsAnimationActive] = useState(true);

  // Department attendance view toggle for Admin
  const [attendanceView, setAttendanceView] = useState('course'); // 'course' | 'department'

  // Load Data Callback
  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [compRes, attRes] = await Promise.all([
        analyticsApi.getComplaintAnalytics(),
        analyticsApi.getAttendanceAnalytics()
      ]);

      if (compRes.success) {
        setComplaintData(compRes);
      }
      if (attRes.success) {
        setAttendanceData(attRes);
      }
      setLastUpdated(new Date());

      // After first successful load and render, disable entrance animations for seamless subsequent updates
      if (!hasInitiallyRenderedRef.current) {
        hasInitiallyRenderedRef.current = true;
        // Keep animation active for the initial entrance duration, then disable
        setTimeout(() => {
          setIsAnimationActive(false);
        }, 1200);
      }
    } catch (err) {
      console.error('Failed to load analytics data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setCountdown(AUTO_REFRESH_INTERVAL);
    }
  }, []);

  // Listen to browser tab visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsTabVisible(visible);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 30s Countdown timer (paused when browser tab is hidden)
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isTabVisible) return; // Pause countdown while tab is hidden

      setCountdown((prev) => {
        if (prev <= 1) {
          fetchData();
          return AUTO_REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTabVisible, fetchData]);

  // CSV Exporter (Aggregate Numbers Only)
  const exportToCSV = () => {
    if (!complaintData) return;

    const kpis = complaintData.kpis || {};
    const byStatus = complaintData.byStatus || [];
    const byCategory = complaintData.byCategory || [];
    const dailyTrend = complaintData.dailyTrend || [];
    const courses = attendanceData?.byCourse || [];
    const depts = attendanceData?.byDepartment || [];

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'EDUSPHERE INSTITUTIONAL ANALYTICS REPORT\r\n';
    csvContent += `Generated On:,"${nowStr}"\r\n`;
    csvContent += `Scope:,"${isAdmin ? 'Institution-wide' : `${user?.department_code || 'Dept'} Department`}"\r\n\r\n`;

    // 1. Executive KPIs
    csvContent += 'EXECUTIVE KPI METRICS\r\n';
    csvContent += 'Metric,Value\r\n';
    csvContent += `Total Complaints Registered,${kpis.total || 0}\r\n`;
    csvContent += `Total Resolved,${kpis.resolved || 0}\r\n`;
    csvContent += `Resolution Percentage,${kpis.resolvedPercentage || 0}%\r\n`;
    csvContent += `Average Resolution Time,${kpis.avgResolutionTimeFormatted || 'N/A'}\r\n`;
    csvContent += `Escalation Rate,${kpis.escalationRate || 0}%\r\n\r\n`;

    // 2. Status Breakdown
    csvContent += 'COMPLAINTS BY STATUS\r\n';
    csvContent += 'Status,Count,Share Percentage\r\n';
    byStatus.forEach((s) => {
      csvContent += `"${s.label}",${s.count},${s.percentage}%\r\n`;
    });
    csvContent += '\r\n';

    // 3. Category Breakdown
    csvContent += 'COMPLAINTS BY CATEGORY\r\n';
    csvContent += 'Category,Count,Share Percentage\r\n';
    byCategory.forEach((c) => {
      csvContent += `"${c.label}",${c.count},${c.percentage}%\r\n`;
    });
    csvContent += '\r\n';

    // 4. Daily Volume Trend
    csvContent += 'DAILY COMPLAINT REGISTRATIONS (LAST 14 DAYS)\r\n';
    csvContent += 'Date,Label,New Complaints,Resolved\r\n';
    dailyTrend.forEach((d) => {
      csvContent += `"${d.date}","${d.label}",${d.count},${d.resolved}\r\n`;
    });
    csvContent += '\r\n';

    // 5. Attendance Summary
    csvContent += 'ATTENDANCE SUMMARY BY COURSE\r\n';
    csvContent += 'Course Code,Course Name,Department,Total Sessions,Present Sessions,Attendance Rate\r\n';
    courses.forEach((c) => {
      csvContent += `"${c.code}","${c.name}","${c.department_code}",${c.total_sessions},${c.present_sessions},${c.attendance_rate}%\r\n`;
    });

    if (isAdmin && depts.length > 0) {
      csvContent += '\r\nATTENDANCE SUMMARY BY DEPARTMENT\r\n';
      csvContent += 'Department Code,Department Name,Total Sessions,Present Sessions,Attendance Rate\r\n';
      depts.forEach((d) => {
        csvContent += `"${d.code}","${d.name}",${d.total_sessions},${d.present_sessions},${d.attendance_rate}%\r\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `edusphere-analytics-${isAdmin ? 'institution' : user?.department_code || 'dept'}-${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const kpis = complaintData?.kpis || {
    total: 0,
    resolved: 0,
    resolvedPercentage: 0,
    avgResolutionTimeFormatted: 'N/A',
    escalationRate: 0,
  };

  const formatLastUpdated = (date) => {
    if (!date) return '--:--:--';
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  // Custom Recharts Tooltip for Donut
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-slate-700">
          <div className="font-bold flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span>{data.label}</span>
          </div>
          <div className="mt-1 text-slate-300">
            {data.count} complaints ({data.percentage}%)
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Daily Trend Area
  const CustomDailyTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white text-xs px-3 py-2.5 rounded-lg shadow-lg border border-slate-700">
          <div className="font-bold text-slate-200 mb-1">{label}</div>
          <div className="text-blue-400 font-semibold">
            Registered: {payload[0].value} complaints
          </div>
          {payload[1] && (
            <div className="text-emerald-400 font-semibold mt-0.5">
              Resolved: {payload[1].value} complaints
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <AppLayout title={isAdmin ? 'Institutional Analytics & Insights' : `${user?.department_code || 'Dept'} Analytics Portal`}>
      {/* Top Header & Interactive Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>{isAdmin ? 'Central Institutional Analytics' : `${user?.department_name || 'Department'} Analytics`}</span>
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase tracking-wider">
              {isAdmin ? 'All Departments' : user?.department_code}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time grievance lifecycle KPIs, SLA compliance metrics, and academic attendance intelligence.
          </p>
        </div>

        {/* Live Controls: Countdown, Last Updated, Refresh, Export CSV */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Auto-Refresh & Tab Visibility Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
            {isTabVisible ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            ) : (
              <Pause className="w-3 h-3 text-amber-500" />
            )}
            <span className="text-[11px]">
              {isTabVisible ? `Auto-refresh in ${countdown}s` : 'Paused (tab hidden)'}
            </span>
          </div>

          {/* Last Updated Timestamp */}
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{formatLastUpdated(lastUpdated)}</span>
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-xs transition disabled:opacity-60"
            title="Refresh analytics data now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
            <span>Refresh</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={exportToCSV}
            disabled={loading || !complaintData}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top KPI Strip (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Complaints */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Complaints</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {loading ? <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : kpis.total}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Logged across all categories</p>
        </div>

        {/* Resolved % */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Resolved Rate</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {loading ? <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : `${kpis.resolvedPercentage}%`}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {kpis.resolved} of {kpis.total} resolved successfully
          </p>
        </div>

        {/* Avg Resolution Time */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Resolution Time</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {loading ? <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : kpis.avgResolutionTimeFormatted}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {kpis.avgResolutionHours ? `Approx ${kpis.avgResolutionHours} hrs from submission` : 'For resolved complaints'}
          </p>
        </div>

        {/* Escalation Rate */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Escalation Rate</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-rose-950/60 text-red-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-red-600 dark:text-rose-400 tracking-tight">
            {loading ? <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : `${kpis.escalationRate}%`}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {kpis.escalated || 0} tickets exceeded 3-day SLA
          </p>
        </div>
      </div>

      {/* Row 1: Charts Grid (Status Donut & 14-Day Grievance Trend) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Status Donut Chart */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Complaints by Status</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">Lifecycle Split</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Distribution across active workflow stages.</p>
          </div>

          <div className="h-64 relative flex items-center justify-center my-3">
            {loading ? (
              <div className="w-40 h-40 rounded-full border-8 border-slate-100 dark:border-slate-800 border-t-blue-600 animate-spin" />
            ) : (
              <>
                <ResponsiveContainer key={`pie-${isDark ? 'dark' : 'light'}`} width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={complaintData?.byStatus || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="label"
                      isAnimationActive={isAnimationActive}
                      animationDuration={800}
                    >
                      {(complaintData?.byStatus || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke={isDark ? '#0f172a' : '#ffffff'} strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Total Metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">{kpis.total}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Total</span>
                </div>
              </>
            )}
          </div>

          {/* Custom Status Legend */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            {(complaintData?.byStatus || []).map((s, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100/80 dark:border-slate-700/80">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{s.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{s.count}</span>
                  <span className="text-[10px] text-slate-400 ml-1">({s.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: 14-Day Continuous Grievance Trend (AreaChart) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Grievance Volume Trend (Last 14 Days)</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Daily volume of newly registered and resolved grievances.</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                <span>Registered</span>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Resolved</span>
              </span>
            </div>
          </div>

          <div className="h-72 w-full mt-4">
            {loading ? (
              <div className="h-full w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl animate-pulse flex items-center justify-center text-xs text-slate-400">
                Loading timeline trends...
              </div>
            ) : (
              <ResponsiveContainer key={`area-${isDark ? 'dark' : 'light'}`} width="100%" height="100%">
                <AreaChart
                  data={complaintData?.dailyTrend || []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="registeredGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
                    axisLine={{ stroke: isDark ? '#475569' : '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
                    axisLine={{ stroke: isDark ? '#475569' : '#e2e8f0' }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomDailyTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Registered"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#registeredGrad)"
                    isAnimationActive={isAnimationActive}
                    animationDuration={800}
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    name="Resolved"
                    stroke="#059669"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    fillOpacity={1}
                    fill="url(#resolvedGrad)"
                    isAnimationActive={isAnimationActive}
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Continuous 14-day chronological window</span>
            <span>Zero-filled calendar days without activity</span>
          </div>
        </div>
      </div>

      {/* Row 2: Charts Grid (Complaints by Category & Attendance by Course/Dept) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 3: Complaints by Category Bar Chart */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Complaints by Category</span>
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">Total Volume</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">Grievance concentration across operational domains.</p>

          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer key={`bar-cat-${isDark ? 'dark' : 'light'}`} width="100%" height="100%">
                <BarChart
                  data={complaintData?.byCategory || []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                    axisLine={{ stroke: isDark ? '#475569' : '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
                    axisLine={{ stroke: isDark ? '#475569' : '#e2e8f0' }}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val) => [`${val} complaints`, 'Total']}
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                      borderRadius: 12,
                      color: isDark ? '#fff' : '#0f172a',
                      fontSize: 12
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name="Complaints"
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={isAnimationActive}
                    animationDuration={800}
                  >
                    {(complaintData?.byCategory || []).map((entry, index) => (
                      <Cell
                        key={`cat-cell-${index}`}
                        fill={['#2563eb', '#3b82f6', '#60a5fa', '#6366f1', '#818cf8', '#4f46e5', '#93c5fd'][index % 7]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 4: Average Attendance by Course (and Department for Admin) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Academic Attendance Performance</span>
            </h3>

            {/* Toggle view for Admin */}
            {isAdmin && (
              <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setAttendanceView('course')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition ${
                    attendanceView === 'course' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  By Course
                </button>
                <button
                  onClick={() => setAttendanceView('department')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition ${
                    attendanceView === 'department' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  By Department
                </button>
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
            Average lecture presence rate compared to the 75% minimum academic requirement.
          </p>

          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer key={`bar-att-${attendanceView}-${isDark ? 'dark' : 'light'}`} width="100%" height="100%">
                <BarChart
                  data={
                    attendanceView === 'department' && isAdmin
                      ? attendanceData?.byDepartment || []
                      : attendanceData?.byCourse || []
                  }
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                  <XAxis
                    dataKey="code"
                    tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
                    axisLine={{ stroke: isDark ? '#475569' : '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[60, 100]}
                    unit="%"
                    tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
                    axisLine={{ stroke: isDark ? '#475569' : '#e2e8f0' }}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val, name, item) => [`${val}% attendance`, item.payload.name || item.payload.code]}
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                      borderRadius: 12,
                      color: isDark ? '#fff' : '#0f172a',
                      fontSize: 12
                    }}
                  />
                  {/* 75% Academic Requirement Reference Line */}
                  <ReferenceLine
                    y={75}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: '75% Min SLA', position: 'top', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }}
                  />
                  <Bar
                    dataKey="attendance_rate"
                    name="Attendance Rate"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={isAnimationActive}
                    animationDuration={800}
                  >
                    {(attendanceView === 'department' && isAdmin
                      ? attendanceData?.byDepartment || []
                      : attendanceData?.byCourse || []
                    ).map((entry, index) => {
                      const rate = entry.attendance_rate;
                      const barColor = rate >= 85 ? '#10b981' : rate >= 75 ? '#3b82f6' : '#f59e0b';
                      return <Cell key={`att-cell-${index}`} fill={barColor} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Admin Only Stacked Bar Chart (Complaints by Department and Status) */}
      {isAdmin && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Department Grievance Breakdown by Lifecycle Status</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase">
                  Admin Authority View
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Stacked comparison of resolution status across academic departments and Central Administration.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />Submitted</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Under Review</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />In Progress</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Resolved</span>
            </div>
          </div>

          <div className="h-64 w-full mt-4">
            {loading ? (
              <div className="h-full w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer key={`bar-dept-${isDark ? 'dark' : 'light'}`} width="100%" height="100%">
                <BarChart
                  data={complaintData?.byDepartment || []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                  <XAxis
                    dataKey="department_name"
                    tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
                    axisLine={{ stroke: isDark ? '#475569' : '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
                    axisLine={{ stroke: isDark ? '#475569' : '#e2e8f0' }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                      borderRadius: 12,
                      color: isDark ? '#fff' : '#0f172a',
                      fontSize: 12
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="submitted" name="Submitted" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="under_review" name="Under Review" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="in_progress" name="In Progress" stackId="a" fill="#6366f1" />
                  <Bar dataKey="resolved" name="Resolved" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

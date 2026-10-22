import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { attendanceApi, liveAttendanceApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getOrCreateDeviceId } from '../../utils/deviceId';
import {
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  BookOpen,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  Radio,
  Sparkles,
  Smartphone,
  KeyRound,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

export default function StudentAttendance() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Live Attendance Session State
  const [openSessions, setOpenSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionCodes, setSessionCodes] = useState({});
  const [submittingSessionId, setSubmittingSessionId] = useState(null);
  const [checkinFeedback, setCheckinFeedback] = useState({});

  const fetchOpenSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await liveAttendanceApi.getStudentOpenSessions();
      if (res.success) {
        setOpenSessions(res.sessions || []);
      }
    } catch (err) {
      console.warn('Could not fetch open live sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleCodeChange = (sessionId, val) => {
    // Only accept numeric up to 6 digits
    const clean = val.replace(/\D/g, '').slice(0, 6);
    setSessionCodes((prev) => ({ ...prev, [sessionId]: clean }));
  };

  const submitLiveCheckin = async (session) => {
    const code = sessionCodes[session.id] || '';
    if (code.length !== 6) {
      toast.warning('Please enter the full 6-digit passcode displayed on the lecture screen.');
      return;
    }

    setSubmittingSessionId(session.id);
    const deviceId = getOrCreateDeviceId();

    try {
      const res = await liveAttendanceApi.studentCheckin({
        session_id: session.id,
        code,
        device_id: deviceId
      });

      if (res.success) {
        if (res.result === 'flagged') {
          toast.warning('Submitted for faculty review', 'Review Pending');
          setCheckinFeedback((prev) => ({
            ...prev,
            [session.id]: { type: 'flagged', text: 'Submitted for faculty review' }
          }));
        } else {
          toast.success(res.message || 'Attendance marked', 'Check-in Recorded');
          setCheckinFeedback((prev) => ({
            ...prev,
            [session.id]: { type: 'success', text: `Attendance marked (${res.result === 'late' ? 'Late' : 'Present'})` }
          }));
          // Refresh student's overall attendance records
          fetchAttendance();
        }
        fetchOpenSessions();
      } else {
        toast.error(res.message || 'Check-in failed');
        setCheckinFeedback((prev) => ({
          ...prev,
          [session.id]: { type: 'error', text: res.message || 'Check-in failed' }
        }));
      }
    } catch (err) {
      const msg = err.message || '';
      let displayMsg = 'Failed to submit attendance.';

      if (msg.includes('429') || msg.toLowerCase().includes('too many')) {
        displayMsg = 'Too many attempts, wait a minute';
      } else if (msg.includes('409') || msg.toLowerCase().includes('already')) {
        displayMsg = 'Already marked';
      } else if (msg.toLowerCase().includes('expired')) {
        displayMsg = 'Code expired, check the screen again';
      } else if (msg.toLowerCase().includes('closed')) {
        displayMsg = 'Session closed';
      } else {
        displayMsg = msg || 'Check-in failed';
      }

      toast.error(displayMsg);
      setCheckinFeedback((prev) => ({
        ...prev,
        [session.id]: { type: 'error', text: displayMsg }
      }));
    } finally {
      setSubmittingSessionId(null);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await attendanceApi.getMine();
      if (res.success) {
        setData(res);
      } else {
        setError(res.message || 'Failed to load attendance records.');
      }
    } catch (err) {
      console.error('Error fetching student attendance:', err);
      setError(err.message || 'Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    fetchOpenSessions();
    const interval = setInterval(fetchOpenSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const overall = data?.overall || { total_sessions: 0, attended_sessions: 0, absent_sessions: 0, percentage: 0 };
  const courses = data?.courses || [];
  const recent = data?.recent || [];

  // Filter recent records
  const filteredRecent = recent.filter((r) => {
    const matchesSearch =
      r.course_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.date.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Any course below 75% triggers alert banner
  const atRiskCourses = courses.filter((c) => c.percentage < 75 && c.total_sessions > 0);

  const getPercentageColor = (pct) => {
    if (pct >= 85) {
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60',
        badge: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200',
        bar: 'bg-emerald-500'
      };
    }
    if (pct >= 75) {
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60',
        badge: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200',
        bar: 'bg-blue-500'
      };
    }
    return {
      bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60',
      badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200',
      bar: 'bg-amber-500'
    };
  };

  return (
    <AppLayout title="Academic Attendance">
      <div className="space-y-6">
        {/* Header Strip */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider">
                Student Portal
              </span>
              <span className="text-blue-200 text-xs">• Semester Attendance</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Attendance Record & Eligibility</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Track your regular lecture attendance, enter live verification codes, and monitor daily register entries.
            </p>
          </div>

          <button
            onClick={() => {
              fetchAttendance();
              fetchOpenSessions();
            }}
            disabled={loading}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Live Attendance Active Sessions Section */}
        {openSessions.length > 0 && (
          <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 rounded-2xl border border-indigo-700/50 p-5 sm:p-6 text-white shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <div>
                  <h3 className="text-base font-extrabold flex items-center gap-2">
                    Live Class Check-in
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Session Open
                    </span>
                  </h3>
                  <p className="text-xs text-blue-200">
                    Enter the 6-digit rotating code shown on the classroom screen.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchOpenSessions}
                className="text-xs text-blue-300 hover:text-white flex items-center gap-1 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${loadingSessions ? 'animate-spin' : ''}`} />
                Check updates
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {openSessions.map((session) => {
                const feedback = checkinFeedback[session.id];
                const isSubmitting = submittingSessionId === session.id;
                const codeVal = sessionCodes[session.id] || '';

                return (
                  <div
                    key={session.id}
                    className="bg-white/10 dark:bg-slate-950/60 rounded-xl p-4 border border-white/10 backdrop-blur-md space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-blue-300 uppercase">
                          {session.course_code}
                        </span>
                        <h4 className="text-sm font-bold text-white leading-tight">
                          {session.course_name}
                        </h4>
                      </div>
                      <span className="text-[10px] text-blue-200 bg-white/10 px-2 py-0.5 rounded-md font-mono">
                        Ends {new Date(session.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {session.my_result ? (
                      <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div>Attendance Registered</div>
                          <div className="text-[10px] font-normal text-emerald-200">
                            Status: {session.my_result === 'flagged' ? 'Under Review' : session.my_result}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            placeholder="000000"
                            value={codeVal}
                            onChange={(e) => handleCodeChange(session.id, e.target.value)}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-black/40 border border-white/20 rounded-xl text-center font-mono font-black text-xl tracking-widest text-white placeholder:text-white/30 focus:outline-hidden focus:border-blue-400"
                          />
                          <button
                            type="button"
                            onClick={() => submitLiveCheckin(session)}
                            disabled={isSubmitting || codeVal.length !== 6}
                            className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition-all shadow-md flex items-center gap-1.5 shrink-0"
                          >
                            {isSubmitting ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ArrowRight className="w-3.5 h-3.5" />
                            )}
                            Check In
                          </button>
                        </div>

                        {feedback && (
                          <div
                            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                              feedback.type === 'success'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : feedback.type === 'flagged'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {feedback.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {feedback.type === 'flagged' && <AlertTriangle className="w-3.5 h-3.5" />}
                            {feedback.type === 'error' && <XCircle className="w-3.5 h-3.5" />}
                            <span>{feedback.text}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Warning Banner if below 75% */}
        {atRiskCourses.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">Attendance Shortfall Warning</h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                You currently have less than 75% attendance in{' '}
                <span className="font-semibold underline">
                  {atRiskCourses.map((c) => `${c.course_code} (${c.percentage}%)`).join(', ')}
                </span>
                . University regulations mandate a minimum of 75% overall attendance to remain eligible for end-semester examinations. Please attend upcoming lectures to raise your percentage.
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800"></div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl p-6 text-center">
            <XCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">Failed to Load Attendance</h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{error}</p>
            <button
              onClick={fetchAttendance}
              className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {/* Data View */}
        {!loading && !error && (
          <>
            {/* Overall Summary KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Overall Attendance</span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${overall.percentage >= 75 ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'}`}>
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{overall.percentage}%</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">cumulative</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${overall.percentage >= 85 ? 'bg-emerald-500' : overall.percentage >= 75 ? 'bg-blue-600' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(100, overall.percentage)}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Attended Sessions</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{overall.attended_sessions}</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Includes present & late marks</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Absences</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <XCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{overall.absent_sessions}</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Sessions missed to date</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Lectures Held</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{overall.total_sessions}</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Across {courses.length} enrolled subjects</p>
              </div>
            </div>

            {/* Course-by-Course Percentage Cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Course-wise Breakdown</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">75% required for examination eligibility</span>
              </div>

              {courses.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                  No enrolled courses found for this academic semester.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses.map((course) => {
                    const colors = getPercentageColor(course.percentage);
                    return (
                      <div
                        key={course.course_id}
                        className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 transition-all shadow-xs hover:shadow-md ${
                          course.percentage < 75
                            ? 'border-amber-300 dark:border-amber-700'
                            : 'border-slate-200/80 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {course.course_code}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1 line-clamp-1">{course.course_name}</h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Instructor: {course.faculty_name || 'Department Faculty'}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${colors.badge}`}>
                            {course.percentage}%
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden mb-3">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                            style={{ width: `${Math.min(100, course.percentage)}%` }}
                          ></div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                          <div>
                            <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{course.present_count}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">Present</div>
                          </div>
                          <div>
                            <div className="text-xs font-extrabold text-blue-600 dark:text-blue-400">{course.late_count}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">Late</div>
                          </div>
                          <div>
                            <div className="text-xs font-extrabold text-rose-600 dark:text-rose-400">{course.absent_count}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">Absent</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Register Entries Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
              <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Attendance Activity</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Chronological register entries recorded by your course professors</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search subject or date..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-500 w-44 sm:w-56"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="absent">Absent</option>
                  </select>
                </div>
              </div>

              {filteredRecent.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                  No attendance entries matching your search filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Session Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-200">
                      {filteredRecent.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-slate-900 dark:text-white font-semibold whitespace-nowrap">
                            {record.date}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-bold text-slate-900 dark:text-white">{record.course_code}</span>
                            <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-1.5">— {record.course_name}</span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {record.status === 'present' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> Present
                              </span>
                            )}
                            {record.status === 'late' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                <Clock className="w-3 h-3" /> Late (Attended)
                              </span>
                            )}
                            {record.status === 'absent' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                <XCircle className="w-3 h-3" /> Absent
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 italic">
                            {record.remarks || 'Regular lecture'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

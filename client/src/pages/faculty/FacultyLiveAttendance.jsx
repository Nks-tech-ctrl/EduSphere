import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { liveAttendanceApi, attendanceApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import QRCode from 'qrcode';
import {
  Radio,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  Maximize2,
  Minimize2,
  RefreshCw,
  Play,
  Square,
  ShieldAlert,
  Smartphone,
  Wifi,
  History,
  QrCode,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
  Copy,
  Check
} from 'lucide-react';

export default function FacultyLiveAttendance() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('session'); // 'session' | 'history'
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Setup form state
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [intervalSeconds, setIntervalSeconds] = useState(20);
  const [requireSameNetwork, setRequireSameNetwork] = useState(true);
  const [starting, setStarting] = useState(false);

  // Active Session state
  const [activeSession, setActiveSession] = useState(null);
  const [sessionCode, setSessionCode] = useState('------');
  const [secondsRemaining, setSecondsRemaining] = useState(20);
  const [sessionCounts, setSessionCounts] = useState({ enrolled: 0, checked_in: 0, flagged: 0, not_yet: 0 });
  const [checkins, setCheckins] = useState([]);
  const [notYetStudents, setNotYetStudents] = useState([]);
  const [rosterTab, setRosterTab] = useState('stream'); // 'stream' | 'not_yet'
  const [loadingSession, setLoadingSession] = useState(false);

  // Network & LAN info
  const [lanInterfaces, setLanInterfaces] = useState([]);
  const [selectedLanIp, setSelectedLanIp] = useState('');
  const [manualIp, setManualIp] = useState('');
  const [refreshingNetwork, setRefreshingNetwork] = useState(false);

  // QR Code generation state
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrError, setQrError] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Helper to sort LAN interfaces: 192.168.x.x > 10.x.x.x > 172.16-31.x.x > others
  const sortLanInterfaces = (ifaces = []) => {
    const getScore = (ip) => {
      if (!ip) return 99;
      if (/^192\.168\./.test(ip)) return 1;
      if (/^10\./.test(ip)) return 2;
      const parts = String(ip).split('.').map(Number);
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return 3;
      return 4;
    };
    return [...ifaces].sort((a, b) => getScore(a.address) - getScore(b.address));
  };

  const refreshNetworkInfo = async () => {
    setRefreshingNetwork(true);
    try {
      const netRes = await liveAttendanceApi.getNetworkInfo();
      if (netRes && netRes.success) {
        const sorted = sortLanInterfaces(netRes.interfaces || []);
        setLanInterfaces(sorted);
        if (sorted.length > 0) {
          setSelectedLanIp(sorted[0].address);
        } else {
          setSelectedLanIp('');
        }
      }
    } catch (err) {
      console.error('Failed to refresh network info:', err);
    } finally {
      setRefreshingNetwork(false);
    }
  };

  // Close session modal
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeSummary, setCloseSummary] = useState(null);

  // History state
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistorySession, setSelectedHistorySession] = useState(null);
  const [historyDetailCheckins, setHistoryDetailCheckins] = useState([]);
  const [loadingHistoryDetails, setLoadingHistoryDetails] = useState(false);

  // Review state
  const [reviewingId, setReviewingId] = useState(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const projectorContainerRef = useRef(null);

  // Load faculty's courses and network interfaces on mount
  useEffect(() => {
    async function loadInitial() {
      setLoadingCourses(true);
      try {
        const [cRes, netRes, histRes] = await Promise.allSettled([
          attendanceApi.getCourses(),
          liveAttendanceApi.getNetworkInfo(),
          liveAttendanceApi.getHistory()
        ]);

        if (cRes.status === 'fulfilled' && cRes.value.success) {
          const list = cRes.value.courses || [];
          setCourses(list);
          if (list.length > 0) {
            setSelectedCourseId(String(list[0].id));
          }
        }

        if (netRes.status === 'fulfilled' && netRes.value.success) {
          const sorted = sortLanInterfaces(netRes.value.interfaces || []);
          setLanInterfaces(sorted);
          if (sorted.length > 0) {
            setSelectedLanIp(sorted[0].address);
          } else {
            setSelectedLanIp('');
          }
        }

        // Resume open session if one is already running
        if (histRes.status === 'fulfilled' && histRes.value.success) {
          const openSession = (histRes.value.sessions || []).find((s) => s.status === 'open');
          if (openSession) {
            setActiveSession(openSession);
            try {
              const [codeRes, detailsRes] = await Promise.allSettled([
                liveAttendanceApi.getCode(openSession.id),
                liveAttendanceApi.getDetails(openSession.id)
              ]);
              if (codeRes.status === 'fulfilled' && codeRes.value.success) {
                setSessionCode(codeRes.value.code);
                setSecondsRemaining(codeRes.value.seconds_remaining);
              }
              if (detailsRes.status === 'fulfilled' && detailsRes.value.success) {
                setSessionCounts(detailsRes.value.counts);
                setCheckins(detailsRes.value.checkins || []);
                setNotYetStudents(detailsRes.value.not_yet_students || []);
              }
            } catch (syncErr) {
              console.warn('Initial session sync notice:', syncErr);
            }
          }
        }
      } catch (err) {
        console.error('Error loading initial faculty data:', err);
      } finally {
        setLoadingCourses(false);
      }
    }
    loadInitial();
  }, []);

  // Sync fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Poll code and session details when session is open
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'open') return;

    let isMounted = true;

    // Fast code ticker (every 1s) to count down seconds
    const codeTimer = setInterval(async () => {
      try {
        const codeRes = await liveAttendanceApi.getCode(activeSession.id);
        if (codeRes.success && isMounted) {
          setSessionCode(codeRes.code);
          setSecondsRemaining(codeRes.seconds_remaining);
        }
      } catch (err) {
        // If session closed on server
        if (err.message && err.message.toLowerCase().includes('closed')) {
          if (isMounted) {
            setActiveSession((prev) => (prev ? { ...prev, status: 'closed' } : null));
          }
        }
      }
    }, 1000);

    // Roster & counts poller (every 3s)
    const rosterTimer = setInterval(async () => {
      try {
        const detailsRes = await liveAttendanceApi.getDetails(activeSession.id);
        if (detailsRes.success && isMounted) {
          setSessionCounts(detailsRes.counts);
          setCheckins(detailsRes.checkins || []);
          setNotYetStudents(detailsRes.not_yet_students || []);
          if (detailsRes.session.status === 'closed') {
            setActiveSession(detailsRes.session);
          }
        }
      } catch (err) {
        console.warn('Roster poll warning:', err);
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(codeTimer);
      clearInterval(rosterTimer);
    };
  }, [activeSession]);

  // Generate QR Code data URL whenever activeSession, sessionCode, LAN IP, or fullscreen changes
  useEffect(() => {
    let isMounted = true;

    if (!activeSession || activeSession.status !== 'open' || !sessionCode || sessionCode === '------') {
      setQrDataUrl('');
      setQrError(null);
      setLoadingQr(false);
      return () => {
        isMounted = false;
      };
    }

    const effectiveIp = selectedLanIp || manualIp;
    if (!effectiveIp) {
      setQrDataUrl('');
      setQrError(null);
      setLoadingQr(false);
      return () => {
        isMounted = false;
      };
    }

    setLoadingQr(true);
    setQrError(null);

    const port = (typeof window !== 'undefined' && window.location.port) ? window.location.port : '5173';
    const attendUrl = `http://${effectiveIp}:${port}/student/attend?s=${activeSession.id}&c=${sessionCode}`;

    const qrOpts = {
      width: isFullscreen ? 340 : 260,
      margin: 4, // at least 4 modules quiet zone
      color: {
        dark: '#000000', // always dark modules
        light: '#ffffff' // on pure white background in dark mode and fullscreen
      },
      errorCorrectionLevel: 'M'
    };

    // Safely resolve toDataURL across CommonJS/ESM bundler boundaries
    const qrFn = QRCode?.toDataURL || QRCode?.default?.toDataURL || (typeof QRCode === 'function' ? QRCode : null);

    if (typeof qrFn !== 'function') {
      if (isMounted) {
        setQrError('QR Code generator library function is unavailable.');
        setQrDataUrl('');
        setLoadingQr(false);
      }
      return () => {
        isMounted = false;
      };
    }

    try {
      Promise.resolve(qrFn(attendUrl, qrOpts))
        .then((url) => {
          if (isMounted) {
            setQrDataUrl(url);
            setQrError(null);
            setLoadingQr(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.error('QR code generation error:', err);
            setQrError(err?.message || 'Unable to generate QR code');
            setQrDataUrl('');
            setLoadingQr(false);
          }
        });
    } catch (err) {
      if (isMounted) {
        console.error('Synchronous QR code error:', err);
        setQrError(err?.message || 'Unable to generate QR code');
        setQrDataUrl('');
        setLoadingQr(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [activeSession?.id, activeSession?.status, sessionCode, selectedLanIp, manualIp, isFullscreen]);

  // Start live session
  const handleStartSession = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) {
      toast.error('Please select a course to begin attendance.');
      return;
    }

    setStarting(true);
    try {
      const res = await liveAttendanceApi.startSession({
        course_id: Number(selectedCourseId),
        duration_minutes: Number(durationMinutes),
        code_interval_seconds: Number(intervalSeconds),
        require_same_network: requireSameNetwork
      });

      if (res.success && res.session) {
        toast.success(`Live attendance session started for ${res.session.course_code}.`, 'Session Live');
        setActiveSession(res.session);
        if (res.counts) {
          setSessionCounts(res.counts);
        } else {
          setSessionCounts({ enrolled: 0, checked_in: 0, flagged: 0, not_yet: 0 });
        }
        setCheckins([]);
        setNotYetStudents(res.not_yet_students || []);

        // Initial fetch of code and full details immediately
        try {
          const [codeRes, detailsRes] = await Promise.allSettled([
            liveAttendanceApi.getCode(res.session.id),
            liveAttendanceApi.getDetails(res.session.id)
          ]);
          if (codeRes.status === 'fulfilled' && codeRes.value.success) {
            setSessionCode(codeRes.value.code);
            setSecondsRemaining(codeRes.value.seconds_remaining);
          }
          if (detailsRes.status === 'fulfilled' && detailsRes.value.success) {
            setSessionCounts(detailsRes.value.counts);
            setCheckins(detailsRes.value.checkins || []);
            setNotYetStudents(detailsRes.value.not_yet_students || []);
          }
        } catch (fetchErr) {
          console.warn('Initial session sync notice:', fetchErr);
        }
      } else {
        toast.error(res.message || 'Could not start session.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start live session.');
    } finally {
      setStarting(false);
    }
  };

  // Close session action
  const handleCloseSession = async () => {
    if (!activeSession) return;
    setClosing(true);
    try {
      const res = await liveAttendanceApi.closeSession(activeSession.id);
      if (res.success) {
        toast.info('Attendance session closed. Unmarked students recorded as absent.', 'Session Closed');
        setIsCloseModalOpen(false);

        // Fetch final session details for summary
        const finalDetails = await liveAttendanceApi.getDetails(activeSession.id);
        if (finalDetails.success) {
          setCloseSummary({
            session: finalDetails.session,
            counts: finalDetails.counts
          });
          setActiveSession(finalDetails.session);
          setSessionCounts(finalDetails.counts);
          setCheckins(finalDetails.checkins);
        }
      } else {
        toast.error(res.message || 'Failed to close session.');
      }
    } catch (err) {
      toast.error(err.message || 'Error closing session.');
    } finally {
      setClosing(false);
    }
  };

  // Review a flagged check-in (Approve or Reject)
  const handleReview = async (checkinId, decision) => {
    if (!activeSession) return;
    setReviewingId(checkinId);
    try {
      const res = await liveAttendanceApi.reviewCheckin(activeSession.id, {
        checkin_id: checkinId,
        decision
      });

      if (res.success) {
        toast.success(res.message || `Check-in ${decision}d.`);
        // Refresh session roster
        const detailsRes = await liveAttendanceApi.getDetails(activeSession.id);
        if (detailsRes.success) {
          setSessionCounts(detailsRes.counts);
          setCheckins(detailsRes.checkins || []);
          setNotYetStudents(detailsRes.not_yet_students || []);
        }
      } else {
        toast.error(res.message || 'Review failed.');
      }
    } catch (err) {
      toast.error(err.message || 'Error processing review.');
    } finally {
      setReviewingId(null);
    }
  };

  // Toggle Projector Fullscreen
  const toggleFullscreen = () => {
    if (!projectorContainerRef.current) return;
    if (!document.fullscreenElement) {
      projectorContainerRef.current.requestFullscreen().catch((err) => {
        console.error('Fullscreen request error:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error('Exit fullscreen error:', err);
      });
    }
  };

  // Load Past Sessions for History tab
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await liveAttendanceApi.getHistory();
      if (res.success) {
        setHistoryList(res.sessions || []);
      } else {
        toast.error(res.message || 'Failed to load session history.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Unable to retrieve session history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  // Open Details Modal for a past session in History
  const viewHistoryDetails = async (session) => {
    setSelectedHistorySession(session);
    setLoadingHistoryDetails(true);
    try {
      const res = await liveAttendanceApi.getDetails(session.id);
      if (res.success) {
        setHistoryDetailCheckins(res.checkins || []);
      }
    } catch (err) {
      console.error('Error fetching past checkins:', err);
    } finally {
      setLoadingHistoryDetails(false);
    }
  };

  // Helper for human-readable flag reasons
  const getFlagLabel = (reason) => {
    switch (reason) {
      case 'shared_device':
        return 'Same device as another student';
      case 'new_device':
        return 'New device';
      case 'different_network':
        return 'Different network';
      default:
        return reason;
    }
  };

  const effectiveLanIp = selectedLanIp || manualIp;
  const currentPort = (typeof window !== 'undefined' && window.location.port) ? window.location.port : '5173';
  const currentAttendUrl = (activeSession && effectiveLanIp && sessionCode && sessionCode !== '------')
    ? `http://${effectiveLanIp}:${currentPort}/student/attend?s=${activeSession.id}&c=${sessionCode}`
    : '';

  const handleCopyUrl = async () => {
    if (!currentAttendUrl) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentAttendUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = currentAttendUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedUrl(true);
      toast.success('Attendance link copied to clipboard.');
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch (err) {
      toast.error('Failed to copy URL to clipboard.');
    }
  };

  // Calculate circular countdown dashoffset (circumference = 2 * PI * 40 ≈ 251.3)
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = secondsRemaining / (activeSession?.code_interval_seconds || 20);
  const strokeDashoffset = circumference - progressRatio * circumference;

  return (
    <AppLayout title="Live Attendance & Smart Proxy Protection">
      <div className="space-y-6">
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Radio className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Anti-Proxy Live Attendance
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Timed rotating verification codes and local network device verification
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('session')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'session'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <QrCode className="w-4 h-4" />
              Live Session
              {activeSession && activeSession.status === 'open' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              Past Sessions
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: LIVE SESSION (SETUP OR PROJECTOR)                                  */}
        {/* ========================================================================= */}
        {activeTab === 'session' && (
          <>
            {!activeSession || activeSession.status === 'closed' ? (
              /* SETUP FORM */
              <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8">
                <div className="text-center max-w-md mx-auto mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20 mb-3">
                    <Radio className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Start a Live Attendance Session
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Present the rotating verification code and QR code on the lecture projector. Students check in from their enrolled accounts.
                  </p>
                </div>

                <form onSubmit={handleStartSession} className="space-y-6">
                  {/* Course Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Course Selection
                    </label>
                    {loadingCourses ? (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-500 animate-pulse">
                        Loading assigned courses...
                      </div>
                    ) : courses.length === 0 ? (
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                        No courses assigned to your account.
                      </div>
                    ) : (
                      <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      >
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} — {c.name} ({c.enrolled_count || 0} students)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Duration Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Session Window Duration
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[5, 10, 15].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDurationMinutes(d)}
                          className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            durationMinutes === d
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                              : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {d} Minutes
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Code Rotation Interval */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Code Rotation Interval
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[15, 20, 30].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setIntervalSeconds(s)}
                          className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            intervalSeconds === s
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                              : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          {s} Seconds
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                      The code rotates every {intervalSeconds}s. Previous window is accepted as grace period.
                    </p>
                  </div>

                  {/* Require Same Network Toggle */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-start gap-3">
                    <input
                      id="network-toggle"
                      type="checkbox"
                      checked={requireSameNetwork}
                      onChange={(e) => setRequireSameNetwork(e.target.checked)}
                      className="mt-1 w-4 h-4 text-blue-600 rounded-md border-slate-300 dark:border-slate-700 focus:ring-blue-500"
                    />
                    <label htmlFor="network-toggle" className="cursor-pointer">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Wifi className="w-3.5 h-3.5 text-blue-600" />
                        Require same Wi-Fi network (Recommended)
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Flags students attempting check-in from external cellular data or outside the classroom subnet.
                      </p>
                    </label>
                  </div>

                  {/* Start Button */}
                  <button
                    type="submit"
                    disabled={starting || courses.length === 0}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {starting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Initializing Live Session...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        Launch Live Attendance Session
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* ACTIVE PROJECTOR SCREEN */
              <div
                ref={projectorContainerRef}
                className={`space-y-6 ${
                  isFullscreen
                    ? 'p-8 bg-slate-950 text-white min-h-screen overflow-y-auto'
                    : ''
                }`}
              >
                {/* Projector Top Toolbar */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                          {activeSession.course_code}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {activeSession.course_name}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Session Ends At: {new Date(activeSession.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* LAN IP Dropdown */}
                    {lanInterfaces.length > 1 && (
                      <select
                        value={selectedLanIp}
                        onChange={(e) => setSelectedLanIp(e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl font-medium text-slate-700 dark:text-slate-300 focus:outline-hidden"
                      >
                        {lanInterfaces.map((iface) => (
                          <option key={iface.address} value={iface.address}>
                            LAN: {iface.address} ({iface.name})
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Fullscreen Button */}
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                    >
                      {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                      {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
                    </button>

                    {/* Close Session Button */}
                    <button
                      type="button"
                      onClick={() => setIsCloseModalOpen(true)}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <Square className="w-3.5 h-3.5 fill-white" />
                      Close Session
                    </button>
                  </div>
                </div>

                {/* Primary Projector Hero: Rotating Code + QR Display */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Left Column: Big Projector Code Box */}
                  <div className="lg:col-span-7 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 rounded-3xl p-6 sm:p-8 text-white flex flex-col justify-between shadow-xl border border-slate-800 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          Live Rotating Passcode
                        </span>
                        <span className="text-xs text-slate-400">Refreshes every {activeSession.code_interval_seconds}s</span>
                      </div>

                      {/* SVG Countdown Ring */}
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <svg className="w-12 h-12 transform -rotate-90">
                          <circle
                            cx="24"
                            cy="24"
                            r={radius}
                            className="text-slate-800"
                            strokeWidth="4"
                            stroke="currentColor"
                            fill="transparent"
                          />
                          <circle
                            cx="24"
                            cy="24"
                            r={radius}
                            className="text-blue-500 transition-all duration-1000 ease-linear"
                            strokeWidth="4"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                          />
                        </svg>
                        <span className="absolute text-xs font-extrabold text-blue-400">
                          {secondsRemaining}s
                        </span>
                      </div>
                    </div>

                    {/* Giant 6-digit Code */}
                    <div className="my-6 text-center">
                      <div className="text-6xl sm:text-7xl md:text-8xl font-black font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-indigo-300 drop-shadow-md select-all">
                        {sessionCode}
                      </div>
                      <p className="text-xs text-slate-400 mt-3 font-medium">
                        Students must enter this 6-digit passcode into their Edusphere phone app.
                      </p>
                    </div>

                    {/* Live Metric Counters Strip */}
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800">
                      <div className="bg-emerald-950/60 border border-emerald-800/80 rounded-2xl p-3 text-center">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Checked In</span>
                        <div className="text-2xl font-black text-emerald-200 mt-0.5">{sessionCounts.checked_in}</div>
                      </div>

                      <div className="bg-amber-950/60 border border-amber-800/80 rounded-2xl p-3 text-center">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Flagged</span>
                        <div className="text-2xl font-black text-amber-200 mt-0.5">{sessionCounts.flagged}</div>
                      </div>

                      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-3 text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Not Yet</span>
                        <div className="text-2xl font-black text-slate-200 mt-0.5">{sessionCounts.not_yet}</div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Local QR Code Box with fixed min height */}
                  <div className={`lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 flex flex-col items-center justify-center text-center shadow-sm ${isFullscreen ? 'min-h-[480px]' : 'min-h-[400px]'}`}>
                    <div className="w-full flex items-center justify-between gap-2 mb-3">
                      <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Scan with Phone Camera
                      </span>

                      {/* Dropdown if multiple LAN IPs available */}
                      {lanInterfaces.length > 1 && (
                        <select
                          value={selectedLanIp}
                          onChange={(e) => {
                            setSelectedLanIp(e.target.value);
                            setManualIp('');
                          }}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] rounded-lg font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden"
                        >
                          {lanInterfaces.map((iface) => (
                            <option key={iface.address} value={iface.address}>
                              LAN: {iface.address} ({iface.name})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* QR Code Presentation Box with fixed minimum height to prevent collapse */}
                    <div className={`w-full flex items-center justify-center ${isFullscreen ? 'min-h-[360px]' : 'min-h-[280px]'}`}>
                      {!effectiveLanIp ? (
                        <div className="p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-center max-w-sm my-3">
                          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                          <p className="text-xs font-bold text-amber-800 dark:text-amber-200 leading-snug">
                            No network address found. Connect this laptop to Wi-Fi or a hotspot, then press Refresh
                          </p>
                          <div className="mt-3 flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={refreshNetworkInfo}
                              disabled={refreshingNetwork}
                              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${refreshingNetwork ? 'animate-spin' : ''}`} />
                              {refreshingNetwork ? 'Scanning...' : 'Refresh'}
                            </button>
                          </div>

                          <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-800/80 text-left">
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Or type laptop IP address manually:
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 192.168.1.100"
                              value={manualIp}
                              onChange={(e) => setManualIp(e.target.value.trim())}
                              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                            />
                          </div>
                        </div>
                      ) : qrError ? (
                        <div className="p-5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-center max-w-sm my-3 w-full">
                          <XCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                          <p className="text-xs font-bold text-rose-800 dark:text-rose-200 mb-1">
                            Unable to render QR code
                          </p>
                          <p className="text-[11px] text-rose-600 dark:text-rose-400 font-mono break-all">
                            {qrError}
                          </p>
                        </div>
                      ) : loadingQr && !qrDataUrl ? (
                        <div className={`${isFullscreen ? 'w-[340px] h-[340px]' : 'w-[260px] h-[260px]'} bg-slate-100 dark:bg-slate-800/60 rounded-2xl flex flex-col items-center justify-center animate-pulse border border-slate-200 dark:border-slate-700 my-2`}>
                          <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mb-2" />
                          <span className="text-xs font-medium text-slate-500">Generating QR Code...</span>
                        </div>
                      ) : qrDataUrl ? (
                        <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 inline-block my-2">
                          <img
                            src={qrDataUrl}
                            alt="Live Attendance QR Code"
                            className={`${isFullscreen ? 'w-[340px] h-[340px]' : 'w-[260px] h-[260px]'} rounded-xl bg-white object-contain`}
                          />
                        </div>
                      ) : (
                        <div className={`${isFullscreen ? 'w-[340px] h-[340px]' : 'w-[260px] h-[260px]'} bg-slate-100 dark:bg-slate-800/60 rounded-2xl flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700 my-2 text-slate-400 text-xs`}>
                          <QrCode className="w-8 h-8 mb-2 opacity-50" />
                          <span>Preparing QR Code...</span>
                        </div>
                      )}
                    </div>

                    {/* Full URL as plain text with Copy button */}
                    {currentAttendUrl ? (
                      <div className="mt-4 w-full max-w-md">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1">
                          <span>Direct Access URL:</span>
                          <button
                            type="button"
                            onClick={handleCopyUrl}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                          >
                            {copiedUrl ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                        </div>
                        <code className="block p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 break-all select-all border border-slate-200 dark:border-slate-700 text-left">
                          {currentAttendUrl}
                        </code>
                      </div>
                    ) : null}

                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3 max-w-xs">
                      Phones on the same Wi-Fi can scan this QR code to automatically open check-in with prefilled passcode.
                    </p>
                  </div>
                </div>

                {/* Live Check-in Stream & Flag Review Roster */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        Live Check-in Stream
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold">
                          {sessionCounts.checked_in} of {sessionCounts.enrolled} checked in
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Real-time student submissions. Review and approve or reject flagged submissions.
                      </p>
                    </div>

                    {sessionCounts.flagged > 0 && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {sessionCounts.flagged} Pending Review
                      </span>
                    )}
                  </div>

                  {/* Sub-tabs: Checked In vs Not Yet Checked In */}
                  <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-5 pt-2 bg-slate-50/50 dark:bg-slate-800/30">
                    <button
                      type="button"
                      onClick={() => setRosterTab('stream')}
                      className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                        rosterTab === 'stream'
                          ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Checked In ({checkins.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRosterTab('not_yet')}
                      className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                        rosterTab === 'not_yet'
                          ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Not Yet Checked In ({sessionCounts.not_yet})
                    </button>
                  </div>

                  {rosterTab === 'stream' ? (
                    checkins.length === 0 ? (
                      <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        Waiting for student check-ins to arrive...
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                            <tr>
                              <th className="py-3 px-4">Student</th>
                              <th className="py-3 px-4">Check-in Time</th>
                              <th className="py-3 px-4">Result / Flags</th>
                              <th className="py-3 px-4">Status & Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                            {checkins.map((c) => (
                              <tr
                                key={c.id}
                                className={`transition-colors ${
                                  c.result === 'flagged' && c.review === 'pending'
                                    ? 'bg-amber-50/60 dark:bg-amber-950/20'
                                    : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                                }`}
                              >
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={c.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.student_name}`}
                                      alt={c.student_name}
                                      className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover bg-slate-100 dark:bg-slate-800"
                                    />
                                    <div>
                                      <div className="font-bold text-slate-900 dark:text-white">{c.student_name}</div>
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{c.student_email}</div>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                                  {new Date(c.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </td>

                                <td className="py-3 px-4">
                                  {c.result === 'present' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      Present
                                    </span>
                                  )}
                                  {c.result === 'late' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                      <Clock className="w-3 h-3 text-blue-600" />
                                      Late (Attended)
                                    </span>
                                  )}
                                  {c.result === 'flagged' && (
                                    <div className="space-y-1">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                                        Flagged
                                      </span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {(c.flag_reasons || []).map((reason, idx) => (
                                          <span
                                            key={idx}
                                            className="text-[10px] px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                                          >
                                            {getFlagLabel(reason)}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </td>

                                <td className="py-3 px-4">
                                  {c.result === 'flagged' && c.review === 'pending' ? (
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        disabled={reviewingId === c.id}
                                        onClick={() => handleReview(c.id, 'approve')}
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-all disabled:opacity-50"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        type="button"
                                        disabled={reviewingId === c.id}
                                        onClick={() => handleReview(c.id, 'reject')}
                                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition-all disabled:opacity-50"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  ) : c.review === 'approved' ? (
                                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                      Approved by Faculty
                                    </span>
                                  ) : c.review === 'rejected' ? (
                                    <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                                      Rejected (Marked Absent)
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">Clean Check-in</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : (
                    /* TAB: Not Yet Checked In */
                    notYetStudents.length === 0 ? (
                      <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <span className="font-bold text-slate-700 dark:text-slate-200 block text-sm">All Enrolled Students Checked In!</span>
                        <span className="text-[11px] text-slate-400 mt-1 block">100% attendance recorded for this session.</span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                            <tr>
                              <th className="py-3 px-4">Student</th>
                              <th className="py-3 px-4">Institutional Email</th>
                              <th className="py-3 px-4">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                            {notYetStudents.map((st) => (
                              <tr key={st.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={st.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${st.name}`}
                                      alt={st.name}
                                      className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover bg-slate-100 dark:bg-slate-800"
                                    />
                                    <span className="font-bold text-slate-900 dark:text-white">{st.name}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                  {st.email}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    Not Yet Checked In
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SESSION HISTORY                                                    */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Past Live Attendance Sessions
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Complete history of initiated sessions, student check-in percentages, and anti-proxy flag logs.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchHistory}
                disabled={loadingHistory}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {loadingHistory ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                Loading past session records...
              </div>
            ) : historyList.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No past live attendance sessions found for your assigned courses.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Date & Course</th>
                      <th className="py-3 px-4">Time Window</th>
                      <th className="py-3 px-4">Present / Late</th>
                      <th className="py-3 px-4">Flagged</th>
                      <th className="py-3 px-4">Absent</th>
                      <th className="py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                    {historyList.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {s.course_code} — {s.course_name}
                          </div>
                          <div className="text-[11px] text-slate-500">{s.date}</div>
                        </td>

                        <td className="py-3 px-4 text-slate-500">
                          {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                          {new Date(s.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {s.present_count || 0} Present
                          </span>
                          {s.late_count > 0 && (
                            <span className="text-blue-600 dark:text-blue-400 ml-1.5 font-bold">
                              • {s.late_count} Late
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {s.flagged_count > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              {s.flagged_count} Flagged
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-rose-600 dark:text-rose-400 font-bold">
                          {s.absent_count || 0}
                        </td>

                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => viewHistoryDetails(s)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-lg transition-all"
                          >
                            View Roster
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: CLOSE SESSION CONFIRMATION                                         */}
        {/* ========================================================================= */}
        <ConfirmModal
          isOpen={isCloseModalOpen}
          onClose={() => setIsCloseModalOpen(false)}
          onConfirm={handleCloseSession}
          loading={closing}
          title="Close Live Attendance Session?"
          message="Closing the session will finalize check-ins. All enrolled students who have not checked in will be recorded as Absent. Any pending flagged check-ins will remain unmarked until you review them."
          confirmText="Yes, Close Session"
          cancelText="Keep Open"
          danger={true}
        />

        {/* ========================================================================= */}
        {/* MODAL: POST-CLOSE SESSION SUMMARY                                         */}
        {/* ========================================================================= */}
        {closeSummary && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" onClick={() => setCloseSummary(null)} />
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Session Concluded
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Attendance sheet updated successfully
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Checked In</span>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      {closeSummary.counts.checked_in}
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Flagged (Pending)</span>
                    <div className="text-xl font-black text-amber-600 dark:text-amber-400">
                      {closeSummary.counts.flagged}
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Marked Absent</span>
                    <div className="text-xl font-black text-rose-600 dark:text-rose-400">
                      {closeSummary.counts.not_yet}
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total Enrolled</span>
                    <div className="text-xl font-black text-slate-700 dark:text-slate-300">
                      {closeSummary.counts.enrolled}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCloseSummary(null)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: PAST SESSION ROSTER DETAILS                                         */}
        {/* ========================================================================= */}
        {selectedHistorySession && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" onClick={() => setSelectedHistorySession(null)} />
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {selectedHistorySession.course_code} — {selectedHistorySession.course_name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Session Date: {selectedHistorySession.date}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedHistorySession(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1">
                  {loadingHistoryDetails ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                      Loading roster details...
                    </div>
                  ) : historyDetailCheckins.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No check-ins recorded for this session.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Student</th>
                          <th className="py-2.5 px-3">Time</th>
                          <th className="py-2.5 px-3">Result</th>
                          <th className="py-2.5 px-3">Review</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {historyDetailCheckins.map((c) => (
                          <tr key={c.id}>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900 dark:text-white">{c.student_name}</div>
                              <div className="text-[10px] text-slate-400">{c.student_email}</div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {new Date(c.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  c.result === 'present'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : c.result === 'late'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {c.result}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-500">
                              {c.review}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

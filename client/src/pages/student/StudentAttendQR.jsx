import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { liveAttendanceApi } from '../../services/api';
import { getOrCreateDeviceId } from '../../utils/deviceId';
import Logo from '../../components/common/Logo';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Smartphone,
  ExternalLink
} from 'lucide-react';

export default function StudentAttendQR() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('s');
  const codeParam = searchParams.get('c');

  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [resultStatus, setResultStatus] = useState(null); // 'present' | 'late' | 'flagged' | 'error'
  const [resultMessage, setResultMessage] = useState('');
  const [errorCode, setErrorCode] = useState(null); // 400 | 403 | 409 | 429

  // Requirement 6: Guard against double submission (e.g. React 18 strict mode double-effects)
  const hasSubmittedRef = useRef(false);

  // If not authenticated, redirect to login with return path
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      navigate(`/login?redirect=${returnUrl}`, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Once authenticated as student and parameters are present, auto-submit
  useEffect(() => {
    if (authLoading || !isAuthenticated || !sessionId || !codeParam) return;

    if (user?.role !== 'student') {
      setResultStatus('error');
      setResultMessage('Only enrolled students can register live attendance.');
      return;
    }

    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    async function submitCheckin() {
      setSubmitting(true);
      const deviceId = getOrCreateDeviceId();

      try {
        const res = await liveAttendanceApi.studentCheckin({
          session_id: Number(sessionId),
          code: codeParam.trim(),
          device_id: deviceId
        });

        if (res.success) {
          setResultStatus(res.result);
          if (res.result === 'flagged') {
            setResultMessage('Submitted for faculty review');
          } else {
            setResultMessage(res.message || 'Attendance marked');
          }
        } else {
          setResultStatus('error');
          setResultMessage(res.message || 'Check-in failed');
        }
      } catch (err) {
        setResultStatus('error');
        const msg = err.message || '';
        if (msg.includes('429') || msg.toLowerCase().includes('too many')) {
          setErrorCode(429);
          setResultMessage('Too many attempts, wait a minute');
        } else if (msg.includes('409') || msg.toLowerCase().includes('already')) {
          setErrorCode(409);
          setResultMessage('Already marked');
        } else if (msg.toLowerCase().includes('expired')) {
          setErrorCode(400);
          setResultMessage('Code expired, check the screen again');
        } else if (msg.toLowerCase().includes('closed')) {
          setErrorCode(400);
          setResultMessage('Session closed');
        } else {
          setResultMessage(msg || 'Failed to submit attendance.');
        }
      } finally {
        setSubmitting(false);
      }
    }

    submitCheckin();
  }, [authLoading, isAuthenticated, user, sessionId, codeParam]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-8 text-center space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>

        {authLoading || submitting ? (
          <div className="py-8 space-y-3">
            <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Validating Attendance Check-in...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verifying session passcode, course enrollment, and local device binding.
            </p>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {/* SUCCESS STATES */}
            {(resultStatus === 'present' || resultStatus === 'late') && (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Attendance Marked!
                </h3>
                <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                  Status: {resultStatus === 'late' ? 'Late (Attended)' : 'Present'}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Your live attendance has been successfully recorded in the course register.
                </p>
              </div>
            )}

            {/* FLAGGED STATE */}
            {resultStatus === 'flagged' && (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
                  <AlertTriangle className="w-9 h-9" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Submitted for Faculty Review
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Your check-in was flagged for proxy review (e.g. shared device or network check) and is pending faculty confirmation.
                </p>
              </div>
            )}

            {/* ERROR / REJECTED STATES */}
            {resultStatus === 'error' && (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
                  <XCircle className="w-9 h-9" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {resultMessage}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  {errorCode === 429
                    ? 'Too many wrong attempts entered from this session. Please wait 1 minute before trying again.'
                    : errorCode === 409
                    ? 'You have already recorded your check-in for this live lecture session.'
                    : 'Please check the lecture screen for the latest rotating 6-digit passcode and try again.'}
                </p>
              </div>
            )}

            {/* Navigation Actions */}
            <div className="pt-4 flex flex-col gap-2">
              <Link
                to="/student/attendance"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                Go to Attendance Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/student/dashboard"
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all"
              >
                Return to Student Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

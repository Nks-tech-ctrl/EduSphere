import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { complaintApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Building,
  User,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  HelpCircle,
  FileText,
  CornerDownRight
} from 'lucide-react';

const CANONICAL_STAGES = [
  { id: 'submitted', label: 'Submitted', rank: 1 },
  { id: 'under_review', label: 'Under Review', rank: 2 },
  { id: 'in_progress', label: 'In Progress', rank: 3 },
  { id: 'resolved', label: 'Resolved', rank: 4 },
];

export default function ComplaintDetail() {
  const { ticket_no } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDetail() {
      setLoading(true);
      setError('');
      try {
        const res = await complaintApi.getComplaintByTicket(ticket_no);
        if (res.success) {
          setComplaint(res.complaint);
          setTimeline(res.timeline || []);
        } else {
          setError(res.message || 'Complaint not found.');
        }
      } catch (err) {
        setError(err.message || 'Failed to retrieve complaint details.');
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [ticket_no]);

  if (loading) {
    return (
      <AppLayout title="Complaint Timeline">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Retrieving ticket audit trail...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !complaint) {
    return (
      <AppLayout title="Complaint Details">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900 p-8 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">Error Loading Ticket</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">{error || 'Ticket not found.'}</p>
          <Link
            to="/student/complaints"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 text-white font-semibold text-xs hover:bg-slate-900 dark:hover:bg-slate-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to My Complaints</span>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'under_review':
        return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'in_progress':
        return 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'resolved':
        return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const formatStatus = (s) => (s ? s.replace('_', ' ') : '');

  // Evaluate milestones (handling skipped stages as requested)
  const currentStageRank =
    CANONICAL_STAGES.find((s) => s.id === complaint.status)?.rank || 1;

  return (
    <AppLayout title={`Ticket ${complaint.ticket_no}`}>
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/student/complaints')}
            className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                {complaint.ticket_no}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">• Submitted {complaint.created_at?.split(' ')[0]}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">{complaint.title}</h2>
          </div>
        </div>

        <Link
          to="/student/complaints"
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
        >
          ← Back to Registry
        </Link>
      </div>

      {/* Main Ticket Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase tracking-wider">
              {complaint.category}
            </span>

            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${getStatusBadge(
                complaint.status
              )}`}
            >
              {formatStatus(complaint.status)}
            </span>

            {complaint.escalated === 1 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Escalated to Priority</span>
              </span>
            )}

            {complaint.is_anonymous === 1 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Anonymous Grievance</span>
              </span>
            )}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Routing Authority:{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {complaint.assigned_role === 'hod'
                ? `HOD (${complaint.department_code || 'Dept'})`
                : 'Central Administration'}
            </strong>
          </div>
        </div>

        {/* Complaint Statement */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            Grievance Statement
          </h4>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/80 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
            {complaint.description}
          </p>
        </div>

        {/* Metadata Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <span className="block text-slate-400 dark:text-slate-500 font-semibold text-[10px] uppercase">Registered By</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {complaint.submitter_name || 'Student'}
            </span>
          </div>
          <div>
            <span className="block text-slate-400 dark:text-slate-500 font-semibold text-[10px] uppercase">Submission Date</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{complaint.created_at}</span>
          </div>
          <div>
            <span className="block text-slate-400 dark:text-slate-500 font-semibold text-[10px] uppercase">Last Status Update</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{complaint.updated_at || complaint.created_at}</span>
          </div>
        </div>
      </div>

      {/* Status Progress Stepper (Handling Skipped Stages) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Resolution Progress Path</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Visual progress showing verified milestones and future stages.</p>
          </div>
          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
            Status: {formatStatus(complaint.status)}
          </span>
        </div>

        {/* Progress Bar Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
          {CANONICAL_STAGES.map((stage, idx) => {
            const updateRecord = timeline.find((u) => u.new_status === stage.id);
            const hasHappened = !!updateRecord;
            const isSkipped = !hasHappened && stage.rank < currentStageRank;
            const isFuture = !hasHappened && stage.rank > currentStageRank;

            return (
              <div
                key={stage.id}
                className={`p-4 rounded-xl border transition-all ${
                  hasHappened
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-950 dark:text-blue-200 shadow-xs'
                    : isSkipped
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 border-dashed border-amber-300 dark:border-amber-800 text-slate-500 dark:text-slate-400'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700 text-slate-400 dark:text-slate-500 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Step 0{idx + 1}
                  </span>
                  {hasHappened ? (
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                      ✓
                    </span>
                  ) : isSkipped ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                      Bypassed
                    </span>
                  ) : (
                    <span className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] text-slate-400">
                      {idx + 1}
                    </span>
                  )}
                </div>

                <h4
                  className={`text-xs font-bold ${
                    hasHappened ? 'text-blue-900 dark:text-blue-300' : isSkipped ? 'text-slate-600 dark:text-slate-400 line-through' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {stage.label}
                </h4>

                <p className="text-[11px] mt-1">
                  {hasHappened ? (
                    <span className="text-blue-700 dark:text-blue-400 font-medium">
                      {updateRecord.created_at ? updateRecord.created_at.split(' ')[0] : 'Logged'}
                    </span>
                  ) : isSkipped ? (
                    <span className="text-amber-700/80 dark:text-amber-400/80 italic text-[10px]">
                      Skipped direct to {formatStatus(complaint.status)}
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">Pending</span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chronological Vertical Update Timeline */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Audit Trail & Action Log</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Every remark, status change, and inspection note recorded.</p>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {timeline.length} event(s) logged
          </span>
        </div>

        <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-2.5 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {timeline.map((update, idx) => {
            const isLatest = idx === timeline.length - 1;

            return (
              <div key={update.id || idx} className="relative group">
                {/* Timeline Node dot */}
                <div
                  className={`absolute -left-[23px] sm:-left-[25px] top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ring-2 ${
                    isLatest
                      ? 'bg-blue-600 ring-blue-400 animate-pulse'
                      : 'bg-slate-400 dark:bg-slate-600 ring-slate-200 dark:ring-slate-700'
                  }`}
                />

                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getStatusBadge(
                          update.new_status
                        )}`}
                      >
                        {formatStatus(update.new_status)}
                      </span>

                      <span className="text-xs font-bold text-slate-800 dark:text-white">
                        {update.updater_name}
                      </span>

                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                        • {update.updater_role}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                      {update.created_at}
                    </span>
                  </div>

                  {/* Remark text */}
                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-850 p-3 rounded-lg border border-slate-100 dark:border-slate-700 italic">
                    "{update.remark}"
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

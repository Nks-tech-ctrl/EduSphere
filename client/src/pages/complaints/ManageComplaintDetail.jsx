import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { complaintApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Building,
  User,
  Calendar,
  Send,
  Lock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  FileText
} from 'lucide-react';

const CANONICAL_STAGES = [
  { id: 'submitted', label: 'Submitted', rank: 1 },
  { id: 'under_review', label: 'Under Review', rank: 2 },
  { id: 'in_progress', label: 'In Progress', rank: 3 },
  { id: 'resolved', label: 'Resolved', rank: 4 },
];

export default function ManageComplaintDetail() {
  const { ticket_no } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const isAdmin = user?.role === 'admin';
  const isHod = user?.role === 'hod';
  const backQueuePath = isAdmin ? '/admin/complaints' : '/hod/complaints';

  const [complaint, setComplaint] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [readOnlyReason, setReadOnlyReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Status update form state
  const [newStatus, setNewStatus] = useState('');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const loadDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await complaintApi.getManagedComplaintDetail(ticket_no);
      if (res.success) {
        setComplaint(res.complaint);
        setTimeline(res.timeline || []);
        setIsReadOnly(res.is_read_only);
        setReadOnlyReason(res.read_only_reason || '');

        // Set default next forward status if available
        const currentRank = CANONICAL_STAGES.find((s) => s.id === res.complaint.status)?.rank || 1;
        const forwardStages = CANONICAL_STAGES.filter((s) => s.rank > currentRank);
        if (forwardStages.length > 0) {
          setNewStatus(forwardStages[0].id);
        }
      } else {
        setError(res.message || 'Complaint not found.');
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve complaint details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [ticket_no]);

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    if (!remark || remark.trim().length < 5) {
      setActionError('Remark must be at least 5 characters long for institutional audit logging.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await complaintApi.updateComplaintStatus(ticket_no, {
        new_status: newStatus,
        remark: remark.trim(),
      });

      if (res.success) {
        const msg = res.message || 'Status updated successfully.';
        setActionSuccess(msg);
        toast.success(`Complaint advanced to ${newStatus.replace('_', ' ')}`, 'Status Updated');
        setRemark('');
        await loadDetail();
      } else {
        setActionError(res.message || 'Failed to update status.');
        toast.error(res.message || 'Failed to update status.');
      }
    } catch (err) {
      setActionError(err.message || 'Error updating complaint status.');
      toast.error(err.message || 'Error updating complaint status.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Complaint Resolution Portal">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Retrieving complaint record and timeline...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !complaint) {
    return (
      <AppLayout title="Complaint Record">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900 p-8 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">Error Accessing Record</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">{error || 'Ticket not found or unauthorized.'}</p>
          <Link
            to={backQueuePath}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 text-white font-semibold text-xs hover:bg-slate-900 dark:hover:bg-slate-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Queue</span>
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

  // Calculate forward-only allowed statuses
  const currentStageRank =
    CANONICAL_STAGES.find((s) => s.id === complaint.status)?.rank || 1;
  const allowedForwardStages = CANONICAL_STAGES.filter((s) => s.rank > currentStageRank);

  return (
    <AppLayout title={`Manage Ticket ${complaint.ticket_no}`}>
      {/* Top Breadcrumb & Return Action */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(backQueuePath)}
            className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                {complaint.ticket_no}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">• Lodged {complaint.age_in_days} days ago</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">{complaint.title}</h2>
          </div>
        </div>

        <Link
          to={backQueuePath}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
        >
          ← Back to Queue
        </Link>
      </div>

      {/* Main Ticket Overview Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 uppercase tracking-wider">
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
                <span>Escalated (&gt;3d SLA)</span>
              </span>
            )}

            {complaint.is_anonymous === 1 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Anonymous Protected</span>
              </span>
            )}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Assigned Authority:{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {complaint.assigned_role === 'hod'
                ? `HOD (${complaint.department_code || 'Dept'})`
                : 'Central Administration'}
            </strong>
          </div>
        </div>

        {/* Complaint Description Statement */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            Student Grievance Description
          </h4>
          <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50/80 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
            {complaint.description}
          </p>
        </div>

        {/* Submitter & Department Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <span className="block text-slate-400 dark:text-slate-500 font-semibold text-[10px] uppercase">Student Submitter</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {complaint.submitter_name || 'Student'}
            </span>
            {complaint.is_anonymous === 1 && (
              <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">• Identity Masked</span>
            )}
          </div>

          <div>
            <span className="block text-slate-400 dark:text-slate-500 font-semibold text-[10px] uppercase">Department</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {complaint.department_name || 'Central Campus'}
            </span>
          </div>

          <div>
            <span className="block text-slate-400 dark:text-slate-500 font-semibold text-[10px] uppercase">Lodged At</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{complaint.created_at}</span>
          </div>

          <div>
            <span className="block text-slate-400 dark:text-slate-500 font-semibold text-[10px] uppercase">Last Update Event</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{complaint.updated_at || complaint.created_at}</span>
          </div>
        </div>
      </div>

      {/* Grid: Status Transition Panel (Left) + Timeline Stepper (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Update Status Action Panel */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Action & Status Transition</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                Staff Control
              </span>
            </div>

            {/* Read-Only State Banner (if HOD viewing escalated ticket or ticket resolved) */}
            {isReadOnly ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                <div className="flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white">Read-Only Mode Active</h4>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {readOnlyReason || 'This complaint cannot be modified.'}
                    </p>
                  </div>
                </div>

                {isHod && complaint.assigned_role === 'admin' && (
                  <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px]">
                    <strong>Escalation Notice:</strong> Because this grievance was unresolved within 3 days, it has been transferred to Central Administration for immediate intervention.
                  </div>
                )}
              </div>
            ) : allowedForwardStages.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-1.5" />
                <h4 className="font-bold">Case Fully Resolved</h4>
                <p className="text-[11px] opacity-90 mt-0.5">This grievance is marked as completed and closed.</p>
              </div>
            ) : (
              <form onSubmit={handleUpdateStatus} className="space-y-4">
                {actionError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                    <span>{actionError}</span>
                  </div>
                )}

                {actionSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                    <span>{actionSuccess}</span>
                  </div>
                )}

                {/* Status Dropdown (ONLY allowed forward statuses) */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Advance Status To <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition"
                  >
                    {allowedForwardStages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        Advance to: {stage.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Forward transitions only: Submitted → Under Review → In Progress → Resolved.
                  </p>
                </div>

                {/* Remark Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Official Remark & Action Note <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Min 5 chars</span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="Enter inspection findings, vendor dispatches, time adjustments, or resolution summary..."
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Recording Status...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Log & Advance Status</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between mt-4">
            <span>Staff Operator: <strong className="text-slate-700 dark:text-slate-300">{user?.name}</strong></span>
            <span className="uppercase font-bold">{user?.role}</span>
          </div>
        </div>

        {/* Right Column: Milestone Stepper & Chronological Timeline */}
        <div className="lg:col-span-7 space-y-6">
          {/* Milestone Stepper */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight mb-3">Milestone Progression</h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CANONICAL_STAGES.map((stage, idx) => {
                const updateRecord = timeline.find((u) => u.new_status === stage.id);
                const hasHappened = !!updateRecord;
                const isSkipped = !hasHappened && stage.rank < currentStageRank;

                return (
                  <div
                    key={stage.id}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      hasHappened
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-300 shadow-xs'
                        : isSkipped
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-dashed border-amber-300 dark:border-amber-800 text-slate-500 dark:text-slate-400'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-center mb-1">
                      {hasHappened ? (
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </span>
                      ) : isSkipped ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                          Bypassed
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] text-slate-400">
                          {idx + 1}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-bold">{stage.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chronological Audit Trail */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Full Event Timeline</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">{timeline.length} updates logged</span>
            </div>

            <div className="relative pl-6 sm:pl-8 space-y-5 before:content-[''] before:absolute before:left-2.5 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {timeline.map((update, idx) => {
                const isLatest = idx === timeline.length - 1;

                return (
                  <div key={update.id || idx} className="relative group">
                    <div
                      className={`absolute -left-[23px] sm:-left-[25px] top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ring-2 ${
                        isLatest ? 'bg-blue-600 ring-blue-400' : 'bg-slate-400 dark:bg-slate-600 ring-slate-200 dark:ring-slate-700'
                      }`}
                    />

                    <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${getStatusBadge(
                              update.new_status
                            )}`}
                          >
                            {formatStatus(update.new_status)}
                          </span>

                          <span className="text-xs font-bold text-slate-800 dark:text-white">
                            {update.updater_name}
                          </span>

                          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                            • {update.updater_role}
                          </span>
                        </div>

                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                          {update.created_at}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-850 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 italic">
                        "{update.remark}"
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { complaintApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  AlertCircle,
  Search,
  Filter,
  Flame,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  Clock,
  RefreshCw,
  User,
  Inbox
} from 'lucide-react';

const STATUS_FILTERS = [
  { id: 'all', label: 'All In Queue' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'resolved', label: 'Resolved' },
];

export default function ManageComplaints() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const isAdmin = user?.role === 'admin';
  const isHod = user?.role === 'hod';

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [escalatedOnly, setEscalatedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Live Escalation check action
  const [runningEscalation, setRunningEscalation] = useState(false);
  const [escalationToast, setEscalationToast] = useState(null);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const res = await complaintApi.getAssignedComplaints({
        status: statusFilter,
        category: categoryFilter,
        escalated_only: escalatedOnly,
        search: searchQuery,
      });
      if (res.success && res.complaints) {
        setComplaints(res.complaints);
      }
    } catch (err) {
      console.error('Failed to load assigned complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [statusFilter, categoryFilter, escalatedOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadComplaints();
  };

  const handleRunEscalation = async () => {
    setRunningEscalation(true);
    setEscalationToast(null);
    try {
      const res = await complaintApi.runEscalation();
      if (res.success) {
        const msg = res.message || `Escalation check complete: ${res.count} complaints updated.`;
        setEscalationToast({
          type: 'success',
          message: msg,
          count: res.count,
        });
        toast.success(msg, 'SLA Escalation Engine');
        await loadComplaints();
      } else {
        const errMsg = res.message || 'Escalation check encountered an error.';
        setEscalationToast({
          type: 'error',
          message: errMsg,
        });
        toast.error(errMsg, 'Escalation Error');
      }
    } catch (err) {
      const errMsg = err.message || 'Failed to trigger escalation check.';
      setEscalationToast({
        type: 'error',
        message: errMsg,
      });
      toast.error(errMsg, 'Escalation Failed');
    } finally {
      setRunningEscalation(false);
    }
  };

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

  // Calculate summary counts
  const totalCount = complaints.length;
  const pendingCount = complaints.filter((c) => ['submitted', 'under_review'].includes(c.status)).length;
  const inProgressCount = complaints.filter((c) => c.status === 'in_progress').length;
  const resolvedCount = complaints.filter((c) => c.status === 'resolved').length;
  const escalatedCount = complaints.filter((c) => c.escalated === 1).length;

  const detailPathPrefix = isAdmin ? '/admin/complaints' : '/hod/complaints';

  return (
    <AppLayout title={isAdmin ? 'Central Grievance Redressal Center' : `${user?.department_code || 'Dept'} Complaints Queue`}>
      {/* Top Header & Admin Escalation Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {isAdmin ? 'Institutional Grievance Management' : `${user?.department_name || 'Department'} Grievances`}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isAdmin
              ? 'Campus-wide SLA oversight, escalation tracking, and administrative resolution.'
              : 'Review curriculum and instruction concerns submitted by department students.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin-only "Run Escalation Check" trigger */}
          {isAdmin && (
            <button
              onClick={handleRunEscalation}
              disabled={runningEscalation}
              title="Run 3-day SLA escalation check now"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold text-xs shadow-md shadow-amber-500/20 transition disabled:opacity-60"
            >
              {runningEscalation ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking SLAs...</span>
                </>
              ) : (
                <>
                  <Flame className="w-3.5 h-3.5" />
                  <span>Run Escalation Check</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={loadComplaints}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Escalation Live Toast Banner (PRESERVED) */}
      {escalationToast && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between transition-all ${
            escalationToast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {escalationToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            )}
            <div>
              <span className="font-bold">{escalationToast.message}</span>
              {escalationToast.count > 0 && (
                <span className="block text-[11px] opacity-90 mt-0.5">
                  Overdue tickets were flagged or reassigned to Central Administration.
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setEscalationToast(null)}
            className="text-xs font-bold px-2 py-1 hover:opacity-75"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Assigned</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{totalCount}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Tickets in queue</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Pending Review</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{pendingCount}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Submitted or under review</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">In Progress</span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{inProgressCount}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Action underway</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Resolved</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{resolvedCount}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Completed & closed</p>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Escalated</span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{escalatedCount}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Overdue (&gt; 3 days)</p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {STATUS_FILTERS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition capitalize ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket no (CMP-0001), keyword, or student name..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition"
            />
          </form>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition"
            >
              <option value="all">All Categories</option>
              <option value="academic">Academic</option>
              <option value="faculty">Faculty</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="hostel">Hostel</option>
              <option value="canteen">Canteen</option>
              <option value="library">Library</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Escalated Only Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 select-none hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <input
              type="checkbox"
              checked={escalatedOnly}
              onChange={(e) => setEscalatedOnly(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
            />
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Escalated Only</span>
            </span>
          </label>
        </div>
      </div>

      {/* Complaints Table */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading complaints queue...</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Inbox className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">No Complaints Match</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            No grievances match the selected filters or assigned queue.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Subject & Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Age</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {complaints.map((item) => {
                  const isEscalatedToAdminForHod = isHod && item.is_escalated_to_admin;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`${detailPathPrefix}/${item.ticket_no}`)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-850 transition-colors cursor-pointer group"
                    >
                      {/* Ticket No */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-600 group-hover:text-white transition">
                          {item.ticket_no}
                        </span>
                      </td>

                      {/* Title & Preview */}
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
                          {item.title}
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{item.description}</p>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                          {item.category}
                        </span>
                      </td>

                      {/* Student (Masked if anonymous) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.is_anonymous === 1 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold">
                            <Shield className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Anonymous</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">{item.submitter_name}</span>
                          </div>
                        )}
                      </td>

                      {/* Status & Escalation Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getStatusBadge(
                              item.status
                            )}`}
                          >
                            {formatStatus(item.status)}
                          </span>

                          {/* Escalated badge */}
                          {isEscalatedToAdminForHod ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-700 dark:text-amber-400" />
                              <span>Escalated to Admin</span>
                            </span>
                          ) : item.escalated === 1 ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />
                              <span>Escalated (&gt;3d)</span>
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Age in Days */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                        {item.age_in_days === 0 ? 'Today' : `${item.age_in_days}d ago`}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition">
                          <span>{isEscalatedToAdminForHod ? 'View Only' : 'Manage'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

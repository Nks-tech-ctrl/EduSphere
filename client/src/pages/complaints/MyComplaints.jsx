import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { complaintApi } from '../../services/api';
import {
  AlertCircle,
  PlusCircle,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  Inbox
} from 'lucide-react';

const STATUS_FILTERS = [
  { id: 'all', label: 'All Complaints' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'resolved', label: 'Resolved' },
];

export default function MyComplaints() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const res = await complaintApi.getMyComplaints({
        status: statusFilter,
        category: categoryFilter,
      });
      if (res.success && res.complaints) {
        setComplaints(res.complaints);
      }
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [statusFilter, categoryFilter]);

  // Client-side search query filtering
  const filteredComplaints = complaints.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.ticket_no?.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q)
    );
  });

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

  // Calculate summary stats
  const totalCount = complaints.length;
  const activeCount = complaints.filter((c) => ['submitted', 'under_review', 'in_progress'].includes(c.status)).length;
  const resolvedCount = complaints.filter((c) => c.status === 'resolved').length;
  const anonCount = complaints.filter((c) => c.is_anonymous === 1).length;

  return (
    <AppLayout title="My Grievance Redressal Registry">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Registered Complaints & Grievances</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitor resolution progress, audit remarks, and administrative actions in real-time.
          </p>
        </div>

        <Link
          to="/student/complaints/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition flex-shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Complaint</span>
        </Link>
      </div>

      {/* Metric Stat Strips */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Logged</span>
          <div className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{totalCount}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Student Grievances</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Active / Underway</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{activeCount}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Awaiting or in progress</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Resolved Cases</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{resolvedCount}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Completed & Closed</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Anonymous Protected</span>
          <div className="text-2xl font-black text-slate-700 dark:text-slate-200 mt-0.5">{anonCount}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Identity masked from staff</p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
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

        <div className="flex flex-col sm:flex-row gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          {/* Search bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket (e.g. CMP-0001) or title..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
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
        </div>
      </div>

      {/* Complaints List / Cards */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading complaints registry...</p>
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Inbox className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">No Complaints Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'No grievances match your current search and filter criteria.'
              : 'You have not submitted any complaints yet. Use the button below to lodge a new concern.'}
          </p>
          <Link
            to="/student/complaints/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-xs hover:bg-blue-700 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Lodge a Complaint</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredComplaints.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/student/complaints/${item.ticket_no}`)}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Left Meta: Ticket, Category, Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-black px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 group-hover:bg-blue-600 group-hover:text-white transition">
                    {item.ticket_no}
                  </span>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase tracking-wider">
                    {item.category}
                  </span>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getStatusBadge(
                      item.status
                    )}`}
                  >
                    {formatStatus(item.status)}
                  </span>

                  {item.escalated === 1 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                      <span>Escalated</span>
                    </span>
                  )}

                  {item.is_anonymous === 1 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Anonymous</span>
                    </span>
                  )}
                </div>

                {/* Right Meta: Date & Assigned Target */}
                <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{item.created_at ? item.created_at.split(' ')[0] : 'Recent'}</span>
                  <span>•</span>
                  <span>Routed: <strong className="text-slate-800 dark:text-slate-200">{item.assigned_role === 'hod' ? `HOD (${item.department_code || 'Dept'})` : 'Admin'}</strong></span>
                </div>
              </div>

              {/* Title & Description preview */}
              <div className="mt-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Footer action */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {item.timeline_count || 1} update event(s) logged
                </span>

                <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-0.5 transition">
                  <span>Track Full Timeline</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

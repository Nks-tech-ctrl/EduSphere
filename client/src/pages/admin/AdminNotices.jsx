import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { noticesApi, departmentsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonCard } from '../../components/common/Skeleton';
import {
  Bell,
  Send,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Building2,
  Users,
  Megaphone
} from 'lucide-react';

export default function AdminNotices() {
  const toast = useToast();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [noticeToDelete, setNoticeToDelete] = useState(null);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState('all');
  const [departmentId, setDepartmentId] = useState('all'); // 'all' means null (institution-wide)

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    departmentsApi.getAll().then((res) => {
      if (res.success && res.departments) {
        setDepartments(res.departments);
      }
    }).catch(console.error);
  }, []);

  const fetchNotices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await noticesApi.getAll();
      if (res.success) {
        setNotices(res.notices || []);
      } else {
        setError(res.message || 'Failed to fetch notices.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error fetching notices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handlePostNotice = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await noticesApi.create({
        title: title.trim(),
        content: content.trim(),
        target_role: targetRole,
        department_id: departmentId === 'all' ? null : Number(departmentId)
      });

      if (res.success) {
        setToastMessage('✓ Announcement successfully broadcasted!');
        toast.success('Announcement broadcasted institution-wide.', 'Notice Published');
        setTitle('');
        setContent('');
        setTimeout(() => setToastMessage(null), 4000);
        fetchNotices();
      } else {
        setError(res.message || 'Failed to publish notice.');
        toast.error(res.message || 'Failed to publish notice.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error publishing notice.');
      toast.error(err.message || 'Error publishing notice.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteNotice = async () => {
    if (!noticeToDelete) return;
    setDeletingId(noticeToDelete.id);

    try {
      const res = await noticesApi.delete(noticeToDelete.id);
      if (res.success) {
        setToastMessage('Notice removed.');
        toast.success(`Notice "${noticeToDelete.title}" removed.`, 'Notice Deleted');
        setTimeout(() => setToastMessage(null), 3000);
        setNotices((prev) => prev.filter((n) => n.id !== noticeToDelete.id));
        setNoticeToDelete(null);
      } else {
        toast.error(res.message || 'Failed to delete notice.');
      }
    } catch (err) {
      toast.error(err.message || 'Error deleting notice.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredNotices = notices.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.author_name && n.author_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = filterRole === 'all' || n.target_role === filterRole;

    return matchesSearch && matchesRole;
  });

  return (
    <AppLayout title="Institution Broadcasts & Notices">
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(noticeToDelete)}
        onClose={() => setNoticeToDelete(null)}
        onConfirm={confirmDeleteNotice}
        loading={Boolean(deletingId)}
        danger={true}
        title="Delete Institutional Notice?"
        message={`Are you sure you want to remove "${noticeToDelete?.title}"? This announcement will be removed immediately for all targeted roles.`}
        confirmText="Delete Notice"
        cancelText="Keep Notice"
      />

      <div className="space-y-6">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-bounce text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            {toastMessage}
          </div>
        )}

        {/* Hero */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider">
                System Administration
              </span>
              <span className="text-blue-200 text-xs">• Institutional Broadcast Console</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Broadcast Announcements & Notice Governance</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Publish official college-wide circulars, manage departmental bulletins, and oversee all announcements across departments.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl p-4 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Two-Column Grid: Form + All Notices */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Post Form */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs h-fit transition-colors">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Megaphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Broadcast Announcement</h3>
            </div>

            <form onSubmit={handlePostNotice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Target Audience Role
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100"
                >
                  <option value="all">Everyone (All Roles)</option>
                  <option value="student">Students Only</option>
                  <option value="faculty">Faculty Members Only</option>
                  <option value="hod">Heads of Department Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Department Scope
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100"
                >
                  <option value="all">Campus Wide (All Departments)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Announcement Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Annual Tech Fest Innovasia Registrations Open"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Notice Content
                </label>
                <textarea
                  rows={4}
                  placeholder="Detailed announcement text, event schedule, link, or circular details..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
              >
                {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Publish Broadcast
              </button>
            </form>
          </div>

          {/* Manage All Notices List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">All Institutional Notices</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Unfiltered administrative oversight of all active bulletins</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter notices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-blue-600 w-40"
                />

                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Targets</option>
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="hod">HOD</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                <SkeletonCard rows={3} />
                <SkeletonCard rows={3} />
              </div>
            ) : filteredNotices.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No Announcements Found"
                description="No active announcements match the current search or audience filter."
              />
            ) : (
              <div className="space-y-3">
                {filteredNotices.map((notice) => (
                  <div
                    key={notice.id}
                    className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                  >
                    <div className="space-y-1.5 grow">
                      <div className="flex flex-wrap items-center gap-2">
                        {notice.department_code ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase">
                            {notice.department_code} Dept
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                            Campus Wide
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                          Target: {notice.target_role}
                        </span>

                        <span className="text-[11px] text-slate-400 dark:text-slate-500">• {notice.created_at}</span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{notice.title}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">{notice.content}</p>

                      <div className="pt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="text-slate-400 dark:text-slate-500">Author:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{notice.author_name}</span>
                        <span className="text-slate-400 dark:text-slate-500 capitalize">({notice.author_role})</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setNoticeToDelete(notice)}
                      className="self-end sm:self-auto p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-900"
                      title="Delete Notice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

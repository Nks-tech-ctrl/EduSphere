import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { noticesApi, attendanceApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
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
  BookOpen,
  Calendar,
  Building2
} from 'lucide-react';

export default function FacultyNotices() {
  const { user } = useAuth();
  const toast = useToast();
  const [notices, setNotices] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [noticeToDelete, setNoticeToDelete] = useState(null);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  // Fetch faculty courses to extract allowed departments
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [cRes, nRes] = await Promise.all([
          attendanceApi.getCourses(),
          noticesApi.getAll()
        ]);

        if (cRes.success && cRes.courses?.length > 0) {
          setCourses(cRes.courses);
          // Default department to first course's department
          setDepartmentId(String(cRes.courses[0].department_id));
        }

        if (nRes.success) {
          // Filter to own notices
          const myNotices = (nRes.notices || []).filter((n) => n.author_id === user?.id);
          setNotices(myNotices);
        }
      } catch (err) {
        console.error('Error loading notices:', err);
        setError('Failed to load notices and department configurations.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user?.id]);

  // Extract unique departments where faculty teaches
  const allowedDepts = [];
  const deptMap = new Map();
  courses.forEach((c) => {
    if (c.department_id && !deptMap.has(c.department_id)) {
      deptMap.set(c.department_id, true);
      allowedDepts.push({ id: c.department_id, code: c.department_code, name: c.department_name });
    }
  });

  const reloadNotices = async () => {
    try {
      const res = await noticesApi.getAll();
      if (res.success) {
        setNotices((res.notices || []).filter((n) => n.author_id === user?.id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostNotice = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !departmentId) {
      setError('Please fill in all notice fields.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await noticesApi.create({
        title: title.trim(),
        content: content.trim(),
        target_role: 'student', // Faculty only targets students
        department_id: Number(departmentId)
      });

      if (res.success) {
        setToastMessage('✓ Announcement successfully broadcasted to department students!');
        toast.success('Announcement broadcasted to department students.', 'Notice Published');
        setTitle('');
        setContent('');
        setTimeout(() => setToastMessage(null), 4000);
        reloadNotices();
      } else {
        setError(res.message || 'Failed to post announcement.');
        toast.error(res.message || 'Failed to post announcement.');
      }
    } catch (err) {
      console.error('Error creating notice:', err);
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
        toast.success(`Announcement "${noticeToDelete.title}" removed.`, 'Notice Deleted');
        setTimeout(() => setToastMessage(null), 3000);
        setNotices((prev) => prev.filter((n) => n.id !== noticeToDelete.id));
        setNoticeToDelete(null);
      } else {
        toast.error(res.message || 'Failed to delete notice.');
      }
    } catch (err) {
      console.error('Error deleting notice:', err);
      toast.error(err.message || 'Failed to delete notice.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppLayout title="Class Announcements & Notices">
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(noticeToDelete)}
        onClose={() => setNoticeToDelete(null)}
        onConfirm={confirmDeleteNotice}
        loading={Boolean(deletingId)}
        danger={true}
        title="Delete Announcement?"
        message={`Are you sure you want to delete "${noticeToDelete?.title}"? Students in this department will no longer see this announcement.`}
        confirmText="Delete Notice"
        cancelText="Cancel"
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
                Faculty Workspace
              </span>
              <span className="text-blue-200 text-xs">• Class Announcements</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Post Course Notices</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Publish assignment deadlines, lab instructions, and syllabus announcements directly to students enrolled in your teaching departments.
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

        {/* Two-Column Layout: Create Notice Form + Authored Notices */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Post Form */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs h-fit transition-colors">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create New Announcement</h3>
            </div>

            <form onSubmit={handlePostNotice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Target Department
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100"
                >
                  {allowedDepts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Faculty may only broadcast notices to departments where they teach courses.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Audience Scope
                </label>
                <input
                  type="text"
                  disabled
                  value="Enrolled Students (Class Roster)"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Notice Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lab Assignment 3 Deadline Extension"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Announcement Details
                </label>
                <textarea
                  rows={4}
                  placeholder="Write notice content, guidelines, submission links, or exam details..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Publish Announcement
              </button>
            </form>
          </div>

          {/* List of Authored Notices */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Your Active Announcements</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Notices published by you that are currently active in the portal</p>
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{notices.length} Notice(s)</span>
            </div>

            {loading ? (
              <div className="space-y-3">
                <SkeletonCard rows={3} />
                <SkeletonCard rows={3} />
              </div>
            ) : notices.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No Announcements Yet"
                description="You have not published any course notices yet. Use the form on the left to broadcast an announcement."
              />
            ) : (
              <div className="space-y-3">
                {notices.map((notice) => (
                  <div
                    key={notice.id}
                    className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                  >
                    <div className="space-y-1.5 grow">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                          {notice.department_code || 'All'} Department
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">• {notice.created_at}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{notice.title}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">{notice.content}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setNoticeToDelete(notice)}
                      className="self-end sm:self-auto p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-900"
                      title="Delete Announcement"
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

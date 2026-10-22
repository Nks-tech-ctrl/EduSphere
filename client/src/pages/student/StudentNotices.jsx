import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { noticesApi, departmentsApi } from '../../services/api';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonCard } from '../../components/common/Skeleton';
import {
  Bell,
  Search,
  Building2,
  Calendar,
  User,
  RefreshCw,
  XCircle,
  Tag
} from 'lucide-react';

export default function StudentNotices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [departments, setDepartments] = useState([]);

  const fetchNotices = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, deptRes] = await Promise.all([
        noticesApi.getAll(),
        departmentsApi.getAll()
      ]);
      if (res.success) {
        setNotices(res.notices || []);
      } else {
        setError(res.message || 'Failed to fetch campus notices.');
      }
      if (deptRes.success && deptRes.departments) {
        setDepartments(deptRes.departments);
      }
    } catch (err) {
      console.error('Error fetching notices:', err);
      setError(err.message || 'Unable to connect to notices service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const filteredNotices = notices.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.author_name && n.author_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesScope =
      scopeFilter === 'all'
        ? true
        : scopeFilter === 'campus'
        ? !n.department_code
        : n.department_code === scopeFilter;

    return matchesSearch && matchesScope;
  });

  return (
    <AppLayout title="Campus Notices & Circulars">
      <div className="space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider">
                Official Announcements
              </span>
              <span className="text-blue-200 text-xs">• Notice Bulletin</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Institutional Bulletins & Class Updates</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Stay informed with verified administrative circulars, department events, academic deadlines, and course notices published by your professors and college administration.
            </p>
          </div>

          <button
            onClick={fetchNotices}
            disabled={loading}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
          <div className="relative grow sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search announcements, titles, or authors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">Filter:</span>
            <div className="flex gap-1.5 shrink-0">
              {[
                { id: 'all', label: 'All Notices' },
                { id: 'campus', label: 'College Wide' },
                ...departments.map((d) => ({ id: d.code, label: `${d.code} Dept` }))
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setScopeFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    scopeFilter === tab.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            <SkeletonCard rows={3} />
            <SkeletonCard rows={3} />
            <SkeletonCard rows={3} />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl p-6 text-center">
            <XCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">Failed to Load Notices</h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{error}</p>
            <button
              onClick={fetchNotices}
              className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {/* Notice Cards List */}
        {!loading && !error && (
          <>
            {filteredNotices.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No Announcements Found"
                description="There are no bulletins currently matching your search query or filter."
              />
            ) : (
              <div className="space-y-4">
                {filteredNotices.map((notice) => (
                  <div
                    key={notice.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col md:flex-row md:items-start justify-between gap-4"
                  >
                    <div className="space-y-2 grow">
                      <div className="flex flex-wrap items-center gap-2">
                        {notice.department_code ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase">
                            {notice.department_code} Department
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                            Campus Wide
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                          Target: {notice.target_role}
                        </span>

                        <span className="text-[11px] text-slate-400 dark:text-slate-500">• {notice.created_at}</span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">{notice.title}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{notice.content}</p>

                      <div className="pt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200">
                          {notice.author_name?.charAt(0) || 'A'}
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{notice.author_name}</span>
                        <span className="text-slate-400 dark:text-slate-500 capitalize">({notice.author_role})</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

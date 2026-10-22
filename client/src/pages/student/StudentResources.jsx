import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { resourcesApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import EmptyState from '../../components/common/EmptyState';
import {
  BookOpen,
  Download,
  ExternalLink,
  FileText,
  Presentation,
  FileQuestion,
  Link2,
  FolderArchive,
  Search,
  Filter,
  CheckCircle2,
  User,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

export default function StudentResources() {
  const toast = useToast();
  const [resources, setResources] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Downloading State tracker
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    fetchStudentResources();
  }, [selectedCourse, selectedCategory]);

  async function fetchStudentResources() {
    try {
      setLoading(true);
      const params = {};
      if (selectedCourse !== 'all') params.course_id = selectedCourse;
      if (selectedCategory !== 'all') params.category = selectedCategory;

      const res = await resourcesApi.getMine(params);
      if (res.success) {
        setResources(res.resources || []);
        if (res.enrolledCourses) {
          setEnrolledCourses(res.enrolledCourses);
        }
      }
    } catch (err) {
      console.error('Failed to load student study resources:', err);
      toast.error(err.message || 'Failed to load study resources.');
    } finally {
      setLoading(false);
    }
  }

  // Format bytes to KB / MB
  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Format relative date
  function formatRelativeDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);
    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    const diffDays = Math.floor(diffSeconds / 86400);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Categories configuration
  const categoryConfig = {
    notes: {
      label: 'Lecture Notes',
      icon: FileText,
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    },
    slides: {
      label: 'Slides',
      icon: Presentation,
      badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    },
    previous_paper: {
      label: 'Previous Papers',
      icon: FileQuestion,
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    },
    reference: {
      label: 'Reference Material',
      icon: Link2,
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    },
    other: {
      label: 'Other Resources',
      icon: FolderArchive,
      badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    },
  };

  // Client-side text search
  const filteredResources = useMemo(() => {
    if (!searchQuery.trim()) return resources;
    const term = searchQuery.toLowerCase();
    return resources.filter((item) => {
      return (
        item.title.toLowerCase().includes(term) ||
        (item.description && item.description.toLowerCase().includes(term)) ||
        item.course_code.toLowerCase().includes(term) ||
        item.course_name.toLowerCase().includes(term)
      );
    });
  }, [resources, searchQuery]);

  // Handle Authenticated Download (Requirement: token blob download, triggers save, increments download count)
  async function handleDownload(resource) {
    try {
      setDownloadingId(resource.id);
      await resourcesApi.downloadResource(resource.id, resource.file_name);
      toast.success(`Downloaded: ${resource.file_name}`);
      // Increment local count immediately for optimistic UI
      setResources((prev) =>
        prev.map((r) =>
          r.id === resource.id ? { ...r, download_count: (r.download_count || 0) + 1 } : r
        )
      );
    } catch (err) {
      console.error('Download error:', err);
      toast.error(err.message || 'Failed to download resource.');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <AppLayout title="Course Study Resources">
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider">
                Student Repository
              </span>
              <span className="text-blue-200 text-xs">• Verified Academic Materials</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              Study Resources & Course Material
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Access official course lecture notes, presentation slides, solved past papers, and interactive reference labs published by your professors.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-xs text-blue-100">
            <BookOpen className="w-4 h-4 text-blue-200" />
            <span>Enrolled in {enrolledCourses.length} Courses</span>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, topic or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Course Filter */}
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Enrolled Courses</option>
              {enrolledCourses.map((c) => (
                <option key={c.id} value={c.id.toString()}>
                  {c.code}: {c.name}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Categories</option>
              <option value="notes">Lecture Notes</option>
              <option value="slides">Slides</option>
              <option value="previous_paper">Previous Papers</option>
              <option value="reference">Reference Link</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Category Pills Strip */}
        <div className="flex flex-wrap items-center gap-1.5 pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            All Resources ({resources.length})
          </button>
          {Object.entries(categoryConfig).map(([k, cfg]) => {
            const Icon = cfg.icon;
            const isSelected = selectedCategory === k;
            return (
              <button
                key={k}
                onClick={() => setSelectedCategory(k)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Resources Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-44 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredResources.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={resources.length === 0 ? 'No study resources published yet' : 'No matching resources'}
            description={
              resources.length === 0
                ? 'Your instructors have not published study resources for these courses yet. Check back soon.'
                : 'No resources match your search or filter criteria. Try clearing filters.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((res) => {
              const cfg = categoryConfig[res.category] || categoryConfig.other;
              const IconComp = cfg.icon;
              const isExternal = Boolean(res.external_url);

              return (
                <div
                  key={res.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Course Code and Category Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                          {res.course_code}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${cfg.badge}`}>
                          <IconComp className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                        {formatRelativeDate(res.created_at)}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                      {res.title}
                    </h4>

                    {/* Description */}
                    {res.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-3 leading-relaxed">
                        {res.description}
                      </p>
                    )}

                    {/* Faculty Uploader */}
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{res.uploaded_by_name || 'Course Faculty'}</span>
                    </div>
                  </div>

                  {/* Footer & Action */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      {isExternal ? (
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                          <Link2 className="w-3.5 h-3.5" /> Web Link
                        </span>
                      ) : (
                        <span className="font-mono text-[11px]">
                          {formatBytes(res.file_size)}
                        </span>
                      )}
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                        <Download className="w-3 h-3 text-slate-400" />
                        {res.download_count || 0}
                      </span>
                    </div>

                    <div>
                      {isExternal ? (
                        <a
                          href={res.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-xs active:scale-95"
                        >
                          <span>Open Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <button
                          onClick={() => handleDownload(res)}
                          disabled={downloadingId === res.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{downloadingId === res.id ? 'Downloading...' : 'Download'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { resourcesApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import EmptyState from '../../components/common/EmptyState';
import {
  BookOpen,
  Plus,
  Download,
  ExternalLink,
  Trash2,
  FileText,
  Presentation,
  FileQuestion,
  Link2,
  FolderArchive,
  Search,
  Filter,
  X,
  Upload,
  Clock,
  Eye,
  CheckCircle2,
  Layers,
  Sparkles
} from 'lucide-react';

export default function FacultyResources() {
  const toast = useToast();
  const [resources, setResources] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Upload Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'link'
  const [formData, setFormData] = useState({
    course_id: '',
    title: '',
    description: '',
    category: 'notes',
    external_url: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);

  // Delete Confirm State
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Downloading State tracker
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    fetchResources();
  }, []);

  async function fetchResources() {
    try {
      setLoading(true);
      const res = await resourcesApi.getFacultyResources();
      if (res.success) {
        setResources(res.resources || []);
        setCourses(res.courses || []);
        if (res.courses && res.courses.length > 0 && !formData.course_id) {
          setFormData((prev) => ({ ...prev, course_id: res.courses[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load faculty resources:', err);
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

  // Category Configuration
  const categoryConfig = {
    notes: {
      label: 'Lecture Notes',
      icon: FileText,
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    },
    slides: {
      label: 'Presentation Slides',
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

  // Filtered resources
  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.course_code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCourse =
        selectedCourseFilter === 'all' || item.course_id.toString() === selectedCourseFilter;

      const matchesCategory =
        selectedCategoryFilter === 'all' || item.category === selectedCategoryFilter;

      return matchesSearch && matchesCourse && matchesCategory;
    });
  }, [resources, searchQuery, selectedCourseFilter, selectedCategoryFilter]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = resources.length;
    const totalDownloads = resources.reduce((acc, r) => acc + (r.download_count || 0), 0);
    const activeCourses = new Set(resources.map((r) => r.course_id)).size;
    return { total, totalDownloads, activeCourses };
  }, [resources]);

  // Handle Form Submission
  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Resource title is required.');
      return;
    }

    if (uploadMode === 'file' && !selectedFile) {
      toast.error('Please choose a file to upload.');
      return;
    }

    if (uploadMode === 'link') {
      const url = formData.external_url.trim();
      if (!url) {
        toast.error('Please enter an external URL.');
        return;
      }
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        toast.error('External URL must start with http:// or https://');
        return;
      }
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('course_id', formData.course_id);
      data.append('title', formData.title.trim());
      data.append('description', formData.description.trim());
      data.append('category', formData.category);

      if (uploadMode === 'file' && selectedFile) {
        data.append('file', selectedFile);
      } else if (uploadMode === 'link') {
        data.append('external_url', formData.external_url.trim());
      }

      const res = await resourcesApi.create(data);
      if (res.success) {
        toast.success('Study resource published successfully!');
        setIsModalOpen(false);
        // Reset form
        setFormData({
          course_id: courses[0]?.id || '',
          title: '',
          description: '',
          category: 'notes',
          external_url: '',
        });
        setSelectedFile(null);
        fetchResources();
      }
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error(err.message || 'Failed to upload study resource.');
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Authenticated Download (reuse token blob mechanism)
  async function handleDownload(resource) {
    try {
      setDownloadingId(resource.id);
      await resourcesApi.downloadResource(resource.id, resource.file_name);
      toast.success(`Downloaded: ${resource.file_name}`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error(err.message || 'Failed to download resource file.');
    } finally {
      setDownloadingId(null);
    }
  }

  // Handle Delete Confirmation
  async function handleConfirmDelete() {
    if (!deletingId) return;
    try {
      setIsDeleting(true);
      const res = await resourcesApi.deleteResource(deletingId);
      if (res.success) {
        toast.success('Resource deleted successfully.');
        setResources((prev) => prev.filter((r) => r.id !== deletingId));
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.message || 'Failed to delete resource.');
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  }

  return (
    <AppLayout title="Study Resources Management">
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider">
                Faculty Workspace
              </span>
              <span className="text-blue-200 text-xs">• Course Study Materials</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              Course Study Resources
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Distribute lecture notes, presentation slides, solved past papers, and interactive reference links directly to your enrolled students.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            disabled={courses.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-xl shadow-md transition-all shrink-0 active:scale-95 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Upload New Resource
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Materials</p>
              <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">{stats.total}</h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student Downloads</p>
              <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">{stats.totalDownloads}</h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned Courses</p>
              <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">{courses.length}</h3>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, description or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Course Filter */}
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id.toString()}>
                  {c.code}: {c.name}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
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

        {/* Resources Content List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredResources.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={resources.length === 0 ? 'No study resources yet' : 'No matching resources'}
            description={
              resources.length === 0
                ? 'You have not uploaded any study materials yet. Click "Upload New Resource" to publish notes or links for your courses.'
                : 'No resources match your current filter criteria. Try adjusting the search or filters.'
            }
            actionText={resources.length === 0 && courses.length > 0 ? 'Upload First Resource' : undefined}
            onAction={() => setIsModalOpen(true)}
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
                    {/* Top Badges */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                          {res.course_code}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${cfg.badge}`}>
                          <IconComp className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </div>

                      <button
                        onClick={() => setDeletingId(res.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        title="Delete Resource"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Title & Description */}
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                      {res.title}
                    </h4>

                    {res.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                        {res.description}
                      </p>
                    )}
                  </div>

                  {/* Metadata and Actions */}
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
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300" title="Student downloads">
                        <Download className="w-3 h-3 text-slate-400" />
                        {res.download_count}
                      </span>
                    </div>

                    <div>
                      {isExternal ? (
                        <a
                          href={res.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-bold transition-all"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <button
                          onClick={() => handleDownload(res)}
                          disabled={downloadingId === res.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/60 dark:hover:text-blue-300 font-bold transition-all disabled:opacity-50"
                        >
                          <Download className="w-3 h-3" />
                          <span>{downloadingId === res.id ? 'Saving...' : 'Download'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload Resource Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
              onClick={() => !submitting && setIsModalOpen(false)}
            />

            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left shadow-2xl transition-all w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        Upload Study Resource
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Share materials with your assigned course students
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  {/* Course Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Assigned Course <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.course_id}
                      onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code}: {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Resource Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lecture Notes: Balanced Search Trees & Invariants"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      maxLength={200}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Category Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Category <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(categoryConfig).map(([catKey, catVal]) => {
                        const isSelected = formData.category === catKey;
                        return (
                          <button
                            key={catKey}
                            type="button"
                            onClick={() => setFormData({ ...formData, category: catKey })}
                            className={`p-2 rounded-xl text-xs font-bold border text-left flex items-center gap-1.5 transition-all ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-700 dark:text-blue-300'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <catVal.icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{catVal.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mode Toggle: File vs Web Link */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Resource Type <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setUploadMode('file')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          uploadMode === 'file'
                            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload File (Max 20MB)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMode('link')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          uploadMode === 'link'
                            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>External Web Link</span>
                      </button>
                    </div>
                  </div>

                  {/* File Upload Dropzone */}
                  {uploadMode === 'file' && (
                    <div>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-xl hover:border-blue-500 transition-colors bg-slate-50/50 dark:bg-slate-800/40">
                        <div className="space-y-1 text-center">
                          <Upload className="mx-auto h-8 w-8 text-slate-400" />
                          <div className="flex text-xs text-slate-600 dark:text-slate-400 justify-center">
                            <label className="relative cursor-pointer rounded-md font-bold text-blue-600 dark:text-blue-400 hover:underline">
                              <span>Select a file</span>
                              <input
                                type="file"
                                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip,.png,.jpg"
                                className="sr-only"
                              />
                            </label>
                            <p className="pl-1">or drag & drop</p>
                          </div>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            PDF, DOC, PPT, TXT, ZIP, PNG, JPG (up to 20MB)
                          </p>
                          {selectedFile && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300 font-mono">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span className="truncate max-w-xs">{selectedFile.name}</span>
                              <span>({formatBytes(selectedFile.size)})</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* External Link Input */}
                  {uploadMode === 'link' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        URL (must begin with http:// or https://) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="url"
                        placeholder="https://example.com/reference-lab"
                        value={formData.external_url}
                        onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                        required={uploadMode === 'link'}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Description & Instructions (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Add brief guidance on key concepts or relevant exam questions..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      disabled={submitting}
                      className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      {submitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Publishing...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Publish Resource</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={Boolean(deletingId)}
          onClose={() => setDeletingId(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Study Resource"
          message="Are you sure you want to permanently delete this study material? The physical file will be removed and students will no longer be able to access it."
          confirmText="Delete Resource"
          danger={true}
          loading={isDeleting}
        />
      </div>
    </AppLayout>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { assignmentsApi, attendanceApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import {
  FileText,
  PlusCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Trash2,
  Users,
  Award,
  AlertCircle,
  FileCheck,
  ChevronRight,
  X,
  Upload,
  RefreshCw,
  Search,
  BookOpen,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Filter,
  Info,
  Sparkles,
  MessageSquare,
  Flag,
  Eye
} from 'lucide-react';

export default function FacultyAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create Assignment Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createForm, setCreateForm] = useState({
    course_id: '',
    title: '',
    description: '',
    due_date: '',
    max_score: 100,
    attachment: null
  });

  // Submissions Drawer/Modal
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState(null);

  // Phase 8: Integrity & AI-likelihood
  const [integrityData, setIntegrityData] = useState(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [integrityRunning, setIntegrityRunning] = useState(false);
  const [filterRiskOnly, setFilterRiskOnly] = useState(false);
  const [inspectingSubmission, setInspectingSubmission] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('cleared');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [showAiInfoModal, setShowAiInfoModal] = useState(false);

  // Grade Modal
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [gradeSubmitting, setGradeSubmitting] = useState(false);
  const [gradeError, setGradeError] = useState(null);

  // Delete Assignment Confirm
  const [deletingAssignment, setDeletingAssignment] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const toast = useToast();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignRes, coursesRes] = await Promise.all([
        assignmentsApi.getFacultyAssignments(),
        attendanceApi.getCourses()
      ]);

      if (assignRes.success) {
        setAssignments(assignRes.assignments || []);
      }
      if (coursesRes.success) {
        setCourses(coursesRes.courses || []);
        if (coursesRes.courses?.length > 0 && !createForm.course_id) {
          setCreateForm((prev) => ({ ...prev, course_id: String(coursesRes.courses[0].id) }));
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);

    try {
      const formData = new FormData();
      formData.append('course_id', createForm.course_id);
      formData.append('title', createForm.title);
      formData.append('description', createForm.description);
      formData.append('due_date', createForm.due_date);
      formData.append('max_score', createForm.max_score);
      if (createForm.attachment) {
        formData.append('attachment', createForm.attachment);
      }

      const res = await assignmentsApi.createAssignment(formData);
      if (res.success) {
        toast.success(res.message || 'Assignment created successfully.', 'Assignment Published');
        setIsCreateOpen(false);
        setCreateForm({
          course_id: courses[0]?.id ? String(courses[0].id) : '',
          title: '',
          description: '',
          due_date: '',
          max_score: 100,
          attachment: null
        });
        fetchData();
      } else {
        setCreateError(res.message || 'Failed to create assignment.');
        toast.error(res.message || 'Failed to create assignment.');
      }
    } catch (err) {
      console.error(err);
      setCreateError(err.message || 'Error creating assignment.');
      toast.error(err.message || 'Error creating assignment.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const fetchIntegrity = async (assignmentId) => {
    setIntegrityLoading(true);
    try {
      const res = await assignmentsApi.getIntegrityResults(assignmentId);
      if (res && res.success) {
        setIntegrityData(res);
      }
    } catch (err) {
      console.error('Error fetching integrity data:', err);
    } finally {
      setIntegrityLoading(false);
    }
  };

  const openSubmissions = async (assignment) => {
    setSelectedAssignment(assignment);
    setSubmissionsLoading(true);
    setSubmissionsError(null);
    setFilterRiskOnly(false);
    setInspectingSubmission(null);
    setIntegrityData(null);

    try {
      const [res, integRes] = await Promise.all([
        assignmentsApi.getAssignmentSubmissions(assignment.id),
        assignmentsApi.getIntegrityResults(assignment.id).catch(() => null)
      ]);

      if (res.success) {
        setSubmissions(res.submissions || []);
      } else {
        setSubmissionsError(res.message || 'Failed to load submissions.');
      }

      if (integRes && integRes.success) {
        setIntegrityData(integRes);
      }
    } catch (err) {
      console.error(err);
      setSubmissionsError(err.message || 'Error loading submissions.');
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleRunIntegrity = async () => {
    if (!selectedAssignment) return;
    setIntegrityRunning(true);
    try {
      const res = await assignmentsApi.runIntegrityCheck(selectedAssignment.id);
      if (res.success) {
        toast.success(
          res.message || `Integrity check completed: ${res.pairs_compared} submission pairs compared.`,
          'Integrity Check Complete'
        );
        await fetchIntegrity(selectedAssignment.id);
      } else {
        toast.error(res.message || 'Failed to run integrity check.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error running integrity check.');
    } finally {
      setIntegrityRunning(false);
    }
  };

  const handleOpenInspect = (studentId) => {
    const integ = integrityData?.results?.find((r) => r.student_id === studentId);
    if (!integ) return;
    setInspectingSubmission(integ);
    setReviewStatus(integ.integrity_status || 'cleared');
    setReviewNote(integ.integrity_note || '');
  };

  const handleSaveIntegrityReview = async (e) => {
    e.preventDefault();
    if (!inspectingSubmission || !inspectingSubmission.submission_id) return;
    setReviewSubmitting(true);
    try {
      const res = await assignmentsApi.reviewIntegrity(inspectingSubmission.submission_id, {
        status: reviewStatus,
        note: reviewNote
      });
      if (res.success) {
        toast.success('Integrity review decision recorded successfully.', 'Review Saved');
        setIntegrityData((prev) => {
          if (!prev || !prev.results) return prev;
          return {
            ...prev,
            results: prev.results.map((r) =>
              r.submission_id === inspectingSubmission.submission_id
                ? {
                    ...r,
                    integrity_status: reviewStatus,
                    integrity_note: reviewNote,
                    integrity_reviewed_at: res.review.integrity_reviewed_at,
                    integrity_reviewed_by_name: res.review.integrity_reviewed_by_name
                  }
                : r
            )
          };
        });
        setInspectingSubmission((prev) => ({
          ...prev,
          integrity_status: reviewStatus,
          integrity_note: reviewNote,
          integrity_reviewed_at: res.review.integrity_reviewed_at,
          integrity_reviewed_by_name: res.review.integrity_reviewed_by_name
        }));
      } else {
        toast.error(res.message || 'Failed to record review.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error recording review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleOpenGradeModal = (sub) => {
    setGradingSubmission(sub);
    setGradeScore(sub.score !== null && sub.score !== undefined ? String(sub.score) : '');
    setGradeFeedback(sub.feedback || '');
    setGradeError(null);
  };

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    setGradeSubmitting(true);
    setGradeError(null);

    try {
      const res = await assignmentsApi.gradeSubmission(gradingSubmission.submission_id, {
        score: Number(gradeScore),
        feedback: gradeFeedback
      });

      if (res.success) {
        toast.success('Grade and evaluation feedback submitted.', 'Submission Evaluated');
        setGradingSubmission(null);
        // Refresh submissions in modal
        if (selectedAssignment) {
          openSubmissions(selectedAssignment);
        }
        // Refresh overview list
        fetchData();
      } else {
        setGradeError(res.message || 'Failed to grade submission.');
      }
    } catch (err) {
      console.error(err);
      setGradeError(err.message || 'Error grading submission.');
    } finally {
      setGradeSubmitting(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!deletingAssignment) return;
    setDeleteLoading(true);

    try {
      const res = await assignmentsApi.deleteAssignment(deletingAssignment.id);
      if (res.success) {
        toast.success(res.message || 'Assignment deleted.', 'Assignment Removed');
        setDeletingAssignment(null);
        if (selectedAssignment?.id === deletingAssignment.id) {
          setSelectedAssignment(null);
        }
        fetchData();
      } else {
        toast.error(res.message || 'Failed to delete assignment.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error deleting assignment.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownloadAttachment = async (assignmentId, filename) => {
    try {
      await assignmentsApi.downloadAttachment(assignmentId, filename);
    } catch (err) {
      toast.error(err.message || 'Failed to download attachment file.');
    }
  };

  const handleDownloadSubmission = async (submissionId, filename) => {
    try {
      await assignmentsApi.downloadSubmission(submissionId, filename);
    } catch (err) {
      toast.error(err.message || 'Failed to download submission file.');
    }
  };

  const integrityMap = useMemo(() => {
    const map = new Map();
    if (integrityData && Array.isArray(integrityData.results)) {
      for (const item of integrityData.results) {
        map.set(item.student_id, item);
      }
    }
    return map;
  }, [integrityData]);

  const displayedSubmissions = useMemo(() => {
    if (!filterRiskOnly) return submissions;
    return submissions.filter((sub) => {
      const integ = integrityMap.get(sub.student_id);
      return integ && (integ.risk_level === 'High' || integ.risk_level === 'Medium');
    });
  }, [submissions, filterRiskOnly, integrityMap]);

  return (
    <AppLayout title="Course Assignments">
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Curriculum Assessment
              </span>
              <span className="text-blue-200 text-xs">• Faculty Portal</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Course Assignments & Grading</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Create assignments with due dates and guidelines, monitor student submission rates, download submitted files, and evaluate with scores and feedback.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Create Assignment
            </button>
            <button
              onClick={fetchData}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition cursor-pointer"
              title="Refresh Assignments"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-2xl p-4 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Assignments Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse space-y-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3" />
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md w-full" />
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />
              </div>
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">No assignments created yet</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto mb-4">
              Publish your first course assignment with due dates, brief attachments, and scoring rubrics.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Create First Assignment
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {assignments.map((assignment) => {
              const isPastDue = new Date() > new Date(assignment.due_date);
              const percent = assignment.total_enrolled > 0
                ? Math.round((assignment.submitted_count / assignment.total_enrolled) * 100)
                : 0;

              return (
                <div
                  key={assignment.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all p-5 sm:p-6 flex flex-col justify-between"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                        <BookOpen className="w-3 h-3" />
                        {assignment.course_code} • {assignment.course_name}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setDeletingAssignment(assignment)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                          title="Delete Assignment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                      {assignment.title}
                    </h3>

                    {assignment.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed font-normal">
                        {assignment.description}
                      </p>
                    )}

                    {/* Metadata chips */}
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                      <div className={`flex items-center gap-1 font-semibold ${
                        isPastDue
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>Due: {new Date(assignment.due_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        {isPastDue && <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">Passed</span>}
                      </div>

                      <div className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        <span>Max Score: <strong>{assignment.max_score} pts</strong></span>
                      </div>

                      {assignment.attachment_name && (
                        <button
                          onClick={() => handleDownloadAttachment(assignment.id, assignment.attachment_name)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 transition cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Brief: {assignment.attachment_name}</span>
                        </button>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          Submissions Progress
                        </span>
                        <span className="font-extrabold text-blue-600 dark:text-blue-400">
                          {assignment.submitted_count} of {assignment.total_enrolled} submitted ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-medium">
                        <span>Evaluated: {assignment.graded_count} graded</span>
                        <span>Pending Grading: {assignment.submitted_count - assignment.graded_count}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Created {new Date(assignment.created_at).toLocaleDateString()}
                    </span>

                    <button
                      onClick={() => openSubmissions(assignment)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
                    >
                      <span>Review Submissions ({assignment.submitted_count})</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Submissions Review Modal / Drawer */}
        {selectedAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      {selectedAssignment.course_code}
                    </span>
                    <span className="text-xs text-slate-500">• Max {selectedAssignment.max_score} pts</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {selectedAssignment.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {/* Run Integrity Check Button */}
                  <button
                    type="button"
                    onClick={handleRunIntegrity}
                    disabled={integrityRunning}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
                  >
                    <Shield className={`w-3.5 h-3.5 ${integrityRunning ? 'animate-spin' : ''}`} />
                    <span>{integrityRunning ? 'Checking...' : 'Run Integrity Check'}</span>
                  </button>

                  {/* Filter Risk Only Toggle */}
                  <button
                    type="button"
                    onClick={() => setFilterRiskOnly(!filterRiskOnly)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      filterRiskOnly
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>{filterRiskOnly ? 'Medium/High Only' : 'Show only Medium/High'}</span>
                  </button>

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedAssignment(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer ml-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {submissionsLoading ? (
                  <div className="space-y-3 py-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />
                    ))}
                  </div>
                ) : submissionsError ? (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{submissionsError}</span>
                  </div>
                ) : (
                  <>
                    {/* Outdated Notice Banner */}
                    {integrityData?.summary?.is_outdated && (
                      <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Results may be out of date, re-run the check. A submission was added or updated since the last integrity check.</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRunIntegrity}
                          disabled={integrityRunning}
                          className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
                        >
                          <RefreshCw className={`w-3 h-3 ${integrityRunning ? 'animate-spin' : ''}`} />
                          <span>Re-run Check Now</span>
                        </button>
                      </div>
                    )}

                    {/* Summary Strip */}
                    {integrityData?.summary && (
                      <div className="mb-5 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Submissions Checked</span>
                          <div className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                            {integrityData.summary.checked_count} <span className="text-xs font-normal text-slate-400">/ {integrityData.summary.total_submissions}</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40">
                          <span className="text-[10px] font-bold uppercase text-rose-500 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> High Risk (≥60%)
                          </span>
                          <div className="text-base font-extrabold text-rose-700 dark:text-rose-300 mt-0.5">
                            {integrityData.summary.high_risk_count}
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40">
                          <span className="text-[10px] font-bold uppercase text-amber-500 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Medium (30-59%)
                          </span>
                          <div className="text-base font-extrabold text-amber-700 dark:text-amber-300 mt-0.5">
                            {integrityData.summary.medium_risk_count}
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40">
                          <span className="text-[10px] font-bold uppercase text-emerald-500 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Low Risk (&lt;30%)
                          </span>
                          <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">
                            {integrityData.summary.low_risk_count}
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Not Checkable</span>
                          <div className="text-base font-extrabold text-slate-700 dark:text-slate-300 mt-0.5">
                            {integrityData.summary.not_checkable_count}
                          </div>
                        </div>
                      </div>
                    )}

                    {displayedSubmissions.length === 0 ? (
                      <div className="py-12 text-center text-slate-500 text-xs">
                        {filterRiskOnly ? 'No submissions match the Medium/High risk filter.' : 'No enrolled students in this course.'}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                              <th className="py-3 px-3">Student</th>
                              <th className="py-3 px-3">Status</th>
                              <th className="py-3 px-3">Similarity</th>
                              <th className="py-3 px-3">
                                <div className="inline-flex items-center gap-1">
                                  <span>AI likelihood (estimate)</span>
                                  <button
                                    type="button"
                                    onClick={() => setShowAiInfoModal(true)}
                                    className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                                    title="About AI Likelihood Heuristics"
                                  >
                                    <Info className="w-3 h-3" />
                                  </button>
                                </div>
                              </th>
                              <th className="py-3 px-3">Submitted At</th>
                              <th className="py-3 px-3">File / Note</th>
                              <th className="py-3 px-3">Score</th>
                              <th className="py-3 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                            {displayedSubmissions.map((sub) => {
                              const integ = integrityMap.get(sub.student_id);

                              return (
                                <tr
                                  key={sub.student_id}
                                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                                >
                                  {/* Student Name & Avatar */}
                                  <td className="py-3.5 px-3">
                                    <div className="flex items-center gap-2.5">
                                      <img
                                        src={sub.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sub.student_name}`}
                                        alt={sub.student_name}
                                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 object-cover shrink-0"
                                      />
                                      <div>
                                        <div className="font-bold text-slate-900 dark:text-white">
                                          {sub.student_name}
                                        </div>
                                        <div className="text-[11px] text-slate-400">{sub.student_email}</div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Submission Status */}
                                  <td className="py-3.5 px-3">
                                    {sub.status === 'Submitted' && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Submitted
                                      </span>
                                    )}
                                    {sub.status === 'Late' && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                        <Clock className="w-3 h-3" />
                                        Late
                                      </span>
                                    )}
                                    {sub.status === 'Not submitted' && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                        Not submitted
                                      </span>
                                    )}
                                  </td>

                                  {/* Similarity Column */}
                                  <td className="py-3.5 px-3">
                                    {sub.submission_id ? (
                                      integ ? (
                                        <div className="space-y-1">
                                          {integ.risk_level === 'High' && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                              <ShieldAlert className="w-3 h-3" />
                                              {integ.max_similarity}% High
                                            </span>
                                          )}
                                          {integ.risk_level === 'Medium' && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                              <AlertTriangle className="w-3 h-3" />
                                              {integ.max_similarity}% Medium
                                            </span>
                                          )}
                                          {integ.risk_level === 'Low' && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                              <ShieldCheck className="w-3 h-3" />
                                              {integ.max_similarity !== null ? `${integ.max_similarity}% ` : ''}Low
                                            </span>
                                          )}
                                          {integ.risk_level === 'Not checkable' && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                                              Not checkable
                                            </span>
                                          )}
                                          {integ.risk_level === 'Not analyzed' && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700">
                                              Not analyzed
                                            </span>
                                          )}

                                          {integ.matched_student_name && (
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[130px]" title={`Matched with ${integ.matched_student_name}`}>
                                              vs {integ.matched_student_name}
                                            </div>
                                          )}

                                          {/* Teacher Review Tag */}
                                          {integ.integrity_status && (
                                            <div className="pt-0.5">
                                              {integ.integrity_status === 'cleared' && (
                                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200">
                                                  <CheckCircle2 className="w-2.5 h-2.5" /> Cleared
                                                </span>
                                              )}
                                              {integ.integrity_status === 'needs_discussion' && (
                                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                                                  <MessageSquare className="w-2.5 h-2.5" /> Discussion
                                                </span>
                                              )}
                                              {integ.integrity_status === 'flagged' && (
                                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200">
                                                  <Flag className="w-2.5 h-2.5" /> Flagged
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 text-xs italic">Pending check</span>
                                      )
                                    ) : (
                                      <span className="text-slate-400 italic">None</span>
                                    )}
                                  </td>

                                  {/* AI Likelihood Column */}
                                  <td className="py-3.5 px-3">
                                    {sub.submission_id ? (
                                      integ ? (
                                        integ.ai_likelihood?.is_short ? (
                                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 italic">
                                            Too short to estimate
                                          </span>
                                        ) : integ.ai_likelihood?.score !== null && integ.ai_likelihood?.score !== undefined ? (
                                          <div className="space-y-0.5">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                              <Sparkles className="w-3 h-3" />
                                              {integ.ai_likelihood.score}% (Estimate)
                                            </span>
                                            <div className="text-[10px] text-slate-400">Heuristic estimate</div>
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 text-xs">—</span>
                                        )
                                      ) : (
                                        <span className="text-slate-400 text-xs italic">—</span>
                                      )
                                    ) : (
                                      <span className="text-slate-400 italic">None</span>
                                    )}
                                  </td>

                                  {/* Submitted At */}
                                  <td className="py-3.5 px-3 text-slate-500">
                                    {sub.submitted_at
                                      ? new Date(sub.submitted_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                                      : '—'}
                                  </td>

                                  {/* File / Note */}
                                  <td className="py-3.5 px-3">
                                    {sub.submission_id ? (
                                      <div className="space-y-1">
                                        <button
                                          onClick={() => handleDownloadSubmission(sub.submission_id, sub.file_name)}
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition cursor-pointer"
                                        >
                                          <Download className="w-3 h-3" />
                                          <span className="truncate max-w-[140px]">{sub.file_name}</span>
                                        </button>
                                        {sub.note && (
                                          <p className="text-[10px] text-slate-500 italic max-w-xs truncate" title={sub.note}>
                                            "{sub.note}"
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 italic">None</span>
                                    )}
                                  </td>

                                  {/* Score */}
                                  <td className="py-3.5 px-3">
                                    {sub.score !== null && sub.score !== undefined ? (
                                      <div className="space-y-0.5">
                                        <span className="font-extrabold text-blue-600 dark:text-blue-400">
                                          {sub.score} / {selectedAssignment.max_score}
                                        </span>
                                        {sub.feedback && (
                                          <p className="text-[10px] text-slate-500 truncate max-w-[160px]" title={sub.feedback}>
                                            Feedback: {sub.feedback}
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 italic">Ungraded</span>
                                    )}
                                  </td>

                                  {/* Actions */}
                                  <td className="py-3.5 px-3 text-right">
                                    {sub.submission_id ? (
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenInspect(sub.student_id)}
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold transition cursor-pointer"
                                          title="Inspect Matching Passages & Integrity Review"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                          <span>Inspect</span>
                                        </button>
                                        <button
                                          onClick={() => handleOpenGradeModal(sub)}
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition cursor-pointer"
                                        >
                                          <Award className="w-3.5 h-3.5" />
                                          <span>{sub.score !== null ? 'Re-grade' : 'Grade'}</span>
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 text-xs">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                <span className="text-xs text-slate-500">
                  Total Enrolled: {submissions.length} Students {filterRiskOnly && `(Showing ${displayedSubmissions.length} filtered)`}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedAssignment(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Side-by-Side Inspection & Teacher Decision Review Modal */}
        {inspectingSubmission && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in zoom-in-95">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
              {/* Inspection Modal Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      Integrity Analysis
                    </span>
                    <span className="text-xs text-slate-500">
                      {selectedAssignment?.course_code} • {selectedAssignment?.title}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{inspectingSubmission.student_name}</span>
                    {inspectingSubmission.matched_student_name && (
                      <span className="text-slate-400 font-normal text-sm">
                        matched with <strong className="text-slate-800 dark:text-slate-200">{inspectingSubmission.matched_student_name}</strong>
                      </span>
                    )}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingSubmission(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Inspection Modal Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                {/* Metric Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                    <span className="text-[11px] font-bold uppercase text-slate-400">Similarity Metric</span>
                    <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                      {inspectingSubmission.risk_level === 'High' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          {inspectingSubmission.max_similarity}% High Risk
                        </span>
                      )}
                      {inspectingSubmission.risk_level === 'Medium' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {inspectingSubmission.max_similarity}% Medium Risk
                        </span>
                      )}
                      {inspectingSubmission.risk_level === 'Low' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {inspectingSubmission.max_similarity !== null ? `${inspectingSubmission.max_similarity}% ` : ''}Low Risk
                        </span>
                      )}
                      {inspectingSubmission.risk_level === 'Not checkable' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                          Not checkable
                        </span>
                      )}
                      {inspectingSubmission.matched_student_name && (
                        <span className="text-xs text-slate-500">
                          Top peer match: <strong>{inspectingSubmission.matched_student_name}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                    <span className="text-[11px] font-bold uppercase text-slate-400">AI Likelihood (Heuristic)</span>
                    <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                      {inspectingSubmission.ai_likelihood?.is_short ? (
                        <span className="text-xs text-slate-500 italic">Too short to estimate (&lt;100 words)</span>
                      ) : inspectingSubmission.ai_likelihood?.score !== null && inspectingSubmission.ai_likelihood?.score !== undefined ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            <Sparkles className="w-3.5 h-3.5" />
                            {inspectingSubmission.ai_likelihood.score}% (Estimate)
                          </span>
                          {inspectingSubmission.ai_likelihood.details?.matched_phrases?.length > 0 && (
                            <div className="text-[11px] text-slate-500">
                              Detected phrases: {inspectingSubmission.ai_likelihood.details.matched_phrases.join(', ')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Not available</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Prominent Mandatory Advisory Disclaimer */}
                <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold mb-0.5">Advisory Notice</div>
                    <span>AI detection is not reliable. Use this only as a hint and review the work yourself. Never label a student as having cheated or generated by AI based solely on heuristic estimates.</span>
                  </div>
                </div>

                {/* Side-by-Side Matching Passages */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Top Matching Passages Side-by-Side</span>
                    <span className="text-xs font-normal text-slate-400">
                      ({inspectingSubmission.matched_passages?.length || 0} overlapping passages)
                    </span>
                  </h4>

                  {inspectingSubmission.risk_level === 'Not checkable' ? (
                    <div className="p-6 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                      This submission has no extracted text (e.g. image, zip, or unsupported format) and could not be checked.
                    </div>
                  ) : !inspectingSubmission.matched_passages || inspectingSubmission.matched_passages.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                      No significant verbatim or overlapping 5-gram passages were detected between this submission and peers.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {inspectingSubmission.matched_passages.map((p, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900"
                        >
                          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              Matching Passage {idx + 1}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {p.word_count} overlapping words
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 p-4 gap-4 text-xs font-mono leading-relaxed">
                            {/* Left: Student's passage */}
                            <div>
                              <div className="text-[11px] font-sans font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                                <span>{inspectingSubmission.student_name}'s Submission:</span>
                              </div>
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200">
                                <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-950 dark:text-amber-100 font-semibold px-1 py-0.5 rounded">
                                  {p.passage_a || p.match_text}
                                </span>
                              </div>
                            </div>

                            {/* Right: Peer's passage */}
                            <div>
                              <div className="text-[11px] font-sans font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                                <span>{inspectingSubmission.matched_student_name || 'Matched Peer'}'s Submission:</span>
                              </div>
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200">
                                <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-950 dark:text-amber-100 font-semibold px-1 py-0.5 rounded">
                                  {p.passage_b || p.match_text}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Teacher Decision Review Form */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <form onSubmit={handleSaveIntegrityReview} className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        <span>Teacher Decision & Review</span>
                      </h4>
                      <p className="text-xs text-slate-500 mb-3">
                        Record your academic review decision and notes. Only visible to you as the course instructor.
                      </p>
                    </div>

                    {/* Status Selector */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <label
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition text-xs font-bold ${
                          reviewStatus === 'cleared'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-xs'
                            : 'bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reviewStatus"
                          value="cleared"
                          checked={reviewStatus === 'cleared'}
                          onChange={() => setReviewStatus('cleared')}
                          className="sr-only"
                        />
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <div>Cleared</div>
                          <div className="text-[10px] font-normal text-slate-400">Normal citation or original</div>
                        </div>
                      </label>

                      <label
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition text-xs font-bold ${
                          reviewStatus === 'needs_discussion'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-xs'
                            : 'bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reviewStatus"
                          value="needs_discussion"
                          checked={reviewStatus === 'needs_discussion'}
                          onChange={() => setReviewStatus('needs_discussion')}
                          className="sr-only"
                        />
                        <MessageSquare className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <div>Needs Discussion</div>
                          <div className="text-[10px] font-normal text-slate-400">Clarify during office hours</div>
                        </div>
                      </label>

                      <label
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition text-xs font-bold ${
                          reviewStatus === 'flagged'
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700 shadow-xs'
                            : 'bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reviewStatus"
                          value="flagged"
                          checked={reviewStatus === 'flagged'}
                          onChange={() => setReviewStatus('flagged')}
                          className="sr-only"
                        />
                        <Flag className="w-4 h-4 text-rose-600 shrink-0" />
                        <div>
                          <div>Flagged</div>
                          <div className="text-[10px] font-normal text-slate-400">Unacceptable overlap detected</div>
                        </div>
                      </label>
                    </div>

                    {/* Note Textarea */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Review Note (optional)
                      </label>
                      <textarea
                        rows={2}
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="Enter any private notes regarding this review decision..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {inspectingSubmission.integrity_reviewed_at && (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          Previously reviewed by {inspectingSubmission.integrity_reviewed_by_name || 'Faculty'} on{' '}
                          {new Date(inspectingSubmission.integrity_reviewed_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setInspectingSubmission(null)}
                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={reviewSubmitting}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-500 shadow-md shadow-blue-500/20"
                      >
                        {reviewSubmitting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Save Review Decision</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Info Explanation Modal */}
        {showAiInfoModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>AI Likelihood Heuristics</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAiInfoModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  The AI likelihood estimate is computed locally on the server without any external APIs, network calls, or third-party tracking.
                </p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  The offline heuristic analyzes:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-500 dark:text-slate-400">
                  <li><strong>Sentence Length Variance (Burstiness):</strong> Human prose mixes short and long sentences, whereas AI text exhibits uniform sentence lengths.</li>
                  <li><strong>Vocabulary Repetition (Type-Token Ratio):</strong> Measures distribution and consistency of unique words.</li>
                  <li><strong>Common AI Transition Phrases:</strong> Frequency of characteristic filler phrases (e.g., "in conclusion", "it is important to note", "delve into", "furthermore").</li>
                  <li><strong>Uniform Paragraph Structure:</strong> Variance in paragraph word lengths.</li>
                </ul>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs">
                  <strong>Disclaimer:</strong> AI detection is not reliable. Use this only as a hint and review the work yourself. Texts with under 100 words return "Too short to estimate".
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAiInfoModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Grading Modal */}
        {gradingSubmission && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in zoom-in-95 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Evaluate Submission
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {gradingSubmission.student_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setGradingSubmission(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGradeSubmit} className="p-5 space-y-4">
                {gradeError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{gradeError}</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Score (out of {selectedAssignment?.max_score}) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-semibold">0 to {selectedAssignment?.max_score}</span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={selectedAssignment?.max_score}
                    required
                    placeholder={`e.g. 85`}
                    value={gradeScore}
                    onChange={(e) => setGradeScore(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Evaluation Feedback
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide constructive assessment feedback to the student..."
                    value={gradeFeedback}
                    onChange={(e) => setGradeFeedback(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setGradingSubmission(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={gradeSubmitting}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-500 transition cursor-pointer"
                  >
                    {gradeSubmitting ? 'Saving...' : 'Save Grade'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Assignment Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Assignment</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Publish coursework instructions and scoring rubric</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
                {createError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Course <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={createForm.course_id}
                    onChange={(e) => setCreateForm({ ...createForm, course_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name} (Semester {c.semester})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Assignment Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Implement Balanced Red-Black Tree in C++"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Instructions & Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide detailed submission requirements, rubric, and test cases..."
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Due Date & Time <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={createForm.due_date}
                      onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Maximum Score <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={createForm.max_score}
                      onChange={(e) => setCreateForm({ ...createForm, max_score: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Optional Attachment / Assignment Brief
                  </label>
                  <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center hover:border-blue-500 transition-colors bg-slate-50/50 dark:bg-slate-800/40">
                    <input
                      type="file"
                      id="attachment-file-input"
                      onChange={(e) => setCreateForm({ ...createForm, attachment: e.target.files[0] || null })}
                      className="hidden"
                    />
                    <label htmlFor="attachment-file-input" className="cursor-pointer block">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                      {createForm.attachment ? (
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          {createForm.attachment.name} ({(createForm.attachment.size / 1024).toFixed(1)} KB)
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Click to attach file</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">PDF, DOC, DOCX, PPT, PPTX, TXT, ZIP, PNG, JPG (Max 10 MB)</p>
                        </div>
                      )}
                    </label>
                    {createForm.attachment && (
                      <button
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, attachment: null })}
                        className="mt-2 text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                      >
                        Remove file
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-500 transition cursor-pointer"
                  >
                    {createSubmitting ? 'Publishing...' : 'Publish Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={Boolean(deletingAssignment)}
          onClose={() => setDeletingAssignment(null)}
          onConfirm={handleDeleteAssignment}
          title="Delete Assignment?"
          message={`Are you sure you want to delete "${deletingAssignment?.title}"? All submitted student work and files will be permanently purged.`}
          confirmText="Yes, Delete Assignment"
          danger={true}
          loading={deleteLoading}
        />
      </div>
    </AppLayout>
  );
}

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { assignmentsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  FileText,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Award,
  RefreshCw,
  BookOpen,
  Calendar,
  X,
  FileCheck,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Submit Modal
  const [activeModalAssignment, setActiveModalAssignment] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  const toast = useToast();

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await assignmentsApi.getMyAssignments();
      if (res.success) {
        setAssignments(res.assignments || []);
      } else {
        setError(res.message || 'Failed to load assignments.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error connecting to assignments service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const openSubmitModal = (assignment) => {
    setActiveModalAssignment(assignment);
    setSelectedFile(null);
    setNote(assignment.submission?.note || '');
    setModalError(null);
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setModalError('Please select a file to submit.');
      return;
    }

    setSubmitting(true);
    setModalError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (note.trim()) {
        formData.append('note', note.trim());
      }

      const res = await assignmentsApi.submitAssignment(activeModalAssignment.id, formData);
      if (res.success) {
        toast.success(res.message || 'Assignment submitted successfully.', 'Work Submitted');
        setActiveModalAssignment(null);
        setSelectedFile(null);
        setNote('');
        fetchAssignments();
      } else {
        setModalError(res.message || 'Failed to submit assignment.');
        toast.error(res.message || 'Failed to submit assignment.');
      }
    } catch (err) {
      console.error(err);
      setModalError(err.message || 'Error submitting assignment.');
      toast.error(err.message || 'Error submitting assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadAttachment = async (assignmentId, filename) => {
    try {
      await assignmentsApi.downloadAttachment(assignmentId, filename);
    } catch (err) {
      toast.error(err.message || 'Failed to download assignment brief.');
    }
  };

  const handleDownloadMySubmission = async (submissionId, filename) => {
    try {
      await assignmentsApi.downloadSubmission(submissionId, filename);
    } catch (err) {
      toast.error(err.message || 'Failed to download your submitted file.');
    }
  };

  // Helper to format due date countdown in server local time
  const formatCountdown = (dueDateStr) => {
    const now = new Date();
    const due = new Date(dueDateStr);
    const diffMs = due.getTime() - now.getTime();

    if (diffMs < 0) {
      const overdueHours = Math.abs(Math.floor(diffMs / (1000 * 60 * 60)));
      if (overdueHours < 24) {
        return `Overdue by ${overdueHours}h`;
      }
      const overdueDays = Math.floor(overdueHours / 24);
      return `Overdue by ${overdueDays}d`;
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours < 24) {
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `Due in ${hours}h ${minutes}m`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `Due in ${days}d ${remainingHours}h`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Graded':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Award className="w-3.5 h-3.5" />
            Graded
          </span>
        );
      case 'Submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Submitted
          </span>
        );
      case 'Late':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            Submitted Late
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-3.5 h-3.5" />
            Overdue
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Clock className="w-3.5 h-3.5" />
            Pending Submission
          </span>
        );
    }
  };

  return (
    <AppLayout title="My Course Assignments">
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Student Academic Portfolio
              </span>
              <span className="text-blue-200 text-xs">• Course Assessments</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Assignments & Submissions</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Track active coursework deadlines, submit code or reports with integrity text extraction, and review instructor grades and evaluation remarks.
            </p>
          </div>

          <button
            onClick={fetchAssignments}
            className="self-start md:self-auto p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition cursor-pointer"
            title="Refresh Assignments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-2xl p-4 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Assignments Cards List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse space-y-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3" />
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md w-full" />
                <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
              </div>
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 mb-3">
              <FileCheck className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">No assignments posted</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Your professors have not published any assignments for your enrolled courses yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {assignments.map((assignment) => {
              const countdown = formatCountdown(assignment.due_date);
              const isGraded = assignment.status === 'Graded';
              const hasSubmitted = Boolean(assignment.submission);

              return (
                <div
                  key={assignment.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all p-5 sm:p-6 flex flex-col justify-between"
                >
                  <div>
                    {/* Top Header */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                        <BookOpen className="w-3 h-3" />
                        {assignment.course_code} • {assignment.course_name}
                      </span>

                      {getStatusBadge(assignment.status)}
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                      {assignment.title}
                    </h3>

                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                      Instructor: {assignment.faculty_name || 'Department Faculty'}
                    </div>

                    {assignment.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 line-clamp-3 leading-relaxed">
                        {assignment.description}
                      </p>
                    )}

                    {/* Metadata chips */}
                    <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs">
                      <div className={`flex items-center gap-1 font-bold ${
                        assignment.is_overdue
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{countdown}</span>
                      </div>

                      <div className="text-slate-500 dark:text-slate-400 font-medium">
                        • Due: {new Date(assignment.due_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </div>

                      <div className="text-slate-500 dark:text-slate-400 font-medium">
                        • Max Score: <strong>{assignment.max_score} pts</strong>
                      </div>
                    </div>

                    {/* Brief Download Button if attachment exists */}
                    {assignment.has_attachment && (
                      <div className="mt-3">
                        <button
                          onClick={() => handleDownloadAttachment(assignment.id, assignment.attachment_name)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Brief: {assignment.attachment_name || 'Download Attachment'}</span>
                        </button>
                      </div>
                    )}

                    {/* Graded Evaluation Box */}
                    {isGraded && (
                      <div className="mt-4 p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            Evaluation Score
                          </span>
                          <span className="text-sm font-extrabold text-blue-700 dark:text-blue-300">
                            {assignment.submission?.score} / {assignment.max_score} pts ({Math.round(((assignment.submission?.score || 0) / assignment.max_score) * 100)}%)
                          </span>
                        </div>
                        {assignment.submission?.feedback && (
                          <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed font-normal">
                            <span className="font-semibold">Instructor Feedback:</span> {assignment.submission.feedback}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Current submission status info */}
                    {hasSubmitted && !isGraded && (
                      <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span className="font-bold flex items-center gap-1.5">
                            <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                            My Submitted File:
                          </span>
                          <button
                            onClick={() => handleDownloadMySubmission(assignment.submission.id, assignment.submission.file_name)}
                            className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer truncate max-w-[180px]"
                          >
                            <Download className="w-3 h-3" />
                            {assignment.submission.file_name}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Uploaded on {new Date(assignment.submission.submitted_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          {assignment.submission.is_late && <span className="ml-1 text-amber-500 font-bold">(Late Submission)</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      {isGraded ? (
                        <span className="text-[11px] font-semibold text-slate-400">
                          Evaluated by instructor • Submissions closed
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {hasSubmitted ? 'Re-submission allowed before grading' : 'Submissions open'}
                        </span>
                      )}
                    </div>

                    {!isGraded && (
                      <button
                        onClick={() => openSubmitModal(assignment)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-md transition cursor-pointer ${
                          hasSubmitted
                            ? 'bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                        }`}
                      >
                        {hasSubmitted ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Replace Submission</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Submit Assignment</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Submit / Re-submit Modal */}
        {activeModalAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {activeModalAssignment.submission ? 'Replace Assignment Submission' : 'Submit Assignment Work'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activeModalAssignment.course_code} • {activeModalAssignment.title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModalAssignment(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitAssignment} className="p-6 space-y-4">
                {modalError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Overdue Warning Notice */}
                {activeModalAssignment.is_overdue && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>The due date has passed. Your submission will be recorded and flagged as <strong>Late</strong>.</span>
                  </div>
                )}

                {/* File picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Upload Solution File <span className="text-rose-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-center hover:border-blue-500 transition-colors bg-slate-50/50 dark:bg-slate-800/40">
                    <input
                      type="file"
                      id="student-submission-file"
                      required
                      onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                      className="hidden"
                    />
                    <label htmlFor="student-submission-file" className="cursor-pointer block">
                      <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                      {selectedFile ? (
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {selectedFile.name}
                          </div>
                          <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            {(selectedFile.size / 1024).toFixed(1)} KB • Click to change file
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                            Choose submission file or drag & drop
                          </span>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Supported: PDF, DOC, DOCX, PPT, PPTX, TXT, ZIP, PNG, JPG (Max 10 MB)
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Optional Note */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Student Note (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Add an optional comment or note for your professor..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                  ⚡ <strong>Integrity & Authenticity Check:</strong> Text content from PDF, DOCX, and TXT files will automatically be indexed for academic verification.
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveModalAssignment(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-500 transition cursor-pointer flex items-center gap-2"
                  >
                    {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    <span>{submitting ? 'Uploading...' : 'Confirm Submission'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

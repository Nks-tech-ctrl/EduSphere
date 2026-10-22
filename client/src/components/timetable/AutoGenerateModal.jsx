import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Layers,
  RefreshCw,
  ArrowLeft,
  Check,
  AlertCircle
} from 'lucide-react';
import TimetableGrid from './TimetableGrid';
import ConfirmModal from '../common/ConfirmModal';
import { timetableApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const DAYS_LIST = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
];

export default function AutoGenerateModal({
  isOpen,
  onClose,
  courses = [],
  onTimetableApplied = () => {}
}) {
  const toast = useToast();

  // Step state: 'config' | 'preview'
  const [step, setStep] = useState('config');

  // Form Configuration State
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [selectedSemesters, setSelectedSemesters] = useState([]);
  const [workingDays, setWorkingDays] = useState([1, 2, 3, 4, 5]); // Mon-Fri default
  const [breakStart, setBreakStart] = useState('13:15');
  const [breakEnd, setBreakEnd] = useState('14:00');
  const [maxTeachingHours, setMaxTeachingHours] = useState(4);
  const [replaceExisting, setReplaceExisting] = useState(true);

  // Preview State
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [currentSeed, setCurrentSeed] = useState(1024);

  // Apply State
  const [isApplying, setIsApplying] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [applyErrorMessage, setApplyErrorMessage] = useState(null);

  // Extract distinct available semesters from department courses
  useEffect(() => {
    if (courses && courses.length > 0) {
      const sems = Array.from(new Set(courses.map(c => Number(c.semester)).filter(Boolean))).sort((a, b) => a - b);
      setAvailableSemesters(sems);
      setSelectedSemesters(sems); // select all by default
    } else {
      setAvailableSemesters([1, 2, 3, 4, 5, 6, 7, 8]);
      setSelectedSemesters([1, 2, 3, 4]);
    }
  }, [courses]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('config');
      setPreviewData(null);
      setApplyErrorMessage(null);
      setShowApplyConfirm(false);
      setCurrentSeed(Math.floor(Math.random() * 900000) + 1000);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Toggle semester selection
  const handleSemesterToggle = (sem) => {
    if (selectedSemesters.includes(sem)) {
      if (selectedSemesters.length > 1) {
        setSelectedSemesters(selectedSemesters.filter(s => s !== sem));
      } else {
        toast.error('At least one semester must remain selected.');
      }
    } else {
      setSelectedSemesters([...selectedSemesters, sem].sort((a, b) => a - b));
    }
  };

  // Toggle working days selection
  const handleDayToggle = (dayId) => {
    if (workingDays.includes(dayId)) {
      if (workingDays.length > 1) {
        setWorkingDays(workingDays.filter(d => d !== dayId));
      } else {
        toast.error('At least one working day must remain selected.');
      }
    } else {
      setWorkingDays([...workingDays, dayId].sort((a, b) => a - b));
    }
  };

  // Generate preview handler
  const handleGeneratePreview = async (seedToUse = currentSeed) => {
    if (selectedSemesters.length === 0) {
      toast.error('Please select at least one semester.');
      return;
    }
    if (workingDays.length === 0) {
      toast.error('Please select at least one working day.');
      return;
    }
    if (breakStart >= breakEnd) {
      toast.error('Break end time must be after break start time.');
      return;
    }

    try {
      setLoadingPreview(true);
      setApplyErrorMessage(null);

      const payload = {
        semesters: selectedSemesters,
        working_days: workingDays,
        break_start: breakStart,
        break_end: breakEnd,
        max_teaching_hours_per_day: Number(maxTeachingHours) || 4,
        replace_existing: replaceExisting,
        seed: seedToUse
      };

      const res = await timetableApi.previewGenerateTimetable(payload);

      if (res.success) {
        setPreviewData(res);
        setCurrentSeed(seedToUse);
        setStep('preview');
      } else {
        toast.error(res.message || 'Failed to generate timetable preview.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to generate timetable preview.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Regenerate with a new seed
  const handleRegenerate = () => {
    const newSeed = Math.floor(Math.random() * 9000000) + 1000;
    handleGeneratePreview(newSeed);
  };

  // Apply proposal to real timetable
  const handleApplyTimetable = async () => {
    if (!previewData || !previewData.slots || previewData.slots.length === 0) {
      toast.error('No proposed slots to apply.');
      return;
    }

    try {
      setIsApplying(true);
      setApplyErrorMessage(null);

      const payload = {
        proposal: previewData.slots,
        semesters: selectedSemesters,
        replace_existing: replaceExisting,
        break_start: breakStart,
        break_end: breakEnd
      };

      const res = await timetableApi.applyGenerateTimetable(payload);

      if (res.success) {
        toast.success(res.message || `Successfully applied ${previewData.slots.length} timetable slot(s).`);
        setShowApplyConfirm(false);
        onClose();
        onTimetableApplied();
      } else {
        setApplyErrorMessage(res.message || 'Failed to apply timetable.');
        toast.error(res.message || 'Failed to apply timetable.');
      }
    } catch (err) {
      setApplyErrorMessage(err.message || 'Failed to apply timetable.');
      toast.error(err.message || 'Failed to apply timetable.');
    } finally {
      setIsApplying(false);
    }
  };

  // Compute stats helper
  const stats = previewData?.stats || { total_sessions: 0, placed_sessions: 0, unplaced_sessions: 0 };
  const percentPlaced = stats.total_sessions > 0
    ? Math.round((stats.placed_sessions / stats.total_sessions) * 100)
    : 0;

  // Selected courses count
  const matchingCoursesCount = courses.filter(c => selectedSemesters.includes(Number(c.semester))).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full my-auto transition-all ${
        step === 'preview' ? 'max-w-6xl max-h-[92vh] flex flex-col' : 'max-w-2xl'
      }`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Automatic Timetable Generator</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Phase 12B
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {step === 'config'
                  ? 'Configure parameters to generate a conflict-free departmental schedule'
                  : 'Review the generated schedule preview before applying to live timetable'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: CONFIGURATION FORM */}
        {step === 'config' && (
          <div className="p-6 space-y-6">
            {courses.length === 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  No courses are currently registered in your department. Please add courses with weekly lectures and lab hours first.
                </span>
              </div>
            ) : matchingCoursesCount === 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>No courses found for the chosen semester(s). Please select at least one semester with active courses.</span>
              </div>
            ) : null}

            {/* 1. Semesters Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Target Semesters</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSemesters([...availableSemesters])}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (availableSemesters.length > 0) setSelectedSemesters([availableSemesters[0]]);
                    }}
                    className="text-[11px] font-semibold text-slate-500 hover:underline"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {availableSemesters.map((sem) => {
                  const isChecked = selectedSemesters.includes(sem);
                  const semCourses = courses.filter(c => Number(c.semester) === sem);
                  return (
                    <button
                      key={sem}
                      type="button"
                      onClick={() => handleSemesterToggle(sem)}
                      className={`p-3 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                        isChecked
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">Semester {sem}</div>
                        <div className="text-[10px] opacity-75">{semCourses.length} course(s)</div>
                      </div>
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center border ${
                        isChecked
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Working Days Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Working Days</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {DAYS_LIST.map((day) => {
                  const isChecked = workingDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => handleDayToggle(day.id)}
                      className={`py-2 px-2.5 rounded-xl border text-center transition cursor-pointer ${
                        isChecked
                          ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 font-bold'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs">{day.short}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Break Time & Max Teaching Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Break Window</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={breakStart}
                    onChange={(e) => setBreakStart(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <span className="text-xs text-slate-400 font-semibold">to</span>
                  <input
                    type="time"
                    value={breakEnd}
                    onChange={(e) => setBreakEnd(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Classes will strictly avoid overlapping this window.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Max Teaching Hours / Day</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={maxTeachingHours}
                  onChange={(e) => setMaxTeachingHours(Math.max(1, Math.min(8, Number(e.target.value) || 4)))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400">Limits daily workload per faculty member across classes.</p>
              </div>
            </div>

            {/* 4. Replace Existing Slots Toggle */}
            <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Replace existing slots for selected semesters
                  </span>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed">
                    When enabled, all previously scheduled timetable slots for your department in the chosen semester(s) will be cleared and replaced upon applying. Other departments and unselected semesters are never touched.
                  </p>
                </div>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleGeneratePreview(currentSeed)}
                disabled={loadingPreview || matchingCoursesCount === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition shadow-sm cursor-pointer"
                id="generate-preview-btn"
              >
                {loadingPreview ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Computing Schedule...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Preview</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SCHEDULE PREVIEW */}
        {step === 'preview' && previewData && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Stats Bar & Warnings */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    stats.unplaced_sessions === 0
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                  }`}>
                    {percentPlaced}%
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{stats.placed_sessions} of {stats.total_sessions} Sessions Placed</span>
                      {stats.unplaced_sessions === 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 inline" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 inline" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Target Semesters: {selectedSemesters.join(', ')} • Seed: #{previewData.seed}
                    </div>
                  </div>
                </div>

                {/* Replacement Notification */}
                {replaceExisting && (
                  <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                    Will replace {previewData.existing_deleted_count} existing slot(s) on apply
                  </div>
                )}
                {!replaceExisting && (
                  <div className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] font-semibold text-blue-800 dark:text-blue-300">
                    Existing slots preserved (highlighted separately)
                  </div>
                )}
              </div>

              {/* Unplaced sessions diagnostic callout */}
              {previewData.unplaced && previewData.unplaced.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{previewData.unplaced.length} session(s) could not be placed:</span>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {previewData.unplaced.map((unp, idx) => (
                      <div key={idx} className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-rose-100 dark:border-rose-900/40 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <span className="font-bold">{unp.course_code}</span> ({unp.course_name}) • <span className="font-semibold capitalize">{unp.slot_type}</span> ({unp.duration_minutes}m)
                          {unp.faculty_name && <span className="text-slate-500 dark:text-slate-400"> — {unp.faculty_name}</span>}
                        </div>
                        <div className="text-rose-600 dark:text-rose-400 font-medium">
                          {unp.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {applyErrorMessage && (
                <div className="p-3 rounded-xl bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 text-xs font-semibold">
                  {applyErrorMessage}
                </div>
              )}
            </div>

            {/* Read-Only Interactive Timetable Grid Preview */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <TimetableGrid
                slots={previewData.preview_slots || previewData.slots}
                canManage={false}
                title="Proposed Timetable Preview"
                subtitle={`Simulated Conflict-Free Grid (${previewData.slots.length} proposed slots)`}
              />
            </div>

            {/* Preview Footer Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setStep('config')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Adjust Parameters</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={loadingPreview}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl transition cursor-pointer"
                  title="Generate alternative arrangement with new seed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPreview ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowApplyConfirm(true)}
                  disabled={isApplying || previewData.slots.length === 0}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition shadow-sm cursor-pointer"
                  id="apply-timetable-btn"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Apply Timetable</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog Before Saving to DB */}
      <ConfirmModal
        isOpen={showApplyConfirm}
        onClose={() => setShowApplyConfirm(false)}
        onConfirm={handleApplyTimetable}
        title="Apply Generated Timetable?"
        message={
          <div className="space-y-2 text-xs">
            <p>
              Are you sure you want to apply this generated schedule of{' '}
              <strong>{previewData?.slots?.length || 0} timetable slot(s)</strong> to your department?
            </p>
            {replaceExisting && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 font-semibold">
                ⚠️ Warning: {previewData?.existing_deleted_count || 0} existing slot(s) for the selected semester(s) will be permanently deleted and replaced.
              </div>
            )}
            {previewData?.unplaced && previewData.unplaced.length > 0 && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 font-medium">
                Notice: {previewData.unplaced.length} session(s) could not be placed and will remain unplaced. You are applying a partial proposal.
              </div>
            )}
            <p className="text-slate-500 dark:text-slate-400">
              All slots will be atomically validated on the server. If any conflict is found, the transaction will roll back automatically.
            </p>
          </div>
        }
        confirmText="Apply & Save"
        danger={replaceExisting}
        loading={isApplying}
      />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Calendar, Clock, MapPin, BookOpen, Layers } from 'lucide-react';

const DAYS = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
];

export default function SlotModal({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  courses = [],
  conflictError = null,
  isSubmitting = false,
}) {
  const [formData, setFormData] = useState({
    course_id: '',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '10:00',
    room: '',
    slot_type: 'lecture',
  });

  const [localError, setLocalError] = useState(null);
  const isEdit = Boolean(initialData && initialData.id);

  useEffect(() => {
    if (isEdit) {
      setFormData({
        course_id: initialData.course_id || (courses.length > 0 ? courses[0].id : ''),
        day_of_week: initialData.day_of_week || 1,
        start_time: initialData.start_time || '09:00',
        end_time: initialData.end_time || '10:00',
        room: initialData.room || 'LH-101',
        slot_type: initialData.slot_type || 'lecture',
      });
    } else if (initialData) {
      // New slot with prefill from empty cell click
      const start = initialData.start_time || '09:00';
      let end = initialData.end_time;
      if (!end) {
        const [h, m] = start.split(':').map(Number);
        const nextH = Math.min(18, h + 1);
        end = `${String(nextH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
      setFormData({
        course_id: initialData.course_id || (courses.length > 0 ? courses[0].id : ''),
        day_of_week: initialData.day_of_week || 1,
        start_time: start,
        end_time: end,
        room: initialData.room || 'LH-101',
        slot_type: initialData.slot_type || 'lecture',
      });
    } else {
      setFormData({
        course_id: courses.length > 0 ? courses[0].id : '',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:00',
        room: 'LH-101',
        slot_type: 'lecture',
      });
    }
    setLocalError(null);
  }, [initialData, courses, isOpen, isEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError(null);

    if (!formData.course_id) {
      setLocalError('Please select a course.');
      return;
    }

    if (!formData.room.trim()) {
      setLocalError('Please specify a room number.');
      return;
    }

    if (formData.start_time >= formData.end_time) {
      setLocalError('End time must be strictly after start time.');
      return;
    }

    if (formData.start_time < '08:00' || formData.end_time > '18:00') {
      setLocalError('Classes must be scheduled between 08:00 and 18:00.');
      return;
    }

    onSave({
      ...formData,
      course_id: parseInt(formData.course_id, 10),
      day_of_week: parseInt(formData.day_of_week, 10),
      room: formData.room.trim(),
    });
  };

  const displayedError = conflictError || localError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEdit ? 'Edit Class Slot' : 'Schedule New Class Slot'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Weekly academic schedule management
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prominent Conflict / Error Banner */}
        {displayedError && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">
              {displayedError}
            </div>
          </div>
        )}

        {/* Slot Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Course Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Course
            </label>
            <select
              value={formData.course_id}
              onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="" disabled>
                Select Course
              </option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name} ({c.faculty_name || 'Faculty'})
                </option>
              ))}
            </select>
          </div>

          {/* Day of Week */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Day of Week
            </label>
            <select
              value={formData.day_of_week}
              onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DAYS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Timings: Start and End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Start Time (HH:MM)
              </label>
              <div className="relative">
                <input
                  type="time"
                  step="900"
                  min="08:00"
                  max="17:45"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                End Time (HH:MM)
              </label>
              <div className="relative">
                <input
                  type="time"
                  step="900"
                  min="08:15"
                  max="18:00"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Room and Slot Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Room
              </label>
              <input
                type="text"
                placeholder="e.g. LH-101, CS-Lab-1"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Slot Type
              </label>
              <select
                value={formData.slot_type}
                onChange={(e) => setFormData({ ...formData, slot_type: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="lecture">Lecture</option>
                <option value="lab">Lab</option>
                <option value="tutorial">Tutorial</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 pb-1 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors shadow-sm"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Slot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

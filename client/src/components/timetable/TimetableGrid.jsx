import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Plus,
  Pencil,
  Trash2,
  Printer,
  X,
  BookOpen,
  Sparkles
} from 'lucide-react';

const DAYS = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
];

const HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

const PIXELS_PER_HOUR = 80;
const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60; // 1.3333... px/min
const BASE_MINUTES = 8 * 60; // 08:00 = 480 min

// 10-Color Stable Palette (Maintains exact backwards compatibility for seeded courses 1-5)
const PALETTES = [
  // 0: Blue (Course ID 1, e.g. CSE-201)
  {
    card: 'bg-blue-50/70 dark:bg-blue-950/40 border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100',
    badge: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border border-blue-200 dark:border-blue-800',
    border: 'border-l-4 border-l-blue-600 dark:border-l-blue-500',
  },
  // 1: Purple (Course ID 2, e.g. CSE-202)
  {
    card: 'bg-purple-50/70 dark:bg-purple-950/40 border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100',
    badge: 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200 border border-purple-200 dark:border-purple-800',
    border: 'border-l-4 border-l-purple-600 dark:border-l-purple-500',
  },
  // 2: Emerald (Course ID 3, e.g. CSE-203)
  {
    card: 'bg-emerald-50/70 dark:bg-emerald-950/40 border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100',
    badge: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800',
    border: 'border-l-4 border-l-emerald-600 dark:border-l-emerald-500',
  },
  // 3: Amber (Course ID 4, e.g. ECE-201)
  {
    card: 'bg-amber-50/70 dark:bg-amber-950/40 border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100',
    badge: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-200 dark:border-amber-800',
    border: 'border-l-4 border-l-amber-600 dark:border-l-amber-500',
  },
  // 4: Rose (Course ID 5, e.g. ECE-202)
  {
    card: 'bg-rose-50/70 dark:bg-rose-950/40 border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100',
    badge: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 border border-rose-200 dark:border-rose-800',
    border: 'border-l-4 border-l-rose-600 dark:border-l-rose-500',
  },
  // 5: Cyan
  {
    card: 'bg-cyan-50/70 dark:bg-cyan-950/40 border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100',
    badge: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-800',
    border: 'border-l-4 border-l-cyan-600 dark:border-l-cyan-500',
  },
  // 6: Indigo
  {
    card: 'bg-indigo-50/70 dark:bg-indigo-950/40 border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100',
    badge: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800',
    border: 'border-l-4 border-l-indigo-600 dark:border-l-indigo-500',
  },
  // 7: Teal
  {
    card: 'bg-teal-50/70 dark:bg-teal-950/40 border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100',
    badge: 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200 border border-teal-200 dark:border-teal-800',
    border: 'border-l-4 border-l-teal-600 dark:border-l-teal-500',
  },
  // 8: Violet
  {
    card: 'bg-violet-50/70 dark:bg-violet-950/40 border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100',
    badge: 'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200 border border-violet-200 dark:border-violet-800',
    border: 'border-l-4 border-l-violet-600 dark:border-l-violet-500',
  },
  // 9: Orange
  {
    card: 'bg-orange-50/70 dark:bg-orange-950/40 border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100',
    badge: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200 border border-orange-200 dark:border-orange-800',
    border: 'border-l-4 border-l-orange-600 dark:border-l-orange-500',
  },
];

// Course palette helper - stable derived color
export function getCoursePalette(codeOrCourseId = '', courseId = null) {
  let index = 0;
  if (courseId !== null && courseId !== undefined && !isNaN(Number(courseId))) {
    index = (Number(courseId) - 1) % PALETTES.length;
  } else if (typeof codeOrCourseId === 'number') {
    index = (codeOrCourseId - 1) % PALETTES.length;
  } else if (typeof codeOrCourseId === 'string' && codeOrCourseId.trim()) {
    let hash = 0;
    for (let i = 0; i < codeOrCourseId.length; i++) {
      hash = (hash * 31 + codeOrCourseId.charCodeAt(i)) >>> 0;
    }
    index = hash % PALETTES.length;
  }
  if (index < 0) index = (index + PALETTES.length) % PALETTES.length;
  return PALETTES[index] || PALETTES[0];
}

export function getTypeBadge(type = 'lecture') {
  switch (type.toLowerCase()) {
    case 'lab':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700';
    case 'tutorial':
      return 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200 border border-teal-300 dark:border-teal-700';
    case 'lecture':
    default:
      return 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border border-blue-300 dark:border-blue-700';
  }
}

// Convert HH:MM string to total minutes
function timeToMinutes(timeStr = '00:00') {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Lane Layout Algorithm (Interval Partitioning)
 * Takes all slots for a given day, groups overlapping slots into connected clusters,
 * assigns lanes greedily, and calculates percentage width and left offsets.
 */
function layoutDaySlots(daySlots = []) {
  if (daySlots.length === 0) return [];

  // Parse minutes
  const parsedSlots = daySlots.map((slot) => {
    const startMin = timeToMinutes(slot.start_time);
    const endMin = timeToMinutes(slot.end_time);
    const duration = Math.max(15, endMin - startMin);
    return {
      ...slot,
      startMin,
      endMin,
      duration,
      topPx: Math.max(0, (startMin - BASE_MINUTES) * PIXELS_PER_MINUTE),
      heightPx: duration * PIXELS_PER_MINUTE,
    };
  });

  // Sort by start time ascending, then by duration descending
  parsedSlots.sort((a, b) => a.startMin - b.startMin || b.duration - a.duration);

  // Group into connected overlap clusters
  const clusters = [];
  let currentCluster = [parsedSlots[0]];
  let currentClusterEnd = parsedSlots[0].endMin;

  for (let i = 1; i < parsedSlots.length; i++) {
    const slot = parsedSlots[i];
    if (slot.startMin < currentClusterEnd) {
      // Overlaps transitively with current cluster
      currentCluster.push(slot);
      currentClusterEnd = Math.max(currentClusterEnd, slot.endMin);
    } else {
      // New disjoint cluster
      clusters.push(currentCluster);
      currentCluster = [slot];
      currentClusterEnd = slot.endMin;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Allocate lanes within each cluster
  const result = [];
  for (const cluster of clusters) {
    const lanes = []; // stores endMin for each lane

    for (const slot of cluster) {
      let assignedLane = -1;
      for (let l = 0; l < lanes.length; l++) {
        if (lanes[l] <= slot.startMin) {
          assignedLane = l;
          lanes[l] = slot.endMin;
          break;
        }
      }
      if (assignedLane === -1) {
        assignedLane = lanes.length;
        lanes.push(slot.endMin);
      }
      slot.lane = assignedLane;
    }

    const totalLanes = lanes.length;
    for (const slot of cluster) {
      slot.totalLanes = totalLanes;
      slot.widthPercent = 100 / totalLanes;
      slot.leftPercent = (slot.lane / totalLanes) * 100;
      result.push(slot);
    }
  }

  return result;
}

export default function TimetableGrid({
  slots = [],
  canManage = false,
  onEditSlot = () => {},
  onDeleteSlot = () => {},
  onAddSlot = () => {},
  onAutoGenerate = null,
  title = 'Weekly Academic Schedule',
  subtitle = 'View and manage scheduled lecture, lab, and tutorial slots',
}) {
  // Current day index: 1 = Monday to 6 = Saturday (0 = Sunday -> default to Monday)
  const realDayOfWeek = new Date().getDay();
  const currentDayId = realDayOfWeek >= 1 && realDayOfWeek <= 6 ? realDayOfWeek : 1;
  const [activeMobileDay, setActiveMobileDay] = useState(currentDayId);

  // Popover State (Portal with Viewport Clamping)
  const [activePopover, setActivePopover] = useState(null); // { slot, rect, locked }
  const popoverRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const isLockedRef = useRef(false);

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Close popover on outside click or Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        isLockedRef.current = false;
        setActivePopover(null);
      }
    };

    const handlePointerDown = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        isLockedRef.current = false;
        setActivePopover(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
    };
  }, []);

  // Filter slots for active mobile day
  const mobileSlots = slots
    .filter((s) => s.day_of_week === activeMobileDay)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Handle slot card click/tap (locks popover)
  const handleSlotCardClick = (e, slot) => {
    e.stopPropagation();
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    isLockedRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    setActivePopover({ slot, rect, locked: true });
  };

  // Handle hover enter
  const handleSlotCardMouseEnter = (e, slot) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    const target = e.currentTarget;
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isLockedRef.current) {
        const rect = target.getBoundingClientRect();
        setActivePopover({ slot, rect, locked: false });
      }
    }, 120);
  };

  // Handle hover leave
  const handleSlotCardMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isLockedRef.current) {
        setActivePopover(null);
      }
    }, 200);
  };

  // Handle empty cell click for HOD
  const handleEmptyCellClick = (dayId, hourStr) => {
    if (!canManage) return;
    const [h, m] = hourStr.split(':').map(Number);
    const nextHour = Math.min(18, h + 1);
    const endStr = `${String(nextHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    onAddSlot({
      day_of_week: dayId,
      start_time: hourStr,
      end_time: endStr,
    });
  };

  // Calculate viewport-clamped coordinates for popover
  const getPopoverStyle = () => {
    if (!activePopover || !activePopover.rect) return { display: 'none' };
    const { rect } = activePopover;
    const popoverWidth = 280;
    const popoverHeight = 220; // estimated max height

    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;

    // Horizontal centering relative to card, clamped inside viewport
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (left < 12) left = 12;
    if (left + popoverWidth > vw - 12) left = vw - popoverWidth - 12;

    // Vertical placement: prefer below, flip above if overflowing bottom
    let top = rect.bottom + 8;
    if (top + popoverHeight > vh - 12) {
      top = Math.max(12, rect.top - popoverHeight - 8);
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${popoverWidth}px`,
      zIndex: 9999,
    };
  };

  return (
    <div className="space-y-6 print:hidden print:!hidden no-print">
      {/* Header and Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-xs no-print">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
            <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span>{title}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
            {subtitle}
          </p>
        </div>

        {/* Action Buttons: Wrap onto two lines on narrow screens, Add Slot always visible */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-shrink-0">
          {canManage && onAutoGenerate && (
            <button
              onClick={onAutoGenerate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition shadow-xs cursor-pointer"
              id="auto-generate-btn"
              type="button"
              title="Automatically generate conflict-free timetable"
            >
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Auto-Generate</span>
            </button>
          )}

          {canManage && (
            <button
              onClick={() => onAddSlot()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition shadow-xs cursor-pointer"
              id="add-slot-btn"
              type="button"
            >
              <Plus className="w-4 h-4" />
              <span>Add Slot</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/80 dark:hover:bg-slate-700 transition cursor-pointer"
            title="Print weekly timetable"
            id="print-timetable-btn"
            type="button"
          >
            <Printer className="w-4 h-4" />
            <span>Print Schedule</span>
          </button>
        </div>
      </div>

      {/* Mobile View: Day Switcher + Cards (< md) */}
      <div className="block md:hidden no-print">
        {/* Day Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          {DAYS.map((day) => {
            const isToday = day.id === realDayOfWeek;
            const isSelected = day.id === activeMobileDay;
            const count = slots.filter((s) => s.day_of_week === day.id).length;

            return (
              <button
                key={day.id}
                type="button"
                onClick={() => setActiveMobileDay(day.id)}
                className={`flex-1 min-w-[70px] py-2 px-2.5 rounded-xl text-center transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold">{day.short}</div>
                <div className="text-[10px] font-medium opacity-85 mt-0.5">
                  {count} {count === 1 ? 'class' : 'classes'}
                </div>
                {isToday && (
                  <span
                    className={`inline-block mt-1 text-[8px] font-black px-1 rounded uppercase tracking-wider ${
                      isSelected
                        ? 'bg-white text-blue-700'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    Today
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile Class Cards List */}
        <div className="mt-4 space-y-3">
          {mobileSlots.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-slate-200/80 dark:border-slate-700 shadow-xs">
              <CalendarIcon className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
              <p className="text-slate-600 dark:text-slate-400 text-xs font-medium">
                No classes scheduled for {DAYS.find((d) => d.id === activeMobileDay)?.name}.
              </p>
              {canManage && (
                <button
                  type="button"
                  onClick={() => onAddSlot({ day_of_week: activeMobileDay, start_time: '09:00', end_time: '10:00' })}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 rounded-lg hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Schedule a class
                </button>
              )}
            </div>
          ) : (
            mobileSlots.map((slot) => {
              const palette = getCoursePalette(slot.course_code, slot.course_id);
              return (
                <div
                  key={slot.id}
                  onClick={(e) => handleSlotCardClick(e, slot)}
                  className={`p-4 rounded-2xl border ${palette.card} ${palette.border} shadow-xs space-y-2 cursor-pointer transition hover:shadow-sm ${
                    slot.is_proposed
                      ? '!border-dashed !border-2 !border-indigo-500 dark:!border-indigo-400 ring-2 ring-indigo-400/20'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm tracking-tight">
                        {slot.course_code}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getTypeBadge(
                          slot.slot_type
                        )}`}
                      >
                        {slot.slot_type}
                      </span>
                      {slot.is_proposed && (
                        <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-indigo-600 text-white tracking-wider">
                          New
                        </span>
                      )}
                      {slot.is_existing && (
                        <span className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          Kept
                        </span>
                      )}
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onEditSlot(slot)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 bg-white/80 dark:bg-slate-700/80 rounded-lg border border-slate-200 dark:border-slate-600"
                          title="Edit slot"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSlot(slot)}
                          className="p-1.5 text-red-600 hover:text-red-700 dark:text-red-400 bg-white/80 dark:bg-slate-700/80 rounded-lg border border-slate-200 dark:border-slate-600"
                          title="Delete slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs font-semibold line-clamp-1">
                    {slot.course_name}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] opacity-90 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-center gap-1 font-bold">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {slot.start_time} – {slot.end_time}
                    </div>
                    <div className="flex items-center gap-1 font-medium">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      Room {slot.room}
                    </div>
                    {slot.faculty_name && (
                      <div className="flex items-center gap-1 font-medium">
                        <User className="w-3 h-3 text-slate-500" />
                        {slot.faculty_name}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Desktop & Printable Weekly Timetable Grid */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-xs overflow-auto max-h-[calc(100vh-210px)] min-h-[480px] print:border-black print:rounded-none print:shadow-none print:overflow-visible print:max-h-none print:min-h-0">
        {/* Day Column Headers */}
        <div className="sticky top-0 z-20 grid grid-cols-[70px_repeat(6,1fr)] border-b border-slate-200/80 dark:border-slate-700 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs font-bold text-xs text-slate-600 dark:text-slate-300 print:static print:bg-white print:text-black print:border-black">
          <div className="sticky left-0 z-30 p-3 text-center border-r border-slate-200/80 dark:border-slate-700 bg-slate-100 dark:bg-slate-850 flex items-center justify-center print:static print:bg-white print:border-black">
            <Clock className="w-4 h-4 text-slate-400 print:text-black" />
          </div>
          {DAYS.map((day) => {
            const isToday = day.id === realDayOfWeek;
            return (
              <div
                key={day.id}
                className={`p-3 text-center border-r last:border-r-0 border-slate-200/80 dark:border-slate-700 print:border-black ${
                  isToday
                    ? 'bg-blue-50/80 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 font-extrabold'
                    : ''
                }`}
              >
                <div className="text-xs uppercase tracking-wider">{day.name}</div>
                {isToday && (
                  <span className="inline-block mt-0.5 text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white px-1.5 py-0.2 rounded-full print:hidden">
                    Today
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Calendar Body: 800px total height (10 hours * 80px/hr) */}
        <div className="relative grid grid-cols-[70px_repeat(6,1fr)] h-[800px] select-none print:h-[650px]">
          {/* Left Time Axis Gutter */}
          <div className="sticky left-0 z-10 border-r border-slate-200/80 dark:border-slate-700 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs print:static print:border-black print:bg-white">
            {HOURS.map((hour, idx) => (
              <div
                key={hour}
                style={{ top: `${idx * PIXELS_PER_HOUR}px` }}
                className={`absolute w-full -translate-y-1/2 pr-2.5 text-right text-[11px] font-mono font-medium text-slate-400 dark:text-slate-500 print:text-black ${
                  idx === 0 ? 'translate-y-0.5' : idx === 10 ? '-translate-y-full' : ''
                }`}
              >
                {hour}
              </div>
            ))}
          </div>

          {/* 6 Day Columns */}
          {DAYS.map((day) => {
            const isToday = day.id === realDayOfWeek;
            const dayRawSlots = slots.filter((s) => s.day_of_week === day.id);
            const laidOutSlots = layoutDaySlots(dayRawSlots);

            return (
              <div
                key={day.id}
                className={`relative border-r last:border-r-0 border-slate-200/80 dark:border-slate-700 print:border-black ${
                  isToday
                    ? 'bg-blue-50/15 dark:bg-blue-950/10'
                    : 'bg-white dark:bg-slate-800'
                }`}
              >
                {/* 10 Hourly Rows (interactive empty cells for HOD) */}
                {HOURS.slice(0, 10).map((hour, idx) => (
                  <div
                    key={hour}
                    onClick={() => handleEmptyCellClick(day.id, hour)}
                    style={{
                      top: `${idx * PIXELS_PER_HOUR}px`,
                      height: `${PIXELS_PER_HOUR}px`,
                    }}
                    className={`absolute inset-x-0 border-t border-slate-100 dark:border-slate-700/60 print:border-slate-300 transition-colors ${
                      canManage
                        ? 'cursor-pointer hover:bg-blue-50/40 dark:hover:bg-slate-700/30'
                        : 'cursor-default'
                    }`}
                    title={canManage ? `Click to schedule slot on ${day.name} at ${hour}` : undefined}
                  />
                ))}

                {/* Bottom line at 18:00 */}
                <div
                  style={{ top: `${10 * PIXELS_PER_HOUR}px` }}
                  className="absolute inset-x-0 border-t border-slate-200 dark:border-slate-700 pointer-events-none print:border-black"
                />

                {/* Minute-Positioned Slots in Calculated Lanes */}
                {laidOutSlots.map((slot) => {
                  const palette = getCoursePalette(slot.course_code, slot.course_id);
                  const isNarrow = slot.totalLanes > 1;
                  const isFull = slot.duration >= 120 && slot.totalLanes === 1;

                  return (
                    <div
                      key={slot.id}
                      onClick={(e) => handleSlotCardClick(e, slot)}
                      onMouseEnter={(e) => handleSlotCardMouseEnter(e, slot)}
                      onMouseLeave={handleSlotCardMouseLeave}
                      style={{
                        top: `${slot.topPx}px`,
                        height: `${slot.heightPx}px`,
                        left: `${slot.leftPercent}%`,
                        width: `${slot.widthPercent}%`,
                        padding: '3px 4px',
                      }}
                      className="absolute rounded-lg overflow-hidden z-10 transition-all cursor-pointer print:border-black print:bg-white print:text-black print:shadow-none"
                    >
                      <div
                        className={`w-full h-full rounded-md border p-1.5 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md hover:ring-1 hover:ring-blue-400 dark:hover:ring-blue-500 transition ${palette.card} ${palette.border} ${
                          slot.is_proposed
                            ? '!border-dashed !border-2 !border-indigo-500 dark:!border-indigo-400 ring-2 ring-indigo-400/25'
                            : ''
                        }`}
                      >
                        {/* Line 1: Course code, type badge, and Edit/Delete icon buttons */}
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
                            <span className="font-extrabold text-[11px] leading-tight truncate tracking-tight text-slate-900 dark:text-slate-100">
                              {slot.course_code}
                            </span>
                            <span
                              className={`text-[10px] sm:text-[11px] uppercase font-bold px-1.5 py-0.2 rounded shrink-0 leading-none print:border print:border-black ${getTypeBadge(
                                slot.slot_type
                              )}`}
                            >
                              {slot.slot_type}
                            </span>
                            {slot.is_proposed && (
                              <span className="text-[8px] sm:text-[9px] uppercase font-black px-1 py-0.2 rounded bg-indigo-600 text-white tracking-wider print:hidden shrink-0">
                                New
                              </span>
                            )}
                            {slot.is_existing && (
                              <span className="text-[8px] sm:text-[9px] uppercase font-semibold px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 print:hidden shrink-0">
                                Kept
                              </span>
                            )}
                          </div>

                          {canManage && !isNarrow && (
                            <div
                              className="flex items-center gap-0.5 print:hidden shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => onEditSlot(slot)}
                                className="p-1 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 bg-white/90 dark:bg-slate-800/90 rounded border border-slate-200 dark:border-slate-700 shadow-2xs transition cursor-pointer"
                                title="Edit slot"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteSlot(slot)}
                                className="p-1 text-rose-600 hover:text-rose-700 dark:text-rose-400 bg-white/90 dark:bg-slate-800/90 rounded border border-slate-200 dark:border-slate-700 shadow-2xs transition cursor-pointer"
                                title="Delete slot"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Line 2: Course title truncated with ellipsis (and faculty name for full 2h+ card) */}
                        <div className="min-w-0 my-0.5">
                          <div
                            className={`font-semibold leading-tight text-slate-900 dark:text-slate-100 ${
                              isFull ? 'text-xs line-clamp-2' : 'text-[11px] truncate'
                            }`}
                            title={slot.course_name}
                          >
                            {slot.course_name}
                          </div>
                          {isFull && slot.faculty_name && (
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1 mt-1 truncate">
                              <User className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{slot.faculty_name}</span>
                            </div>
                          )}
                        </div>

                        {/* Line 3: Room on the left and full time range on the right */}
                        <div className="flex items-center justify-between text-[11px] font-semibold pt-1 border-t border-slate-200/60 dark:border-slate-700/60 print:border-black text-slate-900 dark:text-slate-100 min-w-0">
                          <span className="truncate flex items-center gap-1 min-w-0">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{slot.room}</span>
                          </span>
                          <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 shrink-0 ml-1">
                            {slot.start_time}–{slot.end_time}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Portal Details Popover: Never clipped by grid scroll container, clamped in viewport */}
      {activePopover &&
        createPortal(
          <div
            ref={popoverRef}
            style={getPopoverStyle()}
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            }}
            onMouseLeave={() => {
              if (!isLockedRef.current) {
                setActivePopover(null);
              }
            }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150 no-print"
          >
            {/* Popover Header */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {activePopover.slot.course_code}
                </span>
                <span
                  className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${getTypeBadge(
                    activePopover.slot.slot_type
                  )}`}
                >
                  {activePopover.slot.slot_type}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  isLockedRef.current = false;
                  setActivePopover(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Course Title */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug">
                {activePopover.slot.course_name}
              </h4>
            </div>

            {/* Metadata Rows */}
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span className="font-semibold">
                  {activePopover.slot.start_time} – {activePopover.slot.end_time}
                </span>
                <span className="text-[10px] text-slate-400">
                  ({activePopover.slot.duration || 60} mins)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>Room {activePopover.slot.room}</span>
              </div>

              {activePopover.slot.faculty_name && (
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                  <span className="truncate">{activePopover.slot.faculty_name}</span>
                </div>
              )}
            </div>

            {/* Explicit Edit / Delete Buttons for HOD (never triggered on first tap) */}
            {canManage && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const slot = activePopover.slot;
                    isLockedRef.current = false;
                    setActivePopover(null);
                    onEditSlot(slot);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Edit Slot</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const slot = activePopover.slot;
                    isLockedRef.current = false;
                    setActivePopover(null);
                    onDeleteSlot(slot);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-red-600 hover:bg-red-700 transition cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Slot</span>
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

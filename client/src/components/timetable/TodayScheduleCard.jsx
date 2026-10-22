import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { timetableApi } from '../../services/api';
import { getCoursePalette, getTypeBadge } from './TimetableGrid';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  User,
  AlertCircle
} from 'lucide-react';

export default function TodayScheduleCard({
  timetableLink = '/student/timetable',
  isFaculty = false
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchSchedule() {
      try {
        const res = await timetableApi.getTodaySchedule();
        if (mounted && res.success) {
          setData(res);
        }
      } catch (err) {
        console.error('Failed to fetch today schedule:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchSchedule();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
        <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  const {
    today_day_name = 'Today',
    has_classes_today = false,
    all_classes_ended = false,
    today_slots = [],
    next_class = null,
    next_working_day_slots = [],
    next_working_day_name = 'Next Working Day'
  } = data || {};

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Today's Classes</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                ({today_day_name})
              </span>
            </h3>
          </div>
        </div>

        <Link
          to={timetableLink}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          <span>View Full Timetable</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Case 1: Classes today & some still upcoming or ongoing */}
      {has_classes_today && !all_classes_ended && (
        <div className="space-y-2.5">
          {today_slots.map((slot) => {
            const isNext = next_class && next_class.id === slot.id;
            const palette = getCoursePalette(slot.course_code);

            return (
              <div
                key={slot.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isNext
                    ? 'border-2 border-blue-500 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 shadow-xs'
                    : 'border-slate-100 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600">
                      {slot.course_code}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded ${getTypeBadge(
                        slot.slot_type
                      )}`}
                    >
                      {slot.slot_type}
                    </span>
                    {/* Solid Next Label without animations (Constraint 3) */}
                    {isNext && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded">
                        Next
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {slot.start_time} – {slot.end_time}
                    </span>
                  </div>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                    {slot.course_name}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 shrink-0 ml-2">
                    <MapPin className="w-3.5 h-3.5" />
                    Room {slot.room}
                  </span>
                </div>

                {slot.faculty_name && !isFaculty && (
                  <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{slot.faculty_name}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Case 2: Classes existed today, but all have ended (Constraint 4) */}
      {has_classes_today && all_classes_ended && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              No more classes today. All scheduled slots have concluded.
            </span>
            <span className="text-slate-400">
              {today_slots.length} {today_slots.length === 1 ? 'class' : 'classes'} completed
            </span>
          </div>

          {next_working_day_slots.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>Upcoming: {next_working_day_name}'s Schedule</span>
              </h4>

              <div className="space-y-2">
                {next_working_day_slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {slot.course_code}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 line-clamp-1">
                        {slot.course_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-slate-600 dark:text-slate-300">
                      <span className="font-medium">{slot.start_time} – {slot.end_time}</span>
                      <span className="font-semibold">Room {slot.room}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Case 3: No classes scheduled today (e.g. Sunday or non-working day) */}
      {!has_classes_today && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs text-center">
            <Calendar className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              No classes scheduled for today ({today_day_name}).
            </p>
            <p className="mt-0.5 text-slate-500">Enjoy your academic break or study sessions.</p>
          </div>

          {next_working_day_slots.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>Upcoming: {next_working_day_name}'s Schedule</span>
              </h4>

              <div className="space-y-2">
                {next_working_day_slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {slot.course_code}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 line-clamp-1">
                        {slot.course_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-slate-600 dark:text-slate-300">
                      <span className="font-medium">{slot.start_time} – {slot.end_time}</span>
                      <span className="font-semibold">Room {slot.room}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

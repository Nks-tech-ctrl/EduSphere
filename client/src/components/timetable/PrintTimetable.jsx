import React from 'react';

const DAYS = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
];

/**
 * Dedicated PrintTimetable Component
 * Completely hidden on screen (hidden), displayed exclusively when printing (print:!block).
 * Uses a plain HTML <table> with normal flow (no absolute positioning, no sticky headers, no fixed heights).
 * Styled specifically for A4 landscape with 8mm margins to fit cleanly onto ONE page.
 */
export default function PrintTimetable({
  slots = [],
  title = 'Department Timetable',
  departmentName = '',
  isFaculty = false,
}) {
  const printDate = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="hidden print:!block print-only-timetable w-full bg-white text-black font-sans leading-normal">
      {/* Print Header */}
      <div className="mb-2 text-center border-b-2 border-black pb-1.5">
        <h1 className="text-lg font-black uppercase tracking-wider text-black leading-tight">
          Edusphere Institute of Technology
        </h1>
        <h2 className="text-sm font-bold text-black mt-0.5 leading-tight">
          {title} — Weekly Academic Schedule (08:00 – 18:00)
        </h2>
        <p className="text-[10pt] text-black mt-0.5 font-medium leading-tight">
          {departmentName ? `${departmentName} | ` : ''}Printed on: {printDate}
        </p>
      </div>

      {/* 6-Column Weekly Schedule Table */}
      <table className="w-full table-fixed border-collapse border border-black text-black">
        <colgroup>
          <col style={{ width: '16.666%' }} />
          <col style={{ width: '16.666%' }} />
          <col style={{ width: '16.666%' }} />
          <col style={{ width: '16.666%' }} />
          <col style={{ width: '16.666%' }} />
          <col style={{ width: '16.666%' }} />
        </colgroup>
        <thead>
          <tr className="bg-slate-100 border-b border-black">
            {DAYS.map((day) => (
              <th
                key={day.id}
                className="border border-black py-1 px-1 text-center font-bold text-[10.5pt] uppercase tracking-wider text-black bg-slate-100"
              >
                {day.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {DAYS.map((day) => {
              const daySlots = (slots || [])
                .filter((s) => Number(s.day_of_week) === Number(day.id))
                .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

              return (
                <td
                  key={day.id}
                  className="border border-black p-1 align-top bg-white text-black"
                >
                  {daySlots.length === 0 ? (
                    <div className="text-center font-bold text-slate-400 py-6 text-sm select-none">
                      —
                    </div>
                  ) : (
                    daySlots.map((slot) => {
                      const roomText = slot.room
                        ? slot.room.toLowerCase().startsWith('room')
                          ? slot.room
                          : `Room ${slot.room}`
                        : '';
                      const slotType = (slot.slot_type || 'Lecture').toUpperCase();

                      return (
                        <div
                          key={slot.id}
                          style={{
                            breakInside: 'avoid',
                            pageBreakInside: 'avoid',
                          }}
                          className="border border-black rounded-xs p-1 mb-1 last:mb-0 bg-white text-black text-[10pt] leading-tight"
                        >
                          {/* Line 1: Time Range & Slot Type Badge */}
                          <div className="flex items-center justify-between font-bold text-[9.5pt] text-black">
                            <span>
                              {slot.start_time} – {slot.end_time}
                            </span>
                            <span className="text-[8pt] uppercase px-1 border border-black rounded-xs font-bold text-black">
                              {slotType}
                            </span>
                          </div>

                          {/* Line 2: Course Code & Room */}
                          <div className="flex items-center justify-between font-black text-[10pt] mt-0.5 text-black">
                            <span>{slot.course_code}</span>
                            {roomText && (
                              <span className="font-bold text-[9pt] text-black">
                                {roomText}
                              </span>
                            )}
                          </div>

                          {/* Line 3: Course Title */}
                          <div className="text-[9.5pt] font-semibold leading-tight mt-0.5 text-black">
                            {slot.course_name}
                          </div>

                          {/* Line 4: Faculty Name (omitted on Faculty page) */}
                          {!isFaculty && slot.faculty_name && (
                            <div className="text-[9pt] italic font-medium text-black mt-0.5">
                              {slot.faculty_name}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>

      {/* Dedicated Print Media Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 8mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          html, body, #root, .min-h-screen, main, div, section, article {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
          }
          .no-print, header, nav, aside, .sidebar, [role="navigation"], #print-timetable-btn, #add-slot-btn, .space-y-6.print\\:hidden {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          .print-only-timetable {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

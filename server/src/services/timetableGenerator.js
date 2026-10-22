const db = require('../config/db');

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CANDIDATE_HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00'
];

/**
 * Deterministic Mulberry32 Seeded PRNG
 * @param {number|string} seed
 * @returns {() => number} Returns float in [0, 1)
 */
function createPrng(seed = 1024) {
  let s = 0;
  if (typeof seed === 'number') {
    s = seed | 0;
  } else if (typeof seed === 'string') {
    for (let i = 0; i < seed.length; i++) {
      s = (s * 31 + seed.charCodeAt(i)) | 0;
    }
  } else {
    s = 1024;
  }
  return function() {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Convert HH:MM string to minutes from 00:00
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Convert minutes from 00:00 to HH:MM string
 */
function minutesToTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Check if two time intervals overlap (strictly): startA < endB && startB < endA
 * Touching intervals (e.g. 10:00-11:00 and 11:00-12:00) do NOT overlap.
 */
function isOverlapping(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

/**
 * Generate Timetable Algorithm (Phase 12B)
 *
 * @param {Object} options
 * @param {number} options.departmentId - HOD's department ID
 * @param {number[]} options.semesters - Array of semester numbers (e.g. [3, 4])
 * @param {number[]} [options.workingDays=[1,2,3,4,5]] - Working days (1=Mon ... 6=Sat)
 * @param {string} [options.breakStart='13:15'] - Daily break start time
 * @param {string} [options.breakEnd='14:00'] - Daily break end time
 * @param {number} [options.maxTeachingHoursPerDay=4] - Max teaching hours per faculty per day
 * @param {boolean} [options.replaceExisting=false] - Whether existing slots for these semesters are replaced
 * @param {number|string} [options.seed=1024] - Deterministic PRNG seed
 * @returns {Object} Result { success, slots, unplaced, stats, existingDeletedCount, seed }
 */
function generateTimetable({
  departmentId,
  semesters = [],
  workingDays = [1, 2, 3, 4, 5],
  breakStart = '13:15',
  breakEnd = '14:00',
  maxTeachingHoursPerDay = 4,
  replaceExisting = false,
  seed = 1024
}) {
  const rng = createPrng(seed);
  const sanitizedDays = Array.isArray(workingDays) && workingDays.length > 0
    ? workingDays.map(Number).filter(d => d >= 1 && d <= 6)
    : [1, 2, 3, 4, 5];
  const sortedDays = Array.from(new Set(sanitizedDays)).sort((a, b) => a - b);

  const cleanBreakStart = (breakStart || '13:15').trim();
  const cleanBreakEnd = (breakEnd || '14:00').trim();
  const maxHours = Number(maxTeachingHoursPerDay) || 4;
  const maxMinutesPerDay = maxHours * 60;

  // 1. Fetch courses for department and selected semesters
  if (!Array.isArray(semesters) || semesters.length === 0) {
    return {
      success: false,
      message: 'At least one semester must be selected for timetable generation.',
      slots: [],
      unplaced: [],
      stats: { total_sessions: 0, placed_sessions: 0, unplaced_sessions: 0 },
      existingDeletedCount: 0,
      seed
    };
  }

  const semPlaceholders = semesters.map(() => '?').join(',');
  const courses = db.prepare(`
    SELECT 
      c.id,
      c.code,
      c.name,
      c.department_id,
      c.faculty_id,
      c.semester,
      c.weekly_lectures,
      c.lab_hours_per_week,
      c.course_type,
      u.name AS faculty_name,
      d.code AS department_code,
      d.name AS department_name
    FROM courses c
    JOIN users u ON c.faculty_id = u.id
    JOIN departments d ON c.department_id = d.id
    WHERE c.department_id = ?
      AND c.semester IN (${semPlaceholders})
    ORDER BY c.code ASC
  `).all(departmentId, ...semesters);

  if (courses.length === 0) {
    return {
      success: true,
      message: 'No courses found for the selected department and semester(s).',
      slots: [],
      unplaced: [],
      stats: { total_sessions: 0, placed_sessions: 0, unplaced_sessions: 0 },
      existingDeletedCount: 0,
      seed
    };
  }

  // 2. Fetch available rooms
  const rooms = db.prepare(`
    SELECT id, name, room_type, capacity
    FROM rooms
    ORDER BY capacity DESC, name ASC
  `).all();

  // 3. Fetch existing slots across all departments
  const existingAllSlots = db.prepare(`
    SELECT 
      s.id,
      s.course_id,
      s.day_of_week,
      s.start_time,
      s.end_time,
      s.room,
      s.slot_type,
      c.department_id,
      c.semester,
      c.faculty_id,
      c.code AS course_code,
      c.name AS course_name,
      u.name AS faculty_name,
      d.code AS department_code
    FROM timetable_slots s
    JOIN courses c ON s.course_id = c.id
    JOIN users u ON c.faculty_id = u.id
    JOIN departments d ON c.department_id = d.id
  `).all();

  // Determine existing slots to preserve as obstacles
  let activeObstacles = [];
  let existingDeletedCount = 0;

  for (const slot of existingAllSlots) {
    const isThisDeptAndSem = (slot.department_id === departmentId && semesters.includes(slot.semester));
    if (replaceExisting && isThisDeptAndSem) {
      existingDeletedCount++;
    } else {
      activeObstacles.push({
        ...slot,
        startMin: timeToMinutes(slot.start_time),
        endMin: timeToMinutes(slot.end_time),
        isExisting: true
      });
    }
  }

  // 4. Build list of sessions to place
  const sessions = [];
  for (const course of courses) {
    const lecturesCount = Math.max(0, parseInt(course.weekly_lectures, 10) || 0);
    const labHours = Math.max(0, parseInt(course.lab_hours_per_week, 10) || 0);

    // 60-minute lectures
    for (let i = 0; i < lecturesCount; i++) {
      sessions.push({
        sessionId: `${course.code}-lec-${i + 1}`,
        course_id: course.id,
        course_code: course.code,
        course_name: course.name,
        department_id: course.department_id,
        semester: course.semester,
        faculty_id: course.faculty_id,
        faculty_name: course.faculty_name,
        slot_type: 'lecture',
        duration_minutes: 60,
        session_num: i + 1,
        total_lectures: lecturesCount,
        is_odd_lab: false
      });
    }

    // Lab sessions: 120-minute sessions + optional 60-minute session for odd remainder
    const fullLabs = Math.floor(labHours / 2);
    const hasOddHour = (labHours % 2) !== 0;

    for (let i = 0; i < fullLabs; i++) {
      sessions.push({
        sessionId: `${course.code}-lab-${i + 1}`,
        course_id: course.id,
        course_code: course.code,
        course_name: course.name,
        department_id: course.department_id,
        semester: course.semester,
        faculty_id: course.faculty_id,
        faculty_name: course.faculty_name,
        slot_type: 'lab',
        duration_minutes: 120,
        session_num: i + 1,
        total_lectures: lecturesCount,
        is_odd_lab: false
      });
    }

    if (hasOddHour) {
      sessions.push({
        sessionId: `${course.code}-lab-odd`,
        course_id: course.id,
        course_code: course.code,
        course_name: course.name,
        department_id: course.department_id,
        semester: course.semester,
        faculty_id: course.faculty_id,
        faculty_name: course.faculty_name,
        slot_type: 'lab',
        duration_minutes: 60,
        session_num: fullLabs + 1,
        total_lectures: lecturesCount,
        is_odd_lab: true
      });
    }
  }

  // 5. Order sessions hardest to easiest
  // Labs first, then faculty with most sessions, then courses with most sessions
  const facultyCounts = {};
  const courseCounts = {};
  for (const s of sessions) {
    facultyCounts[s.faculty_id] = (facultyCounts[s.faculty_id] || 0) + 1;
    courseCounts[s.course_id] = (courseCounts[s.course_id] || 0) + 1;
  }

  sessions.sort((a, b) => {
    // 1. Labs first
    if (a.slot_type === 'lab' && b.slot_type !== 'lab') return -1;
    if (a.slot_type !== 'lab' && b.slot_type === 'lab') return 1;

    // 2. Longer labs first (120m before 60m)
    if (a.slot_type === 'lab' && b.slot_type === 'lab' && a.duration_minutes !== b.duration_minutes) {
      return b.duration_minutes - a.duration_minutes;
    }

    // 3. Faculty with most sessions
    const fDiff = (facultyCounts[b.faculty_id] || 0) - (facultyCounts[a.faculty_id] || 0);
    if (fDiff !== 0) return fDiff;

    // 4. Courses with most sessions
    const cDiff = (courseCounts[b.course_id] || 0) - (courseCounts[a.course_id] || 0);
    if (cDiff !== 0) return cDiff;

    // 5. Stable tie-break
    return a.course_id - b.course_id || a.session_num - b.session_num;
  });

  // Precompute candidate time slots for each session duration
  // On the hour between 08:00 and 18:00
  function getCandidateTimes(durationMinutes) {
    const valid = [];
    for (const startStr of CANDIDATE_HOURS) {
      const startMin = timeToMinutes(startStr);
      const endMin = startMin + durationMinutes;
      const endStr = minutesToTime(endMin);

      // Must not end after 18:00
      if (endMin > 18 * 60) continue;

      // Must not overlap break window
      if (isOverlapping(startStr, endStr, cleanBreakStart, cleanBreakEnd)) {
        continue;
      }

      valid.push({
        start_time: startStr,
        end_time: endStr,
        startMin,
        endMin
      });
    }
    return valid;
  }

  const timesByDuration = {
    60: getCandidateTimes(60),
    120: getCandidateTimes(120)
  };

  // Helper to validate a candidate placement against active slots
  function isPlacementValid(session, day, timeObj, roomObj, currentSlots) {
    // Rule 2b: Room type match
    if (roomObj.room_type !== session.slot_type) {
      return false;
    }

    let facultyDayMinutes = 0;

    for (const slot of currentSlots) {
      if (slot.day_of_week !== day) continue;

      // Tally faculty teaching hours for the day
      if (slot.faculty_id === session.faculty_id) {
        facultyDayMinutes += (slot.endMin - slot.startMin);
      }

      // Check overlap: startA < endB && startB < endA
      const overlaps = isOverlapping(timeObj.start_time, timeObj.end_time, slot.start_time, slot.end_time);
      if (overlaps) {
        // Rule 1: Faculty overlap
        if (slot.faculty_id === session.faculty_id) {
          return false;
        }

        // Rule 2a: Room overlap
        if (slot.room.toLowerCase().trim() === roomObj.name.toLowerCase().trim()) {
          return false;
        }

        // Rule 3: Batch overlap (same department and semester)
        if (slot.department_id === session.department_id && slot.semester === session.semester) {
          return false;
        }
      }

      // Rule 4: At most one lecture per day per course (labs excluded)
      if (
        session.slot_type === 'lecture' &&
        slot.course_id === session.course_id &&
        slot.slot_type === 'lecture'
      ) {
        return false;
      }
    }

    // Rule 5: Faculty teaches at most maxHours per day
    if (facultyDayMinutes + session.duration_minutes > maxMinutesPerDay) {
      return false;
    }

    return true;
  }

  // Helper to score a valid candidate slot
  function scoreCandidate(session, day, timeObj, roomObj, currentSlots) {
    let score = 0;

    // 1. Prefer spreading course across different days
    let courseSlotsOnDay = 0;
    for (const slot of currentSlots) {
      if (slot.day_of_week === day && slot.course_id === session.course_id) {
        courseSlotsOnDay++;
      }
    }
    if (courseSlotsOnDay === 0) {
      score += 40; // Bonus for spreading
    } else {
      score -= 30; // Penalty if course already meets today
    }

    // 2. Prefer batches with fewer gaps between classes
    let batchSlotsOnDay = [];
    for (const slot of currentSlots) {
      if (
        slot.day_of_week === day &&
        slot.department_id === session.department_id &&
        slot.semester === session.semester
      ) {
        batchSlotsOnDay.push(slot);
      }
    }

    if (batchSlotsOnDay.length > 0) {
      let isAdjacent = false;
      let minGap = 9999;

      for (const bs of batchSlotsOnDay) {
        if (timeObj.start_time === bs.end_time || timeObj.end_time === bs.start_time) {
          isAdjacent = true;
          break;
        }
        if (timeObj.endMin <= bs.startMin) {
          minGap = Math.min(minGap, bs.startMin - timeObj.endMin);
        } else if (timeObj.startMin >= bs.endMin) {
          minGap = Math.min(minGap, timeObj.startMin - bs.endMin);
        }
      }

      if (isAdjacent) {
        score += 50; // Touching slot: ideal compact schedule
      } else if (minGap < 9999) {
        if (minGap <= 60) {
          score -= Math.floor(minGap / 2);
        } else {
          score -= minGap;
        }
      }
    }

    // 3. Prefer earlier slots
    const startHour = parseInt(timeObj.start_time.split(':')[0], 10);
    score += (18 - startHour) * 3;

    // 4. Deterministic PRNG tie-breaker
    score += rng() * 1.5;

    return score;
  }

  // Get and score all valid candidates for a session
  function getSortedCandidates(session, currentSlots) {
    const candidates = [];
    const timeCandidates = timesByDuration[session.duration_minutes] || [];

    for (const day of sortedDays) {
      for (const timeObj of timeCandidates) {
        for (const roomObj of rooms) {
          if (roomObj.room_type !== session.slot_type) continue;

          if (isPlacementValid(session, day, timeObj, roomObj, currentSlots)) {
            const score = scoreCandidate(session, day, timeObj, roomObj, currentSlots);
            candidates.push({
              session,
              day_of_week: day,
              start_time: timeObj.start_time,
              end_time: timeObj.end_time,
              startMin: timeObj.startMin,
              endMin: timeObj.endMin,
              room: roomObj.name,
              roomObj,
              score
            });
          }
        }
      }
    }

    // Sort descending by score
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  // 6. Limited Backtracking Search (3 seconds and 5,000 attempts)
  const MAX_ATTEMPTS = 5000;
  const TIME_LIMIT_MS = 3000;
  const startTimeMs = Date.now();
  let attempts = 0;

  let currentPlaced = [];
  let bestPlaced = [];

  function search(sessionIndex) {
    attempts++;

    // Track best placement so far
    if (currentPlaced.length > bestPlaced.length) {
      bestPlaced = currentPlaced.map(s => ({ ...s }));
    }

    // All sessions successfully placed!
    if (sessionIndex >= sessions.length) {
      return true;
    }

    // Budget checks
    if (attempts >= MAX_ATTEMPTS || Date.now() - startTimeMs >= TIME_LIMIT_MS) {
      return false;
    }

    const session = sessions[sessionIndex];
    // Combine active obstacles with current placed slots
    const allActive = activeObstacles.concat(currentPlaced);
    const candidates = getSortedCandidates(session, allActive);

    for (const cand of candidates) {
      const placedSlot = {
        sessionId: session.sessionId,
        course_id: session.course_id,
        course_code: session.course_code,
        course_name: session.course_name,
        department_id: session.department_id,
        semester: session.semester,
        faculty_id: session.faculty_id,
        faculty_name: session.faculty_name,
        slot_type: session.slot_type,
        day_of_week: cand.day_of_week,
        start_time: cand.start_time,
        end_time: cand.end_time,
        startMin: cand.startMin,
        endMin: cand.endMin,
        room: cand.room,
        duration_minutes: session.duration_minutes,
        is_odd_lab: session.is_odd_lab
      };

      currentPlaced.push(placedSlot);

      if (search(sessionIndex + 1)) {
        return true;
      }

      currentPlaced.pop();

      if (attempts >= MAX_ATTEMPTS || Date.now() - startTimeMs >= TIME_LIMIT_MS) {
        return false;
      }
    }

    return false;
  }

  // Execute search
  const allPlaced = search(0);
  const finalPlacedSlots = allPlaced ? currentPlaced : bestPlaced;

  // 7. Identify unplaced sessions and build diagnostic reasons
  const placedSessionIds = new Set(finalPlacedSlots.map(s => s.sessionId));
  const unplacedSessions = sessions.filter(s => !placedSessionIds.has(s.sessionId));

  const unplacedWithReasons = unplacedSessions.map(session => {
    let reason = 'Schedule constraints could not be resolved.';

    // Check 1: Infeasible due to 1-lecture/day limit vs working days
    if (session.slot_type === 'lecture' && session.total_lectures > sortedDays.length) {
      reason = `Infeasible: Course requires ${session.total_lectures} weekly lectures, but only ${sortedDays.length} working days are selected (max 1 lecture per day allowed).`;
      return {
        course_id: session.course_id,
        course_code: session.course_code,
        course_name: session.course_name,
        faculty_id: session.faculty_id,
        faculty_name: session.faculty_name,
        slot_type: session.slot_type,
        duration_minutes: session.duration_minutes,
        reason
      };
    }

    // Check 2: Matching room availability
    const matchingRooms = rooms.filter(r => r.room_type === session.slot_type);
    if (matchingRooms.length === 0) {
      reason = `No rooms of type '${session.slot_type}' exist in the institution.`;
      return {
        course_id: session.course_id,
        course_code: session.course_code,
        course_name: session.course_name,
        faculty_id: session.faculty_id,
        faculty_name: session.faculty_name,
        slot_type: session.slot_type,
        duration_minutes: session.duration_minutes,
        reason
      };
    }

    // Check 3: Faculty daily teaching limit
    let facultyFreeAnyDay = false;
    for (const day of sortedDays) {
      let facultyDayMinutes = 0;
      for (const s of activeObstacles.concat(finalPlacedSlots)) {
        if (s.day_of_week === day && s.faculty_id === session.faculty_id) {
          facultyDayMinutes += (s.endMin - s.startMin);
        }
      }
      if (facultyDayMinutes + session.duration_minutes <= maxMinutesPerDay) {
        facultyFreeAnyDay = true;
        break;
      }
    }
    if (!facultyFreeAnyDay) {
      reason = `Faculty ${session.faculty_name} has reached the maximum daily teaching limit (${maxHours}h) on all available days.`;
      return {
        course_id: session.course_id,
        course_code: session.course_code,
        course_name: session.course_name,
        faculty_id: session.faculty_id,
        faculty_name: session.faculty_name,
        slot_type: session.slot_type,
        duration_minutes: session.duration_minutes,
        reason
      };
    }

    // Check 4: Specific room or batch congestion
    if (session.slot_type === 'lab') {
      reason = `No free lab room on any working day without room, faculty or batch conflict.`;
    } else {
      reason = `No clash-free slot found across lecture halls and faculty schedules.`;
    }

    return {
      course_id: session.course_id,
      course_code: session.course_code,
      course_name: session.course_name,
      faculty_id: session.faculty_id,
      faculty_name: session.faculty_name,
      slot_type: session.slot_type,
      duration_minutes: session.duration_minutes,
      reason
    };
  });

  // Clean output slots
  const formattedSlots = finalPlacedSlots.map(s => ({
    course_id: s.course_id,
    course_code: s.course_code,
    course_name: s.course_name,
    department_id: s.department_id,
    semester: s.semester,
    faculty_id: s.faculty_id,
    faculty_name: s.faculty_name,
    slot_type: s.slot_type,
    day_of_week: s.day_of_week,
    start_time: s.start_time,
    end_time: s.end_time,
    room: s.room,
    duration: s.duration_minutes,
    is_proposed: true
  }));

  return {
    success: true,
    slots: formattedSlots,
    unplaced: unplacedWithReasons,
    stats: {
      total_sessions: sessions.length,
      placed_sessions: formattedSlots.length,
      unplaced_sessions: unplacedWithReasons.length
    },
    existingDeletedCount,
    seed
  };
}

module.exports = {
  generateTimetable,
  createPrng,
  timeToMinutes,
  minutesToTime,
  isOverlapping
};

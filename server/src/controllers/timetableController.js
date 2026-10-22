const db = require('../config/db');
const { generateTimetable, isOverlapping } = require('../services/timetableGenerator');

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Helper to get current reference Date object.
 * If DEMO_NOW is set in server/.env and valid, uses it instead of the real clock.
 */
function getReferenceNow() {
  if (process.env.DEMO_NOW && process.env.DEMO_NOW.trim()) {
    const override = new Date(process.env.DEMO_NOW.trim());
    if (!isNaN(override.getTime())) {
      return override;
    }
  }
  return new Date();
}

/**
 * 3-Tier Conflict Check Helper
 * Checks proposed slot against existing timetable slots.
 * @param {Object} proposed - { course_id, day_of_week, start_time, end_time, room, exclude_id }
 * @returns {null|{ message: string, clash_type: string }}
 */
function checkTimetableConflicts({ course_id, day_of_week, start_time, end_time, room, exclude_id }) {
  // 1. Fetch proposed course with faculty, department, and semester
  const proposedCourse = db.prepare(`
    SELECT 
      c.id AS course_id,
      c.code AS course_code,
      c.name AS course_name,
      c.faculty_id,
      c.department_id,
      c.semester,
      u.name AS faculty_name,
      d.code AS department_code
    FROM courses c
    JOIN users u ON c.faculty_id = u.id
    JOIN departments d ON c.department_id = d.id
    WHERE c.id = ?
  `).get(course_id);

  if (!proposedCourse) {
    return { message: 'Course not found.', clash_type: 'not_found' };
  }

  const cleanRoom = room.trim();
  const dayName = DAY_NAMES[day_of_week] || `Day ${day_of_week}`;

  // 2. Fetch existing slots on the same day that overlap:
  // Overlap condition: startA < endB AND startB < endA (touching slots startA = endB do not overlap)
  let query = `
    SELECT 
      s.id,
      s.course_id,
      s.day_of_week,
      s.start_time,
      s.end_time,
      s.room,
      s.slot_type,
      c.code AS course_code,
      c.name AS course_name,
      c.faculty_id,
      c.department_id,
      c.semester,
      u.name AS faculty_name,
      d.code AS department_code
    FROM timetable_slots s
    JOIN courses c ON s.course_id = c.id
    JOIN users u ON c.faculty_id = u.id
    JOIN departments d ON c.department_id = d.id
    WHERE s.day_of_week = ?
      AND s.start_time < ?
      AND s.end_time > ?
  `;
  const params = [day_of_week, end_time, start_time];

  if (exclude_id) {
    query += ` AND s.id != ?`;
    params.push(exclude_id);
  }

  const overlappingSlots = db.prepare(query).all(...params);

  for (const existing of overlappingSlots) {
    // Conflict Rule 1: Faculty overlap (same instructor double-booked)
    if (existing.faculty_id === proposedCourse.faculty_id) {
      return {
        clash_type: 'faculty',
        message: `Faculty clash: ${proposedCourse.faculty_name} is already scheduled to teach ${existing.course_code} in ${existing.room} from ${existing.start_time} to ${existing.end_time} on ${dayName}.`
      };
    }

    // Conflict Rule 2: Room overlap (same room double-booked, case-insensitive)
    if (existing.room.trim().toLowerCase() === cleanRoom.toLowerCase()) {
      return {
        clash_type: 'room',
        message: `Room clash: Room ${cleanRoom} is already booked for ${existing.course_code} (${existing.slot_type}) from ${existing.start_time} to ${existing.end_time} on ${dayName}.`
      };
    }

    // Conflict Rule 3: Batch overlap (students in same department and same semester double-booked)
    if (
      existing.department_id === proposedCourse.department_id &&
      existing.semester === proposedCourse.semester
    ) {
      return {
        clash_type: 'batch',
        message: `Batch clash: ${proposedCourse.department_code} Semester ${proposedCourse.semester} students already have ${existing.course_code} scheduled from ${existing.start_time} to ${existing.end_time} on ${dayName}.`
      };
    }
  }

  return null;
}

/**
 * Validate slot input payload
 */
function validateSlotInput({ course_id, day_of_week, start_time, end_time, room, slot_type }) {
  if (!course_id) return 'Course selection is required.';

  const day = parseInt(day_of_week, 10);
  if (isNaN(day) || day < 1 || day > 6) {
    return 'Invalid day of week. Must be between 1 (Monday) and 6 (Saturday).';
  }

  if (!start_time || !TIME_REGEX.test(start_time.trim())) {
    return 'Start time must be in 24-hour format (HH:MM).';
  }

  if (!end_time || !TIME_REGEX.test(end_time.trim())) {
    return 'End time must be in 24-hour format (HH:MM).';
  }

  const cleanStart = start_time.trim();
  const cleanEnd = end_time.trim();

  if (cleanStart >= cleanEnd) {
    return 'End time must be strictly after start time.';
  }

  if (cleanStart < '08:00' || cleanEnd > '18:00') {
    return 'Timetable slots must be scheduled between 08:00 and 18:00.';
  }

  if (!room || !room.trim()) {
    return 'Room name or number is required.';
  }

  const validTypes = ['lecture', 'lab', 'tutorial'];
  if (!slot_type || !validTypes.includes(slot_type.trim())) {
    return 'Invalid slot type. Allowed types: lecture, lab, tutorial.';
  }

  return null;
}

/**
 * POST /api/timetable
 * Create a new timetable slot (HOD own dept, Admin all)
 */
async function createSlot(req, res) {
  try {
    const { course_id, day_of_week, start_time, end_time, room, slot_type } = req.body;

    const validationError = validateSlotInput(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const cleanStart = start_time.trim();
    const cleanEnd = end_time.trim();
    const cleanRoom = room.trim();
    const cleanType = slot_type.trim();
    const day = parseInt(day_of_week, 10);
    const courseId = parseInt(course_id, 10);

    const course = db.prepare('SELECT id, department_id FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Role-based department scoping: HOD only and own department only (403 for any other)
    if (req.user.role !== 'hod' || course.department_id !== req.user.department_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: HODs can only manage timetable slots for courses within their own department.'
      });
    }

    // Conflict detection
    const conflict = checkTimetableConflicts({
      course_id: courseId,
      day_of_week: day,
      start_time: cleanStart,
      end_time: cleanEnd,
      room: cleanRoom
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        clash_type: conflict.clash_type,
        message: conflict.message
      });
    }

    const insertStmt = db.prepare(`
      INSERT INTO timetable_slots (
        course_id, day_of_week, start_time, end_time, room, slot_type, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const result = insertStmt.run(
      courseId,
      day,
      cleanStart,
      cleanEnd,
      cleanRoom,
      cleanType,
      req.user.id
    );

    const createdSlot = db.prepare(`
      SELECT 
        s.*,
        c.code AS course_code,
        c.name AS course_name,
        c.semester,
        u.name AS faculty_name,
        d.code AS department_code
      FROM timetable_slots s
      JOIN courses c ON s.course_id = c.id
      JOIN users u ON c.faculty_id = u.id
      JOIN departments d ON c.department_id = d.id
      WHERE s.id = ?
    `).get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: 'Timetable slot created successfully.',
      slot: createdSlot
    });
  } catch (err) {
    console.error('Error in createSlot:', err);
    return res.status(500).json({ success: false, message: 'Failed to create timetable slot.' });
  }
}

/**
 * PUT /api/timetable/:id
 * Update an existing timetable slot
 */
async function updateSlot(req, res) {
  try {
    const slotId = parseInt(req.params.id, 10);
    if (isNaN(slotId)) {
      return res.status(400).json({ success: false, message: 'Invalid slot ID.' });
    }

    const existingSlot = db.prepare(`
      SELECT s.*, c.department_id 
      FROM timetable_slots s
      JOIN courses c ON s.course_id = c.id
      WHERE s.id = ?
    `).get(slotId);

    if (!existingSlot) {
      return res.status(404).json({ success: false, message: 'Timetable slot not found.' });
    }

    // HOD check on existing slot
    if (req.user.role !== 'hod' || existingSlot.department_id !== req.user.department_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only edit timetable slots for your own department.'
      });
    }

    const validationError = validateSlotInput(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const { course_id, day_of_week, start_time, end_time, room, slot_type } = req.body;
    const cleanStart = start_time.trim();
    const cleanEnd = end_time.trim();
    const cleanRoom = room.trim();
    const cleanType = slot_type.trim();
    const day = parseInt(day_of_week, 10);
    const courseId = parseInt(course_id, 10);

    const targetCourse = db.prepare('SELECT id, department_id FROM courses WHERE id = ?').get(courseId);
    if (!targetCourse) {
      return res.status(404).json({ success: false, message: 'Target course not found.' });
    }

    // HOD check on target course (if course_id changes)
    if (req.user.role !== 'hod' || targetCourse.department_id !== req.user.department_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: The target course must also belong to your department.'
      });
    }

    // Conflict detection excluding current slot
    const conflict = checkTimetableConflicts({
      course_id: courseId,
      day_of_week: day,
      start_time: cleanStart,
      end_time: cleanEnd,
      room: cleanRoom,
      exclude_id: slotId
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        clash_type: conflict.clash_type,
        message: conflict.message
      });
    }

    db.prepare(`
      UPDATE timetable_slots
      SET course_id = ?,
          day_of_week = ?,
          start_time = ?,
          end_time = ?,
          room = ?,
          slot_type = ?
      WHERE id = ?
    `).run(courseId, day, cleanStart, cleanEnd, cleanRoom, cleanType, slotId);

    const updatedSlot = db.prepare(`
      SELECT 
        s.*,
        c.code AS course_code,
        c.name AS course_name,
        c.semester,
        u.name AS faculty_name,
        d.code AS department_code
      FROM timetable_slots s
      JOIN courses c ON s.course_id = c.id
      JOIN users u ON c.faculty_id = u.id
      JOIN departments d ON c.department_id = d.id
      WHERE s.id = ?
    `).get(slotId);

    return res.status(200).json({
      success: true,
      message: 'Timetable slot updated successfully.',
      slot: updatedSlot
    });
  } catch (err) {
    console.error('Error in updateSlot:', err);
    return res.status(500).json({ success: false, message: 'Failed to update timetable slot.' });
  }
}

/**
 * DELETE /api/timetable/:id
 * Delete a timetable slot
 */
async function deleteSlot(req, res) {
  try {
    const slotId = parseInt(req.params.id, 10);
    if (isNaN(slotId)) {
      return res.status(400).json({ success: false, message: 'Invalid slot ID.' });
    }

    const slot = db.prepare(`
      SELECT s.*, c.department_id 
      FROM timetable_slots s
      JOIN courses c ON s.course_id = c.id
      WHERE s.id = ?
    `).get(slotId);

    if (!slot) {
      return res.status(404).json({ success: false, message: 'Timetable slot not found.' });
    }

    if (req.user.role !== 'hod' || slot.department_id !== req.user.department_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete timetable slots for your own department.'
      });
    }

    db.prepare('DELETE FROM timetable_slots WHERE id = ?').run(slotId);

    return res.status(200).json({
      success: true,
      message: 'Timetable slot deleted successfully.'
    });
  } catch (err) {
    console.error('Error in deleteSlot:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete timetable slot.' });
  }
}

/**
 * GET /api/timetable/department
 * HOD: department slots. Admin: all or ?department_id=
 */
async function getDepartmentTimetable(req, res) {
  try {
    if (req.user.role !== 'hod') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only HOD can access department timetable.'
      });
    }

    const deptId = req.user.department_id;
    if (req.query.department_id && parseInt(req.query.department_id, 10) !== deptId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: HODs can only view timetable for their own department.'
      });
    }

    let query = `
      SELECT 
        s.*,
        c.code AS course_code,
        c.name AS course_name,
        c.semester,
        c.department_id,
        u.name AS faculty_name,
        d.code AS department_code,
        d.name AS department_name
      FROM timetable_slots s
      JOIN courses c ON s.course_id = c.id
      JOIN users u ON c.faculty_id = u.id
      JOIN departments d ON c.department_id = d.id
    `;
    const params = [];

    if (deptId) {
      query += ` WHERE c.department_id = ?`;
      params.push(deptId);
    }

    query += ` ORDER BY s.day_of_week ASC, s.start_time ASC`;

    const slots = db.prepare(query).all(...params);

    // Also return departments and courses for selector controls
    const departments = db.prepare('SELECT id, name, code FROM departments ORDER BY name ASC').all();
    let coursesQuery = `
      SELECT c.id, c.code, c.name, c.semester, c.department_id, c.weekly_lectures, c.lab_hours_per_week, c.course_type, u.name AS faculty_name
      FROM courses c
      JOIN users u ON c.faculty_id = u.id
    `;
    const coursesParams = [];
    if (deptId) {
      coursesQuery += ` WHERE c.department_id = ?`;
      coursesParams.push(deptId);
    }
    coursesQuery += ` ORDER BY c.code ASC`;
    const courses = db.prepare(coursesQuery).all(...coursesParams);

    return res.status(200).json({
      success: true,
      slots,
      courses,
      departments,
      active_department_id: deptId
    });
  } catch (err) {
    console.error('Error in getDepartmentTimetable:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch timetable slots.' });
  }
}

/**
 * GET /api/timetable/mine
 * Student's enrolled courses timetable
 */
async function getStudentTimetable(req, res) {
  try {
    const slots = db.prepare(`
      SELECT 
        s.*,
        c.code AS course_code,
        c.name AS course_name,
        c.semester,
        u.name AS faculty_name,
        d.code AS department_code
      FROM timetable_slots s
      JOIN courses c ON s.course_id = c.id
      JOIN enrollments e ON e.course_id = s.course_id
      JOIN users u ON c.faculty_id = u.id
      JOIN departments d ON c.department_id = d.id
      WHERE e.student_id = ? AND e.status = 'active'
      ORDER BY s.day_of_week ASC, s.start_time ASC
    `).all(req.user.id);

    return res.status(200).json({
      success: true,
      slots
    });
  } catch (err) {
    console.error('Error in getStudentTimetable:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch student timetable.' });
  }
}

/**
 * GET /api/timetable/faculty
 * Faculty's taught courses timetable
 */
async function getFacultyTimetable(req, res) {
  try {
    const slots = db.prepare(`
      SELECT 
        s.*,
        c.code AS course_code,
        c.name AS course_name,
        c.semester,
        u.name AS faculty_name,
        d.code AS department_code
      FROM timetable_slots s
      JOIN courses c ON s.course_id = c.id
      JOIN users u ON c.faculty_id = u.id
      JOIN departments d ON c.department_id = d.id
      WHERE c.faculty_id = ?
      ORDER BY s.day_of_week ASC, s.start_time ASC
    `).all(req.user.id);

    return res.status(200).json({
      success: true,
      slots
    });
  } catch (err) {
    console.error('Error in getFacultyTimetable:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch faculty timetable.' });
  }
}

/**
 * GET /api/timetable/today
 * Returns today's classes and next class using server LOCAL time.
 * If today has no classes (or all have ended), returns next working day's slots.
 */
async function getTodaySchedule(req, res) {
  try {
    const now = getReferenceNow();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    let allUserSlots = [];
    if (req.user.role === 'student') {
      allUserSlots = db.prepare(`
        SELECT 
          s.*,
          c.code AS course_code,
          c.name AS course_name,
          c.semester,
          u.name AS faculty_name,
          d.code AS department_code
        FROM timetable_slots s
        JOIN courses c ON s.course_id = c.id
        JOIN enrollments e ON e.course_id = s.course_id
        JOIN users u ON c.faculty_id = u.id
        JOIN departments d ON c.department_id = d.id
        WHERE e.student_id = ? AND e.status = 'active'
        ORDER BY s.day_of_week ASC, s.start_time ASC
      `).all(req.user.id);
    } else if (req.user.role === 'faculty') {
      allUserSlots = db.prepare(`
        SELECT 
          s.*,
          c.code AS course_code,
          c.name AS course_name,
          c.semester,
          u.name AS faculty_name,
          d.code AS department_code
        FROM timetable_slots s
        JOIN courses c ON s.course_id = c.id
        JOIN users u ON c.faculty_id = u.id
        JOIN departments d ON c.department_id = d.id
        WHERE c.faculty_id = ?
        ORDER BY s.day_of_week ASC, s.start_time ASC
      `).all(req.user.id);
    } else {
      // HOD or Admin previewing their department/institution
      let deptFilter = req.user.role === 'hod' ? req.user.department_id : null;
      let query = `
        SELECT 
          s.*,
          c.code AS course_code,
          c.name AS course_name,
          c.semester,
          u.name AS faculty_name,
          d.code AS department_code
        FROM timetable_slots s
        JOIN courses c ON s.course_id = c.id
        JOIN users u ON c.faculty_id = u.id
        JOIN departments d ON c.department_id = d.id
      `;
      const params = [];
      if (deptFilter) {
        query += ` WHERE c.department_id = ?`;
        params.push(deptFilter);
      }
      query += ` ORDER BY s.day_of_week ASC, s.start_time ASC`;
      allUserSlots = db.prepare(query).all(...params);
    }

    // Filter today's slots
    const todaySlots = allUserSlots.filter((s) => s.day_of_week === currentDay);

    // Helper to find the next day with classes
    function getNextWorkingDaySlots() {
      // Check subsequent days in week (e.g. tomorrow, day after, wrapping around from Mon)
      for (let offset = 1; offset <= 7; offset++) {
        let checkDay = (currentDay + offset) % 7;
        if (checkDay === 0) continue; // Skip Sunday
        const slotsForDay = allUserSlots.filter((s) => s.day_of_week === checkDay);
        if (slotsForDay.length > 0) {
          return {
            day: checkDay,
            day_name: DAY_NAMES[checkDay],
            slots: slotsForDay
          };
        }
      }
      return { day: null, day_name: null, slots: [] };
    }

    if (todaySlots.length === 0) {
      // No classes scheduled for today (e.g. Sunday or non-class day)
      const nextDay = getNextWorkingDaySlots();
      return res.status(200).json({
        success: true,
        local_time: currentTimeStr,
        today_day: currentDay,
        today_day_name: DAY_NAMES[currentDay] || 'Sunday',
        has_classes_today: false,
        all_classes_ended: false,
        today_slots: [],
        next_class: null,
        next_working_day_slots: nextDay.slots,
        next_working_day_name: nextDay.day_name
      });
    }

    // Classes exist today. Find next class where end_time > currentTimeStr
    const nextClass = todaySlots.find((s) => s.end_time > currentTimeStr) || null;

    if (!nextClass) {
      // Classes existed today, but ALL have ended for the day
      const nextDay = getNextWorkingDaySlots();
      return res.status(200).json({
        success: true,
        local_time: currentTimeStr,
        today_day: currentDay,
        today_day_name: DAY_NAMES[currentDay],
        has_classes_today: true,
        all_classes_ended: true,
        today_slots: todaySlots,
        next_class: null,
        next_working_day_slots: nextDay.slots,
        next_working_day_name: nextDay.day_name
      });
    }

    // A next or currently ongoing class exists today
    return res.status(200).json({
      success: true,
      local_time: currentTimeStr,
      today_day: currentDay,
      today_day_name: DAY_NAMES[currentDay],
      has_classes_today: true,
      all_classes_ended: false,
      today_slots: todaySlots,
      next_class: nextClass,
      next_working_day_slots: [],
      next_working_day_name: null
    });
  } catch (err) {
    console.error('Error in getTodaySchedule:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch today schedule.' });
  }
}

/**
 * POST /api/timetable/generate/preview
 * Generate timetable preview for HOD's own department.
 */
async function generateTimetablePreview(req, res) {
  try {
    if (req.user.role !== 'hod') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only HOD can generate timetable.'
      });
    }

    const departmentId = req.user.department_id;
    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message: 'User does not belong to any department.'
      });
    }

    const {
      semesters,
      working_days,
      break_start = '13:15',
      break_end = '14:00',
      max_teaching_hours_per_day = 4,
      replace_existing = false,
      seed = 1024
    } = req.body;

    if (!Array.isArray(semesters) || semesters.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one semester.'
      });
    }

    const genResult = generateTimetable({
      departmentId,
      semesters: semesters.map(Number),
      workingDays: Array.isArray(working_days) ? working_days.map(Number) : [1, 2, 3, 4, 5],
      breakStart: break_start,
      breakEnd: break_end,
      maxTeachingHoursPerDay: Number(max_teaching_hours_per_day) || 4,
      replaceExisting: Boolean(replace_existing),
      seed
    });

    if (!genResult.success) {
      return res.status(400).json(genResult);
    }

    // Prepare preview grid slots
    // If replace_existing is false, include retained existing slots for this department marked with is_existing: true
    let previewSlots = [];
    if (!replace_existing) {
      const existingSlots = db.prepare(`
        SELECT 
          s.id,
          s.course_id,
          s.day_of_week,
          s.start_time,
          s.end_time,
          s.room,
          s.slot_type,
          c.code AS course_code,
          c.name AS course_name,
          c.semester,
          c.department_id,
          u.name AS faculty_name,
          d.code AS department_code
        FROM timetable_slots s
        JOIN courses c ON s.course_id = c.id
        JOIN users u ON c.faculty_id = u.id
        JOIN departments d ON c.department_id = d.id
        WHERE c.department_id = ?
        ORDER BY s.day_of_week ASC, s.start_time ASC
      `).all(departmentId);

      previewSlots = existingSlots.map(s => ({
        ...s,
        is_existing: true,
        is_proposed: false
      })).concat(genResult.slots.map(s => ({
        ...s,
        is_existing: false,
        is_proposed: true
      })));
    } else {
      previewSlots = genResult.slots.map(s => ({
        ...s,
        is_existing: false,
        is_proposed: true
      }));
    }

    return res.status(200).json({
      success: true,
      slots: genResult.slots, // the actual proposed slots to apply
      preview_slots: previewSlots, // combined slots to show in preview grid
      unplaced: genResult.unplaced,
      stats: genResult.stats,
      existing_deleted_count: genResult.existingDeletedCount,
      seed: genResult.seed
    });
  } catch (err) {
    console.error('Error in generateTimetablePreview:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate timetable preview: ' + err.message
    });
  }
}

/**
 * POST /api/timetable/generate/apply
 * Apply generated timetable in one atomic transaction.
 * Strictly verifies all proposed slots before insertion.
 */
async function applyGeneratedTimetable(req, res) {
  try {
    if (req.user.role !== 'hod') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only HOD can apply generated timetable.'
      });
    }

    const departmentId = req.user.department_id;
    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message: 'User does not belong to any department.'
      });
    }

    const {
      proposal,
      semesters,
      replace_existing = false,
      break_start = '13:15',
      break_end = '14:00'
    } = req.body;

    if (!Array.isArray(proposal) || proposal.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No timetable slots provided to apply.'
      });
    }

    if (!Array.isArray(semesters) || semesters.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Semesters array is required.'
      });
    }

    const sanitizedSemesters = semesters.map(Number);

    // Fetch valid courses for HOD's department
    const deptCourses = db.prepare(`
      SELECT id, code, name, department_id, semester, faculty_id, weekly_lectures, lab_hours_per_week
      FROM courses
      WHERE department_id = ?
    `).all(departmentId);

    const courseMap = new Map(deptCourses.map(c => [c.id, c]));

    // Fetch valid rooms
    const allRooms = db.prepare(`SELECT id, name, room_type FROM rooms`).all();
    const roomMap = new Map(allRooms.map(r => [r.name.toLowerCase().trim(), r]));

    // Sanity check slot count
    let maxAllowedCount = 0;
    for (const c of deptCourses) {
      if (sanitizedSemesters.includes(c.semester)) {
        const fullLabs = Math.floor((c.lab_hours_per_week || 0) / 2);
        const oddLab = (c.lab_hours_per_week || 0) % 2 !== 0 ? 1 : 0;
        maxAllowedCount += (c.weekly_lectures || 0) + fullLabs + oddLab;
      }
    }

    if (proposal.length > maxAllowedCount + 5) {
      return res.status(400).json({
        success: false,
        message: `Proposal contains ${proposal.length} slots, which exceeds maximum possible sessions (${maxAllowedCount}) for selected semesters.`
      });
    }

    // Execute in one single SQLite transaction
    const executeTransaction = db.transaction(() => {
      // 1. If replace_existing, delete only existing slots of this department and selected semesters
      if (replace_existing) {
        const semInClause = sanitizedSemesters.map(() => '?').join(',');
        db.prepare(`
          DELETE FROM timetable_slots
          WHERE id IN (
            SELECT s.id
            FROM timetable_slots s
            JOIN courses c ON s.course_id = c.id
            WHERE c.department_id = ? AND c.semester IN (${semInClause})
          )
        `).run(departmentId, ...sanitizedSemesters);
      }

      // 2. Validate and insert every slot
      const insertStmt = db.prepare(`
        INSERT INTO timetable_slots (
          course_id, day_of_week, start_time, end_time, room, slot_type, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      for (let i = 0; i < proposal.length; i++) {
        const slot = proposal[i];

        // Verify course
        const course = courseMap.get(slot.course_id);
        if (!course) {
          throw new Error(`Slot #${i + 1}: Course does not belong to your department.`);
        }
        if (!sanitizedSemesters.includes(course.semester)) {
          throw new Error(`Slot #${i + 1}: Course ${course.code} is in semester ${course.semester}, which was not selected.`);
        }

        // Verify room
        const roomObj = roomMap.get((slot.room || '').toLowerCase().trim());
        if (!roomObj) {
          throw new Error(`Slot #${i + 1}: Room '${slot.room}' does not exist.`);
        }

        // Verify room type match
        if (slot.slot_type !== roomObj.room_type) {
          throw new Error(`Slot #${i + 1}: Type mismatch. Slot type '${slot.slot_type}' cannot be held in '${roomObj.room_type}' room '${roomObj.name}'.`);
        }

        // Verify time bounds
        if (!slot.start_time || !slot.end_time || slot.start_time >= slot.end_time) {
          throw new Error(`Slot #${i + 1}: Invalid start (${slot.start_time}) or end (${slot.end_time}) time.`);
        }
        if (slot.start_time < '08:00' || slot.end_time > '18:00') {
          throw new Error(`Slot #${i + 1}: Hours (${slot.start_time} - ${slot.end_time}) exceed 08:00 - 18:00 institutional bounds.`);
        }

        // Verify break window non-overlap
        if (isOverlapping(slot.start_time, slot.end_time, break_start, break_end)) {
          throw new Error(`Slot #${i + 1} (${course.code}, ${slot.start_time} - ${slot.end_time}) overlaps break window (${break_start} - ${break_end}).`);
        }

        // Run existing 3-tier conflict engine
        const clash = checkTimetableConflicts({
          course_id: slot.course_id,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          room: roomObj.name
        });

        if (clash) {
          throw new Error(`Conflict for ${course.code}: ${clash.message}`);
        }

        // Insert slot
        insertStmt.run(
          slot.course_id,
          slot.day_of_week,
          slot.start_time,
          slot.end_time,
          roomObj.name,
          slot.slot_type,
          req.user.id
        );
      }
    });

    executeTransaction();

    return res.status(200).json({
      success: true,
      message: `Successfully applied ${proposal.length} timetable slot(s).`,
      applied_count: proposal.length
    });
  } catch (err) {
    console.error('Error in applyGeneratedTimetable:', err);
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to apply timetable.'
    });
  }
}

module.exports = {
  createSlot,
  updateSlot,
  deleteSlot,
  getDepartmentTimetable,
  getStudentTimetable,
  getFacultyTimetable,
  getTodaySchedule,
  checkTimetableConflicts,
  generateTimetablePreview,
  applyGeneratedTimetable
};

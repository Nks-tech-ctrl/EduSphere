const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../config/db');
const { generateTimetable, timeToMinutes, isOverlapping } = require('./timetableGenerator');
const seedDatabase = require('../db/seed');
const { runEscalationCheck } = require('./escalationService');

test.describe('Phase 12B: Timetable Generator Suite', { concurrency: 1 }, () => {

  // Ensure DB is in seeded state before tests
  test.beforeEach(() => {
    seedDatabase();
  });

  test('Test 1: Generates conflict-free timetable for seeded CSE department (Semesters 3 & 4)', () => {
    const cseDept = db.prepare("SELECT id FROM departments WHERE code = 'CSE'").get();
    assert.ok(cseDept, 'CSE department must exist in seed data');

    const result = generateTimetable({
      departmentId: cseDept.id,
      semesters: [3, 4],
      workingDays: [1, 2, 3, 4, 5],
      breakStart: '13:15',
      breakEnd: '14:00',
      maxTeachingHoursPerDay: 4,
      replaceExisting: true,
      seed: 2026
    });

    assert.equal(result.success, true);
    assert.equal(result.unplaced.length, 0, `All sessions should be placed. Unplaced: ${JSON.stringify(result.unplaced)}`);
    assert.equal(result.stats.placed_sessions, result.stats.total_sessions);
    assert.ok(result.slots.length > 0, 'Should place at least 1 slot');

    const slots = result.slots;
    const rooms = db.prepare('SELECT id, name, room_type FROM rooms').all();
    const roomTypeMap = new Map(rooms.map(r => [r.name.toLowerCase().trim(), r.room_type]));

    // Check 1: Zero Faculty Clashes
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const s1 = slots[i];
        const s2 = slots[j];
        if (s1.day_of_week === s2.day_of_week && s1.faculty_id === s2.faculty_id) {
          const overlap = isOverlapping(s1.start_time, s1.end_time, s2.start_time, s2.end_time);
          assert.equal(overlap, false, `Faculty clash detected between ${s1.course_code} and ${s2.course_code} on day ${s1.day_of_week}`);
        }
      }
    }

    // Check 2: Zero Room Clashes
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const s1 = slots[i];
        const s2 = slots[j];
        if (s1.day_of_week === s2.day_of_week && s1.room.toLowerCase().trim() === s2.room.toLowerCase().trim()) {
          const overlap = isOverlapping(s1.start_time, s1.end_time, s2.start_time, s2.end_time);
          assert.equal(overlap, false, `Room clash detected for room ${s1.room} on day ${s1.day_of_week}`);
        }
      }
    }

    // Check 3: Zero Batch Clashes
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const s1 = slots[i];
        const s2 = slots[j];
        if (s1.day_of_week === s2.day_of_week && s1.department_id === s2.department_id && s1.semester === s2.semester) {
          const overlap = isOverlapping(s1.start_time, s1.end_time, s2.start_time, s2.end_time);
          assert.equal(overlap, false, `Batch clash detected for Semester ${s1.semester} on day ${s1.day_of_week}`);
        }
      }
    }

    // Check 4: Room Type Matches Slot Type
    for (const slot of slots) {
      const actualRoomType = roomTypeMap.get(slot.room.toLowerCase().trim());
      assert.equal(actualRoomType, slot.slot_type, `Slot ${slot.course_code} (${slot.slot_type}) placed in mismatched room type '${actualRoomType}' (${slot.room})`);
    }

    // Check 5: No Overlap with Break Window (13:15 - 14:00)
    for (const slot of slots) {
      const overlap = isOverlapping(slot.start_time, slot.end_time, '13:15', '14:00');
      assert.equal(overlap, false, `Slot ${slot.course_code} (${slot.start_time} - ${slot.end_time}) overlaps break window`);
    }

    // Check 6: Maximum 1 Lecture per day per course (labs excluded)
    const courseDayLectures = {};
    for (const slot of slots) {
      if (slot.slot_type === 'lecture') {
        const key = `${slot.course_id}-day-${slot.day_of_week}`;
        courseDayLectures[key] = (courseDayLectures[key] || 0) + 1;
        assert.ok(courseDayLectures[key] <= 1, `Course ${slot.course_code} has >1 lecture on day ${slot.day_of_week}`);
      }
    }

    // Check 7: Faculty teaching hours limit (<= 4h / day)
    const facultyDayMinutes = {};
    for (const slot of slots) {
      const dur = timeToMinutes(slot.end_time) - timeToMinutes(slot.start_time);
      const key = `${slot.faculty_id}-day-${slot.day_of_week}`;
      facultyDayMinutes[key] = (facultyDayMinutes[key] || 0) + dur;
      assert.ok(facultyDayMinutes[key] <= 4 * 60, `Faculty ${slot.faculty_name} exceeds 4 hours limit on day ${slot.day_of_week}: ${facultyDayMinutes[key]}m`);
    }
  });

  test('Test 2: Deterministic generation with identical seed, and distinct variation with different seed', () => {
    const cseDept = db.prepare("SELECT id FROM departments WHERE code = 'CSE'").get();

    const run1 = generateTimetable({
      departmentId: cseDept.id,
      semesters: [3],
      workingDays: [1, 2, 3, 4, 5],
      replaceExisting: true,
      seed: 54321
    });

    const run2 = generateTimetable({
      departmentId: cseDept.id,
      semesters: [3],
      workingDays: [1, 2, 3, 4, 5],
      replaceExisting: true,
      seed: 54321
    });

    assert.equal(run1.slots.length, run2.slots.length);
    for (let i = 0; i < run1.slots.length; i++) {
      assert.equal(run1.slots[i].day_of_week, run2.slots[i].day_of_week);
      assert.equal(run1.slots[i].start_time, run2.slots[i].start_time);
      assert.equal(run1.slots[i].end_time, run2.slots[i].end_time);
      assert.equal(run1.slots[i].room, run2.slots[i].room);
    }
  });

  test('Test 3: Detects infeasibility and provides human-readable diagnostic reasons (5 lectures across 4 days)', () => {
    const cseDept = db.prepare("SELECT id FROM departments WHERE code = 'CSE'").get();

    // CSE-201 requires 5 lectures per week, but only 4 working days are provided (Mon to Thu)
    const result = generateTimetable({
      departmentId: cseDept.id,
      semesters: [3],
      workingDays: [1, 2, 3, 4], // Only 4 days!
      replaceExisting: true,
      seed: 1024
    });

    assert.ok(result.unplaced.length > 0, 'Should have unplaced sessions because 5 lectures cannot fit into 4 days with max 1 lecture/day');
    const unplacedLecture = result.unplaced.find(u => u.slot_type === 'lecture');
    assert.ok(unplacedLecture, 'Should find unplaced lecture');
    assert.ok(
      unplacedLecture.reason.includes('Infeasible') || unplacedLecture.reason.includes('working days'),
      `Reason should explain infeasibility. Actual: ${unplacedLecture.reason}`
    );
  });

  test('Test 4: Odd remainder lab hours are scheduled without loss (120m + 60m)', () => {
    // Insert temporary course with 3 lab hours
    const cseDept = db.prepare("SELECT id FROM departments WHERE code = 'CSE'").get();
    const faculty = db.prepare("SELECT id FROM users WHERE role = 'faculty' AND department_id = ?").get(cseDept.id);

    const testCourseRes = db.prepare(`
      INSERT INTO courses (name, code, department_id, faculty_id, credits, semester, weekly_lectures, lab_hours_per_week, course_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('Specialized Lab Practice', 'CSE-999', cseDept.id, faculty.id, 2, 7, 0, 3, 'lab');

    const result = generateTimetable({
      departmentId: cseDept.id,
      semesters: [7],
      workingDays: [1, 2, 3, 4, 5],
      replaceExisting: true,
      seed: 777
    });

    assert.equal(result.stats.total_sessions, 2, '3 lab hours should split into 2 sessions (one 120m and one 60m)');
    const placedDurations = result.slots.map(s => s.duration).sort((a, b) => b - a);
    assert.deepEqual(placedDurations, [120, 60], 'Should place exactly one 120-minute and one 60-minute lab session');
  });

  test('Test 5: Generation for newly created department with courses and lab room (Phase 12A scenario)', () => {
    // Create new department: Mechanical Engineering (MECH)
    const deptRes = db.prepare("INSERT INTO departments (name, code) VALUES ('Mechanical Engineering', 'MECH')").run();
    const mechDeptId = deptRes.lastInsertRowid;

    // Create a faculty user for MECH
    const userRes = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, department_id, phone)
      VALUES ('Prof. Alan Turing', 'alan.mech@edusphere.edu', 'testhash', 'faculty', ?, '+91 99999 11111')
    `).run(mechDeptId);
    const mechFacultyId = userRes.lastInsertRowid;

    // Create a lecture room and a lab room for MECH
    db.prepare("INSERT INTO rooms (name, room_type, capacity) VALUES ('ME-Room-1', 'lecture', 50)").run();
    db.prepare("INSERT INTO rooms (name, room_type, capacity) VALUES ('ME-Robotics-Lab', 'lab', 25)").run();

    // Create 2 courses: 1 theory (3 lectures), 1 lab (2 lab hours)
    db.prepare(`
      INSERT INTO courses (name, code, department_id, faculty_id, credits, semester, weekly_lectures, lab_hours_per_week, course_type)
      VALUES ('Thermodynamics', 'ME-101', ?, ?, 3, 1, 3, 0, 'theory')
    `).run(mechDeptId, mechFacultyId);

    db.prepare(`
      INSERT INTO courses (name, code, department_id, faculty_id, credits, semester, weekly_lectures, lab_hours_per_week, course_type)
      VALUES ('Robotics Lab', 'ME-102', ?, ?, 2, 1, 0, 2, 'lab')
    `).run(mechDeptId, mechFacultyId);

    // Run generator for MECH
    const result = generateTimetable({
      departmentId: mechDeptId,
      semesters: [1],
      workingDays: [1, 2, 3, 4, 5],
      replaceExisting: false,
      seed: 999
    });

    assert.equal(result.success, true);
    assert.equal(result.stats.total_sessions, 4); // 3 lectures + 1 lab (2h)
    assert.equal(result.stats.placed_sessions, 4);
    assert.equal(result.unplaced.length, 0);

    const roomsList = db.prepare('SELECT id, name, room_type FROM rooms').all();
    const labSlot = result.slots.find(s => s.slot_type === 'lab');
    assert.ok(labSlot, 'Should place lab slot');
    const assignedLabRoom = roomsList.find(r => r.name === labSlot.room);
    assert.ok(assignedLabRoom, 'Assigned lab room must exist in rooms');
    assert.equal(assignedLabRoom.room_type, 'lab');
    assert.equal(labSlot.duration, 120);

    const lecSlots = result.slots.filter(s => s.slot_type === 'lecture');
    assert.equal(lecSlots.length, 3);
    for (const lec of lecSlots) {
      const assignedLecRoom = roomsList.find(r => r.name === lec.room);
      assert.ok(assignedLecRoom, 'Assigned lecture room must exist in rooms');
      assert.equal(assignedLecRoom.room_type, 'lecture');
      assert.equal(lec.duration, 60);
    }
  });

  test('Test 6: Database Reset Demo Data invariance & escalation check verification', () => {
    seedDatabase();

    // Assert seeded timetable slots restored exactly
    const slotCount = db.prepare('SELECT COUNT(*) AS cnt FROM timetable_slots').get().cnt;
    assert.equal(slotCount, 25, 'Seeded database must have exactly 25 timetable slots');

    // Run escalation check
    const escalationResult = runEscalationCheck();
    assert.equal(escalationResult.escalatedCount, 2, 'Escalation check must escalate exactly 2 complaints');
    const ticketNos = escalationResult.escalatedTickets.map(t => t.ticket_no);
    assert.ok(ticketNos.includes('CMP-0001'), 'CMP-0001 must be escalated');
    assert.ok(ticketNos.includes('CMP-0003'), 'CMP-0003 must be escalated');
  });

});

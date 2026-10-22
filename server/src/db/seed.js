const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const defaultDb = require('../config/db');
const initDb = require('./initDb');

/**
 * Validates post-seed integrity across all critical demo metrics.
 * Throws a detailed Error if any constraint is not met.
 */
function verifySeedIntegrity(db) {
  const issues = [];

  // 1. Foreign Key Check
  const fk = db.prepare('PRAGMA foreign_key_check').all();
  if (fk && fk.length > 0) {
    issues.push(`Foreign key constraint violations: ${JSON.stringify(fk)}`);
  }

  // 2. Users verification (26 users: 1 admin, 2 HODs, 3 faculty, 20 students)
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const adminCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get().c;
  const hodCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'hod'").get().c;
  const facultyCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'faculty'").get().c;
  const studentCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'student'").get().c;

  if (totalUsers !== 26) issues.push(`Expected 26 total users, found ${totalUsers}`);
  if (adminCount !== 1) issues.push(`Expected 1 admin, found ${adminCount}`);
  if (hodCount !== 2) issues.push(`Expected 2 HODs, found ${hodCount}`);
  if (facultyCount !== 3) issues.push(`Expected 3 faculty, found ${facultyCount}`);
  if (studentCount !== 20) issues.push(`Expected 20 students, found ${studentCount}`);

  // Key user emails check
  const requiredEmails = [
    'admin@edusphere.edu',
    'hod.cse@edusphere.edu',
    'hod.ece@edusphere.edu',
    'faculty.sharma@edusphere.edu',
    'faculty.patel@edusphere.edu',
    'faculty.verma@edusphere.edu'
  ];
  for (let i = 1; i <= 20; i++) {
    requiredEmails.push(`student${i}@edusphere.edu`);
  }
  for (const email of requiredEmails) {
    const u = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!u) issues.push(`Required user ${email} is missing`);
  }

  // 3. Courses verification (5 courses)
  const totalCourses = db.prepare('SELECT COUNT(*) as c FROM courses').get().c;
  if (totalCourses !== 5) issues.push(`Expected 5 courses, found ${totalCourses}`);

  const requiredCourses = ['CSE-201', 'CSE-202', 'CSE-203', 'ECE-201', 'ECE-202'];
  for (const code of requiredCourses) {
    const c = db.prepare('SELECT id FROM courses WHERE code = ?').get(code);
    if (!c) issues.push(`Required course ${code} is missing`);
  }

  // 4. Rooms verification (5 rooms)
  const totalRooms = db.prepare('SELECT COUNT(*) as c FROM rooms').get().c;
  if (totalRooms !== 5) issues.push(`Expected 5 rooms, found ${totalRooms}`);

  const requiredRooms = ['LH-101', 'LH-102', 'LH-201', 'CS-Lab-1', 'EC-Lab-2'];
  for (const name of requiredRooms) {
    const r = db.prepare('SELECT id FROM rooms WHERE name = ?').get(name);
    if (!r) issues.push(`Required room ${name} is missing`);
  }

  // 5. Timetable Slots verification (25 slots)
  const totalSlots = db.prepare('SELECT COUNT(*) as c FROM timetable_slots').get().c;
  if (totalSlots !== 25) issues.push(`Expected 25 timetable slots, found ${totalSlots}`);

  // 6. Complaints verification (8 base + 25 historical = 33 total)
  const totalComplaints = db.prepare('SELECT COUNT(*) as c FROM complaints').get().c;
  if (totalComplaints !== 33) issues.push(`Expected 33 complaints (8 base + 25 historical), found ${totalComplaints}`);

  for (let i = 1; i <= 8; i++) {
    const tNo = `CMP-000${i}`;
    const comp = db.prepare('SELECT id FROM complaints WHERE ticket_no = ?').get(tNo);
    if (!comp) issues.push(`Base complaint ${tNo} is missing`);
  }

  // 7. Today's attendance is blank
  const now = new Date();
  const todayUtc = now.toISOString().split('T')[0];
  const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const datesToCheck = Array.from(new Set([todayUtc, todayLocal]));

  let todayAttendanceCount = 0;
  for (const d of datesToCheck) {
    const attCount = db.prepare('SELECT COUNT(*) as c FROM attendance WHERE date = ?').get(d).c;
    const sessCount = db.prepare('SELECT COUNT(*) as c FROM attendance_sessions WHERE date = ?').get(d).c;
    todayAttendanceCount += attCount + sessCount;
  }
  if (todayAttendanceCount !== 0) {
    issues.push(`Expected today's attendance to be blank, but found ${todayAttendanceCount} records for date(s): ${datesToCheck.join(', ')}`);
  }

  // 8. Escalation check: exactly 2 complaints would escalate (CMP-0001 and CMP-0003)
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const nowMs = Date.now();
  const candidateComplaints = db.prepare(`
    SELECT ticket_no, created_at, status, escalated
    FROM complaints
    WHERE status != 'resolved' AND escalated = 0
  `).all();

  const wouldEscalate = candidateComplaints
    .filter((c) => c.created_at && (nowMs - new Date(c.created_at).getTime()) >= THREE_DAYS_MS)
    .map((c) => c.ticket_no)
    .sort();

  if (wouldEscalate.length !== 2 || wouldEscalate[0] !== 'CMP-0001' || wouldEscalate[1] !== 'CMP-0003') {
    issues.push(`Expected exactly 2 complaints to escalate (['CMP-0001', 'CMP-0003']), but found: ${JSON.stringify(wouldEscalate)}`);
  }

  if (issues.length > 0) {
    throw new Error('Seed self-check validation failed:\n' + issues.map((msg) => ` - ${msg}`).join('\n'));
  }

  return {
    verified: true,
    totalUsers,
    adminCount,
    hodCount,
    facultyCount,
    studentCount,
    totalCourses,
    totalRooms,
    totalSlots,
    totalComplaints,
    baseComplaints: 8,
    historicalComplaints: 25,
    todayAttendanceCount: 0,
    escalatableComplaints: wouldEscalate,
    foreignKeyViolations: (fk && fk.length) || 0
  };
}

function seedDatabase(targetDb = defaultDb) {
  const db = targetDb || defaultDb;
  console.log('[Edusphere Seed] Starting database seeding...');

  // Ensure tables exist
  initDb(db);

  const uploadsDir = path.join(__dirname, '../../uploads');
  const resourcesDir = path.join(uploadsDir, 'resources');
  const pendingUploadFiles = [];

  // Run the whole delete-and-reseed inside one atomic transaction
  db.transaction(() => {
    // Clear existing data cleanly and reset autoincrement sequences in derived foreign-key order
    db.exec(`
      DELETE FROM attendance_checkins;
      DELETE FROM attendance_sessions;
      DELETE FROM device_bindings;
      DELETE FROM integrity_pairs;
      DELETE FROM submissions;
      DELETE FROM assignments;
      DELETE FROM resources;
      DELETE FROM timetable_slots;
      DELETE FROM attendance;
      DELETE FROM marks;
      DELETE FROM enrollments;
      DELETE FROM complaint_updates;
      DELETE FROM complaints;
      DELETE FROM notices;
      DELETE FROM courses;
      DELETE FROM users;
      DELETE FROM departments;
      DELETE FROM rooms;
      DELETE FROM sqlite_sequence;
    `);

    console.log('[Edusphere Seed] Cleaned existing tables and reset autoincrement sequences.');

  // Pre-compute password hashes
  const adminHash = bcrypt.hashSync('Admin@123', 10);
  const hodHash = bcrypt.hashSync('Hod@123', 10);
  const facultyHash = bcrypt.hashSync('Faculty@123', 10);
  const studentHash = bcrypt.hashSync('Student@123', 10);

  // 1. Insert 2 Departments
  const insertDept = db.prepare('INSERT INTO departments (name, code) VALUES (?, ?)');
  const deptCse = insertDept.run('Computer Science & Engineering', 'CSE');
  const deptEce = insertDept.run('Electronics & Communication Engineering', 'ECE');

  const cseId = deptCse.lastInsertRowid;
  const eceId = deptEce.lastInsertRowid;

  console.log(`[Edusphere Seed] Inserted 2 Departments (CSE: ${cseId}, ECE: ${eceId}).`);

  // 1b. Insert 5 Rooms (Phase 12A)
  const insertRoom = db.prepare('INSERT INTO rooms (name, room_type, capacity) VALUES (?, ?, ?)');
  insertRoom.run('LH-101', 'lecture', 60);
  insertRoom.run('LH-102', 'lecture', 60);
  insertRoom.run('LH-201', 'lecture', 60);
  insertRoom.run('CS-Lab-1', 'lab', 30);
  insertRoom.run('EC-Lab-2', 'lab', 30);
  console.log('[Edusphere Seed] Inserted 5 Rooms.');

  // 2. Insert Users
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, department_id, phone, avatar_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // 1 Admin (no department)
  const adminRes = insertUser.run(
    'System Administrator',
    'admin@edusphere.edu',
    adminHash,
    'admin',
    null,
    '+91 98765 00001',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
  );
  const adminId = adminRes.lastInsertRowid;

  // 2 HODs (1 per department)
  const hodCseRes = insertUser.run(
    'Dr. Rajesh Gupta',
    'hod.cse@edusphere.edu',
    hodHash,
    'hod',
    cseId,
    '+91 98765 00002',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
  );
  const hodCseId = hodCseRes.lastInsertRowid;

  const hodEceRes = insertUser.run(
    'Dr. Sunita Rao',
    'hod.ece@edusphere.edu',
    hodHash,
    'hod',
    eceId,
    '+91 98765 00003',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
  );
  const hodEceId = hodEceRes.lastInsertRowid;

  // 3 Faculty (2 in CSE, 1 in ECE)
  const faculty1Res = insertUser.run(
    'Prof. Vikram Sharma',
    'faculty.sharma@edusphere.edu',
    facultyHash,
    'faculty',
    cseId,
    '+91 98765 00011',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
  );
  const faculty1Id = faculty1Res.lastInsertRowid;

  const faculty2Res = insertUser.run(
    'Prof. Neha Patel',
    'faculty.patel@edusphere.edu',
    facultyHash,
    'faculty',
    cseId,
    '+91 98765 00012',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150'
  );
  const faculty2Id = faculty2Res.lastInsertRowid;

  const faculty3Res = insertUser.run(
    'Prof. Amit Verma',
    'faculty.verma@edusphere.edu',
    facultyHash,
    'faculty',
    eceId,
    '+91 98765 00013',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
  );
  const faculty3Id = faculty3Res.lastInsertRowid;

  // 20 Students (10 in CSE, 10 in ECE)
  const studentData = [
    // 10 CSE Students
    { name: 'Aarav Mehta', email: 'student1@edusphere.edu', dept: cseId, phone: '+91 91234 00001' },
    { name: 'Diya Sen', email: 'student2@edusphere.edu', dept: cseId, phone: '+91 91234 00002' },
    { name: 'Rohan Joshi', email: 'student3@edusphere.edu', dept: cseId, phone: '+91 91234 00003' },
    { name: 'Ishita Roy', email: 'student4@edusphere.edu', dept: cseId, phone: '+91 91234 00004' },
    { name: 'Kavya Nair', email: 'student5@edusphere.edu', dept: cseId, phone: '+91 91234 00005' },
    { name: 'Aryan Kapoor', email: 'student6@edusphere.edu', dept: cseId, phone: '+91 91234 00006' },
    { name: 'Tanvi Bhatia', email: 'student7@edusphere.edu', dept: cseId, phone: '+91 91234 00007' },
    { name: 'Siddharth Jain', email: 'student8@edusphere.edu', dept: cseId, phone: '+91 91234 00008' },
    { name: 'Rhea Desai', email: 'student9@edusphere.edu', dept: cseId, phone: '+91 91234 00009' },
    { name: 'Kabir Das', email: 'student10@edusphere.edu', dept: cseId, phone: '+91 91234 00010' },

    // 10 ECE Students
    { name: 'Ananya Iyer', email: 'student11@edusphere.edu', dept: eceId, phone: '+91 91234 00011' },
    { name: 'Varun Reddy', email: 'student12@edusphere.edu', dept: eceId, phone: '+91 91234 00012' },
    { name: 'Sneha Kulkarni', email: 'student13@edusphere.edu', dept: eceId, phone: '+91 91234 00013' },
    { name: 'Aditya Menon', email: 'student14@edusphere.edu', dept: eceId, phone: '+91 91234 00014' },
    { name: 'Pooja Hegde', email: 'student15@edusphere.edu', dept: eceId, phone: '+91 91234 00015' },
    { name: 'Nikhil Pillai', email: 'student16@edusphere.edu', dept: eceId, phone: '+91 91234 00016' },
    { name: 'Meera Nambiar', email: 'student17@edusphere.edu', dept: eceId, phone: '+91 91234 00017' },
    { name: 'Harshvardhan Rao', email: 'student18@edusphere.edu', dept: eceId, phone: '+91 91234 00018' },
    { name: 'Prisha Saxena', email: 'student19@edusphere.edu', dept: eceId, phone: '+91 91234 00019' },
    { name: 'Devansh Trivedi', email: 'student20@edusphere.edu', dept: eceId, phone: '+91 91234 00020' },
  ];

  const studentIds = [];
  studentData.forEach((s) => {
    const res = insertUser.run(
      s.name,
      s.email,
      studentHash,
      'student',
      s.dept,
      s.phone,
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(s.name)}`
    );
    studentIds.push({ id: res.lastInsertRowid, ...s });
  });

  console.log(`[Edusphere Seed] Inserted 1 Admin, 2 HODs, 3 Faculty, and 20 Students.`);

  // 3. Insert 5 Courses (Phase 12A: weekly_lectures, lab_hours_per_week, course_type matching timetable)
  const insertCourse = db.prepare(`
    INSERT INTO courses (name, code, department_id, faculty_id, credits, semester, weekly_lectures, lab_hours_per_week, course_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const c1 = insertCourse.run('Data Structures & Algorithms', 'CSE-201', cseId, faculty1Id, 4, 3, 5, 2, 'both');
  const c2 = insertCourse.run('Database Management Systems', 'CSE-202', cseId, faculty2Id, 4, 3, 5, 0, 'theory');
  const c3 = insertCourse.run('Operating Systems', 'CSE-203', cseId, faculty1Id, 3, 4, 4, 2, 'both');
  const c4 = insertCourse.run('Digital Electronics & Logic Design', 'ECE-201', eceId, faculty3Id, 4, 3, 4, 2, 'both');
  const c5 = insertCourse.run('Signals & Systems', 'ECE-202', eceId, faculty3Id, 3, 4, 4, 0, 'theory');

  const courses = [
    { id: c1.lastInsertRowid, code: 'CSE-201', dept: cseId },
    { id: c2.lastInsertRowid, code: 'CSE-202', dept: cseId },
    { id: c3.lastInsertRowid, code: 'CSE-203', dept: cseId },
    { id: c4.lastInsertRowid, code: 'ECE-201', dept: eceId },
    { id: c5.lastInsertRowid, code: 'ECE-202', dept: eceId },
  ];

  console.log(`[Edusphere Seed] Inserted 5 Courses.`);

  // 4. Enrollments (CSE students in CSE courses, ECE students in ECE courses)
  const insertEnrollment = db.prepare(`
    INSERT INTO enrollments (student_id, course_id, semester, academic_year, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  studentIds.forEach((student) => {
    if (student.dept === cseId) {
      insertEnrollment.run(student.id, courses[0].id, 3, '2026-2027', 'active');
      insertEnrollment.run(student.id, courses[1].id, 3, '2026-2027', 'active');
      insertEnrollment.run(student.id, courses[2].id, 4, '2026-2027', 'active');
    } else {
      insertEnrollment.run(student.id, courses[3].id, 3, '2026-2027', 'active');
      insertEnrollment.run(student.id, courses[4].id, 4, '2026-2027', 'active');
    }
  });

  // Deterministic seeded pseudo-random number generator (Mulberry32)
  function createPrng(seed = 1024) {
    let s = seed;
    return function() {
      s |= 0;
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = createPrng(2026);

  // 5. Rich Multi-Course Attendance across all courses using deterministic PRNG
  const insertAttendance = db.prepare(`
    INSERT INTO attendance (student_id, course_id, date, status, marked_by, remarks)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const attendanceDates = [];
  for (let i = 13; i >= 1; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    attendanceDates.push(`${yr}-${mo}-${da}`);
  }

  // Realistic course attendance target rates:
  // CSE-201: 91%, CSE-202: 86%, CSE-203: 79%, ECE-201: 88%, ECE-202: 83%
  const courseConfigs = [
    { courseId: courses[0].id, facultyId: faculty1Id, targetRate: 0.91, dept: cseId },
    { courseId: courses[1].id, facultyId: faculty2Id, targetRate: 0.86, dept: cseId },
    { courseId: courses[2].id, facultyId: faculty1Id, targetRate: 0.79, dept: cseId },
    { courseId: courses[3].id, facultyId: faculty3Id, targetRate: 0.88, dept: eceId },
    { courseId: courses[4].id, facultyId: faculty3Id, targetRate: 0.83, dept: eceId }
  ];

  studentIds.forEach((student) => {
    courseConfigs.forEach((cfg) => {
      if (student.dept === cfg.dept) {
        attendanceDates.forEach((dateStr) => {
          const isPresent = rng() < cfg.targetRate;
          const status = isPresent ? 'present' : (rng() < 0.25 ? 'late' : 'absent');
          insertAttendance.run(student.id, cfg.courseId, dateStr, status, cfg.facultyId, 'Regular lecture session');
        });
      }
    });
  });

  // 6. Marks across all courses (internal_1, internal_2, assignment)
  // NOTE: 'final' exam type is intentionally omitted so faculty can enter final marks live during demo
  const insertMarks = db.prepare(`
    INSERT INTO marks (student_id, course_id, exam_type, score, max_score, remarks)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const examTypesToSeed = [
    { type: 'internal_1', maxScore: 100, base: 72, variance: 22, remark: 'Satisfactory theoretical grasp' },
    { type: 'internal_2', maxScore: 100, base: 74, variance: 20, remark: 'Solid conceptual understanding' },
    { type: 'assignment', maxScore: 100, base: 82, variance: 16, remark: 'Comprehensive lab submission' }
  ];

  studentIds.forEach((student, sIdx) => {
    courseConfigs.forEach((cfg) => {
      if (student.dept === cfg.dept) {
        examTypesToSeed.forEach((exam, eIdx) => {
          // Deterministic marks variation based on student and course
          const variation = ((sIdx * 7 + cfg.courseId * 11 + eIdx * 13) % exam.variance);
          const score = Math.min(exam.maxScore, exam.base + variation);
          insertMarks.run(
            student.id,
            cfg.courseId,
            exam.type,
            score,
            exam.maxScore,
            exam.remark
          );
        });
      }
    });
  });

  // 7. Seed Notices
  const insertNotice = db.prepare(`
    INSERT INTO notices (title, content, target_role, department_id, author_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  // 1. College-wide notice from Admin
  insertNotice.run(
    'Annual Tech Fest "Innovasia 2026" Registrations Open',
    'Welcome to the premier annual technical festival. All student tracks, project displays, and hackathon registrations are now live through the portal.',
    'all',
    null,
    adminId
  );

  // 2. Department notice from HOD CSE
  insertNotice.run(
    'CSE Department: Research Paper Review Session',
    'Dr. Rajesh Gupta will be conducting the review of IEEE student branch project drafts this Thursday at 2:00 PM in Lab 304.',
    'all',
    cseId,
    hodCseId
  );

  // 3. Department notice from HOD ECE
  insertNotice.run(
    'ECE Department: VLSI Design Workshop',
    'A 2-day hands-on workshop on Cadence EDA tools will be held in the Microelectronics Lab. Attendance is mandatory for 3rd year ECE students.',
    'student',
    eceId,
    hodEceId
  );

  // 4. Faculty Council notice from Admin
  insertNotice.run(
    'Faculty Council: Mid-Semester Grading Guidelines',
    'All faculty members are requested to complete Internal-1 marks verification and freeze attendance records before Friday.',
    'faculty',
    null,
    adminId
  );

  // 5. Class Notice from Faculty (Prof. Vikram Sharma)
  insertNotice.run(
    'Data Structures Lab 3: Submission Deadline & Viva Schedule',
    'All CSE 3rd semester students must submit their Lab Assignment 3 (Binary Search Trees & AVL Balancing) by this Friday 5:00 PM. In-person code walkthroughs and viva will be conducted in Lab 2.',
    'student',
    cseId,
    faculty1Id
  );

  // Helper to generate dynamic relative timestamps (e.g. daysAgo(4, 2))
  function daysAgo(days, hours = 0, minutes = 0) {
    const d = new Date(Date.now() - (days * 86400000 + hours * 3600000 + minutes * 60000));
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${h}:${m}:${s}`;
  }

  function daysAhead(days, hours = 0, minutes = 0) {
    const d = new Date(Date.now() + (days * 86400000 + hours * 3600000 + minutes * 60000));
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${h}:${m}:${s}`;
  }

  // 8. Seed 8 Realistic Complaints with Dynamic Relative Dates
  const insertComplaint = db.prepare(`
    INSERT INTO complaints (
      ticket_no, title, description, category, status, is_anonymous, escalated, escalated_at, assigned_role, submitted_by, department_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertComplaintUpdate = db.prepare(`
    INSERT INTO complaint_updates (complaint_id, new_status, remark, updated_by, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Complaint 1: Infrastructure, under_review, 5 days old (>3d), un-escalated (ready to flag overdue!)
  const c1Created = daysAgo(5, 2);
  const c1Updated = daysAgo(4, 1);
  const c1Res = insertComplaint.run(
    'CMP-0001',
    'Air conditioning malfunctioning in CSE Lab 3',
    'The air conditioning system inside CSE Computing Lab 3 is malfunctioning during afternoon sessions, leading to thermal throttling on development workstations.',
    'infrastructure',
    'under_review',
    0,
    0, // un-escalated initially
    null,
    'admin',
    studentIds[0].id, // Aarav Mehta
    null,
    c1Created,
    c1Updated
  );
  const c1Id = c1Res.lastInsertRowid;
  insertComplaintUpdate.run(c1Id, 'submitted', 'Complaint registered by student in the portal. Awaiting administrative review.', studentIds[0].id, c1Created);
  insertComplaintUpdate.run(c1Id, 'under_review', 'Campus facility maintenance team inspected outdoor condenser units; replacement capacitor ordered.', adminId, c1Updated);

  // Complaint 2: Library, submitted, ANONYMOUS #1 (1 day 14h old, safely under 2d 12h)
  const c2Created = daysAgo(1, 14);
  const c2Res = insertComplaint.run(
    'CMP-0002',
    'Wi-Fi signal attenuation & frequent drops on Library 2nd Floor',
    'The Wi-Fi access point near the digital reference section on the 2nd floor suffers continuous packet loss and dropouts during peak study hours.',
    'library',
    'submitted',
    1, // Anonymous
    0,
    null,
    'admin',
    studentIds[1].id, // Diya Sen
    null,
    c2Created,
    c2Created
  );
  const c2Id = c2Res.lastInsertRowid;
  insertComplaintUpdate.run(c2Id, 'submitted', 'Anonymous complaint registered in the portal. Awaiting administrative review.', studentIds[1].id, c2Created);

  // Complaint 3: Academic, in_progress, HOD CSE assigned, 4 days old (>3d), un-escalated (ready to auto-escalate to Admin!)
  const c3Created = daysAgo(4, 3);
  const c3UnderReview = daysAgo(3, 18);
  const c3InProgress = daysAgo(3, 6);
  const c3Res = insertComplaint.run(
    'CMP-0003',
    'Schedule conflict between DSA Lecture and OS Lab session',
    'The revised lecture timetable for Wednesday afternoon has conflicting slots between Data Structures (CSE-201) and Systems Lab (CSE-203).',
    'academic',
    'in_progress',
    0,
    0, // un-escalated initially
    null,
    'hod',
    studentIds[2].id, // Rohan Joshi
    cseId,
    c3Created,
    c3InProgress
  );
  const c3Id = c3Res.lastInsertRowid;
  insertComplaintUpdate.run(c3Id, 'submitted', 'Complaint registered by student in the portal.', studentIds[2].id, c3Created);
  insertComplaintUpdate.run(c3Id, 'under_review', 'Reviewing timetable grid with batch coordinators and department time table committee.', hodCseId, c3UnderReview);
  insertComplaintUpdate.run(c3Id, 'in_progress', 'Drafted revised lab slot allocation for Room 304. Coordinating final room confirmation.', hodCseId, c3InProgress);

  // Complaint 4: Canteen, resolved, routes to Admin (6 days old)
  const c4Created = daysAgo(6, 4);
  const c4Resolved = daysAgo(3, 2);
  const c4Res = insertComplaint.run(
    'CMP-0004',
    'Food hygiene inspection and itemized price list display in Central Canteen',
    'Requesting random surprise hygiene audits at food prep stations and mandatory publication of government-regulated price cards.',
    'canteen',
    'resolved',
    0,
    0,
    null,
    'admin',
    studentIds[3].id, // Ishita Roy
    null,
    c4Created,
    c4Resolved
  );
  const c4Id = c4Res.lastInsertRowid;
  insertComplaintUpdate.run(c4Id, 'submitted', 'Complaint registered by student in the portal.', studentIds[3].id, c4Created);
  insertComplaintUpdate.run(c4Id, 'under_review', 'Sent query to catering contractor and dispatched student welfare officer.', adminId, daysAgo(5, 6));
  insertComplaintUpdate.run(c4Id, 'in_progress', 'Campus food audit team conducted physical inspection; water purifier filters replaced.', adminId, daysAgo(4, 8));
  insertComplaintUpdate.run(c4Id, 'resolved', 'Standardized rate card published at billing counters and cleanliness grade certificate displayed.', adminId, c4Resolved);

  // Complaint 5: Faculty, under_review, ANONYMOUS #2, routes to HOD CSE (1 day old)
  const c5Created = daysAgo(1, 6);
  const c5Updated = daysAgo(1, 1);
  const c5Res = insertComplaint.run(
    'CMP-0005',
    'Clarification on grading rubric for Assignment 2 in DBMS',
    'The grading criteria for query execution plan questions was not published prior to submission deadlines, resulting in ambiguous score deductions.',
    'faculty',
    'under_review',
    1, // Anonymous
    0,
    null,
    'hod',
    studentIds[4].id, // Kavya Nair
    cseId,
    c5Created,
    c5Updated
  );
  const c5Id = c5Res.lastInsertRowid;
  insertComplaintUpdate.run(c5Id, 'submitted', 'Anonymous complaint registered in the portal. Awaiting departmental assignment.', studentIds[4].id, c5Created);
  insertComplaintUpdate.run(c5Id, 'under_review', 'Discussed with course faculty Prof. Neha Patel. A model solution key and re-evaluation window will be announced.', hodCseId, c5Updated);

  // Complaint 6: Hostel, in_progress, already escalated (2 days 6h old, safely under 2d 12h)
  const c6Created = daysAgo(2, 6);
  const c6Escalated = daysAgo(1, 2);
  const c6Res = insertComplaint.run(
    'CMP-0006',
    'Inconsistent water pressure on 3rd floor of Boys Hostel Wing B',
    'Frequent pressure fluctuations and lack of water flow in morning hours between 7 AM and 9 AM.',
    'hostel',
    'in_progress',
    0,
    1, // Escalated
    c6Escalated,
    'admin',
    studentIds[5].id, // Aryan Kapoor
    null,
    c6Created,
    c6Escalated
  );
  const c6Id = c6Res.lastInsertRowid;
  insertComplaintUpdate.run(c6Id, 'submitted', 'Complaint registered by student in the portal.', studentIds[5].id, c6Created);
  insertComplaintUpdate.run(c6Id, 'under_review', 'Hostel warden inspected overhead supply pumps.', adminId, daysAgo(1, 20));
  insertComplaintUpdate.run(c6Id, 'in_progress', 'Plumbing contractor dispatched to replace auxiliary booster pump; escalated for priority resolution.', adminId, c6Escalated);

  // Complaint 7: Academic, resolved, SKIPPED STAGE (Submitted -> In Progress -> Resolved, no under_review)
  const c7Created = daysAgo(4, 5);
  const c7Resolved = daysAgo(3, 1);
  const c7Res = insertComplaint.run(
    'CMP-0007',
    'Request for VLSI workshop reference materials and recordings',
    'Requesting CAD tool installation guide and recorded lecture demonstration links for students who had exam clashes.',
    'academic',
    'resolved',
    0,
    0,
    null,
    'hod',
    studentIds[10].id, // Ananya Iyer (ECE)
    eceId,
    c7Created,
    c7Resolved
  );
  const c7Id = c7Res.lastInsertRowid;
  insertComplaintUpdate.run(c7Id, 'submitted', 'Complaint registered by student in the portal.', studentIds[10].id, c7Created);
  // Skipped under_review
  insertComplaintUpdate.run(c7Id, 'in_progress', 'Immediate action taken: Laboratory coordinator collected drive links and notes.', hodEceId, daysAgo(3, 12));
  insertComplaintUpdate.run(c7Id, 'resolved', 'Workshop reference package uploaded to course intranet and shared with class representatives.', hodEceId, c7Resolved);

  // Complaint 8: Other, submitted, routes to Admin (3 hours old)
  const c8Created = daysAgo(0, 3);
  const c8Res = insertComplaint.run(
    'CMP-0008',
    'Campus shuttle bus frequency during semester review week',
    'Requesting an additional shuttle service trip at 8:30 PM connecting hostel gates to the main transit junction during exam preparation days.',
    'other',
    'submitted',
    0,
    0,
    null,
    'admin',
    studentIds[11].id, // Varun Reddy (ECE)
    null,
    c8Created,
    c8Created
  );
  const c8Id = c8Res.lastInsertRowid;
  insertComplaintUpdate.run(c8Id, 'submitted', 'Complaint registered by student in the portal. Awaiting administrative review.', studentIds[11].id, c8Created);

  // =========================================================================
  // 9. Extra 25 Historical Complaints (CMP-0009 through CMP-0033) for Phase 4
  // All complaints older than 3 days are seeded as RESOLVED.
  // Complaints under 3 days are in active states (submitted/under_review/in_progress).
  // This guarantees CMP-0001 and CMP-0003 remain the ONLY 2 escalated tickets!
  // =========================================================================
  const extraComplaints = [
    {
      no: 'CMP-0009',
      title: 'Digital library Springer IEEE journal access IP authentication error',
      desc: 'Campus network proxy rejects IEEE Xplore off-campus authentication tokens during late-evening research hours.',
      cat: 'library',
      dept: null,
      role: 'admin',
      days: 28,
      h: 4,
      resolveDays: 2,
      anon: 0,
      sIdx: 6,
      status: 'resolved'
    },
    {
      no: 'CMP-0010',
      title: 'Projector HDMI port damaged in Seminar Hall A',
      desc: 'The primary HDMI wall plate in Seminar Hall A has a broken pin causing screen flickering during project presentations.',
      cat: 'infrastructure',
      dept: null,
      role: 'admin',
      days: 26,
      h: 6,
      resolveDays: 1,
      anon: 0,
      sIdx: 7,
      status: 'resolved'
    },
    {
      no: 'CMP-0011',
      title: 'Clarification on elective subject swap procedure for Semester 4',
      desc: 'Guidelines on credit transfer for swapping between Cyber Security and Cloud Computing electives are unclear.',
      cat: 'academic',
      dept: cseId,
      role: 'hod',
      days: 25,
      h: 2,
      resolveDays: 3,
      anon: 1,
      sIdx: 8,
      status: 'resolved'
    },
    {
      no: 'CMP-0012',
      title: 'Hot water geyser timer failure in Girls Hostel Block C',
      desc: 'Morning hot water supply timer turns off at 7:30 AM instead of 8:30 AM causing difficulties before early morning 8 AM classes.',
      cat: 'hostel',
      dept: null,
      role: 'admin',
      days: 24,
      h: 8,
      resolveDays: 2,
      anon: 0,
      sIdx: 9,
      status: 'resolved'
    },
    {
      no: 'CMP-0013',
      title: 'Request for additional office hours before mid-term exams in Signals',
      desc: 'Requesting extra doubt clearance slots for Fourier transform and Laplace transform numerical problems.',
      cat: 'faculty',
      dept: eceId,
      role: 'hod',
      days: 22,
      h: 5,
      resolveDays: 2,
      anon: 0,
      sIdx: 12,
      status: 'resolved'
    },
    {
      no: 'CMP-0014',
      title: 'Breakfast counter payment queue delays in South Canteen',
      desc: 'Only one cash register counter is active during peak morning hours between 8:15 AM and 8:45 AM leading to class delays.',
      cat: 'canteen',
      dept: null,
      role: 'admin',
      days: 21,
      h: 3,
      resolveDays: 1,
      anon: 0,
      sIdx: 13,
      status: 'resolved'
    },
    {
      no: 'CMP-0015',
      title: 'Water cooler purification filter replacement in Department Annex 2nd Floor',
      desc: 'Water taste and odor indicator shows yellow warning light on the water dispenser near Room 204.',
      cat: 'infrastructure',
      dept: null,
      role: 'admin',
      days: 20,
      h: 7,
      resolveDays: 2,
      anon: 1,
      sIdx: 14,
      status: 'resolved'
    },
    {
      no: 'CMP-0016',
      title: 'Microcontroller lab dev board programmer drivers missing on Windows workstations',
      desc: 'Keil uVision driver for ST-Link programmer is not installed on machines 11 through 20 in the Embedded Systems Lab.',
      cat: 'academic',
      dept: eceId,
      role: 'hod',
      days: 19,
      h: 4,
      resolveDays: 2,
      anon: 0,
      sIdx: 15,
      status: 'resolved'
    },
    {
      no: 'CMP-0017',
      title: 'Late evening study hall air circulation & lighting in Central Library',
      desc: 'Two ceiling fans are non-functional in the 3rd floor quiet reference zone creating stuffy study conditions.',
      cat: 'library',
      dept: null,
      role: 'admin',
      days: 18,
      h: 9,
      resolveDays: 3,
      anon: 0,
      sIdx: 16,
      status: 'resolved'
    },
    {
      no: 'CMP-0018',
      title: 'Clarification on rubric for DBMS mini-project intermediate demo',
      desc: 'Evaluation criteria weighting between ER diagram design and SQL DDL scripts was not shared prior to evaluation week.',
      cat: 'faculty',
      dept: cseId,
      role: 'hod',
      days: 16,
      h: 5,
      resolveDays: 1,
      anon: 1,
      sIdx: 17,
      status: 'resolved'
    },
    {
      no: 'CMP-0019',
      title: 'Automated turnstile gate card scanner failure at Hostel Gate 2',
      desc: 'RFID smart card sensor takes multiple attempts to read student ID cards causing long entry queues after 9 PM.',
      cat: 'hostel',
      dept: null,
      role: 'admin',
      days: 15,
      h: 6,
      resolveDays: 2,
      anon: 0,
      sIdx: 18,
      status: 'resolved'
    },
    {
      no: 'CMP-0020',
      title: 'Campus badminton court floodlights malfunctioning in Sports Complex',
      desc: 'Two corner halogen bulbs are blown on court 2 preventing evening inter-department practice matches.',
      cat: 'other',
      dept: null,
      role: 'admin',
      days: 14,
      h: 2,
      resolveDays: 3,
      anon: 0,
      sIdx: 19,
      status: 'resolved'
    },
    {
      no: 'CMP-0021',
      title: 'Additional reference copies of Tanenbaum Computer Networks in departmental library',
      desc: 'Only two hard copies are available for 60 enrolled students; both have been reserved for 2 weeks.',
      cat: 'academic',
      dept: cseId,
      role: 'hod',
      days: 13,
      h: 7,
      resolveDays: 2,
      anon: 0,
      sIdx: 0,
      status: 'resolved'
    },
    {
      no: 'CMP-0022',
      title: 'Canteen cutlery sterilization and sanitization audit request',
      desc: 'Spoons and plates at the central buffet counter were oily and damp during lunch rush.',
      cat: 'canteen',
      dept: null,
      role: 'admin',
      days: 12,
      h: 4,
      resolveDays: 1,
      anon: 1,
      sIdx: 1,
      status: 'resolved'
    },
    {
      no: 'CMP-0023',
      title: 'Laboratory 3 power supply stabilizer tripped during afternoon practicals',
      desc: 'Frequent electrical surges caused workstation restarts resulting in unsaved code loss during compiler lab.',
      cat: 'infrastructure',
      dept: null,
      role: 'admin',
      days: 11,
      h: 6,
      resolveDays: 2,
      anon: 0,
      sIdx: 2,
      status: 'resolved'
    },
    {
      no: 'CMP-0024',
      title: 'Digital signal processing assignment portal submission deadline clash with fest hackathon',
      desc: 'Submission window closes at 6 PM during the flagship 24-hour hackathon. Requesting a 12-hour grace period.',
      cat: 'academic',
      dept: eceId,
      role: 'hod',
      days: 10,
      h: 3,
      resolveDays: 1,
      anon: 0,
      sIdx: 10,
      status: 'resolved'
    },
    {
      no: 'CMP-0025',
      title: 'Quiet study carrel reservation system double-booking glitch in Library',
      desc: 'Online study seat booking portal allows concurrent reservation of cubicle 14 by two students.',
      cat: 'library',
      dept: null,
      role: 'admin',
      days: 9,
      h: 5,
      resolveDays: 2,
      anon: 0,
      sIdx: 3,
      status: 'resolved'
    },
    {
      no: 'CMP-0026',
      title: 'ECE project guide meeting schedule clash with campus placement training',
      desc: 'Cap-stone project review clashes with the mandatory aptitude test session conducted by training cell.',
      cat: 'faculty',
      dept: eceId,
      role: 'hod',
      days: 8,
      h: 4,
      resolveDays: 2,
      anon: 1,
      sIdx: 11,
      status: 'resolved'
    },
    {
      no: 'CMP-0027',
      title: 'Washing machine drainage blockage in Boys Hostel 1 laundry room',
      desc: 'Water accumulation on the laundry room floor creates slippery hazards and damp odors.',
      cat: 'hostel',
      dept: null,
      role: 'admin',
      days: 7,
      h: 6,
      resolveDays: 2,
      anon: 0,
      sIdx: 4,
      status: 'resolved'
    },
    {
      no: 'CMP-0028',
      title: 'Request for additional campus EV charging stations near East Parking',
      desc: 'Students commuting via electric two-wheelers need charging ports during long laboratory schedule days.',
      cat: 'other',
      dept: null,
      role: 'admin',
      days: 6,
      h: 5,
      resolveDays: 2,
      anon: 0,
      sIdx: 5,
      status: 'resolved'
    },
    {
      no: 'CMP-0029',
      title: 'Data Structures practice problem set solutions key request',
      desc: 'Need official test case explanations for non-linear tree traversal homework problems.',
      cat: 'academic',
      dept: cseId,
      role: 'hod',
      days: 5,
      h: 3,
      resolveDays: 2,
      anon: 0,
      sIdx: 6,
      status: 'resolved'
    },
    {
      no: 'CMP-0030',
      title: 'Canteen evening fruit and fresh juice counter cleanliness audit',
      desc: 'Fruit storage refrigeration temperature needs daily logging to ensure food safety standards.',
      cat: 'canteen',
      dept: null,
      role: 'admin',
      days: 4,
      h: 4,
      resolveDays: 1,
      anon: 0,
      sIdx: 7,
      status: 'resolved'
    },
    // The following 3 complaints are less than 3 days old (safe from SLA escalation, active for charts):
    {
      no: 'CMP-0031',
      title: 'Classroom 302 microphone wireless receiver static noise',
      desc: 'Microphone audio emits high-pitched feedback bursts during lectures in Room 302.',
      cat: 'infrastructure',
      dept: null,
      role: 'admin',
      days: 2,
      h: 2, // 2 days 2 hours old (< 2 days 12h)
      status: 'under_review',
      anon: 0,
      sIdx: 8
    },
    {
      no: 'CMP-0032',
      title: 'Signals & Systems quiz grading discrepancy for question 4',
      desc: 'Discrete Fourier Transform formula evaluation was marked incorrect despite matching textbook standard.',
      cat: 'faculty',
      dept: eceId,
      role: 'hod',
      days: 1,
      h: 6, // 1 day 6 hours old
      status: 'in_progress',
      anon: 1,
      sIdx: 12
    },
    {
      no: 'CMP-0033',
      title: 'Digital reference room air conditioning filter cleaning request',
      desc: 'The split AC unit on the 1st floor e-library section is blowing dust during operational hours.',
      cat: 'library',
      dept: null,
      role: 'admin',
      days: 0,
      h: 8, // 8 hours old
      status: 'submitted',
      anon: 0,
      sIdx: 9
    }
  ];

  extraComplaints.forEach((ec) => {
    const student = studentIds[ec.sIdx % studentIds.length];
    const createdTimestamp = daysAgo(ec.days, ec.h);
    let updatedTimestamp = createdTimestamp;
    let reviewerId = ec.role === 'admin' ? adminId : (ec.dept === eceId ? hodEceId : hodCseId);

    if (ec.status === 'resolved') {
      updatedTimestamp = daysAgo(Math.max(ec.days - ec.resolveDays, 1), ec.h + 2);
    } else if (ec.status === 'under_review' || ec.status === 'in_progress') {
      updatedTimestamp = daysAgo(ec.days, Math.max(ec.h - 2, 0));
    }

    const cRes = insertComplaint.run(
      ec.no,
      ec.title,
      ec.desc,
      ec.cat,
      ec.status,
      ec.anon,
      0, // un-escalated
      null,
      ec.role,
      student.id,
      ec.dept,
      createdTimestamp,
      updatedTimestamp
    );
    const cId = cRes.lastInsertRowid;

    // Timeline updates
    insertComplaintUpdate.run(cId, 'submitted', ec.anon ? 'Anonymous grievance submitted via portal.' : 'Grievance submitted by student.', student.id, createdTimestamp);

    if (ec.status === 'under_review' || ec.status === 'in_progress' || ec.status === 'resolved') {
      insertComplaintUpdate.run(cId, 'under_review', 'Grievance reviewed by assigned departmental authority.', reviewerId, daysAgo(ec.days, Math.max(ec.h - 1, 0)));
    }
    if (ec.status === 'in_progress' || ec.status === 'resolved') {
      insertComplaintUpdate.run(cId, 'in_progress', 'Corrective action plan initiated and assigned to campus team.', reviewerId, daysAgo(ec.days, Math.max(ec.h - 2, 0)));
    }
    if (ec.status === 'resolved') {
      insertComplaintUpdate.run(cId, 'resolved', 'Issue resolved and verified through standard institutional audit protocol.', reviewerId, updatedTimestamp);
    }
  });

  // 10. Seed 4 Assignments across courses with 3 sample submissions
  const insertAssignment = db.prepare(`
    INSERT INTO assignments (
      course_id, title, description, due_date, max_score,
      attachment_path, attachment_name, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSubmission = db.prepare(`
    INSERT INTO submissions (
      assignment_id, student_id, file_path, file_name,
      note, submitted_at, is_late, score, feedback,
      graded_by, graded_at, extracted_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  function createSampleUpload(filename, content) {
    const safeName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.txt`;
    const fullPath = path.join(uploadsDir, safeName);
    pendingUploadFiles.push({ fullPath, content });
    return { safeName, originalName: filename, content };
  }

  // Assignment 1 (CSE-201, Prof. Vikram Sharma): Due 2 days ago
  const a1Brief = createSampleUpload(
    'Assignment_1_CLRS_RedBlackTree_Spec.txt',
    'CSE-201 Data Structures & Algorithms Assignment 1:\nImplement a balanced Red-Black Tree in C++ ensuring all five CLRS properties hold.\nInclude insertion rebalancing, tree rotation routines, and benchmark against std::map.'
  );
  const a1Res = insertAssignment.run(
    courses[0].id,
    'Implement Balanced Red-Black Tree in C++',
    'Implement node insertion, tree rotations, and deletion rebalancing according to standard CLRS invariants. Include time complexity benchmarks.',
    daysAgo(2, 0),
    100,
    a1Brief.safeName,
    a1Brief.originalName,
    faculty1Id,
    daysAgo(7, 4)
  );
  const a1Id = a1Res.lastInsertRowid;

  // Submission 1 for A1: Student 1 (Aarav Mehta), on time, graded (Preserved Phase 7 state)
  const sub1Content = `This laboratory report presents an implementation of a balanced Red-Black Tree data structure in C++ according to CLRS specifications. Each tree node contains key, color, left, right, and parent pointers. Five core invariants are maintained: every node is red or black, the root is black, all NIL leaves are black, if a node is red then both its children are black, and every path from a given node to any of its descendant NIL leaves contains the same number of black nodes. Insertion begins with standard binary search tree placement followed by insertFixup. When the uncle node is red, a simple recoloring routine propagates up the tree. When the uncle is black, appropriate left or right rotations resolve zig-zag and zig-zig configurations. Benchmarking against std::map demonstrates logarithmic scaling and robust rebalancing across 50000 randomized test insertions without memory leaks.`;

  const sub1File = createSampleUpload(
    'Aarav_Mehta_RedBlackTree_CLRS.txt',
    sub1Content
  );
  insertSubmission.run(
    a1Id,
    studentIds[0].id,
    sub1File.safeName,
    sub1File.originalName,
    'All unit tests pass with zero memory leaks verified via valgrind.',
    daysAgo(3, 2),
    0, // on-time
    94.0,
    'Excellent implementation! Clean rotation logic and well-documented balancing cases.',
    faculty1Id,
    daysAgo(1, 4),
    sub1File.content
  );

  // Submission 2 for A1: Student 2 (Diya Sen), late, pending grading (High similarity case ~70% with Aarav + AI phrases)
  const sub2Content = `In this coursework report, we delve into an implementation of a balanced Red-Black Tree data structure in C++ according to CLRS specifications. Furthermore, it is important to note that each tree node contains key, color, left, right, and parent pointers. Five core invariants are maintained: every node is red or black, the root is black, all NIL leaves are black, if a node is red then both its children are black, and every path from a given node to any of its descendant NIL leaves contains the same number of black nodes. Insertion begins with standard binary search tree placement followed by insertFixup. When the uncle node is red, a simple recoloring routine propagates up the tree. When the uncle is black, appropriate left or right rotations resolve zig-zag and zig-zig configurations. In conclusion, benchmarking against std::map demonstrates logarithmic scaling and robust rebalancing across randomized test insertions without memory leaks.`;

  const sub2File = createSampleUpload(
    'Diya_Sen_RBTree_Submission.txt',
    sub2Content
  );
  insertSubmission.run(
    a1Id,
    studentIds[1].id,
    sub2File.safeName,
    sub2File.originalName,
    'Completed all tree rotation cases and test benchmarks.',
    daysAgo(1, 10),
    1, // is_late
    null,
    null,
    null,
    null,
    sub2File.content
  );

  // Submission 3 for A1: Student 3 (Rohan Joshi), on-time, pending grading (Medium similarity case ~35-45%)
  const sub3A1Content = `Implementation study of self-balancing binary search trees with emphasis on Red-Black Tree mechanics in modern C++. Every node is colored red or black, the root is always black, NIL leaves are black, and equal black-height is preserved across all downward traversal paths. To resolve violations after insertion, the algorithm inspects uncle node colors. If the uncle is red, we perform iterative recoloring of parent and grandparent. If black, single or double rotations restore balance. In our laboratory experimental benchmarks, average insertion latency remained strictly O(log n) when handling 100000 random integers. Compared to an unbalanced binary search tree which degrades to O(n) under sorted input sequences, the Red-Black Tree guarantees worst-case operational boundaries for high-throughput dictionary lookups.`;

  const sub3A1File = createSampleUpload(
    'Rohan_Joshi_RBTree_Implementation.txt',
    sub3A1Content
  );
  insertSubmission.run(
    a1Id,
    studentIds[2].id,
    sub3A1File.safeName,
    sub3A1File.originalName,
    'Verified tree height bounds and asymptotic runtimes against test vectors.',
    daysAgo(2, 6),
    0, // on-time
    null,
    null,
    null,
    null,
    sub3A1File.content
  );

  // Submission 4 for A1: Student 4 (Ishita Roy), on-time, pending grading (Low similarity case < 20%, clearly original)
  const sub4A1Content = `An optimized memory-efficient implementation of symmetric binary search trees utilizing custom pooled allocators. Rather than standard CLRS pointer overhead, this solution packs color bits into node alignment padding to minimize cache misses during high-frequency traversals. Rotations are implemented via branchless pointer swaps where feasible, and balancing logic is decoupled into standalone template policies. We verified asymptotic behavior using Google Benchmark with cachegrind profiling on x86-64 hardware. Deletion fixup handles the four canonical symmetric cases with comprehensive black-height preservation asserts. Test suites validate one million random insertions, deletions, and range queries against an AVL tree baseline, confirming that Red-Black trees incur fewer rotations during heavy mutation workloads while retaining predictable sub-millisecond retrieval latencies throughout stress testing.`;

  const sub4A1File = createSampleUpload(
    'Ishita_Roy_RedBlackTree_Optimized.txt',
    sub4A1Content
  );
  insertSubmission.run(
    a1Id,
    studentIds[3].id,
    sub4A1File.safeName,
    sub4A1File.originalName,
    'Zero heap fragmentation with custom slab allocator benchmarks attached.',
    daysAgo(2, 14),
    0, // on-time
    null,
    null,
    null,
    null,
    sub4A1File.content
  );

  // Submission 5 for A1: Student 5 (Kavya Nair), on-time, pending grading (Not checkable case: diagram image, no text extracted)
  const sub5A1File = createSampleUpload(
    'Kavya_Nair_RBTree_Architecture.png',
    'PNG_RAW_BINARY_DATA_NO_EXTRACTED_TEXT'
  );
  insertSubmission.run(
    a1Id,
    studentIds[4].id,
    sub5A1File.safeName,
    sub5A1File.originalName,
    'Uploaded software architecture diagram and Valgrind memory leak profiling screenshot.',
    daysAgo(2, 8),
    0, // on-time
    null,
    null,
    null,
    null,
    null // null extracted_text marks as "Not checkable"
  );

  // Assignment 2 (CSE-202, Prof. Neha Patel): Due 1 day 6 hours ago
  const a2Brief = createSampleUpload(
    'DBMS_CaseStudy_Normalization_Guide.txt',
    'CSE-202 Database Systems Assignment 2:\nCampus registrar relational database normalization case study. Provide step-by-step minimal cover and BCNF decomposition.'
  );
  const a2Res = insertAssignment.run(
    courses[1].id,
    'Relational Schema Normalization & BCNF Decomposition',
    'Given the campus registrar case study, compute functional dependencies, minimal cover, candidate keys, and decompose into Boyce-Codd Normal Form (BCNF).',
    daysAgo(1, 6),
    50,
    a2Brief.safeName,
    a2Brief.originalName,
    faculty2Id,
    daysAgo(6, 2)
  );
  const a2Id = a2Res.lastInsertRowid;

  // Submission 3 for A2: Student 3 (Rohan Joshi), on time, pending grading
  const sub3File = createSampleUpload(
    'Rohan_Joshi_DBMS_BCNF_Proofs.txt',
    'Normalization project report by Rohan Joshi. All functional dependencies proven lossless and dependency-preserving.'
  );
  insertSubmission.run(
    a2Id,
    studentIds[2].id,
    sub3File.safeName,
    sub3File.originalName,
    'Please find step-by-step canonical cover and BCNF decomposition proofs.',
    daysAgo(2, 4),
    0,
    null,
    null,
    null,
    null,
    sub3File.content
  );

  // Assignment 3 (ECE-201, Prof. Amit Verma): Due in 3 days, 0 submissions
  insertAssignment.run(
    courses[3].id,
    'Verilog HDL Finite State Machine for Traffic Light Controller',
    'Design and simulate a synchronous Mealy/Moore FSM traffic controller in Verilog with pedestrian crossing override.',
    daysAhead(3, 0),
    100,
    null,
    null,
    faculty3Id,
    daysAgo(3, 1)
  );

  // Assignment 4 (CSE-203, Prof. Vikram Sharma): Due in 5 days, 0 submissions (Live exhibition demo)
  const a4Brief = createSampleUpload(
    'OS_DiningPhilosophers_POSIX_Spec.txt',
    'CSE-203 Operating Systems Assignment 4:\nImplement a deadlock-free and starvation-free monitor for the Dining Philosophers problem using POSIX sem_t and pthread_mutex primitives.'
  );
  insertAssignment.run(
    courses[2].id,
    'Process Synchronization & Dining Philosophers Semaphore Lab',
    'Develop a deadlock-free and starvation-free monitor implementation for the Dining Philosophers problem using POSIX semaphores.',
    daysAhead(5, 0),
    100,
    a4Brief.safeName,
    a4Brief.originalName,
    faculty1Id,
    daysAgo(1, 2)
  );

  console.log('[Edusphere Seed] Inserted 4 Assignments and 3 Submissions with uploaded sample files.');

  // 12. Study Resources (Phase 9: 6 diverse resources across courses)
  function createSampleResourceFile(filename, content) {
    const ext = path.extname(filename) || '.txt';
    const safeName = `res-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const fullPath = path.join(resourcesDir, safeName);
    const size = Buffer.byteLength(content, 'utf8');
    pendingUploadFiles.push({ fullPath, content });
    return { fullPath, safeName, originalName: filename, size };
  }

  const insertResource = db.prepare(`
    INSERT INTO resources (
      course_id, title, description, category,
      file_path, file_name, file_size, external_url,
      uploaded_by, created_at, download_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Resource 1: CSE-201 (Prof. Vikram Sharma) - Notes
  const r1Content = `CSE-201: Data Structures & Algorithms
Lecture Notes: Balanced Search Trees & Red-Black Invariants
Instructor: Prof. Vikram Sharma

1. Red-Black Tree Properties (CLRS Chapter 13):
   - Property 1: Every node is either RED or BLACK.
   - Property 2: The root node is always BLACK.
   - Property 3: Every NIL leaf is considered BLACK.
   - Property 4: If a node is RED, both of its children must be BLACK (no adjacent red nodes).
   - Property 5: For each node, all simple paths from the node to descendant leaves contain the same number of black nodes (black-height bh(x)).

2. Rotation Routines:
   - Left-Rotate(T, x): Pivots x down to the left, promoting its right child y.
   - Right-Rotate(T, y): Pivots y down to the right, promoting its left child x.

3. Insertion Cases & Fixup:
   - Case 1: Uncle node is RED -> Recoloring parent, uncle, and grandparent.
   - Case 2: Uncle node is BLACK (zig-zag / triangle) -> Left rotation transforms to Case 3.
   - Case 3: Uncle node is BLACK (zig-zig / line) -> Right rotation and recoloring resolves violation.

Conclusion & Complexity:
All basic dynamic-set operations run in O(log n) time in the worst case with maximum 2 rotations per insertion.`;

  const r1File = createSampleResourceFile('CSE201_RedBlackTrees_LectureNotes.txt', r1Content);
  insertResource.run(
    courses[0].id,
    'Lecture Notes: Balanced Search Trees & Red-Black Invariants',
    'Detailed derivations of CLRS Red-Black tree insertion, deletion cases, recoloring rules, and rotation tree proofs.',
    'notes',
    r1File.fullPath,
    r1File.originalName,
    r1File.size,
    null,
    faculty1Id,
    daysAgo(5, 2),
    14
  );

  // Resource 2: CSE-201 (Prof. Vikram Sharma) - Previous Paper
  const r2Content = `EDUSPHERE UNIVERSITY - DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING
Mid-Term Examination 2025 - Model Solutions
Course: CSE-201 Data Structures & Algorithms

Question 1: Prove that a Red-Black tree with n internal nodes has height at most 2*log2(n+1).
Solution: By induction on subtree height, bh(x) >= h/2. The subtree rooted at x contains at least 2^(bh(x)) - 1 internal nodes. Hence n >= 2^(h/2) - 1, which implies h <= 2*log2(n+1). Q.E.D.

Question 2: Given keys [10, 20, 30, 15, 25], trace the insertion steps into an initially empty Red-Black tree.
Solution:
1. Insert 10 (Black root).
2. Insert 20 (Red child of 10).
3. Insert 30 (Red child of 20). Uncle NIL is Black. Zig-zig configuration. Left-Rotate(10), recolor 20 Black, 10 and 30 Red.
4. Insert 15 (Red child of 10).
5. Insert 25 (Red child of 30). Valid balanced configuration.

Max Marks: 50 | Time Allowed: 2 Hours.`;

  const r2File = createSampleResourceFile('CSE201_Midterm_2025_Solved.txt', r2Content);
  insertResource.run(
    courses[0].id,
    'Midterm Exam 2025: Data Structures Solved Paper',
    'Official question paper and complete step-by-step model solutions for the Midterm 2025 examination.',
    'previous_paper',
    r2File.fullPath,
    r2File.originalName,
    r2File.size,
    null,
    faculty1Id,
    daysAgo(3, 5),
    22
  );

  // Resource 3: CSE-202 (Prof. Neha Patel) - Slides
  const r3Content = `CSE-202 Database Management Systems
Lecture Presentation: Relational Normalization (1NF to BCNF)
Instructor: Prof. Neha Patel

Slide 1: Anomalies in Unnormalized Schemas
- Insertion Anomaly: Cannot record department info without an employee.
- Deletion Anomaly: Deleting the last employee erases the department.
- Update Anomaly: Multiple rows require duplicate updates, leading to inconsistency.

Slide 2: First Normal Form (1NF)
- Domain of each attribute contains only atomic (indivisible) values. No repeating groups or multivalued sets.

Slide 3: Second Normal Form (2NF)
- Schema is in 1NF and every non-prime attribute is fully functionally dependent on any candidate key (no partial dependencies).

Slide 4: Third Normal Form (3NF)
- For every functional dependency X -> Y, either X is a superkey or Y is a prime attribute (no transitive dependencies).

Slide 5: Boyce-Codd Normal Form (BCNF)
- Stricter condition: For every non-trivial functional dependency X -> Y, X must be a superkey. Guarantees zero redundancy from functional dependencies.`;

  const r3File = createSampleResourceFile('CSE202_Normalization_Slides.txt', r3Content);
  insertResource.run(
    courses[1].id,
    'Lecture Slides: Relational Normalization (1NF to BCNF)',
    'Presentation slides covering functional dependencies, candidate keys, 2NF, 3NF, BCNF decompositions, and lossless-join verification.',
    'slides',
    r3File.fullPath,
    r3File.originalName,
    r3File.size,
    null,
    faculty2Id,
    daysAgo(4, 1),
    9
  );

  // Resource 4: CSE-202 (Prof. Neha Patel) - Reference Link
  insertResource.run(
    courses[1].id,
    'Interactive SQL Schema & Query Practice Lab',
    'Interactive browser-based playground for writing and testing SQL queries, joins, subqueries, and table constraints.',
    'reference',
    null,
    null,
    null,
    'https://sqlbolt.com/',
    faculty2Id,
    daysAgo(6, 3),
    5
  );

  // Resource 5: CSE-203 (Prof. Vikram Sharma) - Notes
  const r5Content = `CSE-203 Operating Systems
Topic: Process Synchronization & Deadlock Cheatsheet
Instructor: Prof. Vikram Sharma

1. The Critical-Section Problem:
   Must satisfy three requirements:
   - Mutual Exclusion: Only one process can execute in its critical section at a time.
   - Progress: Selection of the next process cannot be postponed indefinitely.
   - Bounded Waiting: A bound must exist on the number of times others enter before a request is granted.

2. Classic Synchronization Primitives:
   - Mutex: Binary lock with ownership semantics.
   - Counting Semaphore: Integer value; wait() decrements, signal() increments.
   - Monitor: High-level language construct with condition variables (wait, signal).

3. Deadlock Characterization (Coffman Conditions):
   All four must hold simultaneously:
   1. Mutual Exclusion
   2. Hold and Wait
   3. No Preemption
   4. Circular Wait

4. Banker's Algorithm Data Structures:
   - Available[m]: Available instances of resource type j.
   - Max[n][m]: Maximum demand of process i for resource j.
   - Allocation[n][m]: Current allocated instances.
   - Need[n][m] = Max[n][m] - Allocation[n][m].`;

  const r5File = createSampleResourceFile('CSE203_Sync_Deadlock_Cheatsheet.txt', r5Content);
  insertResource.run(
    courses[2].id,
    'Operating Systems: Process Synchronization & Deadlock Cheatsheet',
    'Quick-reference guide to Peterson\'s algorithm, semaphores, mutex locks, condition variables, and Banker\'s deadlock avoidance algorithm.',
    'notes',
    r5File.fullPath,
    r5File.originalName,
    r5File.size,
    null,
    faculty1Id,
    daysAgo(2, 6),
    18
  );

  // Resource 6: ECE-201 (Prof. Amit Verma) - Real course: Digital Electronics & Logic Design
  const r6Content = `ECE-201 Digital Electronics & Logic Design
Topic: Karnaugh Maps & Sequential Circuit Design Cheatsheet
Instructor: Prof. Amit Verma

1. Boolean Simplification using 4-Variable K-Maps:
   - Gray Code cell ordering: 00, 01, 11, 10 for rows and columns.
   - Grouping adjacent 1s in powers of 2 (1, 2, 4, 8, 16) with wrapping around edges.
   - Eliminating redundant prime implicants to obtain Minimal Sum of Products (SOP).

2. Sequential Flip-Flop Excitation Tables:
   - SR Flip-Flop: S = Q* (for 0->1), R = Q (for 1->0).
   - JK Flip-Flop: J=0, K=X (0->0); J=1, K=X (0->1); J=X, K=1 (1->0); J=X, K=0 (1->1).
   - D Flip-Flop: D = Q* for all transitions.
   - T Flip-Flop: T = Q XOR Q*.

3. Synchronous Counter Design Procedure:
   Step 1: State Diagram & State Table.
   Step 2: Flip-flop selection (e.g. JK or T).
   Step 3: Excitation Table mapping present state to next state.
   Step 4: K-Map minimization for flip-flop inputs.
   Step 5: Logic circuit schematic implementation with clock distribution.`;

  const r6File = createSampleResourceFile('ECE201_Digital_Logic_Design_Kit.txt', r6Content);
  insertResource.run(
    courses[3].id,
    'Digital Electronics: Karnaugh Maps & Sequential Circuit Design Cheatsheet',
    'Comprehensive revision notes on K-Map minimization, flip-flop state transitions, and synchronous counter design with solved circuit diagrams.',
    'other',
    r6File.fullPath,
    r6File.originalName,
    r6File.size,
    null,
    faculty3Id,
    daysAgo(1, 4),
    7
  );

  console.log('[Edusphere Seed] Inserted 6 Study Resources across courses.');

  // 13. Academic Timetable Slots (Phase 10: Full weekly conflict-free schedule)
  const insertSlot = db.prepare(`
    INSERT INTO timetable_slots (
      course_id, day_of_week, start_time, end_time, room, slot_type, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const timetableSeedData = [
    // --- Monday (Day 1) - 6 classes total (>= 3 for CSE) ---
    { course_id: courses[0].id, day: 1, start: '09:00', end: '10:00', room: 'LH-101', type: 'lecture' },
    { course_id: courses[1].id, day: 1, start: '10:00', end: '11:00', room: 'LH-102', type: 'lecture' },
    { course_id: courses[0].id, day: 1, start: '11:15', end: '13:15', room: 'CS-Lab-1', type: 'lab' },
    { course_id: courses[2].id, day: 1, start: '14:00', end: '15:00', room: 'LH-101', type: 'lecture' },
    { course_id: courses[3].id, day: 1, start: '09:00', end: '10:00', room: 'LH-201', type: 'lecture' },
    { course_id: courses[4].id, day: 1, start: '10:00', end: '11:00', room: 'LH-201', type: 'lecture' },

    // --- Tuesday (Day 2) ---
    { course_id: courses[1].id, day: 2, start: '09:00', end: '10:00', room: 'LH-102', type: 'lecture' },
    { course_id: courses[0].id, day: 2, start: '10:00', end: '11:00', room: 'LH-101', type: 'tutorial' },
    { course_id: courses[2].id, day: 2, start: '11:00', end: '12:00', room: 'LH-101', type: 'lecture' },
    { course_id: courses[3].id, day: 2, start: '14:00', end: '16:00', room: 'EC-Lab-2', type: 'lab' },

    // --- Wednesday (Day 3) ---
    { course_id: courses[0].id, day: 3, start: '09:00', end: '10:00', room: 'LH-101', type: 'lecture' },
    { course_id: courses[1].id, day: 3, start: '10:00', end: '11:00', room: 'LH-102', type: 'tutorial' },
    { course_id: courses[2].id, day: 3, start: '11:30', end: '12:30', room: 'LH-101', type: 'lecture' },
    { course_id: courses[3].id, day: 3, start: '10:00', end: '11:00', room: 'LH-201', type: 'lecture' },
    { course_id: courses[4].id, day: 3, start: '14:00', end: '15:00', room: 'LH-201', type: 'tutorial' },

    // --- Thursday (Day 4) ---
    { course_id: courses[1].id, day: 4, start: '09:00', end: '10:00', room: 'LH-102', type: 'lecture' },
    { course_id: courses[0].id, day: 4, start: '10:00', end: '11:00', room: 'LH-101', type: 'lecture' },
    { course_id: courses[2].id, day: 4, start: '14:00', end: '16:00', room: 'CS-Lab-1', type: 'lab' },
    { course_id: courses[3].id, day: 4, start: '11:00', end: '12:00', room: 'LH-201', type: 'lecture' },
    { course_id: courses[4].id, day: 4, start: '12:00', end: '13:00', room: 'LH-201', type: 'lecture' },

    // --- Friday (Day 5) ---
    { course_id: courses[0].id, day: 5, start: '09:00', end: '10:00', room: 'LH-101', type: 'lecture' },
    { course_id: courses[1].id, day: 5, start: '10:00', end: '11:00', room: 'LH-102', type: 'lecture' },
    { course_id: courses[2].id, day: 5, start: '11:00', end: '12:00', room: 'LH-101', type: 'tutorial' },
    { course_id: courses[3].id, day: 5, start: '14:00', end: '15:00', room: 'LH-201', type: 'tutorial' },
    { course_id: courses[4].id, day: 5, start: '15:00', end: '16:00', room: 'LH-201', type: 'lecture' }
  ];

  for (const slot of timetableSeedData) {
    insertSlot.run(slot.course_id, slot.day, slot.start, slot.end, slot.room, slot.type, adminId);
  }

  console.log(`[Edusphere Seed] Inserted ${timetableSeedData.length} Timetable Slots across courses with zero conflicts.`);

  // 15. Seed Past Closed Live Attendance Session for CSE-201 (Phase 11)
  // Exactly ONE past closed session with ~10 check-ins, including 2 flagged check-ins (shared-device pair).
  // NO session or check-ins for today. NO device_bindings created (bindings start empty for first live phone check-in).
  const pastLiveDate = attendanceDates[attendanceDates.length - 2]; // 2 days ago
  const insertPastSession = db.prepare(`
    INSERT INTO attendance_sessions (
      course_id, faculty_id, date, started_at, ends_at, status, secret,
      code_interval_seconds, late_after_minutes, require_same_network, closed_at
    ) VALUES (?, ?, ?, ?, ?, 'closed', ?, 20, 10, 1, ?)
  `);

  const pastSecret = crypto.randomBytes(32).toString('hex');
  const pastStartedAt = `${pastLiveDate}T10:00:00.000Z`;
  const pastEndsAt = `${pastLiveDate}T10:15:00.000Z`;
  const pastClosedAt = `${pastLiveDate}T10:15:00.000Z`;

  const pastSessionRes = insertPastSession.run(
    courses[0].id,
    faculty1Id,
    pastLiveDate,
    pastStartedAt,
    pastEndsAt,
    pastSecret,
    pastClosedAt
  );
  const pastSessionId = pastSessionRes.lastInsertRowid;

  const insertPastCheckin = db.prepare(`
    INSERT INTO attendance_checkins (
      session_id, student_id, device_id, ip, user_agent, checked_at,
      result, flag_reasons, review, reviewed_by, reviewed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // First 7 CSE students: Clean Present
  for (let i = 0; i <= 6; i++) {
    insertPastCheckin.run(
      pastSessionId,
      studentIds[i].id,
      `dev-seed-cse-${i}`,
      `192.168.1.${100 + i}`,
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      `${pastLiveDate}T10:02:${String(12 + i * 4).padStart(2, '0')}.000Z`,
      'present',
      '[]',
      'none',
      null,
      null
    );
  }

  // 8th CSE student: Clean Late (checked in after 10m threshold)
  insertPastCheckin.run(
    pastSessionId,
    studentIds[7].id,
    'dev-seed-cse-7',
    '192.168.1.107',
    'Mozilla/5.0 (Android 13; Mobile)',
    `${pastLiveDate}T10:11:45.000Z`,
    'late',
    '[]',
    'none',
    null,
    null
  );

  // 9th & 10th CSE students: Shared Device Pair (both flagged)
  // Student 8 (Rhea Desai): Flagged, Approved by faculty
  insertPastCheckin.run(
    pastSessionId,
    studentIds[8].id,
    'dev-shared-demo-99',
    '192.168.1.108',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    `${pastLiveDate}T10:04:15.000Z`,
    'flagged',
    JSON.stringify(['shared_device']),
    'approved',
    faculty1Id,
    `${pastLiveDate}T10:16:00.000Z`
  );

  // Student 9 (Kabir Das): Flagged, Rejected by faculty
  insertPastCheckin.run(
    pastSessionId,
    studentIds[9].id,
    'dev-shared-demo-99',
    '192.168.1.109',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    `${pastLiveDate}T10:05:02.000Z`,
    'flagged',
    JSON.stringify(['shared_device']),
    'rejected',
    faculty1Id,
    `${pastLiveDate}T10:16:30.000Z`
  );

  console.log(`[Edusphere Seed] Seeded 1 past closed live attendance session with 10 checkins (including 2 flagged).`);

    // Foreign Key Integrity Check inside transaction
    const fkErrors = db.prepare('PRAGMA foreign_key_check').all();
    if (fkErrors.length > 0) {
      console.error('[Edusphere Seed] WARNING: Foreign key constraint violations detected:', fkErrors);
      throw new Error('Foreign key check failed: ' + JSON.stringify(fkErrors));
    }
  })();

  // File deletions and re-creation of uploads happen only after the database transaction succeeds.
  if (fs.existsSync(resourcesDir)) {
    const resFiles = fs.readdirSync(resourcesDir);
    for (const rf of resFiles) {
      try {
        const full = path.join(resourcesDir, rf);
        if (fs.statSync(full).isFile()) {
          fs.unlinkSync(full);
        }
      } catch (err) {
        // ignore
      }
    }
  } else {
    fs.mkdirSync(resourcesDir, { recursive: true });
  }

  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    for (const f of files) {
      try {
        const full = path.join(uploadsDir, f);
        if (fs.statSync(full).isFile()) {
          fs.unlinkSync(full);
        }
      } catch (err) {
        // ignore
      }
    }
  } else {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  for (const pf of pendingUploadFiles) {
    try {
      fs.writeFileSync(pf.fullPath, pf.content, 'utf8');
    } catch (err) {
      console.error('[Edusphere Seed] Warning writing sample file:', pf.fullPath, err.message);
    }
  }

  // Automatic verification self-check
  const verification = verifySeedIntegrity(db);

  console.log('[Edusphere Seed] Verified PRAGMA foreign_key_check: zero violations.');
  console.log('[Edusphere Seed] Successfully seeded all tables with demo data.');
  console.log('------------------------------------------------------------');
  console.log('DEMO ACCOUNTS READY:');
  console.log('Admin:       admin@edusphere.edu        / Admin@123');
  console.log('HOD (CSE):   hod.cse@edusphere.edu      / Hod@123');
  console.log('HOD (ECE):   hod.ece@edusphere.edu      / Hod@123');
  console.log('Faculty:     faculty.sharma@edusphere.edu / Faculty@123');
  console.log('Faculty:     faculty.patel@edusphere.edu  / Faculty@123');
  console.log('Faculty:     faculty.verma@edusphere.edu  / Faculty@123');
  console.log('Student:     student1@edusphere.edu     / Student@123');
  console.log('Student:     student11@edusphere.edu    / Student@123');
  console.log('------------------------------------------------------------');

  return verification;
}

if (require.main === module) {
  try {
    const v = seedDatabase();
    console.log('\n============================================================');
    console.log('🏛️  EDUSPHERE SEED INTEGRITY VERIFIED');
    console.log('============================================================');
    console.log(`✓ Users:                ${v.totalUsers} (1 admin, 2 HODs, 3 faculty, 20 students)`);
    console.log(`✓ Courses:              ${v.totalCourses} active courses`);
    console.log(`✓ Rooms:                ${v.totalRooms} lecture & lab facilities`);
    console.log(`✓ Timetable Slots:      ${v.totalSlots} weekly slots (conflict-free)`);
    console.log(`✓ Complaints:           ${v.totalComplaints} total (${v.baseComplaints} base, ${v.historicalComplaints} historical)`);
    console.log(`✓ Today's Attendance:   ${v.todayAttendanceCount} records (blank for live demo)`);
    console.log(`✓ Overdue Escalations:  ${v.escalatableComplaints.length} complaints (${v.escalatableComplaints.join(', ')})`);
    console.log(`✓ Foreign Key Check:    ${v.foreignKeyViolations} violations`);
    console.log('============================================================\n');
  } catch (err) {
    console.error('Error during database seeding:', err);
    process.exit(1);
  }
}

seedDatabase.verifySeedIntegrity = verifySeedIntegrity;
module.exports = seedDatabase;

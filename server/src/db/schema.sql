-- Edusphere Database Schema (SQLite)
-- College Management System with Complaint Management Module (Phase 1)

PRAGMA foreign_keys = ON;

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'hod', 'faculty', 'student')),
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Courses Table
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  faculty_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  credits INTEGER NOT NULL DEFAULT 3,
  semester INTEGER NOT NULL DEFAULT 1,
  weekly_lectures INTEGER NOT NULL DEFAULT 3,
  lab_hours_per_week INTEGER NOT NULL DEFAULT 0,
  course_type TEXT NOT NULL DEFAULT 'theory' CHECK(course_type IN ('theory', 'lab', 'both')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Enrollments Table
CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  semester INTEGER NOT NULL,
  academic_year TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'dropped')),
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, course_id, semester, academic_year)
);

-- 5. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late')),
  marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Marks Table
CREATE TABLE IF NOT EXISTS marks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  exam_type TEXT NOT NULL CHECK(exam_type IN ('internal_1', 'internal_2', 'assignment', 'final')),
  score REAL NOT NULL,
  max_score REAL NOT NULL DEFAULT 100,
  remarks TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Notices Table
CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_role TEXT NOT NULL DEFAULT 'all' CHECK(target_role IN ('all', 'student', 'faculty', 'hod')),
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Complaints Table (Phase 1 Schema - UI deferred to Phase 2)
CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_no TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('academic', 'faculty', 'hostel', 'canteen', 'infrastructure', 'library', 'other')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted', 'under_review', 'in_progress', 'resolved')),
  is_anonymous INTEGER NOT NULL DEFAULT 0 CHECK(is_anonymous IN (0, 1)),
  escalated INTEGER NOT NULL DEFAULT 0 CHECK(escalated IN (0, 1)),
  escalated_at DATETIME,
  assigned_role TEXT CHECK(assigned_role IN ('hod', 'admin')),
  submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Complaint Updates Table (Phase 1 Schema - UI deferred to Phase 2)
CREATE TABLE IF NOT EXISTS complaint_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  new_status TEXT NOT NULL,
  remark TEXT NOT NULL,
  updated_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_dept ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_courses_dept ON courses(department_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_course ON attendance(course_id);
CREATE INDEX IF NOT EXISTS idx_marks_student ON marks(student_id);
CREATE INDEX IF NOT EXISTS idx_complaints_ticket ON complaints(ticket_no);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique ON attendance(student_id, course_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_marks_unique ON marks(student_id, course_id, exam_type);

-- 10. Assignments Table (Phase 7)
CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT NOT NULL,
  max_score REAL NOT NULL DEFAULT 100,
  attachment_path TEXT,
  attachment_name TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Submissions Table (Phase 7 & 8)
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  note TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_late INTEGER NOT NULL DEFAULT 0 CHECK(is_late IN (0, 1)),
  score REAL,
  feedback TEXT,
  graded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  graded_at DATETIME,
  extracted_text TEXT,
  integrity_status TEXT CHECK(integrity_status IN ('cleared', 'needs_discussion', 'flagged')),
  integrity_note TEXT,
  integrity_reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  integrity_reviewed_at DATETIME,
  UNIQUE(assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_unique ON submissions(assignment_id, student_id);

-- 12. Integrity Pairs Table (Phase 8: Faculty Submission Integrity Check)
CREATE TABLE IF NOT EXISTS integrity_pairs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  submission_a_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  submission_b_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  similarity_score REAL NOT NULL,
  jaccard_score REAL,
  cosine_score REAL,
  matched_passages TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(assignment_id, submission_a_id, submission_b_id)
);

CREATE INDEX IF NOT EXISTS idx_integrity_pairs_assignment ON integrity_pairs(assignment_id);
CREATE INDEX IF NOT EXISTS idx_integrity_pairs_sub_a ON integrity_pairs(submission_a_id);
CREATE INDEX IF NOT EXISTS idx_integrity_pairs_sub_b ON integrity_pairs(submission_b_id);

-- 13. Study Resources Table (Phase 9)
CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('notes', 'slides', 'previous_paper', 'reference', 'other')),
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  external_url TEXT,
  uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  download_count INTEGER DEFAULT 0,
  CONSTRAINT chk_file_or_url CHECK (
    (file_path IS NOT NULL AND file_name IS NOT NULL) OR 
    (external_url IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_resources_course ON resources(course_id);
CREATE INDEX IF NOT EXISTS idx_resources_uploaded_by ON resources(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);

-- 14. Academic Timetable Slots Table (Phase 10)
CREATE TABLE IF NOT EXISTS timetable_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  room TEXT NOT NULL,
  slot_type TEXT NOT NULL CHECK (slot_type IN ('lecture', 'lab', 'tutorial')),
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_timetable_course ON timetable_slots(course_id);
CREATE INDEX IF NOT EXISTS idx_timetable_day ON timetable_slots(day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetable_room ON timetable_slots(room);

-- 15. Live Attendance Sessions Table (Phase 11)
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  faculty_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed')),
  secret TEXT NOT NULL,
  code_interval_seconds INTEGER NOT NULL DEFAULT 20,
  late_after_minutes INTEGER NOT NULL DEFAULT 10,
  require_same_network INTEGER NOT NULL DEFAULT 1 CHECK(require_same_network IN (0, 1)),
  closed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_course ON attendance_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON attendance_sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON attendance_sessions(status);

-- 16. Attendance Checkins Table (Phase 11)
CREATE TABLE IF NOT EXISTS attendance_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  checked_at TEXT NOT NULL,
  result TEXT NOT NULL CHECK(result IN ('present', 'late', 'flagged')),
  flag_reasons TEXT,
  review TEXT NOT NULL DEFAULT 'none' CHECK(review IN ('none', 'pending', 'approved', 'rejected')),
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  UNIQUE(session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_checkins_session ON attendance_checkins(session_id);
CREATE INDEX IF NOT EXISTS idx_checkins_student ON attendance_checkins(student_id);
CREATE INDEX IF NOT EXISTS idx_checkins_device ON attendance_checkins(device_id);

-- 17. Device Bindings Table (Phase 11)
CREATE TABLE IF NOT EXISTS device_bindings (
  student_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  first_seen_at TEXT NOT NULL
);

-- 18. Rooms Table (Phase 12A)
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  room_type TEXT NOT NULL CHECK(room_type IN ('lecture', 'lab')),
  capacity INTEGER NOT NULL DEFAULT 60,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rooms_name ON rooms(name);


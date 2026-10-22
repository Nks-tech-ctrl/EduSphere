const fs = require('fs');
const path = require('path');
const defaultDb = require('../config/db');

function initDb(targetDb = defaultDb) {
  const db = targetDb || defaultDb;
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Split and execute SQL statements
  console.log('[Edusphere DB] Applying database schema...');
  db.exec(schemaSql);

  // Safe column migration for submissions (Phase 8)
  try {
    const cols = db.prepare("PRAGMA table_info(submissions)").all().map((c) => c.name);
    if (!cols.includes('integrity_status')) {
      db.exec("ALTER TABLE submissions ADD COLUMN integrity_status TEXT CHECK(integrity_status IN ('cleared', 'needs_discussion', 'flagged'))");
    }
    if (!cols.includes('integrity_note')) {
      db.exec("ALTER TABLE submissions ADD COLUMN integrity_note TEXT");
    }
    if (!cols.includes('integrity_reviewed_by')) {
      db.exec("ALTER TABLE submissions ADD COLUMN integrity_reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL");
    }
    if (!cols.includes('integrity_reviewed_at')) {
      db.exec("ALTER TABLE submissions ADD COLUMN integrity_reviewed_at DATETIME");
    }
  } catch (err) {
    // Column migration safety check
  }

  // Safe table migration for timetable_slots (Phase 10)
  try {
    db.exec(`
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
    `);
  } catch (err) {
    // Timetable migration safety check
  }

  // Safe table migration for live attendance (Phase 11)
  try {
    db.exec(`
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

      CREATE TABLE IF NOT EXISTS device_bindings (
        student_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        device_id TEXT NOT NULL,
        first_seen_at TEXT NOT NULL
      );
    `);
  } catch (err) {
    // Live attendance migration safety check
  }

  // Safe table migration for rooms (Phase 12A)
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        room_type TEXT NOT NULL CHECK(room_type IN ('lecture', 'lab')),
        capacity INTEGER NOT NULL DEFAULT 60,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_rooms_name ON rooms(name);
    `);
  } catch (err) {
    // Rooms migration safety check
  }

  // Safe column migration for courses (Phase 12A)
  try {
    const cols = db.prepare("PRAGMA table_info(courses)").all().map((c) => c.name);
    if (!cols.includes('weekly_lectures')) {
      db.exec("ALTER TABLE courses ADD COLUMN weekly_lectures INTEGER NOT NULL DEFAULT 3");
    }
    if (!cols.includes('lab_hours_per_week')) {
      db.exec("ALTER TABLE courses ADD COLUMN lab_hours_per_week INTEGER NOT NULL DEFAULT 0");
    }
    if (!cols.includes('course_type')) {
      db.exec("ALTER TABLE courses ADD COLUMN course_type TEXT NOT NULL DEFAULT 'theory' CHECK(course_type IN ('theory', 'lab', 'both'))");
    }
  } catch (err) {
    // Course columns migration safety check
  }

  console.log('[Edusphere DB] Database schema applied successfully.');
}

if (require.main === module) {
  initDb();
}

module.exports = initDb;

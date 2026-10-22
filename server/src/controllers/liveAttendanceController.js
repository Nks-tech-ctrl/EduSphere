const crypto = require('crypto');
const db = require('../config/db');
const { getLocalDateString } = require('../utils/attendanceHelper');
const {
  normalizeIp,
  isClientOnServerNetwork,
  getServerLanInterfaces,
  getWindowInfo,
  computeCodeForWindow,
  isRateLimited,
  recordWrongCode,
  checkAndAutoCloseExpiredSessions,
  closeSessionInternal
} = require('../services/liveAttendanceService');

/**
 * POST /api/attendance/live/start (Faculty)
 */
function startLiveSession(req, res) {
  try {
    const facultyId = req.user.id;
    let { course_id, duration_minutes = 10, code_interval_seconds = 20, require_same_network = 1 } = req.body;

    if (!course_id) {
      return res.status(400).json({ success: false, message: 'Course ID is required.' });
    }

    // Verify course belongs to faculty
    const course = db.prepare('SELECT id, name, code, faculty_id FROM courses WHERE id = ?').get(course_id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }
    if (course.faculty_id !== facultyId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to start attendance for this course.' });
    }

    // Lazy auto-close check
    checkAndAutoCloseExpiredSessions();

    const localToday = getLocalDateString();

    // Check if an open session already exists for this course today
    const existingOpen = db.prepare(`
      SELECT id FROM attendance_sessions
      WHERE course_id = ? AND date = ? AND status = 'open'
    `).get(course_id, localToday);

    if (existingOpen) {
      return res.status(400).json({
        success: false,
        message: 'An active live attendance session is already open for this course today.'
      });
    }

    // Validate parameters
    duration_minutes = [5, 10, 15].includes(Number(duration_minutes)) ? Number(duration_minutes) : 10;
    code_interval_seconds = [15, 20, 30].includes(Number(code_interval_seconds)) ? Number(code_interval_seconds) : 20;
    require_same_network = require_same_network ? 1 : 0;

    const now = new Date();
    const started_at = now.toISOString();
    const ends_at = new Date(now.getTime() + duration_minutes * 60 * 1000).toISOString();
    const secret = crypto.randomBytes(32).toString('hex');

    const insert = db.prepare(`
      INSERT INTO attendance_sessions (
        course_id, faculty_id, date, started_at, ends_at, status, secret,
        code_interval_seconds, late_after_minutes, require_same_network
      ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, 10, ?)
    `).run(
      course_id,
      facultyId,
      localToday,
      started_at,
      ends_at,
      secret,
      code_interval_seconds,
      require_same_network
    );

    const sessionId = insert.lastInsertRowid;

    // Total actively enrolled in course
    const enrolledRow = db.prepare(`
      SELECT COUNT(*) as count FROM enrollments WHERE course_id = ? AND status = 'active'
    `).get(course_id);
    const enrolledCount = enrolledRow ? enrolledRow.count : 0;

    const notYetStudents = db.prepare(`
      SELECT u.id, u.name, u.email, u.avatar_url
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      WHERE e.course_id = ? AND e.status = 'active'
      ORDER BY u.name ASC
    `).all(course_id);

    return res.status(201).json({
      success: true,
      message: 'Live attendance session initiated.',
      session: {
        id: sessionId,
        course_id,
        course_name: course.name,
        course_code: course.code,
        date: localToday,
        started_at,
        ends_at,
        code_interval_seconds,
        require_same_network
      },
      counts: {
        enrolled: enrolledCount,
        checked_in: 0,
        flagged: 0,
        not_yet: enrolledCount
      },
      not_yet_students: notYetStudents
    });
  } catch (err) {
    console.error('Error starting live attendance session:', err);
    return res.status(500).json({ success: false, message: 'Failed to start live session.' });
  }
}

/**
 * GET /api/attendance/live/:id/code (Faculty)
 */
function getSessionCode(req, res) {
  try {
    const facultyId = req.user.id;
    const sessionId = req.params.id;

    checkAndAutoCloseExpiredSessions();

    const session = db.prepare(`
      SELECT s.*, c.name as course_name, c.code as course_code
      FROM attendance_sessions s
      JOIN courses c ON s.course_id = c.id
      WHERE s.id = ?
    `).get(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    if (session.faculty_id !== facultyId) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to session.' });
    }

    if (session.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Session is closed.' });
    }

    const { windowIndex, secondsRemaining } = getWindowInfo(session.code_interval_seconds);
    const code = computeCodeForWindow(session.secret, windowIndex);

    return res.status(200).json({
      success: true,
      code,
      seconds_remaining: secondsRemaining,
      interval: session.code_interval_seconds,
      ends_at: session.ends_at
    });
  } catch (err) {
    console.error('Error getting session code:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve code.' });
  }
}

/**
 * GET /api/attendance/live/:id (Faculty)
 */
function getSessionDetails(req, res) {
  try {
    const facultyId = req.user.id;
    const sessionId = req.params.id;

    checkAndAutoCloseExpiredSessions();

    const session = db.prepare(`
      SELECT s.*, c.name as course_name, c.code as course_code
      FROM attendance_sessions s
      JOIN courses c ON s.course_id = c.id
      WHERE s.id = ?
    `).get(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    if (session.faculty_id !== facultyId) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to session.' });
    }

    // Total enrolled in course
    const enrolledRow = db.prepare(`
      SELECT COUNT(*) as count FROM enrollments WHERE course_id = ? AND status = 'active'
    `).get(session.course_id);
    const enrolledCount = enrolledRow ? enrolledRow.count : 0;

    // Checkins list
    const checkins = db.prepare(`
      SELECT
        ac.id,
        ac.student_id,
        u.name as student_name,
        u.email as student_email,
        u.avatar_url,
        ac.device_id,
        ac.ip,
        ac.checked_at,
        ac.result,
        ac.flag_reasons,
        ac.review,
        ac.reviewed_by,
        ac.reviewed_at
      FROM attendance_checkins ac
      JOIN users u ON ac.student_id = u.id
      WHERE ac.session_id = ?
      ORDER BY ac.checked_at DESC
    `).all(sessionId);

    // Format flag reasons
    const formattedCheckins = checkins.map((c) => {
      let reasons = [];
      try {
        reasons = c.flag_reasons ? JSON.parse(c.flag_reasons) : [];
      } catch {
        reasons = [];
      }
      return {
        ...c,
        flag_reasons: reasons
      };
    });

    // Checked in = clean check-ins (present or late)
    const checkedInCount = formattedCheckins.filter((c) => c.result === 'present' || c.result === 'late').length;
    // Flagged = pending flagged ones
    const flaggedCount = formattedCheckins.filter((c) => c.result === 'flagged' && c.review !== 'approved' && c.review !== 'rejected').length;
    // Not yet = actively enrolled students in the course MINUS students who have a check-in (any result) in this session
    const notYetCount = Math.max(0, enrolledCount - formattedCheckins.length);

    // List of actively enrolled students who have not yet checked in
    const notYetStudents = db.prepare(`
      SELECT u.id, u.name, u.email, u.avatar_url
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      WHERE e.course_id = ? AND e.status = 'active'
        AND u.id NOT IN (
          SELECT student_id FROM attendance_checkins WHERE session_id = ?
        )
      ORDER BY u.name ASC
    `).all(session.course_id, sessionId);

    return res.status(200).json({
      success: true,
      session: {
        id: session.id,
        course_id: session.course_id,
        course_name: session.course_name,
        course_code: session.course_code,
        date: session.date,
        started_at: session.started_at,
        ends_at: session.ends_at,
        status: session.status,
        code_interval_seconds: session.code_interval_seconds,
        late_after_minutes: session.late_after_minutes,
        require_same_network: session.require_same_network,
        closed_at: session.closed_at
      },
      counts: {
        enrolled: enrolledCount,
        checked_in: checkedInCount,
        flagged: flaggedCount,
        not_yet: notYetCount
      },
      checkins: formattedCheckins,
      not_yet_students: notYetStudents
    });
  } catch (err) {
    console.error('Error fetching session details:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve session details.' });
  }
}

/**
 * POST /api/attendance/live/:id/review (Faculty)
 */
function reviewCheckin(req, res) {
  try {
    const facultyId = req.user.id;
    const sessionId = req.params.id;
    const { checkin_id, decision } = req.body;

    if (!checkin_id || !['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Valid checkin_id and decision ("approve"|"reject") required.' });
    }

    const session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }
    if (session.faculty_id !== facultyId) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const checkin = db.prepare('SELECT * FROM attendance_checkins WHERE id = ? AND session_id = ?').get(checkin_id, sessionId);
    if (!checkin) {
      return res.status(404).json({ success: false, message: 'Check-in record not found.' });
    }

    const reviewedAt = new Date().toISOString();

    if (decision === 'approve') {
      // Calculate present vs late based on timestamps
      const checkedMs = new Date(checkin.checked_at).getTime();
      const lateThresholdMs = new Date(session.started_at).getTime() + (session.late_after_minutes * 60 * 1000);
      const attendanceStatus = checkedMs > lateThresholdMs ? 'late' : 'present';

      // Upsert attendance
      db.prepare(`
        INSERT INTO attendance (student_id, course_id, date, status, marked_by, remarks)
        VALUES (?, ?, ?, ?, ?, 'Live check-in')
        ON CONFLICT(student_id, course_id, date) DO UPDATE SET
          status = excluded.status,
          marked_by = excluded.marked_by,
          remarks = excluded.remarks
      `).run(checkin.student_id, session.course_id, session.date, attendanceStatus, facultyId);

      // Update checkin
      db.prepare(`
        UPDATE attendance_checkins
        SET review = 'approved', reviewed_by = ?, reviewed_at = ?
        WHERE id = ?
      `).run(facultyId, reviewedAt, checkin_id);

      // Bind device if student not already bound
      db.prepare(`
        INSERT OR IGNORE INTO device_bindings (student_id, device_id, first_seen_at)
        VALUES (?, ?, ?)
      `).run(checkin.student_id, checkin.device_id, reviewedAt);

      return res.status(200).json({
        success: true,
        message: 'Check-in approved and attendance recorded.',
        result: attendanceStatus
      });
    } else {
      // Reject
      db.prepare(`
        INSERT INTO attendance (student_id, course_id, date, status, marked_by, remarks)
        VALUES (?, ?, ?, 'absent', ?, 'Rejected after review')
        ON CONFLICT(student_id, course_id, date) DO UPDATE SET
          status = excluded.status,
          marked_by = excluded.marked_by,
          remarks = excluded.remarks
      `).run(checkin.student_id, session.course_id, session.date, facultyId);

      db.prepare(`
        UPDATE attendance_checkins
        SET review = 'rejected', reviewed_by = ?, reviewed_at = ?
        WHERE id = ?
      `).run(facultyId, reviewedAt, checkin_id);

      return res.status(200).json({
        success: true,
        message: 'Check-in rejected and marked absent.'
      });
    }
  } catch (err) {
    console.error('Error reviewing check-in:', err);
    return res.status(500).json({ success: false, message: 'Failed to process check-in review.' });
  }
}

/**
 * POST /api/attendance/live/:id/close (Faculty)
 */
function closeLiveSession(req, res) {
  try {
    const facultyId = req.user.id;
    const sessionId = req.params.id;

    const session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }
    if (session.faculty_id !== facultyId) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const closed = closeSessionInternal(sessionId);

    return res.status(200).json({
      success: true,
      message: 'Session closed successfully.',
      session: closed
    });
  } catch (err) {
    console.error('Error closing session:', err);
    return res.status(500).json({ success: false, message: 'Failed to close session.' });
  }
}

/**
 * GET /api/attendance/live/history (Faculty)
 */
function getFacultyHistory(req, res) {
  try {
    const facultyId = req.user.id;
    checkAndAutoCloseExpiredSessions();

    const sessions = db.prepare(`
      SELECT
        s.id,
        s.course_id,
        c.name as course_name,
        c.code as course_code,
        s.date,
        s.started_at,
        s.ends_at,
        s.status,
        s.closed_at,
        s.code_interval_seconds,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = s.course_id AND e.status = 'active') as enrolled_count,
        (SELECT COUNT(*) FROM attendance_checkins ac WHERE ac.session_id = s.id AND ac.result = 'present') as present_count,
        (SELECT COUNT(*) FROM attendance_checkins ac WHERE ac.session_id = s.id AND ac.result = 'late') as late_count,
        (SELECT COUNT(*) FROM attendance_checkins ac WHERE ac.session_id = s.id AND ac.result = 'flagged') as flagged_count,
        (SELECT COUNT(*) FROM attendance a WHERE a.course_id = s.course_id AND a.date = s.date AND a.status = 'absent') as absent_count
      FROM attendance_sessions s
      JOIN courses c ON s.course_id = c.id
      WHERE s.faculty_id = ?
      ORDER BY s.started_at DESC
    `).all(facultyId);

    return res.status(200).json({
      success: true,
      sessions
    });
  } catch (err) {
    console.error('Error fetching history:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch session history.' });
  }
}

/**
 * GET /api/attendance/live/network-info (Faculty)
 */
function getNetworkInfo(req, res) {
  try {
    const interfaces = getServerLanInterfaces();
    return res.status(200).json({
      success: true,
      interfaces
    });
  } catch (err) {
    console.error('Error fetching network info:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch network info.' });
  }
}

/**
 * GET /api/attendance/live/open (Student)
 */
function getStudentOpenSessions(req, res) {
  try {
    const studentId = req.user.id;
    checkAndAutoCloseExpiredSessions();

    const openSessions = db.prepare(`
      SELECT
        s.id,
        s.course_id,
        c.name as course_name,
        c.code as course_code,
        s.date,
        s.started_at,
        s.ends_at,
        s.code_interval_seconds,
        ac.result as my_result,
        ac.review as my_review
      FROM attendance_sessions s
      JOIN courses c ON s.course_id = c.id
      JOIN enrollments e ON e.course_id = s.course_id
      LEFT JOIN attendance_checkins ac ON ac.session_id = s.id AND ac.student_id = ?
      WHERE e.student_id = ? AND e.status = 'active' AND s.status = 'open'
      ORDER BY s.started_at DESC
    `).all(studentId, studentId);

    return res.status(200).json({
      success: true,
      sessions: openSessions
    });
  } catch (err) {
    console.error('Error fetching student open sessions:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch open sessions.' });
  }
}

/**
 * POST /api/attendance/live/checkin (Student)
 */
function studentCheckin(req, res) {
  try {
    const studentId = req.user.id;
    const { session_id, code, device_id } = req.body;

    if (!session_id || !code || !device_id) {
      return res.status(400).json({ success: false, message: 'session_id, code, and device_id are required.' });
    }

    checkAndAutoCloseExpiredSessions();

    const session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(session_id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Attendance session not found.' });
    }

    // 1. Enrollment check
    const enrollment = db.prepare(`
      SELECT id FROM enrollments WHERE course_id = ? AND student_id = ? AND status = 'active'
    `).get(session.course_id, studentId);

    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this course.' });
    }

    // 2. Session open & within window check
    const nowMs = Date.now();
    const endsMs = new Date(session.ends_at).getTime();
    if (session.status !== 'open' || nowMs > endsMs) {
      return res.status(400).json({ success: false, message: 'Session closed' });
    }

    // 3. Rate limiting check (wrong codes)
    if (isRateLimited(session_id, studentId)) {
      return res.status(429).json({ success: false, message: 'Too many attempts, wait a minute' });
    }

    // 4. Code verification (current window or previous window)
    const { windowIndex } = getWindowInfo(session.code_interval_seconds);
    const currentCode = computeCodeForWindow(session.secret, windowIndex);
    const prevCode = computeCodeForWindow(session.secret, windowIndex - 1);

    const cleanInputCode = String(code).trim();
    if (cleanInputCode !== currentCode && cleanInputCode !== prevCode) {
      recordWrongCode(session_id, studentId);
      return res.status(400).json({ success: false, message: 'Code expired, check the screen again' });
    }

    // 5. Already checked in check
    const existingCheckin = db.prepare(`
      SELECT id FROM attendance_checkins WHERE session_id = ? AND student_id = ?
    `).get(session_id, studentId);

    if (existingCheckin) {
      return res.status(409).json({ success: false, message: 'Already marked' });
    }

    // 6. Anti-proxy flag detection
    const flagReasons = [];
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // a. shared_device check within this session
    const earlierSessionCheckins = db.prepare(`
      SELECT id, student_id, flag_reasons, result, review
      FROM attendance_checkins
      WHERE session_id = ? AND device_id = ? AND student_id != ?
    `).all(session_id, device_id, studentId);

    if (earlierSessionCheckins.length > 0) {
      if (!flagReasons.includes('shared_device')) {
        flagReasons.push('shared_device');
      }

      // Retroactively flag earlier student(s) in this session
      for (const earlier of earlierSessionCheckins) {
        let earlierFlags = [];
        try {
          earlierFlags = earlier.flag_reasons ? JSON.parse(earlier.flag_reasons) : [];
        } catch {
          earlierFlags = [];
        }
        if (!earlierFlags.includes('shared_device')) {
          earlierFlags.push('shared_device');
        }

        db.prepare(`
          UPDATE attendance_checkins
          SET result = 'flagged', review = 'pending', flag_reasons = ?
          WHERE id = ?
        `).run(JSON.stringify(earlierFlags), earlier.id);

        // Remove earlier student's attendance row ONLY if created by this session's live check-in
        db.prepare(`
          DELETE FROM attendance
          WHERE student_id = ? AND course_id = ? AND date = ? AND remarks = 'Live check-in'
        `).run(earlier.student_id, session.course_id, session.date);
      }
    }

    // Extra shared_device check: is this device bound to a DIFFERENT student in device_bindings?
    const boundToOther = db.prepare(`
      SELECT student_id FROM device_bindings WHERE device_id = ? AND student_id != ?
    `).get(device_id, studentId);

    if (boundToOther && !flagReasons.includes('shared_device')) {
      flagReasons.push('shared_device');
    }

    // b. new_device check: does current student have a different bound device?
    const studentBinding = db.prepare(`
      SELECT device_id FROM device_bindings WHERE student_id = ?
    `).get(studentId);

    if (studentBinding && studentBinding.device_id !== device_id) {
      if (!flagReasons.includes('new_device')) {
        flagReasons.push('new_device');
      }
    }

    // c. different_network check
    if (session.require_same_network === 1) {
      const isOnNetwork = isClientOnServerNetwork(clientIp);
      if (!isOnNetwork) {
        if (!flagReasons.includes('different_network')) {
          flagReasons.push('different_network');
        }
      }
    }

    // 7. Save check-in result
    const checked_at = new Date().toISOString();
    const startedMs = new Date(session.started_at).getTime();
    const lateThresholdMs = startedMs + (session.late_after_minutes * 60 * 1000);
    const isLate = nowMs > lateThresholdMs;

    if (flagReasons.length > 0) {
      // Flagged checkin
      db.prepare(`
        INSERT INTO attendance_checkins (
          session_id, student_id, device_id, ip, user_agent, checked_at,
          result, flag_reasons, review
        ) VALUES (?, ?, ?, ?, ?, ?, 'flagged', ?, 'pending')
      `).run(
        session_id,
        studentId,
        device_id,
        normalizeIp(clientIp),
        req.headers['user-agent'] || '',
        checked_at,
        JSON.stringify(flagReasons)
      );

      return res.status(200).json({
        success: true,
        result: 'flagged',
        message: 'Submitted for faculty review'
      });
    } else {
      // Clean checkin
      const status = isLate ? 'late' : 'present';

      db.prepare(`
        INSERT INTO attendance_checkins (
          session_id, student_id, device_id, ip, user_agent, checked_at,
          result, flag_reasons, review
        ) VALUES (?, ?, ?, ?, ?, ?, ?, '[]', 'none')
      `).run(
        session_id,
        studentId,
        device_id,
        normalizeIp(clientIp),
        req.headers['user-agent'] || '',
        checked_at,
        status
      );

      // Write attendance row
      db.prepare(`
        INSERT INTO attendance (student_id, course_id, date, status, marked_by, remarks)
        VALUES (?, ?, ?, ?, ?, 'Live check-in')
        ON CONFLICT(student_id, course_id, date) DO UPDATE SET
          status = excluded.status,
          marked_by = excluded.marked_by,
          remarks = excluded.remarks
      `).run(studentId, session.course_id, session.date, status, session.faculty_id);

      // Bind device on first use
      db.prepare(`
        INSERT OR IGNORE INTO device_bindings (student_id, device_id, first_seen_at)
        VALUES (?, ?, ?)
      `).run(studentId, device_id, checked_at);

      return res.status(200).json({
        success: true,
        result: status,
        message: 'Attendance marked'
      });
    }
  } catch (err) {
    console.error('Error during student check-in:', err);
    return res.status(500).json({ success: false, message: 'Check-in processing error.' });
  }
}

module.exports = {
  startLiveSession,
  getSessionCode,
  getSessionDetails,
  reviewCheckin,
  closeLiveSession,
  getFacultyHistory,
  getNetworkInfo,
  getStudentOpenSessions,
  studentCheckin
};

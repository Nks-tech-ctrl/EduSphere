const db = require('../config/db');
const { calcAttendancePercentage, isFutureDate, getLocalDateString } = require('../utils/attendanceHelper');

/**
 * GET /api/attendance/courses (Faculty)
 * Returns courses taught by the logged-in faculty.
 */
function getFacultyCourses(req, res) {
  try {
    const facultyId = req.user.id;

    const courses = db.prepare(`
      SELECT
        c.id, c.name, c.code, c.credits, c.semester,
        d.id as department_id, d.code as department_code, d.name as department_name,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'active') as enrolled_count
      FROM courses c
      JOIN departments d ON c.department_id = d.id
      WHERE c.faculty_id = ?
      ORDER BY c.code ASC
    `).all(facultyId);

    return res.status(200).json({
      success: true,
      courses
    });
  } catch (err) {
    console.error('Error in getFacultyCourses:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch courses.' });
  }
}

/**
 * GET /api/attendance/sheet?course_id=&date= (Faculty)
 * Returns enrolled students with their attendance status for the selected date.
 * Enforces course ownership (403 if not faculty's course).
 */
function getAttendanceSheet(req, res) {
  try {
    const facultyId = req.user.id;
    const { course_id, date } = req.query;

    if (!course_id) {
      return res.status(400).json({ success: false, message: 'course_id parameter is required.' });
    }

    const targetDate = date || getLocalDateString();

    // Verify course exists and belongs to faculty
    const course = db.prepare(`
      SELECT c.id, c.name, c.code, c.faculty_id, d.code as department_code
      FROM courses c
      JOIN departments d ON c.department_id = d.id
      WHERE c.id = ?
    `).get(course_id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (course.faculty_id !== facultyId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to manage attendance for this course.' });
    }

    // Fetch enrolled students and their attendance status for this date
    const students = db.prepare(`
      SELECT
        u.id as student_id,
        u.name,
        u.email,
        u.avatar_url,
        a.id as attendance_id,
        a.status,
        a.remarks
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      LEFT JOIN attendance a ON a.student_id = u.id AND a.course_id = e.course_id AND a.date = ?
      WHERE e.course_id = ? AND e.status = 'active'
      ORDER BY u.name ASC
    `).all(targetDate, course_id);

    return res.status(200).json({
      success: true,
      course: {
        id: course.id,
        name: course.name,
        code: course.code,
        department_code: course.department_code
      },
      date: targetDate,
      students
    });
  } catch (err) {
    console.error('Error in getAttendanceSheet:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch attendance sheet.' });
  }
}

/**
 * POST /api/attendance/mark (Faculty)
 * Upserts attendance records for a specific date in a single transaction.
 * Enforces ownership, valid statuses, and rejects future dates.
 */
function markAttendance(req, res) {
  try {
    const facultyId = req.user.id;
    const { course_id, date, records } = req.body;

    if (!course_id || !date || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request payload. course_id, date, and records array are required.'
      });
    }

    // Validate date is not in the future using server's local date
    if (isFutureDate(date)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark attendance for a future date.'
      });
    }

    // Verify course ownership
    const course = db.prepare('SELECT id, faculty_id FROM courses WHERE id = ?').get(course_id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (course.faculty_id !== facultyId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to mark attendance for this course.'
      });
    }

    // Validate all records before executing transaction
    const validStatuses = ['present', 'absent', 'late'];
    for (const rec of records) {
      if (!rec.student_id || !validStatuses.includes(rec.status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid attendance record for student ID ${rec.student_id}. Status must be present, absent, or late.`
        });
      }
    }

    // Upsert attendance records in a transaction
    const upsertStmt = db.prepare(`
      INSERT INTO attendance (student_id, course_id, date, status, marked_by, remarks)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, course_id, date) DO UPDATE SET
        status = excluded.status,
        marked_by = excluded.marked_by,
        remarks = excluded.remarks,
        created_at = CURRENT_TIMESTAMP
    `);

    const runTx = db.transaction((recs) => {
      for (const rec of recs) {
        upsertStmt.run(
          rec.student_id,
          course_id,
          date,
          rec.status,
          facultyId,
          rec.remarks || 'Regular class session'
        );
      }
    });

    runTx(records);

    return res.status(200).json({
      success: true,
      message: `Attendance for ${records.length} students recorded successfully for ${date}.`,
      date,
      count: records.length
    });
  } catch (err) {
    console.error('Error in markAttendance:', err);
    return res.status(500).json({ success: false, message: 'Failed to record attendance.' });
  }
}

/**
 * GET /api/attendance/mine (Student)
 * Returns personal attendance breakdown per course, overall percentage, and recent records.
 */
function getStudentAttendance(req, res) {
  try {
    const studentId = req.user.id;

    // Get all enrolled courses
    const courses = db.prepare(`
      SELECT c.id, c.code, c.name, c.credits, c.semester, u.name as faculty_name, d.code as department_code
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN departments d ON c.department_id = d.id
      LEFT JOIN users u ON c.faculty_id = u.id
      WHERE e.student_id = ? AND e.status = 'active'
      ORDER BY c.code ASC
    `).all(studentId);

    let totalAllSessions = 0;
    let totalAllAttended = 0;
    let totalAllAbsent = 0;

    const courseBreakdown = courses.map((course) => {
      const stats = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
        FROM attendance
        WHERE student_id = ? AND course_id = ?
      `).get(studentId, course.id);

      const total = stats.total || 0;
      const present = stats.present || 0;
      const late = stats.late || 0;
      const absent = stats.absent || 0;
      const percentage = calcAttendancePercentage(present, late, total);

      totalAllSessions += total;
      totalAllAttended += (present + late);
      totalAllAbsent += absent;

      return {
        course_id: course.id,
        course_code: course.code,
        course_name: course.name,
        credits: course.credits,
        faculty_name: course.faculty_name,
        department_code: course.department_code,
        total_sessions: total,
        present_count: present,
        late_count: late,
        absent_count: absent,
        percentage
      };
    });

    const overallPercentage = calcAttendancePercentage(totalAllAttended, 0, totalAllSessions);

    // Recent 20 attendance records
    const recent = db.prepare(`
      SELECT
        a.id, a.date, a.status, a.remarks,
        c.code as course_code, c.name as course_name
      FROM attendance a
      JOIN courses c ON a.course_id = c.id
      WHERE a.student_id = ?
      ORDER BY a.date DESC
      LIMIT 20
    `).all(studentId);

    return res.status(200).json({
      success: true,
      overall: {
        total_sessions: totalAllSessions,
        attended_sessions: totalAllAttended,
        absent_sessions: totalAllAbsent,
        percentage: overallPercentage,
        is_at_risk: overallPercentage < 75
      },
      courses: courseBreakdown,
      recent
    });
  } catch (err) {
    console.error('Error in getStudentAttendance:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch personal attendance.' });
  }
}

/**
 * GET /api/attendance/department (HOD)
 * Returns department attendance summary, per-course metrics, and count of students below 75%.
 */
function getDepartmentAttendance(req, res) {
  try {
    const departmentId = req.user.department_id;
    if (!departmentId) {
      return res.status(400).json({ success: false, message: 'Department ID required for HOD.' });
    }

    // Get department details
    const department = db.prepare('SELECT id, name, code FROM departments WHERE id = ?').get(departmentId);

    // Get all courses in department
    const courses = db.prepare(`
      SELECT c.id, c.code, c.name, c.credits, c.semester, u.name as faculty_name
      FROM courses c
      LEFT JOIN users u ON c.faculty_id = u.id
      WHERE c.department_id = ?
      ORDER BY c.code ASC
    `).all(departmentId);

    const atRiskStudentsMap = new Map();

    const courseStats = courses.map((course) => {
      // Find all students enrolled in this course
      const enrolled = db.prepare(`
        SELECT student_id
        FROM enrollments
        WHERE course_id = ? AND status = 'active'
      `).all(course.id);

      let below75Count = 0;
      let totalSessionsSum = 0;
      let attendedSum = 0;

      enrolled.forEach((enroll) => {
        const studentStats = db.prepare(`
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
          FROM attendance
          WHERE student_id = ? AND course_id = ?
        `).get(enroll.student_id, course.id);

        const total = studentStats.total || 0;
        const present = studentStats.present || 0;
        const late = studentStats.late || 0;
        const rate = calcAttendancePercentage(present, late, total);

        totalSessionsSum += total;
        attendedSum += (present + late);

        if (rate < 75 && total > 0) {
          below75Count++;
          // Get student details
          const stUser = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(enroll.student_id);
          if (stUser) {
            atRiskStudentsMap.set(`${stUser.id}-${course.id}`, {
              student_id: stUser.id,
              name: stUser.name,
              email: stUser.email,
              course_code: course.code,
              course_name: course.name,
              rate
            });
          }
        }
      });

      const courseAverage = calcAttendancePercentage(attendedSum, 0, totalSessionsSum);

      return {
        course_id: course.id,
        course_code: course.code,
        course_name: course.name,
        credits: course.credits,
        faculty_name: course.faculty_name,
        enrolled_count: enrolled.length,
        total_sessions: totalSessionsSum,
        average_percentage: courseAverage,
        below_75_count: below75Count
      };
    });

    const atRiskList = Array.from(atRiskStudentsMap.values());

    return res.status(200).json({
      success: true,
      department,
      courses: courseStats,
      total_at_risk_students: atRiskList.length,
      at_risk_students: atRiskList
    });
  } catch (err) {
    console.error('Error in getDepartmentAttendance:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch department attendance.' });
  }
}

module.exports = {
  getFacultyCourses,
  getAttendanceSheet,
  markAttendance,
  getStudentAttendance,
  getDepartmentAttendance
};

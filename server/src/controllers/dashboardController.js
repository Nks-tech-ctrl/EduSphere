const db = require('../config/db');

function getDashboardSummary(req, res) {
  try {
    const { role, id, department_id } = req.user;

    // Common notices
    const notices = db.prepare(`
      SELECT n.id, n.title, n.content, n.target_role, n.created_at,
             u.name as author_name, d.code as department_code
      FROM notices n
      LEFT JOIN users u ON n.author_id = u.id
      LEFT JOIN departments d ON n.department_id = d.id
      WHERE n.target_role = 'all' OR n.target_role = ?
      ORDER BY n.created_at DESC
      LIMIT 5
    `).all(role);

    if (role === 'admin') {
      const studentCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get().count;
      const facultyCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'faculty'").get().count;
      const hodCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'hod'").get().count;
      const deptCount = db.prepare("SELECT COUNT(*) as count FROM departments").get().count;
      const courseCount = db.prepare("SELECT COUNT(*) as count FROM courses").get().count;

      // Real Complaint Metrics
      const totalComplaints = db.prepare("SELECT COUNT(*) as count FROM complaints").get().count;
      const pendingComplaints = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status != 'resolved'").get().count;
      const escalatedComplaints = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE escalated = 1").get().count;
      const resolvedComplaints = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'resolved'").get().count;

      const departments = db.prepare(`
        SELECT d.id, d.name, d.code,
               (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.role = 'student') as student_count,
               (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.role = 'faculty') as faculty_count,
               (SELECT COUNT(*) FROM courses c WHERE c.department_id = d.id) as course_count
        FROM departments d
      `).all();

      const recentUsers = db.prepare(`
        SELECT u.id, u.name, u.email, u.role, d.code as dept_code, u.created_at
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        ORDER BY u.id DESC
        LIMIT 6
      `).all();

      return res.status(200).json({
        success: true,
        role: 'admin',
        stats: {
          totalStudents: studentCount,
          totalFaculty: facultyCount,
          totalHods: hodCount,
          totalDepartments: deptCount,
          totalCourses: courseCount,
          totalComplaints,
          pendingComplaints,
          escalatedComplaints,
          resolvedComplaints
        },
        departments,
        recentUsers,
        notices
      });
    }

    if (role === 'hod') {
      const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(department_id) || {};
      const studentCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND department_id = ?").get(department_id)?.count || 0;
      const facultyList = db.prepare("SELECT id, name, email, phone FROM users WHERE role = 'faculty' AND department_id = ?").all(department_id);
      const courses = db.prepare(`
        SELECT c.id, c.name, c.code, c.credits, c.semester, u.name as faculty_name
        FROM courses c
        LEFT JOIN users u ON c.faculty_id = u.id
        WHERE c.department_id = ?
      `).all(department_id);

      // Real Department Complaint Metrics
      const deptComplaints = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE department_id = ?").get(department_id)?.count || 0;
      const deptPendingComplaints = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE department_id = ? AND status != 'resolved'").get(department_id)?.count || 0;
      const deptEscalatedComplaints = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE department_id = ? AND escalated = 1").get(department_id)?.count || 0;

      return res.status(200).json({
        success: true,
        role: 'hod',
        department: dept,
        stats: {
          departmentStudents: studentCount,
          departmentFaculty: facultyList.length,
          departmentCourses: courses.length,
          deptComplaints,
          deptPendingComplaints,
          deptEscalatedComplaints
        },
        facultyList,
        courses,
        notices
      });
    }

    if (role === 'faculty') {
      const myCourses = db.prepare(`
        SELECT c.id, c.name, c.code, c.credits, c.semester, d.code as department_code,
               (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'active') as enrolled_students
        FROM courses c
        JOIN departments d ON c.department_id = d.id
        WHERE c.faculty_id = ?
      `).all(id);

      const recentAttendanceCount = db.prepare(`
        SELECT COUNT(*) as count FROM attendance WHERE marked_by = ?
      `).get(id)?.count || 0;

      const assignmentsToGrade = db.prepare(`
        SELECT COUNT(*) as count
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        WHERE c.faculty_id = ? AND s.score IS NULL
      `).get(id)?.count || 0;

      return res.status(200).json({
        success: true,
        role: 'faculty',
        stats: {
          assignedCourses: myCourses.length,
          totalAttendanceLogged: recentAttendanceCount,
          assignmentsToGrade
        },
        myCourses,
        notices
      });
    }

    if (role === 'student') {
      const enrolledCourses = db.prepare(`
        SELECT c.id, c.name, c.code, c.credits, c.semester, u.name as faculty_name, d.code as dept_code,
               e.status as enrollment_status
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN departments d ON c.department_id = d.id
        LEFT JOIN users u ON c.faculty_id = u.id
        WHERE e.student_id = ? AND e.status = 'active'
      `).all(id);

      const attendanceRecords = db.prepare(`
        SELECT a.id, a.date, a.status, c.code as course_code, c.name as course_name
        FROM attendance a
        JOIN courses c ON a.course_id = c.id
        WHERE a.student_id = ?
        ORDER BY a.date DESC
        LIMIT 10
      `).all(id);

      const totalAttendance = db.prepare("SELECT COUNT(*) as total FROM attendance WHERE student_id = ?").get(id)?.total || 0;
      const presentCount = db.prepare("SELECT COUNT(*) as present FROM attendance WHERE student_id = ? AND status = 'present'").get(id)?.present || 0;
      const attendancePercentage = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 92;

      const marks = db.prepare(`
        SELECT m.id, m.exam_type, m.score, m.max_score, m.remarks, c.code as course_code, c.name as course_name
        FROM marks m
        JOIN courses c ON m.course_id = c.id
        WHERE m.student_id = ?
      `).all(id);

      const pendingAssignments = db.prepare(`
        SELECT COUNT(*) as count
        FROM assignments a
        JOIN enrollments e ON a.course_id = e.course_id AND e.student_id = ? AND e.status = 'active'
        LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
        WHERE s.id IS NULL
      `).get(id, id)?.count || 0;

      return res.status(200).json({
        success: true,
        role: 'student',
        stats: {
          enrolledCount: enrolledCourses.length,
          attendancePercentage,
          totalCredits: enrolledCourses.reduce((acc, c) => acc + (c.credits || 0), 0),
          pendingAssignments
        },
        enrolledCourses,
        attendanceRecords,
        marks,
        notices
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid role.' });
  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard data.'
    });
  }
}

module.exports = {
  getDashboardSummary
};

const bcrypt = require('bcryptjs');
const db = require('../config/db');
const seedDatabase = require('../db/seed');

/**
 * POST /api/admin/reset-demo
 * Admin-only on-demand trigger to re-seed the SQLite database
 * with pristine initial demo accounts, courses, and un-escalated complaints.
 */
async function resetDemoData(req, res) {
  try {
    console.log('[Edusphere Admin] Manual demo data reset requested by Admin:', req.user.email);
    const verification = seedDatabase();
    return res.status(200).json({
      success: true,
      message: 'All demo data has been successfully reset to initial pristine state.',
      verification
    });
  } catch (err) {
    console.error('[Edusphere Admin] Error resetting demo data:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset demo data: ' + err.message
    });
  }
}

/**
 * GET /api/admin/users
 * Returns list of institutional users with search and filter capabilities.
 * Security: NEVER returns password_hash.
 */
function getUsers(req, res) {
  try {
    const { search, role, department_id, semester } = req.query;

    let conditions = ['1=1'];
    let params = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push('(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
      params.push(term, term, term);
    }

    if (role && role !== 'all') {
      conditions.push('u.role = ?');
      params.push(role);
    }

    if (department_id && department_id !== 'all') {
      conditions.push('u.department_id = ?');
      params.push(Number(department_id));
    }

    if (semester && semester !== 'all') {
      conditions.push('EXISTS (SELECT 1 FROM enrollments e WHERE e.student_id = u.id AND e.semester = ?)');
      params.push(Number(semester));
    }

    const query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.department_id,
        d.name as department_name,
        d.code as department_code,
        u.phone,
        u.avatar_url,
        u.created_at,
        CASE
          WHEN u.role = 'student' THEN (
            SELECT semester FROM enrollments WHERE student_id = u.id ORDER BY semester DESC LIMIT 1
          )
          ELSE NULL
        END as semester,
        CASE
          WHEN u.role = 'student' THEN (
            SELECT db.device_id FROM device_bindings db WHERE db.student_id = u.id
          )
          ELSE NULL
        END as device_id,
        CASE
          WHEN u.role = 'faculty' THEN (
            SELECT GROUP_CONCAT(code, ', ') FROM courses WHERE faculty_id = u.id
          )
          ELSE NULL
        END as courses_taught
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY u.id DESC
    `;

    const users = db.prepare(query).all(...params);

    return res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (err) {
    console.error('Error in getUsers:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve user registry.' });
  }
}

/**
 * POST /api/admin/students
 * Creates a new student, hashes default password "Student@123",
 * and auto-enrolls student in all courses belonging to their department.
 */
function createStudent(req, res) {
  try {
    const { name, email, department_id, phone } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Student full name is required (min 2 chars).' });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'A valid student email address is required.' });
    }

    if (!department_id) {
      return res.status(400).json({ success: false, message: 'Department selection is required.' });
    }

    const deptId = Number(department_id);
    const department = db.prepare('SELECT id, name, code FROM departments WHERE id = ?').get(deptId);
    if (!department) {
      return res.status(400).json({ success: false, message: 'Selected department does not exist.' });
    }

    // Check unique email
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A user with email address "${email.trim()}" already exists in the institution registry.`
      });
    }

    // Default password Student@123
    const defaultPassword = 'Student@123';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`;

    // Insert student
    const insertStmt = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, department_id, phone, avatar_url)
      VALUES (?, ?, ?, 'student', ?, ?, ?)
    `);

    const result = insertStmt.run(
      name.trim(),
      email.trim().toLowerCase(),
      passwordHash,
      deptId,
      phone ? phone.trim() : null,
      avatarUrl
    );

    const studentId = result.lastInsertRowid;

    // Auto-enroll in all courses of this department
    const deptCourses = db.prepare('SELECT id, semester FROM courses WHERE department_id = ?').all(deptId);

    const enrollStmt = db.prepare(`
      INSERT INTO enrollments (student_id, course_id, semester, academic_year, status)
      VALUES (?, ?, ?, '2026-2027', 'active')
    `);

    const runEnrollTx = db.transaction((courses) => {
      for (const c of courses) {
        enrollStmt.run(studentId, c.id, c.semester);
      }
    });

    runEnrollTx(deptCourses);

    return res.status(201).json({
      success: true,
      message: `Student "${name.trim()}" successfully registered and auto-enrolled in ${deptCourses.length} department course(s).`,
      student: {
        id: studentId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: 'student',
        department_id: deptId,
        department_name: department.name,
        department_code: department.code,
        phone: phone ? phone.trim() : null,
        avatar_url: avatarUrl,
        default_password_note: defaultPassword
      },
      enrolled_courses_count: deptCourses.length
    });
  } catch (err) {
    console.error('Error in createStudent:', err);
    return res.status(500).json({ success: false, message: 'Failed to create student.' });
  }
}

/**
 * POST /api/admin/faculty
 * Creates a new faculty member, hashes default password "Faculty@123".
 */
function createFaculty(req, res) {
  try {
    const { name, email, department_id, phone } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Faculty full name is required (min 2 chars).' });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'A valid faculty email address is required.' });
    }

    if (!department_id) {
      return res.status(400).json({ success: false, message: 'Department selection is required.' });
    }

    const deptId = Number(department_id);
    const department = db.prepare('SELECT id, name, code FROM departments WHERE id = ?').get(deptId);
    if (!department) {
      return res.status(400).json({ success: false, message: 'Selected department does not exist.' });
    }

    // Check unique email
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A user with email address "${email.trim()}" already exists in the institution registry.`
      });
    }

    // Default password Faculty@123
    const defaultPassword = 'Faculty@123';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`;

    // Insert faculty
    const insertStmt = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, department_id, phone, avatar_url)
      VALUES (?, ?, ?, 'faculty', ?, ?, ?)
    `);

    const result = insertStmt.run(
      name.trim(),
      email.trim().toLowerCase(),
      passwordHash,
      deptId,
      phone ? phone.trim() : null,
      avatarUrl
    );

    const facultyId = result.lastInsertRowid;

    return res.status(201).json({
      success: true,
      message: `Faculty member "${name.trim()}" successfully registered.`,
      faculty: {
        id: facultyId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: 'faculty',
        department_id: deptId,
        department_name: department.name,
        department_code: department.code,
        phone: phone ? phone.trim() : null,
        avatar_url: avatarUrl,
        courses_taught: null,
        default_password_note: defaultPassword
      }
    });
  } catch (err) {
    console.error('Error in createFaculty:', err);
    return res.status(500).json({ success: false, message: 'Failed to create faculty member.' });
  }
}

/**
 * POST /api/admin/students/:id/reset-device
 * Deletes a student's bound hardware device
 */
function resetStudentDevice(req, res) {
  try {
    const studentId = req.params.id;
    const user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(studentId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    if (user.role !== 'student') {
      return res.status(400).json({ success: false, message: 'Target user is not a student.' });
    }

    db.prepare('DELETE FROM device_bindings WHERE student_id = ?').run(studentId);

    return res.status(200).json({
      success: true,
      message: `Hardware device binding for ${user.name} has been reset.`
    });
  } catch (err) {
    console.error('Error in resetStudentDevice:', err);
    return res.status(500).json({ success: false, message: 'Failed to reset student device binding.' });
  }
}

// =========================================================================
// DEPARTMENTS MANAGEMENT (Phase 12A)
// =========================================================================

function getAdminDepartments(req, res) {
  try {
    const departments = db.prepare(`
      SELECT 
        d.id, 
        d.name, 
        d.code, 
        d.created_at,
        h.id as hod_id,
        h.name as hod_name,
        h.email as hod_email,
        (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.role = 'faculty') as faculty_count,
        (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.role = 'student') as student_count,
        (SELECT COUNT(*) FROM courses c WHERE c.department_id = d.id) as course_count
      FROM departments d
      LEFT JOIN users h ON h.department_id = d.id AND h.role = 'hod'
      ORDER BY d.name ASC
    `).all();

    return res.status(200).json({
      success: true,
      departments
    });
  } catch (err) {
    console.error('Error in getAdminDepartments:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch departments.' });
  }
}

function createDepartment(req, res) {
  try {
    const { name, code, create_hod, hod_name, hod_email } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Department name is required (minimum 2 characters).' });
    }

    if (!code || !/^[A-Z]{2,6}$/.test(code.trim().toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Department code must be 2 to 6 uppercase letters (e.g. ME, CIVIL, AI).' });
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    const existingCode = db.prepare('SELECT id FROM departments WHERE code = ?').get(cleanCode);
    if (existingCode) {
      return res.status(409).json({ success: false, message: `Department code "${cleanCode}" already exists.` });
    }

    if (create_hod) {
      if (!hod_name || hod_name.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'HOD full name is required (minimum 2 characters).' });
      }
      if (!hod_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hod_email.trim())) {
        return res.status(400).json({ success: false, message: 'A valid HOD email address is required.' });
      }
      const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(hod_email.trim().toLowerCase());
      if (existingEmail) {
        return res.status(409).json({ success: false, message: `A user with email "${hod_email.trim()}" already exists.` });
      }
    }

    const insertDeptTx = db.transaction(() => {
      const deptRes = db.prepare('INSERT INTO departments (name, code) VALUES (?, ?)').run(cleanName, cleanCode);
      const deptId = deptRes.lastInsertRowid;

      let createdHod = null;
      if (create_hod) {
        const defaultPassword = 'Hod@123';
        const passwordHash = bcrypt.hashSync(defaultPassword, 10);
        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(hod_name.trim())}`;
        const hodRes = db.prepare(`
          INSERT INTO users (name, email, password_hash, role, department_id, avatar_url)
          VALUES (?, ?, ?, 'hod', ?, ?)
        `).run(hod_name.trim(), hod_email.trim().toLowerCase(), passwordHash, deptId, avatarUrl);

        createdHod = {
          id: hodRes.lastInsertRowid,
          name: hod_name.trim(),
          email: hod_email.trim().toLowerCase(),
          role: 'hod',
          default_password_note: defaultPassword
        };
      }

      return { deptId, createdHod };
    });

    const { deptId, createdHod } = insertDeptTx();

    return res.status(201).json({
      success: true,
      message: `Department "${cleanName}" (${cleanCode}) created successfully.${createdHod ? ' HOD account created with default password "Hod@123".' : ''}`,
      department: {
        id: deptId,
        name: cleanName,
        code: cleanCode,
        hod: createdHod
      }
    });
  } catch (err) {
    console.error('Error in createDepartment:', err);
    return res.status(500).json({ success: false, message: 'Failed to create department.' });
  }
}

function createDepartmentHod(req, res) {
  try {
    const deptId = Number(req.params.id);
    const { name, email } = req.body;

    const dept = db.prepare('SELECT id, name, code FROM departments WHERE id = ?').get(deptId);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    const existingHod = db.prepare("SELECT id, name FROM users WHERE role = 'hod' AND department_id = ?").get(deptId);
    if (existingHod) {
      return res.status(400).json({
        success: false,
        message: `Department "${dept.name}" already has an assigned HOD (${existingHod.name}). Only one HOD is permitted per department.`
      });
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'HOD full name is required (min 2 chars).' });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existingUser) {
      return res.status(409).json({ success: false, message: `A user with email "${email.trim()}" already exists.` });
    }

    const defaultPassword = 'Hod@123';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`;

    const resInsert = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, department_id, avatar_url)
      VALUES (?, ?, ?, 'hod', ?, ?)
    `).run(name.trim(), cleanEmail, passwordHash, deptId, avatarUrl);

    return res.status(201).json({
      success: true,
      message: `HOD account for ${dept.code} created successfully with default password "Hod@123".`,
      hod: {
        id: resInsert.lastInsertRowid,
        name: name.trim(),
        email: cleanEmail,
        department_id: deptId,
        role: 'hod',
        default_password_note: defaultPassword
      }
    });
  } catch (err) {
    console.error('Error in createDepartmentHod:', err);
    return res.status(500).json({ success: false, message: 'Failed to create HOD account.' });
  }
}

function updateDepartment(req, res) {
  try {
    const deptId = Number(req.params.id);
    const { name } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Department name is required (min 2 chars).' });
    }

    const dept = db.prepare('SELECT id, name, code FROM departments WHERE id = ?').get(deptId);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    db.prepare('UPDATE departments SET name = ? WHERE id = ?').run(name.trim(), deptId);

    return res.status(200).json({
      success: true,
      message: `Department "${dept.code}" updated successfully.`,
      department: {
        id: deptId,
        code: dept.code,
        name: name.trim()
      }
    });
  } catch (err) {
    console.error('Error in updateDepartment:', err);
    return res.status(500).json({ success: false, message: 'Failed to update department.' });
  }
}

function deleteDepartment(req, res) {
  try {
    const deptId = Number(req.params.id);
    const dept = db.prepare('SELECT id, name, code FROM departments WHERE id = ?').get(deptId);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    const userCount = db.prepare('SELECT COUNT(*) as c FROM users WHERE department_id = ?').get(deptId).c;
    const courseCount = db.prepare('SELECT COUNT(*) as c FROM courses WHERE department_id = ?').get(deptId).c;
    const noticeCount = db.prepare('SELECT COUNT(*) as c FROM notices WHERE department_id = ?').get(deptId).c;
    const complaintCount = db.prepare('SELECT COUNT(*) as c FROM complaints WHERE department_id = ?').get(deptId).c;

    if (userCount > 0 || courseCount > 0 || noticeCount > 0 || complaintCount > 0) {
      const dependencies = [];
      if (userCount > 0) dependencies.push(`${userCount} user(s)`);
      if (courseCount > 0) dependencies.push(`${courseCount} course(s)`);
      if (noticeCount > 0) dependencies.push(`${noticeCount} notice(s)`);
      if (complaintCount > 0) dependencies.push(`${complaintCount} complaint(s)`);

      return res.status(400).json({
        success: false,
        message: `Cannot delete department "${dept.name}" (${dept.code}) because it is still referenced by: ${dependencies.join(', ')}. Reassign or remove these records first.`
      });
    }

    db.prepare('DELETE FROM departments WHERE id = ?').run(deptId);

    return res.status(200).json({
      success: true,
      message: `Department "${dept.name}" (${dept.code}) deleted successfully.`
    });
  } catch (err) {
    console.error('Error in deleteDepartment:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete department.' });
  }
}

// =========================================================================
// COURSES MANAGEMENT (Phase 12A)
// =========================================================================

function getAdminCourses(req, res) {
  try {
    const { department_id, semester, search } = req.query;
    let conditions = ['1=1'];
    let params = [];

    if (department_id && department_id !== 'all') {
      conditions.push('c.department_id = ?');
      params.push(Number(department_id));
    }

    if (semester && semester !== 'all') {
      conditions.push('c.semester = ?');
      params.push(Number(semester));
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push('(c.code LIKE ? OR c.name LIKE ? OR u.name LIKE ?)');
      params.push(term, term, term);
    }

    const query = `
      SELECT 
        c.id,
        c.name,
        c.code,
        c.department_id,
        d.name as department_name,
        d.code as department_code,
        c.faculty_id,
        u.name as faculty_name,
        u.email as faculty_email,
        c.credits,
        c.semester,
        c.weekly_lectures,
        c.lab_hours_per_week,
        c.course_type,
        c.created_at,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'active') as enrolled_count
      FROM courses c
      JOIN departments d ON c.department_id = d.id
      LEFT JOIN users u ON c.faculty_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.code ASC
    `;

    const courses = db.prepare(query).all(...params);

    return res.status(200).json({
      success: true,
      courses
    });
  } catch (err) {
    console.error('Error in getAdminCourses:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch courses.' });
  }
}

function createCourse(req, res) {
  try {
    const {
      code,
      name,
      department_id,
      semester,
      credits,
      course_type,
      weekly_lectures,
      lab_hours_per_week,
      faculty_id,
      enroll_existing_students
    } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: 'Course code is required (e.g. CSE-301).' });
    }
    const cleanCode = code.trim().toUpperCase();

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Course name is required (min 2 chars).' });
    }

    if (!department_id) {
      return res.status(400).json({ success: false, message: 'Department selection is required.' });
    }
    const deptId = Number(department_id);
    const dept = db.prepare('SELECT id, name, code FROM departments WHERE id = ?').get(deptId);
    if (!dept) {
      return res.status(400).json({ success: false, message: 'Selected department does not exist.' });
    }

    const sem = Number(semester);
    if (isNaN(sem) || sem < 1 || sem > 8) {
      return res.status(400).json({ success: false, message: 'Semester must be between 1 and 8.' });
    }

    const cred = Number(credits);
    if (isNaN(cred) || cred < 1 || cred > 6) {
      return res.status(400).json({ success: false, message: 'Credits must be between 1 and 6.' });
    }

    const validTypes = ['theory', 'lab', 'both'];
    if (!course_type || !validTypes.includes(course_type)) {
      return res.status(400).json({ success: false, message: 'Course type must be "theory", "lab", or "both".' });
    }

    const lectures = parseInt(weekly_lectures ?? 3, 10);
    if (isNaN(lectures) || lectures < 0) {
      return res.status(400).json({ success: false, message: 'Weekly lectures must be an integer >= 0.' });
    }

    const labHours = parseInt(lab_hours_per_week ?? 0, 10);
    if (isNaN(labHours) || labHours < 0) {
      return res.status(400).json({ success: false, message: 'Lab hours per week must be an integer >= 0.' });
    }

    const existing = db.prepare('SELECT id FROM courses WHERE code = ?').get(cleanCode);
    if (existing) {
      return res.status(409).json({ success: false, message: `Course code "${cleanCode}" already exists.` });
    }

    let facultyId = null;
    if (faculty_id) {
      facultyId = Number(faculty_id);
      const faculty = db.prepare("SELECT id, name, department_id, role FROM users WHERE id = ?").get(facultyId);
      if (!faculty || faculty.role !== 'faculty') {
        return res.status(400).json({ success: false, message: 'Assigned instructor must be an active faculty member.' });
      }
      if (faculty.department_id !== deptId) {
        return res.status(400).json({
          success: false,
          message: `Assigned faculty member (${faculty.name}) belongs to another department. Faculty must be from ${dept.name} (${dept.code}).`
        });
      }
    }

    const insertTx = db.transaction(() => {
      const resInsert = db.prepare(`
        INSERT INTO courses (
          name, code, department_id, faculty_id, credits, semester,
          weekly_lectures, lab_hours_per_week, course_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name.trim(),
        cleanCode,
        deptId,
        facultyId,
        cred,
        sem,
        lectures,
        labHours,
        course_type
      );

      const courseId = resInsert.lastInsertRowid;
      let enrolledCount = 0;

      if (enroll_existing_students) {
        const students = db.prepare("SELECT id FROM users WHERE role = 'student' AND department_id = ?").all(deptId);
        const enrollStmt = db.prepare(`
          INSERT OR IGNORE INTO enrollments (student_id, course_id, semester, academic_year, status)
          VALUES (?, ?, ?, '2026-2027', 'active')
        `);
        for (const s of students) {
          enrollStmt.run(s.id, courseId, sem);
          enrolledCount++;
        }
      }

      return { courseId, enrolledCount };
    });

    const { courseId, enrolledCount } = insertTx();

    return res.status(201).json({
      success: true,
      message: `Course "${cleanCode}: ${name.trim()}" created successfully.${enrolledCount > 0 ? ` Auto-enrolled ${enrolledCount} active student(s).` : ''}`,
      course: {
        id: courseId,
        code: cleanCode,
        name: name.trim(),
        department_id: deptId,
        department_code: dept.code,
        faculty_id: facultyId,
        enrolled_count: enrolledCount
      }
    });
  } catch (err) {
    console.error('Error in createCourse:', err);
    return res.status(500).json({ success: false, message: 'Failed to create course.' });
  }
}

function updateCourse(req, res) {
  try {
    const courseId = Number(req.params.id);
    const {
      name,
      semester,
      credits,
      course_type,
      weekly_lectures,
      lab_hours_per_week,
      faculty_id
    } = req.body;

    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Course name is required (min 2 chars).' });
    }

    const sem = Number(semester);
    if (isNaN(sem) || sem < 1 || sem > 8) {
      return res.status(400).json({ success: false, message: 'Semester must be between 1 and 8.' });
    }

    const cred = Number(credits);
    if (isNaN(cred) || cred < 1 || cred > 6) {
      return res.status(400).json({ success: false, message: 'Credits must be between 1 and 6.' });
    }

    const validTypes = ['theory', 'lab', 'both'];
    if (!course_type || !validTypes.includes(course_type)) {
      return res.status(400).json({ success: false, message: 'Course type must be theory, lab, or both.' });
    }

    const lectures = parseInt(weekly_lectures ?? 3, 10);
    const labHours = parseInt(lab_hours_per_week ?? 0, 10);

    let newFacultyId = null;
    if (faculty_id) {
      newFacultyId = Number(faculty_id);
      const faculty = db.prepare("SELECT id, name, department_id, role FROM users WHERE id = ?").get(newFacultyId);
      if (!faculty || faculty.role !== 'faculty') {
        return res.status(400).json({ success: false, message: 'Assigned instructor must be an active faculty member.' });
      }
      if (faculty.department_id !== course.department_id) {
        return res.status(400).json({
          success: false,
          message: `Assigned faculty member (${faculty.name}) must belong to the course's department.`
        });
      }

      // If faculty changed and course has timetable slots, run conflict check on every slot
      if (newFacultyId !== course.faculty_id) {
        const slots = db.prepare('SELECT id, day_of_week, start_time, end_time, room, slot_type FROM timetable_slots WHERE course_id = ?').all(courseId);
        const DAY_NAMES = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };

        for (const slot of slots) {
          const clash = db.prepare(`
            SELECT s.id, s.start_time, s.end_time, s.room, s.slot_type, c.code as course_code
            FROM timetable_slots s
            JOIN courses c ON s.course_id = c.id
            WHERE c.faculty_id = ?
              AND s.course_id != ?
              AND s.day_of_week = ?
              AND s.start_time < ?
              AND s.end_time > ?
          `).get(newFacultyId, courseId, slot.day_of_week, slot.end_time, slot.start_time);

          if (clash) {
            const dayName = DAY_NAMES[slot.day_of_week] || `Day ${slot.day_of_week}`;
            return res.status(409).json({
              success: false,
              message: `Faculty clash: ${faculty.name} is already scheduled to teach ${clash.course_code} in ${clash.room} from ${clash.start_time} to ${clash.end_time} on ${dayName}. Cannot reassign faculty for ${course.code}.`
            });
          }
        }
      }
    }

    db.prepare(`
      UPDATE courses
      SET name = ?, semester = ?, credits = ?, course_type = ?,
          weekly_lectures = ?, lab_hours_per_week = ?, faculty_id = ?
      WHERE id = ?
    `).run(
      name.trim(),
      sem,
      cred,
      course_type,
      lectures,
      labHours,
      newFacultyId,
      courseId
    );

    return res.status(200).json({
      success: true,
      message: `Course "${course.code}" updated successfully.`
    });
  } catch (err) {
    console.error('Error in updateCourse:', err);
    return res.status(500).json({ success: false, message: 'Failed to update course.' });
  }
}

function deleteCourse(req, res) {
  try {
    const courseId = Number(req.params.id);
    const course = db.prepare('SELECT id, name, code FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const attCount = db.prepare('SELECT COUNT(*) as c FROM attendance WHERE course_id = ?').get(courseId).c;
    const sessionCount = db.prepare('SELECT COUNT(*) as c FROM attendance_sessions WHERE course_id = ?').get(courseId).c;
    const marksCount = db.prepare('SELECT COUNT(*) as c FROM marks WHERE course_id = ?').get(courseId).c;
    const assignCount = db.prepare('SELECT COUNT(*) as c FROM assignments WHERE course_id = ?').get(courseId).c;
    const resCount = db.prepare('SELECT COUNT(*) as c FROM resources WHERE course_id = ?').get(courseId).c;
    const slotCount = db.prepare('SELECT COUNT(*) as c FROM timetable_slots WHERE course_id = ?').get(courseId).c;

    if (attCount > 0 || sessionCount > 0 || marksCount > 0 || assignCount > 0 || resCount > 0 || slotCount > 0) {
      const records = [];
      if (attCount > 0) records.push(`${attCount} attendance row(s)`);
      if (sessionCount > 0) records.push(`${sessionCount} live session(s)`);
      if (marksCount > 0) records.push(`${marksCount} marks entry(ies)`);
      if (assignCount > 0) records.push(`${assignCount} assignment(s)`);
      if (resCount > 0) records.push(`${resCount} resource(s)`);
      if (slotCount > 0) records.push(`${slotCount} timetable slot(s)`);

      return res.status(400).json({
        success: false,
        message: `Cannot delete course "${course.code}" because it has existing academic records: ${records.join(', ')}. Remove or reassign these records first.`
      });
    }

    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM enrollments WHERE course_id = ?').run(courseId);
      db.prepare('DELETE FROM courses WHERE id = ?').run(courseId);
    });
    deleteTx();

    return res.status(200).json({
      success: true,
      message: `Course "${course.code}" deleted successfully.`
    });
  } catch (err) {
    console.error('Error in deleteCourse:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete course.' });
  }
}

// =========================================================================
// ROOMS MANAGEMENT (Phase 12A)
// =========================================================================

function getAdminRooms(req, res) {
  try {
    const rooms = db.prepare(`
      SELECT 
        r.id,
        r.name,
        r.room_type,
        r.capacity,
        r.created_at,
        (SELECT COUNT(*) FROM timetable_slots s WHERE s.room = r.name) as slot_count
      FROM rooms r
      ORDER BY r.name ASC
    `).all();

    return res.status(200).json({
      success: true,
      rooms
    });
  } catch (err) {
    console.error('Error in getAdminRooms:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch rooms.' });
  }
}

function createRoom(req, res) {
  try {
    const { name, room_type, capacity } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Room name is required (e.g. LH-301, CS-Lab-2).' });
    }
    const cleanName = name.trim();

    const validTypes = ['lecture', 'lab'];
    if (!room_type || !validTypes.includes(room_type)) {
      return res.status(400).json({ success: false, message: 'Room type must be "lecture" or "lab".' });
    }

    const cap = parseInt(capacity ?? 60, 10);
    if (isNaN(cap) || cap < 1) {
      return res.status(400).json({ success: false, message: 'Room capacity must be a positive integer.' });
    }

    const existing = db.prepare('SELECT id FROM rooms WHERE name = ? COLLATE NOCASE').get(cleanName);
    if (existing) {
      return res.status(409).json({ success: false, message: `Room with name "${cleanName}" already exists.` });
    }

    const resInsert = db.prepare('INSERT INTO rooms (name, room_type, capacity) VALUES (?, ?, ?)').run(cleanName, room_type, cap);

    return res.status(201).json({
      success: true,
      message: `Room "${cleanName}" created successfully.`,
      room: {
        id: resInsert.lastInsertRowid,
        name: cleanName,
        room_type,
        capacity: cap,
        slot_count: 0
      }
    });
  } catch (err) {
    console.error('Error in createRoom:', err);
    return res.status(500).json({ success: false, message: 'Failed to create room.' });
  }
}

function updateRoom(req, res) {
  try {
    const roomId = Number(req.params.id);
    const { name, room_type, capacity } = req.body;

    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Room name is required.' });
    }
    const cleanName = name.trim();

    const validTypes = ['lecture', 'lab'];
    if (!room_type || !validTypes.includes(room_type)) {
      return res.status(400).json({ success: false, message: 'Room type must be "lecture" or "lab".' });
    }

    const cap = parseInt(capacity ?? 60, 10);
    if (isNaN(cap) || cap < 1) {
      return res.status(400).json({ success: false, message: 'Room capacity must be a positive integer.' });
    }

    const existing = db.prepare('SELECT id FROM rooms WHERE name = ? COLLATE NOCASE AND id != ?').get(cleanName, roomId);
    if (existing) {
      return res.status(409).json({ success: false, message: `Room name "${cleanName}" is already taken.` });
    }

    // Check room_type change validity against existing scheduled timetable slots
    if (room_type !== room.room_type) {
      if (room_type === 'lab') {
        const invalidSlots = db.prepare(`
          SELECT COUNT(*) as c FROM timetable_slots WHERE room = ? AND slot_type IN ('lecture', 'tutorial')
        `).get(room.name).c;

        if (invalidSlots > 0) {
          return res.status(400).json({
            success: false,
            message: `Cannot change room type to "lab" because ${invalidSlots} lecture/tutorial slot(s) are currently scheduled in "${room.name}". Reassign or remove those timetable slots first.`
          });
        }
      } else if (room_type === 'lecture') {
        const invalidSlots = db.prepare(`
          SELECT COUNT(*) as c FROM timetable_slots WHERE room = ? AND slot_type = 'lab'
        `).get(room.name).c;

        if (invalidSlots > 0) {
          return res.status(400).json({
            success: false,
            message: `Cannot change room type to "lecture" because ${invalidSlots} lab slot(s) are currently scheduled in "${room.name}". Reassign or remove those timetable slots first.`
          });
        }
      }
    }

    // Update in transaction: room row + timetable_slots if renamed
    const updateTx = db.transaction(() => {
      db.prepare('UPDATE rooms SET name = ?, room_type = ?, capacity = ? WHERE id = ?').run(
        cleanName,
        room_type,
        cap,
        roomId
      );

      if (cleanName !== room.name) {
        db.prepare('UPDATE timetable_slots SET room = ? WHERE room = ?').run(cleanName, room.name);
      }
    });

    updateTx();

    return res.status(200).json({
      success: true,
      message: `Room "${cleanName}" updated successfully.${cleanName !== room.name ? ' Associated timetable slots were also updated.' : ''}`,
      room: {
        id: roomId,
        name: cleanName,
        room_type,
        capacity: cap
      }
    });
  } catch (err) {
    console.error('Error in updateRoom:', err);
    return res.status(500).json({ success: false, message: 'Failed to update room.' });
  }
}

function deleteRoom(req, res) {
  try {
    const roomId = Number(req.params.id);
    const room = db.prepare('SELECT id, name FROM rooms WHERE id = ?').get(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    const slotCount = db.prepare('SELECT COUNT(*) as c FROM timetable_slots WHERE room = ?').get(room.name).c;
    if (slotCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete room "${room.name}" because it is currently assigned to ${slotCount} timetable slot(s). Reassign or remove those timetable slots first.`
      });
    }

    db.prepare('DELETE FROM rooms WHERE id = ?').run(roomId);

    return res.status(200).json({
      success: true,
      message: `Room "${room.name}" deleted successfully.`
    });
  } catch (err) {
    console.error('Error in deleteRoom:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete room.' });
  }
}

module.exports = {
  resetDemoData,
  getUsers,
  createStudent,
  createFaculty,
  resetStudentDevice,
  getAdminDepartments,
  createDepartment,
  createDepartmentHod,
  updateDepartment,
  deleteDepartment,
  getAdminCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getAdminRooms,
  createRoom,
  updateRoom,
  deleteRoom
};



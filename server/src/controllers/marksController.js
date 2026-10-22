const db = require('../config/db');

const VALID_EXAM_TYPES = ['internal_1', 'internal_2', 'assignment', 'final'];

/**
 * GET /api/marks/sheet?course_id=&exam_type= (Faculty)
 * Returns enrolled students with their recorded scores for the selected exam type.
 * Enforces course ownership (403 if not faculty's course).
 */
function getMarksSheet(req, res) {
  try {
    const facultyId = req.user.id;
    const { course_id, exam_type } = req.query;

    if (!course_id || !exam_type) {
      return res.status(400).json({
        success: false,
        message: 'course_id and exam_type parameters are required.'
      });
    }

    if (!VALID_EXAM_TYPES.includes(exam_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid exam_type. Allowed types: ${VALID_EXAM_TYPES.join(', ')}`
      });
    }

    // Verify course ownership
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
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to manage marks for this course.'
      });
    }

    // Fetch enrolled students and their scores for this exam type
    const students = db.prepare(`
      SELECT
        u.id as student_id,
        u.name,
        u.email,
        u.avatar_url,
        m.id as mark_id,
        m.score,
        COALESCE(m.max_score, 100) as max_score,
        m.remarks,
        m.updated_at
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      LEFT JOIN marks m ON m.student_id = u.id AND m.course_id = e.course_id AND m.exam_type = ?
      WHERE e.course_id = ? AND e.status = 'active'
      ORDER BY u.name ASC
    `).all(exam_type, course_id);

    return res.status(200).json({
      success: true,
      course: {
        id: course.id,
        name: course.name,
        code: course.code,
        department_code: course.department_code
      },
      exam_type,
      students
    });
  } catch (err) {
    console.error('Error in getMarksSheet:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch marks sheet.' });
  }
}

/**
 * POST /api/marks/save (Faculty)
 * Upserts marks records in a single transaction.
 * Validates ownership and enforces 0 <= score <= max_score.
 */
function saveMarks(req, res) {
  try {
    const facultyId = req.user.id;
    const { course_id, exam_type, records } = req.body;

    if (!course_id || !exam_type || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'course_id, exam_type, and records array are required.'
      });
    }

    if (!VALID_EXAM_TYPES.includes(exam_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid exam_type. Allowed types: ${VALID_EXAM_TYPES.join(', ')}`
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
        message: 'You are not authorized to enter marks for this course.'
      });
    }

    // Validate scores: 0 <= score <= max_score
    for (const rec of records) {
      if (!rec.student_id) {
        return res.status(400).json({ success: false, message: 'Missing student_id in one or more records.' });
      }

      const score = Number(rec.score);
      const maxScore = Number(rec.max_score) || 100;

      if (isNaN(score) || isNaN(maxScore) || score < 0 || score > maxScore || maxScore <= 0) {
        return res.status(400).json({
          success: false,
          message: `Validation failed: Score for student ${rec.student_id} must be between 0 and ${maxScore}. Received: ${rec.score}.`
        });
      }
    }

    // Transactional upsert
    const upsertStmt = db.prepare(`
      INSERT INTO marks (student_id, course_id, exam_type, score, max_score, remarks, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(student_id, course_id, exam_type) DO UPDATE SET
        score = excluded.score,
        max_score = excluded.max_score,
        remarks = excluded.remarks,
        updated_at = CURRENT_TIMESTAMP
    `);

    const runTx = db.transaction((recs) => {
      for (const rec of recs) {
        const score = Number(rec.score);
        const maxScore = Number(rec.max_score) || 100;
        upsertStmt.run(
          rec.student_id,
          course_id,
          exam_type,
          score,
          maxScore,
          rec.remarks || ''
        );
      }
    });

    runTx(records);

    return res.status(200).json({
      success: true,
      message: `Marks for ${records.length} students recorded successfully for ${exam_type}.`,
      count: records.length,
      exam_type,
      course_id
    });
  } catch (err) {
    console.error('Error in saveMarks:', err);
    return res.status(500).json({ success: false, message: 'Failed to save marks.' });
  }
}

/**
 * GET /api/marks/mine (Student)
 * Returns marks grouped by course and exam type with course average percentage and overall average.
 */
function getStudentMarks(req, res) {
  try {
    const studentId = req.user.id;

    // Enrolled courses
    const courses = db.prepare(`
      SELECT c.id, c.code, c.name, c.credits, c.semester, u.name as faculty_name, d.code as department_code
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN departments d ON c.department_id = d.id
      LEFT JOIN users u ON c.faculty_id = u.id
      WHERE e.student_id = ? AND e.status = 'active'
      ORDER BY c.code ASC
    `).all(studentId);

    let totalCoursePercentages = 0;
    let coursesWithMarksCount = 0;

    const courseGradebooks = courses.map((course) => {
      const marks = db.prepare(`
        SELECT id, exam_type, score, max_score, remarks, updated_at
        FROM marks
        WHERE student_id = ? AND course_id = ?
        ORDER BY
          CASE exam_type
            WHEN 'internal_1' THEN 1
            WHEN 'internal_2' THEN 2
            WHEN 'assignment' THEN 3
            WHEN 'final' THEN 4
            ELSE 5
          END
      `).all(studentId, course.id);

      let courseScoreSum = 0;
      let courseMaxSum = 0;

      const formattedMarks = marks.map((m) => {
        const percentage = m.max_score > 0 ? Math.round((m.score / m.max_score) * 1000) / 10 : 0;
        courseScoreSum += m.score;
        courseMaxSum += m.max_score;
        return {
          id: m.id,
          exam_type: m.exam_type,
          score: m.score,
          max_score: m.max_score,
          percentage,
          remarks: m.remarks,
          updated_at: m.updated_at
        };
      });

      const courseAverage = courseMaxSum > 0 ? Math.round((courseScoreSum / courseMaxSum) * 1000) / 10 : 0;

      if (marks.length > 0) {
        totalCoursePercentages += courseAverage;
        coursesWithMarksCount++;
      }

      return {
        course_id: course.id,
        course_code: course.code,
        course_name: course.name,
        credits: course.credits,
        faculty_name: course.faculty_name,
        department_code: course.department_code,
        marks: formattedMarks,
        evaluated_exams_count: marks.length,
        course_average: courseAverage
      };
    });

    const overallAverage = coursesWithMarksCount > 0
      ? Math.round((totalCoursePercentages / coursesWithMarksCount) * 10) / 10
      : 0;

    return res.status(200).json({
      success: true,
      overall: {
        overall_average: overallAverage,
        courses_count: courses.length,
        evaluated_courses_count: coursesWithMarksCount
      },
      courses: courseGradebooks
    });
  } catch (err) {
    console.error('Error in getStudentMarks:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch personal marks.' });
  }
}

/**
 * GET /api/marks/department (HOD)
 * Returns per-course average, highest, and lowest scores for HOD's own department.
 */
function getDepartmentMarks(req, res) {
  try {
    const departmentId = req.user.department_id;
    if (!departmentId) {
      return res.status(400).json({ success: false, message: 'Department ID required for HOD.' });
    }

    const department = db.prepare('SELECT id, name, code FROM departments WHERE id = ?').get(departmentId);

    const courses = db.prepare(`
      SELECT c.id, c.code, c.name, c.credits, c.semester, u.name as faculty_name
      FROM courses c
      LEFT JOIN users u ON c.faculty_id = u.id
      WHERE c.department_id = ?
      ORDER BY c.code ASC
    `).all(departmentId);

    let deptOverallScoreSum = 0;
    let deptOverallMaxSum = 0;

    const courseStats = courses.map((course) => {
      // All recorded marks for this course
      const allMarks = db.prepare(`
        SELECT score, max_score, exam_type
        FROM marks
        WHERE course_id = ?
      `).all(course.id);

      const enrolledCount = db.prepare(`
        SELECT COUNT(*) as count FROM enrollments WHERE course_id = ? AND status = 'active'
      `).get(course.id)?.count || 0;

      let scoreSum = 0;
      let maxSum = 0;
      let highestPct = 0;
      let lowestPct = 100;

      // Exam type breakdown
      const examMap = {};
      VALID_EXAM_TYPES.forEach(t => {
        examMap[t] = { count: 0, scoreSum: 0, maxSum: 0 };
      });

      allMarks.forEach((m) => {
        scoreSum += m.score;
        maxSum += m.max_score;
        deptOverallScoreSum += m.score;
        deptOverallMaxSum += m.max_score;

        const pct = m.max_score > 0 ? (m.score / m.max_score) * 100 : 0;
        if (pct > highestPct) highestPct = pct;
        if (pct < lowestPct) lowestPct = pct;

        if (examMap[m.exam_type]) {
          examMap[m.exam_type].count++;
          examMap[m.exam_type].scoreSum += m.score;
          examMap[m.exam_type].maxSum += m.max_score;
        }
      });

      const averageScore = maxSum > 0 ? Math.round((scoreSum / maxSum) * 1000) / 10 : 0;
      const highest = allMarks.length > 0 ? Math.round(highestPct * 10) / 10 : 0;
      const lowest = allMarks.length > 0 ? Math.round(lowestPct * 10) / 10 : 0;

      const examBreakdown = Object.keys(examMap).map(type => {
        const item = examMap[type];
        return {
          exam_type: type,
          students_evaluated: item.count,
          average: item.maxSum > 0 ? Math.round((item.scoreSum / item.maxSum) * 1000) / 10 : 0
        };
      });

      return {
        course_id: course.id,
        course_code: course.code,
        course_name: course.name,
        faculty_name: course.faculty_name,
        enrolled_students: enrolledCount,
        total_evaluations: allMarks.length,
        average_score: averageScore,
        highest_score: highest,
        lowest_score: lowest,
        exam_breakdown: examBreakdown
      };
    });

    const departmentAverage = deptOverallMaxSum > 0
      ? Math.round((deptOverallScoreSum / deptOverallMaxSum) * 1000) / 10
      : 0;

    return res.status(200).json({
      success: true,
      department,
      courses: courseStats,
      department_average: departmentAverage
    });
  } catch (err) {
    console.error('Error in getDepartmentMarks:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch department marks.' });
  }
}

module.exports = {
  getMarksSheet,
  saveMarks,
  getStudentMarks,
  getDepartmentMarks
};

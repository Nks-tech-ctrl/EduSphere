const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/db');

router.use(authenticateToken);

// GET /api/departments (Available to all authenticated roles for dynamic forms & filters)
router.get('/', (req, res) => {
  try {
    const departments = db.prepare(`
      SELECT d.id, d.name, d.code,
             (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.role = 'student') as student_count,
             (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.role = 'faculty') as faculty_count,
             (SELECT COUNT(*) FROM courses c WHERE c.department_id = d.id) as course_count
      FROM departments d
      ORDER BY d.name ASC
    `).all();

    return res.status(200).json({
      success: true,
      departments
    });
  } catch (err) {
    console.error('Error in GET /api/departments:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch departments.' });
  }
});

module.exports = router;

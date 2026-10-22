const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  getFacultyCourses,
  getAttendanceSheet,
  markAttendance,
  getStudentAttendance,
  getDepartmentAttendance
} = require('../controllers/attendanceController');

// All attendance routes require authentication
router.use(authenticateToken);

// Faculty routes
router.get('/courses', authorizeRoles('faculty'), getFacultyCourses);
router.get('/sheet', authorizeRoles('faculty'), getAttendanceSheet);
router.post('/mark', authorizeRoles('faculty'), markAttendance);

// Student route
router.get('/mine', authorizeRoles('student'), getStudentAttendance);

// HOD route
router.get('/department', authorizeRoles('hod'), getDepartmentAttendance);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  getMarksSheet,
  saveMarks,
  getStudentMarks,
  getDepartmentMarks
} = require('../controllers/marksController');

router.use(authenticateToken);

// Faculty routes
router.get('/sheet', authorizeRoles('faculty'), getMarksSheet);
router.post('/save', authorizeRoles('faculty'), saveMarks);

// Student route
router.get('/mine', authorizeRoles('student'), getStudentMarks);

// HOD route
router.get('/department', authorizeRoles('hod'), getDepartmentMarks);

module.exports = router;

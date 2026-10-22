const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  createSlot,
  updateSlot,
  deleteSlot,
  getDepartmentTimetable,
  getStudentTimetable,
  getFacultyTimetable,
  getTodaySchedule,
  generateTimetablePreview,
  applyGeneratedTimetable
} = require('../controllers/timetableController');

// Automatic Timetable Generation (Phase 12B - HOD only, Admin gets 403)
router.post('/generate/preview', authenticateToken, authorizeRoles('hod'), generateTimetablePreview);
router.post('/generate/apply', authenticateToken, authorizeRoles('hod'), applyGeneratedTimetable);

// Management endpoints (HOD only - Admin gets 403)
router.post('/', authenticateToken, authorizeRoles('hod'), createSlot);
router.put('/:id', authenticateToken, authorizeRoles('hod'), updateSlot);
router.delete('/:id', authenticateToken, authorizeRoles('hod'), deleteSlot);
router.get('/department', authenticateToken, authorizeRoles('hod'), getDepartmentTimetable);

// Schedule Views
router.get('/mine', authenticateToken, authorizeRoles('student'), getStudentTimetable);
router.get('/faculty', authenticateToken, authorizeRoles('faculty'), getFacultyTimetable);
router.get('/today', authenticateToken, getTodaySchedule);

module.exports = router;

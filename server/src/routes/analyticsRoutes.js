const express = require('express');
const router = express.Router();
const {
  getComplaintAnalytics,
  getAttendanceAnalytics
} = require('../controllers/analyticsController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All analytics endpoints require valid JWT authentication
router.use(authenticateToken);

// Accessible by Admin and HOD (internally scoped to department for HOD)
router.get('/complaints', authorizeRoles('admin', 'hod'), getComplaintAnalytics);
router.get('/attendance', authorizeRoles('admin', 'hod'), getAttendanceAnalytics);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  startLiveSession,
  getSessionCode,
  getSessionDetails,
  reviewCheckin,
  closeLiveSession,
  getFacultyHistory,
  getNetworkInfo,
  getStudentOpenSessions,
  studentCheckin
} = require('../controllers/liveAttendanceController');

// All live attendance endpoints require authentication
router.use(authenticateToken);

// Explicit HOD & Admin guard
router.use((req, res, next) => {
  if (req.user?.role === 'admin' || req.user?.role === 'hod') {
    return res.status(403).json({
      success: false,
      message: 'Access restricted: Live attendance is for Faculty and Students only.'
    });
  }
  next();
});

// Specific named endpoints first to prevent /:id parameter collision
router.post('/start', authorizeRoles('faculty'), startLiveSession);
router.get('/history', authorizeRoles('faculty'), getFacultyHistory);
router.get('/network-info', authorizeRoles('faculty'), getNetworkInfo);

// Student endpoints
router.get('/open', authorizeRoles('student'), getStudentOpenSessions);
router.post('/checkin', authorizeRoles('student'), studentCheckin);

// Dynamic session ID faculty endpoints
router.get('/:id/code', authorizeRoles('faculty'), getSessionCode);
router.post('/:id/review', authorizeRoles('faculty'), reviewCheckin);
router.post('/:id/close', authorizeRoles('faculty'), closeLiveSession);
router.get('/:id', authorizeRoles('faculty'), getSessionDetails);

module.exports = router;

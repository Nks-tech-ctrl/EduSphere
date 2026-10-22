const express = require('express');
const router = express.Router();
const {
  createComplaint,
  getMyComplaints,
  getComplaintByTicket,
  getAssignedComplaints,
  getManagedComplaintDetail,
  updateComplaintStatus,
  runEscalationOnDemand
} = require('../controllers/complaintController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All complaint routes require valid JWT authentication
router.use(authenticateToken);

// ----------------------------------------------------
// Student Endpoints (Phase 2)
// ----------------------------------------------------
router.post('/', authorizeRoles('student'), createComplaint);
router.get('/mine', authorizeRoles('student'), getMyComplaints);

// ----------------------------------------------------
// HOD & Admin Management Endpoints (Phase 3)
// ----------------------------------------------------
router.get('/assigned', authorizeRoles('hod', 'admin'), getAssignedComplaints);
router.get('/manage/:ticket_no', authorizeRoles('hod', 'admin'), getManagedComplaintDetail);
router.patch('/manage/:ticket_no/status', authorizeRoles('hod', 'admin'), updateComplaintStatus);

// Admin-only on-demand SLA Escalation Trigger
router.post('/escalation/run', authorizeRoles('admin'), runEscalationOnDemand);

// ----------------------------------------------------
// Student Detail View
// ----------------------------------------------------
router.get('/:ticket_no', getComplaintByTicket);

module.exports = router;

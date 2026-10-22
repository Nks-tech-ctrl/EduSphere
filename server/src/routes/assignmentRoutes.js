const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { upload } = require('../utils/fileUpload');
const {
  createAssignment,
  getFacultyAssignments,
  getAssignmentSubmissions,
  gradeSubmission,
  deleteAssignment,
  getStudentAssignments,
  submitAssignment,
  downloadAssignmentAttachment,
  downloadSubmissionFile,
  runAssignmentIntegrityCheck,
  getAssignmentIntegrity,
  reviewSubmissionIntegrity
} = require('../controllers/assignmentController');

// Multer error handling wrapper
function wrapUpload(uploadMiddleware) {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds maximum allowed limit of 10 MB.'
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload error.'
        });
      }
      next();
    });
  };
}

// All assignments endpoints require authentication
router.use(authenticateToken);

// Student endpoints
router.get('/mine', authorizeRoles('student'), getStudentAssignments);
router.post('/:id/submit', authorizeRoles('student'), wrapUpload(upload.single('file')), submitAssignment);

// Faculty endpoints
router.get('/faculty', authorizeRoles('faculty', 'admin'), getFacultyAssignments);
router.post('/', authorizeRoles('faculty', 'admin'), wrapUpload(upload.single('attachment')), createAssignment);
router.get('/:id/submissions', authorizeRoles('faculty', 'hod', 'admin'), getAssignmentSubmissions);
router.patch('/submissions/:id/grade', authorizeRoles('faculty', 'admin'), gradeSubmission);
router.delete('/:id', authorizeRoles('faculty', 'admin'), deleteAssignment);

// Phase 8: Submission Integrity Check Endpoints
// Course faculty only (admin gets read-only aggregate summary; students/HOD/other faculty get 403)
router.post('/:id/integrity/run', runAssignmentIntegrityCheck);
router.get('/:id/integrity', getAssignmentIntegrity);
router.patch('/submissions/:id/integrity-review', reviewSubmissionIntegrity);

// Secure authenticated download endpoints
router.get('/:id/attachment', downloadAssignmentAttachment);
router.get('/submissions/:id/file', downloadSubmissionFile);

module.exports = router;

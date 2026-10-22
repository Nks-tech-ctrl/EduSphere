const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { resourceUpload } = require('../utils/fileUpload');
const {
  createResource,
  getFacultyResources,
  deleteResource,
  getStudentResources,
  downloadResource,
  getResourcesOverview
} = require('../controllers/resourceController');

// Multer error handling wrapper for resources
const uploadResourceSingle = (req, res, next) => {
  resourceUpload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds maximum allowed limit of 20MB.'
        });
      }
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          message: err.message
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

// Faculty endpoints
router.post('/', authenticateToken, authorizeRoles('faculty'), uploadResourceSingle, createResource);
router.get('/faculty', authenticateToken, authorizeRoles('faculty'), getFacultyResources);
router.delete('/:id', authenticateToken, authorizeRoles('faculty'), deleteResource);

// Student endpoints
router.get('/mine', authenticateToken, authorizeRoles('student'), getStudentResources);

// HOD & Admin overview - HOD and Admin get 403
router.get('/overview', authenticateToken, (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Forbidden: HOD and Admin are not allowed to access resources overview.'
  });
});

// Authenticated download endpoint (accessible by enrolled students and course faculty only)
router.get('/:id/download', authenticateToken, downloadResource);

module.exports = router;

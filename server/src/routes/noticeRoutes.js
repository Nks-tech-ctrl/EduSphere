const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  getNotices,
  createNotice,
  deleteNotice
} = require('../controllers/noticeController');

router.use(authenticateToken);

// All authenticated roles can view their scoped notices (Admin sees all)
router.get('/', getNotices);

// Faculty, HOD, and Admin can broadcast notices
router.post('/', authorizeRoles('faculty', 'hod', 'admin'), createNotice);

// Author or Admin can delete
router.delete('/:id', deleteNotice);

module.exports = router;

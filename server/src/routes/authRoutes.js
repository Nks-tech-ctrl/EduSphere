const express = require('express');
const router = express.Router();
const { login, getMe, getDemoLogins } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/login', login);
router.get('/demo-accounts', getDemoLogins);

// Protected routes
router.get('/me', authenticateToken, getMe);

module.exports = router;

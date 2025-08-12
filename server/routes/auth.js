const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, requireAuth } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// X (Twitter) OAuth routes
router.get('/x/login', authController.initiateXLogin.bind(authController));
router.get('/x/callback', authController.handleXCallback.bind(authController));

// User management routes
router.post('/logout', authController.logout.bind(authController));
router.get('/me', authController.getCurrentUser.bind(authController));

// Credit management routes
router.post('/daily-bonus', requireAuth, authController.claimDailyBonus.bind(authController));
router.get('/credit-history', requireAuth, authController.getCreditHistory.bind(authController));

module.exports = router;

const express = require('express');
const { socialController } = require('../controllers/socialController');
const { authenticateToken, requireAuth } = require('../middleware/auth');
const { validationRules, xssProtection } = require('../middleware/validation');
const router = express.Router();

// Apply XSS protection to all routes
router.use(xssProtection);

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Routes
router.post('/share', validationRules.socialSharing, socialController.shareContent);
router.post('/post-to-x', requireAuth, validationRules.socialSharing, socialController.postToX);
router.get('/stats', socialController.getStats);
router.get('/platforms', socialController.getPlatforms);
router.post('/track-click', validationRules.socialSharing, socialController.trackClick);
router.get('/trending-hashtags', socialController.getTrendingHashtags);
router.post('/report', validationRules.socialSharing, socialController.reportContent);

module.exports = router; 
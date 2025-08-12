const express = require('express');
const { socialController } = require('../controllers/socialController');
const { authenticateToken, requireAuth } = require('../middleware/auth');
const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Routes
router.post('/share', socialController.shareContent);
router.post('/post-to-x', requireAuth, socialController.postToX);
router.get('/stats', socialController.getStats);
router.get('/platforms', socialController.getPlatforms);
router.post('/track-click', socialController.trackClick);
router.get('/trending-hashtags', socialController.getTrendingHashtags);
router.post('/report', socialController.reportContent);

module.exports = router; 
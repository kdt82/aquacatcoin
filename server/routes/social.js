const express = require('express');
const { socialController } = require('../controllers/socialController');
const router = express.Router();

// Routes
router.post('/share', socialController.shareContent);
router.post('/post-to-x', socialController.postToX);
router.get('/stats', socialController.getStats);
router.get('/platforms', socialController.getPlatforms);
router.post('/track-click', socialController.trackClick);
router.get('/trending-hashtags', socialController.getTrendingHashtags);
router.post('/report', socialController.reportContent);

module.exports = router; 
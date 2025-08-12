const express = require('express');
const { galleryController } = require('../controllers/galleryController');
const { authenticateToken, checkRemixLimit } = require('../middleware/auth');
const router = express.Router();

// Routes
router.get('/', galleryController.getGallery);
router.get('/remixable', galleryController.getRemixableImages);
router.get('/stats', galleryController.getStats);
router.get('/trending', galleryController.getTrending);
router.post('/search', galleryController.searchMemes);
router.get('/categories', galleryController.getCategories);
router.get('/featured', galleryController.getFeatured);
router.post('/:id/remix', authenticateToken, checkRemixLimit, galleryController.startRemix);

module.exports = router; 
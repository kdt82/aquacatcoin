const express = require('express');
const { galleryController } = require('../controllers/galleryController');
const router = express.Router();

// Routes
router.get('/', galleryController.getGallery);
router.get('/remixable', galleryController.getRemixableImages);
router.get('/stats', galleryController.getStats);
router.get('/trending', galleryController.getTrending);
router.post('/search', galleryController.searchMemes);
router.get('/categories', galleryController.getCategories);
router.get('/featured', galleryController.getFeatured);

module.exports = router; 
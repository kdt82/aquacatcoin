const express = require('express');
const { param, validationResult } = require('express-validator');
const { galleryController } = require('../controllers/galleryController');
const { authenticateToken, checkRemixLimit } = require('../middleware/auth');
const { validationRules, xssProtection } = require('../middleware/validation');
const router = express.Router();

// Apply XSS protection to all routes
router.use(xssProtection);

// Simple validation middleware for MongoDB ObjectIds
const validateObjectId = [
  param('id').isMongoId().withMessage('Valid ID required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        details: errors.array()
      });
    }
    next();
  }
];

// Routes
router.get('/', validationRules.galleryQuery, galleryController.getGallery);
router.get('/remixable', validationRules.galleryQuery, galleryController.getRemixableImages);
router.get('/stats', galleryController.getStats);
router.get('/trending', validationRules.galleryQuery, galleryController.getTrending);
router.post('/search', validationRules.galleryQuery, galleryController.searchMemes);
router.get('/categories', galleryController.getCategories);
router.get('/featured', validationRules.galleryQuery, galleryController.getFeatured);
router.post('/:id/remix', authenticateToken, checkRemixLimit, validateObjectId, galleryController.startRemix);

module.exports = router; 
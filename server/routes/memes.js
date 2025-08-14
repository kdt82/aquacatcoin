const express = require('express');
const { param, validationResult } = require('express-validator');
const { memeController, upload } = require('../controllers/memeController');
const { authenticateToken, requireCredits } = require('../middleware/auth');
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
router.get('/', validationRules.galleryQuery, memeController.getAllMemes);
router.get('/templates', memeController.getTemplates);
router.get('/:id', validateObjectId, memeController.getMemeById);
router.get('/:id/original', validateObjectId, memeController.getOriginalImage);
router.post('/upload', upload.single('image'), validationRules.fileUpload, memeController.uploadImage);
router.post('/create', authenticateToken, requireCredits(5), upload.single('canvas'), validationRules.memeCreation, memeController.createMeme);
router.post('/save', authenticateToken, validationRules.memeCreation, memeController.saveMeme);
router.put('/:id/like', validateObjectId, memeController.likeMeme);
router.post('/:id/view', validateObjectId, memeController.incrementViews);
router.put('/:id/share', validateObjectId, memeController.shareMeme);
router.put('/:id', authenticateToken, validateObjectId, validationRules.memeCreation, memeController.updateMeme);
router.delete('/:id', authenticateToken, validateObjectId, memeController.deleteMeme);

module.exports = router; 
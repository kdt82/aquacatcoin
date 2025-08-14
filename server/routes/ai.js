const express = require('express');
const { param, validationResult } = require('express-validator');
const { aiController } = require('../controllers/aiController');
const { authenticateToken, checkGenerationLimit } = require('../middleware/auth');
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
router.get('/models', aiController.getModels);
router.get('/status', aiController.getStatus);
router.post('/generate', authenticateToken, checkGenerationLimit, validationRules.aiGeneration, aiController.generateImage);
router.get('/status/:id', validateObjectId, aiController.checkStatus);
router.post('/enhance-prompt', validationRules.aiGeneration, aiController.enhancePrompt);
router.post('/set-style-reference', validationRules.fileUpload, aiController.setStyleReference);
router.get('/config', aiController.getConfig);

module.exports = router; 
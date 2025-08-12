const express = require('express');
const { body, validationResult } = require('express-validator');
const { aiController } = require('../controllers/aiController');
const { authenticateToken, checkGenerationLimit } = require('../middleware/auth');
const router = express.Router();

// Validation middleware for generation requests (AQUA trained model only)
const validateGenerationRequest = [
  body('prompt')
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Prompt must be a string between 1 and 1000 characters'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Validation middleware for prompt enhancement
const validatePromptEnhancement = [
  body('prompt')
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Prompt must be a string between 1 and 1000 characters'),
  body('model')
    .optional()
    .isString()
    .isIn(['creative', 'artistic', 'vivid', 'anime', 'pixel', 'sketch'])
    .withMessage('Invalid model selection'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Routes
router.get('/models', aiController.getModels);
router.get('/status', aiController.getStatus);
router.post('/generate', authenticateToken, checkGenerationLimit, validateGenerationRequest, aiController.generateImage);
router.get('/status/:id', aiController.checkStatus);
router.post('/enhance-prompt', validatePromptEnhancement, aiController.enhancePrompt);
router.post('/set-style-reference', aiController.setStyleReference);
router.get('/config', aiController.getConfig);

module.exports = router; 
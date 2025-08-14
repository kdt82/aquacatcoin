const { body, param, query, validationResult } = require('express-validator');
const DOMPurify = require('isomorphic-dompurify');

// Custom sanitizer to prevent XSS
const sanitizeInput = (value) => {
  if (typeof value !== 'string') return value;
  // Remove HTML tags and encode special characters
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
};

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Common validation rules
const commonValidations = {
  // Text input validation
  text: (fieldName, options = {}) => {
    const { min = 1, max = 1000, optional = false } = options;
    const validator = optional ? body(fieldName).optional() : body(fieldName);
    
    return validator
      .trim()
      .isLength({ min, max })
      .withMessage(`${fieldName} must be between ${min} and ${max} characters`)
      .customSanitizer(sanitizeInput)
      .escape(); // HTML encode
  },

  // Email validation
  email: (fieldName = 'email') => 
    body(fieldName)
      .isEmail()
      .withMessage('Valid email required')
      .normalizeEmail()
      .customSanitizer(sanitizeInput),

  // URL validation
  url: (fieldName, optional = false) => {
    const validator = optional ? body(fieldName).optional() : body(fieldName);
    return validator
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('Valid URL required')
      .customSanitizer(sanitizeInput);
  },



  // Numeric validation
  number: (fieldName, options = {}) => {
    const { min = 0, max = Number.MAX_SAFE_INTEGER, optional = false } = options;
    const validator = optional ? body(fieldName).optional() : body(fieldName);
    
    return validator
      .isNumeric()
      .withMessage(`${fieldName} must be a number`)
      .isFloat({ min, max })
      .withMessage(`${fieldName} must be between ${min} and ${max}`)
      .toFloat();
  },

  // Boolean validation
  boolean: (fieldName, optional = false) => {
    const validator = optional ? body(fieldName).optional() : body(fieldName);
    return validator
      .isBoolean()
      .withMessage(`${fieldName} must be true or false`)
      .toBoolean();
  }
};

// Specific validation rules for different endpoints
const validationRules = {
  // AI generation validation
  aiGeneration: [
    commonValidations.text('prompt', { min: 5, max: 500 }),
    commonValidations.text('style', { max: 100, optional: true }),
    commonValidations.number('width', { min: 256, max: 2048, optional: true }),
    commonValidations.number('height', { min: 256, max: 2048, optional: true }),
    commonValidations.number('numImages', { min: 1, max: 4, optional: true }),
    handleValidationErrors
  ],

  // Meme creation validation
  memeCreation: [
    commonValidations.text('title', { min: 1, max: 200 }),
    commonValidations.text('description', { max: 1000, optional: true }),
    commonValidations.text('tags', { max: 200, optional: true }),
    body('isPublic').optional().isBoolean().toBoolean(),
    handleValidationErrors
  ],

  // User profile validation
  userProfile: [
    commonValidations.text('displayName', { min: 1, max: 100, optional: true }),
    commonValidations.text('bio', { max: 500, optional: true }),
    commonValidations.url('website', true),
    handleValidationErrors
  ],

  // Gallery query validation
  galleryQuery: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('search').optional().trim().isLength({ max: 100 }).customSanitizer(sanitizeInput),
    query('tag').optional().trim().isLength({ max: 50 }).customSanitizer(sanitizeInput),
    query('sortBy').optional().isIn(['newest', 'oldest', 'popular', 'trending']),
    handleValidationErrors
  ],

  // Social media sharing validation
  socialSharing: [
    body('memeId').isMongoId().withMessage('Valid meme ID required'),
    body('platform').isIn(['twitter', 'reddit', 'facebook', 'instagram']),
    body('message').optional().trim().isLength({ max: 280 }).customSanitizer(sanitizeInput),
    handleValidationErrors
  ],

  // Competition entry validation
  competitionEntry: [
    body('memeId').isMongoId().withMessage('Valid meme ID required'),
    body('competitionId').isMongoId().withMessage('Valid competition ID required'),
    body('entryTitle').optional().trim().isLength({ min: 1, max: 100 }).customSanitizer(sanitizeInput),
    handleValidationErrors
  ],

  // File upload validation
  fileUpload: [
    body('filename').optional().trim().isLength({ min: 1, max: 255 })
      .matches(/^[a-zA-Z0-9._-]+$/).withMessage('Invalid filename format'),
    body('fileType').optional().isIn(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    body('fileSize').optional().isInt({ min: 1, max: 10485760 }), // 10MB max
    handleValidationErrors
  ],

  // MongoDB ObjectId validation helper
  objectId: (fieldName, location = 'param') => {
    const validator = location === 'param' ? param(fieldName) : 
                     location === 'query' ? query(fieldName) : body(fieldName);
    
    return [
      validator
        .isMongoId()
        .withMessage('Valid ID required')
        .customSanitizer(sanitizeInput),
      handleValidationErrors
    ];
  }
};

// Rate limiting validation
const rateLimitValidation = [
  body('*').custom((value, { req }) => {
    // Check for suspicious patterns that might indicate abuse
    if (typeof value === 'string') {
      // Check for script injection attempts
      if (/<script|javascript:|data:|vbscript:/i.test(value)) {
        throw new Error('Potentially malicious content detected');
      }
      
      // Check for SQL injection patterns
      if (/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b)/i.test(value)) {
        throw new Error('Potentially malicious content detected');
      }
    }
    return true;
  })
];

// XSS prevention middleware
const xssProtection = (req, res, next) => {
  // Sanitize all string inputs in body, query, and params
  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeInput(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  
  next();
};

module.exports = {
  validationRules,
  commonValidations,
  handleValidationErrors,
  xssProtection,
  rateLimitValidation
};

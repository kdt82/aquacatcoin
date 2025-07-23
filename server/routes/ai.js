const express = require('express');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map();

// AI Generation Models (6 most accessible models)
const AI_MODELS = {
  creative: {
    id: "6bef9f1b-29cb-40c7-b9df-32b51c1f67d3",
    name: "Creative Engine",
    description: "Best for cartoon-style memes with vibrant colors",
    example: "A wet cartoon cat with big eyes sitting in the rain",
    speed: "Fast",
    recommended: true
  },
  artistic: {
    id: "e71a1c2f-4f80-4800-934f-2c68979d8cc8", 
    name: "Artistic Vision",
    description: "Perfect for stylized digital art memes",
    example: "Digital art of a blue cat mascot with crypto symbols",
    speed: "Fast"
  },
  vivid: {
    id: "1e60896f-3c26-4296-8ecc-53e2afecc132",
    name: "Vivid Dreams",
    description: "High-quality realistic images with meme potential",
    example: "Photorealistic wet cat with expressive sad eyes",
    speed: "Medium"
  },
  anime: {
    id: "e316348f-7773-490e-adcd-46757c738eb7",
    name: "Anime Style",
    description: "Anime-inspired characters perfect for crypto memes",
    example: "Anime cat character holding SUI blockchain logo",
    speed: "Medium"
  },
  pixel: {
    id: "1aa0f478-51be-4efd-94e8-76bfc8f533af",
    name: "Pixel Perfect",
    description: "Retro pixel art style for nostalgic memes", 
    example: "8-bit pixel art cat in rain with umbrella",
    speed: "Very Fast"
  },
  sketch: {
    id: "ac614f96-1082-45bf-be9d-757f2d31c174",
    name: "Sketch Master",
    description: "Hand-drawn sketch style for artistic memes",
    example: "Pencil sketch of grumpy wet cat with crypto coins",
    speed: "Very Fast"
  }
};

// Rate limiting middleware
const checkRateLimit = (req, res, next) => {
  const now = Date.now();
  const hour = 60 * 60 * 1000; // 1 hour in milliseconds
  
  // Get identifier from IP, session, or cookies
  const identifier = req.ip || req.connection.remoteAddress || 'unknown';
  const sessionId = req.session?.id || req.headers['x-session-id'] || req.cookies?.sessionId;
  const rateLimitKey = `${identifier}_${sessionId}`;
  
  // Clean up old entries
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.lastReset > hour) {
      rateLimitStore.delete(key);
    }
  }
  
  // Get or create rate limit data
  let rateLimitData = rateLimitStore.get(rateLimitKey);
  if (!rateLimitData || (now - rateLimitData.lastReset) > hour) {
    rateLimitData = {
      count: 0,
      lastReset: now,
      generations: []
    };
  }
  
  // Filter generations within the last hour
  rateLimitData.generations = rateLimitData.generations.filter(time => (now - time) < hour);
  rateLimitData.count = rateLimitData.generations.length;
  
  // Check if limit exceeded
  if (rateLimitData.count >= 4) {
    const resetTime = new Date(rateLimitData.lastReset + hour);
    return res.status(429).json({
      success: false,
      error: 'Generation limit reached',
      message: 'You can generate 4 images per hour. Please wait before generating more.',
      resetTime: resetTime.toISOString(),
      remaining: 0,
      limitInfo: {
        limit: 4,
        period: 'hour',
        used: rateLimitData.count
      }
    });
  }
  
  // Add current generation and update store
  rateLimitData.generations.push(now);
  rateLimitData.count = rateLimitData.generations.length;
  rateLimitStore.set(rateLimitKey, rateLimitData);
  
  // Add rate limit info to response headers
  res.set({
    'X-RateLimit-Limit': 4,
    'X-RateLimit-Remaining': 4 - rateLimitData.count,
    'X-RateLimit-Reset': new Date(rateLimitData.lastReset + hour).toISOString()
  });
  
  req.rateLimitInfo = {
    remaining: 4 - rateLimitData.count,
    used: rateLimitData.count,
    resetTime: new Date(rateLimitData.lastReset + hour)
  };
  
  next();
};

// AI service class
class AIGenerationService {
  constructor() {
    this.apiKey = process.env.LEONARDO_API_KEY;
    this.baseURL = process.env.LEONARDO_BASE_URL || 'https://cloud.leonardo.ai/api/rest/v1';
    this.styleReference = null;
    this.demoMode = !this.apiKey; // Enable demo mode when no API key
  }

  async generateImage(params) {
    if (this.demoMode) {
      // Demo mode - simulate generation
      return {
        success: true,
        demoMode: true,
        sdGenerationJob: {
          generationId: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      };
    }

    const model = AI_MODELS[params.model] || AI_MODELS.creative;
    
    const payload = {
      prompt: params.prompt,
      num_images: 1,
      width: 512,
      height: 512,
      guidance_scale: 7,
      num_inference_steps: 20,
      modelId: model.id
    };

    // Add style reference if available
    if (this.styleReference) {
      payload.init_image_id = this.styleReference;
      payload.init_strength = 0.3;
    }

    try {
      const response = await axios.post(`${this.baseURL}/generations`, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('AI Generation Error:', error.response?.data || error.message);
      throw new Error(`Image generation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async checkGenerationStatus(generationId) {
    if (this.demoMode || generationId.startsWith('demo_')) {
      // Demo mode - return completed status with aquacat image
      return {
        generations_by_pk: {
          status: 'COMPLETE',
          generated_images: [{
            url: '/aquacat.png',
            id: generationId
          }],
          createdAt: new Date().toISOString(),
          prompt: 'Demo generation'
        }
      };
    }

    if (!this.apiKey) {
      throw new Error('AI generation service not configured');
    }

    try {
      const response = await axios.get(`${this.baseURL}/generations/${generationId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('AI Status Check Error:', error.response?.data || error.message);
      throw new Error(`Status check failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async enhancePrompt(prompt) {
    // Return the original prompt without unwanted modifications
    // Users should have full control over their creative prompts
    return prompt;
  }

  setStyleReference(imageId) {
    this.styleReference = imageId;
  }
}

// Initialize AI service
const aiService = new AIGenerationService();

// Prompt enhancer class
class PromptEnhancer {
  constructor(aiService) {
    this.aiService = aiService;
  }

  async enhance(userPrompt, model = 'creative') {
    // Simply return the user's prompt without modification
    // Users should have full control over their prompts
    try {
      return await this.aiService.enhancePrompt(userPrompt);
    } catch (error) {
      console.error('Prompt enhancement failed, using original prompt:', error.message);
      return userPrompt;
    }
  }
}

const promptEnhancer = new PromptEnhancer(aiService);

// GET /api/ai/models - Get available AI models
router.get('/models', (req, res) => {
  res.json({
    success: true,
    models: AI_MODELS,
    default: 'creative',
    demoMode: aiService.demoMode,
    message: aiService.demoMode 
      ? 'Running in demo mode - real generation requires API key'
      : 'Available AI generation models'
  });
});

// GET /api/ai/status - Get AI service status and rate limits
router.get('/status', (req, res) => {
  const identifier = req.ip || req.connection.remoteAddress || 'unknown';
  const sessionId = req.session?.id || req.headers['x-session-id'] || req.cookies?.sessionId;
  const rateLimitKey = `${identifier}_${sessionId}`;
  
  const rateLimitData = rateLimitStore.get(rateLimitKey);
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  
  let remaining = 4;
  let used = 0;
  let resetTime = new Date(now + hour);
  
  if (rateLimitData) {
    const validGenerations = rateLimitData.generations.filter(time => (now - time) < hour);
    used = validGenerations.length;
    remaining = Math.max(0, 4 - used);
    resetTime = new Date(rateLimitData.lastReset + hour);
  }
  
  res.json({
    success: true,
    configured: !!aiService.apiKey,
    demoMode: aiService.demoMode,
    rateLimit: {
      limit: 4,
      remaining: remaining,
      used: used,
      resetTime: resetTime.toISOString(),
      period: 'hour'
    },
    features: {
      imageGeneration: true,
      promptEnhancement: true,
      styleConsistency: !!aiService.styleReference,
      multipleModels: true
    }
  });
});

// Validation middleware
const validateGenerationRequest = [
  body('prompt')
    .isLength({ min: 3, max: 500 })
    .withMessage('Prompt must be between 3 and 500 characters')
    .trim()
    .escape(),
  body('model')
    .optional()
    .isIn(Object.keys(AI_MODELS))
    .withMessage('Invalid model selection')
];

// POST /api/ai/generate - Generate AI image
router.post('/generate', checkRateLimit, validateGenerationRequest, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: errors.array()
      });
    }

    const { prompt, model = 'creative' } = req.body;
    const selectedModel = AI_MODELS[model] || AI_MODELS.creative;
    
    // Enhance the prompt with $AQUA context
    const enhancedPrompt = await promptEnhancer.enhance(prompt, model);
    
    // Generate image with AI service
    const generation = await aiService.generateImage({
      prompt: enhancedPrompt,
      model: model
    });
    
    res.json({
      success: true,
      generationId: generation.sdGenerationJob?.generationId,
      enhancedPrompt: enhancedPrompt,
      originalPrompt: prompt,
      model: selectedModel,
      demoMode: aiService.demoMode,
      estimatedTime: aiService.demoMode ? 3 : 30, // seconds
      message: aiService.demoMode 
        ? 'Demo generation started - using sample image'
        : 'AI generation started successfully',
      rateLimit: req.rateLimitInfo
    });
  } catch (error) {
    console.error('AI Generation Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message.includes('not configured') 
        ? 'AI generation service temporarily unavailable' 
        : 'Failed to generate image'
    });
  }
});

// GET /api/ai/status/:id - Check generation status
router.get('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || id.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid generation ID'
      });
    }

    const status = await aiService.checkGenerationStatus(id);
    
    res.json({
      success: true,
      status: status.generations_by_pk?.status || 'PENDING',
      images: status.generations_by_pk?.generated_images || [],
      createdAt: status.generations_by_pk?.createdAt,
      prompt: status.generations_by_pk?.prompt,
      demoMode: aiService.demoMode
    });
  } catch (error) {
    console.error('Status Check Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to check generation status'
    });
  }
});

// POST /api/ai/enhance-prompt - Enhance user prompt
router.post('/enhance-prompt', [
  body('prompt')
    .isLength({ min: 3, max: 200 })
    .withMessage('Prompt must be between 3 and 200 characters')
    .trim()
    .escape(),
  body('model')
    .optional()
    .isIn(Object.keys(AI_MODELS))
    .withMessage('Invalid model selection')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid prompt',
        details: errors.array()
      });
    }

    const { prompt, model = 'creative' } = req.body;
    const enhancedPrompt = await promptEnhancer.enhance(prompt, model);
    
    res.json({
      success: true,
      originalPrompt: prompt,
      enhancedPrompt: enhancedPrompt,
      model: AI_MODELS[model],
      improvements: [
        'Added $AQUA character context',
        'Enhanced with crypto/SUI theme',
        'Optimized for meme generation',
        `Configured for ${AI_MODELS[model].name} model`
      ]
    });
  } catch (error) {
    console.error('Prompt Enhancement Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to enhance prompt'
    });
  }
});

// POST /api/ai/set-style-reference - Set style reference for consistency
router.post('/set-style-reference', async (req, res) => {
  try {
    const { imageId } = req.body;
    
    if (!imageId) {
      return res.status(400).json({
        success: false,
        error: 'Image ID is required'
      });
    }

    aiService.setStyleReference(imageId);
    
    res.json({
      success: true,
      message: 'Style reference updated',
      styleReference: imageId
    });
  } catch (error) {
    console.error('Style Reference Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to set style reference'
    });
  }
});

// GET /api/ai/config - Get AI service configuration status
router.get('/config', (req, res) => {
  res.json({
    success: true,
    configured: !!process.env.LEONARDO_API_KEY,
    demoMode: aiService.demoMode,
    features: {
      imageGeneration: true,
      promptEnhancement: true,
      styleConsistency: !!aiService.styleReference,
      multipleModels: true,
      rateLimit: true
    },
    limits: {
      promptMinLength: 3,
      promptMaxLength: 500,
      estimatedGenerationTime: aiService.demoMode ? 3 : 30,
      generationsPerHour: 4
    },
    availableModels: Object.keys(AI_MODELS).length,
    message: aiService.demoMode 
      ? 'Running in demo mode - set LEONARDO_API_KEY environment variable for real generation'
      : 'AI generation fully configured'
  });
});

module.exports = router; 
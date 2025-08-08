const axios = require('axios');

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
    example: "Pencil sketch of sad wet cat under stormy clouds",
    speed: "Fast"
  }
};

// Rate limiting middleware function
const checkRateLimit = (req, res, next) => {
  const rateLimitKey = req.ip || 'unknown';
  const now = Date.now();
  const hour = 60 * 60 * 1000; // 1 hour in milliseconds
  
  let rateLimitData = rateLimitStore.get(rateLimitKey) || {
    count: 0,
    generations: [],
    lastReset: now
  };
  
  // Reset if it's been more than an hour
  if (now - rateLimitData.lastReset > hour) {
    rateLimitData = {
      count: 0,
      generations: [],
      lastReset: now
    };
  } else {
    // Filter out generations older than 1 hour
    rateLimitData.generations = rateLimitData.generations.filter(timestamp => {
      return now - timestamp < hour;
    });
  }
  
  // Check if user has exceeded rate limit
  if (rateLimitData.generations.length >= 4) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: 'You can only generate 4 images per hour. Please try again later.',
      rateLimitInfo: {
        limit: 4,
        used: rateLimitData.generations.length,
        remaining: 0,
        resetTime: new Date(rateLimitData.lastReset + hour)
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
      modelId: model.id,
      guidance_scale: 7,
      num_inference_steps: 10,
      scheduler: "EULER_DISCRETE",
      presetStyle: "DYNAMIC",
      public: false,
      promptMagic: true,
      promptMagicVersion: "v3",
      promptMagicStrength: 0.5
    };

    if (this.styleReference) {
      payload.controlnets = [{
        initImageId: this.styleReference,
        initImageType: "UPLOADED",
        preprocessorId: 67,
        strengthType: "Mid"
      }];
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
      throw new Error(`Generation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async checkGenerationStatus(generationId) {
    if (this.demoMode) {
      // Demo mode - simulate completed generation
      return {
        generations_by_pk: {
          id: generationId,
          status: "COMPLETE",
          generated_images: [{
            id: `demo_img_${Date.now()}`,
            url: "/images/demo-generated-image.jpg",
            nsfw: false
          }]
        }
      };
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

// Controller functions
const aiController = {
  // GET /api/ai/models - Get available AI models
  getModels: (req, res) => {
    res.json({
      success: true,
      models: AI_MODELS,
      demoMode: aiService.demoMode,
      message: aiService.demoMode ? 
        'Running in demo mode. Configure LEONARDO_API_KEY for full functionality.' : 
        'AI models loaded successfully'
    });
  },

  // GET /api/ai/status - Get AI service status
  getStatus: (req, res) => {
    const status = {
      success: true,
      service: 'Leonardo AI',
      status: aiService.demoMode ? 'Demo Mode' : 'Connected',
      demoMode: aiService.demoMode,
      models: Object.keys(AI_MODELS).length,
      rateLimit: {
        enabled: true,
        limit: 4,
        window: '1 hour'
      }
    };

    if (aiService.demoMode) {
      status.message = 'AI service is running in demo mode. Generated images will be placeholders.';
      status.note = 'Configure LEONARDO_API_KEY environment variable for full functionality.';
    } else {
      status.message = 'AI service is fully operational and ready to generate images.';
    }

    res.json(status);
  },

  // POST /api/ai/generate - Generate AI image
  generateImage: async (req, res) => {
    try {
      const { prompt, model = 'creative' } = req.body;

      if (!AI_MODELS[model]) {
        return res.status(400).json({
          success: false,
          error: 'Invalid model',
          message: `Model '${model}' not found. Available models: ${Object.keys(AI_MODELS).join(', ')}`
        });
      }

      const result = await aiService.generateImage({ prompt, model });

      if (result.demoMode) {
        return res.json({
          success: true,
          demoMode: true,
          generationId: result.sdGenerationJob.generationId,
          message: 'Demo generation started. In demo mode, this will return a placeholder image.',
          rateLimitInfo: req.rateLimitInfo,
          estimatedTime: '5-10 seconds (demo)',
          model: AI_MODELS[model]
        });
      }

      res.json({
        success: true,
        generationId: result.sdGenerationJob.generationId,
        message: 'Image generation started successfully',
        rateLimitInfo: req.rateLimitInfo,
        estimatedTime: '30-60 seconds',
        model: AI_MODELS[model]
      });
    } catch (error) {
      console.error('Generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Generation failed',
        message: error.message || 'An unexpected error occurred during image generation'
      });
    }
  },

  // GET /api/ai/status/:id - Check generation status
  checkStatus: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Missing generation ID'
        });
      }

      const result = await aiService.checkGenerationStatus(id);

      res.json({
        success: true,
        generation: result.generations_by_pk || result,
        demoMode: aiService.demoMode
      });
    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({
        success: false,
        error: 'Status check failed',
        message: error.message || 'Failed to check generation status'
      });
    }
  },

  // POST /api/ai/enhance-prompt - Enhance user prompt
  enhancePrompt: async (req, res) => {
    try {
      const { prompt, model = 'creative' } = req.body;

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid prompt',
          message: 'Prompt is required and must be a non-empty string'
        });
      }

      if (prompt.length > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Prompt too long',
          message: 'Prompt must be less than 1000 characters'
        });
      }

      const enhancedPrompt = await promptEnhancer.enhance(prompt.trim(), model);

      res.json({
        success: true,
        originalPrompt: prompt.trim(),
        enhancedPrompt,
        model: AI_MODELS[model] || AI_MODELS.creative,
        message: 'Prompt processed successfully'
      });
    } catch (error) {
      console.error('Prompt enhancement error:', error);
      res.status(500).json({
        success: false,
        error: 'Enhancement failed',
        message: error.message || 'Failed to enhance prompt'
      });
    }
  },

  // POST /api/ai/set-style-reference - Set style reference for generation
  setStyleReference: async (req, res) => {
    try {
      const { imageId } = req.body;

      if (!imageId) {
        return res.status(400).json({
          success: false,
          error: 'Missing image ID',
          message: 'imageId is required to set style reference'
        });
      }

      aiService.setStyleReference(imageId);

      res.json({
        success: true,
        message: 'Style reference set successfully',
        styleReference: imageId,
        note: 'This style will be applied to subsequent generations'
      });
    } catch (error) {
      console.error('Style reference error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to set style reference',
        message: error.message || 'An unexpected error occurred'
      });
    }
  },

  // GET /api/ai/config - Get AI configuration
  getConfig: (req, res) => {
    res.json({
      success: true,
      config: {
        demoMode: aiService.demoMode,
        modelsAvailable: Object.keys(AI_MODELS).length,
        rateLimit: {
          enabled: true,
          maxGenerations: 4,
          timeWindow: '1 hour'
        },
        features: {
          promptEnhancement: true,
          styleReference: true,
          multipleModels: true
        }
      },
      models: AI_MODELS
    });
  }
};

module.exports = {
  aiController,
  checkRateLimit,
  AI_MODELS
}; 
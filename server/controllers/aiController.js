const axios = require('axios');

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map();

// Available Models Configuration
const AVAILABLE_MODELS = {
  aqua_lora: {
    id: process.env.AQUA_MODEL_ID || "b2614463-296c-462a-9586-aafdb8f00e36", // Base model ID
    name: "$AQUA LoRA Trained Model",
    description: "Custom LoRA trained model specifically designed for AQUA meme generation featuring the iconic soggy cat",
    example: "A wet blue cat mascot sitting in the rain, crypto themed, digital art",
    type: "lora",
    trained: true,
    supportsPromptMagic: false, // Flux-based models don't support Prompt Magic
    userElements: [
      {
        userLoraId: 119467,
        weight: 1
      }
    ]
  },
  flux_dev: {
    id: process.env.FLUX_MODEL_ID || "b2614463-296c-462a-9586-aafdb8f00e36", // Flux Dev model ID
    name: "Flux Dev",
    description: "High-quality Flux Dev model for general image generation with excellent detail and realism",
    example: "A detailed digital artwork of a cat, high quality, professional",
    type: "base",
    trained: false,
    supportsPromptMagic: false, // Flux-based models don't support Prompt Magic
    userElements: [] // No LoRA for base model
  },
  dreamshaper_v7: {
    id: "1e60896f-3c26-4296-8ecc-53e2afecc132", // DreamShaper v7 model ID (corrected)
    name: "DreamShaper v7",
    description: "Popular Stable Diffusion 1.5 based model known for versatile, high-quality generations with excellent prompt adherence",
    example: "A serene landscape featuring a crystal-clear lake surrounded by autumn trees, mountains in background",
    type: "finetuned",
    trained: false,
    supportsPromptMagic: true, // SD 1.5 based models support Prompt Magic
    userElements: [] // No LoRA for this model
  },
  leonardo_creative: {
    id: "b24e16ff-06e3-43eb-8d33-4416c2d75876", // Leonardo Creative model ID (estimated)
    name: "Leonardo Creative",
    description: "Leonardo's creative model optimized for artistic and imaginative content with vibrant colors and dynamic compositions",
    example: "A futuristic cityscape with towering skyscrapers, flying cars, and neon lights illuminating the night sky",
    type: "platform",
    trained: false,
    supportsPromptMagic: true, // Leonardo platform models support Prompt Magic
    userElements: [] // No LoRA for this model
  }
};

// Default model (for backward compatibility)
const AQUA_MODEL = AVAILABLE_MODELS.aqua_lora;

// Rate limiting middleware function
const checkRateLimit = (req, res, next) => {
  // Check environment variable to disable rate limiting only when explicitly set
  if (process.env.DISABLE_RATE_LIMIT === 'true') {
    console.log(`🔓 Rate limiting disabled via DISABLE_RATE_LIMIT environment variable`);
    return next();
  }
  
  // Get IP from various possible headers (Railway might use proxies)
  const possibleIPs = [
    req.ip,
    req.connection.remoteAddress,
    req.socket.remoteAddress,
    req.headers['x-forwarded-for']?.split(',')[0]?.trim(),
    req.headers['x-real-ip'],
    req.headers['x-client-ip']
  ].filter(Boolean);
  
  const rateLimitKey = possibleIPs[0] || 'unknown';
  const now = Date.now();
  const hour = 60 * 60 * 1000; // 1 hour in milliseconds
  
  // Debug: Log all detected IPs
  console.log(`🔍 Rate limit check - Detected IPs: ${JSON.stringify(possibleIPs)}, Using: ${rateLimitKey}`);
  
  // Exception for specific IP addresses (bypass rate limiting)
  const exemptIPs = ['125.253.17.216', '127.0.0.1', 'localhost'];
  
  // Check if any of the possible IPs match exempt list
  const isExempt = possibleIPs.some(ip => exemptIPs.includes(ip));
  
  if (isExempt) {
    console.log(`🔓 Rate limit bypassed for exempt IP in list: ${possibleIPs.join(', ')}`);
    return next();
  }
  
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
  if (rateLimitData.generations.length >= 20) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: 'You can only generate 20 images per hour. Please try again later.',
      rateLimitInfo: {
        limit: 20,
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
      console.log('🎭 DEMO MODE - Simulating generation with params:', JSON.stringify(params, null, 2));
      return {
        success: true,
        demoMode: true,
        sdGenerationJob: {
          generationId: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      };
    }

    // Get the selected model or default to AQUA LoRA
    const selectedModel = AVAILABLE_MODELS[params.modelId] || AVAILABLE_MODELS.aqua_lora;
    
    // Use the user's exact prompt without any modifications
    const payload = {
      prompt: params.prompt, // User's exact input only
      num_images: 1,
      width: 512,
      height: 512,
      modelId: selectedModel.id,
      guidance_scale: 7,
      num_inference_steps: 15,
      scheduler: "DPM_SOLVER",
      public: false,
      userElements: selectedModel.userElements
    };

    // Only add Prompt Magic if the model supports it AND it's requested
    if (params.enhancePrompt === true && selectedModel.supportsPromptMagic === true) {
      payload.promptMagic = true;
      payload.promptMagicVersion = "v3";
      payload.promptMagicStrength = 0.5;
      payload.alchemy = true; // Required for Prompt Magic
    }

    // Log the payload for debugging
    console.log('🚀 API PAYLOAD being sent to Leonardo AI:');
    console.log('📦 Model:', selectedModel.name);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

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
  // GET /api/ai/models - Get all available models
  getModels: (req, res) => {
    res.json({
      success: true,
      models: AVAILABLE_MODELS,
      defaultModel: 'aqua_lora',
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

  // POST /api/ai/generate - Generate AI image using selected model
  generateImage: async (req, res) => {
    try {
      const { prompt, modelId = 'aqua_lora', enhancePrompt = false } = req.body;
      
      // Log the incoming request for debugging
      console.log('🎯 GENERATE REQUEST received:');
      console.log('📝 Request body:', JSON.stringify(req.body, null, 2));

      if (!prompt || prompt.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Prompt is required',
          message: 'Please provide a prompt for image generation'
        });
      }

      // Validate model selection
      if (modelId && !AVAILABLE_MODELS[modelId]) {
        return res.status(400).json({
          success: false,
          error: 'Invalid model',
          message: `Model '${modelId}' not found. Available models: ${Object.keys(AVAILABLE_MODELS).join(', ')}`
        });
      }

      // Credit checking and rate limiting is handled by checkGenerationLimit middleware
      // For authenticated users, credits are already deducted
      // For anonymous users, daily limits are already checked

      const result = await aiService.generateImage({ prompt, modelId, enhancePrompt });

      if (result.demoMode) {
        return res.json({
          success: true,
          demoMode: true,
          generationId: result.sdGenerationJob.generationId,
          message: 'Demo generation started. In demo mode, this will return a placeholder image.',
          rateLimitInfo: req.rateLimitInfo,
          estimatedTime: '5-10 seconds (demo)',
          model: AVAILABLE_MODELS[modelId]
        });
      }

      res.json({
        success: true,
        generationId: result.sdGenerationJob.generationId,
        message: `Image generation started successfully using ${AVAILABLE_MODELS[modelId].name}`,
        rateLimitInfo: req.rateLimitInfo,
        estimatedTime: '30-60 seconds',
        model: AVAILABLE_MODELS[modelId]
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
  AQUA_MODEL
}; 
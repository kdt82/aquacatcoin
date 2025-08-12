const mongoose = require('mongoose');

// Text element subdocument schema
const textElementSchema = new mongoose.Schema({
  text: { 
    type: String, 
    required: true 
  },
  x: { 
    type: Number, 
    required: true 
  },
  y: { 
    type: Number, 
    required: true 
  },
  fontSize: { 
    type: Number, 
    default: 24 
  },
  fontFamily: { 
    type: String, 
    default: 'Impact' 
  },
  color: { 
    type: String, 
    default: '#FFFFFF' 
  },
  strokeColor: { 
    type: String, 
    default: '#000000' 
  },
  strokeWidth: { 
    type: Number, 
    default: 2 
  }
}, { _id: false });

// Simplified meme schema - no complex version control
const memeSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  
  // Image URLs
  originalImageUrl: { 
    type: String, 
    required: true 
  }, // Clean original image for remix
  finalMemeUrl: { 
    type: String, 
    required: true 
  }, // Final meme with text overlays
  thumbnail: { 
    type: String, 
    required: true 
  },
  
  // Generation info
  generationType: { 
    type: String, 
    enum: ['ai', 'upload', 'remix'], 
    required: true 
  },
  aiPrompt: { 
    type: String, 
    default: null 
  },
  enhancedPrompt: { 
    type: String, 
    default: null 
  },
  leonardoGenerationId: { 
    type: String, 
    default: null 
  },
  
  // Simple remix tracking
  sourceImageId: { 
    type: String, 
    default: null, 
    index: true 
  }, // If remixed, what original was used
  isRemixable: { 
    type: Boolean, 
    default: true, 
    index: true 
  }, // Can others use this original?
  timesRemixed: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  
  // Content
  textElements: [textElementSchema],
  tags: [{ 
    type: String, 
    lowercase: true,
    trim: true 
  }],
  category: { 
    type: String, 
    enum: ['funny', 'crypto', 'weather', 'classic', 'ai-generated'], 
    default: 'funny', 
    index: true 
  },
  
  // Metadata
  createdAt: { 
    type: Date, 
    default: Date.now, 
    index: true 
  },
  userIP: { 
    type: String, 
    required: true 
  },
  isApproved: { 
    type: Boolean, 
    default: false, 
    index: true 
  },
  
  // Engagement metrics
  shareCount: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  likes: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  views: { 
    type: Number, 
    default: 0,
    min: 0 
  }
}, {
  timestamps: true
});

// Indexes for performance
memeSchema.index({ isApproved: 1, createdAt: -1 });
memeSchema.index({ isRemixable: 1, isApproved: 1 });
memeSchema.index({ category: 1, isApproved: 1, createdAt: -1 });
// sourceImageId index is already defined in schema field (index: true)
memeSchema.index({ likes: -1, createdAt: -1 });
memeSchema.index({ views: -1, createdAt: -1 });
memeSchema.index({ shareCount: -1, createdAt: -1 });
memeSchema.index({ timesRemixed: -1, createdAt: -1 });

// Instance methods
memeSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.userIP; // Don't expose user IP addresses
  return obj;
};

memeSchema.methods.incrementLike = function() {
  this.likes += 1;
  return this.save();
};

memeSchema.methods.incrementView = function() {
  this.views += 1;
  return this.save();
};

memeSchema.methods.incrementShare = function() {
  this.shareCount += 1;
  return this.save();
};

memeSchema.methods.incrementRemix = function() {
  this.timesRemixed += 1;
  return this.save();
};

// Static methods for gallery
memeSchema.statics.findApproved = function(options = {}) {
  const { 
    category = null, 
    sortBy = 'newest', 
    page = 1, 
    limit = 12 
  } = options;
  
  let query = { isApproved: true };
  
  if (category && category !== 'all') {
    query.category = category;
  }
  
  let sort = {};
  switch (sortBy) {
    case 'popular':
      sort = { likes: -1, createdAt: -1 };
      break;
    case 'trending':
      sort = { shareCount: -1, createdAt: -1 };
      break;
    case 'most-viewed':
      sort = { views: -1, createdAt: -1 };
      break;
    case 'most-remixed':
      sort = { timesRemixed: -1, createdAt: -1 };
      break;
    case 'newest':
    default:
      sort = { createdAt: -1 };
  }
  
  const skip = (page - 1) * limit;
  
  return this.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .select('-userIP');
};

// Find images that can be remixed (originals only)
memeSchema.statics.findRemixableImages = function(options = {}) {
  const { 
    page = 1, 
    limit = 12, 
    sortBy = 'popular' 
  } = options;
  
  let query = { 
    isApproved: true,
    isRemixable: true,
    $or: [
      { generationType: 'ai' },     // AI generated images
      { generationType: 'upload' }  // User uploaded images
    ]
  };
  
  let sort = {};
  switch (sortBy) {
    case 'popular':
      sort = { likes: -1, timesRemixed: -1 };
      break;
    case 'newest':
      sort = { createdAt: -1 };
      break;
    case 'most-remixed':
      sort = { timesRemixed: -1, likes: -1 };
      break;
    default:
      sort = { likes: -1, createdAt: -1 };
  }
  
  const skip = (page - 1) * limit;
  
  return this.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .select('-userIP');
};

memeSchema.statics.searchMemes = function(searchQuery, options = {}) {
  const { 
    category = null,
    page = 1, 
    limit = 12 
  } = options;
  
  let query = { 
    isApproved: true,
    $or: [
      { tags: { $regex: searchQuery, $options: 'i' } },
      { aiPrompt: { $regex: searchQuery, $options: 'i' } },
      { enhancedPrompt: { $regex: searchQuery, $options: 'i' } }
    ]
  };
  
  if (category && category !== 'all') {
    query.category = category;
  }
  
  const skip = (page - 1) * limit;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-userIP');
};

// Pre-save middleware
memeSchema.pre('save', function(next) {
  // Ensure tags are cleaned up
  if (this.tags) {
    this.tags = this.tags
      .filter(tag => tag && tag.trim().length > 0)
      .map(tag => tag.trim().toLowerCase())
      .slice(0, 10); // Limit to 10 tags max
  }
  next();
});

module.exports = mongoose.model('Meme', memeSchema); 
const mongoose = require('mongoose');

// Credit transaction tracking for transparency and auditing
const creditTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.type !== 'anonymous_limit';
    },
    index: true
  },
  
  // For anonymous users, track by IP
  userIP: {
    type: String,
    required: function() {
      return this.type === 'anonymous_limit';
    },
    index: true
  },
  
  type: {
    type: String,
    enum: [
      'first_login_bonus',    // +50 credits on first X login
      'daily_bonus',          // +20 credits daily
      'generation_cost',      // -5 credits for AI generation
      'remix_cost',           // -5 credits for remix
      'admin_adjustment',     // Manual admin credit adjustment
      'anonymous_limit'       // Track anonymous generation count
    ],
    required: true,
    index: true
  },
  
  amount: {
    type: Number,
    required: true
  },
  
  balanceAfter: {
    type: Number,
    required: function() {
      return this.type !== 'anonymous_limit';
    }
  },
  
  // Context information
  reason: {
    type: String,
    trim: true
  },
  
  relatedMemeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meme',
    default: null
  },
  
  // For anonymous tracking
  anonymousCount: {
    type: Number,
    default: null // Only used for anonymous_limit type
  },
  
  // Metadata
  ipAddress: {
    type: String,
    required: true
  },
  
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance
creditTransactionSchema.index({ userId: 1, createdAt: -1 });
creditTransactionSchema.index({ type: 1, createdAt: -1 });
creditTransactionSchema.index({ userIP: 1, createdAt: -1 });
creditTransactionSchema.index({ createdAt: -1 });

// Static methods
creditTransactionSchema.statics.recordTransaction = function(data) {
  return this.create({
    userId: data.userId || null,
    userIP: data.userIP,
    type: data.type,
    amount: data.amount,
    balanceAfter: data.balanceAfter,
    reason: data.reason || null,
    relatedMemeId: data.relatedMemeId || null,
    anonymousCount: data.anonymousCount || null,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent || null
  });
};

// Get daily anonymous generation count for IP (Oregon timezone)
creditTransactionSchema.statics.getAnonymousGenerationCount = function(ipAddress) {
  const TimezoneUtils = require('../utils/timezone');
  const startOfDay = TimezoneUtils.startOfDay().toJSDate();
  
  return this.countDocuments({
    type: 'anonymous_limit',
    userIP: ipAddress,
    createdAt: { $gte: startOfDay }
  });
};

// Get user's credit history
creditTransactionSchema.statics.getUserHistory = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('relatedMemeId', 'id finalMemeUrl');
};

module.exports = mongoose.model('CreditTransaction', creditTransactionSchema);

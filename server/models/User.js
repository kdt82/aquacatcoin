const mongoose = require('mongoose');

// Enhanced User schema with X (Twitter) OAuth and credit system
const userSchema = new mongoose.Schema({
  // Basic user info (keep existing for admin users)
  username: {
    type: String,
    required: function() {
      return !this.twitterId; // Required only if not Twitter user
    },
    unique: true,
    sparse: true, // Allow null values to be non-unique
    trim: true,
    minlength: 3,
    maxlength: 30,
    index: true
  },
  email: {
    type: String,
    required: function() {
      return !this.twitterId; // Required only if not Twitter user
    },
    unique: true,
    sparse: true, // Allow null values to be non-unique
    lowercase: true,
    trim: true,
    index: true
  },
  
  // X (Twitter) OAuth fields
  twitterId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  twitterUsername: {
    type: String,
    trim: true,
    index: true
  },
  displayName: {
    type: String,
    trim: true
  },
  profileImage: {
    type: String,
    default: null
  },
  
  // Credit system
  credits: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCreditsEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  lastDailyBonus: {
    type: Date,
    default: null
  },
  firstLogin: {
    type: Boolean,
    default: true
  },
  
  // Rate limiting for anonymous users (by IP)
  lastGenerationDate: {
    type: Date,
    default: null
  },
  dailyGenerationCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // User management
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    index: true
  },
  createdMemes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meme'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  
  // Competition tracking
  competitionEntries: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meme'
  }],
  totalWins: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });

// Instance methods
userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

userSchema.methods.addMeme = function(memeId) {
  if (!this.createdMemes.includes(memeId)) {
    this.createdMemes.push(memeId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Credit system methods
userSchema.methods.addCredits = function(amount, reason = 'manual') {
  this.credits += amount;
  this.totalCreditsEarned += amount;
  return this.save();
};

userSchema.methods.deductCredits = function(amount) {
  if (this.credits < amount) {
    throw new Error('Insufficient credits');
  }
  this.credits -= amount;
  return this.save();
};

userSchema.methods.hasCredits = function(amount) {
  return this.credits >= amount;
};

userSchema.methods.canClaimDailyBonus = function() {
  if (!this.lastDailyBonus) return true;
  
  const TimezoneUtils = require('../utils/timezone');
  return TimezoneUtils.canClaimDaily(this.lastDailyBonus, 24);
};

userSchema.methods.claimDailyBonus = function(amount = 30) {
  if (!this.canClaimDailyBonus()) {
    throw new Error('Daily bonus already claimed today');
  }
  
  const TimezoneUtils = require('../utils/timezone');
  this.credits += amount;
  this.totalCreditsEarned += amount;
  this.lastDailyBonus = TimezoneUtils.now().toJSDate();
  
  return this.save();
};

userSchema.methods.claimFirstLoginBonus = function(amount = 50) {
  if (!this.firstLogin) {
    throw new Error('First login bonus already claimed');
  }
  
  this.credits += amount;
  this.totalCreditsEarned += amount;
  this.firstLogin = false;
  
  return this.save();
};

// Authentication methods
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

userSchema.methods.getDisplayName = function() {
  return this.displayName || this.twitterUsername || this.username || 'Anonymous';
};

// Static methods
userSchema.statics.findAdmins = function() {
  return this.find({ role: 'admin', isActive: true });
};

userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: username.toLowerCase(), isActive: true });
};

userSchema.statics.findByTwitterId = function(twitterId) {
  return this.findOne({ twitterId: twitterId, isActive: true });
};

userSchema.statics.createFromTwitter = function(twitterData) {
  return this.create({
    twitterId: twitterData.id,
    twitterUsername: twitterData.username,
    displayName: twitterData.name,
    profileImage: twitterData.profile_image_url || null,
    credits: 50, // First login bonus
    totalCreditsEarned: 50,
    firstLogin: false, // Already claimed during creation
    lastLogin: new Date()
  });
};

module.exports = mongoose.model('User', userSchema); 
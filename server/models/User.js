const mongoose = require('mongoose');

// User schema for future admin features
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
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

// Static methods
userSchema.statics.findAdmins = function() {
  return this.find({ role: 'admin', isActive: true });
};

userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: username.toLowerCase(), isActive: true });
};

module.exports = mongoose.model('User', userSchema); 
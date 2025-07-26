const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: function() {
      return !this.oauthProvider;
    },
    minlength: [6, 'Password must be at least 6 characters long']
  },
  avatar: {
    type: String,
    default: function() {
      return `https://ui-avatars.com/api/?name=${this.username}&background=random&color=fff&size=200`;
    }
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'away', 'busy'],
    default: 'offline'
  },
  customStatus: {
    type: String,
    maxlength: [100, 'Custom status cannot exceed 100 characters'],
    default: ''
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  joinedChannels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel'
  }],
  // OAuth fields
  oauthProvider: {
    type: String,
    enum: ['google', 'discord'],
    default: null
  },
  oauthId: {
    type: String,
    default: null
  },
  // Profile customization
  theme: {
    type: String,
    enum: ['dark', 'light', 'auto'],
    default: 'dark'
  },
  notifications: {
    mentions: { type: Boolean, default: true },
    directMessages: { type: Boolean, default: true },
    channelMessages: { type: Boolean, default: false }
  },
  // Gaming preferences
  favoriteGames: [{
    type: String,
    trim: true
  }],
  gamerTags: {
    steam: { type: String, trim: true },
    discord: { type: String, trim: true },
    battlenet: { type: String, trim: true },
    epic: { type: String, trim: true }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// Index for better performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ isOnline: 1 });

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update last seen
userSchema.methods.updateLastSeen = function() {
  this.lastSeen = new Date();
  return this.save();
};

// Set online status
userSchema.methods.setOnlineStatus = function(isOnline) {
  this.isOnline = isOnline;
  this.status = isOnline ? 'online' : 'offline';
  if (!isOnline) {
    this.lastSeen = new Date();
  }
  return this.save();
};

module.exports = mongoose.model('User', userSchema);

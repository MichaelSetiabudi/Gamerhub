const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Channel name is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Channel name must be at least 3 characters long'],
    maxlength: [50, 'Channel name cannot exceed 50 characters'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Channel name can only contain letters, numbers, underscores, and hyphens']
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true,
    maxlength: [100, 'Display name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  type: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  category: {
    type: String,
    enum: ['general', 'gaming', 'valorant', 'genshin-impact', 'minecraft', 'league-of-legends', 'dota2', 'csgo', 'fortnite', 'apex-legends', 'other'],
    default: 'general'
  },
  game: {
    type: String,
    trim: true,
    default: ''
  },
  icon: {
    type: String,
    default: '🎮'
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Private channel settings
  inviteCode: {
    type: String,
    unique: true,
    sparse: true // Only unique if not null
  },
  isInviteOnly: {
    type: Boolean,
    default: false
  },
  // Channel settings
  slowMode: {
    type: Number, // seconds
    default: 0,
    min: 0,
    max: 21600 // 6 hours max
  },
  isNSFW: {
    type: Boolean,
    default: false
  },
  messageHistory: {
    type: Boolean,
    default: true
  },
  // Statistics
  messageCount: {
    type: Number,
    default: 0
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  // Pinned messages
  pinnedMessages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }]
}, {
  timestamps: true
});

// Indexes for better performance
channelSchema.index({ name: 1 });
channelSchema.index({ type: 1 });
channelSchema.index({ category: 1 });
channelSchema.index({ 'members.user': 1 });
channelSchema.index({ lastActivity: -1 });

// Virtual for member count
channelSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Virtual for online member count
channelSchema.virtual('onlineMemberCount').get(function() {
  return this.members.filter(member => member.user && member.user.isOnline).length;
});

// Generate invite code for private channels
channelSchema.methods.generateInviteCode = function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  this.inviteCode = result;
  return result;
};

// Add member to channel
channelSchema.methods.addMember = function(userId, role = 'member') {
  const existingMember = this.members.find(m => m.user.toString() === userId.toString());
  if (existingMember) {
    return false; // Already a member
  }
  
  this.members.push({
    user: userId,
    role: role,
    joinedAt: new Date()
  });
  
  return this.save();
};

// Remove member from channel
channelSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(m => m.user.toString() !== userId.toString());
  return this.save();
};

// Check if user is member
channelSchema.methods.isMember = function(userId) {
  return this.members.some(m => m.user.toString() === userId.toString());
};

// Get member role
channelSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

// Update activity
channelSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

// Increment message count
channelSchema.methods.incrementMessageCount = function() {
  this.messageCount += 1;
  this.lastActivity = new Date();
  return this.save();
};

module.exports = mongoose.model('Channel', channelSchema);

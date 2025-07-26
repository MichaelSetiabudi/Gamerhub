const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  // Message formatting and features
  mentions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String
  }],
  attachments: [{
    filename: String,
    url: String,
    size: Number,
    mimetype: String
  }],
  embeds: [{
    title: String,
    description: String,
    url: String,
    color: String,
    thumbnail: String,
    image: String,
    fields: [{
      name: String,
      value: String,
      inline: { type: Boolean, default: false }
    }]
  }],
  // Message status
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Message interactions
  reactions: [{
    emoji: String,
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    count: { type: Number, default: 0 }
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  pinnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  pinnedAt: {
    type: Date
  },
  // Reply/Thread features
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  thread: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }],
  // System message data (for join/leave notifications, etc.)
  systemData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better performance
messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ author: 1 });
messageSchema.index({ mentions: 1 });
messageSchema.index({ isDeleted: 1 });
messageSchema.index({ isPinned: 1 });

// Pre-save middleware to process mentions
messageSchema.pre('save', function(next) {
  if (this.isModified('content') && this.type === 'text') {
    // Extract mentions from content (@username)
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(this.content)) !== null) {
      const username = match[1];
      mentions.push({ username });
    }
    
    this.mentions = mentions;
  }
  next();
});

// Method to add reaction
messageSchema.methods.addReaction = function(emoji, userId) {
  let reaction = this.reactions.find(r => r.emoji === emoji);
  
  if (!reaction) {
    reaction = { emoji, users: [], count: 0 };
    this.reactions.push(reaction);
  }
  
  if (!reaction.users.includes(userId)) {
    reaction.users.push(userId);
    reaction.count += 1;
  }
  
  return this.save();
};

// Method to remove reaction
messageSchema.methods.removeReaction = function(emoji, userId) {
  const reaction = this.reactions.find(r => r.emoji === emoji);
  
  if (reaction) {
    reaction.users = reaction.users.filter(id => id.toString() !== userId.toString());
    reaction.count = reaction.users.length;
    
    if (reaction.count === 0) {
      this.reactions = this.reactions.filter(r => r.emoji !== emoji);
    }
  }
  
  return this.save();
};

// Method to edit message
messageSchema.methods.editContent = function(newContent) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

// Method to soft delete message
messageSchema.methods.softDelete = function(deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

// Method to pin/unpin message
messageSchema.methods.togglePin = function(pinnedBy) {
  this.isPinned = !this.isPinned;
  if (this.isPinned) {
    this.pinnedBy = pinnedBy;
    this.pinnedAt = new Date();
  } else {
    this.pinnedBy = undefined;
    this.pinnedAt = undefined;
  }
  return this.save();
};

// Static method to get recent messages for a channel
messageSchema.statics.getRecentMessages = function(channelId, limit = 50, before = null) {
  const query = { 
    channel: channelId, 
    isDeleted: false 
  };
  
  if (before) {
    query.createdAt = { $lt: before };
  }
  
  return this.find(query)
    .populate('author', 'username avatar status')
    .populate('mentions.user', 'username')
    .populate('replyTo', 'content author')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to search messages
messageSchema.statics.searchMessages = function(channelId, searchTerm, limit = 20) {
  return this.find({
    channel: channelId,
    isDeleted: false,
    content: { $regex: searchTerm, $options: 'i' }
  })
    .populate('author', 'username avatar')
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Message', messageSchema);

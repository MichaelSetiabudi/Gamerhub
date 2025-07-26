const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DirectMessage'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  // Message read status for each participant
  readStatus: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastRead: {
      type: Date,
      default: Date.now
    },
    unreadCount: {
      type: Number,
      default: 0
    }
  }],
  // DM settings
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isMuted: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    mutedUntil: {
      type: Date
    }
  }]
}, {
  timestamps: true
});

// Individual DM messages
const dmMessageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DirectMessageConversation',
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  // Message features
  attachments: [{
    filename: String,
    url: String,
    size: Number,
    mimetype: String
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
  // Read receipts
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Reply feature
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DirectMessage'
  }
}, {
  timestamps: true
});

// Indexes
directMessageSchema.index({ participants: 1 });
directMessageSchema.index({ lastActivity: -1 });
dmMessageSchema.index({ conversation: 1, createdAt: -1 });
dmMessageSchema.index({ sender: 1 });

// Virtual for unread count
directMessageSchema.virtual('unreadCount').get(function() {
  return this.readStatus.reduce((total, status) => total + status.unreadCount, 0);
});

// Method to find or create conversation between two users
directMessageSchema.statics.findOrCreateConversation = async function(user1Id, user2Id) {
  // Check if conversation already exists
  let conversation = await this.findOne({
    participants: { $all: [user1Id, user2Id], $size: 2 }
  }).populate('participants', 'username avatar status isOnline');
  
  if (!conversation) {
    // Create new conversation
    conversation = new this({
      participants: [user1Id, user2Id],
      readStatus: [
        { user: user1Id, unreadCount: 0 },
        { user: user2Id, unreadCount: 0 }
      ]
    });
    await conversation.save();
    await conversation.populate('participants', 'username avatar status isOnline');
  }
  
  return conversation;
};

// Method to mark messages as read
directMessageSchema.methods.markAsRead = function(userId) {
  const userReadStatus = this.readStatus.find(status => 
    status.user.toString() === userId.toString()
  );
  
  if (userReadStatus) {
    userReadStatus.lastRead = new Date();
    userReadStatus.unreadCount = 0;
  }
  
  return this.save();
};

// Method to increment unread count
directMessageSchema.methods.incrementUnread = function(userId) {
  const userReadStatus = this.readStatus.find(status => 
    status.user.toString() === userId.toString()
  );
  
  if (userReadStatus) {
    userReadStatus.unreadCount += 1;
  }
  
  this.lastActivity = new Date();
  return this.save();
};

// Method to check if user is participant
directMessageSchema.methods.isParticipant = function(userId) {
  return this.participants.some(participant => 
    participant._id.toString() === userId.toString()
  );
};

// Method to get other participant
directMessageSchema.methods.getOtherParticipant = function(userId) {
  return this.participants.find(participant => 
    participant._id.toString() !== userId.toString()
  );
};

// DM Message methods
dmMessageSchema.methods.editContent = function(newContent) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

dmMessageSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

dmMessageSchema.methods.markAsRead = function(userId) {
  if (!this.readBy.find(read => read.user.toString() === userId.toString())) {
    this.readBy.push({ user: userId, readAt: new Date() });
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to get recent DM messages
dmMessageSchema.statics.getRecentMessages = function(conversationId, limit = 50, before = null) {
  const query = { 
    conversation: conversationId, 
    isDeleted: false 
  };
  
  if (before) {
    query.createdAt = { $lt: before };
  }
  
  return this.find(query)
    .populate('sender', 'username avatar status')
    .populate('replyTo', 'content sender')
    .sort({ createdAt: -1 })
    .limit(limit);
};

const DirectMessageConversation = mongoose.model('DirectMessageConversation', directMessageSchema);
const DirectMessage = mongoose.model('DirectMessage', dmMessageSchema);

module.exports = {
  DirectMessageConversation,
  DirectMessage
};

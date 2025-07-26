const express = require('express');
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { validateSendMessage, validateEditMessage, validatePagination } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/messages/:channelId
// @desc    Get messages for a channel
// @access  Private
router.get('/:channelId', authMiddleware, validatePagination, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { page, limit, before } = req.query;

    // Verify channel exists and user has access
    const channel = await Channel.findById(channelId);
    
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    // Check if user has access to private channels
    if (channel.type === 'private' && !channel.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this private channel'
      });
    }

    const skip = (page - 1) * limit;
    let query = { 
      channel: channelId, 
      isDeleted: false 
    };

    // If before timestamp is provided, get messages before that time
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('author', 'username avatar status')
      .populate('mentions.user', 'username')
      .populate('replyTo', 'content author createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalMessages = await Message.countDocuments({
      channel: channelId,
      isDeleted: false
    });

    const totalPages = Math.ceil(totalMessages / limit);

    // Reverse messages to show oldest first
    const orderedMessages = messages.reverse();

    res.json({
      success: true,
      data: {
        messages: orderedMessages,
        pagination: {
          currentPage: page,
          totalPages,
          totalMessages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/messages/:channelId
// @desc    Send a message to a channel
// @access  Private
router.post('/:channelId', authMiddleware, validateSendMessage, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { content, type = 'text', replyTo } = req.body;

    // Verify channel exists and user has access
    const channel = await Channel.findById(channelId);
    
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    // Check if user is member of the channel
    if (!channel.isMember(req.user._id)) {
      // Auto-join public channels
      if (channel.type === 'public') {
        console.log(`🔓 Auto-joining user ${req.user.username} to public channel: ${channelId}`);
        try {
          await channel.addMember(req.user._id);
          
          // Add channel to user's joined channels
          await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { joinedChannels: channel._id }
          });
          
          console.log(`✅ User ${req.user.username} auto-joined public channel: ${channelId}`);
        } catch (joinError) {
          console.error('Auto-join error during message send:', joinError);
          return res.status(403).json({
            success: false,
            message: 'Failed to join channel automatically'
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          message: 'You must be a member to send messages'
        });
      }
    }

    // Verify reply-to message exists if provided
    if (replyTo) {
      const replyMessage = await Message.findOne({
        _id: replyTo,
        channel: channelId,
        isDeleted: false
      });

      if (!replyMessage) {
        return res.status(400).json({
          success: false,
          message: 'Reply message not found'
        });
      }
    }

    // Create message
    const message = new Message({
      content,
      type,
      author: req.user._id,
      channel: channelId,
      replyTo: replyTo || undefined
    });

    await message.save();

    // Update channel activity and message count
    await channel.incrementMessageCount();

    // Populate message data
    await message.populate('author', 'username avatar status');
    if (replyTo) {
      await message.populate('replyTo', 'content author createdAt');
    }

    // Emit message to channel members
    if (req.io) {
      console.log(`📤 Emitting message to channel_${channelId}:`, {
        messageId: message._id,
        content: message.content,
        author: message.author.username
      });
      
      req.io.to(`channel_${channelId}`).emit('newMessage', message);
      
      // Send mention notifications
      if (message.mentions && message.mentions.length > 0) {
        message.mentions.forEach(mention => {
          req.io.to(`user_${mention.user}`).emit('mentioned', {
            message,
            channelId,
            channelName: channel.name
          });
        });
      }
    } else {
      console.warn('⚠️ Socket.IO not available in request object');
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message
      }
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/messages/:messageId
// @desc    Edit a message
// @access  Private
router.put('/:messageId', authMiddleware, validateEditMessage, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await Message.findById(messageId)
      .populate('author', 'username avatar status');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the author
    if (message.author._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own messages'
      });
    }

    // Check if message is already deleted
    if (message.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit deleted message'
      });
    }

    // Update message
    await message.editContent(content);

    // Emit message update
    if (req.io) {
      req.io.to(`channel_${message.channel}`).emit('messageUpdated', message);
    }

    res.json({
      success: true,
      message: 'Message updated successfully',
      data: {
        message
      }
    });

  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/messages/:messageId
// @desc    Delete a message
// @access  Private
router.delete('/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId)
      .populate('author', 'username')
      .populate('channel');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    const channel = await Channel.findById(message.channel._id);
    const userRole = channel.getMemberRole(req.user._id);

    // Check if user can delete the message
    const canDelete = message.author._id.toString() === req.user._id.toString() ||
                     ['owner', 'admin', 'moderator'].includes(userRole);

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this message'
      });
    }

    // Soft delete the message
    await message.softDelete(req.user._id);

    // Emit message deletion
    if (req.io) {
      req.io.to(`channel_${message.channel._id}`).emit('messageDeleted', {
        messageId,
        channelId: message.channel._id
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/messages/:messageId/react
// @desc    Add reaction to a message
// @access  Private
router.post('/:messageId/react', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required'
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Verify user has access to the channel
    const channel = await Channel.findById(message.channel);
    if (channel.type === 'private' && !channel.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Add reaction
    await message.addReaction(emoji, req.user._id);

    // Emit reaction update
    if (req.io) {
      req.io.to(`channel_${message.channel}`).emit('messageReaction', {
        messageId,
        emoji,
        userId: req.user._id,
        action: 'add'
      });
    }

    res.json({
      success: true,
      message: 'Reaction added successfully',
      data: {
        reactions: message.reactions
      }
    });

  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/messages/:messageId/react
// @desc    Remove reaction from a message
// @access  Private
router.delete('/:messageId/react', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required'
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Remove reaction
    await message.removeReaction(emoji, req.user._id);

    // Emit reaction update
    if (req.io) {
      req.io.to(`channel_${message.channel}`).emit('messageReaction', {
        messageId,
        emoji,
        userId: req.user._id,
        action: 'remove'
      });
    }

    res.json({
      success: true,
      message: 'Reaction removed successfully',
      data: {
        reactions: message.reactions
      }
    });

  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/messages/search/:channelId
// @desc    Search messages in a channel
// @access  Private
router.get('/search/:channelId', authMiddleware, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { q: searchTerm, limit = 20 } = req.query;

    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters long'
      });
    }

    // Verify channel access
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    if (channel.type === 'private' && !channel.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Search messages
    const messages = await Message.searchMessages(channelId, searchTerm, limit);

    res.json({
      success: true,
      data: {
        messages,
        searchTerm,
        count: messages.length
      }
    });

  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

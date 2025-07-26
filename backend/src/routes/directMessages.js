const express = require('express');
const { DirectMessageConversation, DirectMessage } = require('../models/DirectMessage');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { validateSendMessage, validateEditMessage, validatePagination } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/dm/conversations
// @desc    Get user's DM conversations
// @access  Private
router.get('/conversations', authMiddleware, validatePagination, async (req, res) => {
  try {
    const { page, limit } = req.query;
    const skip = (page - 1) * limit;

    const conversations = await DirectMessageConversation.find({
      participants: req.user._id
    })
      .populate('participants', 'username avatar status isOnline')
      .populate('lastMessage')
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(limit);

    const totalConversations = await DirectMessageConversation.countDocuments({
      participants: req.user._id
    });

    const totalPages = Math.ceil(totalConversations / limit);

    // Format conversations with other participant info and unread count
    const formattedConversations = conversations.map(conv => {
      const convObj = conv.toObject();
      convObj.otherParticipant = conv.getOtherParticipant(req.user._id);
      
      // Get unread count for current user
      const userReadStatus = conv.readStatus.find(status => 
        status.user.toString() === req.user._id.toString()
      );
      convObj.unreadCount = userReadStatus ? userReadStatus.unreadCount : 0;
      
      return convObj;
    });

    res.json({
      success: true,
      data: {
        conversations: formattedConversations,
        pagination: {
          currentPage: page,
          totalPages,
          totalConversations,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get DM conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/dm/conversations
// @desc    Create or get existing DM conversation
// @access  Private
router.post('/conversations', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create conversation with yourself'
      });
    }

    // Verify the other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find or create conversation
    const conversation = await DirectMessageConversation.findOrCreateConversation(
      req.user._id,
      userId
    );

    // Get conversation with formatted data
    const convObj = conversation.toObject();
    convObj.otherParticipant = conversation.getOtherParticipant(req.user._id);
    
    const userReadStatus = conversation.readStatus.find(status => 
      status.user.toString() === req.user._id.toString()
    );
    convObj.unreadCount = userReadStatus ? userReadStatus.unreadCount : 0;

    res.json({
      success: true,
      data: {
        conversation: convObj
      }
    });

  } catch (error) {
    console.error('Create DM conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/dm/:conversationId/messages
// @desc    Get messages in a DM conversation
// @access  Private
router.get('/:conversationId/messages', authMiddleware, validatePagination, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page, limit, before } = req.query;

    // Verify conversation exists and user is participant
    const conversation = await DirectMessageConversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    if (!conversation.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation'
      });
    }

    const skip = (page - 1) * limit;
    
    const messages = await DirectMessage.getRecentMessages(
      conversationId, 
      limit, 
      before ? new Date(before) : null
    );

    const totalMessages = await DirectMessage.countDocuments({
      conversation: conversationId,
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
    console.error('Get DM messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/dm/:conversationId/messages
// @desc    Send a message in DM conversation
// @access  Private
router.post('/:conversationId/messages', authMiddleware, validateSendMessage, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, type = 'text', replyTo } = req.body;

    // Verify conversation and access
    const conversation = await DirectMessageConversation.findById(conversationId)
      .populate('participants', 'username avatar');
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    if (!conversation.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation'
      });
    }

    // Check if conversation is blocked
    if (conversation.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'This conversation is blocked'
      });
    }

    // Verify reply-to message if provided
    if (replyTo) {
      const replyMessage = await DirectMessage.findOne({
        _id: replyTo,
        conversation: conversationId,
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
    const message = new DirectMessage({
      content,
      type,
      sender: req.user._id,
      conversation: conversationId,
      replyTo: replyTo || undefined
    });

    await message.save();

    // Update conversation
    conversation.lastMessage = message._id;
    
    // Increment unread count for other participant
    const otherParticipant = conversation.getOtherParticipant(req.user._id);
    await conversation.incrementUnread(otherParticipant._id);

    // Populate message data
    await message.populate('sender', 'username avatar status');
    if (replyTo) {
      await message.populate('replyTo', 'content sender');
    }

    // Emit message to conversation participants
    if (req.io) {
      conversation.participants.forEach(participant => {
        req.io.to(`user_${participant._id}`).emit('newDirectMessage', {
          message,
          conversationId
        });
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message
      }
    });

  } catch (error) {
    console.error('Send DM error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/dm/messages/:messageId
// @desc    Edit a DM message
// @access  Private
router.put('/messages/:messageId', authMiddleware, validateEditMessage, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await DirectMessage.findById(messageId)
      .populate('sender', 'username avatar status')
      .populate('conversation');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the sender
    if (message.sender._id.toString() !== req.user._id.toString()) {
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

    // Emit message update to conversation participants
    if (req.io) {
      const conversation = await DirectMessageConversation.findById(message.conversation._id)
        .populate('participants');
      
      conversation.participants.forEach(participant => {
        req.io.to(`user_${participant._id}`).emit('directMessageUpdated', {
          message,
          conversationId: message.conversation._id
        });
      });
    }

    res.json({
      success: true,
      message: 'Message updated successfully',
      data: {
        message
      }
    });

  } catch (error) {
    console.error('Edit DM error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/dm/messages/:messageId
// @desc    Delete a DM message
// @access  Private
router.delete('/messages/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await DirectMessage.findById(messageId)
      .populate('sender', 'username')
      .populate('conversation');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the sender
    if (message.sender._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages'
      });
    }

    // Soft delete the message
    await message.softDelete();

    // Emit message deletion to conversation participants
    if (req.io) {
      const conversation = await DirectMessageConversation.findById(message.conversation._id)
        .populate('participants');
      
      conversation.participants.forEach(participant => {
        req.io.to(`user_${participant._id}`).emit('directMessageDeleted', {
          messageId,
          conversationId: message.conversation._id
        });
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete DM error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/dm/:conversationId/mark-read
// @desc    Mark DM conversation as read
// @access  Private
router.post('/:conversationId/mark-read', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await DirectMessageConversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    if (!conversation.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation'
      });
    }

    // Mark as read
    await conversation.markAsRead(req.user._id);

    res.json({
      success: true,
      message: 'Conversation marked as read'
    });

  } catch (error) {
    console.error('Mark DM as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

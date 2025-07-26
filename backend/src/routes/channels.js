const express = require('express');
const Channel = require('../models/Channel');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { validateCreateChannel, validateUpdateChannel, validatePagination } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/channels
// @desc    Get all public channels or user's joined channels
// @access  Private
router.get('/', authMiddleware, validatePagination, async (req, res) => {
  try {
    const { page, limit, type = 'all', category } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    // Filter by type
    if (type === 'public') {
      query.type = 'public';
    } else if (type === 'joined') {
      query = { 'members.user': req.user._id };
    } else if (type === 'private') {
      query = {
        type: 'private',
        'members.user': req.user._id
      };
    }

    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }

    const channels = await Channel.find(query)
      .populate('createdBy', 'username avatar')
      .populate('members.user', 'username avatar status isOnline')
      .select('-inviteCode') // Don't expose invite codes
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(limit);

    const totalChannels = await Channel.countDocuments(query);
    const totalPages = Math.ceil(totalChannels / limit);

    // Add member status for current user
    const channelsWithUserStatus = channels.map(channel => {
      const channelObj = channel.toObject();
      channelObj.isMember = channel.isMember(req.user._id);
      channelObj.userRole = channel.getMemberRole(req.user._id);
      return channelObj;
    });

    res.json({
      success: true,
      data: {
        channels: channelsWithUserStatus,
        pagination: {
          currentPage: page,
          totalPages,
          totalChannels,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/channels
// @desc    Create a new channel
// @access  Private
router.post('/', authMiddleware, validateCreateChannel, async (req, res) => {
  try {
    const channelData = {
      ...req.body,
      createdBy: req.user._id,
      members: [{
        user: req.user._id,
        role: 'owner',
        joinedAt: new Date()
      }]
    };

    // Generate invite code for private channels
    if (channelData.type === 'private' || channelData.isInviteOnly) {
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      channelData.inviteCode = inviteCode;
    }

    const channel = new Channel(channelData);
    await channel.save();

    // Add channel to user's joined channels
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { joinedChannels: channel._id }
    });

    // Populate channel data
    await channel.populate('createdBy', 'username avatar');
    await channel.populate('members.user', 'username avatar status isOnline');

    // Emit channel creation event
    if (req.io) {
      if (channel.type === 'public') {
        req.io.emit('channelCreated', channel);
      } else {
        // Only emit to channel members for private channels
        channel.members.forEach(member => {
          req.io.to(`user_${member.user._id}`).emit('channelCreated', channel);
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Channel created successfully',
      data: {
        channel
      }
    });

  } catch (error) {
    console.error('Create channel error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Channel name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/channels/:channelId
// @desc    Get channel details
// @access  Private
router.get('/:channelId', authMiddleware, async (req, res) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findById(channelId)
      .populate('createdBy', 'username avatar')
      .populate('members.user', 'username avatar status isOnline lastSeen')
      .populate('pinnedMessages');

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

    const channelData = channel.toObject();
    channelData.isMember = channel.isMember(req.user._id);
    channelData.userRole = channel.getMemberRole(req.user._id);

    // Hide invite code unless user is admin/owner
    const userRole = channel.getMemberRole(req.user._id);
    if (!['owner', 'admin'].includes(userRole)) {
      delete channelData.inviteCode;
    }

    res.json({
      success: true,
      data: {
        channel: channelData
      }
    });

  } catch (error) {
    console.error('Get channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/channels/:channelId
// @desc    Update channel
// @access  Private
router.put('/:channelId', authMiddleware, validateUpdateChannel, async (req, res) => {
  try {
    const { channelId } = req.params;
    const updates = req.body;

    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    // Check if user has permission to update channel
    const userRole = channel.getMemberRole(req.user._id);
    if (!['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this channel'
      });
    }

    const updatedChannel = await Channel.findByIdAndUpdate(
      channelId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'username avatar')
      .populate('members.user', 'username avatar status isOnline');

    // Emit channel update event
    if (req.io) {
      req.io.to(`channel_${channelId}`).emit('channelUpdated', updatedChannel);
    }

    res.json({
      success: true,
      message: 'Channel updated successfully',
      data: {
        channel: updatedChannel
      }
    });

  } catch (error) {
    console.error('Update channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/channels/:channelId/join
// @desc    Join a channel
// @access  Private
router.post('/:channelId/join', authMiddleware, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { inviteCode } = req.body;

    const channel = await Channel.findById(channelId)
      .populate('members.user', 'username avatar');

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    // Check if user is already a member
    if (channel.isMember(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this channel'
      });
    }

    // Check access permissions for private channels
    if (channel.type === 'private') {
      if (channel.isInviteOnly && (!inviteCode || channel.inviteCode !== inviteCode)) {
        return res.status(403).json({
          success: false,
          message: 'Invalid invite code'
        });
      }
    }

    // Add user to channel
    await channel.addMember(req.user._id);

    // Add channel to user's joined channels
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { joinedChannels: channel._id }
    });

    // Populate the new member data
    await channel.populate('members.user', 'username avatar status isOnline');

    // Emit events
    if (req.io) {
      // Notify channel members
      req.io.to(`channel_${channelId}`).emit('memberJoined', {
        channelId,
        user: {
          _id: req.user._id,
          username: req.user.username,
          avatar: req.user.avatar
        }
      });
      
      // Add user to channel room
      req.io.to(`user_${req.user._id}`).emit('joinedChannel', channel);
    }

    res.json({
      success: true,
      message: 'Successfully joined the channel',
      data: {
        channel
      }
    });

  } catch (error) {
    console.error('Join channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/channels/:channelId/leave
// @desc    Leave a channel
// @access  Private
router.post('/:channelId/leave', authMiddleware, async (req, res) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    // Check if user is a member
    if (!channel.isMember(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You are not a member of this channel'
      });
    }

    // Prevent owner from leaving (they need to transfer ownership first)
    const userRole = channel.getMemberRole(req.user._id);
    if (userRole === 'owner') {
      return res.status(400).json({
        success: false,
        message: 'Channel owner cannot leave. Transfer ownership first.'
      });
    }

    // Remove user from channel
    await channel.removeMember(req.user._id);

    // Remove channel from user's joined channels
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { joinedChannels: channel._id }
    });

    // Emit events
    if (req.io) {
      // Notify channel members
      req.io.to(`channel_${channelId}`).emit('memberLeft', {
        channelId,
        user: {
          _id: req.user._id,
          username: req.user.username
        }
      });
      
      // Remove user from channel room
      req.io.to(`user_${req.user._id}`).emit('leftChannel', { channelId });
    }

    res.json({
      success: true,
      message: 'Successfully left the channel'
    });

  } catch (error) {
    console.error('Leave channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/channels/:channelId
// @desc    Delete a channel
// @access  Private
router.delete('/:channelId', authMiddleware, async (req, res) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    // Only owner can delete channel
    const userRole = channel.getMemberRole(req.user._id);
    if (userRole !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Only channel owner can delete the channel'
      });
    }

    // Remove channel from all users' joined channels
    await User.updateMany(
      { joinedChannels: channelId },
      { $pull: { joinedChannels: channelId } }
    );

    // Delete the channel
    await Channel.findByIdAndDelete(channelId);

    // Emit channel deletion event
    if (req.io) {
      req.io.to(`channel_${channelId}`).emit('channelDeleted', { channelId });
    }

    res.json({
      success: true,
      message: 'Channel deleted successfully'
    });

  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

const express = require('express');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { validateUpdateProfile, validatePagination } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('joinedChannels', 'name displayName category type memberCount')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authMiddleware, validateUpdateProfile, async (req, res) => {
  try {
    const updates = req.body;
    const userId = req.user._id;

    // Check if username is being updated and if it's already taken
    if (updates.username && updates.username !== req.user.username) {
      const existingUser = await User.findOne({ 
        username: updates.username,
        _id: { $ne: userId }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken'
        });
      }
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/users/status
// @desc    Update user status
// @access  Private
router.put('/status', authMiddleware, async (req, res) => {
  try {
    const { status, customStatus } = req.body;

    // Validate status
    const validStatuses = ['online', 'offline', 'away', 'busy'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const updates = {};
    if (status) updates.status = status;
    if (customStatus !== undefined) updates.customStatus = customStatus;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    ).select('-password');

    // Emit status update to connected clients
    if (req.io) {
      req.io.emit('userStatusUpdate', {
        userId: user._id,
        status: user.status,
        customStatus: user.customStatus,
        isOnline: user.isOnline
      });
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/users/search
// @desc    Search users by username
// @access  Private
router.get('/search', authMiddleware, validatePagination, async (req, res) => {
  try {
    const { q: searchQuery, page, limit } = req.query;

    if (!searchQuery || searchQuery.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const skip = (page - 1) * limit;

    // Search users by username (case-insensitive)
    const users = await User.find({
      username: { $regex: searchQuery, $options: 'i' },
      _id: { $ne: req.user._id } // Exclude current user
    })
      .select('username avatar status isOnline lastSeen')
      .sort({ username: 1 })
      .skip(skip)
      .limit(limit);

    const totalUsers = await User.countDocuments({
      username: { $regex: searchQuery, $options: 'i' },
      _id: { $ne: req.user._id }
    });

    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/users/:userId
// @desc    Get user profile by ID
// @access  Private
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate ObjectId
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findById(userId)
      .select('username avatar status isOnline lastSeen favoriteGames gamerTags joinedChannels customStatus')
      .populate('joinedChannels', 'name displayName category type');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/users/online
// @desc    Get list of online users
// @access  Private
router.get('/online', authMiddleware, validatePagination, async (req, res) => {
  try {
    const { page, limit } = req.query;
    const skip = (page - 1) * limit;

    const onlineUsers = await User.find({
      isOnline: true,
      _id: { $ne: req.user._id }
    })
      .select('username avatar status customStatus')
      .sort({ lastSeen: -1 })
      .skip(skip)
      .limit(limit);

    const totalOnlineUsers = await User.countDocuments({
      isOnline: true,
      _id: { $ne: req.user._id }
    });

    const totalPages = Math.ceil(totalOnlineUsers / limit);

    res.json({
      success: true,
      data: {
        users: onlineUsers,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers: totalOnlineUsers,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

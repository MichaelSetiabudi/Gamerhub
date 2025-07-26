const User = require('../models/User');
const Channel = require('../models/Channel');
const { DirectMessageConversation } = require('../models/DirectMessage');

// Store active users and their socket connections
const activeUsers = new Map(); // userId -> { socketId, lastSeen }
const typingUsers = new Map(); // channelId -> Set of userIds

const socketHandlers = (io) => {
  io.on('connection', async (socket) => {
    console.log(`🔌 User ${socket.user.username} connected (${socket.id})`);

    // Add user to active users
    activeUsers.set(socket.userId, {
      socketId: socket.id,
      lastSeen: new Date(),
      user: socket.user
    });

    // Set user as online
    await socket.user.setOnlineStatus(true);

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Join user to their channel rooms
    const userChannels = await Channel.find({
      'members.user': socket.userId
    });

    userChannels.forEach(channel => {
      socket.join(`channel_${channel._id}`);
    });

    // Emit user online status to all channels they're in
    userChannels.forEach(channel => {
      socket.to(`channel_${channel._id}`).emit('userOnline', {
        userId: socket.userId,
        username: socket.user.username,
        avatar: socket.user.avatar
      });
    });

    // Emit global online users update
    io.emit('onlineUsersUpdate', {
      onlineCount: activeUsers.size,
      users: Array.from(activeUsers.values()).map(u => ({
        userId: u.user._id,
        username: u.user.username,
        avatar: u.user.avatar,
        status: u.user.status
      }))
    });

    // Handle joining a channel
    socket.on('joinChannel', async (data) => {
      try {
        const { channelId } = data;
        console.log(`🏠 User ${socket.user.username} joining channel: ${channelId}`);
        
        // Verify channel exists
        const channel = await Channel.findById(channelId);
        if (!channel) {
          console.log(`❌ Channel not found: ${channelId}`);
          socket.emit('error', { message: 'Channel not found' });
          return;
        }

        // Auto-join public channels if user is not a member
        if (channel.type === 'public' && !channel.isMember(socket.userId)) {
          console.log(`🔓 Auto-joining public channel: ${channelId}`);
          try {
            await channel.addMember(socket.userId);
            
            // Add channel to user's joined channels
            const User = require('../models/User');
            await User.findByIdAndUpdate(socket.userId, {
              $addToSet: { joinedChannels: channel._id }
            });
            
            console.log(`✅ User ${socket.user.username} auto-joined public channel: ${channelId}`);
          } catch (joinError) {
            console.error('Auto-join error:', joinError);
          }
        }

        // Check if user has access (should be true for public channels after auto-join)
        if (channel.isMember(socket.userId) || channel.type === 'public') {
          socket.join(`channel_${channelId}`);
          console.log(`✅ User ${socket.user.username} successfully joined channel room: ${channelId}`);
          
          // Notify other channel members
          socket.to(`channel_${channelId}`).emit('userJoinedChannel', {
            userId: socket.userId,
            username: socket.user.username,
            channelId
          });
        } else {
          console.log(`❌ User ${socket.user.username} denied access to channel: ${channelId}`);
          socket.emit('error', { message: 'Access denied to this channel. Try joining the channel first.' });
        }
      } catch (error) {
        console.error('Join channel error:', error);
        socket.emit('error', { message: 'Failed to join channel' });
      }
    });

    // Handle leaving a channel
    socket.on('leaveChannel', async (data) => {
      try {
        const { channelId } = data;
        console.log(`🚪 User ${socket.user.username} leaving channel: ${channelId}`);
        
        socket.leave(`channel_${channelId}`);
        
        // Stop typing if user was typing
        handleStopTyping(socket, channelId);
        
        // Notify other channel members
        socket.to(`channel_${channelId}`).emit('userLeftChannel', {
          userId: socket.userId,
          username: socket.user.username,
          channelId
        });
        
        console.log(`✅ User ${socket.user.username} successfully left channel: ${channelId}`);
      } catch (error) {
        console.error('Leave channel error:', error);
        socket.emit('error', { message: 'Failed to leave channel' });
      }
    });

    // Handle typing start
    socket.on('typing', (data) => {
      try {
        const { channelId, type = 'channel' } = data;
        
        if (type === 'channel') {
          handleTyping(socket, channelId, true);
        } else if (type === 'dm') {
          handleDMTyping(socket, data.conversationId, true);
        }
      } catch (error) {
        console.error('Typing error:', error);
      }
    });

    // Handle typing stop
    socket.on('stopTyping', (data) => {
      try {
        const { channelId, type = 'channel' } = data;
        
        if (type === 'channel') {
          handleStopTyping(socket, channelId);
        } else if (type === 'dm') {
          handleDMStopTyping(socket, data.conversationId);
        }
      } catch (error) {
        console.error('Stop typing error:', error);
      }
    });

    // Handle user status update
    socket.on('updateStatus', async (data) => {
      try {
        const { status, customStatus } = data;
        
        // Update user in database
        const user = await User.findByIdAndUpdate(
          socket.userId,
          { 
            status,
            customStatus: customStatus || ''
          },
          { new: true }
        );

        // Update active users map
        if (activeUsers.has(socket.userId)) {
          activeUsers.get(socket.userId).user = user;
        }

        // Broadcast status update to all channels user is in
        const userChannels = await Channel.find({
          'members.user': socket.userId
        });

        userChannels.forEach(channel => {
          socket.to(`channel_${channel._id}`).emit('userStatusUpdate', {
            userId: socket.userId,
            status: user.status,
            customStatus: user.customStatus
          });
        });

      } catch (error) {
        console.error('Update status error:', error);
        socket.emit('error', { message: 'Failed to update status' });
      }
    });

    // Handle DM conversation join
    socket.on('joinConversation', async (data) => {
      try {
        const { conversationId } = data;
        
        // Verify user is participant
        const conversation = await DirectMessageConversation.findById(conversationId);
        if (conversation && conversation.isParticipant(socket.userId)) {
          socket.join(`dm_${conversationId}`);
        }
      } catch (error) {
        console.error('Join conversation error:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Handle DM conversation leave
    socket.on('leaveConversation', (data) => {
      try {
        const { conversationId } = data;
        socket.leave(`dm_${conversationId}`);
      } catch (error) {
        console.error('Leave conversation error:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`🔌 User ${socket.user.username} disconnected (${socket.id})`);

      // Remove from active users
      activeUsers.delete(socket.userId);

      // Clear typing status
      clearTypingForUser(socket.userId);

      // Set user as offline
      await socket.user.setOnlineStatus(false);

      // Get user channels to notify
      const userChannels = await Channel.find({
        'members.user': socket.userId
      });

      // Notify channels that user went offline
      userChannels.forEach(channel => {
        socket.to(`channel_${channel._id}`).emit('userOffline', {
          userId: socket.userId,
          username: socket.user.username
        });
      });

      // Emit global online users update
      io.emit('onlineUsersUpdate', {
        onlineCount: activeUsers.size,
        users: Array.from(activeUsers.values()).map(u => ({
          userId: u.user._id,
          username: u.user.username,
          avatar: u.user.avatar,
          status: u.user.status
        }))
      });
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
      
      // Update last seen
      if (activeUsers.has(socket.userId)) {
        activeUsers.get(socket.userId).lastSeen = new Date();
      }
    });
  });

  // Helper functions
  function handleTyping(socket, channelId, isTyping) {
    if (!typingUsers.has(channelId)) {
      typingUsers.set(channelId, new Set());
    }

    const channelTypers = typingUsers.get(channelId);
    
    if (isTyping) {
      channelTypers.add(socket.userId);
      
      // Notify other users in channel
      socket.to(`channel_${channelId}`).emit('userTyping', {
        userId: socket.userId,
        username: socket.user.username,
        channelId
      });

      // Auto-stop typing after 3 seconds
      setTimeout(() => {
        handleStopTyping(socket, channelId);
      }, 3000);
    }
  }

  function handleStopTyping(socket, channelId) {
    if (typingUsers.has(channelId)) {
      const channelTypers = typingUsers.get(channelId);
      channelTypers.delete(socket.userId);
      
      // Notify other users
      socket.to(`channel_${channelId}`).emit('userStoppedTyping', {
        userId: socket.userId,
        channelId
      });

      // Clean up if no one is typing
      if (channelTypers.size === 0) {
        typingUsers.delete(channelId);
      }
    }
  }

  function handleDMTyping(socket, conversationId, isTyping) {
    if (isTyping) {
      socket.to(`dm_${conversationId}`).emit('userTypingDM', {
        userId: socket.userId,
        username: socket.user.username,
        conversationId
      });

      // Auto-stop typing after 3 seconds
      setTimeout(() => {
        handleDMStopTyping(socket, conversationId);
      }, 3000);
    }
  }

  function handleDMStopTyping(socket, conversationId) {
    socket.to(`dm_${conversationId}`).emit('userStoppedTypingDM', {
      userId: socket.userId,
      conversationId
    });
  }

  function clearTypingForUser(userId) {
    // Clear user from all typing indicators
    for (const [channelId, typingSet] of typingUsers.entries()) {
      if (typingSet.has(userId)) {
        typingSet.delete(userId);
        
        // Notify channel
        io.to(`channel_${channelId}`).emit('userStoppedTyping', {
          userId,
          channelId
        });

        // Clean up if empty
        if (typingSet.size === 0) {
          typingUsers.delete(channelId);
        }
      }
    }
  }
};

// Export for use in other parts of the application
module.exports = socketHandlers;

// Helper function to get online users
module.exports.getOnlineUsers = () => {
  return Array.from(activeUsers.values()).map(u => ({
    userId: u.user._id,
    username: u.user.username,
    avatar: u.user.avatar,
    status: u.user.status,
    lastSeen: u.lastSeen
  }));
};

// Helper function to check if user is online
module.exports.isUserOnline = (userId) => {
  return activeUsers.has(userId.toString());
};

// Helper function to send notification to specific user
module.exports.sendNotificationToUser = (io, userId, notification) => {
  io.to(`user_${userId}`).emit('notification', notification);
};

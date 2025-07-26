const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const DirectMessage = require('../models/DirectMessage');

// Store active users and their typing status
const activeUsers = new Map();
const typingUsers = new Map();

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', async (token) => {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.userId).select('-password');
          
          if (!user) {
            socket.emit('authError', 'User not found');
            return;
          }

          socket.userId = user._id.toString();
          socket.user = user;
          
          // Add user to active users
          activeUsers.set(socket.userId, {
            socketId: socket.id,
            user: user,
            lastSeen: new Date()
          });

          // Update user status to online
          await User.findByIdAndUpdate(user._id, { 
            status: 'online',
            lastSeen: new Date()
          });

          // Join user to their personal room
          socket.join(`user_${socket.userId}`);

          // Join user to all their channels
          const userChannels = await Channel.find({
            'members.user': user._id
          });

          userChannels.forEach(channel => {
            socket.join(`channel_${channel._id}`);
          });

          // Emit successful authentication
          socket.emit('authenticated', {
            user: {
              _id: user._id,
              username: user.username,
              email: user.email,
              avatar: user.avatar,
              status: user.status
            }
          });

          // Broadcast user online status to friends/channels
          this.broadcastUserStatus(socket.userId, 'online');

          console.log(`User authenticated: ${user.username} (${socket.userId})`);

        } catch (error) {
          console.error('Authentication error:', error);
          socket.emit('authError', 'Invalid token');
        }
      });

      // Handle joining channels
      socket.on('joinChannel', async (channelId) => {
        try {
          if (!socket.userId) {
            socket.emit('error', 'Not authenticated');
            return;
          }

          const channel = await Channel.findById(channelId);
          if (!channel) {
            socket.emit('error', 'Channel not found');
            return;
          }

          // Check if user is a member
          const isMember = channel.isMember(socket.userId);
          if (!isMember) {
            socket.emit('error', 'Not a member of this channel');
            return;
          }

          socket.join(`channel_${channelId}`);
          socket.emit('joinedChannel', { channelId });

          // Broadcast user joined to channel
          socket.to(`channel_${channelId}`).emit('userJoinedChannel', {
            channelId,
            user: {
              _id: socket.user._id,
              username: socket.user.username,
              avatar: socket.user.avatar
            }
          });

        } catch (error) {
          console.error('Join channel error:', error);
          socket.emit('error', 'Failed to join channel');
        }
      });

      // Handle leaving channels
      socket.on('leaveChannel', (channelId) => {
        try {
          socket.leave(`channel_${channelId}`);
          socket.emit('leftChannel', { channelId });

          // Broadcast user left to channel
          socket.to(`channel_${channelId}`).emit('userLeftChannel', {
            channelId,
            user: {
              _id: socket.user._id,
              username: socket.user.username
            }
          });

        } catch (error) {
          console.error('Leave channel error:', error);
          socket.emit('error', 'Failed to leave channel');
        }
      });

      // Handle typing indicators for channels
      socket.on('typing', ({ channelId, isTyping }) => {
        try {
          if (!socket.userId || !channelId) return;

          const typingKey = `${channelId}_${socket.userId}`;
          
          if (isTyping) {
            typingUsers.set(typingKey, {
              userId: socket.userId,
              username: socket.user.username,
              channelId,
              timestamp: Date.now()
            });

            // Broadcast typing status to channel
            socket.to(`channel_${channelId}`).emit('userTyping', {
              channelId,
              user: {
                _id: socket.user._id,
                username: socket.user.username
              },
              isTyping: true
            });

            // Auto-stop typing after 3 seconds
            setTimeout(() => {
              if (typingUsers.has(typingKey)) {
                typingUsers.delete(typingKey);
                socket.to(`channel_${channelId}`).emit('userTyping', {
                  channelId,
                  user: {
                    _id: socket.user._id,
                    username: socket.user.username
                  },
                  isTyping: false
                });
              }
            }, 3000);

          } else {
            typingUsers.delete(typingKey);
            socket.to(`channel_${channelId}`).emit('userTyping', {
              channelId,
              user: {
                _id: socket.user._id,
                username: socket.user.username
              },
              isTyping: false
            });
          }

        } catch (error) {
          console.error('Typing indicator error:', error);
        }
      });

      // Handle typing indicators for direct messages
      socket.on('typingDM', ({ recipientId, isTyping }) => {
        try {
          if (!socket.userId || !recipientId) return;

          socket.to(`user_${recipientId}`).emit('userTypingDM', {
            user: {
              _id: socket.user._id,
              username: socket.user.username
            },
            isTyping
          });

        } catch (error) {
          console.error('DM typing indicator error:', error);
        }
      });

      // Handle voice channel events
      socket.on('joinVoiceChannel', ({ channelId }) => {
        try {
          if (!socket.userId) return;

          socket.join(`voice_${channelId}`);
          
          // Broadcast user joined voice
          socket.to(`voice_${channelId}`).emit('userJoinedVoice', {
            channelId,
            user: {
              _id: socket.user._id,
              username: socket.user.username,
              avatar: socket.user.avatar
            }
          });

          socket.emit('joinedVoiceChannel', { channelId });

        } catch (error) {
          console.error('Join voice channel error:', error);
        }
      });

      socket.on('leaveVoiceChannel', ({ channelId }) => {
        try {
          socket.leave(`voice_${channelId}`);
          
          // Broadcast user left voice
          socket.to(`voice_${channelId}`).emit('userLeftVoice', {
            channelId,
            user: {
              _id: socket.user._id,
              username: socket.user.username
            }
          });

          socket.emit('leftVoiceChannel', { channelId });

        } catch (error) {
          console.error('Leave voice channel error:', error);
        }
      });

      // Handle voice state updates (mute, deafen)
      socket.on('voiceStateUpdate', ({ channelId, muted, deafened }) => {
        try {
          socket.to(`voice_${channelId}`).emit('userVoiceStateChanged', {
            channelId,
            user: {
              _id: socket.user._id,
              username: socket.user.username
            },
            muted,
            deafened
          });

        } catch (error) {
          console.error('Voice state update error:', error);
        }
      });

      // Handle user status updates
      socket.on('updateStatus', async (status) => {
        try {
          if (!socket.userId) return;

          const validStatuses = ['online', 'away', 'busy', 'invisible'];
          if (!validStatuses.includes(status)) {
            socket.emit('error', 'Invalid status');
            return;
          }

          // Update user status in database
          await User.findByIdAndUpdate(socket.userId, { status });

          // Update in active users
          if (activeUsers.has(socket.userId)) {
            const userData = activeUsers.get(socket.userId);
            userData.user.status = status;
            activeUsers.set(socket.userId, userData);
          }

          // Broadcast status change
          this.broadcastUserStatus(socket.userId, status);

          socket.emit('statusUpdated', { status });

        } catch (error) {
          console.error('Update status error:', error);
        }
      });

      // Handle manual disconnect
      socket.on('disconnect', async () => {
        try {
          if (socket.userId) {
            console.log(`User disconnected: ${socket.user?.username} (${socket.userId})`);

            // Remove from active users
            activeUsers.delete(socket.userId);

            // Clear typing indicators
            for (const [key, value] of typingUsers.entries()) {
              if (value.userId === socket.userId) {
                typingUsers.delete(key);
                // Broadcast stop typing
                socket.to(`channel_${value.channelId}`).emit('userTyping', {
                  channelId: value.channelId,
                  user: {
                    _id: socket.userId,
                    username: socket.user.username
                  },
                  isTyping: false
                });
              }
            }

            // Update user status to offline after 30 seconds (grace period)
            setTimeout(async () => {
              if (!activeUsers.has(socket.userId)) {
                await User.findByIdAndUpdate(socket.userId, { 
                  status: 'offline',
                  lastSeen: new Date()
                });

                // Broadcast offline status
                this.broadcastUserStatus(socket.userId, 'offline');
              }
            }, 30000);
          }

        } catch (error) {
          console.error('Disconnect error:', error);
        }
      });

      // Handle ping for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // Handle custom game status
      socket.on('updateGameStatus', async ({ game, status }) => {
        try {
          if (!socket.userId) return;

          await User.findByIdAndUpdate(socket.userId, {
            'gameStatus.game': game,
            'gameStatus.status': status,
            'gameStatus.updatedAt': new Date()
          });

          // Broadcast game status update
          const userChannels = await Channel.find({
            'members.user': socket.userId
          });

          userChannels.forEach(channel => {
            socket.to(`channel_${channel._id}`).emit('userGameStatusChanged', {
              user: {
                _id: socket.userId,
                username: socket.user.username
              },
              gameStatus: { game, status }
            });
          });

        } catch (error) {
          console.error('Update game status error:', error);
        }
      });
    });
  }

  // Broadcast user status changes to relevant channels and friends
  async broadcastUserStatus(userId, status) {
    try {
      // Get user's channels
      const userChannels = await Channel.find({
        'members.user': userId
      });

      // Broadcast to all channels the user is in
      userChannels.forEach(channel => {
        this.io.to(`channel_${channel._id}`).emit('userStatusChanged', {
          user: { _id: userId },
          status,
          timestamp: new Date()
        });
      });

      // Get user's friends (users who have DM conversations)
      const dmUsers = await DirectMessage.distinct('sender', {
        recipient: userId
      });
      const dmUsers2 = await DirectMessage.distinct('recipient', {
        sender: userId
      });
      
      const friendIds = [...new Set([...dmUsers, ...dmUsers2])];

      // Broadcast to friends
      friendIds.forEach(friendId => {
        if (friendId.toString() !== userId.toString()) {
          this.io.to(`user_${friendId}`).emit('friendStatusChanged', {
            user: { _id: userId },
            status,
            timestamp: new Date()
          });
        }
      });

    } catch (error) {
      console.error('Broadcast user status error:', error);
    }
  }

  // Get active users count
  getActiveUsersCount() {
    return activeUsers.size;
  }

  // Get users currently typing in a channel
  getTypingUsers(channelId) {
    const typing = [];
    for (const [key, value] of typingUsers.entries()) {
      if (value.channelId === channelId) {
        typing.push({
          userId: value.userId,
          username: value.username
        });
      }
    }
    return typing;
  }

  // Send notification to specific user
  sendNotificationToUser(userId, notification) {
    this.io.to(`user_${userId}`).emit('notification', notification);
  }

  // Broadcast system message to channel
  broadcastSystemMessage(channelId, message) {
    this.io.to(`channel_${channelId}`).emit('systemMessage', {
      type: 'system',
      content: message,
      timestamp: new Date()
    });
  }

  // Broadcast server announcement
  broadcastServerAnnouncement(message, priority = 'normal') {
    this.io.emit('serverAnnouncement', {
      message,
      priority,
      timestamp: new Date()
    });
  }
}

module.exports = SocketHandler;

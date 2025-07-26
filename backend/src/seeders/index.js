const mongoose = require('mongoose');
const User = require('../models/User');
const Channel = require('../models/Channel');
const Message = require('../models/Message');

require('dotenv').config();

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to database if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('📦 Connected to MongoDB for seeding');
    }

    // Clear existing data (only in development)
    if (process.env.NODE_ENV === 'development') {
      await User.deleteMany({});
      await Channel.deleteMany({});
      await Message.deleteMany({});
      console.log('🗑️ Cleared existing data');
    }

    // Create sample users
    const users = await createSampleUsers();
    console.log(`👥 Created ${users.length} sample users`);

    // Create sample channels
    const channels = await createSampleChannels(users);
    console.log(`📺 Created ${channels.length} sample channels`);

    // Create sample messages
    const messageCount = await createSampleMessages(users, channels);
    console.log(`💬 Created ${messageCount} sample messages`);

    console.log('✅ Database seeding completed successfully!');
    console.log('🎮 You can now start using Gamer\'s Hub!');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
};

const createSampleUsers = async () => {
  const sampleUsers = [
    {
      username: 'gamerlord',
      email: 'gamer@example.com',
      password: 'password123',
      avatar: 'https://ui-avatars.com/api/?name=GamerLord&background=FF6B6B&color=fff',
      favoriteGames: ['Valorant', 'League of Legends', 'Genshin Impact'],
      gamerTags: {
        steam: 'gamerlord_steam',
        discord: 'GamerLord#1234'
      },
      customStatus: 'Ready to game! 🎮'
    },
    {
      username: 'proplayer',
      email: 'pro@example.com',
      password: 'password123',
      avatar: 'https://ui-avatars.com/api/?name=ProPlayer&background=4ECDC4&color=fff',
      favoriteGames: ['CS:GO', 'Valorant', 'Apex Legends'],
      gamerTags: {
        steam: 'proplayer_steam',
        battlenet: 'ProPlayer#1337'
      },
      customStatus: 'Grinding ranked 🏆'
    },
    {
      username: 'casualgamer',
      email: 'casual@example.com',
      password: 'password123',
      avatar: 'https://ui-avatars.com/api/?name=CasualGamer&background=45B7D1&color=fff',
      favoriteGames: ['Minecraft', 'Genshin Impact', 'Fortnite'],
      gamerTags: {
        epic: 'CasualGamer_Epic'
      },
      customStatus: 'Just chilling 😎'
    },
    {
      username: 'speedrunner',
      email: 'speed@example.com',
      password: 'password123',
      avatar: 'https://ui-avatars.com/api/?name=SpeedRunner&background=F7B731&color=fff',
      favoriteGames: ['Minecraft', 'Celeste', 'Super Mario Bros'],
      customStatus: 'Going for WR! ⚡'
    },
    {
      username: 'streamer',
      email: 'stream@example.com',
      password: 'password123',
      avatar: 'https://ui-avatars.com/api/?name=Streamer&background=A55EEA&color=fff',
      favoriteGames: ['Valorant', 'Just Chatting', 'Variety'],
      gamerTags: {
        discord: 'StreamerPro#0001'
      },
      customStatus: 'Live on Twitch! 📺'
    }
  ];

  const createdUsers = [];
  for (const userData of sampleUsers) {
    const user = new User(userData);
    await user.save();
    createdUsers.push(user);
  }

  return createdUsers;
};

const createSampleChannels = async (users) => {
  const sampleChannels = [
    {
      name: 'general',
      displayName: 'General Discussion',
      description: 'General chat for all gaming topics',
      type: 'public',
      category: 'general',
      icon: '💬',
      createdBy: users[0]._id,
      members: users.map(user => ({
        user: user._id,
        role: user === users[0] ? 'owner' : 'member'
      }))
    },
    {
      name: 'valorant',
      displayName: 'Valorant',
      description: 'Discuss Valorant strategies, matches, and find teammates',
      type: 'public',
      category: 'valorant',
      game: 'Valorant',
      icon: '🎯',
      createdBy: users[1]._id,
      members: [
        { user: users[0]._id, role: 'member' },
        { user: users[1]._id, role: 'owner' },
        { user: users[2]._id, role: 'member' },
        { user: users[4]._id, role: 'member' }
      ]
    },
    {
      name: 'genshin-impact',
      displayName: 'Genshin Impact',
      description: 'Share builds, artifacts, and adventure together',
      type: 'public',
      category: 'genshin-impact',
      game: 'Genshin Impact',
      icon: '⚔️',
      createdBy: users[2]._id,
      members: [
        { user: users[0]._id, role: 'member' },
        { user: users[2]._id, role: 'owner' },
        { user: users[3]._id, role: 'member' }
      ]
    },
    {
      name: 'minecraft',
      displayName: 'Minecraft',
      description: 'Building, mining, and crafting together',
      type: 'public',
      category: 'minecraft',
      game: 'Minecraft',
      icon: '⛏️',
      createdBy: users[3]._id,
      members: [
        { user: users[2]._id, role: 'member' },
        { user: users[3]._id, role: 'owner' },
        { user: users[4]._id, role: 'member' }
      ]
    },
    {
      name: 'csgo',
      displayName: 'CS:GO',
      description: 'Counter-Strike discussions and team finding',
      type: 'public',
      category: 'csgo',
      game: 'Counter-Strike: Global Offensive',
      icon: '🔫',
      createdBy: users[1]._id,
      members: [
        { user: users[1]._id, role: 'owner' },
        { user: users[4]._id, role: 'member' }
      ]
    },
    {
      name: 'pro-team',
      displayName: 'Pro Team Discussion',
      description: 'Private channel for serious competitive players',
      type: 'private',
      category: 'gaming',
      icon: '👑',
      isInviteOnly: true,
      createdBy: users[1]._id,
      members: [
        { user: users[0]._id, role: 'admin' },
        { user: users[1]._id, role: 'owner' }
      ]
    }
  ];

  const createdChannels = [];
  for (const channelData of sampleChannels) {
    // Generate invite code for private channels
    if (channelData.type === 'private') {
      channelData.inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    }

    const channel = new Channel(channelData);
    await channel.save();
    createdChannels.push(channel);

    // Update users' joined channels
    for (const member of channelData.members) {
      await User.findByIdAndUpdate(member.user, {
        $addToSet: { joinedChannels: channel._id }
      });
    }
  }

  return createdChannels;
};

const createSampleMessages = async (users, channels) => {
  const sampleMessages = [
    // General channel messages
    {
      content: 'Welcome to Gamer\'s Hub! 🎮 This is where we discuss all things gaming!',
      author: users[0]._id,
      channel: channels[0]._id,
      type: 'text'
    },
    {
      content: 'Hey everyone! Excited to be here and meet fellow gamers!',
      author: users[1]._id,
      channel: channels[0]._id,
      type: 'text'
    },
    {
      content: 'What games is everyone playing this week?',
      author: users[2]._id,
      channel: channels[0]._id,
      type: 'text'
    },
    {
      content: '@proplayer have you tried the new Valorant update?',
      author: users[0]._id,
      channel: channels[0]._id,
      type: 'text'
    },

    // Valorant channel messages
    {
      content: 'Looking for teammates for ranked! Currently Gold 2 🏅',
      author: users[1]._id,
      channel: channels[1]._id,
      type: 'text'
    },
    {
      content: 'The new agent Clove is pretty interesting! Anyone tried them yet?',
      author: users[0]._id,
      channel: channels[1]._id,
      type: 'text'
    },
    {
      content: 'I can play Sage/Cypher if anyone needs a support!',
      author: users[2]._id,
      channel: channels[1]._id,
      type: 'text'
    },

    // Genshin Impact channel messages
    {
      content: 'Finally got my Raiden to C2! The damage is insane ⚡',
      author: users[2]._id,
      channel: channels[2]._id,
      type: 'text'
    },
    {
      content: 'Anyone need help with weekly bosses? I can co-op!',
      author: users[0]._id,
      channel: channels[2]._id,
      type: 'text'
    },

    // Minecraft channel messages
    {
      content: 'Started a new survival world! Working on a castle build 🏰',
      author: users[3]._id,
      channel: channels[3]._id,
      type: 'text'
    },
    {
      content: 'Anyone interested in a group survival server?',
      author: users[2]._id,
      channel: channels[3]._id,
      type: 'text'
    },

    // CS:GO channel messages
    {
      content: 'Dust2 is still the best map, change my mind 😤',
      author: users[1]._id,
      channel: channels[4]._id,
      type: 'text'
    }
  ];

  let messageCount = 0;
  for (const messageData of sampleMessages) {
    // Add some time variation
    const message = new Message(messageData);
    message.createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Random time within last week
    await message.save();
    
    // Update channel message count and activity
    await Channel.findByIdAndUpdate(messageData.channel, {
      $inc: { messageCount: 1 },
      lastActivity: message.createdAt
    });
    
    messageCount++;
  }

  return messageCount;
};

// Export for use in server startup
module.exports = seedDatabase;

// Allow running this file directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🌱 Seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

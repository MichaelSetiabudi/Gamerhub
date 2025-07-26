import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { User, VoiceState, TypingUser, Message } from '@/types';
import toast from 'react-hot-toast';
import { useMessageStore } from './messageStore';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: User[];
  voiceStates: Map<string, VoiceState>;
  typingUsers: Map<string, TypingUser[]>;
  
  // Actions
  connect: (token: string) => void;
  disconnect: () => void;
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
  switchChannel: (oldChannelId: string | null, newChannelId: string) => void;
  joinVoiceChannel: (channelId: string) => void;
  leaveVoiceChannel: () => void;
  startTyping: (channelId: string) => void;
  stopTyping: (channelId: string) => void;
  updateStatus: (status: string) => void;
  updateGameStatus: (game: string, status: string) => void;
  setOnlineUsers: (users: User[]) => void;
  addOnlineUser: (user: User) => void;
  removeOnlineUser: (userId: string) => void;
  setVoiceState: (userId: string, voiceState: VoiceState) => void;
  removeVoiceState: (userId: string) => void;
  setTypingUsers: (channelId: string, users: TypingUser[]) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  onlineUsers: [],
  voiceStates: new Map(),
  typingUsers: new Map(),

  connect: (token: string) => {
    const { socket: existingSocket } = get();
    
    // Disconnect existing socket if any
    if (existingSocket) {
      existingSocket.removeAllListeners();
      existingSocket.disconnect();
    }

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      auth: {
        token,
      },
      transports: ['websocket'],
      forceNew: true, // Force new connection to avoid caching issues
    });

    // Connection events
    socket.on('connect', () => {
      console.log('🔌 Connected to server with socket ID:', socket.id);
      set({ isConnected: true });
      toast.success('Connected to chat server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      set({ isConnected: false, onlineUsers: [] });
      toast.error('Disconnected from chat server');
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      set({ isConnected: false });
      toast.error('Failed to connect to chat server');
    });

    // User presence events
    socket.on('users:online', (users: User[]) => {
      set({ onlineUsers: users });
    });

    socket.on('user:online', (user: User) => {
      const { addOnlineUser } = get();
      addOnlineUser(user);
    });

    socket.on('user:offline', (userId: string) => {
      const { removeOnlineUser } = get();
      removeOnlineUser(userId);
    });

    socket.on('user:status_updated', (data: { userId: string; status: string; gameStatus?: any }) => {
      const { onlineUsers } = get();
      const updatedUsers = onlineUsers.map(user => 
        user._id === data.userId 
          ? { ...user, status: data.status as User['status'], gameStatus: data.gameStatus || user.gameStatus }
          : user
      );
      set({ onlineUsers: updatedUsers });
    });

    // Voice channel events
    socket.on('voice:user_joined', (data: { userId: string; voiceState: VoiceState }) => {
      const { setVoiceState } = get();
      setVoiceState(data.userId, data.voiceState);
    });

    socket.on('voice:user_left', (data: { userId: string }) => {
      const { removeVoiceState } = get();
      removeVoiceState(data.userId);
    });

    socket.on('voice:state_updated', (data: { userId: string; voiceState: VoiceState }) => {
      const { setVoiceState } = get();
      setVoiceState(data.userId, data.voiceState);
    });

    // Typing events
    socket.on('typing:start', (data: { channelId: string; users: TypingUser[] }) => {
      const { setTypingUsers } = get();
      setTypingUsers(data.channelId, data.users);
    });

    socket.on('typing:stop', (data: { channelId: string; users: TypingUser[] }) => {
      const { setTypingUsers } = get();
      setTypingUsers(data.channelId, data.users);
    });

    // Message events for real-time updates
    socket.on('newMessage', (message: Message) => {
      console.log('📨 New message received via socket:', {
        messageId: message._id,
        content: message.content,
        author: typeof message.author === 'string' ? message.author : message.author.username,
        channel: message.channel,
        timestamp: message.createdAt
      });
      // Add message to store
      const { addMessage } = useMessageStore.getState();
      addMessage(message);
      console.log('✅ Message added to store via socket');
    });

    socket.on('messageUpdated', (message: Message) => {
      console.log('✏️ Message updated:', message);
      useMessageStore.getState().updateMessage(message);
    });

    socket.on('messageDeleted', (messageId: string) => {
      console.log('🗑️ Message deleted:', messageId);
      useMessageStore.getState().removeMessage(messageId);
    });

    // Error events
    socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'An error occurred');
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, onlineUsers: [] });
    }
  },

  joinChannel: (channelId: string) => {
    const { socket } = get();
    if (socket && socket.connected) {
      console.log('🏠 Joining channel:', channelId);
      socket.emit('joinChannel', { channelId });
    } else {
      console.error('❌ Cannot join channel: socket not connected');
    }
  },

  leaveChannel: (channelId: string) => {
    const { socket } = get();
    if (socket && socket.connected) {
      console.log('🚪 Leaving channel:', channelId);
      socket.emit('leaveChannel', { channelId });
    } else {
      console.error('❌ Cannot leave channel: socket not connected');
    }
  },

  switchChannel: (oldChannelId: string | null, newChannelId: string) => {
    const { socket } = get();
    if (socket && socket.connected) {
      console.log('🔄 Switching channel from', oldChannelId, 'to', newChannelId);
      
      // Leave old channel if exists
      if (oldChannelId) {
        console.log('🚪 Leaving old channel:', oldChannelId);
        socket.emit('leaveChannel', { channelId: oldChannelId });
      }
      
      // Join new channel
      console.log('🏠 Joining new channel:', newChannelId);
      socket.emit('joinChannel', { channelId: newChannelId });
      
      // Clear messages from message store for the new channel
      const { clearMessages, fetchMessages } = useMessageStore.getState();
      console.log('🧹 Clearing messages and fetching for new channel');
      clearMessages();
      fetchMessages(newChannelId);
    } else {
      console.error('❌ Cannot switch channel: socket not connected');
    }
  },

  joinVoiceChannel: (channelId: string) => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit('voice:join', { channelId });
    }
  },

  leaveVoiceChannel: () => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit('voice:leave');
    }
  },

  startTyping: (channelId: string) => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit('typing:start', { channelId });
    }
  },

  stopTyping: (channelId: string) => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit('typing:stop', { channelId });
    }
  },

  updateStatus: (status: string) => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit('user:update_status', { status });
    }
  },

  updateGameStatus: (game: string, status: string) => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit('user:update_game_status', { game, status });
    }
  },

  setOnlineUsers: (users: User[]) => {
    set({ onlineUsers: users });
  },

  addOnlineUser: (user: User) => {
    const { onlineUsers } = get();
    const exists = onlineUsers.find(u => u._id === user._id);
    if (!exists) {
      set({ onlineUsers: [...onlineUsers, user] });
    }
  },

  removeOnlineUser: (userId: string) => {
    const { onlineUsers } = get();
    const filteredUsers = onlineUsers.filter(user => user._id !== userId);
    set({ onlineUsers: filteredUsers });
  },

  setVoiceState: (userId: string, voiceState: VoiceState) => {
    const { voiceStates } = get();
    const newVoiceStates = new Map(voiceStates);
    newVoiceStates.set(userId, voiceState);
    set({ voiceStates: newVoiceStates });
  },

  removeVoiceState: (userId: string) => {
    const { voiceStates } = get();
    const newVoiceStates = new Map(voiceStates);
    newVoiceStates.delete(userId);
    set({ voiceStates: newVoiceStates });
  },

  setTypingUsers: (channelId: string, users: TypingUser[]) => {
    const { typingUsers } = get();
    const newTypingUsers = new Map(typingUsers);
    newTypingUsers.set(channelId, users);
    set({ typingUsers: newTypingUsers });
  },
}));

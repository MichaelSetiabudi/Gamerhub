import { create } from 'zustand';
import { Message } from '@/types';
import { api } from '@/lib/api';

interface MessageState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
  currentChannelId: string | null;
}

interface MessageActions {
  fetchMessages: (channelId: string, page?: number) => Promise<void>;
  sendMessage: (channelId: string, content: string, replyTo?: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  clearMessages: () => void;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  removeMessage: (messageId: string) => void;
}

export const useMessageStore = create<MessageState & MessageActions>((set, get) => ({
  // State
  messages: [],
  isLoading: false,
  error: null,
  hasMore: true,
  currentPage: 1,
  currentChannelId: null,

  // Actions
  fetchMessages: async (channelId: string, page = 1) => {
    const currentState = get();
    
    // If switching to a different channel, clear messages first
    if (currentState.currentChannelId !== channelId) {
      console.log('📋 Switching to different channel, clearing messages');
      set({ 
        messages: [], 
        currentPage: 1, 
        hasMore: true, 
        currentChannelId: channelId,
        error: null 
      });
    }
    
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/messages/${channelId}`, {
        params: { page, limit: 50 }
      });
      
      const newMessages = response.data.data.messages;
      const pagination = response.data.data.pagination;

      set(state => ({
        messages: page === 1 ? newMessages : [...state.messages, ...newMessages],
        hasMore: pagination.hasNext,
        currentPage: page,
        currentChannelId: channelId,
        isLoading: false
      }));
      
      console.log(`📨 Loaded ${newMessages.length} messages for channel ${channelId}`);
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch messages',
        isLoading: false 
      });
    }
  },

  sendMessage: async (channelId: string, content: string, replyTo?: string) => {
    try {
      console.log('📤 Sending message to channel:', channelId);
      
      const response = await api.post(`/messages/${channelId}`, {
        content,
        replyTo
      });
      
      const newMessage = response.data.data.message;
      console.log('✅ Message sent successfully via API');
      
      // Add optimistic update - this will be overridden if socket delivers the same message
      set(state => {
        // Check if message already exists (from socket)
        const exists = state.messages.some(msg => msg._id === newMessage._id);
        if (!exists) {
          console.log('📝 Adding optimistic message update');
          return {
            messages: [...state.messages, newMessage]
          };
        }
        return state;
      });
      
      // Fallback: If socket doesn't deliver message within 2 seconds, refetch
      setTimeout(async () => {
        const currentState = get();
        const messageExists = currentState.messages.some(msg => msg._id === newMessage._id);
        if (!messageExists) {
          console.log('⚠️ Socket message not received, refetching messages...');
          await get().fetchMessages(channelId);
        }
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Failed to send message:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to send message'
      });
      throw error;
    }
  },

  editMessage: async (messageId: string, content: string) => {
    try {
      const response = await api.put(`/messages/${messageId}`, { content });
      const updatedMessage = response.data.data.message;
      
      set(state => ({
        messages: state.messages.map(msg => 
          msg._id === messageId ? updatedMessage : msg
        )
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to edit message'
      });
      throw error;
    }
  },

  deleteMessage: async (messageId: string) => {
    try {
      await api.delete(`/messages/${messageId}`);
      
      set(state => ({
        messages: state.messages.filter(msg => msg._id !== messageId)
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to delete message'
      });
      throw error;
    }
  },

  addReaction: async (messageId: string, emoji: string) => {
    try {
      await api.post(`/messages/${messageId}/react`, { emoji });
      
      // Update will come through socket
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to add reaction'
      });
      throw error;
    }
  },

  removeReaction: async (messageId: string, emoji: string) => {
    try {
      await api.delete(`/messages/${messageId}/react`, { 
        data: { emoji } 
      });
      
      // Update will come through socket
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to remove reaction'
      });
      throw error;
    }
  },

  clearMessages: () => {
    set({ 
      messages: [], 
      currentPage: 1, 
      hasMore: true,
      currentChannelId: null,
      error: null 
    });
  },

  addMessage: (message: Message) => {
    set(state => {
      // Only add message if it belongs to current channel
      const messageChannelId = message.channel;
      if (state.currentChannelId !== messageChannelId) {
        console.log('⚠️ Ignoring message for different channel:', messageChannelId, 'current:', state.currentChannelId);
        return state;
      }
      
      // Check if message already exists to prevent duplicates
      const exists = state.messages.some(msg => msg._id === message._id);
      if (exists) {
        console.log('⚠️ Duplicate message detected, skipping:', message._id);
        return state;
      }
      
      console.log('✅ Adding new message to store via socket:', message._id);
      
      // Remove any temporary optimistic message with same content and author
      // to prevent duplicates from optimistic updates
      const filteredMessages = state.messages.filter(msg => {
        if (msg._id === message._id) return false; // Exact duplicate
        
        // Remove optimistic duplicates (same content, same author, within 5 seconds)
        const isSameAuthor = (typeof msg.author === 'string' ? msg.author : msg.author._id) === 
                           (typeof message.author === 'string' ? message.author : message.author._id);
        const isSameContent = msg.content === message.content;
        const isRecent = new Date(message.createdAt).getTime() - new Date(msg.createdAt).getTime() < 5000;
        
        if (isSameAuthor && isSameContent && isRecent) {
          console.log('🔄 Replacing optimistic message with socket message');
          return false;
        }
        
        return true;
      });
      
      return {
        messages: [...filteredMessages, message]
      };
    });
  },

  updateMessage: (message: Message) => {
    set(state => ({
      messages: state.messages.map(msg => 
        msg._id === message._id ? message : msg
      )
    }));
  },

  removeMessage: (messageId: string) => {
    set(state => ({
      messages: state.messages.filter(msg => msg._id !== messageId)
    }));
  },
}));

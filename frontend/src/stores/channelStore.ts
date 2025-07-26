import { create } from 'zustand';
import { Channel } from '@/types';
import { api } from '@/lib/api';

interface ChannelState {
  channels: Channel[];
  currentChannel: Channel | null;
  isLoading: boolean;
  error: string | null;
}

interface ChannelActions {
  setCurrentChannel: (channel: Channel | null) => void;
  fetchChannels: () => Promise<void>;
  createChannel: (channelData: Partial<Channel>) => Promise<Channel>;
  updateChannel: (channelId: string, updates: Partial<Channel>) => Promise<void>;
  deleteChannel: (channelId: string) => Promise<void>;
  joinChannel: (channelId: string) => Promise<void>;
  leaveChannel: (channelId: string) => Promise<void>;
}

export const useChannelStore = create<ChannelState & ChannelActions>((set, get) => ({
  // State
  channels: [],
  currentChannel: null,
  isLoading: false,
  error: null,

  // Actions
  setCurrentChannel: (channel) => {
    set({ currentChannel: channel });
  },

  fetchChannels: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/channels');
      set({ 
        channels: response.data.data.channels,
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch channels',
        isLoading: false 
      });
    }
  },

  createChannel: async (channelData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/channels', channelData);
      const newChannel = response.data.data.channel;
      
      set(state => ({
        channels: [...state.channels, newChannel],
        isLoading: false
      }));
      
      return newChannel;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to create channel',
        isLoading: false 
      });
      throw error;
    }
  },

  updateChannel: async (channelId, updates) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/channels/${channelId}`, updates);
      const updatedChannel = response.data.data.channel;
      
      set(state => ({
        channels: state.channels.map(ch => 
          ch._id === channelId ? updatedChannel : ch
        ),
        currentChannel: state.currentChannel?._id === channelId 
          ? updatedChannel 
          : state.currentChannel,
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to update channel',
        isLoading: false 
      });
      throw error;
    }
  },

  deleteChannel: async (channelId) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/channels/${channelId}`);
      
      set(state => ({
        channels: state.channels.filter(ch => ch._id !== channelId),
        currentChannel: state.currentChannel?._id === channelId 
          ? null 
          : state.currentChannel,
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to delete channel',
        isLoading: false 
      });
      throw error;
    }
  },

  joinChannel: async (channelId) => {
    try {
      await api.post(`/channels/${channelId}/join`);
      
      // Refetch channels to get updated membership
      get().fetchChannels();
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to join channel'
      });
      throw error;
    }
  },

  leaveChannel: async (channelId) => {
    try {
      await api.post(`/channels/${channelId}/leave`);
      
      // Refetch channels and clear current if left
      const { currentChannel } = get();
      if (currentChannel?._id === channelId) {
        set({ currentChannel: null });
      }
      
      get().fetchChannels();
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to leave channel'
      });
      throw error;
    }
  },
}));

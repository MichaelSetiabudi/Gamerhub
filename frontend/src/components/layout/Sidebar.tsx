'use client';

import { useState, useEffect } from 'react';
import { useChannelStore } from '@/stores/channelStore';
import { useAuthStore } from '@/stores/authStore';
import { useSocketStore } from '@/stores/socketStore';
import { 
  Hash, 
  Volume2, 
  Settings, 
  LogOut, 
  Plus,
  Users,
  MessageCircle,
  UserPlus,
  UserMinus
} from 'lucide-react';
import { Channel, ChannelType, ChannelAccessType } from '@/types';
import toast from 'react-hot-toast';

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { channels, currentChannel, setCurrentChannel, fetchChannels, createChannel, joinChannel, leaveChannel } = useChannelStore();
  const { socket, switchChannel } = useSocketStore();
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<ChannelAccessType>('public');

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const handleChannelSelect = (channel: Channel) => {
    const oldChannelId = currentChannel?._id || null;
    setCurrentChannel(channel);
    switchChannel(oldChannelId, channel._id);
  };

  const handleJoinChannel = async (channelId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent channel selection
    try {
      await joinChannel(channelId);
      await fetchChannels(); // Refresh channels to update membership
      toast.success('Successfully joined channel!');
    } catch (error) {
      console.error('Failed to join channel:', error);
      toast.error('Failed to join channel');
    }
  };

  const handleLeaveChannel = async (channelId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent channel selection
    try {
      await leaveChannel(channelId);
      if (currentChannel?._id === channelId) {
        setCurrentChannel(null); // Clear current channel if leaving it
      }
      await fetchChannels(); // Refresh channels to update membership
      toast.success('Successfully left channel!');
    } catch (error) {
      console.error('Failed to leave channel:', error);
      toast.error('Failed to leave channel');
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    
    try {
      console.log('🔄 Creating channel:', newChannelName);
      const createdChannel = await createChannel({
        name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
        displayName: newChannelName,
        type: newChannelType,
        category: 'general'
      });
      console.log('✅ Channel created successfully:', createdChannel);
      setShowCreateChannel(false);
      setNewChannelName('');
      setNewChannelType('public');
      // Refresh channels list
      await fetchChannels();
    } catch (error) {
      console.error('❌ Failed to create channel:', error);
    }
  };

  const handleLogout = () => {
    logout();
  };

  // Group channels by category
  const groupedChannels = channels.reduce((acc, channel) => {
    // Capitalize first letter for display
    const category = channel.category 
      ? channel.category.charAt(0).toUpperCase() + channel.category.slice(1).replace(/-/g, ' ')
      : 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(channel);
    return acc;
  }, {} as Record<string, Channel[]>);

  const getChannelIcon = (channelType?: ChannelType) => {
    switch (channelType) {
      case 'voice':
        return <Volume2 className="w-4 h-4" />;
      case 'text':
      default:
        return <Hash className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-discord-dark-secondary">
      {/* Server Header */}
      <div className="h-12 flex items-center px-4 border-b border-discord-dark-tertiary bg-discord-dark-primary">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-discord-blurple rounded-full flex items-center justify-center text-white font-bold">
            GH
          </div>
          <span className="font-bold text-discord-text-primary">
            Gamer's Hub
          </span>
        </div>
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedChannels).map(([category, categoryChannels]) => (
          <div key={category} className="mb-4">
            {/* Category Header */}
            <div className="flex items-center justify-between px-4 py-2">
              <h3 className="text-xs font-semibold text-discord-text-muted uppercase tracking-wide">
                {category}
              </h3>
              <button
                onClick={() => setShowCreateChannel(true)}
                className="text-discord-text-muted hover:text-discord-text-primary transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Channel List */}
            <div className="space-y-1 px-2">
              {categoryChannels.map((channel) => (
                <div key={channel._id} className="group">
                  <div
                    className={`w-full flex items-center justify-between px-2 py-1 rounded transition-colors ${
                      currentChannel?._id === channel._id
                        ? 'bg-discord-dark-tertiary text-discord-text-primary'
                        : 'text-discord-text-muted hover:bg-discord-dark-tertiary hover:text-discord-text-primary'
                    }`}
                  >
                    <button
                      onClick={() => handleChannelSelect(channel)}
                      className="flex items-center space-x-2 flex-1 text-left"
                    >
                      {getChannelIcon(channel.channelType)}
                      <span className="text-sm font-medium truncate">
                        {channel.displayName || channel.name}
                      </span>
                      {channel.type === 'private' && (
                        <div className="w-1 h-1 bg-discord-green rounded-full"></div>
                      )}
                    </button>
                    
                    {/* Join/Leave Button */}
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(channel as any).isMember ? (
                        <button
                          onClick={(e) => handleLeaveChannel(channel._id, e)}
                          className="p-1 text-discord-text-muted hover:text-red-400 transition-colors"
                          title="Leave channel"
                        >
                          <UserMinus className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => handleJoinChannel(channel._id, e)}
                          className="p-1 text-discord-text-muted hover:text-discord-green transition-colors"
                          title="Join channel"
                        >
                          <UserPlus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Direct Messages Section */}
      <div className="border-t border-discord-dark-tertiary">
        <div className="flex items-center justify-between px-4 py-2">
          <h3 className="text-xs font-semibold text-discord-text-muted uppercase tracking-wide">
            Direct Messages
          </h3>
          <button className="text-discord-text-muted hover:text-discord-text-primary transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="px-2 pb-4">
          <button className="w-full flex items-center space-x-2 px-2 py-1 rounded text-left text-discord-text-muted hover:bg-discord-dark-tertiary hover:text-discord-text-primary transition-colors">
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Find conversations</span>
          </button>
        </div>
      </div>

      {/* User Info */}
      <div className="h-14 flex items-center justify-between px-4 bg-discord-dark-primary border-t border-discord-dark-tertiary">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="relative">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
              alt={user?.username}
              className="w-8 h-8 rounded-full"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-discord-green rounded-full border-2 border-discord-dark-primary"></div>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-discord-text-primary truncate">
              {user?.username}
            </div>
            <div className="text-xs text-discord-text-muted">
              Online
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button className="p-1 text-discord-text-muted hover:text-discord-text-primary transition-colors">
            <Settings className="w-4 h-4" />
          </button>
          <button 
            onClick={handleLogout}
            className="p-1 text-discord-text-muted hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-discord-dark-primary rounded-lg p-6 w-96 max-w-md mx-4">
            <h2 className="text-xl font-bold text-discord-text-primary mb-4">
              Create Channel
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-discord-text-muted mb-2">
                  Channel Name
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="new-channel"
                  className="w-full px-3 py-2 bg-discord-dark-tertiary border border-discord-dark-quaternary rounded text-discord-text-primary focus:outline-none focus:border-discord-blurple"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-discord-text-muted mb-2">
                  Channel Type
                </label>
                <select
                  value={newChannelType}
                  onChange={(e) => setNewChannelType(e.target.value as ChannelAccessType)}
                  className="w-full px-3 py-2 bg-discord-dark-tertiary border border-discord-dark-quaternary rounded text-discord-text-primary focus:outline-none focus:border-discord-blurple"
                >
                  <option value="public">Public Channel</option>
                  <option value="private">Private Channel</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateChannel(false);
                  setNewChannelName('');
                  setNewChannelType('public');
                }}
                className="px-4 py-2 text-discord-text-muted hover:text-discord-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChannel}
                disabled={!newChannelName.trim()}
                className="px-4 py-2 bg-discord-blurple text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-discord-blurple-dark transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

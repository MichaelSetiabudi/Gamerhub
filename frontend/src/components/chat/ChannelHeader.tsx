'use client';

import { Channel } from '@/types';
import { Hash, Volume2, Users, Settings } from 'lucide-react';

interface ChannelHeaderProps {
  channel: Channel;
}

export function ChannelHeader({ channel }: ChannelHeaderProps) {
  const getChannelIcon = () => {
    return channel.channelType === 'voice' ? (
      <Volume2 className="w-5 h-5" />
    ) : (
      <Hash className="w-5 h-5" />
    );
  };

  return (
    <div className="h-full flex items-center justify-between px-4">
      <div className="flex items-center space-x-3">
        <div className="text-discord-text-muted">
          {getChannelIcon()}
        </div>
        <div>
          <h1 className="text-discord-text-primary font-bold">
            {channel.displayName || channel.name}
          </h1>
          {channel.description && (
            <p className="text-xs text-discord-text-muted">
              {channel.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1 text-discord-text-muted">
          <Users className="w-4 h-4" />
          <span className="text-sm">{channel.memberCount || 0}</span>
        </div>
        <button className="p-1 text-discord-text-muted hover:text-discord-text-primary transition-colors">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

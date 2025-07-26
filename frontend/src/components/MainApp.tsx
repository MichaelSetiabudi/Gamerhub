'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSocketStore } from '@/stores/socketStore';
import { LandingPage } from '@/components/landing';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { UserList } from '@/components/chat/UserList';
import { ChannelHeader } from '@/components/chat/ChannelHeader';
import { useChannelStore } from '@/stores/channelStore';

export default function MainApp() {
  const { user, token, isAuthenticated } = useAuthStore();
  const { socket, connect, disconnect } = useSocketStore();
  const { currentChannel } = useChannelStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated && user && token && !socket) {
      connect(token);
    } else if (!isAuthenticated && socket) {
      disconnect();
    }
  }, [isAuthenticated, user, token, socket, connect, disconnect]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-discord-dark-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-discord-blurple"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-discord-dark-primary flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-60 flex-shrink-0 bg-discord-dark-secondary border-r border-discord-dark-tertiary">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel Header */}
        {currentChannel && (
          <div className="h-12 flex-shrink-0 bg-discord-dark-primary border-b border-discord-dark-tertiary">
            <ChannelHeader channel={currentChannel} />
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex min-h-0">
          {/* Chat Window */}
          <div className="flex-1 flex flex-col min-w-0">
            {currentChannel ? (
              <ChatWindow channel={currentChannel} />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4 text-discord-text-muted">🎮</div>
                  <h2 className="text-2xl font-bold text-discord-text-primary mb-2">
                    Welcome to Gamer's Hub!
                  </h2>
                  <p className="text-discord-text-muted max-w-md">
                    Select a channel from the sidebar to start chatting with fellow gamers.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* User List */}
          {currentChannel && (
            <div className="w-60 flex-shrink-0 bg-discord-dark-secondary border-l border-discord-dark-tertiary">
              <UserList channel={currentChannel} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

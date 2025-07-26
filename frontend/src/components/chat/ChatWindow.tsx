'use client';

import { useState, useEffect, useRef } from 'react';
import { Channel, Message } from '@/types';
import { useMessageStore } from '@/stores/messageStore';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

interface ChatWindowProps {
  channel: Channel;
}

export function ChatWindow({ channel }: ChatWindowProps) {
  const { 
    messages, 
    isLoading, 
    currentChannelId,
    sendMessage 
  } = useMessageStore();
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Only auto-scroll when new messages arrive for current channel
  useEffect(() => {
    if (scrollRef.current && currentChannelId === channel._id) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      if (isNearBottom) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [messages, currentChannelId, channel._id]);

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(channel._id, content);
      // Scroll to bottom after sending
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const threshold = 100; // pixels from bottom
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < threshold);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages Area */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-discord-blurple"></div>
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
      </div>

      {/* Scroll to Bottom Button */}
      {!isAtBottom && (
        <div className="absolute bottom-20 right-8">
          <button
            onClick={() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            }}
            className="bg-discord-blurple text-white p-2 rounded-full shadow-lg hover:bg-discord-blurple-dark transition-colors"
          >
            ↓
          </button>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-discord-dark-tertiary">
        <MessageInput 
          onSendMessage={handleSendMessage}
          placeholder={`Message #${channel.name}`}
        />
      </div>
    </div>
  );
}

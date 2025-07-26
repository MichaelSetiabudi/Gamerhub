'use client';

import { Message } from '@/types';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 text-discord-text-muted">💬</div>
          <h3 className="text-lg font-semibold text-discord-text-primary mb-2">
            No messages yet
          </h3>
          <p className="text-discord-text-muted">
            Be the first to send a message in this channel!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        const prevMessage = index > 0 ? messages[index - 1] : null;
        
        // Helper function to get author ID
        const getAuthorId = (msg: Message) => {
          return typeof msg.author === 'string' ? msg.author : msg.author._id;
        };
        
        const showHeader = !prevMessage || 
          getAuthorId(prevMessage) !== getAuthorId(message) ||
          (new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) > 300000; // 5 minutes

        return (
          <MessageItem 
            key={message._id} 
            message={message} 
            showHeader={showHeader}
          />
        );
      })}
    </div>
  );
}

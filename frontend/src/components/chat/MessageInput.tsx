'use client';

import { useState } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageInput({ 
  onSendMessage, 
  placeholder = "Type a message...", 
  disabled = false 
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Simple typing indicator logic
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
      // TODO: Emit typing event
    } else if (isTyping && e.target.value.length === 0) {
      setIsTyping(false);
      // TODO: Emit stop typing event
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end space-x-3">
      <button
        type="button"
        className="p-2 text-discord-text-muted hover:text-discord-text-primary transition-colors"
      >
        <Paperclip className="w-5 h-5" />
      </button>

      <div className="flex-1 relative">
        <textarea
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="w-full px-4 py-3 bg-discord-dark-tertiary border border-discord-dark-quaternary rounded-lg text-discord-text-primary placeholder-discord-text-muted resize-none focus:outline-none focus:border-discord-blurple disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            minHeight: '44px',
            maxHeight: '120px',
          }}
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          <button
            type="button"
            className="p-1 text-discord-text-muted hover:text-discord-text-primary transition-colors"
          >
            <Smile className="w-4 h-4" />
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={!message.trim() || disabled}
        className="p-2 bg-discord-blurple text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-discord-blurple-dark transition-colors"
      >
        <Send className="w-5 h-5" />
      </button>
    </form>
  );
}

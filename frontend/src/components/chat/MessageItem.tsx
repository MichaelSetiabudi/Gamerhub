'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Message, User } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { MoreHorizontal, Reply, Edit, Trash2, Heart } from 'lucide-react';

interface MessageItemProps {
  message: Message;
  showHeader: boolean;
}

export function MessageItem({ message, showHeader }: MessageItemProps) {
  const { user: currentUser } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const author = message.author as User;
  const isOwnMessage = currentUser?._id === author._id;

  const formatTime = (date: string) => {
    return format(new Date(date), 'HH:mm');
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'MMM d, yyyy');
  };

  const handleReaction = () => {
    // TODO: Implement reaction
  };

  const handleReply = () => {
    // TODO: Implement reply
  };

  const handleEdit = () => {
    // TODO: Implement edit
  };

  const handleDelete = () => {
    // TODO: Implement delete
  };

  return (
    <div 
      className={`group relative px-4 py-1 hover:bg-discord-dark-tertiary hover:bg-opacity-50 transition-colors ${
        showHeader ? 'mt-4' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex space-x-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {showHeader ? (
            <img
              src={author.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.username}`}
              alt={author.username}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 flex items-center justify-center">
              <span className="text-xs text-discord-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                {formatTime(message.createdAt)}
              </span>
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          {showHeader && (
            <div className="flex items-baseline space-x-2 mb-1">
              <span className="font-semibold text-discord-text-primary">
                {author.username}
              </span>
              <span className="text-xs text-discord-text-muted">
                {formatDate(message.createdAt)} at {formatTime(message.createdAt)}
              </span>
            </div>
          )}

          {/* Reply To */}
          {message.replyTo && (
            <div className="flex items-center space-x-2 mb-2 text-sm text-discord-text-muted">
              <div className="w-4 h-4 border-l-2 border-t-2 border-discord-text-muted rounded-tl-md"></div>
              <span>Replying to message</span>
            </div>
          )}

          {/* Message Text */}
          <div className="text-discord-text-primary">
            {message.content}
            {message.isEdited && (
              <span className="text-xs text-discord-text-muted ml-2">
                (edited)
              </span>
            )}
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.reactions.map((reaction, index) => (
                <button
                  key={index}
                  onClick={handleReaction}
                  className="flex items-center space-x-1 px-2 py-1 bg-discord-dark-quaternary rounded text-xs text-discord-text-muted hover:bg-discord-dark-tertiary transition-colors"
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Actions */}
      {isHovered && (
        <div className="absolute top-0 right-4 -mt-2 bg-discord-dark-primary border border-discord-dark-tertiary rounded shadow-lg flex items-center">
          <button
            onClick={handleReaction}
            className="p-2 text-discord-text-muted hover:text-discord-text-primary transition-colors"
            title="Add Reaction"
          >
            <Heart className="w-4 h-4" />
          </button>
          <button
            onClick={handleReply}
            className="p-2 text-discord-text-muted hover:text-discord-text-primary transition-colors"
            title="Reply"
          >
            <Reply className="w-4 h-4" />
          </button>
          {isOwnMessage && (
            <>
              <button
                onClick={handleEdit}
                className="p-2 text-discord-text-muted hover:text-discord-text-primary transition-colors"
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-discord-text-muted hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-discord-text-muted hover:text-discord-text-primary transition-colors"
            title="More"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

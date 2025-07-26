// Socket event types
export interface SocketEvents {
  // Connection events
  connect: () => void
  disconnect: () => void
  error: (error: string) => void
  
  // User events
  userOnline: (data: { userId: string; username: string; avatar: string }) => void
  userOffline: (data: { userId: string; username: string }) => void
  userStatusUpdate: (data: { userId: string; status: string; customStatus: string; isOnline: boolean }) => void
  onlineUsersUpdate: (data: { onlineCount: number; users: any[] }) => void
  
  // Channel events
  channelCreated: (channel: any) => void
  channelUpdated: (channel: any) => void
  channelDeleted: (data: { channelId: string }) => void
  memberJoined: (data: { channelId: string; user: any }) => void
  memberLeft: (data: { channelId: string; user: any }) => void
  joinedChannel: (channel: any) => void
  leftChannel: (data: { channelId: string }) => void
  
  // Message events
  newMessage: (message: any) => void
  messageUpdated: (message: any) => void
  messageDeleted: (data: { messageId: string; channelId: string }) => void
  messageReaction: (data: { messageId: string; emoji: string; userId: string; action: 'add' | 'remove' }) => void
  
  // Typing events
  userTyping: (data: { userId: string; username: string; channelId: string }) => void
  userStoppedTyping: (data: { userId: string; channelId: string }) => void
  
  // DM events
  newDirectMessage: (data: { message: any; conversationId: string }) => void
  directMessageUpdated: (data: { message: any; conversationId: string }) => void
  directMessageDeleted: (data: { messageId: string; conversationId: string }) => void
  userTypingDM: (data: { userId: string; username: string; conversationId: string }) => void
  userStoppedTypingDM: (data: { userId: string; conversationId: string }) => void
  
  // Notification events
  mentioned: (data: { message: any; channelId: string; channelName: string }) => void
  notification: (notification: any) => void
  
  // Ping/Pong for connection health
  ping: () => void
  pong: () => void
}

// Socket emit events
export interface SocketEmitEvents {
  // Channel management
  joinChannel: (data: { channelId: string }) => void
  leaveChannel: (data: { channelId: string }) => void
  
  // Typing indicators
  typing: (data: { channelId?: string; conversationId?: string; type: 'channel' | 'dm' }) => void
  stopTyping: (data: { channelId?: string; conversationId?: string; type: 'channel' | 'dm' }) => void
  
  // Status updates
  updateStatus: (data: { status: string; customStatus?: string }) => void
  
  // DM management
  joinConversation: (data: { conversationId: string }) => void
  leaveConversation: (data: { conversationId: string }) => void
  
  // Connection health
  ping: () => void
}

// Typing indicator types
export interface TypingUser {
  userId: string
  username: string
  avatar?: string
}

export interface TypingState {
  channelId?: string
  conversationId?: string
  users: TypingUser[]
  timeout?: NodeJS.Timeout
}

// Voice channel types
export interface VoiceState {
  channelId: string
  isMuted: boolean
  isDeafened: boolean
  isSpeaking: boolean
  joinedAt: string
}

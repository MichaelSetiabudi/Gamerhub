import { User } from './user'

export interface Message {
  _id: string
  content: string
  author: string | User
  channel: string
  type: 'text' | 'image' | 'file' | 'system'
  mentions: MessageMention[]
  attachments: MessageAttachment[]
  embeds: MessageEmbed[]
  isEdited: boolean
  editedAt?: string
  isDeleted: boolean
  deletedAt?: string
  deletedBy?: string
  reactions: MessageReaction[]
  isPinned: boolean
  pinnedBy?: string
  pinnedAt?: string
  replyTo?: string | Message
  thread: string[]
  systemData?: any
  createdAt: string
  updatedAt: string
}

export interface MessageMention {
  user: string | User
  username: string
}

export interface MessageAttachment {
  filename: string
  url: string
  size: number
  mimetype: string
}

export interface MessageEmbed {
  title?: string
  description?: string
  url?: string
  color?: string
  thumbnail?: string
  image?: string
  fields?: MessageEmbedField[]
}

export interface MessageEmbedField {
  name: string
  value: string
  inline: boolean
}

export interface MessageReaction {
  emoji: string
  users: string[]
  count: number
}

export interface SendMessageData {
  content: string
  type?: 'text' | 'image' | 'file'
  replyTo?: string
}

export interface EditMessageData {
  content: string
}

// Direct Messages
export interface DirectMessageConversation {
  _id: string
  participants: (string | User)[]
  lastMessage?: string | DirectMessage
  lastActivity: string
  readStatus: ConversationReadStatus[]
  isBlocked: boolean
  blockedBy?: string
  isMuted: ConversationMute[]
  createdAt: string
  updatedAt: string
  // Virtual fields
  otherParticipant?: User
  unreadCount?: number
}

export interface ConversationReadStatus {
  user: string
  lastRead: string
  unreadCount: number
}

export interface ConversationMute {
  user: string
  mutedUntil?: string
}

export interface DirectMessage {
  _id: string
  content: string
  sender: string | User
  conversation: string
  type: 'text' | 'image' | 'file' | 'system'
  attachments: MessageAttachment[]
  isEdited: boolean
  editedAt?: string
  isDeleted: boolean
  deletedAt?: string
  readBy: DirectMessageRead[]
  replyTo?: string | DirectMessage
  createdAt: string
  updatedAt: string
}

export interface DirectMessageRead {
  user: string
  readAt: string
}

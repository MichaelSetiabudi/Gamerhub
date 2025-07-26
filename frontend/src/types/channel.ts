import { User } from './user'

export type ChannelType = 'text' | 'voice';
export type ChannelAccessType = 'public' | 'private';

export interface Channel {
  _id: string
  name: string
  displayName: string
  description: string
  type: ChannelAccessType  // Changed from ChannelType to ChannelAccessType
  channelType?: ChannelType // Added for text/voice distinction
  category: 'general' | 'gaming' | 'valorant' | 'genshin-impact' | 'minecraft' | 'league-of-legends' | 'dota2' | 'csgo' | 'fortnite' | 'apex-legends' | 'other'
  game: string
  icon: string
  members: ChannelMember[]
  createdBy: string | User
  inviteCode?: string
  isInviteOnly: boolean
  isPrivate: boolean
  slowMode: number
  isNSFW: boolean
  messageHistory: boolean
  messageCount: number
  lastActivity: string
  pinnedMessages: string[]
  createdAt: string
  updatedAt: string
  // Virtual fields
  memberCount?: number
  onlineMemberCount?: number
  isMember?: boolean
  userRole?: string
}

export interface ChannelMember {
  user: string | User
  role: 'owner' | 'admin' | 'moderator' | 'member'
  joinedAt: string
}

export interface CreateChannelData {
  name: string
  displayName: string
  description?: string
  type: ChannelAccessType
  category: string
  game?: string
  icon?: string
  isInviteOnly?: boolean
}

export interface UpdateChannelData {
  displayName?: string
  description?: string
  category?: string
  game?: string
  icon?: string
  slowMode?: number
  isNSFW?: boolean
  isInviteOnly?: boolean
}

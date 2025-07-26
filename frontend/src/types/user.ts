export interface User {
  _id: string
  username: string
  email: string
  avatar: string
  status: 'online' | 'offline' | 'away' | 'busy'
  customStatus: string
  isOnline: boolean
  lastSeen: string
  joinedChannels: string[]
  favoriteGames: string[]
  profile?: {
    displayName?: string;
    bio?: string;
    favoriteGames?: string[];
    socialLinks?: {
      steam?: string;
      discord?: string;
      twitch?: string;
      youtube?: string;
      twitter?: string;
      instagram?: string;
      tiktok?: string;
    };
  };
  gameStatus?: {
    game?: string;
    status?: string;
    updatedAt?: Date;
  };
  gamerTags: {
    steam?: string
    discord?: string
    battlenet?: string
    epic?: string
  }
  theme: 'dark' | 'light' | 'auto'
  notifications: {
    mentions: boolean
    directMessages: boolean
    channelMessages: boolean
  }
  createdAt: string
  updatedAt: string
}

export interface UserProfile extends User {
  // Additional fields for profile page
}

export interface OnlineUser {
  userId: string
  username: string
  avatar: string
  status: string
  lastSeen?: string
}

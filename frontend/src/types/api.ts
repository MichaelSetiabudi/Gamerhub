export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  errors?: string[]
}

export interface PaginationParams {
  page?: number
  limit?: number
  sort?: string
}

export interface PaginationResponse {
  currentPage: number
  totalPages: number
  totalItems?: number
  totalUsers?: number
  totalChannels?: number
  totalMessages?: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ApiError {
  success: false
  message: string
  errors?: string[]
  status?: number
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  username: string
  email: string
  password: string
  confirmPassword: string
}

// Auth API types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: any
}

// Channel API types
export interface ChannelsQuery extends PaginationParams {
  type?: 'all' | 'public' | 'joined' | 'private'
  category?: string
}

export interface JoinChannelRequest {
  inviteCode?: string
}

// Message API types
export interface MessagesQuery extends PaginationParams {
  before?: string
}

export interface SearchMessagesQuery {
  q: string
  limit?: number
}

// User API types
export interface SearchUsersQuery extends PaginationParams {
  q: string
}

export interface UpdateProfileRequest {
  username?: string
  avatar?: string
  customStatus?: string
  favoriteGames?: string[]
  gamerTags?: {
    steam?: string
    discord?: string
    battlenet?: string
    epic?: string
  }
  theme?: 'dark' | 'light' | 'auto'
  notifications?: {
    mentions?: boolean
    directMessages?: boolean
    channelMessages?: boolean
  }
}

export interface UpdateStatusRequest {
  status?: 'online' | 'away' | 'busy' | 'offline'
  customStatus?: string
}

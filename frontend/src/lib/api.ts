import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import toast from 'react-hot-toast'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/'
      toast.error('Session expired. Please login again.')
    }
    
    // Handle network errors
    if (!error.response) {
      toast.error('Network error. Please check your connection.')
    }
    
    return Promise.reject(error)
  }
)

export { api }

// API helper functions
export const apiHelpers = {
  // Auth endpoints
  auth: {
    login: (email: string, password: string) =>
      api.post('/auth/login', { email, password }),
    register: (username: string, email: string, password: string) =>
      api.post('/auth/register', { username, email, password }),
    logout: () =>
      api.post('/auth/logout'),
    me: () =>
      api.get('/auth/me'),
    verifyToken: (token: string) =>
      api.post('/auth/verify-token', { token }),
  },

  // User endpoints
  users: {
    getProfile: () =>
      api.get('/users/profile'),
    updateProfile: (data: any) =>
      api.put('/users/profile', data),
    updateStatus: (status: string, customStatus?: string) =>
      api.put('/users/status', { status, customStatus }),
    search: (query: string, page = 1, limit = 20) =>
      api.get(`/users/search?q=${query}&page=${page}&limit=${limit}`),
    getById: (userId: string) =>
      api.get(`/users/${userId}`),
    getOnlineUsers: (page = 1, limit = 20) =>
      api.get(`/users/online?page=${page}&limit=${limit}`),
  },

  // Channel endpoints
  channels: {
    getAll: (params: any = {}) => {
      const searchParams = new URLSearchParams(params).toString()
      return api.get(`/channels?${searchParams}`)
    },
    create: (data: any) =>
      api.post('/channels', data),
    getById: (channelId: string) =>
      api.get(`/channels/${channelId}`),
    update: (channelId: string, data: any) =>
      api.put(`/channels/${channelId}`, data),
    delete: (channelId: string) =>
      api.delete(`/channels/${channelId}`),
    join: (channelId: string, inviteCode?: string) =>
      api.post(`/channels/${channelId}/join`, { inviteCode }),
    leave: (channelId: string) =>
      api.post(`/channels/${channelId}/leave`),
  },

  // Message endpoints
  messages: {
    getByChannel: (channelId: string, params: any = {}) => {
      const searchParams = new URLSearchParams(params).toString()
      return api.get(`/messages/${channelId}?${searchParams}`)
    },
    send: (channelId: string, data: any) =>
      api.post(`/messages/${channelId}`, data),
    edit: (messageId: string, content: string) =>
      api.put(`/messages/${messageId}`, { content }),
    delete: (messageId: string) =>
      api.delete(`/messages/${messageId}`),
    addReaction: (messageId: string, emoji: string) =>
      api.post(`/messages/${messageId}/react`, { emoji }),
    removeReaction: (messageId: string, emoji: string) =>
      api.delete(`/messages/${messageId}/react`, { data: { emoji } }),
    search: (channelId: string, query: string, limit = 20) =>
      api.get(`/messages/search/${channelId}?q=${query}&limit=${limit}`),
  },

  // Direct Message endpoints
  dm: {
    getConversations: (page = 1, limit = 20) =>
      api.get(`/dm/conversations?page=${page}&limit=${limit}`),
    createConversation: (userId: string) =>
      api.post('/dm/conversations', { userId }),
    getMessages: (conversationId: string, params: any = {}) => {
      const searchParams = new URLSearchParams(params).toString()
      return api.get(`/dm/${conversationId}/messages?${searchParams}`)
    },
    sendMessage: (conversationId: string, data: any) =>
      api.post(`/dm/${conversationId}/messages`, data),
    editMessage: (messageId: string, content: string) =>
      api.put(`/dm/messages/${messageId}`, { content }),
    deleteMessage: (messageId: string) =>
      api.delete(`/dm/messages/${messageId}`),
    markAsRead: (conversationId: string) =>
      api.post(`/dm/${conversationId}/mark-read`),
  },
}

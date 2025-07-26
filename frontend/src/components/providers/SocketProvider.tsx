'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthProvider'
import toast from 'react-hot-toast'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  onlineUsers: any[]
  typingUsers: Map<string, any[]>
  connect: () => void
  disconnect: () => void
  emit: (event: string, data?: any) => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

interface SocketProviderProps {
  children: React.ReactNode
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<any[]>([])
  const [typingUsers, setTypingUsers] = useState<Map<string, any[]>>(new Map())
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated && user) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [isAuthenticated, user])

  const connect = () => {
    if (socket?.connected) return

    const token = localStorage.getItem('token')
    if (!token) return

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000'
    
    const newSocket = io(socketUrl, {
      auth: {
        token
      },
      transports: ['websocket'],
      upgrade: true,
    })

    // Connection events
    newSocket.on('connect', () => {
      console.log('Socket connected')
      setIsConnected(true)
      toast.success('Connected to chat server')
    })

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected')
      setIsConnected(false)
      setOnlineUsers([])
      setTypingUsers(new Map())
    })

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setIsConnected(false)
      toast.error('Failed to connect to chat server')
    })

    // User events
    newSocket.on('onlineUsersUpdate', (data) => {
      setOnlineUsers(data.users || [])
    })

    // Typing events
    newSocket.on('userTyping', (data) => {
      const { channelId, userId, username } = data
      setTypingUsers(prev => {
        const newMap = new Map(prev)
        const channelTypers = newMap.get(channelId) || []
        
        if (!channelTypers.find(u => u.userId === userId)) {
          channelTypers.push({ userId, username })
          newMap.set(channelId, channelTypers)
        }
        
        return newMap
      })
    })

    newSocket.on('userStoppedTyping', (data) => {
      const { channelId, userId } = data
      setTypingUsers(prev => {
        const newMap = new Map(prev)
        const channelTypers = newMap.get(channelId) || []
        const filteredTypers = channelTypers.filter(u => u.userId !== userId)
        
        if (filteredTypers.length > 0) {
          newMap.set(channelId, filteredTypers)
        } else {
          newMap.delete(channelId)
        }
        
        return newMap
      })
    })

    // Error handling
    newSocket.on('error', (error) => {
      console.error('Socket error:', error)
      toast.error(error.message || 'Socket error occurred')
    })

    // Ping/Pong for connection health
    newSocket.on('pong', () => {
      // Connection is healthy
    })

    // Send ping every 30 seconds
    const pingInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('ping')
      }
    }, 30000)

    newSocket.on('disconnect', () => {
      clearInterval(pingInterval)
    })

    setSocket(newSocket)
  }

  const disconnect = () => {
    if (socket) {
      socket.disconnect()
      setSocket(null)
      setIsConnected(false)
      setOnlineUsers([])
      setTypingUsers(new Map())
    }
  }

  const emit = (event: string, data?: any) => {
    if (socket && isConnected) {
      socket.emit(event, data)
    }
  }

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
        typingUsers,
        connect,
        disconnect,
        emit,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

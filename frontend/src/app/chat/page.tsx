'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useSocketStore } from '@/stores/socketStore'
import { useChannelStore } from '@/stores/channelStore'
import { useMessageStore } from '@/stores/messageStore'
import { Sidebar } from '@/components/layout/Sidebar'

export default function ChatPage() {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { isAuthenticated, user, token } = useAuthStore()
  const { connect } = useSocketStore()
  const { fetchChannels, currentChannel } = useChannelStore()
  const { fetchMessages, sendMessage, messages } = useMessageStore()

  useEffect(() => {
    // Redirect to home if not authenticated
    if (!isAuthenticated) {
      router.push('/')
      return
    }

    // Connect to Socket.IO when authenticated
    if (token) {
      connect(token)
    }

    // Fetch available channels
    fetchChannels()
  }, [isAuthenticated, token, router, connect, fetchChannels])

  useEffect(() => {
    // Fetch messages when channel changes
    if (currentChannel) {
      console.log('🔄 Loading messages for channel:', currentChannel.name);
      // Clear previous messages before fetching new ones
      const { clearMessages } = useMessageStore.getState();
      clearMessages();
      fetchMessages(currentChannel._id)
    }
  }, [currentChannel, fetchMessages])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages])

  const handleSendMessage = async (content: string) => {
    if (currentChannel && content.trim()) {
      try {
        await sendMessage(currentChannel._id, content)
      } catch (error) {
        console.error('Failed to send message:', error)
      }
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-dark-800">
        <div className="text-white">Redirecting...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-dark-800">
      {/* Sidebar */}
      <div className="w-60 bg-dark-900 border-r border-dark-700">
        <Sidebar />
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentChannel ? (
          <div className="h-full flex flex-col">
            {/* Channel Header */}
            <div className="bg-dark-700 p-4 border-b border-dark-600">
              <h2 className="text-white text-lg font-semibold">
                # {currentChannel.name}
              </h2>
              <p className="text-gray-400 text-sm">
                {currentChannel.description}
              </p>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto">
              {messages.length > 0 ? (
                <div className="space-y-2">
                  {messages.map((message) => {
                    const authorName = typeof message.author === 'string' ? message.author : message.author.username
                    return (
                      <div key={message._id} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {authorName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-semibold">{authorName}</span>
                            <span className="text-gray-400 text-xs">
                              {new Date(message.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-gray-300">{message.content}</p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="text-gray-400 text-center">
                  Welcome to #{currentChannel.name}! Start chatting...
                </div>
              )}
            </div>
            
            {/* Message Input */}
            <div className="p-4 border-t border-dark-600">
              <form onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const input = form.elements.namedItem('message') as HTMLInputElement
                if (input.value.trim()) {
                  handleSendMessage(input.value)
                  input.value = ''
                }
              }}>
                <input
                  name="message"
                  type="text"
                  placeholder={`Message #${currentChannel.name}`}
                  className="w-full bg-dark-600 text-white p-3 rounded-lg border border-dark-500 focus:border-primary-500 focus:outline-none"
                />
              </form>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <h2 className="text-2xl font-bold mb-2">Welcome to Gamer's Hub!</h2>
              <p>Select a channel from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

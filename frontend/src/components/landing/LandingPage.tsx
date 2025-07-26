'use client'

import React, { useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { Gamepad2, Users, MessageCircle, Zap, Shield, Globe } from 'lucide-react'

export function LandingPage() {
  const [isLogin, setIsLogin] = useState(true)
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-300">Loading Gamer's Hub...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      {/* Header */}
      <header className="relative z-10 bg-dark-800/50 backdrop-blur-sm border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Gamepad2 className="h-8 w-8 text-primary-400" />
              <h1 className="text-xl font-bold gaming-text font-gaming">
                Gamer's Hub
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsLogin(true)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isLogin 
                    ? 'bg-primary-500 text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  !isLogin 
                    ? 'bg-primary-500 text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Register
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Column - Hero Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
                  Real-Time Chat for{' '}
                  <span className="gaming-gradient bg-clip-text text-transparent">
                    Gaming Communities
                  </span>
                </h1>
                <p className="text-xl text-gray-300 leading-relaxed">
                  Connect with fellow gamers, share strategies, and build communities 
                  in our Discord-inspired platform designed specifically for gaming enthusiasts.
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <MessageCircle className="h-6 w-6 text-primary-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-white">Real-Time Chat</h3>
                    <p className="text-sm text-gray-400">
                      Instant messaging with typing indicators
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Users className="h-6 w-6 text-primary-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-white">Game Channels</h3>
                    <p className="text-sm text-gray-400">
                      Dedicated channels for every game
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Zap className="h-6 w-6 text-primary-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-white">Lightning Fast</h3>
                    <p className="text-sm text-gray-400">
                      Built for speed and performance
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Shield className="h-6 w-6 text-primary-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-white">Secure & Private</h3>
                    <p className="text-sm text-gray-400">
                      Your data is safe and protected
                    </p>
                  </div>
                </div>
              </div>

              {/* Gaming Categories */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Popular Game Communities</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    '🎯 Valorant',
                    '⚔️ Genshin Impact', 
                    '⛏️ Minecraft',
                    '🔫 CS:GO',
                    '🏆 League of Legends',
                    '🎮 Fortnite'
                  ].map((game) => (
                    <span
                      key={game}
                      className="px-3 py-1 bg-dark-700/50 text-gray-300 rounded-full text-sm border border-dark-600"
                    >
                      {game}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-400">1K+</div>
                  <div className="text-sm text-gray-400">Active Gamers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-400">50+</div>
                  <div className="text-sm text-gray-400">Game Channels</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-400">24/7</div>
                  <div className="text-sm text-gray-400">Online Support</div>
                </div>
              </div>
            </div>

            {/* Right Column - Auth Forms */}
            <div className="lg:pl-8">
              <div className="card p-8 bg-dark-800/50 backdrop-blur-sm border-dark-600">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {isLogin ? 'Welcome Back!' : 'Join the Community'}
                  </h2>
                  <p className="text-gray-400">
                    {isLogin 
                      ? 'Sign in to continue your gaming journey'
                      : 'Create your account and start gaming together'
                    }
                  </p>
                </div>

                {isLogin ? <LoginForm /> : <RegisterForm />}

                <div className="mt-6 text-center">
                  <p className="text-gray-400">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button
                      onClick={() => setIsLogin(!isLogin)}
                      className="ml-2 text-primary-400 hover:text-primary-300 font-medium"
                    >
                      {isLogin ? 'Sign up' : 'Sign in'}
                    </button>
                  </p>
                </div>

                {/* Future OAuth buttons placeholder */}
                <div className="mt-6 pt-6 border-t border-dark-600">
                  <p className="text-center text-sm text-gray-500 mb-4">
                    Coming soon: Sign in with
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      disabled 
                      className="flex items-center justify-center px-4 py-2 border border-dark-600 rounded-lg text-gray-500 cursor-not-allowed"
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Google
                    </button>
                    <button 
                      disabled 
                      className="flex items-center justify-center px-4 py-2 border border-dark-600 rounded-lg text-gray-500 cursor-not-allowed"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Discord
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

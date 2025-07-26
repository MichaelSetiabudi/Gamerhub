# 🎮 Gamer's Hub - Real-Time Chat Platform for Gaming Community

A Discord/Slack-inspired real-time chat platform dedicated specifically for gaming communities.

## 📁 Project Structure

```
projectgamerhub/
├── frontend/          # Next.js Frontend Application
├── backend/           # Node.js + Express.js Backend API
├── shared/            # Shared types, utilities, and constants
└── docs/              # Documentation and API specs
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Installation & Setup

1. **Clone and Install Dependencies**
```bash
npm install
npm run install:all
```

2. **Environment Setup**
```bash
# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

3. **Start MongoDB**
```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas (update connection string in backend/.env)
```

4. **Run Development Servers**
```bash
# Start both frontend and backend
npm run dev

# Or individually
npm run dev:frontend
npm run dev:backend
```

## 🌟 Features by Phase

### 🛠️ Phase 1: MVP
- ✅ Authentication & User Profiles
- ✅ Channel Management (Public Channels)
- ✅ Real-time Chat
- ✅ Basic UI/UX

### 🚀 Phase 2: Standard Features  
- ✅ User Presence (Online/Offline)
- ✅ Typing Indicators
- ✅ Simple Notifications

### 🌟 Phase 3: Advanced Features
- ✅ OAuth Login (Google/Discord)
- ✅ Private Channels
- ✅ Direct Messages (DM)
- ✅ Mention Notifications

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with SSR/ISR
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - State management
- **Socket.IO Client** - Real-time communication
- **NextAuth.js** - Authentication (OAuth)

### Backend
- **Node.js + Express.js** - REST API server
- **Socket.IO** - Real-time WebSocket communication
- **MongoDB + Mongoose** - Database and ODM
- **JWT** - Token-based authentication
- **bcryptjs** - Password hashing

### Database Schema
- Users (auth, profiles, status)
- Channels (public/private, members)
- Messages (content, timestamps, references)
- DirectMessages (1-on-1 conversations)

## 📚 API Documentation

See `/docs/api.md` for detailed API documentation.

## 🚀 Deployment

### Frontend (Vercel)
- Optimized for Next.js deployment
- Automatic builds from main branch

### Backend (Railway/Heroku)
- Express.js API with Socket.IO support
- MongoDB Atlas integration

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

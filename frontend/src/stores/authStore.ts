import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginCredentials, RegisterCredentials } from '@/types';
import { api } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateUser: (updates: Partial<User>) => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      login: async (credentials: LoginCredentials) => {
        try {
          console.log('🔐 Starting login process...', { email: credentials.email });
          set({ isLoading: true, error: null });
          
          console.log('🌐 Making API request to:', api.defaults.baseURL);
          const response = await api.post('/auth/login', credentials);
          console.log('✅ Login API response:', response.status);
          
          const { user, token } = response.data.data;
          
          // Set the token in axios headers for future requests
          api.defaults.headers.Authorization = `Bearer ${token}`;
          
          console.log('👤 User logged in:', user.username);
          set({ user, token, isLoading: false, isAuthenticated: true });
        } catch (error: any) {
          console.error('❌ Login error:', error);
          console.error('📡 Error details:', error.response?.data);
          const errorMessage = error.response?.data?.message || 'Login failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      register: async (credentials: RegisterCredentials) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await api.post('/auth/register', credentials);
          const { user, token } = response.data.data;
          
          // Set the token in axios headers for future requests
          api.defaults.headers.Authorization = `Bearer ${token}`;
          
          set({ user, token, isLoading: false, isAuthenticated: true });
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Registration failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      logout: () => {
        // Clear token from axios headers
        delete api.defaults.headers.Authorization;
        
        set({ user: null, token: null, error: null, isAuthenticated: false });
      },

      clearError: () => {
        set({ error: null });
      },

      updateUser: (updates: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...updates } });
        }
      },

      setUser: (user: User) => {
        set({ user });
      },

      setToken: (token: string) => {
        api.defaults.headers.Authorization = `Bearer ${token}`;
        set({ token });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token 
      }),
      onRehydrateStorage: () => (state) => {
        // Set the token in axios headers when rehydrating from storage
        if (state?.token && state?.user) {
          api.defaults.headers.Authorization = `Bearer ${state.token}`;
          // Update isAuthenticated based on presence of user and token
          state.isAuthenticated = true;
        }
      },
    }
  )
);

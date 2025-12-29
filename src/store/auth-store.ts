import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  role: string
  agentId?: string  // Flutter의 useCode와 동일 (상담원 코드)
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isInitialized: boolean
  isInitializing: boolean
  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  setInitialized: (value: boolean) => void
  setInitializing: (value: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialized: false,
      isInitializing: false,
      login: (user, token) => set({ 
        user, 
        token, 
        isAuthenticated: true, 
        isInitialized: false,
        isInitializing: false 
      }),
      logout: () => set({ 
        user: null, 
        token: null, 
        isAuthenticated: false,
        isInitialized: false,
        isInitializing: false
      }),
      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
      setInitialized: (value) => set({ isInitialized: value }),
      setInitializing: (value) => set({ isInitializing: value }),
    }),
    {
      name: 'auth-storage',
      // 개발 환경에서는 persist 비활성화 - 아무것도 저장하지 않음
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    }
  )
)
'use client'

import { useAuthStore } from '@/store/auth-store'

export function TempLogin() {
  const { user, login, logout } = useAuthStore()

  const handleLogin = () => {
    // Mock login with user ID 100 for testing
    login(
      {
        id: '100',
        name: '상담원#100',
        email: 'agent100@test.com',
        role: 'agent',
        agentId: '100',
      },
      'mock-token'
    )
  }

  if (user) {
    return (
      <div className="p-4 bg-card border rounded-lg">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <p>로그인됨: {user.name}</p>
            <p className="text-muted-foreground">ID: {user.id}</p>
          </div>
          <div className="flex gap-2">
            <button 
              className="px-3 py-1 text-sm border rounded hover:bg-accent"
              onClick={() => {
                logout()
                // Clear localStorage to ensure complete logout
                if (typeof window !== 'undefined') {
                  window.localStorage.removeItem('auth-storage')
                }
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-card border rounded-lg">
      <button 
        onClick={handleLogin} 
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
      >
        테스트 로그인 (상담원 100)
      </button>
    </div>
  )
}
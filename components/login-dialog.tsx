'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { authService } from '@/services/auth-service'

interface LoginDialogProps {
  onClose: () => void
  hideCloseButton?: boolean
}

export function LoginDialog({ onClose, hideCloseButton = false }: LoginDialogProps) {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!loginId || !password) {
      setError('아이디와 암호를 모두 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await authService.login(loginId, password)
      
      if (response.callboxId) {
        login({
          id: response.id.toString(),
          name: response.name,
          email: `${loginId}@ftnh.com`,
          role: 'agent',
          agentId: response.useCode?.toString() || response.id.toString(),
        }, 'auth-token')
        
        onClose()
      } else {
        setError('로그인에 실패했습니다.')
      }
    } catch (err) {
      setError('아이디 또는 암호가 올바르지 않습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-background border rounded-lg w-96 p-6 relative">
        {!hideCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-accent rounded"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        
        <h2 className="text-xl font-bold mb-6">로그인</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">아이디</label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="아이디를 입력하세요"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">암호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="암호를 입력하세요"
            />
          </div>
          
          {error && (
            <div className="text-sm text-red-500">{error}</div>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
          
          <p className="text-xs text-center text-muted-foreground mt-4">
            아이디 암호를 모르실 경우 해당 페이지 제공 회사에 문의하세요!
          </p>
        </form>
      </div>
    </div>
  )
}
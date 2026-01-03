'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { authService } from '@/services/auth-service'

export default function LoginPage() {
  const router = useRouter()
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
        login(
          {
            id: response.id.toString(),
            name: response.name,
            email: `${loginId}@ftnh.com`,
            role: 'agent',
            agentId: response.useCode?.toString() || response.id.toString(),
          },
          'auth-token'
        )

        // 로그인 성공 시 대시보드로 이동
        router.replace('/dashboard')
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
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md px-6">
        <div className="bg-card border rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground">Call Agent</h1>
            <p className="text-muted-foreground mt-2">관제 시스템 로그인</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">아이디</label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                placeholder="아이디를 입력하세요"
                autoFocus
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">암호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                placeholder="암호를 입력하세요"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-6">
            아이디 암호를 모르실 경우 관리자에게 문의하세요
          </p>
        </div>
      </div>
    </div>
  )
}

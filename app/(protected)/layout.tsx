'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isAuthenticated, isInitialized } = useAuthStore()

  useEffect(() => {
    // 미인증 상태면 로그인으로 리다이렉트
    if (!isAuthenticated || !user) {
      router.replace('/login')
    }
  }, [isAuthenticated, user, router])

  // 미인증 상태면 리다이렉트 (children 렌더링 안함)
  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <>
      {children}
      {/* 초기화 중일 때 상단 센터 플로팅 인디케이터 */}
      {!isInitialized && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg shadow-lg">
          <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">인증 확인 중...</span>
        </div>
      )}
    </>
  )
}

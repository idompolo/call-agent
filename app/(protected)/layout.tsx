'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // 인증 상태 체크
    if (!isAuthenticated || !user) {
      router.replace('/login')
    } else {
      setIsChecking(false)
    }
  }, [isAuthenticated, user, router])

  // 인증 체크 중이거나 미인증 상태면 로딩 표시
  if (isChecking || !isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">인증 확인 중...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

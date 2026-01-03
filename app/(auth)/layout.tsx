'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { isElectronMac, isElectronWindows } from '@/lib/electron'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [isElectronMacApp, setIsElectronMacApp] = useState(false)
  const [isElectronWinApp, setIsElectronWinApp] = useState(false)

  useEffect(() => {
    setIsElectronMacApp(isElectronMac())
    setIsElectronWinApp(isElectronWindows())
  }, [])

  // 이미 로그인된 경우 대시보드로 리다이렉트
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, router])

  // 로그인된 상태면 렌더링하지 않음
  if (isAuthenticated) {
    return null
  }

  return (
    <div
      className="min-h-screen bg-background"
      style={{
        // Electron macOS에서 트래픽 라이트 버튼 공간 확보
        paddingTop: isElectronMacApp ? '32px' : '0',
      }}
    >
      {/* Electron macOS 드래그 영역 */}
      {isElectronMacApp && (
        <div
          className="fixed top-0 left-0 right-0 h-8 bg-background z-50"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />
      )}

      {/* Electron Windows 타이틀바 공간 */}
      {isElectronWinApp && (
        <div className="h-8" />
      )}

      {children}
    </div>
  )
}

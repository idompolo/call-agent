'use client'

import { useEffect } from 'react'
import { actionService } from '@/services/action-service'

export function ActionServiceInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 앱 시작 시 액션 서비스 초기화 (취소 코드 등 로드)
    actionService.initialize().catch(error => {
      console.error('[ActionServiceInitializer] Failed to initialize:', error)
    })
  }, [])

  return <>{children}</>
}
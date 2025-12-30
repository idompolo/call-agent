/**
 * 초기화 서비스
 *
 * SyncCoordinator를 사용하여 MQTT 연결과 초기 데이터 fetch를 조율합니다.
 *
 * 초기화 흐름:
 * 1. MQTT 연결 (use-mqtt.ts에서 버퍼링 시작)
 * 2. API에서 초기 데이터 fetch
 * 3. setInitialized(true) → use-mqtt.ts의 버퍼가 자동으로 플러시됨
 */

import { syncCoordinator, SyncState, type InitializationResult as SyncResult } from './sync-coordinator'
import { useAuthStore } from '@/store/auth-store'

interface InitializationResult {
  success: boolean
  error?: string
  details?: {
    ordersLoaded: number
    bufferedMessagesProcessed: number
    totalTimeMs: number
    state: SyncState
  }
}

export const initializationService = {
  /**
   * 초기화 실행
   * SyncCoordinator를 통해 MQTT 연결 → API fetch → setInitialized(true) 순서 보장
   */
  async initialize(): Promise<InitializationResult> {
    const { user } = useAuthStore.getState()

    if (!user?.id) {
      console.error('[InitializationService] No user ID available')
      return {
        success: false,
        error: 'User not authenticated'
      }
    }

    try {
      console.log('[InitializationService] Starting initialization with SyncCoordinator...')

      // SyncCoordinator를 통해 초기화 실행
      const result: SyncResult = await syncCoordinator.initialize(user.id)

      if (result.success) {
        console.log('[InitializationService] Initialization completed successfully:', {
          ordersLoaded: result.ordersLoaded,
          bufferedMessages: result.bufferedMessagesProcessed,
          totalTime: `${result.totalTimeMs}ms`
        })

        return {
          success: true,
          details: {
            ordersLoaded: result.ordersLoaded,
            bufferedMessagesProcessed: result.bufferedMessagesProcessed,
            totalTimeMs: result.totalTimeMs,
            state: result.state
          }
        }
      } else {
        console.error('[InitializationService] Initialization failed:', result.error)
        return {
          success: false,
          error: result.error || 'Initialization failed',
          details: {
            ordersLoaded: result.ordersLoaded,
            bufferedMessagesProcessed: result.bufferedMessagesProcessed,
            totalTimeMs: result.totalTimeMs,
            state: result.state
          }
        }
      }
    } catch (error) {
      console.error('[InitializationService] Unexpected error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      }
    }
  },

  /**
   * 상태 초기화
   */
  async reset(): Promise<void> {
    console.log('[InitializationService] Resetting...')
    await syncCoordinator.reset()
    console.log('[InitializationService] Reset completed')
  },

  /**
   * 현재 동기화 상태 조회
   */
  getState(): SyncState {
    return syncCoordinator.getState()
  },

  /**
   * 상태 변경 구독
   */
  onStateChange(callback: (state: SyncState) => void): () => void {
    return syncCoordinator.onStateChange(callback)
  },

  /**
   * 초기화 완료 여부 확인
   */
  isReady(): boolean {
    return syncCoordinator.isReady()
  },

  /**
   * 초기화 진행 중 여부 확인
   */
  isInitializing(): boolean {
    return syncCoordinator.isInitializing()
  }
}
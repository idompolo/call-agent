/**
 * 초기화 코디네이터 (단순화된 버전)
 *
 * 초기화 흐름:
 * 1. MQTT 연결
 * 2. API에서 초기 데이터 fetch
 * 3. setInitialized(true) → use-mqtt.ts의 버퍼가 자동으로 플러시됨
 *
 * 버퍼링은 use-mqtt.ts에서 처리:
 * - isInitialized가 false일 때 메시지는 버퍼에 저장
 * - isInitialized가 true가 되면 버퍼 자동 플러시
 */

import { mqttService } from './mqtt-service'
import { orderService } from './order-service'
import { useOrderStore } from '@/store/order-store'
import { useAuthStore } from '@/store/auth-store'
import { isElectron, getElectronAPI } from '@/lib/electron'

// 동기화 상태 정의 (단순화)
export enum SyncState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  FETCHING = 'FETCHING',
  READY = 'READY',
  ERROR = 'ERROR'
}

// 설정 인터페이스
export interface SyncConfig {
  /** API fetch 타임아웃 (ms) */
  fetchTimeoutMs: number
  /** MQTT 연결 대기 타임아웃 (ms) */
  connectTimeoutMs: number
}

// 초기화 결과 인터페이스
export interface InitializationResult {
  success: boolean
  state: SyncState
  ordersLoaded: number
  bufferedMessagesProcessed: number
  duplicatesRemoved: number
  totalTimeMs: number
  error?: string
}

// 기본 설정
const DEFAULT_CONFIG: SyncConfig = {
  fetchTimeoutMs: 10000,       // 10초 fetch 타임아웃
  connectTimeoutMs: 15000      // 15초 연결 타임아웃
}

class SyncCoordinatorImpl {
  private state: SyncState = SyncState.IDLE
  private config: SyncConfig = { ...DEFAULT_CONFIG }
  private stateCallbacks: Set<(state: SyncState) => void> = new Set()
  private initPromise: Promise<InitializationResult> | null = null

  /**
   * 현재 동기화 상태 반환
   */
  getState(): SyncState {
    return this.state
  }

  /**
   * 상태 변경 구독
   */
  onStateChange(callback: (state: SyncState) => void): () => void {
    this.stateCallbacks.add(callback)
    return () => this.stateCallbacks.delete(callback)
  }

  /**
   * 상태 변경 및 알림
   */
  private setState(newState: SyncState): void {
    const prevState = this.state
    this.state = newState
    console.log(`[SyncCoordinator] State: ${prevState} → ${newState}`)
    this.stateCallbacks.forEach(cb => {
      try {
        cb(newState)
      } catch (error) {
        console.error('[SyncCoordinator] Error in state callback:', error)
      }
    })
  }

  /**
   * 설정 변경
   */
  configure(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config }
    console.log('[SyncCoordinator] Configuration updated:', this.config)
  }

  /**
   * 초기화 실행
   * 중복 호출 방지: 이미 초기화 중이면 기존 Promise 반환
   */
  async initialize(userId: string): Promise<InitializationResult> {
    // 이미 초기화 중이면 기존 Promise 반환
    if (this.initPromise && this.state !== SyncState.READY && this.state !== SyncState.ERROR && this.state !== SyncState.IDLE) {
      console.log('[SyncCoordinator] Initialization already in progress, returning existing promise')
      return this.initPromise
    }

    // 이미 READY 상태면 성공 반환
    if (this.state === SyncState.READY) {
      console.log('[SyncCoordinator] Already initialized')
      return {
        success: true,
        state: SyncState.READY,
        ordersLoaded: useOrderStore.getState().orders.length,
        bufferedMessagesProcessed: 0,
        duplicatesRemoved: 0,
        totalTimeMs: 0
      }
    }

    this.initPromise = this.executeInitialization(userId)
    return this.initPromise
  }

  /**
   * 실제 초기화 로직 실행
   */
  private async executeInitialization(userId: string): Promise<InitializationResult> {
    const startTime = Date.now()
    const result: InitializationResult = {
      success: false,
      state: SyncState.IDLE,
      ordersLoaded: 0,
      bufferedMessagesProcessed: 0,
      duplicatesRemoved: 0,
      totalTimeMs: 0
    }

    try {
      const { setInitializing, setInitialized } = useAuthStore.getState()
      setInitializing(true)

      // ============================================
      // Step 1: MQTT 연결 (use-mqtt.ts에서 버퍼링 시작)
      // ============================================
      this.setState(SyncState.CONNECTING)
      console.log('[SyncCoordinator] Step 1: Connecting to MQTT...')

      if (isElectron()) {
        // Electron 환경: IPC를 통한 연결
        const api = getElectronAPI()
        if (api?.connectMQTT) {
          await Promise.race([
            api.connectMQTT(userId),
            this.timeout(this.config.connectTimeoutMs, 'MQTT connection timeout')
          ])
        }
      } else {
        // 웹 환경: mqttService 사용
        await mqttService.connect(userId)

        // 연결 완료 대기
        await Promise.race([
          mqttService.waitForConnected(),
          this.timeout(this.config.connectTimeoutMs, 'MQTT connection timeout')
        ])
      }

      console.log('[SyncCoordinator] MQTT connected')

      // ============================================
      // Step 2: API에서 초기 데이터 fetch
      // ============================================
      this.setState(SyncState.FETCHING)
      console.log('[SyncCoordinator] Step 2: Fetching orders from API...')

      const orders = await Promise.race([
        orderService.getAllOrders(60),
        this.timeout(this.config.fetchTimeoutMs, 'API fetch timeout')
      ]) as Awaited<ReturnType<typeof orderService.getAllOrders>>

      result.ordersLoaded = orders.length
      console.log(`[SyncCoordinator] Fetched ${orders.length} orders from API`)

      // Store에 주문 저장
      useOrderStore.getState().setOrders(orders)
      console.log('[SyncCoordinator] Orders stored')

      // ============================================
      // Step 3: 완료 - isInitialized를 true로 설정
      // use-mqtt.ts의 useEffect가 이를 감지하고 버퍼를 플러시함
      // ============================================
      this.setState(SyncState.READY)
      setInitialized(true)
      setInitializing(false)

      result.success = true
      result.state = SyncState.READY
      result.totalTimeMs = Date.now() - startTime

      console.log('[SyncCoordinator] Initialization completed:', {
        ordersLoaded: result.ordersLoaded,
        totalTime: `${result.totalTimeMs}ms`
      })

      return result

    } catch (error) {
      this.setState(SyncState.ERROR)

      const { setInitializing, setInitialized } = useAuthStore.getState()
      setInitializing(false)
      setInitialized(false)

      result.state = SyncState.ERROR
      result.error = error instanceof Error ? error.message : 'Unknown error'
      result.totalTimeMs = Date.now() - startTime

      console.error('[SyncCoordinator] Initialization failed:', error)

      return result
    } finally {
      this.initPromise = null
    }
  }

  /**
   * 상태 초기화
   */
  async reset(): Promise<void> {
    console.log('[SyncCoordinator] Resetting...')

    this.setState(SyncState.IDLE)
    this.initPromise = null

    // Store 초기화
    useOrderStore.getState().reset()

    // Auth 상태 초기화
    const { setInitialized, setInitializing } = useAuthStore.getState()
    setInitialized(false)
    setInitializing(false)

    console.log('[SyncCoordinator] Reset completed')
  }

  /**
   * 타임아웃 Promise 생성
   */
  private timeout(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms)
    })
  }

  /**
   * 현재 상태가 준비 완료인지 확인
   */
  isReady(): boolean {
    return this.state === SyncState.READY
  }

  /**
   * 현재 상태가 에러인지 확인
   */
  isError(): boolean {
    return this.state === SyncState.ERROR
  }

  /**
   * 초기화 진행 중인지 확인
   */
  isInitializing(): boolean {
    return this.state !== SyncState.IDLE &&
           this.state !== SyncState.READY &&
           this.state !== SyncState.ERROR
  }
}

// 싱글톤 인스턴스 생성 및 export
export const syncCoordinator = new SyncCoordinatorImpl()

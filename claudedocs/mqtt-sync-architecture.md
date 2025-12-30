# MQTT 초기화 동기화 아키텍처 설계

## 1. 개요

### 1.1 문제 정의

현재 시스템에서 MQTT 연결/구독과 초기 데이터 fetch 사이에 race condition이 발생하여 데이터 누락이 발생함.

```
현재 흐름 (문제):
┌─────────────────────────────────────────────────────────────┐
│ Dashboard 마운트                                             │
│     ├─→ initializationService.initialize()                  │
│     │       ├─→ API fetch (~500ms)                          │
│     │       └─→ onInitialDataLoaded() ← 너무 빠름!           │
│     │                                                       │
│     └─→ MonitoringPanel → useMqtt                          │
│               └─→ MQTT 연결 (~1500ms)                       │
│                                                             │
│ ⚠️ T=500ms~1500ms 사이 주문 누락!                           │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 설계 목표

1. **순서 보장**: MQTT 구독 완료 → API fetch 순서 보장
2. **데이터 무결성**: Overlap window로 누락 방지
3. **중복 제거**: orderId 기준 데이터 병합
4. **환경 통합**: 웹/Electron 동일한 동작

---

## 2. 아키텍처 설계

### 2.1 상태 다이어그램

```
┌────────────────────────────────────────────────────────────────────┐
│                       초기화 상태 머신                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────┐    ┌────────────┐    ┌─────────────┐    ┌───────────┐   │
│  │ IDLE │───→│ CONNECTING │───→│ SUBSCRIBING │───→│ BUFFERING │   │
│  └──────┘    └────────────┘    └─────────────┘    └─────┬─────┘   │
│                                                         │         │
│                                                         ▼         │
│  ┌───────┐    ┌─────────┐    ┌──────────────┐    ┌───────────┐   │
│  │ READY │←───│ MERGING │←───│ OVERLAP_WAIT │←───│ FETCHING  │   │
│  └───────┘    └─────────┘    └──────────────┘    └───────────┘   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

상태 설명:
- IDLE: 초기 상태
- CONNECTING: MQTT 브로커 연결 중
- SUBSCRIBING: 토픽 구독 중
- BUFFERING: 버퍼링 활성화, 메시지 수집 시작
- FETCHING: API에서 초기 데이터 fetch 중
- OVERLAP_WAIT: Overlap window 대기 (1.5초)
- MERGING: 버퍼 메시지와 API 데이터 병합
- READY: 정상 처리 모드
```

### 2.2 시퀀스 다이어그램

```
┌─────────┐  ┌──────────────┐  ┌─────────────┐  ┌───────────┐  ┌───────────┐
│Dashboard│  │SyncCoordinator│  │ MqttService │  │OrderService│  │OrderStore │
└────┬────┘  └──────┬───────┘  └──────┬──────┘  └─────┬─────┘  └─────┬─────┘
     │              │                 │               │              │
     │ initialize() │                 │               │              │
     │─────────────→│                 │               │              │
     │              │                 │               │              │
     │              │ connect()       │               │              │
     │              │────────────────→│               │              │
     │              │                 │               │              │
     │              │    connected    │               │              │
     │              │←────────────────│               │              │
     │              │                 │               │              │
     │              │ waitForSubscribed()             │              │
     │              │────────────────→│               │              │
     │              │                 │ subscribed    │              │
     │              │←────────────────│               │              │
     │              │                 │               │              │
     │              │ startBuffering()│               │              │
     │              │────────────────→│               │              │
     │              │                 │               │              │
     │              │ getAllOrders()  │               │              │
     │              │─────────────────────────────────→              │
     │              │                 │   orders      │              │
     │              │←─────────────────────────────────              │
     │              │                 │               │              │
     │              │ setOrders()     │               │   setOrders()│
     │              │─────────────────────────────────────────────────→
     │              │                 │               │              │
     │              │ wait 1.5s (overlap)             │              │
     │              │─────────────────│               │              │
     │              │                 │               │              │
     │              │ processBuffer() │               │              │
     │              │────────────────→│               │              │
     │              │                 │               │              │
     │              │                 │ addOrUpdateOrder()           │
     │              │                 │───────────────────────────────→
     │              │                 │               │              │
     │              │ endBuffering()  │               │              │
     │              │────────────────→│               │              │
     │              │                 │               │              │
     │  initialized │                 │               │              │
     │←─────────────│                 │               │              │
     │              │                 │               │              │
```

### 2.3 컴포넌트 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Application Layer                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────┐        ┌───────────────────┐                    │
│  │    Dashboard      │        │  MonitoringPanel  │                    │
│  │    (page.tsx)     │        │                   │                    │
│  └─────────┬─────────┘        └─────────┬─────────┘                    │
│            │                            │                               │
│            ▼                            ▼                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    SyncCoordinator (NEW)                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │   │
│  │  │ StateManager│  │ BufferMgr   │  │ InitializationOrchestrator│ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                           Service Layer                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────┐        ┌───────────────────┐                    │
│  │   MqttService     │        │   OrderService    │                    │
│  │   (WebSocket)     │        │   (API Client)    │                    │
│  │                   │        │                   │                    │
│  │  +connect()       │        │  +getAllOrders()  │                    │
│  │  +subscribe()     │        │                   │                    │
│  │  +onSubscribed()  │        │                   │                    │
│  │  +startBuffering()│        │                   │                    │
│  │  +processBuffer() │        │                   │                    │
│  └───────────────────┘        └───────────────────┘                    │
│                                                                         │
│  ┌───────────────────┐        ┌───────────────────┐                    │
│  │ MQTTManager       │        │   MessageBuffer   │                    │
│  │ (Electron TCP)    │        │   (NEW)           │                    │
│  │                   │        │                   │                    │
│  │  +connect()       │        │  +add()           │                    │
│  │  +subscribe()     │        │  +process()       │                    │
│  │  +onSubscribed()  │        │  +clear()         │                    │
│  └───────────────────┘        └───────────────────┘                    │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                           State Layer                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                      OrderStore (Zustand)                          │ │
│  │                                                                    │ │
│  │  +setOrders(orders)     - 초기 데이터 설정                          │ │
│  │  +addOrUpdateOrder(order) - 중복 체크 포함 추가/업데이트 (NEW)      │ │
│  │  +updateOrder(id, data)  - 기존 주문 업데이트                       │ │
│  │  +getOrderById(id)       - ID로 주문 조회                          │ │
│  │                                                                    │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 인터페이스 설계

### 3.1 SyncCoordinator

```typescript
// services/sync-coordinator.ts

export enum SyncState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  SUBSCRIBING = 'SUBSCRIBING',
  BUFFERING = 'BUFFERING',
  FETCHING = 'FETCHING',
  OVERLAP_WAIT = 'OVERLAP_WAIT',
  MERGING = 'MERGING',
  READY = 'READY',
  ERROR = 'ERROR'
}

export interface SyncConfig {
  overlapWindowMs: number      // 기본값: 1500
  maxBufferSize: number        // 기본값: 1000
  bufferTTLMs: number          // 기본값: 30000
  fetchTimeoutMs: number       // 기본값: 10000
  subscribeTimeoutMs: number   // 기본값: 5000
}

export interface ISyncCoordinator {
  /** 현재 동기화 상태 */
  getState(): SyncState

  /** 상태 변경 구독 */
  onStateChange(callback: (state: SyncState) => void): () => void

  /** 초기화 시작 (전체 플로우 실행) */
  initialize(userId: string): Promise<InitializationResult>

  /** 리셋 */
  reset(): Promise<void>

  /** 설정 변경 */
  configure(config: Partial<SyncConfig>): void
}

export interface InitializationResult {
  success: boolean
  state: SyncState
  ordersLoaded: number
  bufferedMessagesProcessed: number
  duplicatesRemoved: number
  totalTimeMs: number
  error?: string
}
```

### 3.2 MessageBuffer (Enhanced)

```typescript
// services/message-buffer.ts

export interface BufferedMessage {
  id: string              // 고유 ID (중복 방지용)
  topic: string
  message: string
  timestamp: number
  orderId?: number        // 파싱된 주문 ID (있는 경우)
}

export interface IMessageBuffer {
  /** 버퍼링 활성화 */
  startBuffering(): void

  /** 버퍼링 비활성화 */
  stopBuffering(): void

  /** 버퍼링 상태 확인 */
  isBuffering(): boolean

  /** 메시지 추가 */
  add(topic: string, message: string, orderId?: number): void

  /** 버퍼된 메시지 처리 (중복 제거 후 핸들러 호출) */
  process(handler: (msg: BufferedMessage) => void): ProcessResult

  /** 버퍼 초기화 */
  clear(): void

  /** 버퍼 크기 */
  size(): number
}

export interface ProcessResult {
  processed: number
  duplicatesRemoved: number
  errors: number
}
```

### 3.3 OrderStore (Enhanced)

```typescript
// store/order-store.ts - 추가 인터페이스

export interface OrderState {
  // ... 기존 필드들

  /** 중복 체크 포함 추가 (버퍼 처리용) */
  addOrUpdateOrder: (order: Order) => void

  /** 여러 주문 일괄 처리 (중복 체크 포함) */
  mergeOrders: (orders: Order[]) => MergeResult
}

export interface MergeResult {
  added: number
  updated: number
  duplicates: number
}
```

### 3.4 MqttService (Enhanced)

```typescript
// services/mqtt-service.ts - 추가 인터페이스

export interface IMqttService {
  // ... 기존 메서드들

  /** 구독 완료까지 대기 */
  waitForSubscribed(topics?: string[]): Promise<void>

  /** 구독 상태 확인 */
  isSubscribed(topic: string): boolean

  /** 모든 필수 토픽 구독 완료 여부 */
  isAllSubscribed(): boolean

  /** 버퍼링 시작 */
  startBuffering(): void

  /** 버퍼 처리 및 종료 */
  processBufferAndEnd(): ProcessResult
}
```

---

## 4. 상세 설계

### 4.1 SyncCoordinator 구현

```typescript
// services/sync-coordinator.ts

import { mqttService } from './mqtt-service'
import { orderService } from './order-service'
import { useOrderStore } from '@/store/order-store'
import { useAuthStore } from '@/store/auth-store'
import { isElectron, getElectronAPI } from '@/lib/electron'

const DEFAULT_CONFIG: SyncConfig = {
  overlapWindowMs: 1500,
  maxBufferSize: 1000,
  bufferTTLMs: 30000,
  fetchTimeoutMs: 10000,
  subscribeTimeoutMs: 5000
}

class SyncCoordinatorImpl implements ISyncCoordinator {
  private state: SyncState = SyncState.IDLE
  private config: SyncConfig = { ...DEFAULT_CONFIG }
  private stateCallbacks: Set<(state: SyncState) => void> = new Set()

  getState(): SyncState {
    return this.state
  }

  onStateChange(callback: (state: SyncState) => void): () => void {
    this.stateCallbacks.add(callback)
    return () => this.stateCallbacks.delete(callback)
  }

  private setState(newState: SyncState): void {
    console.log(`[SyncCoordinator] State: ${this.state} → ${newState}`)
    this.state = newState
    this.stateCallbacks.forEach(cb => cb(newState))
  }

  configure(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config }
  }

  async initialize(userId: string): Promise<InitializationResult> {
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

      // Step 1: MQTT 연결
      this.setState(SyncState.CONNECTING)
      await this.connectMqtt(userId)

      // Step 2: 토픽 구독 대기
      this.setState(SyncState.SUBSCRIBING)
      await this.waitForSubscriptions()

      // Step 3: 버퍼링 시작
      this.setState(SyncState.BUFFERING)
      this.startBuffering()

      // Step 4: API fetch
      this.setState(SyncState.FETCHING)
      const orders = await this.fetchOrders()
      result.ordersLoaded = orders.length

      // Step 5: 초기 데이터 설정
      useOrderStore.getState().setOrders(orders)

      // Step 6: Overlap window 대기
      this.setState(SyncState.OVERLAP_WAIT)
      await this.waitOverlapWindow()

      // Step 7: 버퍼 처리 및 병합
      this.setState(SyncState.MERGING)
      const processResult = this.processBuffer()
      result.bufferedMessagesProcessed = processResult.processed
      result.duplicatesRemoved = processResult.duplicatesRemoved

      // Step 8: 완료
      this.setState(SyncState.READY)
      setInitialized(true)
      setInitializing(false)

      result.success = true
      result.state = SyncState.READY
      result.totalTimeMs = Date.now() - startTime

      console.log('[SyncCoordinator] Initialization completed:', result)
      return result

    } catch (error) {
      this.setState(SyncState.ERROR)
      result.state = SyncState.ERROR
      result.error = error instanceof Error ? error.message : 'Unknown error'
      result.totalTimeMs = Date.now() - startTime

      console.error('[SyncCoordinator] Initialization failed:', error)
      return result
    }
  }

  private async connectMqtt(userId: string): Promise<void> {
    if (isElectron()) {
      const api = getElectronAPI()
      if (api?.connectMQTT) {
        await api.connectMQTT(userId)
      }
    } else {
      await mqttService.connect(userId)
    }
  }

  private async waitForSubscriptions(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Subscription timeout'))
      }, this.config.subscribeTimeoutMs)

      // 폴링으로 구독 완료 확인 (더 나은 방법은 콜백 추가)
      const checkInterval = setInterval(() => {
        if (mqttService.isAllSubscribed?.() ?? true) {
          clearInterval(checkInterval)
          clearTimeout(timeout)
          resolve()
        }
      }, 100)
    })
  }

  private startBuffering(): void {
    if (isElectron()) {
      // Electron: IPC로 버퍼링 시작 알림
      getElectronAPI()?.startBuffering?.()
    } else {
      // 웹: 이미 isInitialDataLoaded = false 상태
      // 추가 작업 불필요 (기존 버퍼링 활용)
    }
  }

  private async fetchOrders(): Promise<Order[]> {
    return orderService.getAllOrders(60)
  }

  private async waitOverlapWindow(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, this.config.overlapWindowMs)
    })
  }

  private processBuffer(): ProcessResult {
    if (isElectron()) {
      // Electron: IPC로 버퍼 처리 요청
      return getElectronAPI()?.processBuffer?.() ?? { processed: 0, duplicatesRemoved: 0, errors: 0 }
    } else {
      // 웹: onInitialDataLoaded 호출
      mqttService.onInitialDataLoaded()
      return { processed: 0, duplicatesRemoved: 0, errors: 0 } // 실제 값은 서비스에서 추적
    }
  }

  async reset(): Promise<void> {
    this.setState(SyncState.IDLE)
    useOrderStore.getState().reset()
    const { setInitialized, setInitializing } = useAuthStore.getState()
    setInitialized(false)
    setInitializing(false)
  }
}

export const syncCoordinator = new SyncCoordinatorImpl()
```

### 4.2 OrderStore addOrUpdateOrder

```typescript
// store/order-store.ts - 새로운 메서드 추가

addOrUpdateOrder: (order: Order) => set((state) => {
  const existingOrder = state.ordersMap.get(order.id)

  if (existingOrder) {
    // 기존 주문 존재: 병합 (새 데이터 우선)
    const mergedOrder = { ...existingOrder, ...order }
    const newOrdersMap = new Map(state.ordersMap)
    newOrdersMap.set(order.id, mergedOrder)

    console.log(`[OrderStore] Merged order ${order.id} (duplicate)`)

    return {
      orders: state.orders.map(o => o.id === order.id ? mergedOrder : o),
      ordersMap: newOrdersMap,
      selectedOrder: state.selectedOrder?.id === order.id
        ? mergedOrder
        : state.selectedOrder
    }
  }

  // 새 주문: 추가
  const newOrdersMap = new Map(state.ordersMap)
  newOrdersMap.set(order.id, order)

  return {
    orders: [...state.orders, order],
    ordersMap: newOrdersMap
  }
}),

mergeOrders: (orders: Order[]) => {
  let added = 0
  let updated = 0

  orders.forEach(order => {
    const exists = get().ordersMap.has(order.id)
    get().addOrUpdateOrder(order)
    if (exists) updated++
    else added++
  })

  return { added, updated, duplicates: updated }
}
```

---

## 5. 구현 계획

### Phase 1: 즉시 적용 (30분)

**order-store.ts 수정**
- `addOrder` 함수에 중복 체크 추가
- 또는 `addOrUpdateOrder` 신규 함수 추가

```typescript
// 간단한 수정: 기존 addOrder에 중복 체크 추가
addOrder: (order) => set((state) => {
  // 이미 존재하면 업데이트
  if (state.ordersMap.has(order.id)) {
    const existing = state.ordersMap.get(order.id)!
    const merged = { ...existing, ...order }
    const newMap = new Map(state.ordersMap)
    newMap.set(order.id, merged)
    return {
      orders: state.orders.map(o => o.id === order.id ? merged : o),
      ordersMap: newMap
    }
  }

  // 새 주문 추가
  const newMap = new Map(state.ordersMap)
  newMap.set(order.id, order)
  return {
    orders: [...state.orders, order],
    ordersMap: newMap
  }
})
```

### Phase 2: 초기화 순서 변경 (2시간)

**2-A. mqtt-service.ts 수정**
- `waitForSubscribed()` 메서드 추가
- 구독 완료 콜백/프로미스 지원

**2-B. sync-coordinator.ts 생성**
- 새로운 초기화 오케스트레이터
- 상태 머신 구현

**2-C. initialization-service.ts 수정**
- SyncCoordinator 사용하도록 변경

### Phase 3: Electron 버퍼링 (2시간)

**electron/main/mqtt/client.ts 수정**
- MessageBuffer 클래스 추가
- IPC 버퍼링 제어 채널 추가

**electron/preload/index.ts 수정**
- 버퍼링 API 노출

**hooks/use-mqtt.ts 수정**
- Electron 버퍼링 연동

---

## 6. 테스트 시나리오

### 6.1 정상 시나리오

| # | 시나리오 | 예상 결과 |
|---|---------|----------|
| 1 | MQTT 빠름, API 느림 | 버퍼에 메시지 저장, 병합 성공 |
| 2 | MQTT 느림, API 빠름 | 구독 대기 후 fetch, 정상 동작 |
| 3 | 동시 완료 | Overlap window로 안전하게 처리 |
| 4 | 중복 주문 수신 | orderId 기준 병합, 중복 제거 |

### 6.2 엣지 케이스

| # | 시나리오 | 대응 |
|---|---------|------|
| 1 | MQTT 연결 실패 | 재시도 후 에러 반환 |
| 2 | 구독 타임아웃 | 에러 상태, 사용자 알림 |
| 3 | API fetch 실패 | 재시도 후 에러 반환 |
| 4 | 버퍼 overflow | 오래된 메시지 제거, 경고 로그 |

### 6.3 성능 요구사항

| 메트릭 | 목표값 |
|--------|--------|
| 초기화 총 시간 | < 5초 |
| 버퍼 처리 시간 | < 100ms |
| 메모리 사용량 | < 10MB (버퍼) |

---

## 7. 마이그레이션 전략

### 7.1 단계적 적용

1. **Phase 1**: order-store 중복 방지만 적용
   - 리스크: 낮음
   - 효과: 중복 데이터 방지

2. **Phase 2**: 웹 환경 초기화 순서 변경
   - 리스크: 중간
   - 효과: race condition 해결

3. **Phase 3**: Electron 환경 동일하게 적용
   - 리스크: 중간
   - 효과: 환경 통합

### 7.2 롤백 계획

각 Phase 별로 Feature Flag 적용 가능:

```typescript
const SYNC_CONFIG = {
  useNewInitialization: true,  // Phase 2
  useElectronBuffering: true,  // Phase 3
  overlapWindowMs: 1500
}
```

---

## 8. 결론

### 권장 구현 순서

1. **즉시**: order-store 중복 방지 (Phase 1)
2. **다음**: 웹 초기화 순서 변경 (Phase 2)
3. **마지막**: Electron 버퍼링 (Phase 3)

### 예상 효과

- 데이터 누락: 0%
- 중복 데이터: 자동 병합
- 초기화 시간: ~3초 (MQTT 연결 + 1.5초 overlap)

---

*설계 문서 작성일: 2025-12-30*
*작성자: Claude Code*

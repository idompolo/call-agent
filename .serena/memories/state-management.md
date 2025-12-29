# State Management - Call Agent

## Zustand Stores 개요

```
┌─────────────────────────────────────────────────────────────┐
│                    Zustand Stores                           │
├─────────────────────────────────────────────────────────────┤
│  auth-store    │ 인증 상태, 사용자 정보                      │
│  order-store   │ 주문 목록, 선택된 주문, 필터               │
│  gps-store     │ 기사 GPS 위치 데이터                       │
│  mqtt-store    │ MQTT 연결 상태, 구독 관리                  │
│  socket-store  │ 연결된 상담원 목록                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Auth Store (`store/auth-store.ts`)

### 인터페이스
```typescript
interface User {
  id: string
  name: string
  email: string
  role: string
  agentId?: string  // 상담원 코드 (Flutter의 useCode)
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isInitialized: boolean      // 초기화 완료 여부
  isInitializing: boolean     // 초기화 진행 중
  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  setInitialized: (value: boolean) => void
  setInitializing: (value: boolean) => void
}
```

### 특징
- `persist` 미들웨어 사용 (개발환경에서는 비활성화)
- 초기화 상태 관리 (isInitialized, isInitializing)

### 사용 패턴
```typescript
const { user, isAuthenticated, login, logout } = useAuthStore()

// 로그인
login({ id: '1', name: '상담원', ... }, 'token')

// 로그아웃
logout()
```

---

## 2. Order Store (`store/order-store.ts`)

### 인터페이스
```typescript
interface OrderState {
  orders: Order[]
  ordersMap: Map<number, Order>    // 빠른 조회용 Map
  selectedOrder: Order | null
  filter: OrderFilter
  orderFilterType: OrderFilterType
  areaFilter: string[]             // 지역 필터
  isLoading: boolean
  
  // Actions
  setOrders: (orders: Order[]) => void
  addOrder: (order: Order) => void
  updateOrder: (orderId: number, order: Partial<Order>) => void
  removeOrder: (orderId: number) => void
  selectOrder: (order: Order | null) => void
  setFilter: (filter: OrderFilter) => void
  setOrderFilterType: (filterType: OrderFilterType) => void
  setAreaFilter: (areas: string[]) => void
  setLoading: (loading: boolean) => void
  reset: () => void
  getOrderById: (orderId: number) => Order | undefined
}
```

### 성능 최적화
```typescript
// Map을 사용한 O(1) 조회
ordersMap: new Map<number, Order>()

// 조회 메서드
getOrderById: (orderId) => get().ordersMap.get(orderId)
```

### 기본값
```typescript
// 모든 지역 기본 선택
areaFilter: ['all', 's=', 'c=', 'o=', 'p=', 'k=', 'w=', 'a=', 'y=', 't=']
```

### 사용 패턴
```typescript
const { orders, selectedOrder, addOrder, updateOrder, selectOrder } = useOrderStore()

// 주문 추가 (MQTT 수신 시)
addOrder(newOrder)

// 주문 업데이트
updateOrder(orderId, { status: 'accepted' })

// 주문 선택
selectOrder(order)

// 빠른 조회
const order = useOrderStore.getState().getOrderById(orderId)
```

---

## 3. GPS Store (`store/gps-store.ts`)

### 인터페이스
```typescript
interface GpsData {
  drvNo: string      // 기사 번호
  lat: number
  lng: number
  timestamp: Date
}

interface GpsStore {
  gpsMap: Map<string, GpsData>
  updateGpsData: (drvNo: string, lat: number, lng: number) => void
  getGpsData: (drvNo: string) => GpsData | undefined
  clearGpsData: () => void
}
```

### 사용 패턴
```typescript
const { updateGpsData, getGpsData } = useGpsStore()

// GPS 데이터 업데이트 (MQTT 수신 시)
updateGpsData('D001', 37.5665, 126.9780)

// GPS 데이터 조회 (거리 계산용)
const gpsData = getGpsData(order.drvNo)
```

---

## 4. MQTT Store (`store/mqtt-store.ts`)

### 인터페이스
```typescript
interface MqttState {
  isConnected: boolean
  subscriptions: Map<string, Set<(message: string) => void>>
  
  subscribeToTopic: (topic: string, callback: (message: string) => void) => () => void
  publishMessage: (topic: string, message: string) => void
  setConnected: (connected: boolean) => void
}
```

### 구독 패턴
```typescript
// ChatPanel에서 사용
const { subscribeToTopic, publishMessage } = useMqttStore()

useEffect(() => {
  const unsubSms = subscribeToTopic('sms.receive', (message) => {
    // SMS 처리
  })
  
  return () => unsubSms?.()
}, [])
```

### 환경별 분기
```typescript
// Electron: IPC 통신
if (isElectron()) {
  api?.publishMQTT?.(topic, message)
} else {
  // Web: WebSocket
  mqttService.publish(topic, message)
}
```

---

## 5. Socket Store (`store/socket-store.ts`)

### 역할
- 연결된 상담원 목록 관리
- Header에서 상담원 수 표시에 사용

---

## useMqtt Hook (`hooks/use-mqtt.ts`)

### 역할
MQTT 연결 및 메시지 처리의 핵심 훅

### 환경별 분기
```typescript
if (isElectron()) {
  // Electron: Main Process MQTT (IPC 통신)
  setupElectronSubscriptions()
} else {
  // Web: WebSocket MQTT
  setupWebSubscriptions()
}
```

### 구독 토픽
| 토픽 | 처리 |
|------|------|
| `web/addOrder` | 새 주문 추가 |
| `web/addReserve` | 예약 주문 추가 |
| `web/modifyOrder` | 주문 수정 |
| `web/acceptOrder` | 배차 완료 |
| `web/cancelOrder` | 주문 취소 |
| `web/actionOrder` | 액션 추가 (탑승/하차 등) |
| `web/selectAgent` | 상담원 선택 |
| `ftnh:drv:gps` | 기사 GPS 위치 |

### 메시지 파싱
```typescript
// 각 토픽별 파서 사용
const order = MqttService.parseAddOrderMessage(message)
const order = MqttService.parseAcceptOrderMessage(message)
const order = MqttService.parseCancelOrderMessage(message)
const { orderId, action } = MqttService.parseActionOrderMessage(message)
const gpsData = MqttService.parseGpsMessage(message)
```

### Electron IPC 이벤트
```typescript
// Main Process에서 전달받는 이벤트
api.onOrderAdd?.((data) => { ... })
api.onOrderModify?.((data) => { ... })
api.onOrderAccept?.((data) => { ... })
api.onOrderCancel?.((data) => { ... })
api.onOrderAction?.((data) => { ... })
api.onSelectAgent?.((data) => { ... })
api.onDriverGPS?.((data) => { ... })
```

---

## 데이터 흐름 요약

```
[MQTT Broker]
     │
     ▼
[useMqtt Hook]
     │
     ├──▶ useOrderStore (addOrder, updateOrder)
     │
     └──▶ useGpsStore (updateGpsData)

[사용자 입력]
     │
     ▼
[OrderInputPanel]
     │
     ├──▶ orderService (API 호출)
     │
     └──▶ useOrderStore (selectOrder)

[MonitoringPanel]
     │
     ├──◀ useOrderStore (orders, selectedOrder)
     │
     └──◀ useGpsStore (gpsMap)
```

# Call Agent 데이터 흐름

## MQTT 메시지 흐름

### Electron 환경
```
EMQX Broker (TCP 1883)
    │
    ▼
MQTTManager (electron/main/mqtt/client.ts)
    │ - subscribeToTopics()
    │ - handleMessage() → 파싱
    │ - MessageBatcher (GPS 200ms 배칭)
    │
    ▼ IPC (mainWindow.webContents.send)
    │
Preload (electron/preload/index.ts)
    │ - contextBridge.exposeInMainWorld('electronAPI')
    │
    ▼ 
useMqtt Hook (hooks/use-mqtt.ts)
    │ - setupElectronSubscriptions()
    │ - api.onOrderAdd(), onOrderModify() 등
    │
    ▼
Zustand Store (store/order-store.ts)
    │ - addOrder(), updateOrder()
    │
    ▼
React Components (MonitoringPanel)
```

### 웹 환경
```
EMQX Broker (WebSocket 7012)
    │
    ▼
MqttService (services/mqtt-service.ts)
    │ - mqtt.connect()
    │ - subscribeMessage()
    │
    ▼
useMqtt Hook
    │ - setupWebSubscriptions()
    │
    ▼
Zustand Store → React Components
```

## 주문 상태 변화

```
새 주문 (web/addOrder)
    │
    ▼
접수중 (isWaiting: true)
    │
    ├─▶ 배차 (web/acceptOrder) → 배차완료
    │
    ├─▶ 취소 (web/cancelOrder) → 취소됨
    │
    └─▶ 예약 (web/addReserve) → 예약중
           │
           └─▶ 배차/취소
```

## Order 타입 주요 필드

```typescript
interface Order {
  id: number              // 주문 ID
  telephone?: string      // 고객 전화번호
  customerName?: string   // 고객명
  callplace?: string      // 호출 장소 (지역코드 포함: s=, c= 등)
  calldong?: string       // 목적지
  
  // 상담원
  addAgent?: string       // 접수 상담원
  acceptAgent?: string    // 배차 상담원
  cancelAgent?: string    // 취소 상담원
  selectAgent?: string    // 선택된 상담원
  
  // 기사/차량
  drvNo?: string          // 기사 번호
  licensePlate?: string   // 차량 번호
  
  // 타임스탬프
  addAt?: Date            // 접수 시간
  acceptAt?: Date         // 배차 시간
  cancelAt?: Date         // 취소 시간
  reserveAt?: Date        // 예약 시간
  
  // 위치
  lat?: number
  lng?: number
  
  // 액션 히스토리
  actions?: ActionModel[] // 탑승, 하차 등
}
```

## GPS 데이터 흐름

```
ftnh:drv:gps 토픽
    │
    ▼ 메시지 포맷: loginId|drvNo|lat|lng|companyId|city|status
    │
MessageBatcher (200ms 간격)
    │ - 여러 GPS 메시지를 배열로 묶음
    │
    ▼ IPC: mqtt:driver-locations
    │
useMqtt → updateGpsData()
    │
    ▼
gpsStore.gpsMap (Map<drvNo, {lat, lng}>)
    │
    ▼
MonitoringPanel.calculateDistance()
    │ - distanceBetween(order.lat, order.lng, gps.lat, gps.lng)
```

## 지역 필터 코드

| 코드 | 지역 |
|------|------|
| `s=` | 서울 |
| `c=` | 충남 |
| `o=` | 대전 |
| `p=` | 세종 |
| `k=` | 경기 |
| `w=` | 강원 |
| `a=` | 전체 |
| `y=` | 기타 (알려진 코드 외) |
| `t=` | 테스트 |

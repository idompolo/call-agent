# Call Agent 핵심 파일 가이드

## Electron 관련

| 파일 | 역할 |
|------|------|
| `electron/main/index.ts` | Electron 앱 진입점, MQTTManager 초기화 |
| `electron/main/mqtt/client.ts` | MQTTManager 클래스 - TCP MQTT 연결, 토픽 구독, 메시지 핸들링 |
| `electron/main/mqtt/batcher.ts` | MessageBatcher - GPS 메시지 배칭 (200ms) |
| `electron/main/mqtt/parsers.ts` | OrderParser - 파이프 형식 메시지 파싱 |
| `electron/main/ipc/handlers.ts` | IPC 핸들러 (connect, publish, dispatch 등) |
| `electron/preload/index.ts` | contextBridge API 정의 (electronAPI) |

## 서비스 레이어

| 파일 | 역할 |
|------|------|
| `services/mqtt-service.ts` | 웹용 MqttService 싱글톤 - WebSocket MQTT |
| `services/action-service.ts` | 취소/체크콜 타입 관리 |
| `services/auth-service.ts` | 인증 서비스 |
| `services/initialization-service.ts` | 앱 초기화 서비스 |

## 상태 관리 (Zustand)

| 파일 | 역할 |
|------|------|
| `store/order-store.ts` | 주문 상태 - orders[], ordersMap, selectedOrder, areaFilter |
| `store/auth-store.ts` | 인증 상태 - user, token, isAuthenticated |
| `store/gps-store.ts` | GPS 데이터 - gpsMap |

## 훅

| 파일 | 역할 |
|------|------|
| `hooks/use-mqtt.ts` | MQTT 연결 훅 - Electron/Web 환경 분기 |
| `hooks/useRealtimeOrders.ts` | 실시간 주문 훅 |

## 컴포넌트

| 파일 | 역할 |
|------|------|
| `app/dashboard/page.tsx` | 메인 대시보드 페이지 |
| `app/dashboard/components/monitoring-panel.tsx` | 주문 모니터링 테이블 |
| `app/dashboard/components/monitoring-panel-virtualized.tsx` | 가상화된 모니터링 패널 |
| `app/dashboard/components/header.tsx` | 헤더 컴포넌트 |
| `components/order-input-panel/OrderInputPanel.tsx` | 주문 입력 패널 |
| `components/chat-panel/` | 채팅 관련 패널들 |
| `components/edit-panel/EditPanel.tsx` | 주문 편집 패널 |

## 유틸리티

| 파일 | 역할 |
|------|------|
| `lib/electron.ts` | `isElectron()`, `getElectronAPI()` 환경 감지 |
| `lib/api-client.ts` | Axios 클라이언트 (인터셉터 포함) |
| `utils/order-formatter.ts` | 주문 포맷팅 함수 |
| `utils/order-filters.ts` | 주문 필터 유틸 |
| `utils/distance.ts` | 거리 계산 유틸 |

## 타입 정의

| 파일 | 역할 |
|------|------|
| `types/order.ts` | Order, OrderAction, SmsModel 인터페이스 |
| `types/driver.ts` | Driver 타입 |
| `types/mqtt.ts` | MQTT 관련 타입 |

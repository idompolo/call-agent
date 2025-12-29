# Call Agent 프로젝트 개요

## 프로젝트 정보
- **앱 이름**: Call Agent (택시 관제 시스템)
- **앱 ID**: `com.ftnh.callagent`
- **프레임워크**: Next.js 14.2.3 + Electron 28 하이브리드
- **언어**: TypeScript (strict mode)
- **상태관리**: Zustand
- **스타일링**: Tailwind CSS
- **실시간 통신**: MQTT (WebSocket + TCP)

## 핵심 아키텍처

### 하이브리드 구조
- **Electron 환경**: Main Process에서 TCP MQTT 연결 → IPC로 Renderer와 통신
- **웹 환경**: WebSocket 기반 MQTT 직접 연결

### 런타임 환경 분기
```
Electron: mqtt://211.55.114.181:1883 (TCP)
Web: ws://211.55.114.181:7012 (WebSocket)
API: http://211.55.114.181:3000
```

## 디렉토리 구조

```
callagent/
├── app/dashboard/          # 메인 대시보드 (Next.js App Router)
├── electron/
│   ├── main/
│   │   ├── index.ts        # Electron 진입점
│   │   ├── mqtt/client.ts  # MQTTManager 클래스
│   │   └── ipc/handlers.ts # IPC 핸들러
│   └── preload/index.ts    # Context Bridge API
├── components/             # React 컴포넌트
├── hooks/use-mqtt.ts       # MQTT 연결 훅 (환경별 분기)
├── services/mqtt-service.ts # 웹용 MQTT 서비스
├── store/                  # Zustand 스토어
│   ├── order-store.ts      # 주문 상태 (Map 기반 O(1) 조회)
│   ├── auth-store.ts       # 인증 상태
│   └── gps-store.ts        # GPS 데이터
├── types/order.ts          # Order 타입 정의
└── lib/electron.ts         # Electron 환경 감지
```

## MQTT 토픽

### 주문 토픽
- `web/addOrder` - 새 주문
- `web/addReserve` - 예약 주문
- `web/modifyOrder` - 주문 수정
- `web/cancelOrder` - 주문 취소
- `web/acceptOrder` - 배차 완료
- `web/actionOrder` - 주문 액션 (탑승/하차)
- `web/selectAgent` - 상담원 선택

### 기타 토픽
- `ftnh:drv:gps` - 기사 GPS (200ms 배칭)
- `web/chat/message/#` - 채팅

### 메시지 포맷
파이프(`|`) 구분자 형식 (Flutter 레거시 호환)
```
orderId|telephone|customerName|calldong|callplace|poiName|lat|lng|agent|status|timestamp|extra|token
```

## 주요 컴포넌트

### Dashboard (app/dashboard/page.tsx)
- Header, MonitoringPanel, OrderInputPanel, MessageTablePanel 구성
- 인증 필수 (LoginDialog)

### MonitoringPanel
- 실시간 주문 테이블
- 지역 필터 (`areaFilter`: s=, c=, o=, p=, k=, w=, a=, y=, t=)
- 주문 상태 통계 (접수/배차/예약/취소)
- GPS 기반 거리 계산

## IPC 채널

### Renderer → Main
- `mqtt:connect` / `mqtt:disconnect` / `mqtt:publish`
- `call:dispatch`, `chat:send-message`

### Main → Renderer
- `mqtt:order-new`, `mqtt:order-updated`, `mqtt:order-accepted`, `mqtt:order-cancelled`
- `mqtt:driver-locations` (배칭된 GPS)
- `mqtt:connection-status`

## 빌드

```bash
npm run dev              # Next.js 개발
npm run electron:dev     # Electron + Next.js
npm run electron:build:mac   # macOS 빌드
npm run electron:build:win   # Windows 빌드
```

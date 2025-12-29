# UI Architecture - Call Agent

## 레이아웃 구조

### Root Layout (`app/layout.tsx`)
```
html (lang="ko")
└── body
    └── ThemeProvider (다크모드 지원)
        └── QueryProvider (React Query)
            └── ActionServiceInitializer
                └── {children}
```

**특징**:
- 한국어 기본 언어 설정
- 시스템 테마 기반 다크모드
- React Query 전역 설정
- ActionService 초기화 래퍼

---

## Dashboard Page (`app/dashboard/page.tsx`)

### 컴포넌트 구조
```
DashboardPage
├── LoginDialog (미인증 시)
├── SideMenu (lazy, 토글)
├── Header
├── MonitoringPanel (핵심 주문 테이블)
├── OrderInputPanel (주문 입력 폼)
├── MessageTablePanel (lazy, 하단 메시지)
├── EditPanel (슬라이드 패널)
└── Error/Settings 모달들
```

### Lazy Loading 패턴
```typescript
// 덜 사용되는 컴포넌트 lazy 로드
const SideMenu = lazy(() => import('./components/side-menu'))
const OrderEditPanel = lazy(() => import('./components/order-edit-panel'))
const ChatPanel = lazy(() => import('@/components/chat-panel/ChatPanel'))
const MessageTablePanel = lazy(() => import('@/components/chat-panel/MessageTablePanel'))
```

### Electron macOS 지원
```typescript
// 트래픽 라이트 버튼 공간 확보
paddingTop: isElectronMacApp ? '32px' : '0'

// 드래그 영역 설정
style={{ WebkitAppRegion: 'drag' }}
```

---

## 핵심 컴포넌트 상세

### 1. MonitoringPanel (`app/dashboard/components/monitoring-panel.tsx`)
**역할**: 실시간 주문 현황 테이블

**핵심 기능**:
- `useMqtt()` 훅으로 실시간 MQTT 구독
- 지역 필터링 (areaFilter)
- 주문 상태별 필터링 (orderFilterType)
- GPS 기반 거리 계산
- 자동 스크롤

**상태 구분 (행 스타일)**:
- 🟢 접수중 (isWaiting): emerald 배경
- 🔴 취소됨 (isCancelled): red 배경
- 🟣 예약 (isReserved): purple 배경
- ⚪ 배차됨 (isAccepted): gray 배경

**성능 최적화**:
```typescript
// O(1) 조회를 위한 Set 변환
const areaFilterSet = useMemo(() => new Set(areaFilter), [areaFilter])

// 한 번의 순회로 통계 계산
const orderStats = useMemo(() => {
  // total, waiting, dispatched, reserved, cancelled 계산
}, [filteredOrders])
```

**테이블 컬럼**:
날짜 | 시간 | 전화번호 | 고객명 | 목적지 | 호출장소 | 문자 | 메모 | POI | 거리 | 기사 | 차량 | 배차시간 | 관여자 | 상태

### 2. Header (`app/dashboard/components/header.tsx`)
**역할**: 상단 네비게이션 바

**구성요소**:
- 메뉴 버튼 (SideMenu 토글)
- AreaSelectorModern (지역 선택)
- 연결된 상담원 수 표시
- 채팅 아이콘 (미읽음 카운트)
- SearchField (검색)
- OrderFilter (필터)
- CallStatus (전화 상태)
- 데이터 편집 버튼
- 사용자 메뉴 (로그인/로그아웃)
- 설정 버튼

**Electron macOS 드래그 처리**:
```typescript
// 드래그 가능 영역
style={{ WebkitAppRegion: 'drag' }}

// 드래그 불가 (버튼 등)
style={{ WebkitAppRegion: 'no-drag' }}
```

### 3. OrderInputPanel (`components/order-input-panel/OrderInputPanel.tsx`)
**역할**: 주문 입력/수정/취소 폼

**핵심 필드**:
- telephone (전화번호) - 이력 조회 기능
- customerName (고객명)
- destination (목적지)
- callPlace (탑승지) - AsyncAutocomplete 사용
- memo (메모)
- driverNo (드라이버)
- cancelCode (취소 코드) - SyncAutocomplete 사용

**키보드 단축키**:
- F7: 전화번호 필드 포커스
- F8: 전송/취소 실행
- F12: 초기화

**방향키 네비게이션**:
```typescript
// ArrowLeft/Right: 필드 간 이동
// ArrowUp/Down: 커서 이동
handleArrowKeys(e, prevRef, nextRef)
```

**포커스 관리**:
- 배차 상태 → 취소 코드 필드
- 접수/대기 상태 → 드라이버 필드
- 기본 → 전화번호 필드

### 4. ChatPanel (`components/chat-panel/ChatPanel.tsx`)
**역할**: 메시지/채팅 패널

**탭 구성**:
- SMS (문자 발신)
- 앱 메시지
- 이력

**MQTT 구독**:
```typescript
// SMS 수신
subscribeToTopic('sms.receive', ...)

// 채팅 메시지 수신
subscribeToTopic('web/agent_chat_service', ...)
```

### 5. EditPanel (`components/edit-panel/EditPanel.tsx`)
**역할**: 데이터 관리 슬라이드 패널

**탭 구성**:
- 기사 관리 (Driver)
- 차량 관리 (Car)
- 지점 관리 (Camp)
- POI 관리

**특징**:
- 슬라이드 인/아웃 애니메이션
- CRUD 폼
- 검색/필터링
- 알림 시스템

### 6. AreaSelectorModern (`app/dashboard/components/area-selector-modern.tsx`)
**역할**: 미군 기지 지역 선택

**지역 코드**:
```typescript
const areaItems = ['all', 's=', 'c=', 'o=', 'p=', 'k=', 'w=', 'a=', 'y=', 't=']

// 기지명 매핑
const areaNames = {
  's=': 'Asan',
  'c=': 'Casey',
  'o=': 'Osan',
  'p=': 'Humphreys',
  'k=': 'Gunsan',
  'a=': 'Carroll',
  'w=': 'Walker',
  'y=': 'Yongsan',
  't=': 'Test'
}
```

**기능**:
- 다중 선택
- 전체 선택/해제
- 컨텍스트 메뉴 (우클릭)
- 색상 코드 표시

---

## 재사용 UI 컴포넌트 (`components/ui/`)

### AsyncAutocomplete
- 비동기 검색 자동완성
- 디바운스 지원 (300ms 기본)
- 키보드 네비게이션
- 커스텀 아이콘

### SyncAutocomplete
- 동기 검색 자동완성 (메모리 캐시 데이터)
- 취소 코드 검색 등에 사용

### TooltipCell
- 테이블 셀 툴팁
- 텍스트 오버플로우 처리

### ActionCard
- 주문 액션 표시 배지
- 탑승, 하차 등 액션 시간 표시

### 기타 shadcn/ui 기반
- Button, Card, Badge, Input, Label
- Tabs, ScrollArea, RadioGroup
- Tooltip, Textarea

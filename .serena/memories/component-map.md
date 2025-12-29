# Component Map - Call Agent

## 파일 구조

```
app/
├── layout.tsx                    # Root Layout (ThemeProvider, QueryProvider)
├── page.tsx                      # Home (리다이렉트)
├── globals.css                   # 전역 스타일
├── fonts.css                     # 폰트 설정
├── dashboard/
│   ├── page.tsx                  # 메인 대시보드 페이지
│   └── components/
│       ├── header.tsx            # 상단 헤더
│       ├── monitoring-panel.tsx  # 주문 현황 테이블
│       ├── monitoring-panel-virtualized.tsx  # 가상화된 버전
│       ├── area-selector-modern.tsx  # 지역 선택
│       ├── area-selector.tsx     # 지역 선택 (기본)
│       ├── area-selector-compact.tsx
│       ├── area-selector-demo.tsx
│       ├── area-selector-pills.tsx
│       ├── order-filter.tsx      # 주문 필터
│       ├── search-field.tsx      # 검색 필드
│       ├── call-status.tsx       # 전화 상태
│       ├── side-menu.tsx         # 사이드 메뉴
│       ├── order-edit-panel.tsx  # 주문 편집
│       ├── order-control-panel.tsx
│       ├── order-table-row.tsx   # 테이블 행
│       ├── search-panel.tsx      # 검색 패널
│       └── temp-login.tsx        # 임시 로그인

components/
├── order-input-panel/
│   ├── OrderInputPanel.tsx       # 주문 입력 폼
│   ├── OrderControlPanel.tsx
│   └── index.ts
├── chat-panel/
│   ├── ChatPanel.tsx             # 채팅 패널
│   ├── ChatPanelFlutterLayout.tsx
│   ├── SmsPanel.tsx              # SMS 발송
│   ├── SmsPanelFlutterLayout.tsx
│   ├── AppMessagePanel.tsx       # 앱 메시지
│   ├── AppMessagePanelFlutterLayout.tsx
│   ├── MessageTablePanel.tsx     # 메시지 테이블
│   └── ChatHistory.tsx           # 채팅 이력
├── edit-panel/
│   └── EditPanel.tsx             # 데이터 관리 패널
├── ui/
│   ├── button.tsx                # shadcn/ui 버튼
│   ├── card.tsx
│   ├── tabs.tsx
│   ├── input.tsx
│   ├── textarea.tsx
│   ├── label.tsx
│   ├── badge.tsx
│   ├── scroll-area.tsx
│   ├── radio-group.tsx
│   ├── tooltip-cell.tsx          # 툴팁 셀
│   ├── action-card.tsx           # 액션 카드
│   ├── async-autocomplete.tsx    # 비동기 자동완성
│   ├── sync-autocomplete.tsx     # 동기 자동완성
│   ├── loading-skeleton.tsx      # 로딩 스켈레톤
│   └── design-system/            # 디자인 시스템
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       ├── StatusIndicator.tsx
│       └── index.ts
├── theme-provider.tsx            # 테마 제공자
├── query-provider.tsx            # React Query 제공자
├── error-boundary.tsx            # 에러 바운더리
├── login-dialog.tsx              # 로그인 다이얼로그
├── recent-orders-dialog.tsx      # 최근 주문 다이얼로그
├── action-service-initializer.tsx # 액션 서비스 초기화
└── loading-skeleton.tsx          # 로딩 스켈레톤
```

---

## 컴포넌트 의존성 그래프

```
DashboardPage
├── useAuthStore ──────────────────────────┐
├── Header                                 │
│   ├── useAuthStore                       │
│   ├── useSocketStore                     │
│   ├── AreaSelectorModern                 │
│   │   └── useOrderStore                  │
│   ├── OrderFilter ─── useOrderStore      │
│   ├── SearchField                        │
│   ├── CallStatus                         │
│   └── LoginDialog                        │
├── MonitoringPanel                        │
│   ├── useOrderStore ◄────────────────────┤
│   ├── useGpsStore                        │
│   └── useMqtt (훅)                        │
│       ├── useOrderStore                  │
│       ├── useAuthStore                   │
│       └── useGpsStore                    │
├── OrderInputPanel                        │
│   ├── useOrderStore                      │
│   ├── useAuthStore                       │
│   ├── AsyncAutocomplete                  │
│   ├── SyncAutocomplete                   │
│   └── RecentOrdersDialog                 │
├── MessageTablePanel                      │
├── EditPanel                              │
│   └── editService                        │
└── ErrorBoundary                          │
                                           │
ChatPanel                                  │
├── useMqttStore                           │
├── SmsPanel                               │
├── AppMessagePanel                        │
└── ChatHistory                            │
```

---

## 주요 Props 인터페이스

### HeaderProps
```typescript
interface HeaderProps {
  onMenuClick: () => void
  onSettingsClick: () => void
  onEditClick?: () => void
}
```

### EditPanelProps
```typescript
interface EditPanelProps {
  isOpen: boolean
  onClose: () => void
}
```

### OrderInputPanelProps
```typescript
interface OrderInputPanelProps {
  className?: string
}
```

### AsyncAutocompleteProps
```typescript
interface AsyncAutocompleteProps<T> {
  value: string
  onChange: (value: string) => void
  onSelect?: (item: T) => void
  asyncSuggestions: (searchValue: string) => Promise<T[]>
  suggestionBuilder: (item: T) => React.ReactNode
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  className?: string
  onKeyDown?: (e: KeyboardEvent) => void
  onFocus?: (e: FocusEvent) => void
  icon?: React.ReactNode
  debounceDuration?: number
  maxListHeight?: number
  inputRef?: React.RefObject<HTMLInputElement>
}
```

---

## 스타일링 패턴

### Tailwind CSS 유틸리티
```typescript
// cn() 유틸리티로 조건부 클래스 병합
import { cn } from '@/lib/utils'

className={cn(
  "base-classes",
  condition && "conditional-classes",
  isSelected && "selected-classes"
)}
```

### 상태별 색상 규칙
| 상태 | 배경 색상 | 텍스트 색상 |
|------|----------|------------|
| 접수중 | emerald-50 | emerald-700 |
| 배차됨 | gray-50 | gray-600 |
| 예약 | purple-50 | purple-700 |
| 취소됨 | red-50 | red-600 |

### 다크모드 지원
```typescript
// 다크모드 클래스
"bg-white dark:bg-gray-900"
"text-gray-800 dark:text-gray-100"
"border-gray-200 dark:border-gray-700"
```

---

## 반응형 패턴

### 테이블 컬럼 너비
```typescript
// 고정 너비 컬럼
"w-[60px]"   // 날짜
"w-[75px]"   // 시간
"w-[100px]"  // 전화번호
"w-[70px]"   // 고객명
// 가변 너비
"flex-1"     // 호출장소 (남은 공간 채움)
```

### 패널 크기
```typescript
// EditPanel - 편집 모드에 따라 너비 변경
isEditing ? "w-[800px]" : "w-[600px]"

// MessageTablePanel - 고정 높이
"h-[220px]"
```

---

## 폼 요소 크기 규격

### 입력 필드
```typescript
// 기본 높이
"h-7"

// 너비 (용도별)
"w-36"   // 전화번호, 고객명
"w-44"   // 목적지
"w-48"   // 메모
"w-24"   // 드라이버
"w-20"   // 취소 코드

// 패딩
"px-2"   // 좌우
"py-1.5" // 상하

// 텍스트 크기
"text-sm" // 14px
"text-xs" // 12px (테이블)
```

### 버튼
```typescript
// 기본 높이
"h-7"

// 패딩
"px-2"

// 텍스트 크기
"text-xs font-medium"
```

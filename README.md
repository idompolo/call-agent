# 택시 관제 시스템 (Next.js)

플러터 웹 프로젝트를 React/Next.js로 마이그레이션한 택시 매칭 관제 서비스입니다.

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Real-time**: Socket.io Client
- **Form Handling**: React Hook Form + Zod
- **Icons**: Lucide React
- **Theme**: next-themes (다크모드 지원)

## 주요 기능

- 실시간 택시 접수/배차 모니터링
- 운전자/차량/캠프 관리
- 상담원 멀티 에이전트 지원
- SMS 전송 기능
- 지역별/상태별 필터링
- 예약 관리
- 전화 연동 (콜박스)
- 다크모드 지원

## 프로젝트 구조

```
nextjs-app/
├── app/                    # Next.js App Router
│   ├── dashboard/         # 메인 대시보드
│   │   ├── components/    # 대시보드 컴포넌트
│   │   └── page.tsx
│   ├── layout.tsx         # 루트 레이아웃
│   └── page.tsx          # 홈페이지 (대시보드로 리다이렉트)
├── components/            # 공용 컴포넌트
├── hooks/                 # 커스텀 훅
├── lib/                   # 유틸리티 함수
├── store/                 # Zustand 스토어
├── types/                 # TypeScript 타입 정의
└── public/               # 정적 파일

## 설치 및 실행

1. 의존성 설치:
```bash
npm install
```

2. 개발 서버 실행:
```bash
npm run dev
```

3. 프로덕션 빌드:
```bash
npm run build
npm start
```

## 환경 변수


## 마이그레이션 현황

- [x] 프로젝트 구조 설정
- [x] 기본 레이아웃 및 라우팅
- [x] 상태 관리 (Zustand)
- [x] 대시보드 UI 컴포넌트
- [ ] shadcn/ui 컴포넌트 적용
- [ ] 로그인 및 인증
- [ ] API 연동
- [ ] 실시간 통신 (Socket.io)
- [ ] SMS 전송 기능
- [ ] 운전자/차량/캠프 관리 페이지
- [ ] 테스트 및 최적화
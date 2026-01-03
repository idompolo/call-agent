# 인증 라우팅 구조

## 폴더 구조
```
app/
├── page.tsx                    # / → /login 리다이렉트
├── (auth)/                     # 인증 그룹 (미인증 사용자용)
│   ├── layout.tsx              # 인증된 사용자 → /dashboard 리다이렉트
│   └── login/page.tsx          # 로그인 페이지
└── (protected)/                # 보호된 그룹 (인증 필요)
    ├── layout.tsx              # 미인증 사용자 → /login 리다이렉트
    └── dashboard/              # 대시보드 및 컴포넌트들
```

## 인증 플로우
1. `/` 접근 → `/login`으로 리다이렉트
2. `/login` 접근 → 미인증: 로그인 폼 / 인증됨: `/dashboard`로 리다이렉트
3. `/dashboard` 접근 → 미인증: `/login`으로 리다이렉트 / 인증됨: 대시보드 표시

## 핵심 사항
- **미들웨어 미사용**: `output: export` (정적 내보내기)와 호환 불가
- **클라이언트 사이드 인증**: 각 layout.tsx에서 useAuthStore로 처리
- **Route Group**: `(auth)`, `(protected)` - URL에 영향 없음
- **상태관리**: Zustand useAuthStore (persist 비활성화)

## 주요 파일
- `app/(auth)/layout.tsx`: 인증된 사용자 리다이렉트 처리
- `app/(auth)/login/page.tsx`: 로그인 폼
- `app/(protected)/layout.tsx`: 미인증 사용자 리다이렉트 처리
- `store/auth-store.ts`: 인증 상태 관리

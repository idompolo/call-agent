# Call Agent Project

## 프로젝트 컨텍스트 로드

이 프로젝트 작업 시 **Serena 메모리를 먼저 읽어주세요**:

```
1. mcp__serena__activate_project → callagent
2. mcp__serena__read_memory → project-overview
3. mcp__serena__read_memory → key-files
4. mcp__serena__read_memory → data-flow
```

## 프로젝트 요약

- **택시 관제 시스템** (Next.js 14 + Electron 28 하이브리드)
- **실시간 통신**: MQTT (Electron: TCP, Web: WebSocket)
- **상태관리**: Zustand
- **API**: http://211.55.114.181:3000

## 핵심 파일

| 영역 | 파일 |
|------|------|
| Electron 진입점 | `electron/main/index.ts` |
| MQTT 클라이언트 | `electron/main/mqtt/client.ts` |
| 웹 MQTT | `services/mqtt-service.ts` |
| MQTT 훅 | `hooks/use-mqtt.ts` |
| 주문 스토어 | `store/order-store.ts` |
| 대시보드 | `app/dashboard/page.tsx` |

## 빌드 명령어

```bash
npm run dev              # Next.js 개발
npm run electron:dev     # Electron + Next.js
npm run electron:build:mac   # macOS 빌드
```

## 메모리 상세 내용

Serena 메모리에 저장된 상세 문서:
- `project-overview`: 전체 아키텍처, MQTT 토픽, IPC 채널
- `key-files`: 모든 핵심 파일 위치 및 역할
- `data-flow`: 데이터 흐름도, Order 타입, GPS 처리

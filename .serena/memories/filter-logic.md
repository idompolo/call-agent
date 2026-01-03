# Order Filter Logic - 정렬 이슈 분석

## 현재 이슈
- **Filter3**에서 손취 목록이 **최신이 위로** 정렬되는 문제
- Filter1은 정상 작동 (같은 정렬 코드 사용)

## 핵심 파일
- `utils/order-filters.ts` - 필터 및 정렬 로직

## 필터 타입별 설명
| Filter | 우선순위 | 마지막 조건 |
|--------|---------|------------|
| Filter1 | 손취>첵콜>poi없는접수>**배차후취소** |
| Filter2 | 손취>첵콜>모든접수>**배차후취소** |
| Filter3 | 손취>첵콜>poi없는접수>**미탑승** | ← 이슈 발생 |
| Filter4 | 손취>첵콜>모든접수>**미탑승** |
| Filter5 | 손취>첵콜>모든접수>배차(탑승,배차후취소 제외) |
| Filter6 | 접수만 |
| Filter7 | 예약만 (취소포함) |
| Filter8 | 예약만 (취소제외) |

## 정렬 로직 구조

### sortKeyGen (line 131-136)
```typescript
const sortKeyGen = (priority: number, date: Date | undefined): number => {
  const timestamp = date ? date.getTime() : 0
  return parseInt(`${priority}${timestamp}`)
}
```
- priority + timestamp 결합 → 큰 숫자 생성
- 예: priority=1, timestamp=1704067200000 → "11704067200000"

### getSortCal3 (Filter3용, line 262-283)
```typescript
// Priority 순서 (낮은 숫자 = 높은 우선순위)
1: 손취 (sortKeyGen(1, order.addAt))
2: 첵콜 (sortKeyGen(2, 첵콜action.at))
3: POI없는접수 (sortKeyGen(3, order.addAt))
4: 미탑승 (sortKeyGen(4, order.addAt))
```

### 정렬 비교 (line 159-165)
```typescript
return filtered.sort((a, b) => {
  const bt = getSortCal3(b)
  const at = getSortCal3(a)
  return at - bt // Ascending order (oldest first)
})
```

## 분석 필요 사항
1. Filter1과 Filter3의 손취 주문이 **동일한 주문들**인지 확인
2. `isSonCancel` 조건 차이 확인
3. 실제 데이터의 `addAt` 값 확인 필요

## 확인용 콘솔 명령어
```javascript
// 손취 주문 확인
useOrderStore.getState().orders
  .filter(o => o.actions?.some(a => a.name === '손취'))
  .map(o => ({ id: o.id, addAt: o.addAt, status: o.status }))
```

## 수정 후보
1. 정렬 방향 변경: `at - bt` → `bt - at` (Filter3만)
2. sortKeyGen에서 timestamp 역순 처리 (전체 영향)
3. isSonCancel 조건 확인 및 수정

## 관련 수정 이력
- `isSonCancel` 조건에서 `!isCancel(order)` 제거됨 (line 309-311)
- Filter 조건에서 `sonc`에 `!isCancel(order)` 제거됨

'use client'

import { useEffect, useRef, useMemo, useState, useCallback, memo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useOrderStore } from '@/store/order-store'
import { useAuthStore } from '@/store/auth-store'
import { useMqtt } from '@/hooks/use-mqtt'
import { Order } from '@/types/order'
import { cn } from '@/lib/utils'
import { formatOrderStatus } from '@/utils/order-formatter'
import { applyOrderFilter } from '@/utils/order-filters'
import { useGpsStore } from '@/store/gps-store'
import { distanceBetween, distanceToHuman } from '@/utils/distance'
import styles from './monitoring-panel-virtualized.module.css'
import { OrderTableRow } from './order-table-row'
import { LoadingSkeleton, EmptyState } from '@/components/ui/loading-skeleton'
// StatusIndicator 제거 - 원래 상태 표시 방식 사용

// Performance optimized style constants - defined outside component
const COMPACT_ROW_HEIGHT = 26 // Row height in pixels - 컴팩트하게 조정

export function MonitoringPanelVirtualized() {
  const { orders, selectedOrder, selectOrder, areaFilter, orderFilterType } = useOrderStore()
  const { isConnected } = useMqtt() // This hook handles MQTT subscriptions
  const { getGpsData, gpsMap } = useGpsStore()
  const { isInitializing } = useAuthStore() // 초기화 상태 확인
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(true)
  const [scrollbarWidth, setScrollbarWidth] = useState(0)

  // 성능 최적화: Set으로 변환하여 O(1) 조회
  const areaFilterSet = useMemo(() => new Set(areaFilter), [areaFilter])
  
  // 성능 최적화: 알려진 지역 코드를 Set으로 미리 정의
  const knownAreaPrefixes = useMemo(() => 
    new Set(['s=', 'c=', 'o=', 'p=', 'k=', 'w=', 'a=', 't=']), 
    []
  )

  // 지역 필터링된 주문 목록 - useMemo로 최적화
  const filteredOrders = useMemo(() => {
    // areaFilter가 비어있으면 아무것도 표시하지 않음
    if (areaFilter.length === 0) return []
    
    let areaFilteredOrders: Order[]
    
    // areaFilter에 'all'이 포함되어 있으면 모든 주문 표시
    if (areaFilterSet.has('all')) {
      areaFilteredOrders = orders
    } else {
      // callplace가 선택된 지역 코드로 시작하는지 확인
      areaFilteredOrders = orders.filter(order => {
        // 빠른 실패 처리
        if (!order.callplace) return false
        
        // 일반적인 경우 먼저 체크 (성능 최적화)
        for (const area of areaFilter) {
          if (area !== 'y=' && order.callplace.startsWith(area)) {
            return true
          }
        }
        
        // 'y=' 특수 케이스 처리
        if (areaFilterSet.has('y=')) {
          const hasEqualSign = order.callplace.includes('=')
          if (!hasEqualSign) return false
          
          // 알려진 지역 코드로 시작하는지 확인
          const startsWithKnownArea = Array.from(knownAreaPrefixes).some(
            knownArea => order.callplace!.startsWith(knownArea)
          )
          if (startsWithKnownArea) return false
          return true
        }
        
        return false
      })
    }
    
    // Apply order filter (filter1, filter2, etc.)
    const filtered = applyOrderFilter(areaFilteredOrders, orderFilterType)
    return filtered
  }, [orders, areaFilter, areaFilterSet, knownAreaPrefixes, orderFilterType])


  // Virtual scrolling setup with compact row height
  // 실시간 업데이트 감지를 위한 간소화된 key 생성
  // 중요한 변경사항만 추적하여 성능 최적화
  const virtualizerKey = useMemo(() => {
    // 첫 번째와 마지막 주문, 그리고 전체 길이만 체크
    const len = filteredOrders.length
    if (len === 0) return 'empty'
    const first = filteredOrders[0]
    const last = filteredOrders[len - 1]
    return `${len}-${first.id}-${first.modifyAt?.getTime() || 0}-${last.id}-${last.modifyAt?.getTime() || 0}`
  }, [filteredOrders])

  const rowVirtualizer = useVirtualizer({
    count: filteredOrders.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => COMPACT_ROW_HEIGHT,
    overscan: 10, // 더 많은 행을 미리 렌더링
    // 각 행의 고유 키 생성 - actions 변경 및 수정 감지
    getItemKey: useCallback((index: number) => {
      const order = filteredOrders[index]
      if (!order) return `empty-${index}`
      // actions 배열 변경과 수정 시간을 감지하기 위해 키에 포함
      return `${order.id}-${order.actions?.length || 0}-${order.modifyAt?.getTime() || 0}-${order.status}`
    }, [filteredOrders]),
  })

  // MQTT connection status (handled by useMqtt hook)
  useEffect(() => {
    console.log('MQTT connection status:', isConnected)
  }, [isConnected])

  // Force re-render when GPS data changes
  useEffect(() => {
    // This effect will trigger when gpsMap changes, causing a re-render
  }, [gpsMap])

  // orders 변경 시 virtualizer 강제 재측정
  useEffect(() => {
    // orders가 업데이트되면 virtualizer를 재측정
    rowVirtualizer.measure()
  }, [orders, rowVirtualizer])

  // Auto scroll to bottom when new orders are added
  useEffect(() => {
    if (shouldAutoScroll.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [filteredOrders])

  // Check if user is scrolling
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
      // If user is near bottom (within 100px), enable auto-scroll
      shouldAutoScroll.current = scrollTop + clientHeight >= scrollHeight - 100
    }
  }, [])

  // Calculate scrollbar width when container changes
  useEffect(() => {
    const calculateScrollbarWidth = () => {
      if (scrollContainerRef.current) {
        const { offsetWidth, clientWidth } = scrollContainerRef.current
        const width = offsetWidth - clientWidth
        setScrollbarWidth(width)
      }
    }

    // Initial calculation
    calculateScrollbarWidth()

    // Recalculate on window resize
    const handleResize = () => {
      calculateScrollbarWidth()
    }

    window.addEventListener('resize', handleResize)
    
    // Also recalculate when filtered orders change
    const timer = setTimeout(calculateScrollbarWidth, 100)

    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timer)
    }
  }, [filteredOrders])

  // Calculate distance for an order
  const calculateDistance = useCallback((order: Order): { text: string; distance: number } => {
    if (!order.drvNo || !order.lat || !order.lng) return { text: '-', distance: 0 }
    
    const gpsData = getGpsData(order.drvNo)
    if (!gpsData) return { text: '-', distance: 0 }
    
    const distance = distanceBetween(order.lat, order.lng, gpsData.lat, gpsData.lng)
    return { text: distanceToHuman(distance), distance }
  }, [getGpsData])

  // Check if order is boarding
  const isBoarding = useCallback((order: Order): boolean => {
    return order.actions?.some(action => action.name === '탑승') || false
  }, [])

  return (
    <div 
      className="h-full overflow-hidden bg-white dark:bg-gray-900 shadow-lg flex flex-col border border-gray-200 dark:border-gray-700"
      style={{ '--compact-row-height': `${COMPACT_ROW_HEIGHT}px` } as React.CSSProperties}
    >
      {/* 초기화 상태 표시 */}
      {isInitializing && (
        <div className="bg-yellow-100 dark:bg-yellow-900/20 px-3 py-2 flex items-center gap-2 border-b border-yellow-200 dark:border-yellow-800">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
          <span className="text-sm text-yellow-700 dark:text-yellow-400">
            초기 데이터 로딩 중...
          </span>
        </div>
      )}
      {/* 주문 목록 - 가상 스크롤링을 위한 컨테이너 */}
      <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900/50 flex flex-col">
        {/* 테이블 헤더 - 모던 스타일 */}
        <div 
          className="bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 shadow-sm z-10 flex-shrink-0"
          style={{ paddingRight: `${scrollbarWidth}px` }}
        >
          <table className="w-full table-fixed" role="table" aria-label="주문 모니터링 테이블">
            <thead className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-850" role="rowgroup">
              <tr className={cn(styles.compactHeader, "border-b border-gray-200 dark:border-gray-700")} role="row">
                <th className={cn(styles.compactHeaderCell, "text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[40px] border-r border-gray-200/20 dark:border-gray-700/20")} role="columnheader" scope="col">날짜</th>
                <th className={cn(styles.compactHeaderCell, "text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[65px] border-r border-gray-200/20 dark:border-gray-700/20")} role="columnheader" scope="col">시간</th>
                <th className="px-2 py-1 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[100px] border-r border-gray-200/20 dark:border-gray-700/20" role="columnheader" scope="col">전화번호</th>
                <th className="px-2 py-1 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[140px] border-r border-gray-200/20 dark:border-gray-700/20" role="columnheader" scope="col">고객명</th>
                <th className="px-2 py-1 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[100px] border-r border-gray-200/20 dark:border-gray-700/20" role="columnheader" scope="col">목적지</th>
                <th className="px-2 py-1 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200/20 dark:border-gray-700/20" role="columnheader" scope="col">호출장소</th>
                <th className="px-2 py-1 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[80px] border-r border-gray-200/20 dark:border-gray-700/20" role="columnheader" scope="col">문자</th>
                <th className="px-2 py-1 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[100px] border-r border-gray-200/20 dark:border-gray-700/20" role="columnheader" scope="col">메모</th>
                <th className="px-2 py-1 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[150px] border-r border-gray-200/20 dark:border-gray-700/20" role="columnheader" scope="col">POI</th>
                <th className="px-2 py-1 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[70px] border-r border-gray-200/20 dark:border-gray-700/20" role="columnheader" scope="col">거리</th>
                <th className="px-2 py-1 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[55px] border-r border-gray-200/20 dark:border-gray-700/20" role="columnheader" scope="col">기사</th>
                <th className="px-2 py-1 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[70px] border-r border-gray-200/20 dark:border-gray-700/20" role="columnheader" scope="col">차량</th>
                <th className="px-2 py-1 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[80px] border-r border-gray-200/20 dark:border-gray-700/20" role="columnheader" scope="col">배차시간</th>
                <th className="px-2 py-1 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[50px] border-r border-gray-200/20 dark:border-gray-700/20" role="columnheader" scope="col">관여자</th>
                <th className="px-2 py-1 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[70px] text-center" role="columnheader" scope="col">상태</th>
              </tr>
            </thead>
          </table>
        </div>

        {/* 가상 스크롤 컨테이너 */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="overflow-auto flex-1"
          role="region"
          aria-label="주문 목록 스크롤 영역"
          tabIndex={0}
        >
          {filteredOrders.length > 0 ? (
            <div className="min-h-full flex flex-col justify-end">
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
              {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                const order = filteredOrders[virtualItem.index]
                
                return (
                  <div
                    key={`${virtualItem.key}-${order?.actions?.length || 0}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                      zIndex: selectedOrder?.id === order.id ? 30 : 'auto',
                    }}
                  >
                    <OrderTableRow
                      order={order}
                      isSelected={selectedOrder?.id === order.id}
                      onSelect={selectOrder}
                      rowHeight={COMPACT_ROW_HEIGHT}
                    />
                  </div>
                )
              })}
              </div>
            </div>
          ) : isInitializing ? (
            <div className="p-8">
              <LoadingSkeleton count={15} />
            </div>
          ) : (
            <EmptyState 
              title={orders.length === 0 ? '주문이 없습니다' : '해당 지역에 주문이 없습니다'}
              description={orders.length === 0 ? '새로운 주문이 접수되면 여기에 표시됩니다' : '다른 지역을 선택해보세요'}
            />
          )}
        </div>
      </div>
    </div>
  )
}
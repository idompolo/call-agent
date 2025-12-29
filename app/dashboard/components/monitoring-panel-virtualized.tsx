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
import { useColumnWidths, DEFAULT_COLUMN_WIDTHS } from '@/hooks/use-column-widths'
// StatusIndicator 제거 - 원래 상태 표시 방식 사용

// 컬럼 정의 (순서대로)
// callplace는 flex-1로 자동 확장되므로 리사이즈 불가
// callplace 이전 컬럼: 오른쪽 핸들로 리사이즈
// callplace 이후 컬럼: 왼쪽 핸들로 리사이즈 (handlePosition: 'left')
const COLUMNS = [
  { id: 'date', label: '날짜', resizable: true },
  { id: 'time', label: '시간', resizable: true },
  { id: 'telephone', label: '전화번호', resizable: true },
  { id: 'customerName', label: '고객명', resizable: true },
  { id: 'calldong', label: '목적지', resizable: true },
  { id: 'callplace', label: '호출장소', resizable: false }, // flex-1
  { id: 'sms', label: '문자', resizable: true, handlePosition: 'left' },
  { id: 'memo', label: '메모', resizable: true, handlePosition: 'left' },
  { id: 'poi', label: 'POI', resizable: true, handlePosition: 'left' },
  { id: 'distance', label: '거리', resizable: true, handlePosition: 'left' },
  { id: 'drvNo', label: '기사', resizable: true, handlePosition: 'left' },
  { id: 'licensePlate', label: '차량', resizable: true, handlePosition: 'left' },
  { id: 'acceptTime', label: '배차시간', resizable: true, handlePosition: 'left' },
  { id: 'agents', label: '관여자', resizable: true, handlePosition: 'left' },
  { id: 'status', label: '상태', resizable: true, handlePosition: 'left' },
]

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

  // 컬럼 너비 관리 훅
  const {
    columnWidths,
    isResizing,
    resizingColumn,
    startResize,
    onResize,
    endResize,
    resetColumnWidths,
  } = useColumnWidths()

  // 마우스 이동/업 이벤트 핸들러 (리사이즈용)
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      onResize(e.clientX)
    }

    const handleMouseUp = () => {
      endResize()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, onResize, endResize])

  // 리사이즈 핸들 마우스다운 핸들러
  const handleResizeMouseDown = useCallback((columnId: string, e: React.MouseEvent, direction: 'right' | 'left' = 'right') => {
    e.preventDefault()
    e.stopPropagation()
    startResize(columnId, e.clientX, direction)
  }, [startResize])

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

  // virtualizer 값을 메모이제이션하여 불필요한 재계산 방지
  const virtualItems = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()

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
    // queueMicrotask로 다음 틱에 실행하여 flushSync 경고 방지
    queueMicrotask(() => {
      rowVirtualizer.measure()
    })
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
        {/* 테이블 헤더 - 리사이즈 가능 */}
        <div
          className={cn(
            "bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 shadow-sm z-10 flex-shrink-0",
            isResizing && "select-none"
          )}
          style={{ paddingRight: `${scrollbarWidth}px` }}
        >
          <table className="w-full table-fixed" role="table" aria-label="주문 모니터링 테이블">
            <thead className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-850" role="rowgroup">
              <tr className={cn(styles.compactHeader, "border-b border-gray-200 dark:border-gray-700")} role="row">
                {COLUMNS.map((column, index) => {
                  const width = columnWidths[column.id]
                  const isLastColumn = index === COLUMNS.length - 1
                  const isFlexColumn = column.id === 'callplace'

                  return (
                    <th
                      key={column.id}
                      className={cn(
                        "px-2 py-1 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider relative group",
                        !isLastColumn && "border-r border-gray-200/20 dark:border-gray-700/20",
                        isLastColumn && "text-center",
                        resizingColumn === column.id && "bg-primary/10"
                      )}
                      style={{
                        width: isFlexColumn ? undefined : `${width}px`,
                        minWidth: isFlexColumn ? undefined : `${width}px`,
                        maxWidth: isFlexColumn ? undefined : `${width}px`,
                      }}
                      role="columnheader"
                      scope="col"
                    >
                      <span className="truncate block">{column.label}</span>

                      {/* 리사이즈 핸들 */}
                      {/* 오른쪽 핸들: callplace 이전 컬럼 (마지막 컬럼 제외) */}
                      {/* 왼쪽 핸들: callplace 이후 컬럼 (마지막 컬럼 포함) */}
                      {column.resizable && (() => {
                        const isLeftHandle = column.handlePosition === 'left'
                        // 오른쪽 핸들은 마지막 컬럼 제외, 왼쪽 핸들은 마지막 컬럼도 포함
                        if (!isLeftHandle && isLastColumn) return null

                        return (
                          <div
                            className={cn(
                              "absolute top-0 bottom-0 w-2 cursor-col-resize z-20",
                              isLeftHandle ? "left-0" : "right-0",
                              "hover:bg-primary/30 transition-colors",
                              "after:absolute after:top-1/4 after:bottom-1/4 after:w-0.5",
                              isLeftHandle ? "after:left-0" : "after:right-0",
                              "after:bg-gray-300 dark:after:bg-gray-600",
                              "hover:after:bg-primary",
                              resizingColumn === column.id && "bg-primary/50 after:bg-primary"
                            )}
                            onMouseDown={(e) => handleResizeMouseDown(column.id, e, isLeftHandle ? 'left' : 'right')}
                            onDoubleClick={() => {
                              // 더블클릭 시 기본 너비로 복원 (리사이즈 시뮬레이션)
                              const defaultWidth = DEFAULT_COLUMN_WIDTHS[column.id]
                              if (defaultWidth && columnWidths[column.id] !== defaultWidth) {
                                // 현재 너비와 기본 너비의 차이만큼 리사이즈 시뮬레이션
                                const currentWidth = columnWidths[column.id]
                                startResize(column.id, currentWidth, isLeftHandle ? 'left' : 'right')
                                onResize(defaultWidth)
                                endResize()
                              }
                            }}
                            title="드래그하여 너비 조절 / 더블클릭하여 초기화"
                          />
                        )
                      })()}
                    </th>
                  )
                })}
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
                  height: `${totalSize}px`,
                  width: '100%',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
              {virtualItems.map((virtualItem) => {
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
                      columnWidths={columnWidths}
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
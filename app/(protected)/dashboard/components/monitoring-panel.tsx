'use client'

import { useEffect, useRef, useMemo } from 'react'
import { useOrderStore } from '@/store/order-store'
import { useMqtt } from '@/hooks/use-mqtt'
import { Order } from '@/types/order'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { TooltipCell } from '@/components/ui/tooltip-cell'
import { ActionCard } from '@/components/ui/action-card'
import { formatAgentsDisplay, formatOrderStatus, isWaitingOrder } from '@/utils/order-formatter'
import { applyOrderFilter } from '@/utils/order-filters'
import { useGpsStore } from '@/store/gps-store'
import { distanceBetween, distanceToHuman } from '@/utils/distance'

export function MonitoringPanel() {
  const { orders, selectedOrder, selectOrder, areaFilter, orderFilterType } = useOrderStore()
  const { isConnected } = useMqtt() // This hook handles MQTT subscriptions
  const { getGpsData, gpsMap } = useGpsStore()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(true)

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

  // 성능 최적화: 통계를 한 번의 순회로 계산
  const orderStats = useMemo(() => {
    const stats = {
      total: filteredOrders.length,
      waiting: 0,
      dispatched: 0,
      reserved: 0,
      cancelled: 0
    }
    
    // 이미 필터링된 주문들을 한 번만 순회
    filteredOrders.forEach(order => {
      if (order.cancelAt) {
        stats.cancelled++
      } else if (order.reserveAt) {
        stats.reserved++
      } else if (order.acceptAgent) {
        stats.dispatched++
      } else if (isWaitingOrder(order)) {
        stats.waiting++
      }
    })
    
    return stats
  }, [filteredOrders])

  // MQTT connection status (handled by useMqtt hook)
  useEffect(() => {
    console.log('MQTT connection status:', isConnected)
  }, [isConnected])

  // Force re-render when GPS data changes
  useEffect(() => {
    // This effect will trigger when gpsMap changes, causing a re-render
  }, [gpsMap])

  // Auto scroll to bottom when new orders are added
  useEffect(() => {
    if (shouldAutoScroll.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [filteredOrders])

  // Check if user is scrolling
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
      // If user is near bottom (within 100px), enable auto-scroll
      shouldAutoScroll.current = scrollTop + clientHeight >= scrollHeight - 100
    }
  }

  // Calculate distance for an order
  const calculateDistance = (order: Order): { text: string; distance: number } => {
    if (!order.drvNo || !order.lat || !order.lng) return { text: '-', distance: 0 }
    
    const gpsData = getGpsData(order.drvNo)
    if (!gpsData) return { text: '-', distance: 0 }
    
    const distance = distanceBetween(order.lat, order.lng, gpsData.lat, gpsData.lng)
    return { text: distanceToHuman(distance), distance }
  }

  // Check if order is boarding
  const isBoarding = (order: Order): boolean => {
    return order.actions?.some(action => action.name === '탑승') || false
  }

  return (
    <div className="h-full rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 shadow-lg flex flex-col">
      {/* 헤더 */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100">주문 현황</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
            총 {orderStats.total}건
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            접수 {orderStats.waiting}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800/30 text-gray-600 dark:text-gray-400 text-sm font-normal">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            배차 {orderStats.dispatched}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            예약 {orderStats.reserved}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm opacity-90">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            취소 {orderStats.cancelled}
          </span>
        </div>
      </div>

      {/* 주문 목록 */}
      <div className="flex-1 bg-white dark:bg-gray-900 flex flex-col">
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-auto flex flex-col"
        >
          <div className="flex-1 min-h-0"></div>
          <table className="w-full table-fixed border-separate border-spacing-0 overflow-visible flex-shrink-0">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-10">
            <tr className="h-8">
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[60px]">날짜</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[75px]">시간</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[100px]">전화번호</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[70px]">고객명</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[80px]">목적지</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">호출장소</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[80px]">문자</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[100px]">메모</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[150px]">POI</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[70px]">거리</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[55px]">기사</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[70px]">차량</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[80px]">배차시간</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[50px]">관여자</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[70px] text-center">상태</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => {
              const isCancelled = !!order.cancelAt
              const isWaiting = isWaitingOrder(order)
              const isAccepted = order.acceptAgent && !order.cancelAt
              const isReserved = !!order.reserveAt && !order.cancelAt
              
              return (
                <tr
                  key={order.id}
                  onClick={() => selectOrder(order)}
                  className={cn(
                    "group cursor-pointer transition-all duration-150 hover:shadow-lg hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-transparent dark:hover:from-gray-800/30 dark:hover:to-transparent relative",
                    selectedOrder?.id === order.id && "ring-2 ring-primary/40 shadow-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-transparent z-20",
                    // 취소됨 - 빨간색 배경과 텍스트
                    isCancelled && "bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 [&_td:not(.distance-color)]:!text-red-600 dark:[&_td:not(.distance-color)]:!text-red-400 [&_td:not(.distance-color)]:!opacity-75",
                    // 접수중 - 초록색 배경과 텍스트
                    isWaiting && !isReserved && "bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 [&_td:not(.distance-color)]:!text-emerald-700 dark:[&_td:not(.distance-color)]:!text-emerald-400 [&_td:not(.distance-color)]:!font-semibold",
                    // 예약 - 보라색 배경과 텍스트
                    isReserved && !isAccepted && "bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-950/30 [&_td:not(.distance-color)]:!text-purple-700 dark:[&_td:not(.distance-color)]:!text-purple-400 [&_td:not(.distance-color)]:!font-medium",
                    // 배차됨 - 연한 회색 배경과 텍스트
                    isAccepted && !isCancelled && "bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50 [&_td:not(.distance-color)]:!text-gray-600 dark:[&_td:not(.distance-color)]:!text-gray-400 [&_td:not(.distance-color)]:!font-normal [&_td:not(.distance-color)]:!opacity-90",
                    // 기본 행 스타일
                    !isCancelled && !isWaiting && !isReserved && !isAccepted && "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  )}
                >
                <td className={cn(
                  "px-2 py-1.5 text-xs w-[60px] relative",
                  selectedOrder?.id === order.id && "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary before:animate-pulse"
                )}>
                  <TooltipCell content={order.addAt && !isNaN(new Date(order.addAt).getTime()) ? format(new Date(order.addAt), 'MM/dd', { locale: ko }) : '-'}>
                    {order.addAt && !isNaN(new Date(order.addAt).getTime()) ? format(new Date(order.addAt), 'MM/dd', { locale: ko }) : '-'}
                  </TooltipCell>
                </td>
                <td className="px-2 py-1.5 text-xs w-[75px]">
                  <TooltipCell content={order.addAt && !isNaN(new Date(order.addAt).getTime()) ? format(new Date(order.addAt), 'HH:mm:ss', { locale: ko }) : '-'}>
                    {order.addAt && !isNaN(new Date(order.addAt).getTime()) ? format(new Date(order.addAt), 'HH:mm:ss', { locale: ko }) : '-'}
                  </TooltipCell>
                </td>
                <td className="px-2 py-1.5 text-xs bg-primary/5 w-[100px] text-center">
                  <TooltipCell content={order.telephone || '-'}>
                    {order.telephone || '-'}
                  </TooltipCell>
                </td>
                <td className="px-2 py-1.5 text-xs text-center w-[70px]">
                  <TooltipCell 
                    content={order.customerName || '-'}
                    className={cn(
                      "font-medium",
                      order.token && "bg-blue-100 dark:bg-blue-900 px-1 rounded"
                    )}
                  />
                </td>
                <td className="px-2 py-1.5 text-xs w-[80px]">
                  <TooltipCell content={order.calldong || '-'}>
                    {order.calldong || '-'}
                  </TooltipCell>
                </td>
                <td className="px-2 py-1.5 text-xs">
                  <div className="flex items-center gap-1">
                    {order.selectAgent && (
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold flex-shrink-0 isolate">
                        {order.selectAgent}
                      </span>
                    )}
                    <TooltipCell content={order.callplace || '-'} className="flex-1" />
                    {order.actions && order.actions.slice().reverse().map((action, idx) => (
                      <ActionCard
                        key={idx}
                        name={action.name}
                        time={action.at && !isNaN(new Date(action.at).getTime()) ? format(new Date(action.at), 'HH:mm') : '--:--'}
                      />
                    ))}
                  </div>
                </td>
                <td className="px-2 py-1.5 text-xs w-[80px]">
                  <TooltipCell content="-">
                    -
                  </TooltipCell>
                </td>
                <td className="px-2 py-1.5 text-xs w-[100px]">
                  <TooltipCell content={order.extra || '-'}>
                    {order.extra || '-'}
                  </TooltipCell>
                </td>
                <td className="px-2 py-1.5 text-xs w-[150px]">
                  <TooltipCell 
                    content={order.poiName || '-'}
                    className={cn(!order.poiName && "bg-muted px-1")}
                  >
                    {order.poiName || '-'}
                  </TooltipCell>
                </td>
                <td 
                  className="px-2 py-1.5 text-xs text-right w-[70px] distance-color"
                  style={{ 
                    color: (() => {
                      const isOrderBoarding = isBoarding(order)
                      return isCancelled 
                        ? 'rgba(156, 163, 175, 0.5)' 
                        : isOrderBoarding 
                          ? 'rgb(59, 130, 246)' 
                          : 'rgb(239, 68, 68)'
                    })()
                  }}
                >
                  {(() => {
                    const distanceInfo = calculateDistance(order)
                    
                    return (
                      <TooltipCell content={distanceInfo.text}>
                        <div className="flex items-center justify-end gap-1">
                          {distanceInfo.distance > 0 && distanceInfo.distance < 50 && (
                            <svg className="w-3 h-3" style={{ color: '#eab308' }} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span style={{ fontWeight: 'bold' }}>
                            {distanceInfo.text}
                          </span>
                        </div>
                      </TooltipCell>
                    )
                  })()}
                </td>
                <td className="px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-800/50 font-bold w-[55px] text-center">
                  <TooltipCell content={order.drvNo || '-'}>
                    {order.drvNo || '-'}
                  </TooltipCell>
                </td>
                <td className="px-2 py-1.5 text-xs bg-primary/5 font-bold w-[70px] text-center">
                  <TooltipCell content={order.licensePlate || '-'}>
                    {order.licensePlate || '-'}
                  </TooltipCell>
                </td>
                <td className="px-2 py-1.5 text-xs w-[80px] text-center">
                  <TooltipCell content={order.acceptAt && !isNaN(new Date(order.acceptAt).getTime()) ? format(new Date(order.acceptAt), 'HH:mm:ss', { locale: ko }) : '-'}>
                    {order.acceptAt && !isNaN(new Date(order.acceptAt).getTime()) ? format(new Date(order.acceptAt), 'HH:mm:ss', { locale: ko }) : '-'}
                  </TooltipCell>
                </td>
                <td className="px-2 py-1.5 text-xs w-[50px]">
                  <TooltipCell content={formatAgentsDisplay(order.addAgent, order.acceptAgent)}>
                    {formatAgentsDisplay(order.addAgent, order.acceptAgent)}
                  </TooltipCell>
                </td>
                <td className="px-2 py-1.5 text-xs w-[70px] text-center">
                  <TooltipCell content={formatOrderStatus(order)}>
                    {formatOrderStatus(order)}
                  </TooltipCell>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>

          {filteredOrders.length === 0 && (
            <div className="flex items-center justify-center h-32 text-muted-foreground flex-shrink-0">
              {orders.length === 0 ? '접수된 주문이 없습니다' : '선택된 지역에 해당하는 주문이 없습니다'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
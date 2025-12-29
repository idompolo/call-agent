'use client'

import { memo } from 'react'
import { Order } from '@/types/order'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { TooltipCell } from '@/components/ui/tooltip-cell'
import { ActionCard } from '@/components/ui/action-card'
import { formatAgentsDisplay, formatOrderStatus, isWaitingOrder } from '@/utils/order-formatter'
import { ORDER_COLORS } from '@/utils/order-colors'
import styles from './monitoring-panel-virtualized.module.css'
import { useGpsStore } from '@/store/gps-store'
import { distanceBetween, distanceToHuman } from '@/utils/distance'

interface OrderTableRowProps {
  order: Order
  isSelected: boolean
  onSelect: (order: Order) => void
  rowHeight: number
}

// Memoized row component for better performance
export const OrderTableRow = memo(function OrderTableRow({
  order,
  isSelected,
  onSelect,
  rowHeight
}: OrderTableRowProps) {
  // GPS 데이터 직접 구독 - 해당 기사의 GPS만 구독
  const gpsData = useGpsStore((state) => 
    order.drvNo ? state.gpsMap.get(order.drvNo) : undefined
  )
  
  // 거리 계산 함수 (컴포넌트 내부에서 직접 처리)
  const calculateDistance = (order: Order): { text: string; distance: number } => {
    if (!order.drvNo || !order.lat || !order.lng) return { text: '-', distance: 0 }
    if (!gpsData) return { text: '-', distance: 0 }
    
    const distance = distanceBetween(order.lat, order.lng, gpsData.lat, gpsData.lng)
    return { text: distanceToHuman(distance), distance }
  }
  
  // 탑승 여부 확인 함수
  const isBoarding = (order: Order): boolean => {
    return order.actions?.some(action => action.name === '탑승') || false
  }
  const isCancelled = !!order.cancelAt
  const isWaiting = isWaitingOrder(order)
  const isAccepted = order.acceptAgent && !order.cancelAt
  const isReserved = !!order.reserveAt && !order.cancelAt
  
  return (
    <table className="w-full table-fixed" role="presentation">
      <tbody role="rowgroup">
        <tr
          onClick={() => {
            onSelect(order)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelect(order)
            }
          }}
          tabIndex={0}
          role="row"
          aria-selected={isSelected}
          aria-label={`주문 ${order.id}: ${order.customerName || '고객명 없음'}, 상태: ${formatOrderStatus(order)}`}
          className={cn(
            "group cursor-pointer transition-all duration-300 hover:shadow-xl relative border-b border-gray-200/20 dark:border-gray-700/20",
            // 선택된 행만 배경색 적용
            isSelected && "bg-gray-300 dark:bg-gray-600 shadow-xl z-30",
            // 텍스트 색상은 상태에 따라 적용
            isCancelled && ORDER_COLORS.cancelled.text,
            isWaiting && !isReserved && ORDER_COLORS.waiting.text,
            isReserved && !isAccepted && ORDER_COLORS.reserved.text,
            isAccepted && !isCancelled && ORDER_COLORS.accepted.text,
            !isCancelled && !isWaiting && !isReserved && !isAccepted && ORDER_COLORS.default.text
          )}
          style={{
            height: `${rowHeight}px`,
            maxHeight: `${rowHeight}px`
          }}
        >
          <td className={cn(
            styles.compactCell,
            "text-sm w-[40px] relative text-center border-r border-gray-200/20 dark:border-gray-700/20",
            isSelected && "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-gray-700 dark:before:bg-gray-300 before:animate-pulse"
          )}
          style={{ paddingLeft: '16px', paddingRight: '16px' }}>
            <TooltipCell content={order.addAt && !isNaN(new Date(order.addAt).getTime()) ? format(new Date(order.addAt), 'MM/dd', { locale: ko }) : '-'}>
              {order.addAt && !isNaN(new Date(order.addAt).getTime()) ? format(new Date(order.addAt), 'M/d', { locale: ko }) : '-'}
            </TooltipCell>
          </td>
          <td className={cn(styles.compactCell, "text-sm w-[65px] text-center border-r border-gray-200/20 dark:border-gray-700/20")}>
            <TooltipCell content={order.addAt && !isNaN(new Date(order.addAt).getTime()) ? format(new Date(order.addAt), 'HH:mm:ss', { locale: ko }) : '-'}>
              {order.addAt && !isNaN(new Date(order.addAt).getTime()) ? format(new Date(order.addAt), 'HH:mm:ss', { locale: ko }) : '-'}
            </TooltipCell>
          </td>
          <td className={cn(
            styles.compactCell, 
            "text-sm w-[100px] text-center border-r border-gray-200/20 dark:border-gray-700/20",
            // 선택되지 않은 경우에만 배경색 적용
            !isSelected && "bg-primary/5"
          )}>
            <TooltipCell content={order.telephone || '-'}>
              {order.telephone || '-'}
            </TooltipCell>
          </td>
          <td className={cn(
            styles.compactCell, 
            "text-sm text-center w-[140px] border-r border-gray-200/20 dark:border-gray-700/20"
          )}>
            <TooltipCell 
              content={order.customerName || '-'}
              className={cn(
                "font-medium",
                order.token && "bg-blue-100 dark:bg-blue-900 px-1 rounded"
              )}
            />
          </td>
          <td className={cn(styles.compactCell, "text-sm w-[100px] border-r border-gray-200/20 dark:border-gray-700/20")}>
            <TooltipCell content={order.calldong || '-'}>
              {order.calldong || '-'}
            </TooltipCell>
          </td>
          <td className={cn(styles.compactCell, "text-sm border-r border-gray-200/20 dark:border-gray-700/20")}>
            <div className="flex items-center gap-1">
              {order.selectAgent && (
                <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold flex-shrink-0 isolate">
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
          <td className={cn(styles.compactCell, "text-sm w-[80px] border-r border-gray-200/20 dark:border-gray-700/20")}>
            <TooltipCell content="-">
              -
            </TooltipCell>
          </td>
          <td className={cn(styles.compactCell, "text-sm w-[100px] border-r border-gray-200/20 dark:border-gray-700/20")}>
            <TooltipCell content={order.extra || '-'}>
              {order.extra || '-'}
            </TooltipCell>
          </td>
          <td className={cn(styles.compactCell, "text-sm w-[150px] border-r border-gray-200/20 dark:border-gray-700/20")}>
            <TooltipCell 
              content={order.poiName || '-'}
              className={cn(!order.poiName && "bg-muted px-1")}
            >
              {order.poiName || '-'}
            </TooltipCell>
          </td>
          <td className={cn(styles.distanceCell, "text-sm w-[70px] distance-color border-r border-gray-200/20 dark:border-gray-700/20")}>
            {(() => {
              const distanceInfo = calculateDistance(order)
              const isOrderBoarding = isBoarding(order)
              const distanceColor = isCancelled 
                ? 'rgba(156, 163, 175, 0.5)' 
                : isOrderBoarding 
                  ? 'rgb(59, 130, 246)' 
                  : 'rgb(239, 68, 68)'
              
              return (
                <TooltipCell content={distanceInfo.text}>
                  <div className="flex items-center justify-end gap-1">
                    {distanceInfo.distance > 0 && distanceInfo.distance < 50 && (
                      <svg className="w-3 h-3" style={{ color: '#eab308' }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span 
                      className={cn(
                        "font-bold px-1.5 py-0.5 rounded",
                        // 선택된 행일 때 배경색 추가하여 가시성 확보
                        isSelected && "bg-white/90 dark:bg-gray-800/90"
                      )}
                      style={{ 
                        color: distanceColor,
                        isolation: 'isolate'
                      }}
                    >
                      {distanceInfo.text}
                    </span>
                  </div>
                </TooltipCell>
              )
            })()}
          </td>
          <td className={cn(
            styles.compactCell, 
            "text-sm font-bold w-[55px] text-center border-r border-gray-200/20 dark:border-gray-700/20",
            // 선택되지 않은 경우에만 배경색 적용
            !isSelected && "bg-gray-50 dark:bg-gray-800/50"
          )}>
            <TooltipCell content={order.drvNo || '-'}>
              {order.drvNo || '-'}
            </TooltipCell>
          </td>
          <td className={cn(
            styles.compactCell, 
            "text-sm font-bold w-[70px] text-center border-r border-gray-200/20 dark:border-gray-700/20",
            // 선택되지 않은 경우에만 배경색 적용
            !isSelected && "bg-primary/5"
          )}>
            <TooltipCell content={order.licensePlate || '-'}>
              {order.licensePlate || '-'}
            </TooltipCell>
          </td>
          <td className={cn(styles.compactCell, "text-sm w-[80px] text-center px-1.5 border-r border-gray-200/20 dark:border-gray-700/20")}>
            <TooltipCell content={order.acceptAt && !isNaN(new Date(order.acceptAt).getTime()) ? format(new Date(order.acceptAt), 'HH:mm:ss', { locale: ko }) : '-'}>
              {order.acceptAt && !isNaN(new Date(order.acceptAt).getTime()) ? format(new Date(order.acceptAt), 'HH:mm:ss', { locale: ko }) : '-'}
            </TooltipCell>
          </td>
          <td className={cn(styles.compactCell, "text-sm w-[50px] border-r border-gray-200/20 dark:border-gray-700/20")}>
            <TooltipCell content={formatAgentsDisplay(order.addAgent, order.acceptAgent)}>
              {formatAgentsDisplay(order.addAgent, order.acceptAgent)}
            </TooltipCell>
          </td>
          <td className={cn(styles.compactCell, "text-sm w-[70px] text-center")}>
            <TooltipCell content={formatOrderStatus(order)}>
              {(() => {
                const status = formatOrderStatus(order)
                
                // 취소된 경우
                if (isCancelled) {
                  return (
                    <span className={ORDER_COLORS.cancelled.text}>
                      {status}
                    </span>
                  )
                }
                
                // 예약인 경우
                if (isReserved && !isAccepted) {
                  return (
                    <span className={ORDER_COLORS.reserved.text}>
                      {status}
                    </span>
                  )
                }
                
                // 배차된 경우
                if (isAccepted && !isCancelled) {
                  return (
                    <span className={ORDER_COLORS.accepted.text}>
                      {status}
                    </span>
                  )
                }
                
                // 접수중인 경우
                if (isWaiting && !isReserved) {
                  return (
                    <span className={ORDER_COLORS.waiting.text}>
                      {status}
                    </span>
                  )
                }
                
                // 기본값
                return <span className={ORDER_COLORS.default.text}>{status || '-'}</span>
              })()}
            </TooltipCell>
          </td>
        </tr>
      </tbody>
    </table>
  )
})
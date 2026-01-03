'use client'

import { useEffect, useState, useCallback } from 'react'
import { orderService } from '@/services/order-service'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { X, Phone, MapPin, Navigation, Clock, User } from 'lucide-react'
import { getOrderTextClass, getOrderHoverClass } from '@/utils/order-colors'
import { ActionCard } from '@/components/ui/action-card'
import { useRecentOrderColumnWidths, RECENT_ORDER_DEFAULT_WIDTHS } from '@/hooks/use-column-widths'
import { cn } from '@/lib/utils'

// 컬럼 정의
// callplace는 flex-1로 자동 확장되므로 리사이즈 불가
// callplace 이전 컬럼: 오른쪽 핸들로 리사이즈
// callplace 이후 컬럼: 왼쪽 핸들로 리사이즈 (handlePosition: 'left')
const COLUMNS = [
  { id: 'insertAt', label: '접수시각', resizable: true },
  { id: 'customerName', label: '고객명', resizable: true },
  { id: 'telephone', label: '전화번호', resizable: true },
  { id: 'calldong', label: '목적지', resizable: true },
  { id: 'callplace', label: '호출장소', resizable: false }, // flex-1
  { id: 'callNoActions', label: '콜번호', resizable: true, handlePosition: 'left' },
  { id: 'statusAt', label: '처리시간', resizable: true, handlePosition: 'left' },
  { id: 'status', label: '상태', resizable: true, handlePosition: 'left' },
  { id: 'agents', label: '접_배', resizable: true, handlePosition: 'left' },
  { id: 'memo', label: '메모', resizable: true, handlePosition: 'left' },
]

export interface RecentOrder {
  order_id: number
  order_extra?: string | null
  user_name?: string | null
  user_telephone?: string | null
  calldong?: string | null
  callplace?: string | null
  drv_name?: string | null
  car_callNo?: number | null
  status?: string | null
  order_insertAt: string
  statusAt?: string | null
  start_agent?: number | null  // 접수 상담원
  end_agent?: number | null    // 배차 상담원
  cancel_agent?: number | null // 취소 상담원
  acts?: string | null  // 액션 데이터
}

interface RecentOrdersDialogProps {
  telephone: string
  onSelectOrder: (order: RecentOrder) => void
  onSelectionChange?: (order: RecentOrder) => void // 선택 행이 바뀔 때 호출
  onClose: () => void
}

export function RecentOrdersDialog({ telephone, onSelectOrder, onSelectionChange, onClose }: RecentOrdersDialogProps) {
  const [orders, setOrders] = useState<RecentOrder[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // 컬럼 너비 관리 훅
  const {
    columnWidths,
    isResizing,
    resizingColumn,
    startResize,
    onResize,
    endResize,
  } = useRecentOrderColumnWidths()

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

  useEffect(() => {
    loadRecentOrders()
  }, [telephone])

  // 선택된 행이 바뀔 때마다 onSelectionChange 호출 (selectedId가 변경될 때만)
  useEffect(() => {
    if (selectedId && onSelectionChange && orders.length > 0) {
      const selected = orders.find(o => o.order_id === selectedId)
      if (selected) {
        onSelectionChange(selected)
      }
    }
  }, [selectedId]) // orders와 onSelectionChange를 dependency에서 제거하여 불필요한 호출 방지

  // 키보드 이벤트 포커스 설정
  useEffect(() => {
    // 컴포넌트가 마운트되면 포커스 설정
    const timer = setTimeout(() => {
      const element = document.getElementById('recent-orders-container')
      if (element) {
        element.focus()
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  const loadRecentOrders = async () => {
    try {
      setLoading(true)
      const data = await orderService.getRecentOrder(telephone)
      setOrders(data.slice(0, 5)) // 최근 5개만 표시
      if (data.length > 0) {
        setSelectedId(data[0].order_id)
      }
    } catch (error) {
      // Failed to load recent orders
    } finally {
      setLoading(false)
    }
  }

  const handleSelectOrder = () => {
    const selected = orders.find(o => o.order_id === selectedId)
    if (selected) {
      onSelectOrder(selected)
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!orders.length) return
    
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      const currentIndex = orders.findIndex(o => o.order_id === selectedId)
      if (currentIndex < orders.length - 1) {
        setSelectedId(orders[currentIndex + 1].order_id)
      } else {
        // 마지막 항목에서 아래 키를 누르면 첫 번째 항목으로
        setSelectedId(orders[0].order_id)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      const currentIndex = orders.findIndex(o => o.order_id === selectedId)
      if (currentIndex > 0) {
        setSelectedId(orders[currentIndex - 1].order_id)
      } else {
        // 첫 번째 항목에서 위 키를 누르면 마지막 항목으로
        setSelectedId(orders[orders.length - 1].order_id)
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      handleSelectOrder()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose()
    }
  }

  return (
    <div className="w-full h-full">
      <div
        id="recent-orders-container"
        className="bg-white dark:bg-gray-900 w-full h-full flex flex-col overflow-hidden"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        autoFocus
      >
        {/* Content with column headers */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Column Headers - 리사이즈 가능 */}
          <div className={cn(
            "flex items-center gap-2 px-2 py-1.5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 border-b border-gray-200 dark:border-gray-700 text-[11px] font-semibold text-gray-600 dark:text-gray-300",
            isResizing && "select-none"
          )}>
            {COLUMNS.map((column, index) => {
              const width = columnWidths[column.id]
              const isLastColumn = index === COLUMNS.length - 1
              const isFlexColumn = column.id === 'callplace' // flex-1 컬럼
              const isLeftHandle = (column as any).handlePosition === 'left'

              return (
                <div
                  key={column.id}
                  className={cn(
                    "text-center tracking-wide relative group",
                    isFlexColumn ? "flex-1 min-w-0" : "shrink-0",
                    resizingColumn === column.id && "bg-blue-100 dark:bg-blue-900/30"
                  )}
                  style={isFlexColumn ? undefined : {
                    width: `${width}px`,
                    minWidth: `${width}px`,
                    maxWidth: `${width}px`,
                  }}
                >
                  <span className="truncate block">{column.label}</span>

                  {/* 리사이즈 핸들 - 오른쪽 (callplace 이전 컬럼) */}
                  {column.resizable && !isLeftHandle && !isLastColumn && (
                    <div
                      className={cn(
                        "absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-20",
                        "hover:bg-blue-400/30 transition-colors",
                        "after:absolute after:right-0 after:top-1/4 after:bottom-1/4 after:w-0.5",
                        "after:bg-gray-300 dark:after:bg-gray-600",
                        "hover:after:bg-blue-500",
                        resizingColumn === column.id && "bg-blue-500/50 after:bg-blue-500"
                      )}
                      onMouseDown={(e) => handleResizeMouseDown(column.id, e)}
                      onDoubleClick={() => {
                        const defaultWidth = RECENT_ORDER_DEFAULT_WIDTHS[column.id]
                        if (defaultWidth && columnWidths[column.id] !== defaultWidth) {
                          startResize(column.id, columnWidths[column.id])
                          onResize(defaultWidth)
                          endResize()
                        }
                      }}
                      title="드래그하여 너비 조절 / 더블클릭하여 초기화"
                    />
                  )}

                  {/* 리사이즈 핸들 - 왼쪽 (callplace 이후 컬럼) */}
                  {column.resizable && isLeftHandle && (
                    <div
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-20",
                        "hover:bg-blue-400/30 transition-colors",
                        "after:absolute after:left-0 after:top-1/4 after:bottom-1/4 after:w-0.5",
                        "after:bg-gray-300 dark:after:bg-gray-600",
                        "hover:after:bg-blue-500",
                        resizingColumn === column.id && "bg-blue-500/50 after:bg-blue-500"
                      )}
                      onMouseDown={(e) => handleResizeMouseDown(column.id, e, 'left')}
                      onDoubleClick={() => {
                        const defaultWidth = RECENT_ORDER_DEFAULT_WIDTHS[column.id]
                        if (defaultWidth && columnWidths[column.id] !== defaultWidth) {
                          startResize(column.id, columnWidths[column.id], 'left')
                          onResize(defaultWidth)
                          endResize()
                        }
                      }}
                      title="드래그하여 너비 조절 / 더블클릭하여 초기화"
                    />
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Data Rows */}
          <div className="flex-1 overflow-auto bg-gray-50/50 dark:bg-gray-900/50">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <div className="mb-2">📋</div>
                최근 이력이 없습니다
              </div>
            ) : (
              <div className="space-y-1 p-1">
                {orders.map((order) => {
                  // 상태별 스타일 정의 (주문 테이블과 동일한 로직 사용)
                  // 취소: status에 '취소'가 포함된 경우
                  const isCancelled = order.status?.includes('취소') || false
                  // 대기/접수: status에 '접수'가 포함되거나, '배차'가 없고 '취소'도 아닌 경우
                  const isWaiting = (!isCancelled && order.status?.includes('접수')) || 
                                   (!isCancelled && !order.status?.includes('배차') && !order.status?.includes('완료'))
                  // 배차: status에 '배차'가 포함된 경우
                  const isAccepted = order.status?.includes('배차') || false
                  // 예약: 별도 처리 안함 (RecentOrder에는 reserveAt 필드가 없음)
                  const isReserved = false
                  
                  // 상태별 클래스 설정 (사용하지 않음 - 각 span에 직접 적용)
                  
                  return (
                <div
                  key={order.order_id}
                  onClick={() => setSelectedId(order.order_id)}
                  onDoubleClick={handleSelectOrder}
                  className={`px-2 py-0 rounded-md cursor-pointer transition-all duration-150 ${
                    getOrderHoverClass(isCancelled, isAccepted, isWaiting, selectedId === order.order_id)
                  }`}
                >
                  {/* 한 줄로 모든 정보 표시 - 컬럼 너비 동적 적용 */}
                  <div className="flex items-center gap-2 text-sm h-6">
                    {/* 1. 접수시각 */}
                    <span
                      className={`shrink-0 truncate ${
                        getOrderTextClass(isCancelled, isAccepted, isWaiting, selectedId === order.order_id, 'light')
                      }`}
                      style={{ width: `${columnWidths.insertAt}px`, minWidth: `${columnWidths.insertAt}px` }}
                    >
                      {format(new Date(order.order_insertAt), '(MM/dd) HH:mm:ss')}
                    </span>

                    {/* 2. 고객명 */}
                    <span
                      className={`font-medium shrink-0 truncate ${
                        getOrderTextClass(isCancelled, isAccepted, isWaiting, selectedId === order.order_id)
                      }`}
                      style={{ width: `${columnWidths.customerName}px`, minWidth: `${columnWidths.customerName}px` }}
                    >
                      {order.user_name || '-'}
                    </span>

                    {/* 3. 전화번호 */}
                    <span
                      className={`shrink-0 truncate ${
                        getOrderTextClass(isCancelled, isAccepted, isWaiting, selectedId === order.order_id, 'light')
                      }`}
                      style={{ width: `${columnWidths.telephone}px`, minWidth: `${columnWidths.telephone}px` }}
                    >
                      {order.user_telephone}
                    </span>

                    {/* 4. 목적지 */}
                    <span
                      className={`shrink-0 truncate ${
                        getOrderTextClass(isCancelled, isAccepted, isWaiting, selectedId === order.order_id)
                      }`}
                      style={{ width: `${columnWidths.calldong}px`, minWidth: `${columnWidths.calldong}px` }}
                    >
                      {order.calldong || '-'}
                    </span>

                    {/* 5. 호출장소 (flex-1) */}
                    <span
                      className={`flex-1 min-w-0 truncate ${
                        getOrderTextClass(isCancelled, isAccepted, isWaiting, selectedId === order.order_id)
                      }`}
                    >
                      {order.callplace || '-'}
                    </span>

                    {/* 6. 콜번호 + 액션 카드 */}
                    <div
                      className="shrink-0 flex items-center gap-1"
                      style={{ width: `${columnWidths.callNoActions}px`, minWidth: `${columnWidths.callNoActions}px` }}
                    >
                      <span className={`text-center font-medium text-sm ${
                        getOrderTextClass(isCancelled, isAccepted, isWaiting, selectedId === order.order_id)
                      }`}>
                        {order.car_callNo || '-'}
                      </span>
                      {order.acts && (
                        <div className="flex items-center gap-0.5 overflow-hidden">
                          {order.acts.split('|').map((actStr, idx) => {
                            const parts = actStr.split('_')
                            const name = parts[0] || ''
                            const time = parts[1] ? new Date(parseInt(parts[1]) * 1000) : new Date()

                            return (
                              <ActionCard
                                key={idx}
                                name={name}
                                time={format(time, 'HH:mm')}
                              />
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* 7. 처리시간 */}
                    <span
                      className={`shrink-0 text-center ${
                        getOrderTextClass(isCancelled, isAccepted, isWaiting, selectedId === order.order_id, 'muted')
                      }`}
                      style={{ width: `${columnWidths.statusAt}px`, minWidth: `${columnWidths.statusAt}px` }}
                    >
                      {order.statusAt ? format(new Date(order.statusAt), 'HH:mm:ss') : '-'}
                    </span>

                    {/* 8. 상태 */}
                    <div
                      className="shrink-0 flex items-center justify-center"
                      style={{ width: `${columnWidths.status}px`, minWidth: `${columnWidths.status}px` }}
                    >
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold text-center inline-flex items-center justify-center whitespace-nowrap ${
                          selectedId === order.order_id
                            ? 'bg-blue-700 text-white border border-blue-600'
                            : order.status === '취소'
                            ? 'bg-gradient-to-r from-red-100 to-red-50 text-red-700 dark:from-red-900/30 dark:to-red-800/20 dark:text-red-400 border border-red-200 dark:border-red-700'
                            : order.status === '완료'
                            ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-700 dark:from-green-900/30 dark:to-green-800/20 dark:text-green-400 border border-green-200 dark:border-green-700'
                            : 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 dark:from-gray-800 dark:to-gray-750 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {order.status || '대기'}
                      </span>
                    </div>

                    {/* 9. 접_배 (접수상담원_배차상담원) */}
                    <span
                      className={`shrink-0 text-center text-[11px] ${
                        getOrderTextClass(isCancelled, isAccepted, isWaiting, selectedId === order.order_id, 'muted')
                      }`}
                      style={{ width: `${columnWidths.agents}px`, minWidth: `${columnWidths.agents}px` }}
                    >
                      {`${order.start_agent?.toString().replace('상담원#', '') || ''}_${order.end_agent?.toString().replace('상담원#', '') || ''}`}
                    </span>

                    {/* 10. 메모 */}
                    <span
                      className={`shrink-0 truncate ${
                        getOrderTextClass(isCancelled, isAccepted, isWaiting, selectedId === order.order_id, 'muted')
                      }`}
                      style={{ width: `${columnWidths.memo}px`, minWidth: `${columnWidths.memo}px` }}
                      title={order.order_extra || ''}
                    >
                      {order.order_extra || '-'}
                    </span>
                  </div>
                </div>
              )
              })}
            </div>
          )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            {orders.length > 0 && `${orders.length}개의 이력`}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 text-[12px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              취소(ESC)
            </button>
            <button
              onClick={handleSelectOrder}
              disabled={!selectedId}
              className="px-3 py-1 text-[12px] font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed rounded-md shadow-sm transition-all"
            >
              선택(Enter)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
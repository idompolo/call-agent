'use client'

import { useEffect, useState } from 'react'
import { orderService } from '@/services/order-service'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { X, Phone, MapPin, Navigation, Clock, User } from 'lucide-react'
import { getOrderTextClass, getOrderHoverClass } from '@/utils/order-colors'
import { ActionCard } from '@/components/ui/action-card'

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
    <div className="fixed bottom-0 left-0 right-0 z-30 h-[220px]">
      <div 
        id="recent-orders-container"
        className="bg-white dark:bg-gray-900 shadow-2xl w-full h-full flex flex-col overflow-hidden"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        autoFocus
      >
        {/* Content with column headers */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Column Headers */}
          <div className="flex items-center gap-2 px-2 py-1.5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 border-b border-gray-200 dark:border-gray-700 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
            <span className="w-[100px] text-center tracking-wide">접수시각</span>
            <span className="w-[120px] text-center tracking-wide">고객명</span>
            <span className="w-[85px] text-center tracking-wide">전화번호</span>
            <span className="w-[120px] text-center tracking-wide">목적지</span>
            <span className="flex-1 text-center tracking-wide">호출장소</span>
            <span className="w-[480px] text-center tracking-wide">콜번호</span>
            <span className="w-[55px] text-center tracking-wide">처리시간</span>
            <span className="w-[65px] text-center tracking-wide">상태</span>
            <span className="w-[40px] text-center tracking-wide">접_배</span>
            <span className="w-[80px] text-center tracking-wide">메모</span>
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
                  {/* 한 줄로 모든 정보 표시 - Flutter 순서대로 */}
                  <div className="flex items-center gap-2 text-sm h-6">
                    {/* 1. 접수시각 */}
                    <span className={`w-[130px] ${
                      getOrderTextClass(isCancelled, isAccepted, isWaiting, selectedId === order.order_id, 'light')
                    }`}>
                      {format(new Date(order.order_insertAt), '(MM/dd) HH:mm:ss')}
                    </span>
                    
                    {/* 2. 고객명 */}
                    <span className={`font-medium w-[120px] truncate ${
                      getOrderTextClass(isCancelled, isAccepted, isWaiting, selectedId === order.order_id)
                    }`}>
                      {order.user_name || '-'}
                    </span>
                    
                    {/* 3. 전화번호 */}
                    <span className={`w-[85px] ${
                      getOrderTextClass(isCancelled, isAccepted, isWaiting, selectedId === order.order_id, 'light')
                    }`}>
                      {order.user_telephone}
                    </span>
                    
                    {/* 4. 목적지 */}
                    <span className={`w-[120px] truncate ${
                      getOrderTextClass(isCancelled, isAccepted, isWaiting, selectedId === order.order_id)
                    }`}>
                      {order.calldong || '-'}
                    </span>
                    
                    {/* 5. 호출장소 */}
                    <span className={`flex-1 truncate ${
                      getOrderTextClass(isCancelled, isAccepted, isWaiting, selectedId === order.order_id)
                    }`}>
                      {order.callplace || '-'}
                    </span>
                    
                    {/* 6. 콜번호 + 액션 카드 */}
                    <div className={`w-[480px] flex items-center gap-1`}>
                      <span className={`text-center font-medium text-sm ${
                        getOrderTextClass(isCancelled, isAccepted, isWaiting, selectedId === order.order_id)
                      }`}>
                        {order.car_callNo || '-'}
                      </span>
                      {order.acts && (
                        <div className="flex items-center gap-0.5">
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
                    <span className={`w-[55px] text-center ${
                      getOrderTextClass(isCancelled, isAccepted, isWaiting, selectedId === order.order_id, 'muted')
                    }`}>
                      {order.statusAt ? format(new Date(order.statusAt), 'HH:mm:ss') : '-'}
                    </span>
                    
                    {/* 8. 상태 */}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold w-[75px] text-center inline-flex items-center justify-center ${
                      selectedId === order.order_id 
                        ? 'bg-blue-700 text-white border border-blue-600'
                        : order.status === '취소' 
                        ? 'bg-gradient-to-r from-red-100 to-red-50 text-red-700 dark:from-red-900/30 dark:to-red-800/20 dark:text-red-400 border border-red-200 dark:border-red-700'
                        : order.status === '완료'
                        ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-700 dark:from-green-900/30 dark:to-green-800/20 dark:text-green-400 border border-green-200 dark:border-green-700'
                        : 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 dark:from-gray-800 dark:to-gray-750 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                    }`}>
                      {order.status || '대기'}
                    </span>
                    
                    {/* 9. 접_배 (접수상담원_배차상담원) */}
                    <span className={`w-[40px] text-center text-[11px] ${
                      getOrderTextClass(isCancelled, isAccepted, isWaiting, selectedId === order.order_id, 'muted')
                    }`}>
                      {`${order.start_agent?.toString().replace('상담원#', '') || ''}_${order.end_agent?.toString().replace('상담원#', '') || ''}`}
                    </span>
                    
                    {/* 10. 메모 */}
                    <span className={`w-[80px] truncate ${
                      getOrderTextClass(isCancelled, isAccepted, isWaiting, selectedId === order.order_id, 'muted')
                    }`} title={order.order_extra || ''}>
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
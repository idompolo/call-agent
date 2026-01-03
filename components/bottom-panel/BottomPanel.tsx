'use client'

import { Suspense, lazy } from 'react'
import { MessageTablePanel } from '@/components/chat-panel/MessageTablePanel'
import { RecentOrder } from '@/components/recent-orders-dialog'
import { recentOrderHandlersRef } from '@/components/order-input-panel/OrderInputPanel'

// 하단 패널 높이 상수
export const BOTTOM_PANEL_HEIGHT = 220

const RecentOrdersDialogLazy = lazy(() =>
  import('@/components/recent-orders-dialog').then(m => ({ default: m.RecentOrdersDialog }))
)

interface BottomPanelProps {
  // 최근 주문 이력 관련
  showRecentOrders: boolean
  recentOrdersTelephone?: string
  onCloseRecentOrders: () => void
}

export function BottomPanel({
  showRecentOrders,
  recentOrdersTelephone,
  onCloseRecentOrders,
}: BottomPanelProps) {
  // OrderInputPanel의 핸들러 사용
  const handleSelectOrder = (order: RecentOrder) => {
    recentOrderHandlersRef.current?.handleSelectRecentOrder(order)
    onCloseRecentOrders()
  }

  const handleSelectionChange = (order: RecentOrder) => {
    recentOrderHandlersRef.current?.handleSelectionChange(order)
  }

  return (
    <div
      className="relative border-t border-gray-200 dark:border-gray-700 overflow-hidden"
      style={{ height: `${BOTTOM_PANEL_HEIGHT}px` }}
    >
      {/* 기본: 채팅 패널 */}
      <MessageTablePanel className="h-full" />

      {/* 주문 선택시: 최근 이력 오버레이 */}
      {showRecentOrders && recentOrdersTelephone && (
        <div className="absolute inset-0 z-10">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
              </div>
            }
          >
            <RecentOrdersDialogLazy
              telephone={recentOrdersTelephone}
              onSelectOrder={handleSelectOrder}
              onSelectionChange={handleSelectionChange}
              onClose={onCloseRecentOrders}
            />
          </Suspense>
        </div>
      )}
    </div>
  )
}

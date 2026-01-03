'use client'

import { useState } from 'react'
import { useOrderStore } from '@/store/order-store'
import { 
  Phone, 
  MessageSquare, 
  UserPlus, 
  Ban, 
  CheckCircle,
  Clock,
  Navigation,
  Printer,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function OrderControlPanel() {
  const { selectedOrder } = useOrderStore()
  const [activeAction, setActiveAction] = useState<string | null>(null)

  const actions = [
    { id: 'call', label: '전화걸기', icon: Phone, color: 'bg-green-500', hotkey: 'F1' },
    { id: 'sms', label: 'SMS전송', icon: MessageSquare, color: 'bg-blue-500', hotkey: 'F2' },
    { id: 'assign', label: '배차', icon: UserPlus, color: 'bg-purple-500', hotkey: 'F3' },
    { id: 'cancel', label: '취소', icon: Ban, color: 'bg-red-500', hotkey: 'F4' },
    { id: 'complete', label: '완료', icon: CheckCircle, color: 'bg-green-500', hotkey: 'F5' },
    { id: 'reserve', label: '예약', icon: Clock, color: 'bg-yellow-500', hotkey: 'F6' },
    { id: 'navigate', label: '네비', icon: Navigation, color: 'bg-indigo-500', hotkey: 'F7' },
    { id: 'print', label: '인쇄', icon: Printer, color: 'bg-gray-500', hotkey: 'F8' },
    { id: 'refresh', label: '새로고침', icon: RefreshCw, color: 'bg-cyan-500', hotkey: 'F9' },
  ]

  const handleAction = (actionId: string) => {
    if (!selectedOrder) {
      alert('주문을 선택해주세요.')
      return
    }

    setActiveAction(actionId)
    
    // TODO: Implement actual actions
    switch (actionId) {
      case 'call':
        console.log('전화걸기:', selectedOrder.telephone)
        break
      case 'sms':
        console.log('SMS 전송 창 열기')
        break
      case 'assign':
        console.log('배차 창 열기')
        break
      case 'cancel':
        console.log('주문 취소')
        break
      case 'complete':
        console.log('주문 완료')
        break
      case 'reserve':
        console.log('예약 설정')
        break
      case 'navigate':
        console.log('네비게이션 열기')
        break
      case 'print':
        console.log('인쇄')
        break
      case 'refresh':
        console.log('새로고침')
        break
    }

    // Reset active state after animation
    setTimeout(() => setActiveAction(null), 200)
  }

  return (
    <div className="border rounded-lg p-2 bg-card">
      <div className="grid grid-cols-9 gap-1">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className={cn(
                "relative flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                "hover:scale-105 active:scale-95",
                activeAction === action.id && "ring-2 ring-offset-2 ring-primary",
                selectedOrder ? "hover:bg-accent" : "opacity-50 cursor-not-allowed"
              )}
              disabled={!selectedOrder}
            >
              <div className={cn(
                "p-2 rounded-full text-white",
                action.color
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium">{action.label}</span>
              <span className="absolute top-0.5 right-0.5 text-[10px] text-muted-foreground">
                {action.hotkey}
              </span>
            </button>
          )
        })}
      </div>

      {/* Status Bar */}
      <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            선택된 주문: {selectedOrder ? `#${selectedOrder.id}` : '없음'}
          </span>
          {selectedOrder && (
            <>
              <span className="text-muted-foreground">|</span>
              <span>고객: {selectedOrder.customerName || '-'}</span>
              <span className="text-muted-foreground">|</span>
              <span>전화: {selectedOrder.telephone || '-'}</span>
            </>
          )}
        </div>
        <div className="text-muted-foreground">
          단축키를 사용하여 빠르게 작업할 수 있습니다
        </div>
      </div>
    </div>
  )
}
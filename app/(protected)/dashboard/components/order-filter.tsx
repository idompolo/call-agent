'use client'

import { useState } from 'react'
import { Filter, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrderStore } from '@/store/order-store'
import { OrderFilterType } from '@/utils/order-filters'

const filters = [
  { id: OrderFilterType.All, label: '전체', description: '모든 접수 표시' },
  { id: OrderFilterType.Filter1, label: '노피>배취(F10)', description: '손취>첵콜>poi없는접수>배차후취소' },
  { id: OrderFilterType.Filter2, label: '접수>배취', description: '손취>첵콜>모든접수>배차후취소' },
  { id: OrderFilterType.Filter3, label: '노피>미탑', description: '손취>첵콜>poi없는접수>미탑승' },
  { id: OrderFilterType.Filter4, label: '접수>미탑', description: '손취>첵콜>모든접수>미탑승' },
  { id: OrderFilterType.Filter5, label: '접수>배차', description: '손취>첵콜>모든접수>배차(탑승, 배차후 취소건 제외)' },
  { id: OrderFilterType.Filter6, label: '접수만', description: '일반 접수만' },
  { id: OrderFilterType.Filter7, label: '예약만(취소포함)', description: '예약 및 취소만' },
  { id: OrderFilterType.Filter8, label: '예약만', description: '예약만' },
]

export function OrderFilter() {
  const { orderFilterType, setOrderFilterType } = useOrderStore()
  const [isOpen, setIsOpen] = useState(false)

  const currentFilter = filters.find(f => f.id === orderFilterType)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 border rounded-md hover:bg-accent"
      >
        <Filter className="h-4 w-4" />
        <span className="text-sm">{currentFilter?.label}</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-1 bg-popover border rounded-md shadow-lg p-2 z-20 min-w-[250px]">
            {filters.map(filter => (
              <button
                key={filter.id}
                onClick={() => {
                  setOrderFilterType(filter.id)
                  setIsOpen(false)
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 rounded hover:bg-accent text-left",
                  orderFilterType === filter.id && "bg-accent"
                )}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{filter.label}</div>
                  <div className="text-xs text-muted-foreground">{filter.description}</div>
                </div>
                {orderFilterType === filter.id && (
                  <Check className="h-4 w-4" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
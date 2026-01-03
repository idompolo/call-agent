'use client'

import { cn } from '@/lib/utils'

interface ActionCardProps {
  name: string
  time?: string
  variant?: 'primary' | 'muted' | 'custom'
  className?: string
}

// Flutter 테마와 동일한 액션 타입 정의 - 첵콜과 손취는 일반 액션
const SPECIAL_ACTIONS: string[] = [] // 첵콜과 손취를 일반 액션으로 처리

export function ActionCard({ name, time, variant, className }: ActionCardProps) {
  // 특수 액션인지 확인 (첵콜과 손취를 특수 액션으로)
  const isSpecialAction = name === '첵콜' || name === '손취'
  
  // variant가 명시적으로 지정되지 않았으면 액션 이름에 따라 결정
  const finalVariant = variant || (isSpecialAction ? 'custom' : 'muted')
  
  return (
    <span
      className={cn(
        "px-2 py-1 rounded-full text-[13px] font-medium flex-shrink-0 isolate inline-flex items-center justify-center gap-1 leading-none align-middle",
        finalVariant === 'primary' && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
        finalVariant === 'muted' && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
        finalVariant === 'custom' && "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
        className
      )}
      style={{ isolation: 'isolate' }}
    >
      <span className="font-medium">{name}</span>
      {time && (
        <span className="text-[11px] opacity-50">{time}</span>
      )}
    </span>
  )
}
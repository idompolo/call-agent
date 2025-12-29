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
        "px-0.5 py-0 rounded text-[11px] font-medium flex-shrink-0 isolate inline-flex items-center gap-0.5 border",
        // 더 진한 배경색과 테두리 추가
        finalVariant === 'primary' && "bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100 border-blue-300 dark:border-blue-700",
        finalVariant === 'muted' && "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600",
        // 특수 액션용 커스텀 스타일
        finalVariant === 'custom' && "bg-purple-200 text-purple-900 dark:bg-purple-800 dark:text-purple-100 border-purple-300 dark:border-purple-700",
        className
      )}
      style={{
        // isolation으로 부모 스타일 영향 차단
        isolation: 'isolate'
      }}
    >
      <span className="font-medium">{name}</span>
      {time && (
        <>
          <span className="text-[9px]">|</span>
          <span className="text-[10px]">{time}</span>
        </>
      )}
    </span>
  )
}
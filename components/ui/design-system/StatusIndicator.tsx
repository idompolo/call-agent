import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface StatusIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  status: 'waiting' | 'accepted' | 'reserved' | 'cancelled' | 'processing' | 'completed'
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
}

const statusConfig = {
  waiting: {
    color: 'bg-green-500',
    lightColor: 'bg-green-100',
    darkColor: 'dark:bg-green-900/30',
    textColor: 'text-green-800 dark:text-green-300',
    label: '접수중',
  },
  accepted: {
    color: 'bg-blue-500',
    lightColor: 'bg-blue-100',
    darkColor: 'dark:bg-blue-900/30',
    textColor: 'text-blue-800 dark:text-blue-300',
    label: '배차됨',
  },
  reserved: {
    color: 'bg-purple-500',
    lightColor: 'bg-purple-100',
    darkColor: 'dark:bg-purple-900/30',
    textColor: 'text-purple-800 dark:text-purple-300',
    label: '예약',
  },
  cancelled: {
    color: 'bg-red-500',
    lightColor: 'bg-red-100',
    darkColor: 'dark:bg-red-900/30',
    textColor: 'text-red-800 dark:text-red-300',
    label: '취소',
  },
  processing: {
    color: 'bg-yellow-500',
    lightColor: 'bg-yellow-100',
    darkColor: 'dark:bg-yellow-900/30',
    textColor: 'text-yellow-800 dark:text-yellow-300',
    label: '진행중',
  },
  completed: {
    color: 'bg-gray-500',
    lightColor: 'bg-gray-100',
    darkColor: 'dark:bg-gray-900/30',
    textColor: 'text-gray-800 dark:text-gray-300',
    label: '완료',
  },
}

const sizeConfig = {
  sm: {
    dot: 'w-2 h-2',
    text: 'text-xs px-2 py-0.5',
    container: 'gap-1.5',
  },
  md: {
    dot: 'w-2.5 h-2.5',
    text: 'text-sm px-2.5 py-1',
    container: 'gap-2',
  },
  lg: {
    dot: 'w-3 h-3',
    text: 'text-base px-3 py-1.5',
    container: 'gap-2.5',
  },
}

const StatusIndicator = forwardRef<HTMLDivElement, StatusIndicatorProps>(
  ({ status, showText = true, size = 'md', pulse = true, className, ...props }, ref) => {
    const config = statusConfig[status]
    const sizeClass = sizeConfig[size]

    if (!showText) {
      return (
        <div
          ref={ref}
          className={cn(
            'inline-flex items-center justify-center',
            className
          )}
          {...props}
        >
          <span
            className={cn(
              'rounded-full',
              sizeClass.dot,
              config.color,
              pulse && 'animate-pulse'
            )}
          />
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full font-medium',
          config.lightColor,
          config.darkColor,
          config.textColor,
          sizeClass.text,
          sizeClass.container,
          className
        )}
        {...props}
      >
        <span
          className={cn(
            'rounded-full',
            sizeClass.dot,
            config.color,
            pulse && 'animate-pulse'
          )}
        />
        <span>{config.label}</span>
      </div>
    )
  }
)

StatusIndicator.displayName = 'StatusIndicator'

export { StatusIndicator }
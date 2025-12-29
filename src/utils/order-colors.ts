/**
 * Centralized color management for order tables
 * All order status colors are defined here for easy maintenance
 */

// Order status color definitions
export const ORDER_COLORS = {
  // Cancelled order colors
  cancelled: {
    row: 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/40 border-l-4 border-l-red-500 dark:border-l-red-400',
    text: 'text-red-600 dark:text-red-400 opacity-75',
    textLight: 'text-red-500 dark:text-red-400 opacity-75',
    hover: 'hover:bg-red-50 dark:hover:bg-red-900/20'
  },
  
  // Accepted/Dispatched order colors (배차)
  accepted: {
    row: 'bg-blue-50/50 dark:bg-gray-800 hover:bg-blue-100/50 dark:hover:bg-gray-700 border-l-4 border-l-blue-500 dark:border-l-blue-400',
    text: 'text-black dark:text-white',
    textLight: 'text-gray-800 dark:text-gray-100',
    hover: 'hover:bg-blue-50 dark:hover:bg-gray-700'
  },
  
  // Waiting/Received order colors (접수/대기)
  waiting: {
    row: 'bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-900/40 border-l-4 border-l-green-500 dark:border-l-green-400',
    text: 'text-blue-600 dark:text-green-400',
    textLight: 'text-blue-500 dark:text-green-400',
    hover: 'hover:bg-green-50 dark:hover:bg-green-900/20'
  },
  
  // Reserved order colors (예약)
  reserved: {
    row: 'bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 border-l-4 border-l-purple-500 dark:border-l-purple-400',
    text: 'text-purple-700 dark:text-purple-400 font-semibold',
    textLight: 'text-purple-600 dark:text-purple-400',
    hover: 'hover:bg-purple-50 dark:hover:bg-purple-900/20'
  },
  
  // Default colors
  default: {
    row: 'hover:bg-gray-50 dark:hover:bg-gray-700/70 hover:shadow-md',
    text: 'text-gray-700 dark:text-gray-300',
    textLight: 'text-gray-600 dark:text-gray-400',
    textMuted: 'text-gray-500 dark:text-gray-400',
    hover: 'hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm'
  },
  
  // Selected state colors - 명확한 선택 표시를 위한 스타일
  selected: {
    row: 'bg-gray-300 dark:bg-gray-600 shadow-xl z-30',
    gradient: 'bg-gray-300 dark:bg-gray-600 text-white shadow-lg',
    text: 'text-white font-semibold',
    textLight: 'text-gray-50'
  }
} as const

// Type for order status
export type OrderStatus = 'cancelled' | 'accepted' | 'waiting' | 'reserved' | 'default'

// Type for color variant
export type ColorVariant = 'row' | 'text' | 'textLight' | 'textMuted' | 'hover'

/**
 * Get color class for order row based on status
 * Used for the entire row styling in order tables
 */
export function getOrderRowClass(
  isCancelled: boolean,
  isAccepted: boolean,
  isWaiting: boolean,
  isReserved: boolean,
  isSelected: boolean = false
): string {
  // 선택된 행은 회색 배경만 적용
  if (isSelected) {
    return 'bg-gray-300 dark:bg-gray-600 shadow-xl z-30'
  }
  
  if (isCancelled) {
    return ORDER_COLORS.cancelled.row
  }
  
  if (isWaiting && !isReserved) {
    return ORDER_COLORS.waiting.row
  }
  
  if (isReserved && !isAccepted) {
    return ORDER_COLORS.reserved.row
  }
  
  if (isAccepted && !isCancelled) {
    return ORDER_COLORS.accepted.row
  }
  
  return ORDER_COLORS.default.row
}

/**
 * Get text color class based on order status
 * Used for individual text elements in recent orders table
 */
export function getOrderTextClass(
  isCancelled: boolean,
  isAccepted: boolean,
  isWaiting: boolean,
  isSelected: boolean = false,
  variant: 'main' | 'light' | 'muted' = 'main'
): string {
  // 선택 여부와 관계없이 원래 상태 색상 유지
  if (isCancelled) {
    return variant === 'light' ? ORDER_COLORS.cancelled.textLight : ORDER_COLORS.cancelled.text
  }
  
  if (isAccepted) {
    return variant === 'light' ? ORDER_COLORS.accepted.textLight : ORDER_COLORS.accepted.text
  }
  
  if (isWaiting) {
    return variant === 'light' ? ORDER_COLORS.waiting.textLight : ORDER_COLORS.waiting.text
  }
  
  // Default colors based on variant
  if (variant === 'muted') {
    return ORDER_COLORS.default.textMuted
  }
  if (variant === 'light') {
    return ORDER_COLORS.default.textLight
  }
  return ORDER_COLORS.default.text
}

/**
 * Get hover class for recent orders rows
 */
export function getOrderHoverClass(
  isCancelled: boolean,
  isAccepted: boolean,
  isWaiting: boolean,
  isSelected: boolean = false
): string {
  if (isSelected) {
    return ORDER_COLORS.selected.gradient
  }
  
  if (isCancelled) {
    return ORDER_COLORS.cancelled.hover
  }
  
  if (isAccepted) {
    return ORDER_COLORS.accepted.hover
  }
  
  if (isWaiting) {
    return ORDER_COLORS.waiting.hover
  }
  
  return ORDER_COLORS.default.hover
}

/**
 * Utility to apply exclusion for distance column
 * This is used in order table rows to exclude distance column from row colors
 */
export function withDistanceExclusion(colorClass: string): string {
  // Simply return the original class without modification
  // The distance column will handle its own colors via inline styles
  return colorClass
}
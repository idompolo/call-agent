import { Order } from '@/types/order'

/**
 * Order data formatting utilities for consistent display across the application
 * Centralizes all formatting logic to ensure consistency between initial and real-time data
 */

/**
 * Removes '상담원#' prefix from agent string (Flutter: addAgentText, acceptAgentText)
 * @param agent - Agent string that may contain '상담원#' prefix
 * @returns Agent number without prefix or empty string
 */
export function formatAgent(agent?: string | null): string {
  // Flutter logic: (order.addAgent ?? '').replaceAll('상담원#', '')
  if (!agent) return ''
  return agent.toString().replace('상담원#', '')
}

/**
 * Formats agent display for the agents column (관여자)
 * Flutter: '${controller.addAgentText(row)}_${controller.acceptAgentText(row)}'
 * @param addAgent - Add agent number
 * @param acceptAgent - Accept agent number
 * @returns Formatted agent display string (e.g., "10_12" or "0_")
 */
export function formatAgentsDisplay(addAgent?: string, acceptAgent?: string): string {
  // Use Flutter's logic exactly
  const formattedAddAgent = formatAgent(addAgent)
  const formattedAcceptAgent = formatAgent(acceptAgent)
  
  // Always return with underscore like Flutter
  return `${formattedAddAgent}_${formattedAcceptAgent}`
}

/**
 * Determines and formats the order status display
 * Priority: cancelAt > reserveAt > status conversion > acceptAgent > addAgent > original status
 * @param order - Order object
 * @returns Formatted status string
 */
export function formatOrderStatus(order: Partial<Order>): string {
  // 1. Cancelled orders - show cancelStatus
  if (order.cancelAt) {
    return order.cancelStatus || '-'
  }
  
  // 2. Reserved orders - show "예약(agent)"
  if (order.reserveAt) {
    // Use only addAgent for reservation status
    const agent = order.addAgent
    const agentNum = formatAgent(agent)
    return agentNum ? `예약(${agentNum})` : '예약'
  }
  
  // 3. Check if status already contains the formatted value from DB
  if (order.status) {
    // Convert DB status formats
    if (order.status === '배차(0)') {
      return '앱배차'
    }
    if (order.status === '접수(0)') {
      return '앱접수'
    }
    // If status already has format like "배차(10)", "접수(12)", use it directly
    if (order.status.includes('배차(') || order.status.includes('접수(')) {
      return order.status
    }
  }
  
  // 4. Accepted orders - show 배차 with agent (for MQTT updates)
  if (order.acceptAgent) {
    const agentNum = formatAgent(order.acceptAgent)
    return agentNum === '0' ? '앱배차' : `배차(${agentNum})`
  }
  
  // 5. Added orders - show 접수 with agent (for MQTT updates)
  if (order.addAgent) {
    const agentNum = formatAgent(order.addAgent)
    return agentNum === '0' ? '앱접수' : `접수(${agentNum})`
  }
  
  // 6. Default - show original status
  return order.status || ''
}

/**
 * Determines row styling class based on order state
 * @param order - Order object
 * @returns CSS class string for row styling
 */
export function getOrderRowClass(order: Partial<Order>): string {
  // Cancelled orders - red text for entire row
  if (order.cancelAt) {
    return 'cancelled-order'
  }
  
  // Waiting orders (접수) - green text for entire row
  if (isWaitingOrder(order)) {
    return 'waiting-order'
  }
  
  return ''
}

/**
 * Determines if an order is in waiting/접수 state
 * @param order - Order object
 * @returns True if order is waiting
 */
export function isWaitingOrder(order: Partial<Order>): boolean {
  // Check if cancelled
  if (order.cancelAt) return false
  
  // Check DB status format first
  if (order.status) {
    // If status contains 배차, it's not waiting
    if (order.status.includes('배차')) return false
    // If status contains 접수, it's waiting
    if (order.status.includes('접수')) {
      // Debug: Check if 접수 order has acceptAgent
      if (order.acceptAgent) {
        console.warn('Warning: 접수 order has acceptAgent:', {
          id: order.id,
          status: order.status,
          acceptAgent: order.acceptAgent
        })
      }
      return true
    }
  }
  
  // Check if order has been accepted (for MQTT data)
  if (order.acceptAgent) return false
  
  // If no accept agent and not cancelled, it's waiting
  return true
}

/**
 * Normalizes agent data from various sources (DB, MQTT)
 * Ensures consistent format regardless of data source
 * Flutter: model.addAgent?.toString() / model.acceptAgent?.toString()
 * @param agent - Agent string from any source
 * @returns Normalized agent string or undefined
 */
export function normalizeAgent(agent?: string | number | null): string | undefined {
  // Flutter logic: model.acceptAgent?.toString()
  if (agent === null || agent === undefined) return undefined
  
  // Convert to string if number (like Flutter's toString())
  return agent.toString()
}

/**
 * Validates if status indicates cancellation
 * @param status - Status string
 * @returns True if status indicates cancellation
 */
export function isCancelledStatus(status?: string): boolean {
  return status?.includes('취소') || false
}

/**
 * Validates if agent is app-based (agent number 0)
 * @param agent - Agent string or number
 * @returns True if agent is app-based
 */
export function isAppAgent(agent?: string): boolean {
  return formatAgent(agent) === '0'
}
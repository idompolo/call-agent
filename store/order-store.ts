import { create } from 'zustand'
import { Order, OrderFilter } from '@/types/order'
import { OrderFilterType } from '@/utils/order-filters'

/**
 * 주문의 최신 타임스탬프를 반환
 * acceptAt > modifyAt > cancelAt > addAt 순으로 우선순위
 */
function getLatestTimestamp(order: Order): number {
  const rawTimestamps = [
    order.acceptAt,
    order.modifyAt,
    order.cancelAt,
    order.addAt
  ]

  const timestamps: number[] = []
  for (const t of rawTimestamps) {
    if (t) {
      if (t instanceof Date) {
        timestamps.push(t.getTime())
      } else if (typeof t === 'string') {
        const parsed = new Date(t).getTime()
        if (!isNaN(parsed)) {
          timestamps.push(parsed)
        }
      } else if (typeof t === 'number') {
        timestamps.push(t)
      }
    }
  }

  return timestamps.length > 0 ? Math.max(...timestamps) : 0
}

/**
 * 두 주문을 스마트하게 병합
 * - 최신 타임스탬프를 가진 주문의 status 유지
 * - 나머지 필드는 값이 있는 것 우선 (newer 우선)
 */
function smartMergeOrders(existing: Order, incoming: Order): Order {
  const existingTime = getLatestTimestamp(existing)
  const incomingTime = getLatestTimestamp(incoming)

  // 기본 병합: incoming이 우선
  const merged = { ...existing, ...incoming }

  // 하지만 status는 최신 데이터 기준으로 결정
  if (existingTime > incomingTime && existing.status) {
    // 기존 데이터가 더 최신이면 status 유지
    merged.status = existing.status

    // 배차 관련 필드도 유지
    if (existing.drvNo) merged.drvNo = existing.drvNo
    if (existing.drvName) merged.drvName = existing.drvName
    if (existing.licensePlate) merged.licensePlate = existing.licensePlate
    if (existing.acceptAt) merged.acceptAt = existing.acceptAt
    if (existing.acceptAgent) merged.acceptAgent = existing.acceptAgent

    // 취소 관련 필드도 유지
    if (existing.cancelAt) merged.cancelAt = existing.cancelAt
    if (existing.cancelAgent) merged.cancelAgent = existing.cancelAgent
    if (existing.cancelStatus) merged.cancelStatus = existing.cancelStatus
    if (existing.cancelReason) merged.cancelReason = existing.cancelReason

    console.log(`[OrderStore] Smart merge: kept existing status '${existing.status}' (existing=${existingTime}, incoming=${incomingTime})`)
  }

  // actions 배열은 병합 (중복 제거)
  if (existing.actions || incoming.actions) {
    const existingActions = existing.actions || []
    const incomingActions = incoming.actions || []
    const actionMap = new Map<string, typeof existingActions[0]>()

    // 기존 actions 추가
    existingActions.forEach(a => {
      const key = `${a.name}_${a.at instanceof Date ? a.at.getTime() : a.at}`
      actionMap.set(key, a)
    })

    // 새 actions 추가 (중복 시 덮어씀)
    incomingActions.forEach(a => {
      const key = `${a.name}_${a.at instanceof Date ? a.at.getTime() : a.at}`
      actionMap.set(key, a)
    })

    merged.actions = Array.from(actionMap.values())
  }

  return merged
}

interface OrderState {
  orders: Order[]
  ordersMap: Map<number, Order> // 빠른 조회를 위한 Map 추가
  selectedOrder: Order | null
  filter: OrderFilter
  orderFilterType: OrderFilterType
  areaFilter: string[]
  isLoading: boolean
  setOrders: (orders: Order[]) => void
  addOrder: (order: Order) => void
  updateOrder: (orderId: number, order: Partial<Order>) => void
  removeOrder: (orderId: number) => void
  selectOrder: (order: Order | null) => void
  setFilter: (filter: OrderFilter) => void
  setOrderFilterType: (filterType: OrderFilterType) => void
  setAreaFilter: (areas: string[]) => void
  setLoading: (loading: boolean) => void
  reset: () => void
  getOrderById: (orderId: number) => Order | undefined // 빠른 조회 메서드
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  ordersMap: new Map<number, Order>(),
  selectedOrder: null,
  filter: {},
  orderFilterType: OrderFilterType.All,
  areaFilter: ['all', 's=', 'c=', 'o=', 'p=', 'k=', 'w=', 'a=', 'y=', 't='], // 기본값: 모든 지역 선택
  isLoading: false,
  setOrders: (orders) => set((state) => {
    // 스마트 병합 방식: 기존 주문 유지 + 새 주문 추가/업데이트
    // MQTT로 먼저 들어온 데이터의 최신 상태(배차 등)를 보존
    const newOrdersMap = new Map(state.ordersMap)
    let addedCount = 0
    let mergedCount = 0
    let statusKeptCount = 0

    orders.forEach(order => {
      if (newOrdersMap.has(order.id)) {
        // 기존 주문이 있으면 스마트 병합
        const existing = newOrdersMap.get(order.id)!
        const merged = smartMergeOrders(existing, order)

        // 상태가 유지되었는지 체크
        if (merged.status === existing.status && existing.status !== order.status) {
          statusKeptCount++
        }

        newOrdersMap.set(order.id, merged)
        mergedCount++
      } else {
        // 새 주문 추가
        newOrdersMap.set(order.id, order)
        addedCount++
      }
    })

    // 기존에 MQTT로 들어온 주문 중 API에 없는 것도 유지
    const existingMqttOnlyCount = state.orders.filter(
      existingOrder => !orders.some(newOrder => newOrder.id === existingOrder.id)
    ).length

    if (existingMqttOnlyCount > 0) {
      console.log(`[OrderStore] Preserving ${existingMqttOnlyCount} orders from MQTT (not in API response)`)
    }

    // 최종 배열 생성
    const mergedOrders = Array.from(newOrdersMap.values())

    console.log(`[OrderStore] setOrders: added=${addedCount}, merged=${mergedCount}, statusKept=${statusKeptCount}, total=${mergedOrders.length}`)

    return {
      orders: mergedOrders,
      ordersMap: newOrdersMap
    }
  }),
  addOrder: (order) => set((state) => {
    // 중복 체크: 이미 존재하는 주문이면 스마트 병합
    if (state.ordersMap.has(order.id)) {
      const existingOrder = state.ordersMap.get(order.id)!
      const mergedOrder = smartMergeOrders(existingOrder, order)
      const newOrdersMap = new Map(state.ordersMap)
      newOrdersMap.set(order.id, mergedOrder)

      const statusChanged = mergedOrder.status !== existingOrder.status
      console.log(`[OrderStore] Smart merged order ${order.id} (status: ${existingOrder.status} → ${mergedOrder.status}${statusChanged ? ' CHANGED' : ' KEPT'})`)

      return {
        orders: state.orders.map(o => o.id === order.id ? mergedOrder : o),
        ordersMap: newOrdersMap,
        selectedOrder: state.selectedOrder?.id === order.id
          ? mergedOrder
          : state.selectedOrder
      }
    }

    // 새 주문 추가
    const newOrdersMap = new Map(state.ordersMap)
    newOrdersMap.set(order.id, order)
    console.log(`[OrderStore] Added new order ${order.id} (status: ${order.status})`)
    return {
      orders: [...state.orders, order],
      ordersMap: newOrdersMap
    }
  }),
  updateOrder: (orderId, orderData) =>
    set((state) => {
      const existingOrder = state.ordersMap.get(orderId)
      if (!existingOrder) return state
      
      const updatedOrder = { ...existingOrder, ...orderData }
      const newOrdersMap = new Map(state.ordersMap)
      newOrdersMap.set(orderId, updatedOrder)
      
      return {
        orders: state.orders.map((order) =>
          order.id === orderId ? updatedOrder : order
        ),
        ordersMap: newOrdersMap,
        selectedOrder:
          state.selectedOrder?.id === orderId
            ? updatedOrder
            : state.selectedOrder,
      }
    }),
  removeOrder: (orderId) =>
    set((state) => {
      const newOrdersMap = new Map(state.ordersMap)
      newOrdersMap.delete(orderId)
      return {
        orders: state.orders.filter((order) => order.id !== orderId),
        ordersMap: newOrdersMap,
        selectedOrder: state.selectedOrder?.id === orderId ? null : state.selectedOrder,
      }
    }),
  selectOrder: (order) => set({ selectedOrder: order }),
  setFilter: (filter) => set({ filter }),
  setOrderFilterType: (filterType) => set({ orderFilterType: filterType }),
  setAreaFilter: (areas) => set({ areaFilter: areas }),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () => set({ 
    orders: [], 
    ordersMap: new Map<number, Order>(),
    selectedOrder: null, 
    filter: {}, 
    orderFilterType: OrderFilterType.All,
    areaFilter: ['all', 's=', 'c=', 'o=', 'p=', 'k=', 'w=', 'a=', 'y=', 't='],
    isLoading: false 
  }),
  getOrderById: (orderId) => get().ordersMap.get(orderId),
}))
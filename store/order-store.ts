import { create } from 'zustand'
import { Order, OrderFilter } from '@/types/order'
import { OrderFilterType } from '@/utils/order-filters'

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
  setOrders: (orders) => {
    const ordersMap = new Map<number, Order>()
    orders.forEach(order => ordersMap.set(order.id, order))
    set({ orders, ordersMap })
  },
  addOrder: (order) => set((state) => {
    const newOrdersMap = new Map(state.ordersMap)
    newOrdersMap.set(order.id, order)
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
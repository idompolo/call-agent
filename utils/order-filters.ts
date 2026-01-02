import { Order } from '@/types/order'

export enum OrderFilterType {
  All = 'all',
  Filter1 = 'filter1',
  Filter2 = 'filter2',
  Filter3 = 'filter3',
  Filter4 = 'filter4',
  Filter5 = 'filter5',
  Filter6 = 'filter6',
  Filter7 = 'filter7',
  Filter8 = 'filter8'
}

// Helper functions to check order states - exact match with Flutter implementation
const isManualCancel = (order: Order): boolean => {
  return order.actions?.some(action => action.name === '손취') || false
}

const isCheckCall = (order: Order): boolean => {
  // Flutter: order.actions.any((e) => e.name == '첵콜')
  return order.actions?.some(action => action.name === '첵콜') || false
}

const isCancel = (order: Order): boolean => {
  // Flutter: order.cancelAt != null
  return order.cancelAt != null
}

const isBoarding = (order: Order): boolean => {
  // Flutter: order.actions.any((e) => e.name == '탑승')
  return order.actions?.some(action => action.name === '탑승') || false
}

const isAccept = (order: Order): boolean => {
  // Flutter: order.acceptAt != null
  return order.acceptAt != null
}

const isReserve = (order: Order): boolean => {
  return order.reserveAt != null
}

// Filter functions for each filter type - exact match with Flutter implementation
export const filterFunctions: Record<OrderFilterType, (order: Order) => boolean> = {
  [OrderFilterType.All]: () => true,

  // Filter1: 손취>첵콜>poi없는접수>배차후취소
  [OrderFilterType.Filter1]: (order: Order) => {
    if (isReserve(order)) return false

    const sonc = !isBoarding(order) && (order.actions?.some(e => e.name === '손취') || false)
    const c = isCheckCall(order) && !isBoarding(order) && !isCancel(order)
    const na = (!order.poiName || order.poiName.length === 0) && !isAccept(order) && !isCancel(order)
    const ac = !isCancel(order) && isAccept(order) && isCancel(order)

    return sonc || c || na || ac
  },

  // Filter2: 손취>첵콜>모든접수>배차후취소
  [OrderFilterType.Filter2]: (order: Order) => {
    if (isReserve(order)) return false

    const sonc = !isBoarding(order) && (order.actions?.some(e => e.name === '손취') || false)
    const c = isCheckCall(order) && !isBoarding(order) && !isCancel(order)
    const a = !isAccept(order) && !isCancel(order)
    const ac = !isCancel(order) && isAccept(order) && isCancel(order)

    return sonc || c || a || ac
  },

  // Filter3: 손취>첵콜>poi없는접수>미탑승
  [OrderFilterType.Filter3]: (order: Order) => {
    if (isReserve(order)) return false

    const sonc = !isBoarding(order) && (order.actions?.some(e => e.name === '손취') || false)
    const c = isCheckCall(order) && !isBoarding(order) && !isCancel(order)
    const na = (!order.poiName || order.poiName.length === 0) && !isAccept(order) && !isCancel(order)
    const ac = !isCancel(order) && isAccept(order) && !isBoarding(order)

    return sonc || c || na || ac
  },

  // Filter4: 손취>첵콜>모든접수>미탑승
  [OrderFilterType.Filter4]: (order: Order) => {
    if (isReserve(order)) return false

    const sonc = !isBoarding(order) && (order.actions?.some(e => e.name === '손취') || false)
    const c = isCheckCall(order) && !isBoarding(order) && !isCancel(order)
    const a = !isAccept(order) && !isCancel(order)
    const ac = !isCancel(order) && isAccept(order) && !isBoarding(order)

    return sonc || c || a || ac
  },

  // Filter5: 손취>첵콜>모든접수>배차(탑승, 배차후 취소건 제외)
  [OrderFilterType.Filter5]: (order: Order) => {
    if (isReserve(order)) return false

    const sonc = !isBoarding(order) && (order.actions?.some(e => e.name === '손취') || false)
    const c = isCheckCall(order) && !isBoarding(order) && !isCancel(order)
    const a = !isAccept(order) && !isCancel(order)
    const ac = !isCancel(order) && isAccept(order) && !isBoarding(order)
    const cc = !isAccept(order) && isCancel(order)

    return sonc || c || a || ac || cc
  },

  // Filter6: 접수만
  [OrderFilterType.Filter6]: (order: Order) => {
    if (isReserve(order)) return false
    const a = !isAccept(order) && !isCancel(order)
    return a
  },

  // Filter7: 예약만 (취소포함)
  [OrderFilterType.Filter7]: (order: Order) => {
    if (!isReserve(order)) return false
    return true
  },

  // Filter8: 예약만 (취소제외)
  [OrderFilterType.Filter8]: (order: Order) => {
    if (!isReserve(order)) return false
    if (isCancel(order)) return false
    return true
  }
}

// Helper function to generate sort key like Flutter (priority + timestamp)
const sortKeyGen = (priority: number, date: Date | undefined): number => {
  const timestamp = date ? date.getTime() : 0
  // Flutter: int.parse('$t${at.millisecondsSinceEpoch}')
  // Combine priority and timestamp as a number
  return parseInt(`${priority}${timestamp}`)
}


// Apply filter and sorting to orders - exact match with Flutter implementation
export const applyOrderFilter = (orders: Order[], filterType: OrderFilterType): Order[] => {
  const filterFn = filterFunctions[filterType]
  const filtered = orders.filter(filterFn)

  // Apply sorting based on filter type - all ascending (oldest first)
  if (filterType === OrderFilterType.Filter1) {
    // 손취>첵콜>poi없는접수>배차후취소(F10)
    return filtered.sort((a, b) => {
      const bt = getSortCal(b)
      const at = getSortCal(a)
      return at - bt // Ascending order (oldest first)
    })
  } else if (filterType === OrderFilterType.Filter2) {
    // 손취>첵콜>모든접수>배차후취소
    return filtered.sort((a, b) => {
      const bt = getSortCal2(b)
      const at = getSortCal2(a)
      return at - bt // Ascending order (oldest first)
    })
  } else if (filterType === OrderFilterType.Filter3) {
    // 손취>첵콜>poi없는접수>미탑승
    return filtered.sort((a, b) => {
      const bt = getSortCal3(b)
      const at = getSortCal3(a)
      return at - bt // Ascending order (oldest first)
    })
  } else if (filterType === OrderFilterType.Filter4) {
    // 손취>첵콜>모든접수>미탑승
    return filtered.sort((a, b) => {
      const bt = getSortCal4(b)
      const at = getSortCal4(a)
      return at - bt // Ascending order (oldest first)
    })
  } else if (filterType === OrderFilterType.Filter5) {
    // 손취>첵콜>모든접수>미탑승 (uses sortCal4)
    return filtered.sort((a, b) => {
      const bt = getSortCal4(b)
      const at = getSortCal4(a)
      return at - bt // Ascending order (oldest first)
    })
  } else if (filterType === OrderFilterType.Filter7 || filterType === OrderFilterType.Filter8) {
    // 예약 - sort by addAt ascending
    return filtered.sort((a, b) => {
      const bt = b.addAt?.getTime() || 0
      const at = a.addAt?.getTime() || 0
      return at - bt // Ascending order (oldest first)
    })
  }

  // For all other filters (All, Filter6)
  if (filterType === OrderFilterType.All) {
    // For All filter: reservations first, then sort by time (oldest first)
    return filtered.sort((a, b) => {
      const aIsReserve = isReserve(a)
      const bIsReserve = isReserve(b)

      // If one is reserve and the other isn't, reserve comes first
      if (aIsReserve && !bIsReserve) return -1
      if (!aIsReserve && bIsReserve) return 1

      // If both are same type (both reserve or both not reserve), sort by time
      const bt = b.addAt?.getTime() || 0
      const at = a.addAt?.getTime() || 0
      return at - bt // Ascending order (oldest first)
    })
  }

  // For Filter6 and any other filters, apply default sorting - oldest first
  return filtered.sort((a, b) => {
    const bt = b.addAt?.getTime() || 0
    const at = a.addAt?.getTime() || 0
    return at - bt // Ascending order (oldest first)
  })
}

// Flutter sorting functions
const getSortCal = (order: Order): number => {
  let bt = 0

  // Priority 4: 손취
  bt = isSonCancel(order) ? sortKeyGen(1, order.addAt) : 0
  if (bt === 0) {
    // Priority 3: 첵콜
    bt = isCheckCallV(order)
      ? sortKeyGen(2, order.actions?.find(a => a.name === '첵콜')?.at)
      : 0
  }
  if (bt === 0) {
    // Priority 2: POI없는접수
    bt = isNonAcceptCancelWithNotMatch(order) ? sortKeyGen(3, order.addAt) : 0
  }
  if (bt === 0) {
    // Priority 1: 배차후취소
    bt = isAcceptAfterCancel(order) ? sortKeyGen(4, order.addAt) : 0
  }

  return bt
}

const getSortCal2 = (order: Order): number => {
  let bt = 0

  // Priority 4: 손취
  bt = isSonCancel(order) ? sortKeyGen(1, order.addAt) : 0
  if (bt === 0) {
    // Priority 3: 첵콜
    bt = isCheckCallV(order)
      ? sortKeyGen(2, order.actions?.find(a => a.name === '첵콜')?.at)
      : 0
  }
  if (bt === 0) {
    // Priority 2: 모든접수
    bt = isAddOrder(order) ? sortKeyGen(3, order.addAt) : 0
  }
  if (bt === 0) {
    // Priority 1: 배차후취소
    bt = isAcceptAfterCancel(order) ? sortKeyGen(4, order.addAt) : 0
  }

  return bt
}

const getSortCal3 = (order: Order): number => {
  let bt = 0

  // Priority 4: 손취
  bt = isSonCancel(order) ? sortKeyGen(1, order.addAt) : 0
  if (bt === 0) {
    // Priority 3: 첵콜
    bt = isCheckCallV(order)
      ? sortKeyGen(2, order.actions?.find(a => a.name === '첵콜')?.at)
      : 0
  }
  if (bt === 0) {
    // Priority 2: POI없는접수
    bt = isNonAcceptCancelWithNotMatch(order) ? sortKeyGen(3, order.addAt) : 0
  }
  if (bt === 0) {
    // Priority 1: 미탑승
    bt = isNoBoarding(order) ? sortKeyGen(4, order.addAt) : 0
  }

  return bt
}

const getSortCal4 = (order: Order): number => {
  let bt = 0

  // Priority 4: 손취
  bt = isSonCancel(order) ? sortKeyGen(1, order.addAt) : 0
  if (bt === 0) {
    // Priority 3: 첵콜
    bt = isCheckCallV(order)
      ? sortKeyGen(2, order.actions?.find(a => a.name === '첵콜')?.at)
      : 0
  }
  if (bt === 0) {
    // Priority 2: 모든접수
    bt = isAddOrder(order) ? sortKeyGen(3, order.addAt) : 0
  }
  if (bt === 0) {
    // Priority 1: 미탑승
    bt = isNoBoarding(order) ? sortKeyGen(4, order.addAt) : 0
  }

  return bt
}

// Helper functions for sorting - exact match with Flutter
const isSonCancel = (order: Order): boolean => {
  return (order.actions?.some(e => e.name === '손취') || false)
}

const isCheckCallV = (order: Order): boolean => {
  return isCheckCall(order) && !isBoarding(order) && !isCancel(order)
}

const isNonAcceptCancelWithNotMatch = (order: Order): boolean => {
  // Flutter: order.poiName?.isNotEmpty != true
  return (!order.poiName || order.poiName.trim().length === 0) && !order.drvNo && !isCancel(order)
}

const isAcceptAfterCancel = (order: Order): boolean => {
  return !!order.drvNo && isCancel(order)
}

const isNoBoarding = (order: Order): boolean => {
  return order.acceptAt != null && !isCancel(order) && !isBoarding(order)
}

const isAddOrder = (order: Order): boolean => {
  return !order.drvNo && !isCancel(order)
}
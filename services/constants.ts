// API Base URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://211.55.114.181:3000'

// WebSocket URLs
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://211.55.114.181:7012'
export const SOCKET_IO_URL = process.env.NEXT_PUBLIC_SOCKET_IO_URL || 'http://211.55.114.181:7013'

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/login',
  LOGOUT: '/logout',
  
  // Orders
  ORDERS: '/orders',
  ORDER_DETAIL: (id: number) => `/orders/${id}`,
  
  // Drivers
  DRIVERS: '/drivers',
  DRIVER_DETAIL: (id: number) => `/drivers/${id}`,
  
  // Cars
  CARS: '/cars',
  CAR_DETAIL: (id: number) => `/cars/${id}`,
  
  // Camps
  CAMPS: '/camps',
  CAMP_DETAIL: (id: number) => `/camps/${id}`,
  
  // POIs
  POIS: '/pois',
  POI_DETAIL: (id: number) => `/pois/${id}`,
} as const

// MQTT Topics
export const MQTT_TOPICS = {
  ADD_ORDER: 'web/addOrder',
  ADD_RESERVE: 'web/addReserve',
  MODIFY_ORDER: 'web/modifyOrder',
  CANCEL_ORDER: 'web/cancelOrder',
  ACCEPT_ORDER: 'web/acceptOrder',
  CONNECT_AGENT: 'web/connectAgent',
  SELECT_AGENT: 'web/selectAgent',
  ACTION_ORDER: 'web/actionOrder',
  GPS: 'ftnh:drv:gps',
  AGENT: (userId: string) => `ftnh/agent/${userId}`,
} as const
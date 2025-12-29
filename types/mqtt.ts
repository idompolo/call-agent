// MQTT 관련 타입 정의

export interface MQTTPayload {
  type?: string
  data?: unknown
  timestamp?: number
  [key: string]: unknown
}

export interface OrderPayload {
  id?: string | number
  _id?: string | number
  orderId?: string | number
  orderNo?: string
  order_no?: string
  status?: string
  acceptAgent?: string
  cancelAt?: string
  acceptAt?: string
  drvNo?: string
  licensePlate?: string
  customerName?: string
  customer_name?: string
  customerPhone?: string
  customer_phone?: string
  pickupAddress?: string
  pickup_address?: string
  dropoffAddress?: string
  dropoff_address?: string
  driverName?: string
  driver_name?: string
  carNumber?: string
  car_number?: string
  requestTime?: string | Date
  request_time?: string | Date
  acceptTime?: string | Date
  completeTime?: string | Date
  amount?: number | string
  distance?: number
  duration?: number
  memo?: string
  createdAt?: string | Date
  updatedAt?: string | Date
  type?: string
  order?: unknown
  [key: string]: unknown
}

export interface InitialDataPayload {
  orders?: unknown[]
  timestamp?: number
  [key: string]: unknown
}

export interface SyncStats {
  totalOrders: number
  syncedOrders: number
  failedOrders: number
  duration: number
  timestamp: number
}

export type MessageHandler = (data: unknown) => void
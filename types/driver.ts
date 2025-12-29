export interface Driver {
  id: number
  drvNo: string
  name: string
  telephone?: string
  licensePlate?: string
  campId?: number
  campName?: string
  status: 'active' | 'inactive' | 'suspended'
  joinedAt?: Date
  lastActiveAt?: Date
  extra?: string
}

export interface DriverHistory {
  id: number
  driverId: number
  orderId: number
  action: string
  timestamp: Date
  details?: string
}
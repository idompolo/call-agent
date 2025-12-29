export interface Car {
  id: number
  licensePlate: string
  model?: string
  year?: number
  campId?: number
  campName?: string
  driverId?: number
  driverName?: string
  status: 'active' | 'maintenance' | 'inactive'
  lastMaintenanceAt?: Date
  extra?: string
}
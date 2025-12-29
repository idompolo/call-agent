// OrderAction 타입 추가 (ActionModel과 동일)
export type OrderAction = ActionModel

export interface Order {
  id: number
  telephone?: string
  customerName?: string
  calldong?: string
  callplace?: string
  poiName?: string
  status?: string
  cancelStatus?: string
  drvNo?: string
  drvName?: string
  licensePlate?: string
  carNo?: number
  addAgent?: string
  acceptAgent?: string
  cancelAgent?: string
  cancelReason?: string
  modifyAgent?: string
  addAt?: Date
  modifyAt?: Date
  acceptAt?: Date
  cancelAt?: Date
  reserveAt?: Date
  extra?: string
  notiTime?: number
  lat?: number
  lng?: number
  selectAgent?: string
  token?: string
  actions?: ActionModel[]
  messages?: SmsModel[]
  acts?: string
  poi?: string
}

export interface ActionModel {
  name: string
  at: Date
  type?: string
  data?: string
}

export interface SmsModel {
  id: string
  message: string
  sentAt: Date
  recipient: string
  status: 'sent' | 'failed' | 'pending'
}

export type OrderStatus = 'waiting' | 'accepted' | 'cancelled' | 'completed'

export interface OrderFilter {
  status?: OrderStatus
  area?: string
  dateFrom?: Date
  dateTo?: Date
  searchTerm?: string
}
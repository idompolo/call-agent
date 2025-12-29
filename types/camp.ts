export interface Camp {
  id: number
  name: string
  address?: string
  telephone?: string
  managerName?: string
  managerTel?: string
  status: 'active' | 'inactive'
  createdAt?: Date
  extra?: string
}
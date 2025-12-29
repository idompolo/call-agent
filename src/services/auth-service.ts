import type { Car } from '@/types/car'

interface LoginResponse {
  id: number
  name: string
  age: number
  useCode: number
  callboxId: number
  sendCallboxId?: number
  camp?: {
    id: number
    name: string
    alias: string
  }
  company?: {
    id: number
    name: string
  }
  car?: Car
}

const API_BASE_URL = 'http://211.55.114.181:3000'

export const authService = {
  async login(loginId: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login?loginId=${encodeURIComponent(loginId)}&password=${encodeURIComponent(password)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('로그인에 실패했습니다.')
    }

    const data = await response.json()
    return data
  },
}
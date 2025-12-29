import { API_BASE_URL } from './constants'

interface BaseEntity {
  id?: number
}

export interface Driver extends BaseEntity {
  name: string
  age: number
  telephone: string
  carNo?: string
  licensePlate?: string
  camp?: string
  lock?: boolean
  car?: {
    callNo?: string
    licensePlate?: string
    camp?: {
      name?: string
    }
  }
}

export interface Car extends BaseEntity {
  callNo: string
  licensePlate: string
  model?: string
  camp?: {
    id?: number
    name?: string
  }
  driver?: {
    id?: number
    name?: string
  }
}

export interface Camp extends BaseEntity {
  name: string
  code: string
  address: string
  telephone: string
}

export interface POI extends BaseEntity {
  name: string
  address: string
  category: string
  lat?: number
  lng?: number
}

class EditService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    return response.json()
  }

  // Driver CRUD
  async getDrivers(): Promise<Driver[]> {
    return this.request<Driver[]>('/user/api/driver?page=1&len=1000')
  }

  async createDriver(driver: Omit<Driver, 'id'>): Promise<Driver> {
    return this.request<Driver>('/user', {
      method: 'POST',
      body: JSON.stringify(driver),
    })
  }

  async updateDriver(id: number, driver: Partial<Driver>): Promise<Driver> {
    return this.request<Driver>(`/user/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(driver),
    })
  }

  async deleteDriver(id: number): Promise<void> {
    return this.request<void>(`/user/${id}`, {
      method: 'DELETE',
    })
  }

  // Car CRUD
  async getCars(): Promise<Car[]> {
    return this.request<Car[]>('/car/api/car?page=1&len=1000')
  }

  async createCar(car: Omit<Car, 'id'>): Promise<Car> {
    return this.request<Car>('/car', {
      method: 'POST',
      body: JSON.stringify(car),
    })
  }

  async updateCar(id: number, car: Partial<Car>): Promise<Car> {
    return this.request<Car>(`/car/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(car),
    })
  }

  async deleteCar(id: number): Promise<void> {
    return this.request<void>(`/car/${id}`, {
      method: 'DELETE',
    })
  }

  // Camp CRUD
  async getCamps(): Promise<Camp[]> {
    return this.request<Camp[]>('/camp/api/camp?page=1&len=1000')
  }

  async createCamp(camp: Omit<Camp, 'id'>): Promise<Camp> {
    return this.request<Camp>('/camp', {
      method: 'POST',
      body: JSON.stringify(camp),
    })
  }

  async updateCamp(id: number, camp: Partial<Camp>): Promise<Camp> {
    return this.request<Camp>(`/camp/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(camp),
    })
  }

  async deleteCamp(id: number): Promise<void> {
    return this.request<void>(`/camp/${id}`, {
      method: 'DELETE',
    })
  }

  // POI CRUD
  async getPOIs(): Promise<POI[]> {
    return this.request<POI[]>('/poi/api/poi?page=1&len=1000')
  }

  async createPOI(poi: Omit<POI, 'id'>): Promise<POI> {
    return this.request<POI>('/poi', {
      method: 'POST',
      body: JSON.stringify(poi),
    })
  }

  async updatePOI(id: number, poi: Partial<POI>): Promise<POI> {
    return this.request<POI>(`/poi/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(poi),
    })
  }

  async deletePOI(id: number): Promise<void> {
    return this.request<void>(`/poi/${id}`, {
      method: 'DELETE',
    })
  }
}

export const editService = new EditService()
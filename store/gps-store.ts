import { create } from 'zustand'

export interface GpsData {
  drvNo: string
  lat: number
  lng: number
  timestamp: Date
}

interface GpsStore {
  gpsMap: Map<string, GpsData>
  updateGpsData: (drvNo: string, lat: number, lng: number) => void
  getGpsData: (drvNo: string) => GpsData | undefined
  clearGpsData: () => void
}

export const useGpsStore = create<GpsStore>((set, get) => ({
  gpsMap: new Map(),
  
  updateGpsData: (drvNo: string, lat: number, lng: number) => {
    set((state) => {
      const newMap = new Map(state.gpsMap)
      newMap.set(drvNo, {
        drvNo,
        lat,
        lng,
        timestamp: new Date()
      })
      return { gpsMap: newMap }
    })
  },
  
  getGpsData: (drvNo: string) => {
    return get().gpsMap.get(drvNo)
  },
  
  clearGpsData: () => {
    set({ gpsMap: new Map() })
  }
}))
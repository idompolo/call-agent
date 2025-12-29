import { create } from 'zustand'
import { mqttService } from '@/services/mqtt-service'
import { isElectron, getElectronAPI } from '@/lib/electron'

interface MqttState {
  isConnected: boolean
  subscriptions: Map<string, Set<(message: string) => void>>
  
  // Actions
  subscribeToTopic: (topic: string, callback: (message: string) => void) => () => void
  publishMessage: (topic: string, message: string) => void
  setConnected: (connected: boolean) => void
}

export const useMqttStore = create<MqttState>((set, get) => ({
  isConnected: false,
  subscriptions: new Map(),

  subscribeToTopic: (topic: string, callback: (message: string) => void) => {
    const { subscriptions } = get()
    
    if (!subscriptions.has(topic)) {
      subscriptions.set(topic, new Set())
      // Subscribe to MQTT topic
      mqttService.subscribe(topic, (message) => {
        const callbacks = get().subscriptions.get(topic)
        callbacks?.forEach(cb => cb(message))
      })
    }
    
    subscriptions.get(topic)?.add(callback)
    
    // Return unsubscribe function
    return () => {
      const subs = get().subscriptions.get(topic)
      subs?.delete(callback)
      
      // If no more callbacks for this topic, unsubscribe from MQTT
      if (subs?.size === 0) {
        get().subscriptions.delete(topic)
        mqttService.unsubscribe(topic)
      }
    }
  },

  publishMessage: (topic: string, message: string) => {
    const { isConnected } = get()

    if (!isConnected) {
      console.warn('MQTT not connected, cannot publish message')
      return
    }

    // Electron 환경에서는 IPC를 통해 Main Process로 publish
    if (isElectron()) {
      const api = getElectronAPI()
      api?.publishMQTT?.(topic, message).catch((err: Error) => {
        console.error('[MqttStore] Failed to publish via IPC:', err)
      })
    } else {
      mqttService.publish(topic, message)
    }
  },

  setConnected: (connected: boolean) => {
    set({ isConnected: connected })
  }
}))

// Initialize MQTT connection status listener
if (typeof window !== 'undefined') {
  mqttService.onConnectionChange((connected) => {
    useMqttStore.getState().setConnected(connected)
  })
}
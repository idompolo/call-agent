import { useEffect, useRef, useCallback } from 'react'
import { mqttService, MqttService } from '@/services/mqtt-service'
import { useOrderStore } from '@/store/order-store'
import { useAuthStore } from '@/store/auth-store'
import { useGpsStore } from '@/store/gps-store'
import { isElectron, getElectronAPI } from '@/lib/electron'

/**
 * MQTT 훅 - Electron과 웹 환경 모두 지원
 *
 * Electron 환경: Main Process의 MQTT 클라이언트 사용 (IPC 통신)
 * 웹 환경: 기존 WebSocket 기반 MQTT 서비스 사용
 */
export function useMqtt() {
  const { user } = useAuthStore()
  const { addOrder, updateOrder } = useOrderStore()
  const { updateGpsData } = useGpsStore()
  const isConnected = useRef(false)
  const isSubscribed = useRef(false) // 중복 구독 방지
  const connectionTimeout = useRef<NodeJS.Timeout | null>(null)
  const cleanupFns = useRef<Array<() => void>>([])

  // Electron IPC 이벤트 구독 설정
  // rawData를 사용하여 웹 환경과 동일한 파싱 로직 적용
  const setupElectronSubscriptions = useCallback(() => {
    const api = getElectronAPI()
    if (!api) {
      console.log('[useMqtt] No Electron API found')
      return
    }

    // 이미 구독 중이면 중복 설정 방지
    if (isSubscribed.current) {
      console.log('[useMqtt] Already subscribed, skipping duplicate setup')
      return
    }

    // 기존 구독 해제 (혹시 남아있을 경우)
    if (cleanupFns.current.length > 0) {
      console.log('[useMqtt] Cleaning up existing subscriptions before re-subscribing')
      cleanupFns.current.forEach((fn) => fn())
      cleanupFns.current = []
    }

    isSubscribed.current = true
    console.log('[useMqtt] Setting up Electron IPC subscriptions')

    // IPC 페이로드 타입
    interface IpcPayload {
      type: string
      orderId?: string
      data?: Record<string, unknown>
      rawData: string
    }

    // Order Add (web/addOrder, web/addReserve)
    const unsubOrderAdd = api.onOrderAdd?.((data: unknown) => {
      console.log('[useMqtt] Received Order Add:', data)
      const payload = data as IpcPayload
      if (payload.rawData) {
        // rawData를 웹과 동일하게 파싱
        const order = payload.type === 'add-reserve'
          ? MqttService.parseReserveOrderMessage(payload.rawData)
          : MqttService.parseAddOrderMessage(payload.rawData)
        if (order.id) {
          console.log('[useMqtt] Parsed order:', order)
          addOrder(order as any)
        }
      }
    })
    if (unsubOrderAdd) cleanupFns.current.push(unsubOrderAdd)

    // Order Modify (web/modifyOrder)
    const unsubOrderModify = api.onOrderModify?.((data: unknown) => {
      console.log('[useMqtt] Received Order Modify:', data)
      const payload = data as IpcPayload
      if (payload.rawData) {
        const order = MqttService.parseModifyOrderMessage(payload.rawData)
        if (order.id) {
          console.log('[useMqtt] Parsed modify order:', order)
          updateOrder(order.id, order)
        }
      }
    })
    if (unsubOrderModify) cleanupFns.current.push(unsubOrderModify)

    // Order Accept (web/acceptOrder)
    const unsubOrderAccept = api.onOrderAccept?.((data: unknown) => {
      console.log('[useMqtt] Received Order Accept:', data)
      const payload = data as IpcPayload
      if (payload.rawData) {
        const order = MqttService.parseAcceptOrderMessage(payload.rawData)
        if (order.id) {
          console.log('[useMqtt] Parsed accept order:', order)
          updateOrder(order.id, { ...order, status: 'accepted' })
        }
      }
    })
    if (unsubOrderAccept) cleanupFns.current.push(unsubOrderAccept)

    // Order Cancel (web/cancelOrder)
    const unsubOrderCancel = api.onOrderCancel?.((data: unknown) => {
      console.log('[useMqtt] Received Order Cancel:', data)
      const payload = data as IpcPayload
      if (payload.rawData) {
        const order = MqttService.parseCancelOrderMessage(payload.rawData)
        if (order.id) {
          console.log('[useMqtt] Parsed cancel order:', order)
          updateOrder(order.id, order)
        }
      }
    })
    if (unsubOrderCancel) cleanupFns.current.push(unsubOrderCancel)

    // Order Action (web/actionOrder)
    const unsubOrderAction = api.onOrderAction?.((data: unknown) => {
      console.log('[useMqtt] Received Order Action:', data)
      const payload = data as IpcPayload
      if (payload.rawData) {
        try {
          const { orderId, action } = MqttService.parseActionOrderMessage(payload.rawData)
          const currentOrder = useOrderStore.getState().getOrderById(orderId)
          if (currentOrder) {
            const updatedActions = [...(currentOrder.actions || []), action]
            console.log('[useMqtt] Parsed action order:', orderId, action)
            updateOrder(orderId, { actions: updatedActions })
          }
        } catch (error) {
          console.error('[useMqtt] Failed to parse action:', error)
        }
      }
    })
    if (unsubOrderAction) cleanupFns.current.push(unsubOrderAction)

    // Select Agent (web/selectAgent)
    const unsubSelectAgent = api.onSelectAgent?.((data: unknown) => {
      console.log('[useMqtt] Received Select Agent:', data)
      const payload = data as IpcPayload
      if (payload.rawData) {
        const arr = payload.rawData.split('|')
        const orderId = parseInt(arr[0])
        const selectAgent = arr[1]
        if (orderId) {
          console.log('[useMqtt] Parsed select agent:', orderId, selectAgent)
          updateOrder(orderId, { selectAgent })
        }
      }
    })
    if (unsubSelectAgent) cleanupFns.current.push(unsubSelectAgent)

    // Driver GPS (ftnh:drv:gps) - batched array
    // parsers.ts의 parseGPS()가 driverId를 반환하므로 해당 필드 사용
    const unsubDriverGPS = api.onDriverGPS?.((data: unknown) => {
      const locations = data as Array<{ driverId: string; lat: number; lng: number }>
      if (Array.isArray(locations)) {
        console.log('[useMqtt] Received Driver GPS:', locations.length, 'locations')
        locations.forEach((gps) => {
          // driverId를 drvNo로 사용하여 GPS 스토어 업데이트
          if (gps.driverId && gps.lat && gps.lng) {
            updateGpsData(gps.driverId, gps.lat, gps.lng)
          }
        })
      }
    })
    if (unsubDriverGPS) cleanupFns.current.push(unsubDriverGPS)
  }, [addOrder, updateOrder, updateGpsData])

  // 웹 환경 MQTT 구독 설정
  const setupWebSubscriptions = useCallback(() => {
    // Subscribe to order events
    mqttService.subscribeMessage('web/addOrder', (message) => {
      const order = MqttService.parseAddOrderMessage(message)
      if (order.id) {
        addOrder(order as any)
      }
    })

    mqttService.subscribeMessage('web/addReserve', (message) => {
      const order = MqttService.parseReserveOrderMessage(message)
      if (order.id) {
        addOrder(order as any)
      }
    })

    mqttService.subscribeMessage('web/modifyOrder', (message) => {
      const order = MqttService.parseModifyOrderMessage(message)
      if (order.id) {
        updateOrder(order.id, order)
      }
    })

    mqttService.subscribeMessage('web/cancelOrder', (message) => {
      const order = MqttService.parseCancelOrderMessage(message)
      if (order.id) {
        updateOrder(order.id, order)
      }
    })

    mqttService.subscribeMessage('web/acceptOrder', (message) => {
      const order = MqttService.parseAcceptOrderMessage(message)
      if (order.id) {
        updateOrder(order.id, { ...order, status: 'accepted' })
      }
    })

    mqttService.subscribeMessage('web/actionOrder', (message) => {
      const { orderId, action } = MqttService.parseActionOrderMessage(message)
      const currentOrder = useOrderStore.getState().getOrderById(orderId)
      if (currentOrder) {
        const updatedActions = [...(currentOrder.actions || []), action]
        updateOrder(orderId, { actions: updatedActions })
      }
    })

    mqttService.subscribeMessage('web/selectAgent', (message) => {
      const arr = message.split('|')
      const orderId = parseInt(arr[0])
      const selectAgent = arr[1]
      if (orderId) {
        updateOrder(orderId, { selectAgent })
      }
    })

    mqttService.subscribeMessage('web/connectAgent', () => {
      // Handle connected agents if needed
    })

    mqttService.subscribeMessage('ftnh:drv:gps', (message) => {
      const gpsData = MqttService.parseGpsMessage(message)
      if (gpsData) {
        updateGpsData(gpsData.drvNo, gpsData.lat, gpsData.lng)
      }
    })
  }, [addOrder, updateOrder, updateGpsData])

  useEffect(() => {
    if (!user?.id) return

    const connectAndSubscribe = async () => {
      if (isConnected.current) return

      try {
        // 연결 타임아웃 설정 (30초)
        connectionTimeout.current = setTimeout(() => {
          console.error('[useMqtt] Connection timeout after 30s')
          if (isElectron()) {
            getElectronAPI()?.disconnectMQTT?.()
          } else {
            mqttService.disconnect()
          }
          isConnected.current = false
        }, 30000)

        if (isElectron()) {
          // Electron 환경: Main Process MQTT 사용
          console.log('[useMqtt] Using Electron IPC for MQTT')
          const api = getElectronAPI()
          if (api?.connectMQTT) {
            const success = await api.connectMQTT(user.id.toString())
            if (success) {
              isConnected.current = true
              setupElectronSubscriptions()
            }
          }
        } else {
          // 웹 환경: WebSocket MQTT 사용
          console.log('[useMqtt] Using WebSocket for MQTT')
          await mqttService.connect(user.id.toString())
          isConnected.current = true
          setupWebSubscriptions()
        }

        // 타임아웃 클리어
        if (connectionTimeout.current) {
          clearTimeout(connectionTimeout.current)
          connectionTimeout.current = null
        }
      } catch (error) {
        console.error('Failed to connect to MQTT:', error)
        isConnected.current = false
      }
    }

    connectAndSubscribe()

    return () => {
      // 타임아웃 클리어
      if (connectionTimeout.current) {
        clearTimeout(connectionTimeout.current)
        connectionTimeout.current = null
      }

      // Electron 이벤트 구독 해제
      cleanupFns.current.forEach((fn) => fn())
      cleanupFns.current = []
      isSubscribed.current = false // 구독 상태 리셋

      if (isConnected.current) {
        if (isElectron()) {
          getElectronAPI()?.disconnectMQTT?.()
        } else {
          mqttService.disconnect()
        }
        isConnected.current = false
      }
    }
  }, [user?.id, setupElectronSubscriptions, setupWebSubscriptions])

  // publishMessage도 환경에 따라 분기
  const publishMessage = useCallback(
    async (topic: string, message: string) => {
      if (isElectron()) {
        const api = getElectronAPI()
        if (api?.publishMQTT) {
          const success = await api.publishMQTT(topic, message)
          if (!success) {
            console.error('[useMqtt] Failed to publish via IPC:', topic)
          }
        }
      } else {
        mqttService.publishMessage(topic, message)
      }
    },
    []
  )

  return {
    publishMessage,
    isConnected: isConnected.current,
  }
}

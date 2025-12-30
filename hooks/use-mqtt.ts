import { useEffect, useRef, useCallback } from 'react'
import { mqttService, MqttService } from '@/services/mqtt-service'
import { useOrderStore } from '@/store/order-store'
import { useAuthStore } from '@/store/auth-store'
import { useGpsStore } from '@/store/gps-store'
import { isElectron, getElectronAPI } from '@/lib/electron'
import { Order } from '@/types/order'

// 버퍼링된 메시지 타입
interface BufferedOrderMessage {
  type: 'add' | 'modify' | 'accept' | 'cancel' | 'action' | 'selectAgent'
  order?: Partial<Order>
  orderId?: number
  action?: { name: string; at: Date }
  selectAgent?: string
  timestamp: number
}

/**
 * MQTT 훅 - Electron과 웹 환경 모두 지원
 *
 * 버퍼링 전략:
 * 1. MQTT 연결 & 구독 시작
 * 2. 초기화 완료 전 메시지 → 버퍼에 저장
 * 3. API fetch 완료 (isInitialized = true)
 * 4. 버퍼 처리 → 이후 메시지는 바로 처리
 *
 * Electron 환경: Main Process의 MQTT 클라이언트 사용 (IPC 통신)
 * 웹 환경: 기존 WebSocket 기반 MQTT 서비스 사용
 */
export function useMqtt() {
  const { user, isInitialized } = useAuthStore()
  const { addOrder, updateOrder } = useOrderStore()
  const { updateGpsData } = useGpsStore()
  const isConnected = useRef(false)
  const isSubscribed = useRef(false) // 중복 구독 방지
  const connectionTimeout = useRef<NodeJS.Timeout | null>(null)
  const cleanupFns = useRef<Array<() => void>>([])

  // 메시지 버퍼 (초기화 완료 전까지 저장)
  const messageBuffer = useRef<BufferedOrderMessage[]>([])
  const hasProcessedBuffer = useRef(false)

  /**
   * 버퍼에 메시지 추가 또는 바로 처리
   * isInitialized가 false면 버퍼에 저장, true면 바로 처리
   */
  const processOrBuffer = useCallback((msg: BufferedOrderMessage) => {
    const initialized = useAuthStore.getState().isInitialized

    if (!initialized) {
      // 초기화 전: 버퍼에 저장
      messageBuffer.current.push(msg)
      console.log(`[useMqtt] Buffered message (type=${msg.type}, orderId=${msg.orderId || msg.order?.id}, buffer size=${messageBuffer.current.length})`)
      return
    }

    // 초기화 완료: 바로 처리
    processMessage(msg)
  }, [])

  /**
   * 단일 메시지 처리
   */
  const processMessage = useCallback((msg: BufferedOrderMessage) => {
    switch (msg.type) {
      case 'add':
        if (msg.order?.id) {
          addOrder(msg.order as Order)
        }
        break
      case 'modify':
        if (msg.orderId && msg.order) {
          updateOrder(msg.orderId, msg.order)
        }
        break
      case 'accept':
        if (msg.orderId && msg.order) {
          updateOrder(msg.orderId, { ...msg.order, status: 'accepted' })
        }
        break
      case 'cancel':
        if (msg.orderId && msg.order) {
          updateOrder(msg.orderId, msg.order)
        }
        break
      case 'action':
        if (msg.orderId && msg.action) {
          const currentOrder = useOrderStore.getState().getOrderById(msg.orderId)
          if (currentOrder) {
            const updatedActions = [...(currentOrder.actions || []), msg.action]
            updateOrder(msg.orderId, { actions: updatedActions })
          }
        }
        break
      case 'selectAgent':
        if (msg.orderId && msg.selectAgent !== undefined) {
          updateOrder(msg.orderId, { selectAgent: msg.selectAgent })
        }
        break
    }
  }, [addOrder, updateOrder])

  /**
   * 버퍼 플러시: 초기화 완료 후 버퍼에 쌓인 메시지 처리
   */
  const flushBuffer = useCallback(() => {
    if (hasProcessedBuffer.current || messageBuffer.current.length === 0) {
      return
    }

    hasProcessedBuffer.current = true
    const bufferedMessages = [...messageBuffer.current]
    messageBuffer.current = []

    // 타임스탬프 순으로 정렬
    bufferedMessages.sort((a, b) => a.timestamp - b.timestamp)

    console.log(`[useMqtt] Flushing ${bufferedMessages.length} buffered messages`)

    bufferedMessages.forEach((msg) => {
      processMessage(msg)
    })

    console.log(`[useMqtt] Buffer flush complete`)
  }, [processMessage])

  // isInitialized가 true로 바뀌면 버퍼 플러시
  useEffect(() => {
    if (isInitialized && !hasProcessedBuffer.current) {
      flushBuffer()
    }
  }, [isInitialized, flushBuffer])

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
      const payload = data as IpcPayload
      if (payload.rawData) {
        const order = payload.type === 'add-reserve'
          ? MqttService.parseReserveOrderMessage(payload.rawData)
          : MqttService.parseAddOrderMessage(payload.rawData)
        if (order.id) {
          processOrBuffer({
            type: 'add',
            order: order as Partial<Order>,
            orderId: order.id,
            timestamp: Date.now()
          })
        }
      }
    })
    if (unsubOrderAdd) cleanupFns.current.push(unsubOrderAdd)

    // Order Modify (web/modifyOrder)
    const unsubOrderModify = api.onOrderModify?.((data: unknown) => {
      const payload = data as IpcPayload
      if (payload.rawData) {
        const order = MqttService.parseModifyOrderMessage(payload.rawData)
        if (order.id) {
          processOrBuffer({
            type: 'modify',
            order,
            orderId: order.id,
            timestamp: Date.now()
          })
        }
      }
    })
    if (unsubOrderModify) cleanupFns.current.push(unsubOrderModify)

    // Order Accept (web/acceptOrder)
    const unsubOrderAccept = api.onOrderAccept?.((data: unknown) => {
      const payload = data as IpcPayload
      if (payload.rawData) {
        const order = MqttService.parseAcceptOrderMessage(payload.rawData)
        if (order.id) {
          processOrBuffer({
            type: 'accept',
            order,
            orderId: order.id,
            timestamp: Date.now()
          })
        }
      }
    })
    if (unsubOrderAccept) cleanupFns.current.push(unsubOrderAccept)

    // Order Cancel (web/cancelOrder)
    const unsubOrderCancel = api.onOrderCancel?.((data: unknown) => {
      const payload = data as IpcPayload
      if (payload.rawData) {
        const order = MqttService.parseCancelOrderMessage(payload.rawData)
        if (order.id) {
          processOrBuffer({
            type: 'cancel',
            order,
            orderId: order.id,
            timestamp: Date.now()
          })
        }
      }
    })
    if (unsubOrderCancel) cleanupFns.current.push(unsubOrderCancel)

    // Order Action (web/actionOrder)
    const unsubOrderAction = api.onOrderAction?.((data: unknown) => {
      const payload = data as IpcPayload
      if (payload.rawData) {
        try {
          const { orderId, action } = MqttService.parseActionOrderMessage(payload.rawData)
          processOrBuffer({
            type: 'action',
            orderId,
            action,
            timestamp: Date.now()
          })
        } catch (error) {
          console.error('[useMqtt] Failed to parse action:', error)
        }
      }
    })
    if (unsubOrderAction) cleanupFns.current.push(unsubOrderAction)

    // Select Agent (web/selectAgent)
    const unsubSelectAgent = api.onSelectAgent?.((data: unknown) => {
      const payload = data as IpcPayload
      if (payload.rawData) {
        const arr = payload.rawData.split('|')
        const orderId = parseInt(arr[0])
        const selectAgent = arr[1]
        if (orderId) {
          processOrBuffer({
            type: 'selectAgent',
            orderId,
            selectAgent,
            timestamp: Date.now()
          })
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
  }, [processOrBuffer, updateGpsData])

  // 웹 환경 MQTT 구독 설정
  const setupWebSubscriptions = useCallback(() => {
    // Subscribe to order events
    mqttService.subscribeMessage('web/addOrder', (message) => {
      const order = MqttService.parseAddOrderMessage(message)
      if (order.id) {
        processOrBuffer({
          type: 'add',
          order: order as Partial<Order>,
          orderId: order.id,
          timestamp: Date.now()
        })
      }
    })

    mqttService.subscribeMessage('web/addReserve', (message) => {
      const order = MqttService.parseReserveOrderMessage(message)
      if (order.id) {
        processOrBuffer({
          type: 'add',
          order: order as Partial<Order>,
          orderId: order.id,
          timestamp: Date.now()
        })
      }
    })

    mqttService.subscribeMessage('web/modifyOrder', (message) => {
      const order = MqttService.parseModifyOrderMessage(message)
      if (order.id) {
        processOrBuffer({
          type: 'modify',
          order,
          orderId: order.id,
          timestamp: Date.now()
        })
      }
    })

    mqttService.subscribeMessage('web/cancelOrder', (message) => {
      const order = MqttService.parseCancelOrderMessage(message)
      if (order.id) {
        processOrBuffer({
          type: 'cancel',
          order,
          orderId: order.id,
          timestamp: Date.now()
        })
      }
    })

    mqttService.subscribeMessage('web/acceptOrder', (message) => {
      const order = MqttService.parseAcceptOrderMessage(message)
      if (order.id) {
        processOrBuffer({
          type: 'accept',
          order,
          orderId: order.id,
          timestamp: Date.now()
        })
      }
    })

    mqttService.subscribeMessage('web/actionOrder', (message) => {
      const { orderId, action } = MqttService.parseActionOrderMessage(message)
      processOrBuffer({
        type: 'action',
        orderId,
        action,
        timestamp: Date.now()
      })
    })

    mqttService.subscribeMessage('web/selectAgent', (message) => {
      const arr = message.split('|')
      const orderId = parseInt(arr[0])
      const selectAgent = arr[1]
      if (orderId) {
        processOrBuffer({
          type: 'selectAgent',
          orderId,
          selectAgent,
          timestamp: Date.now()
        })
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
  }, [processOrBuffer, updateGpsData])

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
      console.log('[useMqtt] Cleanup: Resetting all state for refresh/unmount')

      // 타임아웃 클리어
      if (connectionTimeout.current) {
        clearTimeout(connectionTimeout.current)
        connectionTimeout.current = null
      }

      // Electron 이벤트 구독 해제
      cleanupFns.current.forEach((fn) => fn())
      cleanupFns.current = []
      isSubscribed.current = false // 구독 상태 리셋

      // 버퍼 상태 리셋 (새로고침 시 다시 버퍼링 가능하도록)
      messageBuffer.current = []
      hasProcessedBuffer.current = false

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

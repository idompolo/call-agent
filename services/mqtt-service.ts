import mqtt, { MqttClient } from 'mqtt'
import { Order, OrderAction } from '@/types/order'
import { normalizeAgent } from '@/utils/order-formatter'

type QoS = 0 | 1 | 2
type MessageCallback = (message: string) => void

interface BufferedMessage {
  topic: string
  message: string
  timestamp: number
}

// MQTT 서비스 설정 상수
const MQTT_CONFIG = {
  MAX_BUFFER_SIZE: 1000,        // 최대 버퍼 크기
  BUFFER_TTL_MS: 30000,          // 버퍼 TTL (30초)
  DEFAULT_QOS: 1,                // 기본 QoS 레벨
  RECONNECT_BASE_DELAY: 1000,    // 초기 재연결 지연 (1초)
  RECONNECT_MAX_DELAY: 60000,    // 최대 재연결 지연 (60초)
  RECONNECT_JITTER: 0.3,         // Jitter 비율 (30%)
  MAX_RECONNECT_ATTEMPTS: 10,    // 최대 재연결 시도
  SUBSCRIBE_RETRY_COUNT: 3,      // 구독 재시도 횟수
  SUBSCRIBE_RETRY_DELAY: 2000,   // 구독 재시도 지연
  RECONNECT_PERIOD: 5000,        // 자동 재연결 간격 (5초)
  HEALTH_CHECK_INTERVAL: 30000,  // 연결 상태 체크 간격 (30초)
} as const

// MQTT 연결 설정 (환경변수 우선, 기존 값 fallback)
const MQTT_CONNECTION = {
  // 환경변수가 없으면 기존 하드코딩 값 사용
  URL: process.env.NEXT_PUBLIC_MQTT_URL || 'ws://211.55.114.181:7012',
  USERNAME: process.env.NEXT_PUBLIC_MQTT_USERNAME || undefined,
  PASSWORD: process.env.NEXT_PUBLIC_MQTT_PASSWORD || undefined,
} as const

class MqttService {
  private client: MqttClient | null = null
  private messageHandlers: Map<string, MessageCallback> = new Map()
  private userId: string = ''
  private reconnectTimer: NodeJS.Timeout | null = null
  private isConnected = false
  private isConnecting = false
  private connectionAttempts = 0
  private healthCheckTimer: NodeJS.Timeout | null = null
  private lastPingTime: number = 0
  private connectionStartTime: number = 0
  private connectionChangeCallbacks: Set<(connected: boolean) => void> = new Set()
  
  // 버퍼링 시스템
  private messageBuffer: BufferedMessage[] = []
  private isInitialDataLoaded = false
  
  // 구독 상태 추적
  private subscribedTopics: Set<string> = new Set()
  private pendingSubscriptions: Map<string, number> = new Map()
  
  // 오프라인 큐
  private offlineQueue: Array<{ topic: string; message: string; qos: QoS }> = []

  async connect(userId: string): Promise<void> {
    // 이미 연결 중이거나 연결된 상태면 리턴
    if (this.isConnecting || this.isConnected) {
      return
    }

    this.isConnecting = true
    this.userId = userId
    const clientId = `nextjs_call_${userId}_${Date.now()}`
    
    // Connect to MQTT broker using WebSocket
    const connectOptions: mqtt.IClientOptions = {
      clientId,
      keepalive: 30,
      clean: false, // 기존 동작 유지 (추후 true로 변경 권장)
      reconnectPeriod: MQTT_CONFIG.RECONNECT_PERIOD, // 자동 재연결 활성화
      connectTimeout: 30 * 1000,
      protocolVersion: 4,
      // 환경변수에 인증 정보가 있으면 사용
      ...(MQTT_CONNECTION.USERNAME && {
        username: MQTT_CONNECTION.USERNAME,
        password: MQTT_CONNECTION.PASSWORD,
      }),
    }

    console.log(`[MQTT] Connecting to ${MQTT_CONNECTION.URL.replace(/ws:\/\/[^:]+/, 'ws://***')}`)
    this.connectionStartTime = Date.now()
    
    this.client = mqtt.connect(MQTT_CONNECTION.URL, connectOptions)

    this.client.on('connect', () => {
      const connectionTime = Date.now() - this.connectionStartTime
      console.log(`[MQTT] Connected successfully as ${clientId} (took ${connectionTime}ms)`)
      
      this.isConnected = true
      this.isConnecting = false
      this.connectionAttempts = 0
      this.lastPingTime = Date.now()
      
      // Notify connection change callbacks
      this.notifyConnectionChange(true)
      
      // 기존 구독 복구
      this.restoreSubscriptions()
      
      // 초기 토픽 구독
      this.subscribeToTopics()
      
      // 오프라인 큐 처리
      setTimeout(() => this.processOfflineQueue(), 1000)
      
      // 연결 상태 모니터링 시작
      this.startHealthCheck()
      
      // ping 메시지 제거 - MQTT keepalive가 자동으로 처리
      // Flutter와의 충돌을 피하기 위해 별도 ping 비활성화
      if (this.reconnectTimer) {
        clearInterval(this.reconnectTimer)
        this.reconnectTimer = null
      }
    })

    this.client.on('message', (topic: string, payload: Buffer) => {
      const message = payload.toString('utf-8')
      this.lastPingTime = Date.now() // 활동 시간 업데이트
      
      // 초기 데이터가 로드되지 않았으면 버퍼에 저장
      if (!this.isInitialDataLoaded) {
        this.addToBuffer(topic, message)
        return
      }
      
      const handler = this.messageHandlers.get(topic)
      if (handler) {
        try {
          handler(message)
        } catch (error) {
          console.error(`[MQTT] Error in message handler for topic ${topic}:`, error)
          // 에러가 발생해도 다른 메시지 처리는 계속됨
        }
      }
    })

    this.client.on('error', (error) => {
      console.error('[MQTT] Connection error:', error)
      
      // 에러 타입별 상세 로깅 (기존 동작 영향 없음)
      if (error.message) {
        if (error.message.includes('ECONNREFUSED')) {
          console.error('[MQTT] 연결 거부됨 - 브로커 상태를 확인하세요')
        } else if (error.message.includes('ETIMEDOUT')) {
          console.error('[MQTT] 연결 시간 초과 - 네트워크를 확인하세요')
        } else if (error.message.includes('ENOTFOUND')) {
          console.error('[MQTT] 호스트를 찾을 수 없음 - URL을 확인하세요')
        }
      }
    })

    this.client.on('close', () => {
      console.log('[MQTT] Connection closed')
      this.isConnected = false
      this.isConnecting = false
      
      // 헬스체크 타이머 정리
      this.stopHealthCheck()
      
      if (this.reconnectTimer) {
        clearInterval(this.reconnectTimer)
        this.reconnectTimer = null
      }
    })

    this.client.on('reconnect', () => {
      this.connectionAttempts++
      console.log(`[MQTT] Reconnecting... (attempt ${this.connectionAttempts}/${MQTT_CONFIG.MAX_RECONNECT_ATTEMPTS})`)
      
      if (this.connectionAttempts >= MQTT_CONFIG.MAX_RECONNECT_ATTEMPTS) {
        console.error('[MQTT] Max reconnection attempts reached')
        // 자동 재연결이 실패하면 수동으로 한 번 더 시도
        setTimeout(() => {
          console.log('[MQTT] Attempting manual reconnection after max attempts')
          this.connectionAttempts = 0 // 카운터 리셋
          if (this.client) {
            this.client.reconnect()
          }
        }, MQTT_CONFIG.RECONNECT_MAX_DELAY)
      }
    })

    // offline 이벤트 처리 추가 (네트워크 단절 감지)
    this.client.on('offline', () => {
      console.log('[MQTT] Client went offline, will attempt reconnection')
      this.isConnected = false
      // Notify connection change callbacks
      this.notifyConnectionChange(false)
    })
  }

  private subscribeToTopics(): void {
    if (!this.client) return

    // Subscribe to order-related topics
    const topics = [
      'web/addOrder',
      'web/addReserve',
      'web/modifyOrder', 
      'web/cancelOrder',
      'web/acceptOrder',
      'web/connectAgent',
      'web/selectAgent',
      'web/actionOrder',
      'ftnh:drv:gps',
      `ftnh/agent/${this.userId}`,
    ]

    topics.forEach(topic => {
      this.subscribeWithRetry(topic)
    })
  }

  // 재시도 로직이 포함된 구독 메서드
  private subscribeWithRetry(topic: string, retryCount = 0): void {
    if (!this.client || !this.isConnected) {
      // 연결되지 않은 상태면 나중에 재시도
      if (!this.isConnected) {
        console.log(`[MQTT] Deferring subscription to ${topic} until connected`)
      }
      return
    }

    this.client.subscribe(topic, { qos: MQTT_CONFIG.DEFAULT_QOS }, (err) => {
      if (err) {
        console.error(`[MQTT] Failed to subscribe to ${topic}:`, err)
        
        if (retryCount < MQTT_CONFIG.SUBSCRIBE_RETRY_COUNT) {
          const delay = MQTT_CONFIG.SUBSCRIBE_RETRY_DELAY * (retryCount + 1)
          console.log(`[MQTT] Retrying subscription to ${topic} in ${delay}ms (attempt ${retryCount + 1})`)
          
          this.pendingSubscriptions.set(topic, retryCount + 1)
          setTimeout(() => {
            this.subscribeWithRetry(topic, retryCount + 1)
          }, delay)
        } else {
          console.error(`[MQTT] Failed to subscribe to ${topic} after ${MQTT_CONFIG.SUBSCRIBE_RETRY_COUNT} attempts`)
          this.pendingSubscriptions.delete(topic)
        }
      } else {
        // Successfully subscribed
        console.log(`[MQTT] Successfully subscribed to ${topic}`)
        this.subscribedTopics.add(topic)
        this.pendingSubscriptions.delete(topic)
      }
    })
  }

  subscribeMessage(topic: string, callback: MessageCallback): void {
    this.messageHandlers.set(topic, callback)
    if (this.client && this.isConnected) {
      this.subscribeWithRetry(topic)
    }
    // 나중에 연결되면 구독할 수 있도록 추적
    this.subscribedTopics.add(topic)
  }

  unsubscribeMessage(topic: string): void {
    this.messageHandlers.delete(topic)
    this.subscribedTopics.delete(topic)
    this.pendingSubscriptions.delete(topic)
    
    if (this.client && this.isConnected) {
      this.client.unsubscribe(topic, (err) => {
        if (err) {
          console.error(`[MQTT] Failed to unsubscribe from ${topic}:`, err)
        }
      })
    }
  }

  // 구독 상태 복구
  private restoreSubscriptions(): void {
    if (this.subscribedTopics.size === 0) return
    
    console.log(`[MQTT] Restoring ${this.subscribedTopics.size} subscriptions`)
    
    // Restore subscriptions
    this.subscribedTopics.forEach(topic => {
      // messageHandlers에 있는 토픽만 재구독
      if (this.messageHandlers.has(topic)) {
        this.subscribeWithRetry(topic)
      }
    })
  }

  publishMessage(topic: string, message: string, qos: QoS = MQTT_CONFIG.DEFAULT_QOS as QoS): void {
    if (this.client && this.isConnected) {
      this.client.publish(topic, message, { qos }, (err) => {
        if (err) {
          console.error(`[MQTT] Failed to publish message:`, err)
          // 오프라인 큐에 추가
          this.addToOfflineQueue(topic, message, qos)
        }
      })
    } else {
      // 연결되지 않은 상태면 오프라인 큐에 저장
      this.addToOfflineQueue(topic, message, qos)
    }
  }

  // 오프라인 큐에 메시지 추가
  private addToOfflineQueue(topic: string, message: string, qos: QoS): void {
    if (this.offlineQueue.length >= MQTT_CONFIG.MAX_BUFFER_SIZE) {
      console.warn('[MQTT] Offline queue full, dropping oldest message')
      this.offlineQueue.shift()
    }
    
    this.offlineQueue.push({ topic, message, qos })
    // Message queued for offline delivery
  }

  // 오프라인 큐 처리
  private processOfflineQueue(): void {
    if (this.offlineQueue.length === 0) return
    
    // Process offline queue
    const queue = [...this.offlineQueue]
    this.offlineQueue = []
    
    queue.forEach(({ topic, message, qos }) => {
      this.publishMessage(topic, message, qos)
    })
  }

  // 초기 데이터 로드 완료 시 호출
  onInitialDataLoaded(): void {
    this.isInitialDataLoaded = true
    
    // 버퍼에 저장된 메시지 처리
    const bufferedMessages = [...this.messageBuffer]
    this.messageBuffer = []
    
    // 타임스탬프 순으로 정렬하여 처리
    bufferedMessages
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach(({ topic, message }) => {
        const handler = this.messageHandlers.get(topic)
        if (handler) {
          handler(message)
        }
      })
  }
  
  // 버퍼에 메시지 추가 (크기 및 TTL 제한 포함)
  private addToBuffer(topic: string, message: string): void {
    const now = Date.now()
    
    // 오래된 메시지 제거
    this.messageBuffer = this.messageBuffer.filter(
      msg => now - msg.timestamp < MQTT_CONFIG.BUFFER_TTL_MS
    )
    
    // 버퍼 크기 제한 검사
    if (this.messageBuffer.length >= MQTT_CONFIG.MAX_BUFFER_SIZE) {
      console.warn(`[MQTT] 버퍼 크기 초과, 가장 오래된 메시지 제거`)
      this.messageBuffer.shift() // 가장 오래된 메시지 제거
    }
    
    // Add message to buffer
    this.messageBuffer.push({
      topic,
      message,
      timestamp: now
    })
  }


  // 연결 상태 모니터링 메서드 추가
  private startHealthCheck(): void {
    this.stopHealthCheck() // 기존 타이머 정리
    
    this.healthCheckTimer = setInterval(() => {
      if (this.isConnected && this.client) {
        const now = Date.now()
        const timeSinceLastPing = now - this.lastPingTime
        
        // 연결 상태 로깅 (디버깅용)
        if (timeSinceLastPing > MQTT_CONFIG.HEALTH_CHECK_INTERVAL * 2) {
          console.warn(`[MQTT] No activity for ${Math.round(timeSinceLastPing / 1000)}s`)
        }
        
        // 구독 상태 확인
        if (this.subscribedTopics.size > 0 && this.messageHandlers.size === 0) {
          console.warn('[MQTT] Subscriptions exist but no handlers registered')
        }
      }
    }, MQTT_CONFIG.HEALTH_CHECK_INTERVAL)
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
  }

  disconnect(): void {
    console.log('[MQTT] Disconnecting...')
    
    // 헬스체크 정지
    this.stopHealthCheck()
    
    // 연결 상태 초기화
    this.isConnected = false
    this.isConnecting = false
    this.connectionAttempts = 0
    
    // Notify connection change callbacks
    this.notifyConnectionChange(false)
    
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    if (this.client) {
      try {
        // 모든 이벤트 리스너 제거
        this.client.removeAllListeners()
        // 강제 종료
        this.client.end(true)
      } catch (error) {
        console.error('[MQTT] Error during disconnect:', error)
      } finally {
        this.client = null
      }
    }
    
    this.messageHandlers.clear()
    this.messageBuffer = []
    this.isInitialDataLoaded = false
    this.userId = ''
    
    console.log('[MQTT] Disconnected successfully')
  }

  // Helper method for parsing GPS messages
  // 형식: 기사로그인아이디|drvno|lat|lng|companyid|city|기사상태
  static parseGpsMessage(message: string): { drvNo: string; lat: number; lng: number } | null {
    try {
      const arr = message.split('|')
      if (arr.length < 7) return null
      
      const drvNo = arr[1]
      const lat = parseFloat(arr[2])
      const lng = parseFloat(arr[3])
      
      // 유효성 검사
      if (!drvNo || isNaN(lat) || isNaN(lng)) {
        return null
      }
      
      return { drvNo, lat, lng }
    } catch (error) {
      return null
    }
  }

  // Helper methods for parsing order messages
  static parseAddOrderMessage(message: string): Partial<Order> {
    const arr = message.split('|')
    return {
      id: parseInt(arr[0]),
      telephone: arr[1],
      customerName: arr[2],
      calldong: arr[3],
      callplace: arr[4],
      poiName: arr[5]?.split('|')[0], // Extract POI name only
      lat: parseFloat(arr[6]) || undefined,
      lng: parseFloat(arr[7]) || undefined,
      addAgent: normalizeAgent(arr[8]),
      status: arr[9],
      addAt: new Date(parseInt(arr[10])),
      extra: arr[11],
      token: arr[12],
    }
  }

  static parseReserveOrderMessage(message: string): Partial<Order> {
    const arr = message.split('|')
    return {
      id: parseInt(arr[0]),
      telephone: arr[1],
      customerName: arr[2],
      calldong: arr[3],
      callplace: arr[4],
      poiName: arr[5],
      addAgent: normalizeAgent(arr[6]),
      status: arr[7],
      addAt: new Date(parseInt(arr[8])),
      extra: arr[9],
      reserveAt: new Date(parseInt(arr[10])),
      notiTime: parseInt(arr[11]) || 0,
    }
  }

  static parseModifyOrderMessage(message: string): Partial<Order> {
    const arr = message.split('|')
    return {
      id: parseInt(arr[0]),
      telephone: arr[1],
      customerName: arr[2],
      calldong: arr[3],
      callplace: arr[4],
      poiName: arr[5]?.split('|')[0], // Extract POI name only
      lat: parseFloat(arr[6]) || undefined,
      lng: parseFloat(arr[7]) || undefined,
      modifyAgent: normalizeAgent(arr[8]),
      status: arr[9],
      modifyAt: new Date(parseInt(arr[10])),
      extra: arr[11],
      token: arr[12],
    }
  }

  static parseCancelOrderMessage(message: string): Partial<Order> {
    const arr = message.split('|')
    
    return {
      id: parseInt(arr[0]),
      cancelAgent: normalizeAgent(arr[1]),
      status: arr[2], // Keep original status like "취소9(0)"
      cancelStatus: arr[2], // Also set as cancelStatus for consistency
      cancelAt: new Date(parseInt(arr[3])),
      cancelReason: arr[4] || undefined,
    }
  }

  static parseAcceptOrderMessage(message: string): Partial<Order> {
    const arr = message.split('|')
    return {
      id: parseInt(arr[0]),
      drvNo: arr[1],
      licensePlate: arr[2],
      acceptAgent: normalizeAgent(arr[3]),
      status: arr[4],
      acceptAt: new Date(parseInt(arr[5])),
    }
  }

  static parseActionOrderMessage(message: string): { orderId: number; action: OrderAction } {
    try {
      const arr = message.split('|')
      if (arr.length < 2) {
        console.error('[MQTT] Invalid action message format:', message)
        throw new Error('Invalid message format')
      }
      
      const orderId = parseInt(arr[0])
      const actionData = arr[1].split('_')
      
      if (actionData.length < 2) {
        console.error('[MQTT] Invalid action data format:', arr[1])
        throw new Error('Invalid action data format')
      }
      
      const action: OrderAction = {
        name: actionData[0],
        at: new Date(parseFloat(actionData[1]) * 1000)
      }
      
      return { orderId, action }
    } catch (error) {
      console.error('[MQTT] Failed to parse action message:', error, message)
      throw error
    }
  }

  // Connection change callback methods
  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionChangeCallbacks.add(callback)
    // Immediately call with current state
    callback(this.isConnected)
    
    // Return unsubscribe function
    return () => {
      this.connectionChangeCallbacks.delete(callback)
    }
  }

  private notifyConnectionChange(connected: boolean): void {
    this.connectionChangeCallbacks.forEach(callback => {
      try {
        callback(connected)
      } catch (error) {
        console.error('[MQTT] Error in connection change callback:', error)
      }
    })
  }

  // Public methods for mqtt-store compatibility
  subscribe(topic: string, callback: MessageCallback): void {
    this.subscribeMessage(topic, callback)
  }

  unsubscribe(topic: string): void {
    this.unsubscribeMessage(topic)
  }

  publish(topic: string, message: string): void {
    this.publishMessage(topic, message)
  }
}

// Create singleton instance
const mqttServiceInstance = new MqttService()

// Export both instance and class for static methods
export { mqttServiceInstance as mqttService, MqttService }
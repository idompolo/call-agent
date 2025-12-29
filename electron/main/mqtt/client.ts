import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { BrowserWindow } from 'electron';
import { MessageBatcher } from './batcher';
import { OrderParser } from './parsers';

export interface MQTTConfig {
  brokerUrl: string;
  options?: IClientOptions;
  agentId?: string;
}

// 기본 MQTT 연결 설정 (Next.js mqtt-service.ts와 동일)
const DEFAULT_MQTT_CONFIG = {
  // Electron main process에서는 TCP 직접 연결 (WebSocket 대신)
  // ws://211.55.114.181:7012 → mqtt://211.55.114.181:1883
  BROKER_URL: process.env.MQTT_URL || 'mqtt://211.55.114.181:1883',
  // WebSocket URL (필요시)
  WS_URL: process.env.MQTT_WS_URL || 'ws://211.55.114.181:7012',
} as const;

export interface MQTTManagerEvents {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

/**
 * MQTT Topics (Next.js mqtt-service.ts와 동일하게 구성)
 */
export const MQTT_TOPICS = {
  // Order Topics (Next.js 호환)
  ORDER_ADD: 'web/addOrder',
  ORDER_ADD_RESERVE: 'web/addReserve',
  ORDER_MODIFY: 'web/modifyOrder',
  ORDER_CANCEL: 'web/cancelOrder',
  ORDER_ACCEPT: 'web/acceptOrder',
  ORDER_ACTION: 'web/actionOrder',
  SELECT_AGENT: 'web/selectAgent',
  CONNECT_AGENT: 'web/connectAgent',

  // Driver GPS
  DRIVER_GPS: 'ftnh:drv:gps',

  // Chat Topics
  CHAT_SERVICE: 'web/agent_chat_service',
  CHAT_MESSAGE: 'web/chat/message',
  CHAT_MESSAGE_PATTERN: 'web/chat/message/#',

  // SMS Topics
  SMS_SEND: 'sms.send',
  SMS_RECEIVE: 'sms.receive',
  SMS_STATUS: 'sms.status',

  // CallBox/PBX Topics
  CALLBOX_RAWDATA: 'call_rawdata',
  CALLBOX_DIAL: 'admindial_v2',
  CALLBOX_ANSWER: 'answer_v2',
  CALLBOX_HANGUP: 'hangup_v2',
  CALLBOX_HOLD: 'hold_v2',
  CALLBOX_TRANSFER: 'transfer_v2',

  // Agent Topics
  AGENT_STATUS: 'web/agent/status',
  AGENT_NOTIFICATION: 'web/agent/notification',

  // System Topics
  SYSTEM_ALERT: 'web/system/alert',
  SYSTEM_CONFIG: 'web/system/config',
} as const;

/**
 * IPC Channels for Renderer communication (Next.js 호환)
 */
export const IPC_CHANNELS = {
  // Order Events (Next.js 호환)
  ORDER_NEW: 'mqtt:order-new',           // web/addOrder, web/addReserve
  ORDER_UPDATED: 'mqtt:order-updated',   // web/modifyOrder
  ORDER_ACCEPTED: 'mqtt:order-accepted', // web/acceptOrder
  ORDER_CANCELLED: 'mqtt:order-cancelled', // web/cancelOrder
  ORDER_ACTION: 'mqtt:order-action',     // web/actionOrder
  SELECT_AGENT: 'mqtt:select-agent',     // web/selectAgent
  CONNECT_AGENT: 'mqtt:connect-agent',   // web/connectAgent

  // Driver Events
  DRIVER_LOCATIONS: 'mqtt:driver-locations',

  // Chat Events
  CHAT_MESSAGE: 'mqtt:chat-message',
  CHAT_SERVICE: 'mqtt:chat-service',

  // SMS Events
  SMS_RECEIVED: 'mqtt:sms-received',
  SMS_STATUS: 'mqtt:sms-status',

  // CallBox Events
  CALLBOX_EVENT: 'mqtt:callbox-event',
  CALLBOX_INCOMING: 'mqtt:callbox-incoming',

  // Connection Status
  CONNECTION_STATUS: 'mqtt:connection-status',

  // System Events
  SYSTEM_ALERT: 'mqtt:system-alert',
} as const;

/**
 * MQTTManager - Main Process에서 EMQX 브로커와 통신
 *
 * Flutter 프로젝트의 MQTT 토픽 구조 완전 지원:
 * 1. Order lifecycle (add, accept, cancel, complete)
 * 2. Driver GPS tracking with batching
 * 3. Chat service integration
 * 4. SMS send/receive
 * 5. CallBox/PBX integration
 */
export class MQTTManager {
  private client: MqttClient | null = null;
  private batcher: MessageBatcher;
  private mainWindow: BrowserWindow | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isConnecting = false;
  private agentId: string = '';

  constructor(private batchIntervalMs: number = 200) {
    this.batcher = new MessageBatcher(batchIntervalMs);
  }

  /**
   * Main Window 설정 (IPC 통신용)
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
    this.batcher.setMainWindow(window);
  }

  /**
   * MQTT 브로커에 연결 (userId만으로 간편 연결)
   * @param configOrUserId - MQTTConfig 객체 또는 userId 문자열
   * @param events - 선택적 이벤트 핸들러
   */
  connect(configOrUserId: MQTTConfig | string, events?: MQTTManagerEvents): void {
    // userId로 호출된 경우, 기존 연결이 있으면 해제 후 재연결
    if (typeof configOrUserId === 'string') {
      if (this.client?.connected || this.isConnecting) {
        console.log('[MQTT] Disconnecting existing connection before reconnecting with userId:', configOrUserId);
        this.disconnect();
      }
    } else if (this.isConnecting || this.client?.connected) {
      console.log('[MQTT] Already connected or connecting');
      return;
    }

    // 재연결 시 batcher에 mainWindow 참조 복원
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      console.log('[MQTT] Restoring mainWindow reference to batcher');
      this.batcher.setMainWindow(this.mainWindow);
    }

    // userId 문자열로 호출된 경우 기본 설정 사용
    const config: MQTTConfig =
      typeof configOrUserId === 'string'
        ? {
          brokerUrl: DEFAULT_MQTT_CONFIG.BROKER_URL,
          agentId: configOrUserId,
        }
        : configOrUserId;

    this.isConnecting = true;
    this.agentId = config.agentId || `agent_${Date.now()}`;
    this.sendConnectionStatus('connecting');

    const defaultOptions: IClientOptions = {
      // TCP 연결을 위한 기본 설정 (WebSocket이 아님)
      keepalive: 30,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
      clean: false, // Next.js와 동일하게 세션 유지
      clientId: `electron_call_${this.agentId}_${Date.now()}`,
      protocolVersion: 4,
    };

    const options = { ...defaultOptions, ...config.options };

    console.log(`[MQTT] Connecting to ${config.brokerUrl} with agentId: ${this.agentId}`);

    this.client = mqtt.connect(config.brokerUrl, options);

    this.client.on('connect', () => {
      console.log('[MQTT] Connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.sendConnectionStatus('connected');
      this.subscribeToTopics();
      events?.onConnect?.();
    });

    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload);
    });

    this.client.on('error', (error) => {
      console.error('[MQTT] Error:', error.message);
      this.sendConnectionStatus('error', error.message);
      events?.onError?.(error);
    });

    this.client.on('close', () => {
      console.log('[MQTT] Connection closed');
      this.isConnecting = false;
      this.sendConnectionStatus('disconnected');
      events?.onDisconnect?.();
    });

    this.client.on('reconnect', () => {
      this.reconnectAttempts++;
      console.log(`[MQTT] Reconnecting... (attempt ${this.reconnectAttempts})`);
      this.sendConnectionStatus('connecting');

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[MQTT] Max reconnect attempts reached');
        this.client?.end();
      }
    });
  }

  /**
   * 토픽 구독 (Next.js mqtt-service.ts와 동일한 토픽)
   */
  private subscribeToTopics(): void {
    if (!this.client) return;

    const topics = [
      // Order Topics (Next.js 호환)
      MQTT_TOPICS.ORDER_ADD,
      MQTT_TOPICS.ORDER_ADD_RESERVE,
      MQTT_TOPICS.ORDER_MODIFY,
      MQTT_TOPICS.ORDER_CANCEL,
      MQTT_TOPICS.ORDER_ACCEPT,
      MQTT_TOPICS.ORDER_ACTION,
      MQTT_TOPICS.SELECT_AGENT,
      MQTT_TOPICS.CONNECT_AGENT,

      // Driver GPS
      MQTT_TOPICS.DRIVER_GPS,

      // Agent-specific topic (will be set after agentId is known)
      `ftnh/agent/${this.agentId}`,

      // Chat Topics
      MQTT_TOPICS.CHAT_SERVICE,
      MQTT_TOPICS.CHAT_MESSAGE_PATTERN,

      // SMS Topics
      MQTT_TOPICS.SMS_RECEIVE,
      MQTT_TOPICS.SMS_STATUS,

      // CallBox Topics
      MQTT_TOPICS.CALLBOX_RAWDATA,

      // Agent Topics
      MQTT_TOPICS.AGENT_NOTIFICATION,

      // System Topics
      MQTT_TOPICS.SYSTEM_ALERT,
    ];

    topics.forEach((topic) => {
      this.client?.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          console.error(`[MQTT] Subscribe error for ${topic}:`, err);
        } else {
          console.log(`[MQTT] Subscribed to ${topic}`);
        }
      });
    });
  }

  /**
   * 메시지 핸들러 (Flutter 메시지 포맷 지원)
   */
  private handleMessage(topic: string, payload: Buffer): void {
    const rawData = payload.toString();
    // console.log(`[MQTT] Message received on topic: ${topic}`, rawData.substring(0, 200));

    try {
      // Order Topics - Pipe-delimited format
      if (topic === MQTT_TOPICS.ORDER_ADD) {
        const orderData = OrderParser.fromAdd(rawData);
        this.sendToRenderer(IPC_CHANNELS.ORDER_NEW, {
          type: 'add',
          orderId: orderData.orderId,
          data: orderData,
          rawData,
        });
        return;
      }

      if (topic === MQTT_TOPICS.ORDER_ACCEPT) {
        const orderData = OrderParser.fromAccept(rawData);
        this.sendToRenderer(IPC_CHANNELS.ORDER_ACCEPTED, {
          type: 'accept',
          orderId: orderData.orderId,
          data: orderData,
          rawData,
        });
        return;
      }

      if (topic === MQTT_TOPICS.ORDER_CANCEL) {
        const orderData = OrderParser.fromCancel(rawData);
        this.sendToRenderer(IPC_CHANNELS.ORDER_CANCELLED, {
          type: 'cancel',
          orderId: orderData.orderId,
          data: orderData,
          rawData,
        });
        return;
      }

      // ORDER_MODIFY (web/modifyOrder)
      if (topic === MQTT_TOPICS.ORDER_MODIFY) {
        const orderData = this.parseOrderUpdate(rawData);
        this.sendToRenderer(IPC_CHANNELS.ORDER_UPDATED, {
          type: 'modify',
          orderId: orderData.orderId,
          data: orderData,
          rawData,
        });
        return;
      }

      // ORDER_ACTION (web/actionOrder)
      if (topic === MQTT_TOPICS.ORDER_ACTION) {
        const orderData = this.parseOrderUpdate(rawData);
        this.sendToRenderer(IPC_CHANNELS.ORDER_ACTION, {
          type: 'action',
          orderId: orderData.orderId,
          data: orderData,
          rawData,
        });
        return;
      }

      // SELECT_AGENT (web/selectAgent)
      if (topic === MQTT_TOPICS.SELECT_AGENT) {
        const agentData = this.parseOrderUpdate(rawData);
        this.sendToRenderer(IPC_CHANNELS.SELECT_AGENT, {
          type: 'select-agent',
          data: agentData,
          rawData,
        });
        return;
      }

      // CONNECT_AGENT (web/connectAgent)
      if (topic === MQTT_TOPICS.CONNECT_AGENT) {
        const agentData = this.parseOrderUpdate(rawData);
        this.sendToRenderer(IPC_CHANNELS.CONNECT_AGENT, {
          type: 'connect-agent',
          data: agentData,
          rawData,
        });
        return;
      }

      // ORDER_ADD_RESERVE (web/addReserve)
      if (topic === MQTT_TOPICS.ORDER_ADD_RESERVE) {
        const orderData = OrderParser.fromAdd(rawData);
        this.sendToRenderer(IPC_CHANNELS.ORDER_NEW, {
          type: 'add-reserve',
          orderId: orderData.orderId,
          data: orderData,
          rawData,
        });
        return;
      }

      // Driver GPS - Batched for performance
      if (topic.startsWith('ftnh:drv:gps')) {
        // console.log('[MQTT] GPS raw data received:', rawData.substring(0, 100));
        const gpsData = OrderParser.parseGPS(rawData);
        if (gpsData) {
          this.batcher.add(IPC_CHANNELS.DRIVER_LOCATIONS, gpsData);
        }
        return;
      }

      // Chat Topics
      if (topic === MQTT_TOPICS.CHAT_SERVICE) {
        const chatData = this.parseChatMessage(rawData);
        this.sendToRenderer(IPC_CHANNELS.CHAT_SERVICE, chatData);
        return;
      }

      if (topic.startsWith('web/chat/message')) {
        const chatData = this.parseChatMessage(rawData);
        this.sendToRenderer(IPC_CHANNELS.CHAT_MESSAGE, chatData);
        return;
      }

      // SMS Topics
      if (topic === MQTT_TOPICS.SMS_RECEIVE) {
        const smsData = this.parseSMSMessage(rawData);
        this.sendToRenderer(IPC_CHANNELS.SMS_RECEIVED, smsData);
        return;
      }

      if (topic === MQTT_TOPICS.SMS_STATUS) {
        const smsStatus = this.parseSMSStatus(rawData);
        this.sendToRenderer(IPC_CHANNELS.SMS_STATUS, smsStatus);
        return;
      }

      // CallBox Topics
      if (topic === MQTT_TOPICS.CALLBOX_RAWDATA) {
        const callboxEvent = this.parseCallBoxEvent(rawData);
        this.sendToRenderer(IPC_CHANNELS.CALLBOX_EVENT, callboxEvent);

        // 착신 콜은 별도로 알림
        if (callboxEvent.type === 'incoming') {
          this.sendToRenderer(IPC_CHANNELS.CALLBOX_INCOMING, callboxEvent);
        }
        return;
      }

      // System Alert
      if (topic === MQTT_TOPICS.SYSTEM_ALERT) {
        try {
          const alertData = JSON.parse(rawData);
          this.sendToRenderer(IPC_CHANNELS.SYSTEM_ALERT, alertData);
        } catch {
          this.sendToRenderer(IPC_CHANNELS.SYSTEM_ALERT, { message: rawData });
        }
        return;
      }

      // 기타 토픽은 JSON 파싱 시도
      try {
        const data = JSON.parse(rawData);
        console.log(`[MQTT] Unhandled topic ${topic}:`, data);
      } catch {
        console.log(`[MQTT] Unhandled topic ${topic}:`, rawData);
      }
    } catch (error) {
      console.error('[MQTT] Message handling error:', error, { topic, rawData });
    }
  }

  /**
   * Order Update 파싱 (JSON 또는 pipe-delimited)
   */
  private parseOrderUpdate(rawData: string): { orderId: string;[key: string]: unknown } {
    try {
      // JSON 형식 시도
      return JSON.parse(rawData);
    } catch {
      // Pipe-delimited 형식
      const parts = rawData.split('|');
      return {
        orderId: parts[0] || '',
        rawData,
      };
    }
  }

  /**
   * Chat 메시지 파싱
   */
  private parseChatMessage(rawData: string): {
    chatId: string;
    senderId: string;
    senderType: string;
    senderName: string;
    content: string;
    timestamp: Date;
  } {
    try {
      // JSON 형식 시도
      const data = JSON.parse(rawData);
      return {
        chatId: data.chatId || data.roomId || '',
        senderId: data.senderId || data.userId || '',
        senderType: data.senderType || data.userType || 'agent',
        senderName: data.senderName || data.userName || '',
        content: data.content || data.message || '',
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      };
    } catch {
      // Pipe-delimited: chatId|senderId|senderType|senderName|content
      const parts = rawData.split('|');
      return {
        chatId: parts[0] || '',
        senderId: parts[1] || '',
        senderType: parts[2] || 'agent',
        senderName: parts[3] || '',
        content: parts[4] || rawData,
        timestamp: new Date(),
      };
    }
  }

  /**
   * SMS 메시지 파싱
   */
  private parseSMSMessage(rawData: string): {
    smsId: string;
    phone: string;
    content: string;
    timestamp: Date;
  } {
    try {
      const data = JSON.parse(rawData);
      return {
        smsId: data.smsId || data.id || `sms_${Date.now()}`,
        phone: data.phone || data.from || '',
        content: data.content || data.message || '',
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      };
    } catch {
      // Pipe-delimited: phone|content
      const parts = rawData.split('|');
      return {
        smsId: `sms_${Date.now()}`,
        phone: parts[0] || '',
        content: parts[1] || rawData,
        timestamp: new Date(),
      };
    }
  }

  /**
   * SMS 상태 파싱
   */
  private parseSMSStatus(rawData: string): {
    smsId: string;
    status: 'sent' | 'failed';
    error?: string;
  } {
    try {
      const data = JSON.parse(rawData);
      return {
        smsId: data.smsId || data.id || '',
        status: data.status || 'sent',
        error: data.error,
      };
    } catch {
      const parts = rawData.split('|');
      return {
        smsId: parts[0] || '',
        status: (parts[1] as 'sent' | 'failed') || 'sent',
        error: parts[2],
      };
    }
  }

  /**
   * CallBox 이벤트 파싱 (Flutter call_rawdata 형식)
   */
  private parseCallBoxEvent(rawData: string): {
    type: 'incoming' | 'outgoing' | 'answer' | 'hangup' | 'hold';
    callId: string;
    phoneNumber: string;
    agentId?: string;
    timestamp: Date;
    rawData: string;
  } {
    try {
      const data = JSON.parse(rawData);
      return {
        type: data.type || data.event || 'incoming',
        callId: data.callId || data.id || `call_${Date.now()}`,
        phoneNumber: data.phoneNumber || data.phone || data.caller || '',
        agentId: data.agentId || data.agent,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        rawData,
      };
    } catch {
      // Pipe-delimited: type|callId|phoneNumber|agentId
      const parts = rawData.split('|');

      // 기본적으로 incoming으로 처리
      let type: 'incoming' | 'outgoing' | 'answer' | 'hangup' | 'hold' = 'incoming';
      if (parts[0]) {
        const eventType = parts[0].toLowerCase();
        if (['incoming', 'outgoing', 'answer', 'hangup', 'hold'].includes(eventType)) {
          type = eventType as typeof type;
        }
      }

      return {
        type,
        callId: parts[1] || `call_${Date.now()}`,
        phoneNumber: parts[2] || parts[0] || '', // 첫 번째가 전화번호일 수도 있음
        agentId: parts[3],
        timestamp: new Date(),
        rawData,
      };
    }
  }

  /**
   * Renderer로 메시지 전송
   */
  private sendToRenderer(channel: string, data: unknown): void {
    console.log(`[MQTT] Sending to renderer: ${channel}`, JSON.stringify(data).substring(0, 200));
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
      console.log(`[MQTT] Successfully sent to channel: ${channel}`);
    } else {
      console.warn(`[MQTT] Cannot send to renderer - mainWindow is ${this.mainWindow ? 'destroyed' : 'null'}`);
    }
  }

  /**
   * 연결 상태 전송
   */
  private sendConnectionStatus(
    status: 'connected' | 'disconnected' | 'connecting' | 'error',
    error?: string
  ): void {
    this.sendToRenderer(IPC_CHANNELS.CONNECTION_STATUS, {
      mqtt: status,
      lastConnected: status === 'connected' ? new Date() : undefined,
      error,
    });
  }

  // ================================
  // Publish Methods (Flutter 토픽에 발행)
  // ================================

  /**
   * 메시지 발행 (기본)
   */
  publish(topic: string, message: string | object): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client?.connected) {
        reject(new Error('MQTT not connected'));
        return;
      }

      const payload = typeof message === 'string' ? message : JSON.stringify(message);

      this.client.publish(topic, payload, { qos: 1 }, (err: Error | undefined) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * SMS 발송
   */
  async sendSMS(phone: string, content: string, orderId?: string): Promise<void> {
    const message = `${phone}|${content}|${orderId || ''}|${this.agentId}`;
    await this.publish(MQTT_TOPICS.SMS_SEND, message);
  }

  /**
   * Chat 메시지 발송
   */
  async sendChatMessage(
    chatId: string,
    content: string,
    senderName: string
  ): Promise<void> {
    const message = {
      chatId,
      senderId: this.agentId,
      senderType: 'agent',
      senderName,
      content,
      timestamp: new Date().toISOString(),
    };
    await this.publish(MQTT_TOPICS.CHAT_MESSAGE, message);
  }

  /**
   * CallBox 다이얼
   */
  async dialCallBox(phoneNumber: string): Promise<void> {
    const message = `${phoneNumber}|${this.agentId}`;
    await this.publish(MQTT_TOPICS.CALLBOX_DIAL, message);
  }

  /**
   * CallBox 응답
   */
  async answerCallBox(callId: string): Promise<void> {
    const message = `${callId}|${this.agentId}`;
    await this.publish(MQTT_TOPICS.CALLBOX_ANSWER, message);
  }

  /**
   * CallBox 종료
   */
  async hangupCallBox(callId: string): Promise<void> {
    const message = `${callId}|${this.agentId}`;
    await this.publish(MQTT_TOPICS.CALLBOX_HANGUP, message);
  }

  /**
   * CallBox 보류
   */
  async holdCallBox(callId: string): Promise<void> {
    const message = `${callId}|${this.agentId}`;
    await this.publish(MQTT_TOPICS.CALLBOX_HOLD, message);
  }

  /**
   * Agent 상태 업데이트
   */
  async updateAgentStatus(status: 'online' | 'away' | 'busy' | 'offline'): Promise<void> {
    const message = {
      agentId: this.agentId,
      status,
      timestamp: new Date().toISOString(),
    };
    await this.publish(MQTT_TOPICS.AGENT_STATUS, message);
  }

  // ================================
  // Connection Management
  // ================================

  /**
   * 연결 해제
   * batcher는 mainWindow 참조를 유지하여 재연결 시 사용 가능하도록 함
   */
  disconnect(): void {
    this.batcher.flushAll();
    // dispose() 호출 제거 - batcher의 mainWindow 참조를 유지
    // 완전한 정리가 필요한 경우에만 dispose() 사용

    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }

  /**
   * 완전한 리소스 정리 (앱 종료 시 사용)
   */
  cleanup(): void {
    this.batcher.flushAll();
    this.batcher.dispose();

    if (this.client) {
      this.client.end();
      this.client = null;
    }
    this.mainWindow = null;
  }

  /**
   * 재연결
   */
  reconnect(): void {
    this.reconnectAttempts = 0;
    this.client?.reconnect();
  }

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  /**
   * Agent ID 설정
   */
  setAgentId(agentId: string): void {
    this.agentId = agentId;
  }
}

export default MQTTManager;

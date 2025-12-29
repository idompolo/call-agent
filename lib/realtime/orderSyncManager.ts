/**
 * 주문 동기화 매니저 - 초기 데이터와 실시간 업데이트 통합 관리
 */

import { MQTTConnectionManager, ConnectionState, MQTTMessage } from './connectionManager';
import type { OrderPayload } from '@/types/mqtt';
import { isElectron, getElectronAPI } from '@/lib/electron';

// 주문 인터페이스
export interface Order {
  id: string;
  orderNo: string;
  status: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  dropoffAddress: string;
  driverName?: string;
  carNumber?: string;
  requestTime: Date;
  acceptTime?: Date;
  completeTime?: Date;
  amount: number;
  distance?: number;
  duration?: number;
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
  timestamp: number;
}

// 동기화 이벤트
export interface SyncEvent {
  type: 'INITIAL_LOAD' | 'REALTIME_UPDATE' | 'SYNC_COMPLETE' | 'ERROR';
  data?: unknown;
  error?: Error;
  timestamp: number;
}

// 동기화 옵션
export interface SyncOptions {
  apiUrl: string;
  mqttBrokerUrl: string;
  mqttUsername?: string;
  mqttPassword?: string;
  topics: string[];
  deduplicationWindow?: number; // 중복 제거 윈도우 (ms)
  maxRetries?: number;
}

export class OrderSyncManager {
  private mqttManager: MQTTConnectionManager;
  private orders: Map<string, Order> = new Map();
  private syncOptions: SyncOptions;
  private initialLoadTimestamp: number = 0;
  private isSyncing: boolean = false;
  
  // 버퍼링 시스템
  private messageBuffer: MQTTMessage[] = [];
  private isInitialDataLoaded: boolean = false;
  private isProcessingBuffer: boolean = false;
  
  // 콜백 함수들
  private onOrdersUpdate?: (orders: Order[]) => void;
  private onStateChange?: (state: ConnectionState) => void;
  private onError?: (error: Error) => void;
  
  // 동기화 통계
  private syncStats = {
    initialOrderCount: 0,
    realtimeUpdateCount: 0,
    duplicatesRemoved: 0,
    bufferedMessageCount: 0,
    processedBufferCount: 0,
    lastSyncTime: null as Date | null
  };
  
  constructor(options: SyncOptions) {
    this.syncOptions = {
      deduplicationWindow: 5000,
      maxRetries: 3,
      ...options
    };
    
    // MQTT 매니저 초기화
    this.mqttManager = new MQTTConnectionManager({
      brokerUrl: options.mqttBrokerUrl,
      username: options.mqttUsername,
      password: options.mqttPassword,
      topics: options.topics,
      syncWindowMs: options.deduplicationWindow
    });
    
    this.setupEventListeners();
  }
  
  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    // 상태 변경 이벤트
    this.mqttManager.on('stateChanged', ({ newState }) => {
      console.log(`[OrderSync] 상태 변경: ${newState}`);
      this.onStateChange?.(newState);
    });
    
    // 초기 데이터 요청 이벤트
    this.mqttManager.on('initialDataRequired', async () => {
      console.log('[OrderSync] 초기 데이터 로드 시작');
      await this.loadInitialData();
    });
    
    // 실시간 메시지 수신
    this.mqttManager.on('message', (message: MQTTMessage) => {
      // 초기 데이터가 로드되지 않았으면 버퍼에 저장
      if (!this.isInitialDataLoaded) {
        console.log(`[OrderSync] 초기 데이터 로드 전 - 메시지 버퍼링: ${message.topic}`);
        this.messageBuffer.push(message);
        this.syncStats.bufferedMessageCount++;
      } else if (!this.isProcessingBuffer) {
        // 버퍼 처리 중이 아닐 때만 실시간 처리
        this.handleRealtimeUpdate(message);
      }
    });
    
    // 동기화 완료
    this.mqttManager.on('syncCompleted', (stats) => {
      console.log('[OrderSync] 동기화 완료:', stats);
      this.isSyncing = false;
      this.notifyOrdersUpdate();
    });
    
    // 재연결 성공
    this.mqttManager.on('reconnected', () => {
      console.log('[OrderSync] 재연결 성공 - 데이터 재동기화');
      this.resyncData();
    });
    
    // 최대 재연결 시도 초과
    this.mqttManager.on('maxReconnectAttemptsReached', () => {
      this.onError?.(new Error('MQTT 재연결 실패 - 최대 시도 횟수 초과'));
    });
  }
  
  /**
   * 동기화 시작
   */
  public async startSync(): Promise<void> {
    console.log('[OrderSync] 동기화 프로세스 시작');
    this.isSyncing = true;
    
    try {
      // MQTT 연결 시작
      await this.mqttManager.connect();
    } catch (error) {
      console.error('[OrderSync] 연결 실패:', error);
      this.isSyncing = false;
      throw error;
    }
  }
  
  /**
   * 초기 데이터 로드
   */
  private async loadInitialData(): Promise<void> {
    const maxRetries = this.syncOptions.maxRetries || 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`[OrderSync] 초기 데이터 로드 시도 ${retryCount + 1}/${maxRetries}`);
        
        // API에서 초기 데이터 가져오기
        const response = await fetch(`${this.syncOptions.apiUrl}/orders`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken()}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`API 오류: ${response.status}`);
        }
        
        const data = await response.json();
        this.initialLoadTimestamp = Date.now();
        
        // 초기 데이터 처리
        this.processInitialData(data.orders || []);
        
        // 초기 데이터 로드 완료 플래그 설정
        this.isInitialDataLoaded = true;
        
        // MQTT 매니저에 동기화 시작 알림
        await this.mqttManager.startSync(
          Array.from(this.orders.values()),
          this.initialLoadTimestamp
        );
        
        // 버퍼에 저장된 메시지 처리
        await this.processBufferedMessages();
        
        this.syncStats.lastSyncTime = new Date();
        console.log('[OrderSync] 초기 데이터 로드 및 버퍼 처리 완료');
        
        return;
        
      } catch (error) {
        console.error(`[OrderSync] 초기 데이터 로드 실패 (시도 ${retryCount + 1}):`, error);
        retryCount++;
        
        if (retryCount >= maxRetries) {
          this.onError?.(new Error('초기 데이터 로드 실패'));
          throw error;
        }
        
        // 재시도 전 대기
        await this.delay(Math.pow(2, retryCount) * 1000);
      }
    }
  }
  
  /**
   * 초기 데이터 처리
   */
  private processInitialData(orders: unknown[]): void {
    console.log(`[OrderSync] 초기 주문 데이터 처리: ${orders.length}개`);
    
    this.orders.clear();
    this.syncStats.initialOrderCount = orders.length;
    
    orders.forEach(orderData => {
      const order = this.normalizeOrder(orderData);
      this.orders.set(order.id, order);
    });
    
    console.log(`[OrderSync] 초기 데이터 처리 완료: ${this.orders.size}개 주문`);
  }
  
  /**
   * 버퍼에 저장된 메시지 처리
   */
  private async processBufferedMessages(): Promise<void> {
    if (this.messageBuffer.length === 0) {
      console.log('[OrderSync] 처리할 버퍼 메시지 없음');
      return;
    }
    
    console.log(`[OrderSync] 버퍼 메시지 처리 시작: ${this.messageBuffer.length}개`);
    this.isProcessingBuffer = true;
    
    // 타임스탬프 기준으로 정렬
    const sortedMessages = [...this.messageBuffer].sort((a, b) => 
      (a.timestamp || 0) - (b.timestamp || 0)
    );
    
    // 각 메시지를 순차적으로 처리
    for (const message of sortedMessages) {
      try {
        // 초기 데이터 타임스탬프보다 오래된 메시지는 무시
        if (message.timestamp && message.timestamp < this.initialLoadTimestamp) {
          console.log(`[OrderSync] 오래된 메시지 무시: ${message.topic}`);
          continue;
        }
        
        this.handleRealtimeUpdate(message);
        this.syncStats.processedBufferCount++;
      } catch (error) {
        console.error(`[OrderSync] 버퍼 메시지 처리 오류:`, error);
      }
    }
    
    // 버퍼 초기화
    this.messageBuffer = [];
    this.isProcessingBuffer = false;
    
    console.log(`[OrderSync] 버퍼 메시지 처리 완료: ${this.syncStats.processedBufferCount}개 처리`);
    
    // 버퍼 처리 후 주문 목록 업데이트 알림
    this.notifyOrdersUpdate();
  }
  
  /**
   * 실시간 업데이트 처리
   */
  private handleRealtimeUpdate(message: MQTTMessage): void {
    try {
      const { topic, payload } = message;
      
      // 토픽별 처리
      if (topic.includes('order/new')) {
        this.handleNewOrder(payload);
      } else if (topic.includes('order/update')) {
        this.handleOrderUpdate(payload);
      } else if (topic.includes('order/delete')) {
        this.handleOrderDelete(payload);
      } else if (topic.includes('order/status')) {
        this.handleStatusUpdate(payload);
      }
      
      this.syncStats.realtimeUpdateCount++;
      this.notifyOrdersUpdate();
      
    } catch (error) {
      console.error('[OrderSync] 실시간 업데이트 처리 오류:', error);
      this.onError?.(error as Error);
    }
  }
  
  /**
   * 새 주문 처리
   */
  private handleNewOrder(orderData: unknown): void {
    const order = this.normalizeOrder(orderData);
    
    // 중복 확인
    if (!this.orders.has(order.id)) {
      this.orders.set(order.id, order);
      console.log(`[OrderSync] 새 주문 추가: ${order.id}`);
    } else {
      this.syncStats.duplicatesRemoved++;
      console.log(`[OrderSync] 중복 주문 무시: ${order.id}`);
    }
  }
  
  /**
   * 주문 업데이트 처리
   */
  private handleOrderUpdate(updateData: unknown): void {
    const typedData = updateData as OrderPayload
    const orderIdRaw = typedData.id || typedData.orderId;
    
    if (!orderIdRaw) {
      console.warn('Order update received without orderId:', updateData);
      return;
    }
    
    const orderId = String(orderIdRaw);
    
    if (this.orders.has(orderId)) {
      const existingOrder = this.orders.get(orderId)!;
      const normalizedUpdate = this.normalizeOrder(updateData);
      const updatedOrder: Order = {
        ...existingOrder,
        ...normalizedUpdate,
        id: orderId, // ensure id remains as string
        updatedAt: new Date(typedData.updatedAt || Date.now()),
        timestamp: Date.now()
      };
      
      this.orders.set(orderId, updatedOrder);
      console.log(`[OrderSync] 주문 업데이트: ${orderId}`);
    } else {
      // 없는 주문이면 새로 추가
      this.handleNewOrder(updateData);
    }
  }
  
  /**
   * 주문 삭제 처리
   */
  private handleOrderDelete(deleteData: unknown): void {
    const typedData = deleteData as OrderPayload
    const orderIdRaw = typedData.id || typedData.orderId;
    
    if (!orderIdRaw) {
      console.warn('Order delete received without orderId:', deleteData);
      return;
    }
    
    const orderId = String(orderIdRaw);
    
    if (this.orders.delete(orderId)) {
      console.log(`[OrderSync] 주문 삭제: ${orderId}`);
    }
  }
  
  /**
   * 상태 업데이트 처리
   */
  private handleStatusUpdate(statusData: unknown): void {
    const typedData = statusData as OrderPayload
    const orderIdRaw = typedData.id || typedData.orderId;
    
    if (!orderIdRaw) {
      console.warn('Status update received without orderId:', statusData);
      return;
    }
    
    const orderId = String(orderIdRaw);
    
    if (this.orders.has(orderId)) {
      const order = this.orders.get(orderId)!;
      order.status = typedData.status || 'pending';
      order.updatedAt = new Date();
      order.timestamp = Date.now();
      
      // 상태별 시간 업데이트
      if (typedData.status === 'accepted' && typedData.acceptTime) {
        order.acceptTime = new Date(typedData.acceptTime);
      } else if (typedData.status === 'completed' && typedData.completeTime) {
        order.completeTime = new Date(typedData.completeTime);
      }
      
      this.orders.set(orderId, order);
      console.log(`[OrderSync] 주문 상태 업데이트: ${orderId} → ${typedData.status}`);
    }
  }
  
  /**
   * 재동기화
   */
  private async resyncData(): Promise<void> {
    console.log('[OrderSync] 데이터 재동기화 시작');
    
    // 재동기화 시 초기화 플래그 리셋
    this.isInitialDataLoaded = false;
    this.messageBuffer = [];
    this.syncStats.bufferedMessageCount = 0;
    this.syncStats.processedBufferCount = 0;
    
    try {
      // 마지막 업데이트 이후의 변경사항만 가져오기
      const lastUpdate = Math.max(
        ...Array.from(this.orders.values()).map(o => o.timestamp)
      );
      
      const response = await fetch(
        `${this.syncOptions.apiUrl}/orders/changes?since=${lastUpdate}`,
        {
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`
          }
        }
      );
      
      if (response.ok) {
        const changes = await response.json();
        console.log(`[OrderSync] 재동기화: ${changes.length}개 변경사항`);
        
        changes.forEach((change: OrderPayload) => {
          if (change.type === 'delete') {
            const deleteId = change.orderId || change.id;
            if (deleteId) {
              this.orders.delete(String(deleteId));
            }
          } else {
            const order = this.normalizeOrder(change.order);
            this.orders.set(order.id, order);
          }
        });
        
        this.notifyOrdersUpdate();
      }
    } catch (error) {
      console.error('[OrderSync] 재동기화 실패:', error);
    }
  }
  
  /**
   * 주문 데이터 정규화
   */
  private normalizeOrder(data: unknown): Order {
    const orderData = data as OrderPayload;
    return {
      id: String(orderData.id || orderData._id || orderData.orderId || ''),
      orderNo: orderData.orderNo || orderData.order_no || '',
      status: orderData.status || 'pending',
      customerName: orderData.customerName || orderData.customer_name || '',
      customerPhone: orderData.customerPhone || orderData.customer_phone || '',
      pickupAddress: orderData.pickupAddress || orderData.pickup_address || '',
      dropoffAddress: orderData.dropoffAddress || orderData.dropoff_address || '',
      driverName: orderData.driverName || orderData.driver_name,
      carNumber: orderData.carNumber || orderData.car_number,
      requestTime: new Date(orderData.requestTime || orderData.request_time || orderData.createdAt || Date.now()),
      acceptTime: orderData.acceptTime ? new Date(orderData.acceptTime) : undefined,
      completeTime: orderData.completeTime ? new Date(orderData.completeTime) : undefined,
      amount: Number(orderData.amount || 0),
      distance: orderData.distance,
      duration: orderData.duration,
      memo: orderData.memo,
      createdAt: new Date(orderData.createdAt || Date.now()),
      updatedAt: new Date(orderData.updatedAt || Date.now()),
      timestamp: Number(orderData.timestamp || Date.now())
    };
  }
  
  /**
   * 주문 업데이트 알림
   */
  private notifyOrdersUpdate(): void {
    if (this.onOrdersUpdate && !this.isSyncing) {
      const ordersArray = Array.from(this.orders.values())
        .sort((a, b) => b.timestamp - a.timestamp);
      this.onOrdersUpdate(ordersArray);
    }
  }
  
  /**
   * 현재 주문 목록 가져오기
   */
  public getOrders(): Order[] {
    return Array.from(this.orders.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }
  
  /**
   * 특정 주문 가져오기
   */
  public getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }
  
  /**
   * 동기화 통계 가져오기
   */
  public getSyncStats(): any {
    return {
      ...this.syncStats,
      currentOrderCount: this.orders.size,
      mqttStats: this.mqttManager.getStats(),
      debugInfo: this.mqttManager.getDebugInfo()
    };
  }
  
  /**
   * 콜백 설정
   */
  public setCallbacks(callbacks: {
    onOrdersUpdate?: (orders: Order[]) => void;
    onStateChange?: (state: ConnectionState) => void;
    onError?: (error: Error) => void;
  }): void {
    this.onOrdersUpdate = callbacks.onOrdersUpdate;
    this.onStateChange = callbacks.onStateChange;
    this.onError = callbacks.onError;
  }
  
  /**
   * 메시지 발행
   */
  public publishMessage(topic: string, payload: any): void {
    // Electron 환경에서는 IPC를 통해 Main Process로 publish
    if (isElectron()) {
      const api = getElectronAPI();
      const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
      api?.publishMQTT?.(topic, message).catch((err: Error) => {
        console.error('[OrderSync] Failed to publish via IPC:', err);
      });
    } else {
      this.mqttManager.publish(topic, payload);
    }
  }
  
  /**
   * 연결 종료
   */
  public disconnect(): void {
    console.log('[OrderSync] 연결 종료');
    this.mqttManager.disconnect();
    this.orders.clear();
  }
  
  /**
   * 인증 토큰 가져오기
   */
  private getAuthToken(): string {
    // 실제 구현에서는 적절한 인증 토큰 관리 필요
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken') || '';
    }
    return '';
  }
  
  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default OrderSyncManager;
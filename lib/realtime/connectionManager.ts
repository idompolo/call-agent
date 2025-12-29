/**
 * MQTT 연결 관리자 - 실시간 데이터 동기화를 위한 핵심 시스템
 * 초기 데이터 로드와 실시간 업데이트 간의 완벽한 동기화 보장
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import EventEmitter from 'events';

// 연결 상태 열거형
export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',     // 연결 끊김
  CONNECTING = 'CONNECTING',         // 연결 중
  LOADING_INITIAL = 'LOADING_INITIAL', // 초기 데이터 로딩 중
  SYNCING = 'SYNCING',               // 데이터 동기화 중
  READY = 'READY',                   // 준비 완료
  ERROR = 'ERROR',                   // 오류 상태
  RECONNECTING = 'RECONNECTING'      // 재연결 중
}

// 메시지 인터페이스
export interface MQTTMessage {
  id: string;
  topic: string;
  payload: any;
  timestamp: number;
  sequenceNumber?: number;
}

// 동기화 설정
export interface SyncConfig {
  brokerUrl: string;
  username?: string;
  password?: string;
  clientId?: string;
  topics: string[];
  reconnectPeriod?: number;
  connectTimeout?: number;
  queueSize?: number;
  syncWindowMs?: number; // 동기화 윈도우 (밀리초)
}

// 동기화 통계
export interface SyncStats {
  messagesQueued: number;
  messagesProcessed: number;
  duplicatesFiltered: number;
  connectionAttempts: number;
  lastSyncTime: Date | null;
  syncDuration: number;
}

export class MQTTConnectionManager extends EventEmitter {
  private client: MqttClient | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private config: SyncConfig;
  
  // 메시지 버퍼 및 동기화 관리
  private messageQueue: MQTTMessage[] = [];
  private processedMessageIds: Set<string> = new Set();
  private lastSyncTimestamp: number = 0;
  private syncStartTime: number = 0;
  
  // 통계 및 디버깅
  private stats: SyncStats = {
    messagesQueued: 0,
    messagesProcessed: 0,
    duplicatesFiltered: 0,
    connectionAttempts: 0,
    lastSyncTime: null,
    syncDuration: 0
  };
  
  // 재연결 관리
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  
  constructor(config: SyncConfig) {
    super();
    this.config = {
      reconnectPeriod: 5000,
      connectTimeout: 30000,
      queueSize: 1000,
      syncWindowMs: 5000, // 5초 동기화 윈도우
      ...config
    };
  }
  
  /**
   * 연결 상태 가져오기
   */
  public getState(): ConnectionState {
    return this.state;
  }
  
  /**
   * 통계 정보 가져오기
   */
  public getStats(): SyncStats {
    return { ...this.stats };
  }
  
  /**
   * 연결 초기화 및 동기화 시작
   */
  public async connect(): Promise<void> {
    if (this.state !== ConnectionState.DISCONNECTED) {
      console.warn('이미 연결 중이거나 연결되어 있습니다.');
      return;
    }
    
    this.setState(ConnectionState.CONNECTING);
    this.syncStartTime = Date.now();
    this.stats.connectionAttempts++;
    
    try {
      await this.establishConnection();
      this.setState(ConnectionState.LOADING_INITIAL);
      
      // 초기 데이터 로드 신호 발생
      this.emit('initialDataRequired');
      
    } catch (error) {
      console.error('MQTT 연결 실패:', error);
      this.setState(ConnectionState.ERROR);
      this.scheduleReconnect();
      throw error;
    }
  }
  
  /**
   * MQTT 연결 수립
   */
  private async establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const options: IClientOptions = {
        username: this.config.username,
        password: this.config.password,
        clientId: this.config.clientId || `nextjs_${Date.now()}`,
        clean: false, // 세션 유지로 메시지 손실 방지
        reconnectPeriod: 0, // 수동 재연결 관리
        connectTimeout: this.config.connectTimeout,
        queueQoSZero: true, // QoS 0 메시지도 큐잉
        will: {
          topic: 'presence',
          payload: JSON.stringify({ 
            clientId: this.config.clientId, 
            status: 'offline' 
          }),
          qos: 1,
          retain: false
        }
      };
      
      this.client = mqtt.connect(this.config.brokerUrl, options);
      
      // 연결 성공
      this.client.on('connect', () => {
        console.log('MQTT 연결 성공');
        this.reconnectAttempts = 0;
        this.subscribeToTopics();
        resolve();
      });
      
      // 연결 오류
      this.client.on('error', (error) => {
        console.error('MQTT 오류:', error);
        reject(error);
      });
      
      // 메시지 수신
      this.client.on('message', this.handleMessage.bind(this));
      
      // 연결 끊김
      this.client.on('close', () => {
        console.log('MQTT 연결 종료');
        if (this.state === ConnectionState.READY) {
          this.setState(ConnectionState.RECONNECTING);
          this.scheduleReconnect();
        }
      });
      
      // 오프라인
      this.client.on('offline', () => {
        console.log('MQTT 오프라인');
        if (this.state === ConnectionState.READY) {
          this.setState(ConnectionState.RECONNECTING);
        }
      });
    });
  }
  
  /**
   * 토픽 구독
   */
  private subscribeToTopics(): void {
    if (!this.client) return;
    
    this.config.topics.forEach(topic => {
      this.client!.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          console.error(`토픽 구독 실패 [${topic}]:`, err);
        } else {
          console.log(`토픽 구독 성공: ${topic}`);
        }
      });
    });
  }
  
  /**
   * 메시지 처리 (버퍼링 또는 즉시 처리)
   */
  private handleMessage(topic: string, payload: Buffer): void {
    const message: MQTTMessage = {
      id: `${topic}_${Date.now()}_${Math.random()}`,
      topic,
      payload: this.parsePayload(payload),
      timestamp: Date.now(),
      sequenceNumber: this.stats.messagesQueued++
    };
    
    // 동기화 중이면 버퍼에 저장
    if (this.state === ConnectionState.LOADING_INITIAL || 
        this.state === ConnectionState.SYNCING) {
      this.bufferMessage(message);
    } 
    // READY 상태면 즉시 처리
    else if (this.state === ConnectionState.READY) {
      this.processMessage(message);
    }
  }
  
  /**
   * 메시지 버퍼링
   */
  private bufferMessage(message: MQTTMessage): void {
    // 큐 크기 제한 확인
    if (this.messageQueue.length >= this.config.queueSize!) {
      // 가장 오래된 메시지 제거 (FIFO)
      const removed = this.messageQueue.shift();
      console.warn('메시지 큐 가득참, 오래된 메시지 제거:', removed?.id);
    }
    
    this.messageQueue.push(message);
    console.log(`메시지 버퍼링 [큐 크기: ${this.messageQueue.length}]:`, message.id);
  }
  
  /**
   * 메시지 즉시 처리
   */
  private processMessage(message: MQTTMessage): void {
    // 중복 확인
    if (this.isDuplicate(message)) {
      this.stats.duplicatesFiltered++;
      return;
    }
    
    // 처리된 메시지 ID 추가
    this.addProcessedMessageId(message.id);
    this.stats.messagesProcessed++;
    
    // 이벤트 발생
    this.emit('message', message);
  }
  
  /**
   * 초기 데이터와 동기화 시작
   */
  public async startSync(initialData: any[], initialDataTimestamp: number): Promise<void> {
    if (this.state !== ConnectionState.LOADING_INITIAL) {
      throw new Error('잘못된 상태에서 동기화 시도');
    }
    
    this.setState(ConnectionState.SYNCING);
    this.lastSyncTimestamp = initialDataTimestamp;
    
    console.log(`동기화 시작 - 초기 데이터: ${initialData.length}개, 버퍼: ${this.messageQueue.length}개`);
    
    // 동기화 윈도우 내의 메시지만 처리
    const syncWindow = {
      start: initialDataTimestamp,
      end: Date.now()
    };
    
    // 버퍼된 메시지 처리
    await this.processSyncBuffer(initialData, syncWindow);
    
    // 동기화 완료
    this.completeSyncProcess();
  }
  
  /**
   * 동기화 버퍼 처리
   */
  private async processSyncBuffer(
    initialData: any[], 
    syncWindow: { start: number; end: number }
  ): Promise<void> {
    const relevantMessages = this.messageQueue.filter(msg => {
      // 동기화 윈도우 내의 메시지만 선택
      return msg.timestamp >= syncWindow.start && 
             msg.timestamp <= syncWindow.end;
    });
    
    console.log(`동기화 윈도우 내 메시지: ${relevantMessages.length}개`);
    
    // 초기 데이터의 ID를 Set에 저장 (빠른 중복 확인)
    initialData.forEach(item => {
      if (item.id) {
        this.processedMessageIds.add(item.id);
      }
    });
    
    // 버퍼된 메시지 처리
    for (const message of relevantMessages) {
      if (!this.isDuplicate(message)) {
        this.processMessage(message);
      }
    }
    
    // 처리된 메시지를 큐에서 제거
    this.messageQueue = this.messageQueue.filter(msg => 
      msg.timestamp > syncWindow.end
    );
  }
  
  /**
   * 동기화 프로세스 완료
   */
  private completeSyncProcess(): void {
    const syncDuration = Date.now() - this.syncStartTime;
    this.stats.syncDuration = syncDuration;
    this.stats.lastSyncTime = new Date();
    
    console.log(`동기화 완료 - 소요시간: ${syncDuration}ms, 처리된 메시지: ${this.stats.messagesProcessed}개`);
    
    this.setState(ConnectionState.READY);
    this.emit('syncCompleted', {
      duration: syncDuration,
      messagesProcessed: this.stats.messagesProcessed,
      duplicatesFiltered: this.stats.duplicatesFiltered
    });
  }
  
  /**
   * 중복 메시지 확인
   */
  private isDuplicate(message: MQTTMessage): boolean {
    // 메시지 ID로 중복 확인
    if (message.payload?.id && this.processedMessageIds.has(message.payload.id)) {
      return true;
    }
    
    // 동일한 토픽과 타임스탬프로 추가 확인
    const messageKey = `${message.topic}_${message.payload?.id || message.timestamp}`;
    return this.processedMessageIds.has(messageKey);
  }
  
  /**
   * 처리된 메시지 ID 추가 (메모리 관리 포함)
   */
  private addProcessedMessageId(id: string): void {
    this.processedMessageIds.add(id);
    
    // Set 크기 제한 (메모리 관리)
    if (this.processedMessageIds.size > 10000) {
      // 오래된 항목 제거 (처음 1000개)
      const idsArray = Array.from(this.processedMessageIds);
      const toRemove = idsArray.slice(0, 1000);
      toRemove.forEach(id => this.processedMessageIds.delete(id));
    }
  }
  
  /**
   * 재연결 스케줄링
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('최대 재연결 시도 횟수 초과');
      this.setState(ConnectionState.ERROR);
      this.emit('maxReconnectAttemptsReached');
      return;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    const delay = Math.min(
      this.config.reconnectPeriod! * Math.pow(2, this.reconnectAttempts),
      30000 // 최대 30초
    );
    
    console.log(`${delay}ms 후 재연결 시도 (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnect();
    }, delay);
  }
  
  /**
   * 재연결
   */
  private async reconnect(): Promise<void> {
    this.setState(ConnectionState.RECONNECTING);
    
    try {
      await this.establishConnection();
      this.setState(ConnectionState.READY);
      this.emit('reconnected');
    } catch (error) {
      console.error('재연결 실패:', error);
      this.scheduleReconnect();
    }
  }
  
  /**
   * 메시지 발행
   */
  public publish(topic: string, payload: any, options?: mqtt.IClientPublishOptions): void {
    if (!this.client || this.state !== ConnectionState.READY) {
      console.warn('MQTT 클라이언트가 준비되지 않음');
      return;
    }
    
    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
    this.client.publish(topic, message, options || { qos: 1 });
  }
  
  /**
   * 연결 종료
   */
  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.client) {
      this.client.end();
      this.client = null;
    }
    
    this.setState(ConnectionState.DISCONNECTED);
    this.messageQueue = [];
    this.processedMessageIds.clear();
  }
  
  /**
   * 상태 변경
   */
  private setState(newState: ConnectionState): void {
    const oldState = this.state;
    this.state = newState;
    console.log(`상태 변경: ${oldState} → ${newState}`);
    this.emit('stateChanged', { oldState, newState });
  }
  
  /**
   * 페이로드 파싱
   */
  private parsePayload(payload: Buffer): any {
    try {
      return JSON.parse(payload.toString());
    } catch {
      return payload.toString();
    }
  }
  
  /**
   * 디버그 정보 출력
   */
  public getDebugInfo(): any {
    return {
      state: this.state,
      stats: this.stats,
      queueLength: this.messageQueue.length,
      processedCount: this.processedMessageIds.size,
      reconnectAttempts: this.reconnectAttempts,
      isConnected: this.client?.connected || false
    };
  }
}

export default MQTTConnectionManager;
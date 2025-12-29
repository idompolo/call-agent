/**
 * 실시간 주문 관리를 위한 React Hook
 * 초기 데이터 로드와 MQTT 실시간 업데이트를 완벽하게 동기화
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { OrderSyncManager } from '@/lib/realtime/orderSyncManager';
import type { Order } from '@/lib/realtime/orderSyncManager';
import { ConnectionState } from '@/lib/realtime/connectionManager';

// Re-export Order type
export type { Order };

// Hook 설정 인터페이스
export interface UseRealtimeOrdersConfig {
  apiUrl: string;
  mqttBrokerUrl: string;
  mqttUsername?: string;
  mqttPassword?: string;
  topics?: string[];
  autoConnect?: boolean;
  onError?: (error: Error) => void;
}

// Hook 반환 타입
export interface UseRealtimeOrdersReturn {
  orders: Order[];
  connectionState: ConnectionState;
  isLoading: boolean;
  isSyncing: boolean;
  error: Error | null;
  stats: SyncStats;
  connect: () => Promise<void>;
  disconnect: () => void;
  refresh: () => Promise<void>;
  getOrder: (orderId: string) => Order | undefined;
  publishMessage: (topic: string, payload: any) => void;
}

// 동기화 통계
export interface SyncStats {
  totalOrders: number;
  initialOrderCount: number;
  realtimeUpdateCount: number;
  duplicatesRemoved: number;
  lastSyncTime: Date | null;
  connectionAttempts: number;
  isConnected: boolean;
}

/**
 * 실시간 주문 Hook
 */
export function useRealtimeOrders(config: UseRealtimeOrdersConfig): UseRealtimeOrdersReturn {
  // 상태 관리
  const [orders, setOrders] = useState<Order[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState<SyncStats>({
    totalOrders: 0,
    initialOrderCount: 0,
    realtimeUpdateCount: 0,
    duplicatesRemoved: 0,
    lastSyncTime: null,
    connectionAttempts: 0,
    isConnected: false
  });
  
  // Ref로 매니저 인스턴스 관리
  const syncManagerRef = useRef<OrderSyncManager | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  
  /**
   * 동기화 매니저 초기화
   */
  const initializeSyncManager = useCallback(() => {
    if (syncManagerRef.current) {
      return syncManagerRef.current;
    }
    
    const defaultTopics = [
      'order/new',
      'order/update',
      'order/delete',
      'order/status',
      'order/+/status', // 와일드카드 토픽
      'driver/+/location'
    ];
    
    const manager = new OrderSyncManager({
      apiUrl: config.apiUrl,
      mqttBrokerUrl: config.mqttBrokerUrl,
      mqttUsername: config.mqttUsername,
      mqttPassword: config.mqttPassword,
      topics: config.topics || defaultTopics,
      deduplicationWindow: 5000,
      maxRetries: 3
    });
    
    // 콜백 설정
    manager.setCallbacks({
      onOrdersUpdate: (updatedOrders) => {
        console.log(`[Hook] 주문 업데이트: ${updatedOrders.length}개`);
        setOrders(updatedOrders);
        updateStats(manager);
      },
      onStateChange: (newState) => {
        console.log(`[Hook] 상태 변경: ${newState}`);
        setConnectionState(newState);
        
        // 상태별 플래그 업데이트
        switch (newState) {
          case ConnectionState.CONNECTING:
          case ConnectionState.LOADING_INITIAL:
            setIsLoading(true);
            setIsSyncing(false);
            break;
          case ConnectionState.SYNCING:
            setIsLoading(false);
            setIsSyncing(true);
            break;
          case ConnectionState.READY:
            setIsLoading(false);
            setIsSyncing(false);
            setError(null);
            break;
          case ConnectionState.ERROR:
          case ConnectionState.DISCONNECTED:
            setIsLoading(false);
            setIsSyncing(false);
            break;
        }
        
        updateStats(manager);
      },
      onError: (err) => {
        console.error('[Hook] 오류 발생:', err);
        setError(err);
        config.onError?.(err);
      }
    });
    
    syncManagerRef.current = manager;
    return manager;
  }, [config]);
  
  /**
   * 통계 업데이트
   */
  const updateStats = useCallback((manager: OrderSyncManager) => {
    const syncStats = manager.getSyncStats();
    const debugInfo = syncStats.debugInfo;
    
    setStats({
      totalOrders: syncStats.currentOrderCount || 0,
      initialOrderCount: syncStats.initialOrderCount || 0,
      realtimeUpdateCount: syncStats.realtimeUpdateCount || 0,
      duplicatesRemoved: syncStats.duplicatesRemoved || 0,
      lastSyncTime: syncStats.lastSyncTime,
      connectionAttempts: debugInfo?.stats?.connectionAttempts || 0,
      isConnected: debugInfo?.isConnected || false
    });
  }, []);
  
  /**
   * 연결 시작
   */
  const connect = useCallback(async () => {
    try {
      setError(null);
      const manager = initializeSyncManager();
      await manager.startSync();
    } catch (err) {
      const error = err as Error;
      console.error('[Hook] 연결 실패:', error);
      setError(error);
      throw error;
    }
  }, [initializeSyncManager]);
  
  /**
   * 연결 종료
   */
  const disconnect = useCallback(() => {
    if (syncManagerRef.current) {
      syncManagerRef.current.disconnect();
      syncManagerRef.current = null;
      setOrders([]);
      setConnectionState(ConnectionState.DISCONNECTED);
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);
  
  /**
   * 데이터 새로고침
   */
  const refresh = useCallback(async () => {
    if (!syncManagerRef.current) {
      await connect();
    } else if (connectionState === ConnectionState.READY) {
      // 재연결하여 데이터 새로고침
      disconnect();
      await connect();
    }
  }, [connect, disconnect, connectionState]);
  
  /**
   * 특정 주문 가져오기
   */
  const getOrder = useCallback((orderId: string): Order | undefined => {
    return syncManagerRef.current?.getOrder(orderId);
  }, []);
  
  /**
   * 메시지 발행
   */
  const publishMessage = useCallback((topic: string, payload: any) => {
    if (syncManagerRef.current) {
      syncManagerRef.current.publishMessage(topic, payload);
    } else {
      console.warn('[Hook] 동기화 매니저가 초기화되지 않음');
    }
  }, []);
  
  /**
   * 자동 연결
   */
  useEffect(() => {
    if (config.autoConnect && !isInitializedRef.current) {
      isInitializedRef.current = true;
      connect().catch(err => {
        console.error('[Hook] 자동 연결 실패:', err);
      });
    }
    
    // Cleanup
    return () => {
      if (syncManagerRef.current) {
        syncManagerRef.current.disconnect();
        syncManagerRef.current = null;
      }
    };
  }, [config.autoConnect]); // connect를 의존성에서 제외하여 무한 루프 방지
  
  /**
   * 브라우저 탭 비활성화/활성화 처리
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && syncManagerRef.current && connectionState === ConnectionState.READY) {
        // 탭이 다시 활성화되면 데이터 동기화
        console.log('[Hook] 탭 활성화 - 데이터 동기화');
        updateStats(syncManagerRef.current);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connectionState, updateStats]);
  
  /**
   * 네트워크 상태 변경 처리
   */
  useEffect(() => {
    const handleOnline = () => {
      if (syncManagerRef.current && connectionState === ConnectionState.ERROR) {
        console.log('[Hook] 네트워크 연결 복구 - 재연결 시도');
        connect().catch(err => {
          console.error('[Hook] 재연결 실패:', err);
        });
      }
    };
    
    const handleOffline = () => {
      console.log('[Hook] 네트워크 연결 끊김');
      setError(new Error('네트워크 연결이 끊어졌습니다'));
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectionState]); // connect를 의존성에서 제외
  
  return {
    orders,
    connectionState,
    isLoading,
    isSyncing,
    error,
    stats,
    connect,
    disconnect,
    refresh,
    getOrder,
    publishMessage
  };
}

/**
 * 연결 상태 텍스트 변환 헬퍼
 */
export function getConnectionStateText(state: ConnectionState): string {
  const stateTexts: Record<ConnectionState, string> = {
    [ConnectionState.DISCONNECTED]: '연결 끊김',
    [ConnectionState.CONNECTING]: '연결 중...',
    [ConnectionState.LOADING_INITIAL]: '초기 데이터 로딩 중...',
    [ConnectionState.SYNCING]: '데이터 동기화 중...',
    [ConnectionState.READY]: '실시간 연결됨',
    [ConnectionState.ERROR]: '연결 오류',
    [ConnectionState.RECONNECTING]: '재연결 중...'
  };
  
  return stateTexts[state] || '알 수 없음';
}

/**
 * 연결 상태 색상 헬퍼
 */
export function getConnectionStateColor(state: ConnectionState): string {
  const stateColors: Record<ConnectionState, string> = {
    [ConnectionState.DISCONNECTED]: '#6B7280', // gray
    [ConnectionState.CONNECTING]: '#3B82F6', // blue
    [ConnectionState.LOADING_INITIAL]: '#3B82F6', // blue
    [ConnectionState.SYNCING]: '#F59E0B', // amber
    [ConnectionState.READY]: '#10B981', // green
    [ConnectionState.ERROR]: '#EF4444', // red
    [ConnectionState.RECONNECTING]: '#F59E0B' // amber
  };
  
  return stateColors[state] || '#6B7280';
}

export default useRealtimeOrders;
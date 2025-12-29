import { ipcMain, BrowserWindow } from 'electron';
import { MQTTManager } from '../mqtt';

/**
 * IPC 핸들러 설정
 *
 * Renderer → Main 요청 처리
 */
export function setupIPCHandlers(
  mqttManager: MQTTManager,
  getMainWindow: () => BrowserWindow | null
): void {
  // ============================================
  // Call Actions
  // ============================================

  /**
   * 배차 요청
   */
  ipcMain.handle('call:dispatch', async (_event, callId: string, taxiId: string) => {
    try {
      await mqttManager.publish(`call/dispatch/${callId}`, {
        callId,
        taxiId,
        timestamp: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('[IPC] Dispatch error:', error);
      return false;
    }
  });

  /**
   * 콜 상태 업데이트
   */
  ipcMain.handle('call:update-status', async (_event, callId: string, status: string) => {
    try {
      await mqttManager.publish(`call/status/${callId}`, {
        callId,
        status,
        timestamp: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('[IPC] Update status error:', error);
      return false;
    }
  });

  /**
   * 콜 취소
   */
  ipcMain.handle('call:cancel', async (_event, callId: string, reason: string) => {
    try {
      await mqttManager.publish(`call/cancel/${callId}`, {
        callId,
        reason,
        timestamp: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('[IPC] Cancel error:', error);
      return false;
    }
  });

  // ============================================
  // Chat Actions
  // ============================================

  /**
   * 채팅 메시지 전송
   */
  ipcMain.handle('chat:send-message', async (_event, chatId: string, content: string) => {
    try {
      await mqttManager.publish(`chat/send/${chatId}`, {
        chatId,
        content,
        timestamp: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('[IPC] Send message error:', error);
      return false;
    }
  });

  /**
   * 채팅 읽음 처리
   */
  ipcMain.handle('chat:mark-read', async (_event, chatId: string) => {
    try {
      await mqttManager.publish(`chat/read/${chatId}`, {
        chatId,
        timestamp: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('[IPC] Mark read error:', error);
      return false;
    }
  });

  // ============================================
  // Connection Management
  // ============================================

  /**
   * MQTT 연결 (userId 기반)
   */
  ipcMain.handle('mqtt:connect', async (_event, userId: string) => {
    try {
      console.log('[IPC] Connecting MQTT with userId:', userId);
      await mqttManager.connect(userId);
      return true;
    } catch (error) {
      console.error('[IPC] Connect error:', error);
      return false;
    }
  });

  /**
   * MQTT 연결 해제
   */
  ipcMain.handle('mqtt:disconnect', async () => {
    try {
      console.log('[IPC] Disconnecting MQTT');
      mqttManager.disconnect();
      return true;
    } catch (error) {
      console.error('[IPC] Disconnect error:', error);
      return false;
    }
  });

  /**
   * MQTT 재연결
   */
  ipcMain.handle('mqtt:reconnect', async () => {
    try {
      mqttManager.reconnect();
      return true;
    } catch (error) {
      console.error('[IPC] Reconnect error:', error);
      return false;
    }
  });

  /**
   * 연결 상태 조회
   */
  ipcMain.handle('mqtt:status', async () => {
    return {
      mqtt: mqttManager.isConnected() ? 'connected' : 'disconnected',
      lastConnected: mqttManager.isConnected() ? new Date() : undefined,
    };
  });

  /**
   * 범용 MQTT 메시지 발행
   */
  ipcMain.handle('mqtt:publish', async (_event, topic: string, message: string) => {
    try {
      console.log('[IPC] Publishing to topic:', topic);
      await mqttManager.publish(topic, message);
      return true;
    } catch (error) {
      console.error('[IPC] Publish error:', error);
      return false;
    }
  });

  // ============================================
  // Window Controls
  // ============================================

  ipcMain.on('window:minimize', () => {
    getMainWindow()?.minimize();
  });

  ipcMain.on('window:maximize', () => {
    const win = getMainWindow();
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    getMainWindow()?.close();
  });
}

/**
 * IPC 핸들러 정리
 */
export function removeIPCHandlers(): void {
  const channels = [
    'call:dispatch',
    'call:update-status',
    'call:cancel',
    'chat:send-message',
    'chat:mark-read',
    'mqtt:connect',
    'mqtt:disconnect',
    'mqtt:reconnect',
    'mqtt:status',
    'mqtt:publish',
  ];

  channels.forEach((channel) => {
    ipcMain.removeHandler(channel);
  });

  ipcMain.removeAllListeners('window:minimize');
  ipcMain.removeAllListeners('window:maximize');
  ipcMain.removeAllListeners('window:close');
}

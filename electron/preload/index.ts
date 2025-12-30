import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

/**
 * Preload Script - Context Bridge
 *
 * Main Process와 Renderer Process 간의 안전한 통신 브릿지
 * contextIsolation이 활성화된 상태에서 필요한 API만 노출
 */

// Type-safe callback removal helper
type CleanupFn = () => void;

function createEventHandler<T>(
  channel: string,
  callback: (data: T) => void
): CleanupFn {
  const handler = (_event: IpcRendererEvent, data: T) => callback(data);
  ipcRenderer.on(channel, handler);
  return () => {
    ipcRenderer.removeListener(channel, handler);
  };
}

// Expose API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // ============================================
  // MQTT Event Listeners (Main → Renderer)
  // 각 리스너는 정리 함수를 반환하여 메모리 누수 방지
  // ============================================

  onTaxiLocations: (callback: (locations: unknown[]) => void): CleanupFn => {
    return createEventHandler('mqtt:taxi-locations', callback);
  },

  onNewCall: (callback: (call: unknown) => void): CleanupFn => {
    return createEventHandler('mqtt:new-call', callback);
  },

  onCallUpdated: (callback: (call: unknown) => void): CleanupFn => {
    return createEventHandler('mqtt:call-updated', callback);
  },

  onChatMessage: (callback: (message: unknown) => void): CleanupFn => {
    return createEventHandler('mqtt:chat-message', callback);
  },

  onConnectionStatusChanged: (callback: (status: unknown) => void): CleanupFn => {
    return createEventHandler('mqtt:connection-status', callback);
  },

  // ============================================
  // Call Actions (Renderer → Main)
  // ============================================

  dispatchCall: (callId: string, taxiId: string): Promise<boolean> => {
    return ipcRenderer.invoke('call:dispatch', callId, taxiId);
  },

  updateCallStatus: (callId: string, status: string): Promise<boolean> => {
    return ipcRenderer.invoke('call:update-status', callId, status);
  },

  cancelCall: (callId: string, reason: string): Promise<boolean> => {
    return ipcRenderer.invoke('call:cancel', callId, reason);
  },

  // ============================================
  // Chat Actions
  // ============================================

  sendChatMessage: (chatId: string, content: string): Promise<boolean> => {
    return ipcRenderer.invoke('chat:send-message', chatId, content);
  },

  markChatAsRead: (chatId: string): Promise<boolean> => {
    return ipcRenderer.invoke('chat:mark-read', chatId);
  },

  // ============================================
  // Connection Management
  // ============================================

  connectMQTT: (userId: string): Promise<boolean> => {
    return ipcRenderer.invoke('mqtt:connect', userId);
  },

  disconnectMQTT: (): Promise<boolean> => {
    return ipcRenderer.invoke('mqtt:disconnect');
  },

  reconnectMQTT: (): Promise<boolean> => {
    return ipcRenderer.invoke('mqtt:reconnect');
  },

  getConnectionStatus: (): Promise<unknown> => {
    return ipcRenderer.invoke('mqtt:status');
  },

  publishMQTT: (topic: string, message: string): Promise<boolean> => {
    return ipcRenderer.invoke('mqtt:publish', topic, message);
  },

  // ============================================
  // MQTT Order Events (Main → Renderer)
  // Next.js 앱의 토픽 구조와 호환
  // ============================================

  onOrderAdd: (callback: (data: unknown) => void): CleanupFn => {
    return createEventHandler('mqtt:order-new', callback);
  },

  onOrderModify: (callback: (data: unknown) => void): CleanupFn => {
    return createEventHandler('mqtt:order-updated', callback);
  },

  onOrderAccept: (callback: (data: unknown) => void): CleanupFn => {
    return createEventHandler('mqtt:order-accepted', callback);
  },

  onOrderCancel: (callback: (data: unknown) => void): CleanupFn => {
    return createEventHandler('mqtt:order-cancelled', callback);
  },

  onOrderAction: (callback: (data: unknown) => void): CleanupFn => {
    return createEventHandler('mqtt:order-action', callback);
  },

  onSelectAgent: (callback: (data: unknown) => void): CleanupFn => {
    return createEventHandler('mqtt:select-agent', callback);
  },

  onConnectAgent: (callback: (data: unknown) => void): CleanupFn => {
    return createEventHandler('mqtt:connect-agent', callback);
  },

  // Driver GPS (batched)
  onDriverGPS: (callback: (data: unknown) => void): CleanupFn => {
    return createEventHandler('mqtt:driver-locations', callback);
  },

  // ============================================
  // Window Controls
  // ============================================

  minimizeWindow: (): void => {
    ipcRenderer.send('window:minimize');
  },

  maximizeWindow: (): void => {
    ipcRenderer.send('window:maximize');
  },

  closeWindow: (): void => {
    ipcRenderer.send('window:close');
  },

  // ============================================
  // Auto Updater
  // ============================================

  onUpdateStatus: (callback: (status: unknown) => void): CleanupFn => {
    return createEventHandler('update-status', callback);
  },

  checkForUpdates: (): Promise<unknown> => {
    return ipcRenderer.invoke('updater:check');
  },

  downloadUpdate: (): Promise<unknown> => {
    return ipcRenderer.invoke('updater:download');
  },

  installUpdate: (): Promise<void> => {
    return ipcRenderer.invoke('updater:install');
  },

  getAppVersion: (): Promise<string> => {
    return ipcRenderer.invoke('updater:get-version');
  },

  getReleaseNotes: (): Promise<{ releaseNotes: string; releaseDate: string } | null> => {
    return ipcRenderer.invoke('updater:get-release-notes');
  },
});

console.log('[Preload] Context bridge exposed');

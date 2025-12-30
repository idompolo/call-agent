// Electron IPC API Type Declarations
// These types match the API exposed by electron/preload/index.ts

type CleanupFn = () => void;

export interface ElectronAPI {
  // ============================================
  // MQTT Connection
  // ============================================
  connectMQTT: (userId: string) => Promise<boolean>;
  disconnectMQTT: () => Promise<boolean>;
  reconnectMQTT: () => Promise<{ success: boolean; error?: string }>;
  getConnectionStatus: () => Promise<ConnectionStatus>;
  publishMQTT: (topic: string, message: string) => Promise<boolean>;

  // ============================================
  // Order Event Handlers (Next.js 토픽 호환)
  // ============================================
  onOrderAdd: (callback: (data: OrderEventPayload) => void) => CleanupFn;
  onOrderModify: (callback: (data: OrderEventPayload) => void) => CleanupFn;
  onOrderAccept: (callback: (data: OrderEventPayload) => void) => CleanupFn;
  onOrderCancel: (callback: (data: OrderEventPayload) => void) => CleanupFn;
  onOrderAction: (callback: (data: OrderActionPayload) => void) => CleanupFn;
  onSelectAgent: (callback: (data: AgentSelectPayload) => void) => CleanupFn;
  onDriverGPS: (callback: (locations: GPSLocation[]) => void) => CleanupFn;

  // ============================================
  // Legacy MQTT Events (기존 호환성)
  // ============================================
  onTaxiLocations: (callback: (locations: TaxiLocation[]) => void) => CleanupFn;
  onNewCall: (callback: (call: CallData) => void) => CleanupFn;
  onCallUpdated: (callback: (call: CallData) => void) => CleanupFn;
  onChatMessage: (callback: (message: ChatMessage) => void) => CleanupFn;
  onConnectionStatusChanged: (callback: (status: ConnectionStatus) => void) => CleanupFn;

  // ============================================
  // Call Actions
  // ============================================
  dispatchCall: (callId: string, taxiId: string) => Promise<{ success: boolean; error?: string }>;
  updateCallStatus: (callId: string, status: string) => Promise<{ success: boolean; error?: string }>;
  cancelCall: (callId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;

  // ============================================
  // Chat Actions
  // ============================================
  sendChatMessage: (taxiId: string, message: string) => Promise<{ success: boolean; error?: string }>;
  markChatAsRead: (taxiId: string) => Promise<{ success: boolean; error?: string }>;

  // ============================================
  // Window Controls
  // ============================================
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;

  // ============================================
  // Auto Updater
  // ============================================
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => CleanupFn;
  checkForUpdates: () => Promise<{ updateAvailable: boolean; version?: string }>;
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  installUpdate: () => Promise<void>;
  getAppVersion: () => Promise<string>;
}

// ============================================
// Order Event Types
// ============================================
export interface OrderEventPayload {
  type: 'add' | 'add-reserve' | 'modify' | 'accept' | 'cancel';
  orderId: string;
  data: Record<string, unknown>;
  rawData: string;
}

export interface OrderActionPayload {
  type: 'action';
  orderId: string;
  data: {
    orderId: string;
    action: unknown;
  };
  rawData: string;
}

export interface AgentSelectPayload {
  type: 'select-agent';
  data: {
    orderId: string;
    selectAgent: string;
  };
  rawData: string;
}

export interface GPSLocation {
  drvNo: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
}

// ============================================
// Legacy Types (기존 호환성)
// ============================================
export interface TaxiLocation {
  taxiId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  status: 'available' | 'busy' | 'offline';
  timestamp: number;
}

export interface CallData {
  callId: string;
  pickup: {
    lat: number;
    lng: number;
    address: string;
  };
  destination?: {
    lat: number;
    lng: number;
    address: string;
  };
  passengerName?: string;
  passengerPhone?: string;
  status: 'pending' | 'dispatched' | 'accepted' | 'picked_up' | 'completed' | 'cancelled';
  assignedTaxiId?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface ChatMessage {
  messageId: string;
  taxiId: string;
  content: string;
  sender: 'dispatcher' | 'driver';
  timestamp: number;
  read?: boolean;
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting?: boolean;
  lastConnected?: number;
  error?: string;
}

// ============================================
// Auto Updater Types
// ============================================
export interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  info?: {
    version: string;
    releaseDate?: string;
    releaseNotes?: string;
  };
  progress?: {
    bytesPerSecond: number;
    percent: number;
    transferred: number;
    total: number;
  };
  error?: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};

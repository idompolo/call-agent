import { app, BrowserWindow, protocol, net } from 'electron';
import { createMainWindow, setupAppLifecycle } from './window';
import { MQTTManager } from './mqtt';
import { setupIPCHandlers, removeIPCHandlers } from './ipc';
import path from 'path';
import { pathToFileURL } from 'url';

// Main window reference
let mainWindow: BrowserWindow | null = null;

// Register custom protocol for serving static files
function registerAppProtocol(): void {
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    let filePath = decodeURIComponent(url.pathname);

    console.log('[Protocol] Request:', filePath);

    // Handle root path
    if (filePath === '/' || filePath === '') {
      filePath = '/dashboard/index.html';
    }

    // Handle paths without extension (add index.html for directories)
    // But NOT for paths that look like files (have a dot in the last segment)
    const lastSegment = filePath.split('/').pop() || '';
    if (!lastSegment.includes('.')) {
      // Remove trailing slash and add /index.html
      filePath = filePath.replace(/\/$/, '') + '/index.html';
    }

    const appPath = app.getAppPath();
    const fullPath = path.join(appPath, 'out', filePath);

    console.log('[Protocol] Serving:', fullPath);

    return net.fetch(pathToFileURL(fullPath).toString());
  });
}

// MQTT Manager instance
const mqttManager = new MQTTManager(200); // 200ms batching interval

/**
 * Application initialization
 */
async function initialize(): Promise<void> {
  // Create window
  mainWindow = createMainWindow();

  // Setup MQTT Manager
  mqttManager.setMainWindow(mainWindow);

  // Setup IPC handlers
  setupIPCHandlers(mqttManager, () => mainWindow);

  // MQTT 연결은 Renderer에서 user 로그인 후 connectMQTT() 호출 시 수행됨
  // 자동 연결 제거 - Renderer에서 IPC를 통해 연결 요청
  console.log('[Main] MQTT Manager initialized, waiting for connection request from renderer');

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Setup app lifecycle
  setupAppLifecycle();
}

/**
 * Application cleanup (앱 완전 종료 시)
 */
function cleanup(): void {
  console.log('[Main] Cleaning up...');
  removeIPCHandlers();
  mqttManager.cleanup(); // 완전한 리소스 정리
}

// Register protocol before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

// Wait for app ready
app.whenReady().then(() => {
  registerAppProtocol();
  initialize();
});

// Cleanup before quit
app.on('before-quit', cleanup);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled rejection:', reason);
});

import { app, BrowserWindow, shell } from 'electron';
import path from 'path';

const isDev = !app.isPackaged;

export function createMainWindow(): BrowserWindow {
  const appPath = app.getAppPath();

  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    title: 'FTNH Call Agent',
    icon: path.join(appPath, 'out/icon.png'),
    webPreferences: {
      preload: path.join(appPath, 'dist-electron/preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    // Professional dispatcher app styling
    backgroundColor: '#0f172a', // Slate-900
    show: true, // Show immediately for debugging
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000/dashboard');
    // DevTools: Cmd+Option+I (Mac) / Ctrl+Shift+I (Win) 로 수동 열기
    // mainWindow.webContents.openDevTools();
  } else {
    // Use custom app:// protocol for production
    mainWindow.loadURL('app://localhost/dashboard');
  }

  console.log('[Window] isDev:', isDev);
  console.log('[Window] App path:', appPath);

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle window close
  mainWindow.on('closed', () => {
    // Cleanup will be handled by main process
  });

  return mainWindow;
}

export function setupAppLifecycle(): void {
  // Quit when all windows are closed (except on macOS)
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // On macOS, re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}

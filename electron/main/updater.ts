import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import { BrowserWindow, ipcMain, app } from 'electron';

// Configure logging
autoUpdater.logger = console;

// Disable auto download - let user decide
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

export interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  info?: UpdateInfo;
  progress?: ProgressInfo;
  error?: string;
}

let mainWindow: BrowserWindow | null = null;

/**
 * Send update status to renderer process
 */
function sendStatusToWindow(status: UpdateStatus): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', status);
  }
}

/**
 * Initialize auto updater with event handlers
 */
export function initAutoUpdater(win: BrowserWindow): void {
  mainWindow = win;

  // Checking for updates
  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for updates...');
    sendStatusToWindow({ status: 'checking' });
  });

  // Update available
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log('[Updater] Update available:', info.version);
    sendStatusToWindow({ status: 'available', info });
  });

  // No update available
  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    console.log('[Updater] No update available. Current version:', app.getVersion());
    sendStatusToWindow({ status: 'not-available', info });
  });

  // Download progress
  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    const logMessage = `Download speed: ${Math.round(progress.bytesPerSecond / 1024)} KB/s - ${Math.round(progress.percent)}%`;
    console.log('[Updater]', logMessage);
    sendStatusToWindow({ status: 'downloading', progress });
  });

  // Update downloaded
  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.log('[Updater] Update downloaded:', info.version);
    sendStatusToWindow({ status: 'downloaded', info });
  });

  // Error
  autoUpdater.on('error', (error: Error) => {
    console.error('[Updater] Error:', error.message);
    sendStatusToWindow({ status: 'error', error: error.message });
  });

  // Setup IPC handlers for renderer communication
  setupUpdaterIPC();

  // Check for updates on startup (after a delay)
  setTimeout(() => {
    checkForUpdates();
  }, 3000); // Wait 3 seconds after app start

  // Check for updates every 30 minutes
  setInterval(() => {
    console.log('[Updater] Periodic update check...');
    checkForUpdates();
  }, 5 * 60 * 1000); // 30 minutes
}

/**
 * Setup IPC handlers for update-related actions
 */
function setupUpdaterIPC(): void {
  // Check for updates manually
  ipcMain.handle('updater:check', async () => {
    return checkForUpdates();
  });

  // Download the update
  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Install update and restart
  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  // Get current version
  ipcMain.handle('updater:get-version', () => {
    return app.getVersion();
  });
}

/**
 * Check for updates
 */
async function checkForUpdates(): Promise<{ updateAvailable: boolean; version?: string }> {
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result?.updateInfo) {
      return {
        updateAvailable: result.updateInfo.version !== app.getVersion(),
        version: result.updateInfo.version,
      };
    }
    return { updateAvailable: false };
  } catch (error) {
    console.error('[Updater] Check failed:', error);
    return { updateAvailable: false };
  }
}

/**
 * Cleanup IPC handlers
 */
export function cleanupUpdaterIPC(): void {
  ipcMain.removeHandler('updater:check');
  ipcMain.removeHandler('updater:download');
  ipcMain.removeHandler('updater:install');
  ipcMain.removeHandler('updater:get-version');
}

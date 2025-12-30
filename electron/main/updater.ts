import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import { BrowserWindow, ipcMain, app } from 'electron';
import * as https from 'https';

// GitHub repository info from package.json
const GITHUB_OWNER = 'idompolo';
const GITHUB_REPO = 'call-agent';

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
  }, 10 * 60 * 1000); // 10 minutes
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

  // Get release notes for current version
  ipcMain.handle('updater:get-release-notes', async () => {
    return getReleaseNotes();
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
 * Fetch release notes from GitHub Releases API
 */
async function fetchReleaseNotes(version: string): Promise<{ releaseNotes: string; releaseDate: string } | null> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tags/v${version}`,
      method: 'GET',
      headers: {
        'User-Agent': 'FTNH-Call-Agent',
        'Accept': 'application/vnd.github.v3+json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const release = JSON.parse(data);
            resolve({
              releaseNotes: release.body || '',
              releaseDate: release.published_at || new Date().toISOString(),
            });
          } else {
            console.log('[Updater] Release not found for version:', version);
            resolve(null);
          }
        } catch (error) {
          console.error('[Updater] Failed to parse release data:', error);
          resolve(null);
        }
      });
    });

    req.on('error', (error) => {
      console.error('[Updater] Failed to fetch release notes:', error);
      resolve(null);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

// Store latest release notes for retrieval
let cachedReleaseNotes: { releaseNotes: string; releaseDate: string } | null = null;

/**
 * Get release notes (called from renderer)
 */
export async function getReleaseNotes(): Promise<{ releaseNotes: string; releaseDate: string } | null> {
  if (cachedReleaseNotes) {
    return cachedReleaseNotes;
  }

  const currentVersion = app.getVersion();
  const notes = await fetchReleaseNotes(currentVersion);

  if (notes) {
    cachedReleaseNotes = notes;
  }

  return notes;
}

/**
 * Cleanup IPC handlers
 */
export function cleanupUpdaterIPC(): void {
  ipcMain.removeHandler('updater:check');
  ipcMain.removeHandler('updater:download');
  ipcMain.removeHandler('updater:install');
  ipcMain.removeHandler('updater:get-version');
  ipcMain.removeHandler('updater:get-release-notes');
}

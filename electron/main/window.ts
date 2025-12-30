import { app, BrowserWindow, shell, screen } from 'electron';
import path from 'path';
import fs from 'fs';

const isDev = !app.isPackaged;

// 윈도우 상태 저장용
interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized?: boolean;
}

const defaultState: WindowState = {
  width: 1600,
  height: 1000,
};

// 윈도우 상태 파일 경로
const stateFilePath = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState(): WindowState {
  try {
    if (fs.existsSync(stateFilePath)) {
      const data = fs.readFileSync(stateFilePath, 'utf-8');
      const state = JSON.parse(data) as WindowState;

      // 저장된 위치가 현재 디스플레이 범위 내에 있는지 확인
      if (state.x !== undefined && state.y !== undefined) {
        const displays = screen.getAllDisplays();
        const isVisible = displays.some(display => {
          const { x, y, width, height } = display.bounds;
          return (
            state.x! >= x &&
            state.x! < x + width &&
            state.y! >= y &&
            state.y! < y + height
          );
        });

        // 화면 밖이면 위치 초기화
        if (!isVisible) {
          delete state.x;
          delete state.y;
        }
      }

      return { ...defaultState, ...state };
    }
  } catch (error) {
    console.error('[Window] Failed to load window state:', error);
  }
  return defaultState;
}

function saveWindowState(window: BrowserWindow): void {
  try {
    const bounds = window.getBounds();
    const isMaximized = window.isMaximized();

    const state: WindowState = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized,
    };

    fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2));
    console.log('[Window] Window state saved:', state);
  } catch (error) {
    console.error('[Window] Failed to save window state:', error);
  }
}

// 타이틀에 버전 포함
const appVersion = app.getVersion();
const appTitle = `FTNH Call Agent v${appVersion}`;

export function createMainWindow(): BrowserWindow {
  const appPath = app.getAppPath();

  // 저장된 윈도우 상태 불러오기
  const savedState = loadWindowState();

  const mainWindow = new BrowserWindow({
    x: savedState.x,
    y: savedState.y,
    width: savedState.width,
    height: savedState.height,
    minWidth: 1200,
    minHeight: 800,
    title: appTitle,
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
    // macOS: 타이틀바 숨기기
    ...(process.platform === 'darwin' && {
      titleBarStyle: 'hiddenInset' as const,
      trafficLightPosition: { x: 15, y: 15 },
    }),
    // Windows/Linux: 커스텀 타이틀바
    ...(process.platform !== 'darwin' && {
      autoHideMenuBar: true,
      titleBarStyle: 'hidden' as const,
      titleBarOverlay: {
        color: '#1e293b', // 타이틀바 배경색 (Slate-800)
        symbolColor: '#e2e8f0', // 버튼 아이콘 색상 (Slate-200)
        height: 32,
      },
    }),
  });

  // Windows/Linux: 메뉴바 완전 제거
  if (process.platform !== 'darwin') {
    mainWindow.setMenu(null);
  }

  // 최대화 상태였으면 복원
  if (savedState.isMaximized) {
    mainWindow.maximize();
  }

  // 윈도우 상태 저장 이벤트 (닫히기 전에 저장)
  mainWindow.on('close', () => {
    if (!mainWindow.isMinimized()) {
      saveWindowState(mainWindow);
    }
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

// Electron environment detection and utilities

/**
 * Check if running in Electron environment
 */
export function isElectron(): boolean {
  // Check if window.electronAPI exists (set by preload script)
  if (typeof window !== 'undefined' && window.electronAPI) {
    return true;
  }
  return false;
}

/**
 * Get Electron API if available
 */
export function getElectronAPI() {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI;
  }
  return null;
}

/**
 * Check if running on macOS
 */
export function isMacOS(): boolean {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    return navigator.platform.toLowerCase().includes('mac');
  }
  return false;
}

/**
 * Check if running in Electron on macOS (for traffic light buttons handling)
 */
export function isElectronMac(): boolean {
  return isElectron() && isMacOS();
}

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    return navigator.platform.toLowerCase().includes('win');
  }
  return false;
}

/**
 * Check if running in Electron on Windows (for custom titlebar)
 */
export function isElectronWindows(): boolean {
  return isElectron() && isWindows();
}

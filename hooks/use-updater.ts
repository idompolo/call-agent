'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

export interface ProgressInfo {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

export interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  info?: UpdateInfo;
  progress?: ProgressInfo;
  error?: string;
}

export function useUpdater() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ status: 'idle' });
  const [currentVersion, setCurrentVersion] = useState<string>('');

  // Check if running in Electron
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  useEffect(() => {
    if (!isElectron) return;

    // Get current version
    window.electronAPI?.getAppVersion().then((version) => {
      setCurrentVersion(version);
    });

    // Listen for update status from main process
    const cleanup = window.electronAPI?.onUpdateStatus((status) => {
      setUpdateStatus(status as UpdateStatus);
    });

    return () => {
      cleanup?.();
    };
  }, [isElectron]);

  const checkForUpdates = useCallback(async () => {
    if (!isElectron) return;
    setUpdateStatus({ status: 'checking' });
    try {
      await window.electronAPI?.checkForUpdates();
    } catch (error) {
      setUpdateStatus({ status: 'error', error: (error as Error).message });
    }
  }, [isElectron]);

  const downloadUpdate = useCallback(async () => {
    if (!isElectron) return;
    try {
      await window.electronAPI?.downloadUpdate();
    } catch (error) {
      setUpdateStatus({ status: 'error', error: (error as Error).message });
    }
  }, [isElectron]);

  const installUpdate = useCallback(() => {
    if (!isElectron) return;
    window.electronAPI?.installUpdate();
  }, [isElectron]);

  return {
    updateStatus,
    currentVersion,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    isElectron,
  };
}

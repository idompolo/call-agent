'use client';

import { useUpdater } from '@/hooks/use-updater';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function UpdateBanner() {
  const { updateStatus, currentVersion, checkForUpdates, downloadUpdate, installUpdate, isElectron } = useUpdater();
  const [dismissed, setDismissed] = useState(false);

  // Don't render in browser or if dismissed
  if (!isElectron || dismissed) return null;

  // Don't show banner for idle, checking, or not-available states
  if (updateStatus.status === 'idle' || updateStatus.status === 'not-available') {
    return null;
  }

  // Checking state - subtle indicator
  if (updateStatus.status === 'checking') {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 shadow-lg">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>업데이트 확인 중...</span>
      </div>
    );
  }

  // Error state
  if (updateStatus.status === 'error') {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-red-900/90 px-4 py-3 text-sm text-red-100 shadow-lg backdrop-blur">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <div className="flex flex-col">
          <span className="font-medium">업데이트 오류</span>
          <span className="text-xs text-red-200">{updateStatus.error}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="ml-2 h-8 w-8 p-0 text-red-200 hover:bg-red-800 hover:text-white"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Update available
  if (updateStatus.status === 'available') {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-blue-900/90 px-4 py-3 text-sm text-blue-100 shadow-lg backdrop-blur">
        <Download className="h-5 w-5 flex-shrink-0" />
        <div className="flex flex-col">
          <span className="font-medium">새 버전 사용 가능</span>
          <span className="text-xs text-blue-200">
            {currentVersion} → {updateStatus.info?.version}
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="ml-2 bg-blue-700 text-white hover:bg-blue-600"
          onClick={downloadUpdate}
        >
          다운로드
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-blue-200 hover:bg-blue-800 hover:text-white"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Downloading
  if (updateStatus.status === 'downloading') {
    const percent = Math.round(updateStatus.progress?.percent || 0);
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-slate-800/90 px-4 py-3 text-sm text-slate-100 shadow-lg backdrop-blur">
        <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" />
        <div className="flex flex-col">
          <span className="font-medium">업데이트 다운로드 중</span>
          <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        <span className="min-w-[3rem] text-right text-xs text-slate-400">{percent}%</span>
      </div>
    );
  }

  // Downloaded - ready to install
  if (updateStatus.status === 'downloaded') {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-green-900/90 px-4 py-3 text-sm text-green-100 shadow-lg backdrop-blur">
        <CheckCircle className="h-5 w-5 flex-shrink-0" />
        <div className="flex flex-col">
          <span className="font-medium">업데이트 준비 완료</span>
          <span className="text-xs text-green-200">
            버전 {updateStatus.info?.version} 설치 준비됨
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="ml-2 bg-green-700 text-white hover:bg-green-600"
          onClick={installUpdate}
        >
          <RefreshCw className="mr-1.5 h-4 w-4" />
          재시작
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-green-200 hover:bg-green-800 hover:text-white"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return null;
}

/**
 * Version display component for settings or about page
 */
export function VersionInfo() {
  const { currentVersion, updateStatus, checkForUpdates, isElectron } = useUpdater();

  if (!isElectron) {
    return <span className="text-xs text-slate-500">Web Version</span>;
  }

  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span>v{currentVersion}</span>
      {updateStatus.status === 'checking' ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : updateStatus.status === 'available' ? (
        <span className="rounded bg-blue-900/50 px-1.5 py-0.5 text-blue-300">
          {updateStatus.info?.version} 사용 가능
        </span>
      ) : (
        <button
          onClick={checkForUpdates}
          className="rounded px-1.5 py-0.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
        >
          업데이트 확인
        </button>
      )}
    </div>
  );
}

'use client'

import { useEffect, useState } from 'react'
import { isElectronWindows } from '@/lib/electron'

export function WindowsTitlebar() {
  const [isWinElectron, setIsWinElectron] = useState(false)
  const [appVersion, setAppVersion] = useState<string>('')

  useEffect(() => {
    setIsWinElectron(isElectronWindows())

    // Electron API로 버전 가져오기
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(version => {
        setAppVersion(version)
      })
    }
  }, [])

  // Windows Electron 환경이 아니면 렌더링하지 않음
  if (!isWinElectron) {
    return null
  }

  return (
    <div
      className="h-8 bg-slate-800 flex items-center px-3 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* 앱 제목 */}
      <span className="text-slate-200 text-xs font-medium">
        FTNH Call Agent {appVersion && `v${appVersion}`}
      </span>

      {/* 우측 공간은 titleBarOverlay 버튼(최소화/최대화/닫기)을 위해 비워둠 */}
    </div>
  )
}

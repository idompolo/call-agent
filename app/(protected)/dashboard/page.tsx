'use client'

import { useEffect, useState, lazy, Suspense } from 'react'
import { EditPanel } from '@/components/edit-panel/EditPanel'
import { OrderInputPanel } from '@/components/order-input-panel/OrderInputPanel'
import { ErrorBoundary } from '@/components/error-boundary'
import { useAuthStore } from '@/store/auth-store'
import { MonitoringPanelVirtualized as MonitoringPanel } from './components/monitoring-panel-virtualized'
import { Header } from './components/header'

// Lazy load 덜 사용되는 컴포넌트들
const SideMenu = lazy(() => import('./components/side-menu').then(m => ({ default: m.SideMenu })))
const OrderEditPanel = lazy(() => import('./components/order-edit-panel').then(m => ({ default: m.OrderEditPanel })))
const OrderControlPanel = lazy(() => import('./components/order-control-panel').then(m => ({ default: m.OrderControlPanel })))
const ChatPanel = lazy(() => import('@/components/chat-panel/ChatPanel').then(m => ({ default: m.ChatPanel })))
const ChatPanelFlutterLayout = lazy(() => import('@/components/chat-panel/ChatPanelFlutterLayout').then(m => ({ default: m.ChatPanelFlutterLayout })))
const MessageTablePanel = lazy(() => import('@/components/chat-panel/MessageTablePanel').then(m => ({ default: m.MessageTablePanel })))
import { initializationService } from '@/services/initialization-service'
import { WindowsTitlebar } from '@/components/windows-titlebar'

export default function DashboardPage() {
  const { user, isAuthenticated, isInitialized, isInitializing } = useAuthStore()
  const [showSideMenu, setShowSideMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showEditPanel, setShowEditPanel] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  // 페이지 마운트 시 초기화 상태 리셋 (새로고침 대응)
  useEffect(() => {
    const { isInitialized: currentlyInitialized, setInitialized, setInitializing } = useAuthStore.getState()
    if (currentlyInitialized) {
      console.log('[Dashboard] Resetting initialization state on mount (page refresh detected)')
      setInitialized(false)
      setInitializing(false)
    }
  }, [])

  // Handle initialization flow
  useEffect(() => {
    async function handleInitialization() {
      if (user && user.id && isAuthenticated && !isInitialized && !isInitializing) {
        console.log('[Dashboard] Starting initialization...')
        const result = await initializationService.initialize()

        if (!result.success) {
          setInitError(result.error || 'Failed to initialize')
        }
      }
    }

    if (user && isAuthenticated) {
      handleInitialization()
    }
  }, [user, isAuthenticated, isInitialized, isInitializing])

  // 인증은 protected layout에서 처리되므로 여기서는 UI만 렌더링
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Windows 타이틀바 (Windows Electron에서만 표시) */}
      <WindowsTitlebar />

      <div className="flex flex-1 min-h-0">
        {showSideMenu && (
          <Suspense fallback={<div className="w-64 bg-gray-100 dark:bg-gray-800 animate-pulse" />}>
            <SideMenu onClose={() => setShowSideMenu(false)} />
          </Suspense>
        )}

        <div className="flex-1 flex flex-col">
          <Header
            onMenuClick={() => setShowSideMenu(true)}
            onSettingsClick={() => setShowSettings(true)}
            onEditClick={() => setShowEditPanel(true)}
          />

          <div className="flex-1 flex flex-col overflow-hidden">
            <ErrorBoundary
              onError={(error, errorInfo) => {
                console.error('Dashboard error:', error, errorInfo)
              }}
            >
              <div className="flex-1 min-h-0">
                <MonitoringPanel />
              </div>
              {/* Order Input Panel */}
              <div className="flex-shrink-0">
                <OrderInputPanel />
              </div>
              {/* Fixed bottom area for message table - 220px height for compact view */}
              <div className="flex-shrink-0 h-[220px] border-t border-gray-200 dark:border-gray-700 overflow-hidden">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600 text-xs">
                      메시지 테이블 로딩중...
                    </div>
                  }
                >
                  <MessageTablePanel />
                </Suspense>
              </div>
            </ErrorBoundary>
          </div>
        </div>

        {showSettings && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-background p-6 rounded-lg w-96">
              <h2 className="text-xl font-bold mb-4">설정</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {/* Initialization Error */}
        {initError && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-background p-6 rounded-lg max-w-md">
              <h2 className="text-xl font-bold mb-2 text-red-500">초기화 오류</h2>
              <p className="text-muted-foreground mb-4">{initError}</p>
              <button
                onClick={() => {
                  setInitError(null)
                  window.location.reload()
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}

        {/* Edit Panel */}
        <EditPanel isOpen={showEditPanel} onClose={() => setShowEditPanel(false)} />
      </div>
    </div>
  )
}

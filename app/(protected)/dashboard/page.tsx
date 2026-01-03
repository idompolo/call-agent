'use client'

import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import { EditPanel } from '@/components/edit-panel/EditPanel'
import { OrderInputPanel } from '@/components/order-input-panel/OrderInputPanel'
import { ErrorBoundary } from '@/components/error-boundary'
import { useAuthStore } from '@/store/auth-store'
import { MonitoringPanelVirtualized as MonitoringPanel } from './components/monitoring-panel-virtualized'
import { Header } from './components/header'
import { BottomPanel } from '@/components/bottom-panel'

// Lazy load 덜 사용되는 컴포넌트들
const SideMenu = lazy(() => import('./components/side-menu').then(m => ({ default: m.SideMenu })))
const OrderEditPanel = lazy(() => import('./components/order-edit-panel').then(m => ({ default: m.OrderEditPanel })))
const OrderControlPanel = lazy(() => import('./components/order-control-panel').then(m => ({ default: m.OrderControlPanel })))
const SmsHistoryPanel = lazy(() => import('@/components/sms-panel').then(m => ({ default: m.SmsHistoryPanel })))
import { initializationService } from '@/services/initialization-service'
import { WindowsTitlebar } from '@/components/windows-titlebar'

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore()
  const [showSideMenu, setShowSideMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showEditPanel, setShowEditPanel] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  // BottomPanel 상태 (RecentOrdersDialog)
  const [showRecentOrders, setShowRecentOrders] = useState(false)
  const [recentOrdersTelephone, setRecentOrdersTelephone] = useState('')

  // 초기화 상태 추적용 ref
  const initRef = useRef({ aborted: false })

  // Handle initialization flow with abort pattern
  useEffect(() => {
    const currentInit = { aborted: false }
    initRef.current = currentInit

    async function handleInitialization() {
      if (!user?.id || !isAuthenticated) return

      // 이전 초기화 상태 리셋
      const { setInitialized, setInitializing } = useAuthStore.getState()
      setInitialized(false)
      setInitializing(false)

      console.log('[Dashboard] Starting initialization...')
      const result = await initializationService.initialize()

      // 새로고침으로 언마운트되었으면 결과 무시
      if (currentInit.aborted) {
        console.log('[Dashboard] Initialization aborted (component unmounted)')
        return
      }

      if (!result.success) {
        setInitError(result.error || 'Failed to initialize')
      }
    }

    handleInitialization()

    // Cleanup: 언마운트 시 abort 플래그 설정
    return () => {
      currentInit.aborted = true
    }
  }, [user, isAuthenticated])

  // 인증은 protected layout에서 처리되므로 여기서는 UI만 렌더링
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      {/* Windows 타이틀바 (Windows Electron에서만 표시) */}
      <WindowsTitlebar />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {showSideMenu && (
          <Suspense fallback={<div className="w-64 bg-gray-100 dark:bg-gray-800 animate-pulse" />}>
            <SideMenu onClose={() => setShowSideMenu(false)} />
          </Suspense>
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
              {/* Main content + Right SMS Panel */}
              <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* Left: Main content area */}
                <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
                  <div className="flex-1 min-h-0">
                    <MonitoringPanel />
                  </div>
                  {/* Order Input Panel - above chat and recent orders dialog */}
                  <div className="flex-shrink-0">
                    <OrderInputPanel
                      showRecentOrders={showRecentOrders}
                      onShowRecentOrders={(telephone) => {
                        setRecentOrdersTelephone(telephone)
                        setShowRecentOrders(true)
                      }}
                      onCloseRecentOrders={() => setShowRecentOrders(false)}
                    />
                  </div>
                  {/* Bottom Panel - Chat + RecentOrdersDialog */}
                  <div className="flex-shrink-0">
                    <BottomPanel
                      showRecentOrders={showRecentOrders}
                      recentOrdersTelephone={recentOrdersTelephone}
                      onCloseRecentOrders={() => setShowRecentOrders(false)}
                    />
                  </div>
                </div>

                {/* Right: SMS History Panel (fixed 320px, always visible) */}
                <div className="flex-shrink-0 w-[320px]">
                  <Suspense
                    fallback={
                      <div className="h-full border-l bg-muted/10 flex items-center justify-center text-gray-400 dark:text-gray-600 text-xs">
                        문자 패널 로딩중...
                      </div>
                    }
                  >
                    <SmsHistoryPanel />
                  </Suspense>
                </div>
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

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
import { LoginDialog } from '@/components/login-dialog'

export default function DashboardPage() {
  const { user, isAuthenticated, isInitialized, isInitializing } = useAuthStore()
  const [showSideMenu, setShowSideMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showEditPanel, setShowEditPanel] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  // Handle initialization flow
  useEffect(() => {
    async function handleInitialization() {
      // Only initialize if user is authenticated AND not already initialized
      if (user && user.id && isAuthenticated && !isInitialized && !isInitializing) {
        console.log('Starting initialization...')
        const result = await initializationService.initialize()
        
        if (!result.success) {
          setInitError(result.error || 'Failed to initialize')
        }
      }
    }

    // Only run if user exists and is authenticated
    if (user && isAuthenticated) {
      handleInitialization()
    }
  }, [user, isAuthenticated, isInitialized, isInitializing])

  // MQTT connection is now handled by useMqtt hook in monitoring-panel

  // Show login dialog if not authenticated
  if (!user || !isAuthenticated) {
    return (
      <div className="flex h-screen bg-background">
        <LoginDialog 
          onClose={() => {
            // 로그인 다이얼로그는 닫을 수 없음 (로그인 필수)
          }} 
          hideCloseButton={true}
        />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background pt-0.5">
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
              <Suspense fallback={
                <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600 text-xs">
                  메시지 테이블 로딩중...
                </div>
              }>
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
      <EditPanel 
        isOpen={showEditPanel} 
        onClose={() => setShowEditPanel(false)} 
      />
    </div>
  )
}
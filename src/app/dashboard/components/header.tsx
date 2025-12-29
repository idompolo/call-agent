'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { useSocketStore } from '@/store/socket-store'
import { Menu, Settings, Users, MessageSquare, LogOut, ChevronDown, Edit3 } from 'lucide-react'
import { AreaSelectorModern } from './area-selector-modern'
import { OrderFilter } from './order-filter'
import { SearchField } from './search-field'
import { CallStatus } from './call-status'
import { LoginDialog } from '@/components/login-dialog'
import { initializationService } from '@/services/initialization-service'

interface HeaderProps {
  onMenuClick: () => void
  onSettingsClick: () => void
  onEditClick?: () => void
}

export function Header({ onMenuClick, onSettingsClick, onEditClick }: HeaderProps) {
  const { user, logout } = useAuthStore()
  const { connectedAgents } = useSocketStore()
  const [showAgents, setShowAgents] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  return (
    <header className="h-10 border-b border-border px-3 flex items-center gap-2">
      {/* 메뉴 버튼 */}
      <button
        onClick={onMenuClick}
        className="p-1.5 hover:bg-accent rounded"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* 지역 선택 */}
      <div className="flex-1">
        <AreaSelectorModern />
      </div>

      {/* 연결된 상담원 수 */}
      <div className="relative">
        <button
          onClick={() => setShowAgents(!showAgents)}
          className="flex items-center gap-1 px-2 py-1 hover:bg-accent rounded text-xs"
        >
          <Users className="h-3 w-3" />
          <span className="font-semibold">{connectedAgents.length}명</span>
        </button>
        
        {showAgents && (
          <div className="absolute top-full right-0 mt-1 bg-popover border rounded-md shadow-lg p-2 min-w-[200px]">
            {connectedAgents.map((agent) => (
              <div key={agent} className="flex items-center gap-2 py-1">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">
                  {agent[0]}
                </div>
                <span>{agent}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 채팅 아이콘 */}
      <button className="relative p-1.5 hover:bg-accent rounded">
        <MessageSquare className="h-4 w-4" />
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
          0
        </span>
      </button>

      {/* 검색 필드 */}
      <SearchField />

      {/* 주문 필터 */}
      <OrderFilter />

      {/* 전화 상태 */}
      <CallStatus />
      
      {/* 데이터 편집 버튼 */}
      {onEditClick && (
        <button
          onClick={onEditClick}
          className="p-1.5 hover:bg-accent rounded"
          title="데이터 관리"
        >
          <Edit3 className="h-4 w-4" />
        </button>
      )}

      {/* 상담원 정보 / 로그인 */}
      {user ? (
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-1 px-2 py-1 hover:bg-accent rounded transition-colors"
          >
            <div className="text-xs font-medium">
              {user.name}
            </div>
            <ChevronDown className={`h-3 w-3 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>
          
          {showUserMenu && (
            <div className="absolute top-full right-0 mt-1 bg-popover border rounded-md shadow-lg py-1 min-w-[180px] z-50">
              <div className="px-3 py-2 text-sm border-b">
                <div className="font-medium">{user.name}</div>
                <div className="text-xs text-muted-foreground">ID: {user.id}</div>
              </div>
              <button
                onClick={async () => {
                  // Reset initialization state
                  await initializationService.reset()
                  
                  logout()
                  if (typeof window !== 'undefined') {
                    // Clear all localStorage
                    window.localStorage.clear()
                    // Force page reload to clear all state
                    window.location.reload()
                  }
                  setShowUserMenu(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowLoginDialog(true)}
          className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          로그인
        </button>
      )}

      {/* 설정 버튼 */}
      <button
        onClick={onSettingsClick}
        className="p-1.5 hover:bg-accent rounded"
      >
        <Settings className="h-4 w-4" />
      </button>

      {/* 로그인 다이얼로그 */}
      {showLoginDialog && (
        <LoginDialog onClose={() => setShowLoginDialog(false)} />
      )}
    </header>
  )
}
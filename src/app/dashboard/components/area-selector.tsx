'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useOrderStore } from '@/store/order-store'

// Flutter의 areaItems와 동일한 지역 코드 (미군 기지)
const areaItems = ['all', 's=', 'c=', 'o=', 'p=', 'k=', 'w=', 'a=', 'y=', 't='] as const

// 미군 기지 이름 매핑
const baseNames: Record<string, string> = {
  'all': '전체',
  't=': 'Test',
  'c=': 'Casey',
  's=': 'Asan',
  'y=': 'Yongsan',
  'o=': 'Osan',
  'p=': 'Humphreys',
  'k=': 'Gunsan',
  'a=': 'Carroll',
  'w=': 'Walker'
}

export function AreaSelector() {
  const { areaFilter, setAreaFilter } = useOrderStore()
  const [showContextMenu, setShowContextMenu] = useState<{ x: number; y: number; area: string } | null>(null)

  const handleAreaClick = (area: string) => {
    if (area === 'all') {
      // 'all'이 선택되면 모든 지역 선택 또는 해제
      if (areaFilter.length === areaItems.length) {
        setAreaFilter([])
      } else {
        setAreaFilter([...areaItems])
      }
    } else {
      // 개별 지역 토글
      if (areaFilter.includes(area)) {
        setAreaFilter(areaFilter.filter(a => a !== area))
      } else {
        setAreaFilter([...areaFilter, area])
      }
    }
  }

  const isAreaChecked = (area: string): boolean => {
    if (area === 'all') {
      return areaFilter.length === areaItems.length
    }
    return areaFilter.includes(area)
  }

  const handleContextMenu = (e: React.MouseEvent, area: string) => {
    e.preventDefault()
    if (area !== 'all') {
      setShowContextMenu({ x: e.clientX, y: e.clientY, area })
    }
  }

  const handleSendMessage = () => {
    if (showContextMenu) {
      // TODO: 지역 기사에게 앱 메시지 보내기 기능 구현
      console.log(`Send message to area: ${showContextMenu.area}`)
      setShowContextMenu(null)
    }
  }

  return (
    <>
      <div className="flex items-center gap-1 overflow-x-auto">
        {areaItems.map((area) => (
          <button
            key={area}
            onClick={() => handleAreaClick(area)}
            onContextMenu={(e) => handleContextMenu(e, area)}
            className={cn(
              "min-w-[60px] h-[35px] rounded-full flex items-center justify-center px-3",
              "font-semibold text-[14px] transition-colors whitespace-nowrap",
              area === 'all' && "min-w-[50px]",
              isAreaChecked(area)
                ? "bg-primary text-background"
                : "bg-muted text-muted-foreground/40 hover:bg-muted/80"
            )}
          >
            {baseNames[area] || area.replace('=', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <>
          <div 
            className="fixed inset-0 z-50" 
            onClick={() => setShowContextMenu(null)}
            onContextMenu={(e) => e.preventDefault()}
          />
          <div 
            className="fixed z-50 bg-popover border rounded-md shadow-lg py-1 min-w-[200px]"
            style={{ left: showContextMenu.x, top: showContextMenu.y }}
          >
            <button
              onClick={handleSendMessage}
              className="w-full px-3 py-2 text-sm text-left hover:bg-accent"
            >
              기지 기사에게 앱 메세지 보내기
            </button>
          </div>
        </>
      )}
    </>
  )
}
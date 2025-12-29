'use client'

import { useState } from 'react'
import { MapPin, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrderStore } from '@/store/order-store'

// Flutter의 areaItems와 동일한 지역 코드 (미군 기지)
const areaItems = ['all', 's=', 'c=', 'o=', 'p=', 'k=', 'w=', 'a=', 'y=', 't='] as const

// 미군 기지 이름 매핑
const areaNames: Record<string, string> = {
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

// 기지별 색상 매핑
const areaColors: Record<string, string> = {
  't=': 'bg-gray-500',
  'c=': 'bg-green-500',
  's=': 'bg-blue-500',
  'y=': 'bg-purple-500',
  'o=': 'bg-orange-500',
  'p=': 'bg-red-500',
  'k=': 'bg-yellow-500',
  'a=': 'bg-pink-500',
  'w=': 'bg-cyan-500'
}

export function AreaSelectorModern() {
  const { areaFilter, setAreaFilter } = useOrderStore()
  const [isOpen, setIsOpen] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState<{ x: number; y: number; area: string } | null>(null)

  const handleAreaClick = (area: string) => {
    if (area === 'all') {
      if (areaFilter.length === areaItems.length) {
        setAreaFilter([])
      } else {
        setAreaFilter([...areaItems])
      }
    } else {
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

  const selectedCount = areaFilter.filter(a => a !== 'all').length
  const getButtonText = () => {
    if (areaFilter.length === 0) return '기지 선택'
    if (areaFilter.includes('all') || areaFilter.length === areaItems.length) return '전체 기지'
    if (selectedCount === 1) return areaNames[areaFilter.find(a => a !== 'all')!]
    return `${selectedCount}개 기지`
  }

  return (
    <>
      <div className="relative">
        {/* Option 1: 드롭다운 스타일 (기본) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 border rounded-md transition-all",
            "hover:bg-accent hover:border-accent-foreground/20",
            "w-[140px]", // Fixed width
            isOpen && "bg-accent border-accent-foreground/20"
          )}
        >
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium truncate flex-1 text-left">{getButtonText()}</span>
          {selectedCount > 0 && selectedCount < areaItems.length - 1 && (
            <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full flex-shrink-0">
              {selectedCount}
            </span>
          )}
        </button>

        {/* 드롭다운 메뉴 */}
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full left-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 w-[320px] max-h-[400px] overflow-y-auto p-2">
              {/* 전체 선택 */}
              <button
                onClick={() => handleAreaClick('all')}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md transition-colors",
                  "hover:bg-accent",
                  isAreaChecked('all') && "bg-accent"
                )}
              >
                <span className="text-sm font-medium">전체 선택</span>
                <div className={cn(
                  "w-4 h-4 rounded border transition-all",
                  isAreaChecked('all') 
                    ? "bg-primary border-primary" 
                    : "border-input"
                )}>
                  {isAreaChecked('all') && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
              </button>

              <div className="my-2 h-px bg-border" />

              {/* 개별 지역 선택 */}
              <div className="grid grid-cols-2 gap-1">
                {areaItems.slice(1).map((area) => (
                  <button
                    key={area}
                    onClick={() => handleAreaClick(area)}
                    onContextMenu={(e) => handleContextMenu(e, area)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
                      "hover:bg-accent",
                      isAreaChecked(area) && "bg-accent"
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      areaColors[area] || "bg-gray-400"
                    )} />
                    <span className="text-sm">{areaNames[area]}</span>
                    {isAreaChecked(area) && (
                      <Check className="h-3 w-3 ml-auto text-primary" />
                    )}
                  </button>
                ))}
              </div>

              {/* 선택된 지역 표시 */}
              {(selectedCount > 0 || isAreaChecked('all')) && (
                <>
                  <div className="my-2 h-px bg-border" />
                  <div className="px-3 py-2">
                    <p className="text-xs text-muted-foreground mb-2">선택된 기지</p>
                    <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto">
                      {(isAreaChecked('all') ? areaItems.slice(1) : areaFilter.filter(a => a !== 'all')).map((area) => (
                        <span
                          key={area}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs"
                        >
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            areaColors[area] || "bg-gray-400"
                          )} />
                          {areaNames[area]}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAreaClick(area)
                            }}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
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
              onClick={() => {
                console.log(`Send message to area: ${showContextMenu.area}`)
                setShowContextMenu(null)
              }}
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
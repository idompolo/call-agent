'use client'

import { useState } from 'react'
import { Plus, X, MapPin } from 'lucide-react'
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

// 기지별 색상 매핑 (더 부드러운 색상)
const areaColors: Record<string, { bg: string; text: string; border: string }> = {
  't=': { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-800' },
  'c=': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  's=': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  'y=': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  'o=': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  'p=': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
  'k=': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800' },
  'a=': { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800' },
  'w=': { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' }
}

export function AreaSelectorPills() {
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

  const removeArea = (area: string) => {
    setAreaFilter(areaFilter.filter(a => a !== area))
  }

  const selectedAreas = areaFilter.filter(a => a !== 'all')
  const isAllSelected = areaFilter.includes('all') || areaFilter.length === areaItems.length

  return (
    <>
      <div className="flex items-center gap-2">
        {/* 선택된 지역 Pills */}
        {isAllSelected ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
            <MapPin className="h-3.5 w-3.5" />
            전체 기지
          </div>
        ) : selectedAreas.length > 0 ? (
          <div className="flex items-center gap-1 flex-wrap">
            {selectedAreas.map((area) => {
              const colors = areaColors[area] || areaColors['y=']
              return (
                <div
                  key={area}
                  onContextMenu={(e) => handleContextMenu(e, area)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border transition-all",
                    colors.bg,
                    colors.text,
                    colors.border,
                    "hover:shadow-sm"
                  )}
                >
                  <span>{areaNames[area]}</span>
                  <button
                    onClick={() => removeArea(area)}
                    className={cn(
                      "ml-0.5 rounded-full p-0.5 transition-colors",
                      "hover:bg-black/10 dark:hover:bg-white/10"
                    )}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground px-2">기지를 선택하세요</span>
        )}

        {/* 추가 버튼 */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
              "border border-dashed hover:border-solid",
              isOpen ? "bg-accent border-accent-foreground/20" : "hover:bg-accent"
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            기지 추가
          </button>

          {/* 드롭다운 메뉴 */}
          {isOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 min-w-[260px] p-2">
                {/* 전체 선택 */}
                <button
                  onClick={() => {
                    handleAreaClick('all')
                    setIsOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md transition-colors",
                    "hover:bg-accent",
                    isAllSelected && "bg-accent"
                  )}
                >
                  <span className="text-sm font-medium">전체 선택</span>
                </button>

                <div className="my-1.5 h-px bg-border" />

                {/* 개별 지역 */}
                {areaItems.slice(1).map((area) => {
                  const colors = areaColors[area] || areaColors['y=']
                  const isChecked = isAreaChecked(area)
                  
                  return (
                    <button
                      key={area}
                      onClick={() => {
                        handleAreaClick(area)
                        if (!isChecked) setIsOpen(false)
                      }}
                      disabled={isChecked}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-left",
                        !isChecked && "hover:bg-accent",
                        isChecked && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        colors.bg,
                        colors.border,
                        "border"
                      )} />
                      <span className="text-sm">{areaNames[area]}</span>
                      {isChecked && (
                        <span className="ml-auto text-xs text-muted-foreground">선택됨</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
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
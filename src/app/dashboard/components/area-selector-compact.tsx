'use client'

import { useState } from 'react'
import { MapPin, ChevronDown } from 'lucide-react'
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

// 짧은 이름 매핑
const shortNames: Record<string, string> = {
  'all': 'ALL',
  't=': 'T',
  'c=': 'C',
  's=': 'A',
  'y=': 'Y',
  'o=': 'O',
  'p=': 'H',
  'k=': 'G',
  'a=': 'CR',
  'w=': 'W'
}

export function AreaSelectorCompact() {
  const { areaFilter, setAreaFilter } = useOrderStore()
  const [isExpanded, setIsExpanded] = useState(false)
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

  return (
    <>
      <div className="relative">
        {/* 컴팩트 뷰 */}
        <div className={cn(
          "flex items-center border rounded-lg transition-all",
          isExpanded && "shadow-sm bg-accent/50"
        )}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent rounded-l-lg transition-colors"
          >
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-medium">
              {areaFilter.length === 0 ? '기지' : 
               areaFilter.includes('all') || areaFilter.length === areaItems.length ? '전체' : 
               `${selectedCount}개 기지`}
            </span>
            <ChevronDown className={cn(
              "h-3.5 w-3.5 transition-transform",
              isExpanded && "rotate-180"
            )} />
          </button>

          {/* 인라인 토글 버튼들 */}
          <div className="flex items-center border-l">
            {areaItems.map((area, index) => (
              <button
                key={area}
                onClick={() => handleAreaClick(area)}
                onContextMenu={(e) => handleContextMenu(e, area)}
                className={cn(
                  "px-2.5 py-1.5 text-xs font-bold transition-all relative",
                  "hover:bg-accent",
                  index === 0 && "rounded-none",
                  index === areaItems.length - 1 && "rounded-r-lg",
                  isAreaChecked(area) 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "text-muted-foreground",
                  area === 'all' && "border-r mr-1"
                )}
              >
                {shortNames[area]}
                {/* 선택 인디케이터 */}
                {isAreaChecked(area) && area !== 'all' && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-foreground rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 확장된 정보 패널 */}
        {isExpanded && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsExpanded(false)}
            />
            <div className="absolute top-full left-0 mt-2 bg-popover border rounded-lg shadow-lg z-50 min-w-[360px] p-4">
              <h4 className="text-sm font-semibold mb-3">기지별 선택 상태</h4>
              
              <div className="grid grid-cols-3 gap-2">
                {areaItems.slice(1).map((area) => {
                  const isChecked = isAreaChecked(area)
                  return (
                    <button
                      key={area}
                      onClick={() => handleAreaClick(area)}
                      onContextMenu={(e) => handleContextMenu(e, area)}
                      className={cn(
                        "flex items-center justify-between gap-2 px-3 py-2 rounded-md border transition-all",
                        isChecked 
                          ? "bg-primary/10 border-primary/50 text-primary" 
                          : "hover:bg-accent border-transparent"
                      )}
                    >
                      <span className="text-sm font-medium">{areaNames[area]}</span>
                      <span className="text-xs text-muted-foreground">
                        {shortNames[area]}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* 통계 정보 */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">선택된 기지</span>
                  <span className="font-medium">
                    {areaFilter.includes('all') || areaFilter.length === areaItems.length 
                      ? '전체 (9개)' 
                      : `${selectedCount}개`}
                  </span>
                </div>
              </div>
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
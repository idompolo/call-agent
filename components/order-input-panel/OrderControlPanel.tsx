'use client'

import { useState, useEffect } from 'react'
import { Phone, MessageSquare, Send, Users, FileText, Search, Map, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickButton {
  id: string
  label: string
  area: string
  place: string
}

interface OrderControlPanelProps {
  className?: string
}

export function OrderControlPanel({ className }: OrderControlPanelProps) {
  const [quickButtons, setQuickButtons] = useState<QuickButton[]>([
    { id: '1', label: '서울역', area: 's=', place: '서울역' },
    { id: '2', label: '강남역', area: 's=', place: '강남역' },
    { id: '3', label: '인천공항', area: 'c=', place: '인천공항' },
    { id: '4', label: '김포공항', area: 'o=', place: '김포공항' },
    { id: '5', label: '서울대병원', area: 's=', place: '서울대병원' },
    { id: '6', label: '삼성병원', area: 's=', place: '삼성병원' },
  ])
  
  const [areaGroups] = useState([
    { code: 's=', label: '서울', items: ['서울역', '강남역', '서울대병원', '삼성병원'] },
    { code: 'c=', label: '인천', items: ['인천공항', '인천터미널'] },
    { code: 'o=', label: '경기', items: ['김포공항', '수원역'] },
  ])
  
  const handleQuickButtonClick = (button: QuickButton) => {
    console.log('Quick button clicked:', button)
    // TODO: Set call place to the button's place
  }
  
  const handleFunctionKey = (key: string) => {
    console.log('Function key:', key)
    // TODO: Handle function key actions
  }
  
  return (
    <div className={cn(
      "bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700",
      className
    )}>
      <div className="flex h-full pt-0.5 px-1">
        {/* Quick Place Buttons - Left Side */}
        <div className="flex-1 flex items-center gap-1">
          {areaGroups.map((group) => (
            <div key={group.code} className="flex items-center gap-0.5">
              {/* Area Code Label */}
              <div className="px-1.5 py-0.5 bg-blue-600 text-white font-bold text-[9px] rounded-sm">
                {group.label}
              </div>
              
              {/* Quick Buttons */}
              {group.items.slice(0, 3).map((item, idx) => (
                <button
                  key={`${group.code}-${idx}`}
                  onClick={() => handleQuickButtonClick({ 
                    id: `${group.code}-${idx}`, 
                    label: item, 
                    area: group.code, 
                    place: item 
                  })}
                  className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-[9px] text-gray-700 dark:text-gray-300 rounded-sm transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          ))}
        </div>
        
        {/* Function Keys - Right Side */}
        <div className="flex items-center gap-0.5 border-l border-gray-200 dark:border-gray-700 pl-1">
          <button
            onClick={() => handleFunctionKey('F1')}
            className="px-1.5 py-0.5 bg-purple-600 text-white text-[9px] rounded-sm hover:bg-purple-700 transition-colors"
            title="고객 앱메시지"
          >
            F1
          </button>
          
          <button
            onClick={() => handleFunctionKey('F2')}
            className="px-1.5 py-0.5 bg-green-600 text-white text-[9px] rounded-sm hover:bg-green-700 transition-colors"
            title="고객 문자"
          >
            F2
          </button>
          
          <button
            onClick={() => handleFunctionKey('F3')}
            className="px-1.5 py-0.5 bg-blue-600 text-white text-[9px] rounded-sm hover:bg-blue-700 transition-colors"
            title="기사 앱메시지"
          >
            F3
          </button>
          
          <button
            onClick={() => handleFunctionKey('F4')}
            className="px-1.5 py-0.5 bg-indigo-600 text-white text-[9px] rounded-sm hover:bg-indigo-700 transition-colors"
            title="기사 정보"
          >
            F4
          </button>
          
          <button
            onClick={() => handleFunctionKey('F6')}
            className="px-1.5 py-0.5 bg-orange-600 text-white text-[9px] rounded-sm hover:bg-orange-700 transition-colors"
            title="강제 발신"
          >
            F6
          </button>
          
          <button
            onClick={() => handleFunctionKey('F7')}
            className="px-1.5 py-0.5 bg-teal-600 text-white text-[9px] rounded-sm hover:bg-teal-700 transition-colors"
            title="이력 조회"
          >
            F7
          </button>
          
          <button
            onClick={() => handleFunctionKey('F9')}
            className="px-1.5 py-0.5 bg-pink-600 text-white text-[9px] rounded-sm hover:bg-pink-700 transition-colors"
            title="전체 보기"
          >
            F9
          </button>
          
          <button
            onClick={() => handleFunctionKey('F10')}
            className="px-1.5 py-0.5 bg-yellow-600 text-white text-[9px] rounded-sm hover:bg-yellow-700 transition-colors"
            title="접수+체크콜"
          >
            F10
          </button>
        </div>
      </div>
    </div>
  )
}
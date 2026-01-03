'use client'

import { useState } from 'react'
import { Search, Calendar, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export function SearchPanel() {
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState({
    from: new Date(),
    to: new Date()
  })

  return (
    <div className="border rounded-lg p-4 bg-card">
      <h3 className="text-lg font-semibold mb-4">상세 검색</h3>
      
      <div className="space-y-4">
        {/* 검색어 입력 */}
        <div>
          <label className="text-sm font-medium mb-1 block">검색어</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="전화번호, 고객명, 주소 등"
              className="w-full pl-10 pr-3 py-2 border rounded-md"
            />
          </div>
        </div>

        {/* 날짜 범위 */}
        <div>
          <label className="text-sm font-medium mb-1 block">기간</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={format(dateRange.from, 'yyyy-MM-dd')}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: new Date(e.target.value) }))}
              className="flex-1 px-3 py-2 border rounded-md"
            />
            <span className="flex items-center px-2">~</span>
            <input
              type="date"
              value={format(dateRange.to, 'yyyy-MM-dd')}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: new Date(e.target.value) }))}
              className="flex-1 px-3 py-2 border rounded-md"
            />
          </div>
        </div>

        {/* 검색 버튼 */}
        <button className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          검색
        </button>
      </div>
    </div>
  )
}
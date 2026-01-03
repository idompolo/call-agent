'use client'

import { useState } from 'react'
import { AreaSelector } from './area-selector'
import { AreaSelectorModern } from './area-selector-modern'
import { AreaSelectorPills } from './area-selector-pills'
import { AreaSelectorCompact } from './area-selector-compact'

export function AreaSelectorDemo() {
  const [selectedDesign, setSelectedDesign] = useState<'original' | 'modern' | 'pills' | 'compact'>('modern')

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold mb-2">미군 기지 선택기 디자인 옵션</h2>
        <p className="text-muted-foreground">
          Next.js 앱에 더 어울리는 모던한 디자인을 선택하세요 (미군 기지: Test, Casey, Asan, Yongsan, Osan, Humphreys, Gunsan, Carroll, Walker)
        </p>
      </div>

      {/* 디자인 선택 탭 */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setSelectedDesign('original')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedDesign === 'original' 
              ? 'bg-background shadow-sm' 
              : 'hover:bg-background/50'
          }`}
        >
          원본 (Flutter 스타일)
        </button>
        <button
          onClick={() => setSelectedDesign('modern')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedDesign === 'modern' 
              ? 'bg-background shadow-sm' 
              : 'hover:bg-background/50'
          }`}
        >
          모던 드롭다운
        </button>
        <button
          onClick={() => setSelectedDesign('pills')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedDesign === 'pills' 
              ? 'bg-background shadow-sm' 
              : 'hover:bg-background/50'
          }`}
        >
          Pills/Tags 스타일
        </button>
        <button
          onClick={() => setSelectedDesign('compact')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedDesign === 'compact' 
              ? 'bg-background shadow-sm' 
              : 'hover:bg-background/50'
          }`}
        >
          컴팩트 토글
        </button>
      </div>

      {/* 선택된 디자인 미리보기 */}
      <div className="border rounded-lg p-6 bg-background">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">
            {selectedDesign === 'original' && '원본 디자인 (Flutter 스타일) - 미군 기지'}
            {selectedDesign === 'modern' && '모던 드롭다운 디자인'}
            {selectedDesign === 'pills' && 'Pills/Tags 스타일'}
            {selectedDesign === 'compact' && '컴팩트 토글 디자인'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {selectedDesign === 'original' && '기존 Flutter 앱과 동일한 원형 버튼 스타일 - 미군 기지 표시'}
            {selectedDesign === 'modern' && '체크박스와 색상 인디케이터가 있는 깔끔한 드롭다운'}
            {selectedDesign === 'pills' && '선택된 지역을 태그 형태로 표시하는 모던한 스타일'}
            {selectedDesign === 'compact' && '공간을 절약하는 인라인 토글 버튼 스타일'}
          </p>
        </div>

        <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-md">
          <span className="text-sm font-medium">헤더에서의 모습:</span>
          {selectedDesign === 'original' && <AreaSelector />}
          {selectedDesign === 'modern' && <AreaSelectorModern />}
          {selectedDesign === 'pills' && <AreaSelectorPills />}
          {selectedDesign === 'compact' && <AreaSelectorCompact />}
        </div>
      </div>

      {/* 특징 설명 */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">모던 드롭다운</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 깔끔한 체크박스 UI</li>
              <li>• 색상 인디케이터로 기지 구분</li>
              <li>• 선택된 기지 요약 표시</li>
              <li>• Next.js 앱의 다른 드롭다운과 일관된 스타일</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Pills/Tags 스타일</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 선택된 기지를 시각적으로 명확하게 표시</li>
              <li>• 각 기지별 고유 색상</li>
              <li>• 쉬운 제거 기능 (X 버튼)</li>
              <li>• 모던 웹 앱에서 자주 사용되는 패턴</li>
            </ul>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">컴팩트 토글</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 최소한의 공간 사용</li>
              <li>• 빠른 토글 기능</li>
              <li>• 확장 시 상세 정보 표시</li>
              <li>• 모바일 친화적인 디자인</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">공통 기능</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 우클릭으로 기지 기사 메시지 전송</li>
              <li>• 전체 선택/해제 기능</li>
              <li>• 부드러운 애니메이션</li>
              <li>• 다크 모드 지원</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
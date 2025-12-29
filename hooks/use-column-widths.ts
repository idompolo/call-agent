'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// 기본 컬럼 너비 설정 (픽셀 단위)
export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  date: 40,
  time: 65,
  telephone: 100,
  customerName: 140,
  calldong: 100,
  callplace: 0, // flex-1, 자동 확장
  sms: 80,
  memo: 100,
  poi: 150,
  distance: 70,
  drvNo: 55,
  licensePlate: 70,
  acceptTime: 80,
  agents: 50,
  status: 70,
}

// 최소 컬럼 너비 (리사이즈 제한)
export const MIN_COLUMN_WIDTHS: Record<string, number> = {
  date: 30,
  time: 50,
  telephone: 70,
  customerName: 80,
  calldong: 60,
  callplace: 0, // flex는 리사이즈 불가
  sms: 50,
  memo: 60,
  poi: 80,
  distance: 50,
  drvNo: 40,
  licensePlate: 50,
  acceptTime: 60,
  agents: 40,
  status: 50,
}

// 최대 컬럼 너비
export const MAX_COLUMN_WIDTHS: Record<string, number> = {
  date: 80,
  time: 100,
  telephone: 150,
  customerName: 250,
  calldong: 200,
  callplace: 0, // flex는 리사이즈 불가
  sms: 150,
  memo: 200,
  poi: 300,
  distance: 120,
  drvNo: 100,
  licensePlate: 120,
  acceptTime: 120,
  agents: 100,
  status: 120,
}

const STORAGE_KEY = 'monitoring-panel-column-widths'

export interface UseColumnWidthsReturn {
  columnWidths: Record<string, number>
  setColumnWidth: (columnId: string, width: number) => void
  resetColumnWidths: () => void
  isResizing: boolean
  resizingColumn: string | null
  startResize: (columnId: string, startX: number) => void
  onResize: (currentX: number) => void
  endResize: () => void
}

export function useColumnWidths(): UseColumnWidthsReturn {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_COLUMN_WIDTHS)
  const [isResizing, setIsResizing] = useState(false)
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)

  const resizeStartX = useRef<number>(0)
  const resizeStartWidth = useRef<number>(0)

  // localStorage에서 저장된 너비 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // 저장된 값과 기본값을 병합 (새로운 컬럼이 추가될 경우 대비)
        setColumnWidths(prev => ({
          ...prev,
          ...parsed
        }))
      }
    } catch (error) {
      console.error('컬럼 너비 로드 실패:', error)
    }
  }, [])

  // localStorage에 저장
  const saveToStorage = useCallback((widths: Record<string, number>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widths))
    } catch (error) {
      console.error('컬럼 너비 저장 실패:', error)
    }
  }, [])

  // 단일 컬럼 너비 설정
  const setColumnWidth = useCallback((columnId: string, width: number) => {
    // 최소/최대 너비 제한 적용
    const minWidth = MIN_COLUMN_WIDTHS[columnId] || 30
    const maxWidth = MAX_COLUMN_WIDTHS[columnId] || 500
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, width))

    setColumnWidths(prev => {
      const newWidths = {
        ...prev,
        [columnId]: clampedWidth
      }
      saveToStorage(newWidths)
      return newWidths
    })
  }, [saveToStorage])

  // 기본 너비로 리셋
  const resetColumnWidths = useCallback(() => {
    setColumnWidths(DEFAULT_COLUMN_WIDTHS)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  // 리사이즈 시작
  const startResize = useCallback((columnId: string, startX: number) => {
    // callplace는 flex이므로 리사이즈 불가
    if (columnId === 'callplace') return

    setIsResizing(true)
    setResizingColumn(columnId)
    resizeStartX.current = startX
    resizeStartWidth.current = columnWidths[columnId] || DEFAULT_COLUMN_WIDTHS[columnId]
  }, [columnWidths])

  // 리사이즈 중
  const onResize = useCallback((currentX: number) => {
    if (!isResizing || !resizingColumn) return

    const delta = currentX - resizeStartX.current
    const newWidth = resizeStartWidth.current + delta

    // 실시간으로 너비 업데이트 (저장은 하지 않음)
    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: Math.max(
        MIN_COLUMN_WIDTHS[resizingColumn] || 30,
        Math.min(MAX_COLUMN_WIDTHS[resizingColumn] || 500, newWidth)
      )
    }))
  }, [isResizing, resizingColumn])

  // 리사이즈 종료
  const endResize = useCallback(() => {
    if (isResizing) {
      // 최종 값을 localStorage에 저장
      saveToStorage(columnWidths)
    }
    setIsResizing(false)
    setResizingColumn(null)
  }, [isResizing, columnWidths, saveToStorage])

  return {
    columnWidths,
    setColumnWidth,
    resetColumnWidths,
    isResizing,
    resizingColumn,
    startResize,
    onResize,
    endResize,
  }
}

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ==================== 모니터링 패널 컬럼 설정 ====================
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

// ==================== 최근 주문 다이얼로그 컬럼 설정 ====================
export const RECENT_ORDER_DEFAULT_WIDTHS: Record<string, number> = {
  insertAt: 130,      // 접수시각
  customerName: 120,  // 고객명
  telephone: 85,      // 전화번호
  calldong: 120,      // 목적지
  callplace: 0,       // 호출장소 (flex-1)
  callNoActions: 480, // 콜번호 + 액션
  statusAt: 55,       // 처리시간
  status: 75,         // 상태
  agents: 40,         // 접_배
  memo: 80,           // 메모
}

export const RECENT_ORDER_MIN_WIDTHS: Record<string, number> = {
  insertAt: 80,
  customerName: 60,
  telephone: 70,
  calldong: 60,
  callplace: 0,       // flex는 리사이즈 불가
  callNoActions: 100,
  statusAt: 45,
  status: 50,
  agents: 30,
  memo: 50,
}

export const RECENT_ORDER_MAX_WIDTHS: Record<string, number> = {
  insertAt: 200,
  customerName: 200,
  telephone: 150,
  calldong: 250,
  callplace: 0,       // flex는 리사이즈 불가
  callNoActions: 800,
  statusAt: 100,
  status: 120,
  agents: 80,
  memo: 200,
}

// ==================== Storage Keys ====================
const STORAGE_KEY = 'monitoring-panel-column-widths'
const RECENT_ORDER_STORAGE_KEY = 'recent-order-dialog-column-widths'

export interface UseColumnWidthsReturn {
  columnWidths: Record<string, number>
  setColumnWidth: (columnId: string, width: number) => void
  resetColumnWidths: () => void
  isResizing: boolean
  resizingColumn: string | null
  startResize: (columnId: string, startX: number, direction?: 'right' | 'left') => void
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

// ==================== 최근 주문 다이얼로그용 훅 ====================
export function useRecentOrderColumnWidths(): UseColumnWidthsReturn {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(RECENT_ORDER_DEFAULT_WIDTHS)
  const [isResizing, setIsResizing] = useState(false)
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)

  const resizeStartX = useRef<number>(0)
  const resizeStartWidth = useRef<number>(0)
  const resizeDirection = useRef<'right' | 'left'>('right')

  // localStorage에서 저장된 너비 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_ORDER_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setColumnWidths(prev => ({
          ...prev,
          ...parsed
        }))
      }
    } catch (error) {
      console.error('최근 주문 컬럼 너비 로드 실패:', error)
    }
  }, [])

  // localStorage에 저장
  const saveToStorage = useCallback((widths: Record<string, number>) => {
    try {
      localStorage.setItem(RECENT_ORDER_STORAGE_KEY, JSON.stringify(widths))
    } catch (error) {
      console.error('최근 주문 컬럼 너비 저장 실패:', error)
    }
  }, [])

  // 단일 컬럼 너비 설정
  const setColumnWidth = useCallback((columnId: string, width: number) => {
    const minWidth = RECENT_ORDER_MIN_WIDTHS[columnId] || 30
    const maxWidth = RECENT_ORDER_MAX_WIDTHS[columnId] || 500
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
    setColumnWidths(RECENT_ORDER_DEFAULT_WIDTHS)
    localStorage.removeItem(RECENT_ORDER_STORAGE_KEY)
  }, [])

  // 리사이즈 시작
  const startResize = useCallback((columnId: string, startX: number, direction: 'right' | 'left' = 'right') => {
    setIsResizing(true)
    setResizingColumn(columnId)
    resizeStartX.current = startX
    resizeStartWidth.current = columnWidths[columnId] || RECENT_ORDER_DEFAULT_WIDTHS[columnId]
    resizeDirection.current = direction
  }, [columnWidths])

  // 리사이즈 중
  const onResize = useCallback((currentX: number) => {
    if (!isResizing || !resizingColumn) return

    const delta = currentX - resizeStartX.current
    // 왼쪽 핸들의 경우 델타를 반대로 적용 (왼쪽으로 드래그 = 넓어짐)
    const adjustedDelta = resizeDirection.current === 'left' ? -delta : delta
    const newWidth = resizeStartWidth.current + adjustedDelta

    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: Math.max(
        RECENT_ORDER_MIN_WIDTHS[resizingColumn] || 30,
        Math.min(RECENT_ORDER_MAX_WIDTHS[resizingColumn] || 500, newWidth)
      )
    }))
  }, [isResizing, resizingColumn])

  // 리사이즈 종료
  const endResize = useCallback(() => {
    if (isResizing) {
      // 최신 columnWidths를 가져오기 위해 setState 콜백 사용
      setColumnWidths(currentWidths => {
        saveToStorage(currentWidths)
        return currentWidths
      })
    }
    setIsResizing(false)
    setResizingColumn(null)
  }, [isResizing, saveToStorage])

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

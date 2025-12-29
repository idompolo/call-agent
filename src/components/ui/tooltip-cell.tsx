'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface TooltipCellProps {
  content: string
  className?: string
  tooltipClassName?: string
  children?: React.ReactNode
}

export function TooltipCell({ content, className, tooltipClassName, children }: TooltipCellProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const cellRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      if (cellRef.current) {
        const rect = cellRef.current.getBoundingClientRect()
        const cellWidth = cellRef.current.offsetWidth
        const textWidth = cellRef.current.scrollWidth
        
        // Only show tooltip if text is truncated
        if (textWidth > cellWidth) {
          setTooltipPosition({
            top: rect.bottom + window.scrollY + 4,
            left: rect.left + window.scrollX + rect.width / 2,
          })
          setShowTooltip(true)
        }
      }
    }, 100) // Show after 100ms
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setShowTooltip(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <>
      <div
        ref={cellRef}
        className={cn("truncate", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children || content}
      </div>
      {showTooltip && typeof document !== 'undefined' && createPortal(
        <div
          className={cn(
            "fixed z-[9999] px-3 py-2 bg-popover text-popover-foreground rounded-md shadow-lg border-2",
            "animate-in fade-in-0 zoom-in-95",
            "backdrop-blur-sm",
            tooltipClassName
          )}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: 'translateX(-50%) scale(1.2)',
            pointerEvents: 'none',
          }}
        >
          <div className="text-sm font-medium">
            {content}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
'use client'

import { useState, useRef, useEffect, KeyboardEvent, FocusEvent } from 'react'
import { cn } from '@/lib/utils'

interface SyncAutocompleteProps<T> {
  value: string
  onChange: (value: string) => void
  onSelect?: (item: T) => void
  getSuggestions: (searchValue: string) => T[]
  suggestionBuilder: (item: T) => React.ReactNode
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  className?: string
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  onFocus?: (e: FocusEvent<HTMLInputElement>) => void
  icon?: React.ReactNode
  maxListHeight?: number
  inputRef?: React.RefObject<HTMLInputElement>
  showDropdownOnReadOnly?: boolean // readOnly 상태에서도 드롭다운 표시 여부
}

export function SyncAutocomplete<T>({
  value,
  onChange,
  onSelect,
  getSuggestions,
  suggestionBuilder,
  placeholder,
  disabled = false,
  readOnly = false,
  className,
  onKeyDown,
  onFocus,
  icon,
  maxListHeight = 200,
  inputRef: externalRef,
  showDropdownOnReadOnly = false
}: SyncAutocompleteProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<T[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const internalRef = useRef<HTMLInputElement>(null)
  const inputRef = externalRef || internalRef
  const dropdownRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly && !showDropdownOnReadOnly) return
    
    const newValue = e.target.value
    onChange(newValue)
    
    if (newValue.trim()) {
      const results = getSuggestions(newValue)
      setSuggestions(results)
      setIsOpen(results.length > 0)
      setSelectedIndex(-1)
    } else {
      setIsOpen(false)
      setSuggestions([])
    }
  }
  
  // Handle suggestion selection
  const handleSelectSuggestion = (item: T, index: number) => {
    onSelect?.(item)
    setIsOpen(false)
    setSuggestions([])
    setSelectedIndex(-1)
  }
  
  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (isOpen && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          )
          break
        case 'Enter':
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            e.preventDefault()
            handleSelectSuggestion(suggestions[selectedIndex], selectedIndex)
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          setSelectedIndex(-1)
          break
      }
    }
    
    // Call parent's onKeyDown if provided
    onKeyDown?.(e)
  }
  
  // Handle focus
  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    // readOnly 상태에서는 드롭다운 표시 안함
    if (readOnly) {
      onFocus?.(e)
      return
    }
    
    // 포커스될 때 값이 있으면 자동으로 검색 수행
    if (value.trim()) {
      const results = getSuggestions(value)
      setSuggestions(results)
      setIsOpen(results.length > 0)
    }
    
    // Call parent's onFocus if provided
    onFocus?.(e)
  }
  
  // Handle blur - close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])
  
  // Watch for value changes and show dropdown if showDropdownOnReadOnly is true
  useEffect(() => {
    // readOnly가 아니고, showDropdownOnReadOnly가 true이고, 값이 있을 때만 드롭다운 표시
    if (!readOnly && showDropdownOnReadOnly && value.trim()) {
      const results = getSuggestions(value)
      setSuggestions(results)
      setIsOpen(results.length > 0)
    } else if (!value.trim() || readOnly) {
      // 값이 없거나 readOnly면 드롭다운 닫기
      setIsOpen(false)
      setSuggestions([])
    }
  }, [value, showDropdownOnReadOnly, readOnly])
  
  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll('[data-suggestion-item]')
      const selectedItem = items[selectedIndex] as HTMLElement
      if (selectedItem) {
        selectedItem.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        })
      }
    }
  }, [selectedIndex])
  
  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="absolute left-1 top-1/2 -translate-y-1/2">
        {icon}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        disabled={disabled}
        readOnly={readOnly}
        className={cn(
          "h-7 w-20 pl-5 pr-0.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm",
          "focus:ring-1 focus:ring-red-500 focus:border-transparent",
          "dark:bg-gray-800 dark:text-white",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        placeholder={placeholder}
      />
      
      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute z-50 bottom-full mb-1 bg-white dark:bg-gray-800",
            "border border-gray-200 dark:border-gray-700 rounded-md shadow-lg",
            "overflow-y-auto overflow-x-hidden flex flex-col-reverse",
            "min-w-full w-max right-0" // 우측 정렬로 좌측으로 확장
          )}
          style={{ maxHeight: `${maxListHeight}px` }}
        >
          <ul className="py-1 flex flex-col">
            {suggestions.map((item, index) => (
              <li
                key={index}
                data-suggestion-item
                className={cn(
                  "px-3 py-1.5 text-sm cursor-pointer transition-all duration-150",
                  "hover:bg-gray-100 dark:hover:bg-gray-700",
                  "whitespace-nowrap", // overflow 제거하고 nowrap만 유지
                  selectedIndex === index && [
                    "bg-blue-500 dark:bg-blue-600",
                    "text-white font-semibold",
                    "shadow-md",
                    "border-l-4 border-blue-600 dark:border-blue-400"
                  ]
                )}
                onClick={() => handleSelectSuggestion(item, index)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="block">{suggestionBuilder(item)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
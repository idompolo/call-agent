'use client'

import { useState, useRef, useEffect, useCallback, KeyboardEvent, FocusEvent } from 'react'
import { cn } from '@/lib/utils'
import { MapPin } from 'lucide-react'
import { useDebouncedCallback } from 'use-debounce'

interface AsyncAutocompleteProps<T> {
  value: string
  onChange: (value: string) => void
  onSelect?: (item: T) => void
  asyncSuggestions: (searchValue: string) => Promise<T[]>
  suggestionBuilder: (item: T) => React.ReactNode
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  className?: string
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  onFocus?: (e: FocusEvent<HTMLInputElement>) => void
  icon?: React.ReactNode
  debounceDuration?: number
  maxListHeight?: number
  inputRef?: React.RefObject<HTMLInputElement>
}

export function AsyncAutocomplete<T>({
  value,
  onChange,
  onSelect,
  asyncSuggestions,
  suggestionBuilder,
  placeholder,
  disabled = false,
  readOnly = false,
  className,
  onKeyDown,
  onFocus,
  icon = <MapPin className="h-3 w-3 text-gray-400" />,
  debounceDuration = 300,
  maxListHeight = 200,
  inputRef: externalRef
}: AsyncAutocompleteProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [previousValue, setPreviousValue] = useState(value)
  
  const internalRef = useRef<HTMLInputElement>(null)
  const inputRef = externalRef || internalRef
  const dropdownRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Debounced search function
  const debouncedSearch = useDebouncedCallback(
    async (searchValue: string) => {
      if (!searchValue.trim()) {
        setSuggestions([])
        setIsLoading(false)
        return
      }
      
      setIsLoading(true)
      try {
        const results = await asyncSuggestions(searchValue)
        setSuggestions(results)
        setSelectedIndex(-1)
      } catch (error) {
        console.error('Failed to fetch suggestions:', error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    },
    debounceDuration
  )
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    
    if (newValue.trim()) {
      setIsOpen(true)
      debouncedSearch(newValue)
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
    // 포커스될 때 값이 있으면 자동으로 검색 수행
    if (value.trim()) {
      setIsOpen(true)
      debouncedSearch(value)
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
  
  // Handle value changes from parent (e.g., when selecting different order)
  useEffect(() => {
    // value가 외부에서 변경되었을 때 previousValue만 업데이트
    if (value !== previousValue) {
      setPreviousValue(value)
      // 포커스가 없으면 검색하지 않음
      // 드롭다운도 닫기
      if (!inputRef.current?.matches(':focus')) {
        setIsOpen(false)
        setSuggestions([])
      }
    }
  }, [value, previousValue, inputRef])
  
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
    <div ref={containerRef} className="relative flex-1">
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
          "h-7 w-full pl-5 pr-0.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm",
          "focus:ring-1 focus:ring-blue-500 focus:border-transparent",
          "dark:bg-gray-800 dark:text-white",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        placeholder={placeholder}
      />
      
      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute z-50 w-full bottom-full mb-1 bg-white dark:bg-gray-800",
            "border border-gray-200 dark:border-gray-700 rounded-md shadow-lg",
            "overflow-y-auto overflow-x-hidden flex flex-col-reverse"
          )}
          style={{ maxHeight: `${maxListHeight}px` }}
        >
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              검색 중...
            </div>
          ) : suggestions.length > 0 ? (
            <ul className="py-1 flex flex-col">
              {suggestions.map((item, index) => (
                <li
                  key={index}
                  data-suggestion-item
                  className={cn(
                    "px-3 py-1.5 text-sm cursor-pointer transition-all duration-150",
                    "hover:bg-gray-100 dark:hover:bg-gray-700",
                    "overflow-hidden text-ellipsis whitespace-nowrap",
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
                  <span className="block truncate">{suggestionBuilder(item)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              검색 결과가 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  )
}
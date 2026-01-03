'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SearchField() {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const handleClear = () => {
    setValue('')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement search functionality
    console.log('Searching for:', value)
  }

  return (
    <form 
      onSubmit={handleSearch}
      className={cn(
        "relative flex items-center gap-2 px-3 py-1.5 border rounded-md transition-colors",
        isFocused ? "border-primary" : "border-border"
      )}
    >
      <Search className="h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="전화번호, 고객명 검색"
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  )
}
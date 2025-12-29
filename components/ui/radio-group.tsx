'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface RadioGroupContextValue {
  value: string
  onChange: (value: string) => void
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | undefined>(undefined)

interface RadioGroupProps {
  value: string
  onValueChange: (value: string) => void
  className?: string
  children: React.ReactNode
}

export function RadioGroup({ value, onValueChange, className, children }: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onChange: onValueChange }}>
      <div className={cn("grid gap-2", className)}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
}

interface RadioGroupItemProps {
  value: string
  id?: string
  className?: string
}

export function RadioGroupItem({ value, id, className }: RadioGroupItemProps) {
  const context = React.useContext(RadioGroupContext)
  if (!context) throw new Error('RadioGroupItem must be used within RadioGroup')

  const isChecked = context.value === value

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isChecked}
      id={id}
      onClick={() => context.onChange(value)}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {isChecked && (
        <span className="flex items-center justify-center">
          <span className="h-2.5 w-2.5 rounded-full bg-current" />
        </span>
      )}
    </button>
  )
}
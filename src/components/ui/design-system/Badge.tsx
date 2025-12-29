import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary hover:bg-primary/20',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
        outline: 'border border-input text-foreground',
        success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-sm',
        lg: 'px-3 py-1 text-base',
      },
      rounded: {
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        full: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      rounded: 'md',  // full → md로 변경 (더 각진 느낌)
    },
  }
)

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
  dotColor?: string
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, rounded, dot, dotColor, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, size, rounded }), className)}
        {...props}
      >
        {dot && (
          <span
            className="mr-1.5 h-2 w-2 rounded-full animate-pulse"
            style={{ backgroundColor: dotColor || 'currentColor' }}
          />
        )}
        {children}
      </div>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge, badgeVariants }
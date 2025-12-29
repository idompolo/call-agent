import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary shadow-sm hover:shadow-md',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-secondary',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground focus-visible:ring-accent',
        link: 'text-primary underline-offset-4 hover:underline focus-visible:ring-primary',
        gradient: 'bg-gradient-to-r from-primary-400 to-primary-600 text-white hover:from-primary-500 hover:to-primary-700 shadow-lg hover:shadow-xl',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg',
        icon: 'h-10 w-10',
      },
      rounded: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        full: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      rounded: 'md',  // lg → md로 변경
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, rounded, loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, rounded, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ) : leftIcon ? (
          <span className="mr-2">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
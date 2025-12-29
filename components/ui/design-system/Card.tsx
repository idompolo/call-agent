import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const cardVariants = cva(
  'rounded-lg transition-all duration-300',  // xl → lg로 변경
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground shadow-sm hover:shadow-md',
        bordered: 'border border-border bg-card',
        ghost: 'bg-transparent',
        gradient: 'bg-gradient-to-br from-card via-card/95 to-card/90 shadow-lg',
        glass: 'backdrop-blur-lg bg-white/70 dark:bg-neutral-900/70 border border-white/20 dark:border-neutral-700/20 shadow-xl',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      hover: {
        none: '',
        lift: 'hover:-translate-y-1 hover:shadow-xl',
        glow: 'hover:shadow-primary/20 hover:shadow-xl',
        scale: 'hover:scale-[1.02]',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      hover: 'none',
    },
  }
)

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  interactive?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, hover, interactive, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant, padding, hover }),
          interactive && 'cursor-pointer',
          className
        )}
        {...props}
      />
    )
  }
)

Card.displayName = 'Card'

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 pb-6', className)}
      {...props}
    />
  )
)

CardHeader.displayName = 'CardHeader'

const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
)

CardTitle.displayName = 'CardTitle'

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
)

CardDescription.displayName = 'CardDescription'

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  )
)

CardContent.displayName = 'CardContent'

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-6', className)}
      {...props}
    />
  )
)

CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
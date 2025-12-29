export function LoadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="h-full w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
    </div>
  )
}

export function TableLoadingSkeleton() {
  return (
    <div className="w-full">
      {/* Header skeleton */}
      <div className="h-10 bg-gray-200 dark:bg-gray-700 mb-2 animate-pulse" />
      
      {/* Rows skeleton */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 mb-1 animate-pulse opacity-75" style={{ animationDelay: `${i * 100}ms` }} />
      ))}
    </div>
  )
}
'use client'

import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  className?: string
  count?: number
}

export function LoadingSkeleton({ className, count = 10 }: LoadingSkeletonProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-blue-950/30 dark:via-purple-950/20 dark:to-pink-950/30 backdrop-blur-xl" />
      
      {/* Animated wave gradient */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/20 dark:via-blue-600/20 to-transparent animate-wave" />
      </div>
      
      {/* Loading rows with enhanced design */}
      <div className="relative space-y-2 p-6">
        {Array.from({ length: count }).map((_, i) => (
          <div 
            key={i} 
            className="group relative flex items-center gap-3 p-2 rounded-lg transition-all duration-300"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {/* Row background with glassmorphism */}
            <div className="absolute inset-0 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm rounded-lg border border-white/20 dark:border-gray-700/20" />
            
            {/* Content skeleton */}
            <div className="relative flex items-center gap-3 w-full">
              {/* Date/Time */}
              <div className="flex gap-2">
                <div className="h-6 w-10 bg-gradient-to-r from-gray-200/80 to-gray-300/80 dark:from-gray-700/80 dark:to-gray-600/80 rounded-md animate-pulse-soft" />
                <div className="h-6 w-14 bg-gradient-to-r from-gray-200/80 to-gray-300/80 dark:from-gray-700/80 dark:to-gray-600/80 rounded-md animate-pulse-soft" style={{ animationDelay: '100ms' }} />
              </div>
              
              {/* Phone */}
              <div className="h-6 w-20 bg-gradient-to-r from-blue-100/80 to-blue-200/80 dark:from-blue-900/40 dark:to-blue-800/40 rounded-md animate-pulse-soft" style={{ animationDelay: '200ms' }} />
              
              {/* Name */}
              <div className="h-6 w-16 bg-gradient-to-r from-purple-100/80 to-purple-200/80 dark:from-purple-900/40 dark:to-purple-800/40 rounded-md animate-pulse-soft" style={{ animationDelay: '300ms' }} />
              
              {/* Locations */}
              <div className="flex-1 flex gap-2">
                <div className="h-6 flex-1 bg-gradient-to-r from-gray-200/80 to-gray-300/80 dark:from-gray-700/80 dark:to-gray-600/80 rounded-md animate-pulse-soft" style={{ animationDelay: '400ms' }} />
                <div className="h-6 flex-1 bg-gradient-to-r from-gray-200/80 to-gray-300/80 dark:from-gray-700/80 dark:to-gray-600/80 rounded-md animate-pulse-soft" style={{ animationDelay: '500ms' }} />
              </div>
              
              {/* Status */}
              <div className="flex gap-2">
                <div className="h-6 w-12 bg-gradient-to-r from-green-100/80 to-green-200/80 dark:from-green-900/40 dark:to-green-800/40 rounded-md animate-pulse-soft" style={{ animationDelay: '600ms' }} />
                <div className="h-6 w-14 bg-gradient-to-r from-blue-100/80 to-blue-200/80 dark:from-blue-900/40 dark:to-blue-800/40 rounded-md animate-pulse-soft" style={{ animationDelay: '700ms' }} />
                <div className="h-6 w-16 bg-gradient-to-r from-gray-200/80 to-gray-300/80 dark:from-gray-700/80 dark:to-gray-600/80 rounded-md animate-pulse-soft" style={{ animationDelay: '800ms' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  className?: string
}

export function EmptyState({ 
  title = "주문이 없습니다",
  description = "새로운 주문이 접수되면 여기에 표시됩니다",
  icon,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn("relative flex flex-col items-center justify-center h-full py-12", className)}>
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-64 h-64 opacity-10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${20 + i * 5}s ease-in-out infinite`,
              animationDelay: `${i * 2}s`
            }}
          >
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-600 rounded-full blur-3xl" />
          </div>
        ))}
      </div>
      
      {/* Main content */}
      <div className="relative">
        {/* 3D effect container */}
        <div className="relative group cursor-pointer transition-all duration-500 transform hover:scale-105">
          {/* Glow effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-400 rounded-full opacity-30 blur-2xl group-hover:opacity-50 transition-opacity duration-500" />
          
          {/* Glass morphism card */}
          <div className="relative w-40 h-40 backdrop-blur-xl bg-white/10 dark:bg-gray-800/10 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-2xl overflow-hidden">
            {/* Inner gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-purple-500/10 to-pink-400/10" />
            
            {/* Icon with animation */}
            <div className="relative h-full flex items-center justify-center">
              {icon || (
                <div className="relative">
                  <svg className="w-20 h-20 text-gray-600 dark:text-gray-400 animate-float-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  {/* Pulse rings */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 border-2 border-blue-400/30 rounded-full animate-ping-slow" />
                    <div className="absolute w-20 h-20 border-2 border-purple-400/30 rounded-full animate-ping-slow" style={{ animationDelay: '1s' }} />
                  </div>
                </div>
              )}
            </div>
            
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          </div>
        </div>
      </div>
      
      {/* Text content with enhanced typography */}
      <div className="relative mt-8 text-center space-y-3">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-gray-100 dark:via-gray-300 dark:to-gray-100 bg-clip-text text-transparent animate-gradient">
          {title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      </div>
      
      {/* Interactive decorative elements */}
      <div className="relative mt-10 flex items-center gap-4">
        <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-blue-400/50 to-transparent rounded-full" />
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div 
              key={i}
              className="w-1.5 h-1.5 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
        <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent rounded-full" />
      </div>
    </div>
  )
}
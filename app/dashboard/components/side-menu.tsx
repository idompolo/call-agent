'use client'

import { X, Sun, Moon, Building, Car, Users, MapPin } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

interface SideMenuProps {
  onClose: () => void
}

export function SideMenu({ onClose }: SideMenuProps) {
  const { theme, setTheme } = useTheme()

  const menuItems = [
    { icon: Building, label: '캠프 정보', href: '/camp' },
    { icon: Car, label: '차량 정보', href: '/car' },
    { icon: Users, label: '기사 정보', href: '/driver' },
    { icon: MapPin, label: 'POI 관리', href: '/poi' },
  ]

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-background border-r z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">설정</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Theme Toggle */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">다크 모드</span>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                theme === 'dark' ? "bg-primary" : "bg-gray-300"
              )}
            >
              <span
                className={cn(
                  "inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200",
                  theme === 'dark' ? "translate-x-5" : "translate-x-0.5"
                )}
              >
                {theme === 'dark' ? (
                  <Moon className="h-3 w-3 text-primary absolute top-1 left-1" />
                ) : (
                  <Sun className="h-3 w-3 text-yellow-500 absolute top-1 left-1" />
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4">
          {menuItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors"
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </div>
    </>
  )
}
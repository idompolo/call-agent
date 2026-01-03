'use client'

import { useState } from 'react'
import { Phone, PhoneOff, PhoneCall } from 'lucide-react'
import { cn } from '@/lib/utils'

type CallState = 'idle' | 'ringing' | 'connected' | 'offline'

export function CallStatus() {
  const [callState, setCallState] = useState<CallState>('idle')

  const getStatusIcon = () => {
    switch (callState) {
      case 'idle':
        return <Phone className="h-4 w-4" />
      case 'ringing':
        return <PhoneCall className="h-4 w-4 animate-pulse" />
      case 'connected':
        return <Phone className="h-4 w-4 text-green-500" />
      case 'offline':
        return <PhoneOff className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusText = () => {
    switch (callState) {
      case 'idle':
        return '대기중'
      case 'ringing':
        return '수신중'
      case 'connected':
        return '통화중'
      case 'offline':
        return '오프라인'
    }
  }

  const getStatusColor = () => {
    switch (callState) {
      case 'idle':
        return 'bg-gray-100 text-gray-700'
      case 'ringing':
        return 'bg-yellow-100 text-yellow-700'
      case 'connected':
        return 'bg-green-100 text-green-700'
      case 'offline':
        return 'bg-red-100 text-red-700'
    }
  }

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium",
      getStatusColor()
    )}>
      {getStatusIcon()}
      <span>{getStatusText()}</span>
    </div>
  )
}
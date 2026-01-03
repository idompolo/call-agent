'use client'

import { useState, useEffect } from 'react'
import { MessageSquare } from 'lucide-react'
import { useMqttStore } from '@/store/mqtt-store'
import { cn } from '@/lib/utils'

interface ChatMessage {
  id: string
  from: string
  to: string
  message: string
  timestamp: string
  type?: string
  status?: string
}

interface MessageTablePanelProps {
  className?: string
}

export function MessageTablePanel({ className }: MessageTablePanelProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])

  const { subscribeToTopic } = useMqttStore()

  useEffect(() => {
    // Subscribe to chat messages only
    const unsubChat = subscribeToTopic('web/agent_chat_service', (message) => {
      const parts = message.split('|')
      const newChat: ChatMessage = {
        id: `chat-${Date.now()}`,
        from: parts[0] || 'Agent',
        to: '전체',
        message: parts[1] || message,
        timestamp: new Date().toISOString(),
      }
      setChatMessages((prev) => [...prev, newChat].slice(-100))
    })

    return () => {
      unsubChat?.()
    }
  }, [subscribeToTopic])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      const scrollElement = document.getElementById('chat-scroll')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }, 50)
  }, [chatMessages])

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return timestamp
    }
  }

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b bg-muted/30">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">채팅</h3>
        <span className="text-xs text-muted-foreground">({chatMessages.length})</span>
      </div>

      {/* Chat Messages */}
      <div id="chat-scroll" className="flex-1 overflow-y-auto overflow-x-hidden">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background border-b z-10">
            <tr>
              <th className="text-left p-1.5 w-32 text-xs font-normal text-muted-foreground">발신자→수신자</th>
              <th className="text-left p-1.5 w-20 text-xs font-normal text-muted-foreground">시간</th>
              <th className="text-left p-1.5 text-xs font-normal text-muted-foreground">내용</th>
            </tr>
          </thead>
          <tbody>
            {chatMessages.map((msg) => (
              <tr key={msg.id} className="border-b hover:bg-accent/50 transition-colors">
                <td className="text-left p-1.5 text-xs text-foreground">
                  {msg.from}→{msg.to}
                </td>
                <td className="text-left p-1.5 text-xs text-muted-foreground">
                  {formatTimestamp(msg.timestamp)}
                </td>
                <td className="text-left p-1.5 text-xs text-foreground truncate" title={msg.message}>
                  {msg.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {chatMessages.length === 0 && (
          <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
            채팅 메시지가 없습니다
          </div>
        )}
      </div>
    </div>
  )
}

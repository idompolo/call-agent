'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Send, History, Phone } from 'lucide-react'
import { SmsPanelFlutterLayout } from './SmsPanelFlutterLayout'
import { AppMessagePanelFlutterLayout } from './AppMessagePanelFlutterLayout'
import { ChatHistory } from './ChatHistory'
import { useMqttStore } from '@/store/mqtt-store'
import { cn } from '@/lib/utils'

interface ChatPanelFlutterLayoutProps {
  className?: string
  defaultTab?: string
}

export function ChatPanelFlutterLayout({ 
  className, 
  defaultTab = 'sms' 
}: ChatPanelFlutterLayoutProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [unreadSms, setUnreadSms] = useState(0)
  const [unreadApp, setUnreadApp] = useState(0)
  const [minimized, setMinimized] = useState(false)
  const { subscribeToTopic } = useMqttStore()

  // Subscribe to messages for unread badges
  useEffect(() => {
    const unsubSms = subscribeToTopic('sms.receive', (message) => {
      console.log('SMS received:', message)
      if (activeTab !== 'sms') {
        setUnreadSms(prev => prev + 1)
      }
    })

    const unsubChat = subscribeToTopic('web/agent_chat_service', (message) => {
      console.log('Chat message received:', message)
      if (activeTab !== 'app') {
        setUnreadApp(prev => prev + 1)
      }
    })

    const unsubCheckcall = subscribeToTopic('web/checkcall_response', (message) => {
      console.log('Checkcall response:', message)
      if (activeTab !== 'app') {
        setUnreadApp(prev => prev + 1)
      }
    })

    return () => {
      unsubSms?.()
      unsubChat?.()
      unsubCheckcall?.()
    }
  }, [activeTab, subscribeToTopic])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Reset unread count when tab is selected
    if (value === 'sms') {
      setUnreadSms(0)
    } else if (value === 'app') {
      setUnreadApp(0)
    }
  }

  // Minimized view
  if (minimized) {
    return (
      <div 
        className={cn(
          "h-12 bg-background border-t flex items-center px-4 cursor-pointer hover:bg-accent/50 transition-colors",
          className
        )}
        onClick={() => setMinimized(false)}
      >
        <div className="flex items-center gap-4">
          <MessageSquare className="w-5 h-5" />
          <span className="font-medium">채팅 패널</span>
          {(unreadSms + unreadApp) > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadSms + unreadApp}
            </Badge>
          )}
        </div>
        <button 
          className="ml-auto text-sm text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation()
            setMinimized(false)
          }}
        >
          열기
        </button>
      </div>
    )
  }

  return (
    <Card className={cn(
      "h-full flex flex-col border-0 rounded-none bg-background shadow-lg",
      className
    )}>
      {/* Enhanced Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <span className="font-semibold">메시지 센터</span>
        </div>
        <button
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setMinimized(true)}
        >
          최소화
        </button>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={handleTabChange}
        className="flex flex-col h-full"
      >
        {/* Tab Navigation */}
        <div className="px-4 py-2 border-b bg-background">
          <TabsList className="grid w-full max-w-lg grid-cols-3 h-9">
            <TabsTrigger value="sms" className="relative text-xs">
              <Phone className="w-3.5 h-3.5 mr-1.5" />
              <span>문자 발신</span>
              {unreadSms > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] p-0 flex items-center justify-center text-[10px]"
                >
                  {unreadSms}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="app" className="relative text-xs">
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
              <span>앱 메시지</span>
              {unreadApp > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] p-0 flex items-center justify-center text-[10px]"
                >
                  {unreadApp}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <History className="w-3.5 h-3.5 mr-1.5" />
              <span>이력</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="sms" className="h-full m-0">
            <SmsPanelFlutterLayout />
          </TabsContent>
          <TabsContent value="app" className="h-full m-0">
            <AppMessagePanelFlutterLayout />
          </TabsContent>
          <TabsContent value="history" className="h-full m-0">
            <ChatHistory />
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  )
}
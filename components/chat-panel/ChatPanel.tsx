'use client'

import { useState, useCallback, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Send, PhoneCall, History } from 'lucide-react'
import { SmsPanel } from './SmsPanel'
import { AppMessagePanel } from './AppMessagePanel'
import { ChatHistory } from './ChatHistory'
import { useMqttStore } from '@/store/mqtt-store'
import { cn } from '@/lib/utils'

interface ChatPanelProps {
  className?: string
}

export function ChatPanel({ className }: ChatPanelProps) {
  const [activeTab, setActiveTab] = useState('sms')
  const [unreadSms, setUnreadSms] = useState(0)
  const [unreadApp, setUnreadApp] = useState(0)
  const { subscribeToTopic, publishMessage } = useMqttStore()

  // Subscribe to SMS and chat messages
  useEffect(() => {
    const unsubSms = subscribeToTopic('sms.receive', (message) => {
      // Handle incoming SMS
      console.log('SMS received:', message)
      if (activeTab !== 'sms') {
        setUnreadSms(prev => prev + 1)
      }
    })

    const unsubChat = subscribeToTopic('web/agent_chat_service', (message) => {
      // Handle incoming chat messages
      console.log('Chat message received:', message)
      if (activeTab !== 'app') {
        setUnreadApp(prev => prev + 1)
      }
    })

    return () => {
      unsubSms?.()
      unsubChat?.()
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

  return (
    <Card className={cn(
      "h-full flex flex-col border-0 rounded-none bg-background",
      className
    )}>
      <Tabs 
        value={activeTab} 
        onValueChange={handleTabChange}
        className="flex flex-col h-full"
      >
        <div className="border-b px-4 py-2">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="sms" className="relative">
              <Send className="w-4 h-4 mr-2" />
              문자 발신
              {unreadSms > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
                >
                  {unreadSms}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="app" className="relative">
              <MessageSquare className="w-4 h-4 mr-2" />
              앱 메시지
              {unreadApp > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
                >
                  {unreadApp}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              이력
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="sms" className="h-full m-0">
            <SmsPanel />
          </TabsContent>
          <TabsContent value="app" className="h-full m-0">
            <AppMessagePanel />
          </TabsContent>
          <TabsContent value="history" className="h-full m-0">
            <ChatHistory />
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  )
}
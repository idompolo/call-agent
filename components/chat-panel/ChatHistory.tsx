'use client'

import { useState, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageSquare, Send, Phone, Clock } from 'lucide-react'
import { useMqttStore } from '@/store/mqtt-store'
import { cn } from '@/lib/utils'

interface SmsMessage {
  id: string
  telephone: string
  name: string
  message: string
  route: string
  timestamp: string
  type: 'sent' | 'received'
}

interface AppMessage {
  id: string
  target: string
  message: string
  timestamp: string
  type: 'individual' | 'area' | 'checkcall'
  extra?: string
}

export function ChatHistory() {
  const [smsHistory, setSmsHistory] = useState<SmsMessage[]>([])
  const [appHistory, setAppHistory] = useState<AppMessage[]>([])
  const [activeTab, setActiveTab] = useState('sms')
  const { subscribeToTopic } = useMqttStore()

  useEffect(() => {
    // Subscribe to SMS sent messages
    const unsubSmsSent = subscribeToTopic('sms.send', (message) => {
      const parts = message.split('|')
      if (parts.length >= 5) {
        const newSms: SmsMessage = {
          id: `sms-sent-${Date.now()}`,
          telephone: parts[0],
          name: parts[1],
          message: parts[2],
          route: parts[3],
          timestamp: parts[4] || new Date().toISOString(),
          type: 'sent'
        }
        setSmsHistory(prev => [newSms, ...prev].slice(0, 100)) // Keep last 100 messages
      }
    })

    // Subscribe to SMS received messages
    const unsubSmsRecv = subscribeToTopic('sms.receive', (message) => {
      const parts = message.split('|')
      if (parts.length >= 2) {
        const newSms: SmsMessage = {
          id: `sms-recv-${Date.now()}`,
          telephone: parts[0],
          name: '',
          message: parts[1],
          route: '',
          timestamp: parts[2] || new Date().toISOString(),
          type: 'received'
        }
        setSmsHistory(prev => [newSms, ...prev].slice(0, 100))
      }
    })

    // Subscribe to checkcall responses
    const unsubCheckcall = subscribeToTopic('check.call.response', (message) => {
      const parts = message.split('|')
      if (parts.length >= 4) {
        const newApp: AppMessage = {
          id: `app-check-${Date.now()}`,
          target: `Order #${parts[0]}`,
          message: parts[4] || 'Checkcall response',
          timestamp: new Date().toISOString(),
          type: 'checkcall'
        }
        setAppHistory(prev => [newApp, ...prev].slice(0, 100))
      }
    })

    return () => {
      unsubSmsSent?.()
      unsubSmsRecv?.()
      unsubCheckcall?.()
    }
  }, [subscribeToTopic])

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = timestamp.length === 14 
        ? new Date(
            `${timestamp.slice(0,4)}-${timestamp.slice(4,6)}-${timestamp.slice(6,8)}T${timestamp.slice(8,10)}:${timestamp.slice(10,12)}:${timestamp.slice(12,14)}`
          )
        : new Date(timestamp)
      
      return date.toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch {
      return timestamp
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
      <div className="p-3 border-b">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="sms">
            <Phone className="w-4 h-4 mr-2" />
            SMS 이력
          </TabsTrigger>
          <TabsTrigger value="app">
            <MessageSquare className="w-4 h-4 mr-2" />
            앱 메시지 이력
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="sms" className="flex-1 m-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2">
            {smsHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                SMS 이력이 없습니다
              </div>
            ) : (
              smsHistory.map((sms) => (
                <Card
                  key={sms.id}
                  className={cn(
                    "p-3 space-y-2",
                    sms.type === 'sent' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-green-500'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {sms.type === 'sent' ? (
                        <Send className="w-4 h-4 text-blue-500" />
                      ) : (
                        <MessageSquare className="w-4 h-4 text-green-500" />
                      )}
                      <span className="font-medium text-sm">{sms.telephone}</span>
                      {sms.name && (
                        <span className="text-sm text-muted-foreground">({sms.name})</span>
                      )}
                    </div>
                    <Badge variant={sms.type === 'sent' ? 'default' : 'secondary'}>
                      {sms.type === 'sent' ? '발신' : '수신'}
                    </Badge>
                  </div>
                  <p className="text-sm break-all">{sms.message}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimestamp(sms.timestamp)}</span>
                    {sms.route && (
                      <>
                        <span>•</span>
                        <span>Route: {sms.route}</span>
                      </>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="app" className="flex-1 m-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2">
            {appHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                앱 메시지 이력이 없습니다
              </div>
            ) : (
              appHistory.map((app) => (
                <Card
                  key={app.id}
                  className={cn(
                    "p-3 space-y-2",
                    app.type === 'checkcall' && 'border-l-4 border-l-orange-500'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{app.target}</span>
                    </div>
                    <Badge variant={
                      app.type === 'individual' ? 'default' : 
                      app.type === 'area' ? 'secondary' : 
                      'outline'
                    }>
                      {app.type === 'individual' ? '개별' : 
                       app.type === 'area' ? '지역' : 
                       '체크콜'}
                    </Badge>
                  </div>
                  <p className="text-sm break-all">{app.message}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimestamp(app.timestamp)}</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  )
}
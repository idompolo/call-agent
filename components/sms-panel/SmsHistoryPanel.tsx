'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Phone, Send } from 'lucide-react'
import { useMqttStore } from '@/store/mqtt-store'
import { useOrderStore } from '@/store/order-store'
import { cn } from '@/lib/utils'
import { orderService } from '@/services/order-service'

interface SmsMessage {
  id: string
  telephone: string
  name: string
  message: string
  route: string
  timestamp: string
  type: 'sent' | 'received'
  callplace?: string
  driverInfo?: string
}

interface SmsHistoryPanelProps {
  className?: string
}

export function SmsHistoryPanel({ className }: SmsHistoryPanelProps) {
  const [activeTab, setActiveTab] = useState('received')
  const [receivedMessages, setReceivedMessages] = useState<SmsMessage[]>([])
  const [sentMessages, setSentMessages] = useState<SmsMessage[]>([])
  const [unreadCounts, setUnreadCounts] = useState({ received: 0, sent: 0 })
  const [orderCache, setOrderCache] = useState<Map<string, { callplace: string; driverInfo: string }>>(new Map())

  const { subscribeToTopic } = useMqttStore()
  const { selectedOrder } = useOrderStore()

  // 전화번호로 최신 주문 정보 가져오기
  const fetchOrderInfo = async (telephone: string) => {
    try {
      const recentOrders = await orderService.getRecentOrder(telephone)
      if (recentOrders && recentOrders.length > 0) {
        const latestOrder = recentOrders[0]
        const driverInfo = latestOrder.drv_name
          ? `${latestOrder.drv_name}${latestOrder.car_callNo ? `(${latestOrder.car_callNo})` : ''}`
          : ''
        return {
          callplace: latestOrder.callplace || '',
          driverInfo: driverInfo,
        }
      }
    } catch (error) {
      console.error('Failed to fetch order info:', error)
    }
    return { callplace: '', driverInfo: '' }
  }

  // 메시지에 주문 정보 추가
  const enrichMessageWithOrderInfo = useCallback(
    async (message: SmsMessage): Promise<SmsMessage> => {
      const cached = orderCache.get(message.telephone)
      if (cached) {
        return { ...message, ...cached }
      }

      const orderInfo = await fetchOrderInfo(message.telephone)

      setOrderCache((prev) => {
        const newCache = new Map(prev)
        newCache.set(message.telephone, orderInfo)
        return newCache
      })

      return { ...message, ...orderInfo }
    },
    [orderCache]
  )

  useEffect(() => {
    // Subscribe to SMS received
    const unsubRecv = subscribeToTopic('sms.receive', async (message) => {
      const parts = message.split('|')
      if (parts.length >= 2) {
        const newSms: SmsMessage = {
          id: `recv-${Date.now()}`,
          telephone: parts[0],
          name: '',
          message: parts[1],
          route: '',
          timestamp: parts[2] || new Date().toISOString(),
          type: 'received',
        }

        const enrichedSms = await enrichMessageWithOrderInfo(newSms)

        setReceivedMessages((prev) => [...prev, enrichedSms].slice(-100))
        if (activeTab !== 'received') {
          setUnreadCounts((prev) => ({ ...prev, received: prev.received + 1 }))
        }
      }
    })

    // Subscribe to SMS sent
    const unsubSent = subscribeToTopic('sms.send', async (message) => {
      const parts = message.split('|')
      if (parts.length >= 5) {
        const newSms: SmsMessage = {
          id: `sent-${Date.now()}`,
          telephone: parts[0],
          name: parts[1],
          message: parts[2],
          route: parts[3],
          timestamp: parts[4] || new Date().toISOString(),
          type: 'sent',
        }

        const enrichedSms = await enrichMessageWithOrderInfo(newSms)

        setSentMessages((prev) => [...prev, enrichedSms].slice(-100))
        if (activeTab !== 'sent') {
          setUnreadCounts((prev) => ({ ...prev, sent: prev.sent + 1 }))
        }
      }
    })

    return () => {
      unsubRecv?.()
      unsubSent?.()
    }
  }, [activeTab, subscribeToTopic, enrichMessageWithOrderInfo])

  // Auto-scroll
  useEffect(() => {
    setTimeout(() => {
      const scrollElement = document.getElementById('sms-received-scroll')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }, 50)
  }, [receivedMessages])

  useEffect(() => {
    setTimeout(() => {
      const scrollElement = document.getElementById('sms-sent-scroll')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }, 50)
  }, [sentMessages])

  useEffect(() => {
    setTimeout(() => {
      const scrollElement = document.getElementById(`sms-${activeTab}-scroll`)
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }, 50)
  }, [activeTab])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setUnreadCounts((prev) => ({ ...prev, [value]: 0 }))
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      const date =
        timestamp.length === 14
          ? new Date(
              `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}T${timestamp.slice(8, 10)}:${timestamp.slice(10, 12)}:${timestamp.slice(12, 14)}`
            )
          : new Date(timestamp)

      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return timestamp
    }
  }

  // Filter messages based on selected order
  const filteredReceived = selectedOrder
    ? receivedMessages.filter((msg) => msg.telephone === selectedOrder.telephone)
    : receivedMessages

  const filteredSent = selectedOrder
    ? sentMessages.filter((msg) => msg.telephone === selectedOrder.telephone)
    : sentMessages

  return (
    <div
      className={cn(
        'flex flex-col h-full w-[320px] border-l bg-background',
        className
      )}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-2 border-b bg-muted/30">
        <h3 className="text-sm font-medium text-foreground">문자 수발신</h3>
        {selectedOrder && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {selectedOrder.telephone}
          </p>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
        <TabsList className="flex-shrink-0 grid w-full grid-cols-2 h-9 mx-0 rounded-none border-b">
          <TabsTrigger value="received" className="relative text-xs gap-1.5 rounded-none data-[state=active]:bg-background">
            <Phone className="w-3.5 h-3.5" />
            수신
            {unreadCounts.received > 0 && (
              <Badge variant="destructive" className="h-4 min-w-[16px] px-1 text-[10px]">
                {unreadCounts.received}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="relative text-xs gap-1.5 rounded-none data-[state=active]:bg-background">
            <Send className="w-3.5 h-3.5" />
            발신
            {unreadCounts.sent > 0 && (
              <Badge variant="destructive" className="h-4 min-w-[16px] px-1 text-[10px]">
                {unreadCounts.sent}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Received Tab */}
        <TabsContent value="received" className="flex-1 m-0 overflow-hidden">
          <div id="sms-received-scroll" className="h-full overflow-y-auto overflow-x-hidden">
            <div className="divide-y">
              {filteredReceived.map((msg) => (
                <div key={msg.id} className="px-3 py-2 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">{msg.telephone}</span>
                    <span className="text-[10px] text-muted-foreground">{formatTimestamp(msg.timestamp)}</span>
                  </div>
                  <p className="text-xs text-foreground/90 line-clamp-2">{msg.message}</p>
                  {(msg.callplace || msg.driverInfo) && (
                    <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                      {msg.callplace && <span>{msg.callplace}</span>}
                      {msg.driverInfo && <span className="text-blue-600 dark:text-blue-400">{msg.driverInfo}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {filteredReceived.length === 0 && (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                수신 메시지가 없습니다
              </div>
            )}
          </div>
        </TabsContent>

        {/* Sent Tab */}
        <TabsContent value="sent" className="flex-1 m-0 overflow-hidden">
          <div id="sms-sent-scroll" className="h-full overflow-y-auto overflow-x-hidden">
            <div className="divide-y">
              {filteredSent.map((msg) => (
                <div key={msg.id} className="px-3 py-2 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">{msg.telephone}</span>
                    <span className="text-[10px] text-muted-foreground">{formatTimestamp(msg.timestamp)}</span>
                  </div>
                  <p className="text-xs text-foreground/90 line-clamp-2">{msg.message}</p>
                  {(msg.callplace || msg.driverInfo) && (
                    <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                      {msg.callplace && <span>{msg.callplace}</span>}
                      {msg.driverInfo && <span className="text-blue-600 dark:text-blue-400">{msg.driverInfo}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {filteredSent.length === 0 && (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                발신 메시지가 없습니다
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

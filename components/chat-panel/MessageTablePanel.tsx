'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Phone, Send, MessageSquare } from 'lucide-react'
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
  callplace?: string  // 최신 호출장소
  driverInfo?: string  // 배차기사 정보
}

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
  const [activeTab, setActiveTab] = useState('received')
  const [receivedMessages, setReceivedMessages] = useState<SmsMessage[]>([])
  const [sentMessages, setSentMessages] = useState<SmsMessage[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [unreadCounts, setUnreadCounts] = useState({ received: 0, sent: 0, chat: 0 })
  const [orderCache, setOrderCache] = useState<Map<string, { callplace: string, driverInfo: string }>>(new Map())
  
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
          driverInfo: driverInfo
        }
      }
    } catch (error) {
      console.error('Failed to fetch order info:', error)
    }
    return { callplace: '', driverInfo: '' }
  }

  // 메시지에 주문 정보 추가
  const enrichMessageWithOrderInfo = useCallback(async (message: SmsMessage): Promise<SmsMessage> => {
    // 캐시 확인
    const cached = orderCache.get(message.telephone)
    if (cached) {
      return { ...message, ...cached }
    }

    // 캐시에 없으면 API 호출
    const orderInfo = await fetchOrderInfo(message.telephone)
    
    // 캐시 업데이트
    setOrderCache(prev => {
      const newCache = new Map(prev)
      newCache.set(message.telephone, orderInfo)
      return newCache
    })

    return { ...message, ...orderInfo }
  }, [orderCache])

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
          type: 'received'
        }
        
        // 주문 정보 추가
        const enrichedSms = await enrichMessageWithOrderInfo(newSms)
        
        setReceivedMessages(prev => [...prev, enrichedSms].slice(-100))
        if (activeTab !== 'received') {
          setUnreadCounts(prev => ({ ...prev, received: prev.received + 1 }))
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
          type: 'sent'
        }
        
        // 주문 정보 추가
        const enrichedSms = await enrichMessageWithOrderInfo(newSms)
        
        setSentMessages(prev => [...prev, enrichedSms].slice(-100))
        if (activeTab !== 'sent') {
          setUnreadCounts(prev => ({ ...prev, sent: prev.sent + 1 }))
        }
      }
    })

    // Subscribe to chat messages
    const unsubChat = subscribeToTopic('web/agent_chat_service', (message) => {
      // 채팅 메시지 형식: 발신자|내용 (수신자는 항상 전체)
      const parts = message.split('|')
      const newChat: ChatMessage = {
        id: `chat-${Date.now()}`,
        from: parts[0] || 'Agent',
        to: '전체',  // 채팅은 항상 전체 수신
        message: parts[1] || message,  // 두 번째 부분이 메시지 내용
        timestamp: new Date().toISOString()
      }
      setChatMessages(prev => [...prev, newChat].slice(-100))
      if (activeTab !== 'chat') {
        setUnreadCounts(prev => ({ ...prev, chat: prev.chat + 1 }))
      }
    })

    return () => {
      unsubRecv?.()
      unsubSent?.()
      unsubChat?.()
    }
  }, [activeTab, subscribeToTopic, enrichMessageWithOrderInfo])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      const scrollElement = document.getElementById('received-scroll')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }, 50)
  }, [receivedMessages])

  useEffect(() => {
    setTimeout(() => {
      const scrollElement = document.getElementById('sent-scroll')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }, 50)
  }, [sentMessages])

  useEffect(() => {
    setTimeout(() => {
      const scrollElement = document.getElementById('chat-scroll')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }, 50)
  }, [chatMessages])
  
  // Also scroll when tab changes
  useEffect(() => {
    setTimeout(() => {
      const scrollElement = document.getElementById(`${activeTab}-scroll`)
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }, 50)
  }, [activeTab])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Reset unread count
    setUnreadCounts(prev => ({ ...prev, [value]: 0 }))
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = timestamp.length === 14 
        ? new Date(
            `${timestamp.slice(0,4)}-${timestamp.slice(4,6)}-${timestamp.slice(6,8)}T${timestamp.slice(8,10)}:${timestamp.slice(10,12)}:${timestamp.slice(12,14)}`
          )
        : new Date(timestamp)
      
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch {
      return timestamp
    }
  }

  const formatPhone = (phone: string) => {
    // Return phone number as is
    return phone
  }

  // 기존 메시지들에 대해 주문 정보 업데이트
  useEffect(() => {
    const updateExistingMessages = async () => {
      // 수신 메시지 업데이트
      const updatedReceived = await Promise.all(
        receivedMessages.map(async (msg) => {
          if (!msg.callplace && !msg.driverInfo) {
            return await enrichMessageWithOrderInfo(msg)
          }
          return msg
        })
      )
      setReceivedMessages(updatedReceived)

      // 발신 메시지 업데이트
      const updatedSent = await Promise.all(
        sentMessages.map(async (msg) => {
          if (!msg.callplace && !msg.driverInfo) {
            return await enrichMessageWithOrderInfo(msg)
          }
          return msg
        })
      )
      setSentMessages(updatedSent)
    }

    // 메시지가 있고 캐시가 비어있지 않을 때만 실행
    if ((receivedMessages.length > 0 || sentMessages.length > 0) && orderCache.size === 0) {
      updateExistingMessages()
    }
  }, []) // 컴포넌트 마운트 시 한 번만 실행

  // Filter messages based on selected order
  const filteredReceived = selectedOrder 
    ? receivedMessages.filter(msg => msg.telephone === selectedOrder.telephone)
    : receivedMessages

  const filteredSent = selectedOrder
    ? sentMessages.filter(msg => msg.telephone === selectedOrder.telephone)
    : sentMessages

  return (
    <div className={cn(
      "flex h-[220px] border-l-0 rounded-none bg-background",
      className
    )}>
      {/* Content with side tabs - no header */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex w-full h-full">
          {/* Side Tab Navigation */}
          <div className="w-24 border-r flex flex-col py-2 px-1 space-y-1 bg-muted/5">
            <TabsList className="flex flex-col h-auto bg-transparent p-0">
              <TabsTrigger 
                value="received" 
                className="w-full flex flex-col items-center justify-center py-2.5 px-1 text-xs relative data-[state=active]:bg-accent"
              >
                <Phone className="w-4 h-4 mb-1" />
                <span className="font-medium">수신</span>
                {unreadCounts.received > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-[16px] p-0 text-[10px]">
                    {unreadCounts.received}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="sent" 
                className="w-full flex flex-col items-center justify-center py-2.5 px-1 text-xs relative data-[state=active]:bg-accent"
              >
                <Send className="w-4 h-4 mb-1" />
                <span className="font-medium">발신</span>
                {unreadCounts.sent > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-[16px] p-0 text-[10px]">
                    {unreadCounts.sent}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="chat" 
                className="w-full flex flex-col items-center justify-center py-2.5 px-1 text-xs relative data-[state=active]:bg-accent"
              >
                <MessageSquare className="w-4 h-4 mb-1" />
                <span className="font-medium">채팅</span>
                {unreadCounts.chat > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-[16px] p-0 text-[10px]">
                    {unreadCounts.chat}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content - Table Format */}
          <div className="flex-1 overflow-hidden">
            <TabsContent value="received" className="h-full m-0 p-2" data-tab="received">
              <div className="overflow-y-auto overflow-x-hidden" id="received-scroll" style={{ height: 'calc(220px - 1rem)' }}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b z-10">
                    <tr>
                      <th className="text-left p-1 w-20 text-xs font-normal text-gray-500">시간</th>
                      <th className="text-left p-1 w-24 text-xs font-normal text-gray-500">전화번호</th>
                      <th className="text-left p-1 w-32 text-xs font-normal text-gray-500">호출장소</th>
                      <th className="text-left p-1 flex-1 text-xs font-normal text-gray-500">메시지</th>
                      <th className="text-left p-1 w-24 text-xs font-normal text-gray-500">배차기사</th>
                      <th className="text-center p-1 w-12 text-xs font-normal text-gray-500">타입</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReceived.map((msg) => (
                      <tr 
                        key={msg.id} 
                        className="border-b hover:bg-accent/50 transition-colors"
                      >
                        <td className="text-left p-1 text-xs text-gray-600 dark:text-gray-400">
                          {formatTimestamp(msg.timestamp)}
                        </td>
                        <td className="text-left p-1 text-xs text-gray-800 dark:text-gray-200">
                          {formatPhone(msg.telephone)}
                        </td>
                        <td className="text-left p-1 text-xs text-gray-700 dark:text-gray-300 truncate" title={msg.callplace}>
                          {msg.callplace || '-'}
                        </td>
                        <td className="text-left p-1 text-xs text-gray-800 dark:text-gray-200 truncate" title={msg.message}>
                          {msg.message}
                        </td>
                        <td className="text-left p-1 text-xs text-gray-700 dark:text-gray-300">
                          {msg.driverInfo || '-'}
                        </td>
                        <td className="text-center p-1">
                          <span className="inline-flex items-center justify-center w-10 h-5 text-[10px] font-medium rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            수신
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredReceived.length === 0 && (
                  <div className="text-center text-muted-foreground py-4 text-sm">
                    수신 메시지가 없습니다
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="sent" className="h-full m-0 p-2" data-tab="sent">
              <div className="overflow-y-auto overflow-x-hidden" id="sent-scroll" style={{ height: 'calc(220px - 1rem)' }}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b z-10">
                    <tr>
                      <th className="text-left p-1 w-20 text-xs font-normal text-gray-500">시간</th>
                      <th className="text-left p-1 w-24 text-xs font-normal text-gray-500">전화번호</th>
                      <th className="text-left p-1 w-32 text-xs font-normal text-gray-500">호출장소</th>
                      <th className="text-left p-1 flex-1 text-xs font-normal text-gray-500">메시지</th>
                      <th className="text-left p-1 w-24 text-xs font-normal text-gray-500">배차기사</th>
                      <th className="text-center p-1 w-12 text-xs font-normal text-gray-500">타입</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSent.map((msg) => (
                      <tr 
                        key={msg.id} 
                        className="border-b hover:bg-accent/50 transition-colors"
                      >
                        <td className="text-left p-1 text-xs text-gray-600 dark:text-gray-400">
                          {formatTimestamp(msg.timestamp)}
                        </td>
                        <td className="text-left p-1 text-xs text-gray-800 dark:text-gray-200">
                          {formatPhone(msg.telephone)}
                        </td>
                        <td className="text-left p-1 text-xs text-gray-700 dark:text-gray-300 truncate" title={msg.callplace}>
                          {msg.callplace || '-'}
                        </td>
                        <td className="text-left p-1 text-xs text-gray-800 dark:text-gray-200 truncate" title={msg.message}>
                          {msg.message}
                        </td>
                        <td className="text-left p-1 text-xs text-gray-700 dark:text-gray-300">
                          {msg.driverInfo || '-'}
                        </td>
                        <td className="text-center p-1">
                          <span className="inline-flex items-center justify-center w-10 h-5 text-[10px] font-medium rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            발신
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredSent.length === 0 && (
                  <div className="text-center text-muted-foreground py-4 text-sm">
                    발신 메시지가 없습니다
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="chat" className="h-full m-0 p-2" data-tab="chat">
              <div className="overflow-y-auto overflow-x-hidden" id="chat-scroll" style={{ height: 'calc(220px - 1rem)' }}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b z-10">
                    <tr>
                      <th className="text-left p-1 w-40 text-xs font-normal text-gray-500">발신자→수신자</th>
                      <th className="text-left p-1 w-20 text-xs font-normal text-gray-500">시간</th>
                      <th className="text-left p-1 flex-1 text-xs font-normal text-gray-500">내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chatMessages.map((msg) => (
                      <tr 
                        key={msg.id} 
                        className="border-b hover:bg-accent/50 transition-colors"
                      >
                        <td className="text-left p-1 text-xs text-gray-800 dark:text-gray-200">
                          {msg.from}→{msg.to}
                        </td>
                        <td className="text-left p-1 text-xs text-gray-600 dark:text-gray-400">
                          {formatTimestamp(msg.timestamp)}
                        </td>
                        <td className="text-left p-1 text-xs text-gray-800 dark:text-gray-200 truncate" title={msg.message}>
                          {msg.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {chatMessages.length === 0 && (
                  <div className="text-center text-muted-foreground py-4 text-sm">
                    채팅 메시지가 없습니다
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
    </div>
  )
}
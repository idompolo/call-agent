'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageSquare, Send, Users, User } from 'lucide-react'
import { useMqttStore } from '@/store/mqtt-store'
import { useOrderStore } from '@/store/order-store'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// 체크콜 응답 템플릿
const CHECKCALL_RESPONSES = [
  { id: 11, name: '탑승완료', extra: '고객님이 탑승하였습니다' },
  { id: 12, name: '하차완료', extra: '고객님이 하차하였습니다' },
  { id: 13, name: '취소', extra: '주문이 취소되었습니다' },
  { id: 14, name: '도착', extra: '목적지에 도착하였습니다' },
  { id: 15, name: '대기중', extra: '고객님을 기다리고 있습니다' },
  { id: 16, name: '이동중', extra: '고객님 위치로 이동중입니다' },
  { id: 17, name: '연락불가', extra: '고객님과 연락이 되지 않습니다' },
  { id: 18, name: '예약확인', extra: '예약이 확인되었습니다' },
]

export function AppMessagePanel() {
  const [messageType, setMessageType] = useState<'individual' | 'area'>('individual')
  const [callNumber, setCallNumber] = useState('')
  const [areaCode, setAreaCode] = useState('')
  const [message, setMessage] = useState('')
  const [duration, setDuration] = useState('15')
  const [selectedResponse, setSelectedResponse] = useState<number | null>(null)
  
  const { publishMessage } = useMqttStore()
  const { selectedOrder } = useOrderStore()
  const { user } = useAuthStore()

  // Auto-fill call number from selected order
  useEffect(() => {
    if (selectedOrder?.id) {
      setCallNumber(selectedOrder.id.toString())
    }
  }, [selectedOrder])

  const handleSendAppMessage = () => {
    if (messageType === 'individual') {
      if (!callNumber || callNumber.length < 3) {
        toast.error('콜번호를 입력해주세요')
        return
      }

      if (!message.trim()) {
        toast.error('메시지를 입력해주세요')
        return
      }

      // Send individual driver app message
      const payload = [
        'noti',
        '', // title (empty for new format)
        message,
        parseInt(duration) * 1000 // Convert to milliseconds
      ].join('|')

      // Publish to driver's phone topic (using driver number as topic)
      publishMessage(selectedOrder?.drvNo || callNumber, payload)
      
      toast.success('앱 메시지 전송 완료', {
        description: `#${callNumber} 기사님께 메시지를 전송했습니다`
      })
    } else {
      if (!areaCode || areaCode.length < 1) {
        toast.error('지역코드를 입력해주세요')
        return
      }

      if (!message.trim()) {
        toast.error('메시지를 입력해주세요')
        return
      }

      // Send area broadcast message
      const payload = [
        'ftnh.send.noti',
        '',
        '',
        areaCode,
        duration,
        '센터 안내', // title
        message
      ].join('|')

      publishMessage('ftnh:new', payload)
      
      toast.success('지역 메시지 전송 완료', {
        description: `[${areaCode}] 지역에 메시지를 전송했습니다`
      })
    }

    // Clear message after sending
    setMessage('')
  }

  const handleCheckcallResponse = (response: typeof CHECKCALL_RESPONSES[0]) => {
    if (!selectedOrder?.id) {
      toast.error('주문을 먼저 선택해주세요')
      return
    }

    setSelectedResponse(response.id)

    // Send checkcall response
    const orderId = selectedOrder.id
    const agentId = user?.id || 0
    const delay = 10 // seconds

    const payload = [
      orderId,
      response.id,
      agentId,
      delay,
      response.extra
    ].join('|')

    publishMessage('check.call.response', payload)
    
    toast.success('체크콜 응답 전송', {
      description: `${response.name}: ${response.extra}`
    })

    setTimeout(() => setSelectedResponse(null), 2000)
  }

  return (
    <div className="flex h-full">
      <Tabs value={messageType} onValueChange={(v) => setMessageType(v as any)} className="flex-1">
        <div className="p-4 border-b">
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="individual">
              <User className="w-4 h-4 mr-2" />
              개별 전송
            </TabsTrigger>
            <TabsTrigger value="area">
              <Users className="w-4 h-4 mr-2" />
              지역 전송
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="individual" className="flex-1 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="call-number">콜번호</Label>
              <Input
                id="call-number"
                type="text"
                placeholder="콜번호 입력"
                value={callNumber}
                onChange={(e) => setCallNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">유지시간 (초)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="5"
                max="60"
              />
            </div>
          </div>

          <div className="space-y-2 flex-1 flex flex-col">
            <Label htmlFor="ind-message">메시지</Label>
            <Textarea
              id="ind-message"
              placeholder={`${user?.agentId || 'FTNH'}-T`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 resize-none"
              rows={3}
            />
          </div>

          <Button
            onClick={handleSendAppMessage}
            disabled={!callNumber || !message}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            기사 앱으로 전송
          </Button>
        </TabsContent>

        <TabsContent value="area" className="flex-1 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area-code">지역코드</Label>
              <Input
                id="area-code"
                type="text"
                placeholder="지역코드 입력"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area-duration">유지시간 (초)</Label>
              <Input
                id="area-duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="5"
                max="60"
              />
            </div>
          </div>

          <div className="space-y-2 flex-1 flex flex-col">
            <Label htmlFor="area-message">메시지</Label>
            <Textarea
              id="area-message"
              placeholder="지역에 보낼 메시지를 입력하세요"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 resize-none"
              rows={3}
            />
          </div>

          <Button
            onClick={handleSendAppMessage}
            disabled={!areaCode || !message}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            [{areaCode}] 지역에 전송
          </Button>
        </TabsContent>
      </Tabs>

      {/* Right side - Checkcall responses */}
      <div className="w-80 border-l p-4">
        <Label className="text-sm font-medium mb-3 block">체크콜 응답</Label>
        <ScrollArea className="h-full -mr-4 pr-4">
          <div className="space-y-2">
            {CHECKCALL_RESPONSES.map((response) => (
              <Card
                key={response.id}
                className={cn(
                  "p-3 cursor-pointer transition-all hover:bg-accent",
                  selectedResponse === response.id && "bg-primary text-primary-foreground"
                )}
                onClick={() => handleCheckcallResponse(response)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{response.name}</span>
                  <MessageSquare className="w-4 h-4 opacity-50" />
                </div>
                <p className="text-xs mt-1 opacity-80">
                  {response.extra}
                </p>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
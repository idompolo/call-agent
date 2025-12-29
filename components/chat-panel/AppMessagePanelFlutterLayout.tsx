'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageSquare, Send, Users, User, CheckCircle } from 'lucide-react'
import { useMqttStore } from '@/store/mqtt-store'
import { useOrderStore } from '@/store/order-store'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// 체크콜 응답 템플릿 (Flutter와 동일)
const CHECKCALL_RESPONSES = [
  { id: 11, name: '탑승완료', extra: '고객님이 탑승하였습니다', color: 'bg-green-500/10 hover:bg-green-500/20 border-green-500' },
  { id: 12, name: '하차완료', extra: '고객님이 하차하였습니다', color: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500' },
  { id: 13, name: '취소', extra: '주문이 취소되었습니다', color: 'bg-red-500/10 hover:bg-red-500/20 border-red-500' },
  { id: 14, name: '도착', extra: '목적지에 도착하였습니다', color: 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500' },
  { id: 15, name: '대기중', extra: '고객님을 기다리고 있습니다', color: 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500' },
  { id: 16, name: '이동중', extra: '고객님 위치로 이동중입니다', color: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500' },
  { id: 17, name: '연락불가', extra: '고객님과 연락이 되지 않습니다', color: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500' },
  { id: 18, name: '예약확인', extra: '예약이 확인되었습니다', color: 'bg-teal-500/10 hover:bg-teal-500/20 border-teal-500' },
]

export function AppMessagePanelFlutterLayout() {
  const [messageType, setMessageType] = useState<'individual' | 'area'>('individual')
  const [callNumber, setCallNumber] = useState('')
  const [areaCode, setAreaCode] = useState('')
  const [message, setMessage] = useState('')
  const [duration, setDuration] = useState('15')
  const [title, setTitle] = useState('센터 안내')
  const [selectedResponse, setSelectedResponse] = useState<number | null>(null)
  
  const { publishMessage } = useMqttStore()
  const { selectedOrder } = useOrderStore()
  const { user } = useAuthStore()

  // Auto-fill from selected order
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

      // Individual driver app message
      const payload = [
        'noti',
        title,
        message,
        parseInt(duration) * 1000
      ].join('|')

      publishMessage(selectedOrder?.drvNo || callNumber, payload)
      
      toast.success('앱 메시지 전송 완료', {
        description: `#${callNumber} 기사앱으로 내용을 전달하였습니다`
      })
    } else {
      if (!areaCode || areaCode.length < 1) {
        toast.error('지역을 입력해주세요')
        return
      }

      if (!message.trim()) {
        toast.error('메시지를 입력해주세요')
        return
      }

      // Area broadcast message
      const payload = [
        'ftnh.send.noti',
        '',
        '',
        areaCode,
        duration,
        title,
        message
      ].join('|')

      publishMessage('ftnh:new', payload)
      
      toast.success('지역 메시지 전송 완료', {
        description: `[${areaCode}] 지역에 앱으로 내용을 전달하였습니다`
      })
    }

    // Clear after sending
    setMessage('')
  }

  const handleCheckcallResponse = (response: typeof CHECKCALL_RESPONSES[0]) => {
    if (!selectedOrder?.id) {
      toast.error('주문을 먼저 선택해주세요')
      return
    }

    setSelectedResponse(response.id)

    const orderId = selectedOrder.id
    const agentId = user?.id || '0'
    const delay = 10

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

    setTimeout(() => setSelectedResponse(null), 1500)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - Flutter 스타일 */}
      <div className="px-4 py-3 border-b">
        <Tabs value={messageType} onValueChange={(v) => setMessageType(v as any)}>
          <TabsList className="grid w-full max-w-xs grid-cols-2 h-8">
            <TabsTrigger value="individual" className="text-xs">
              <User className="w-3.5 h-3.5 mr-1" />
              개별 전송
            </TabsTrigger>
            <TabsTrigger value="area" className="text-xs">
              <Users className="w-3.5 h-3.5 mr-1" />
              지역 전송
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Message Form */}
        <div className="flex-1 p-4 space-y-3">
          {messageType === 'individual' ? (
            <>
              {/* Individual Message Form */}
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="콜번호"
                  value={callNumber}
                  onChange={(e) => setCallNumber(e.target.value)}
                  className="flex-1 h-9 text-sm"
                />
                <Input
                  type="number"
                  placeholder="유지시간"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-24 h-9 text-sm"
                  min="5"
                  max="60"
                />
                <span className="text-xs text-muted-foreground self-center">초</span>
              </div>
              
              <Textarea
                placeholder={`${user?.agentId || 'FTNH'}-T`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="resize-none h-24 text-sm"
              />

              <div className="flex gap-2">
                <Button
                  onClick={handleSendAppMessage}
                  disabled={!callNumber || !message}
                  size="sm"
                  className="flex-1"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  전송
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setMessage('')}
                  size="sm"
                >
                  닫기
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Area Message Form */}
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="지역"
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value)}
                  className="flex-1 h-9 text-sm"
                />
                <Input
                  type="number"
                  placeholder="유지시간"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-24 h-9 text-sm"
                  min="5"
                  max="60"
                />
                <span className="text-xs text-muted-foreground self-center">초</span>
              </div>

              <Input
                type="text"
                placeholder="제목 (구형전용)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 text-sm"
              />
              
              <Textarea
                placeholder="보낼 내용"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="resize-none h-24 text-sm"
              />

              <div className="flex gap-2">
                <Button
                  onClick={handleSendAppMessage}
                  disabled={!areaCode || !message}
                  size="sm"
                  className="flex-1"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  전송
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setMessage('')}
                  size="sm"
                >
                  닫기
                </Button>
              </div>
            </>
          )}

          {/* 현재 주문 정보 표시 */}
          {selectedOrder && (
            <Card className="p-2 bg-muted/20">
              <p className="text-xs text-muted-foreground">
                호출장소: {selectedOrder.callplace || '-'}
              </p>
            </Card>
          )}
        </div>

        {/* Right Side - Checkcall Responses */}
        <div className="w-72 border-l p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">[체크콜 응답]</h3>
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
          </div>
          <ScrollArea className="h-full -mr-4 pr-4">
            <div className="space-y-2">
              {CHECKCALL_RESPONSES.map((response) => (
                <Card
                  key={response.id}
                  className={cn(
                    "p-2.5 cursor-pointer transition-all border",
                    response.color,
                    selectedResponse === response.id && "ring-2 ring-primary scale-[0.98]"
                  )}
                  onClick={() => handleCheckcallResponse(response)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className="font-medium text-xs block mb-0.5">
                        {response.name.replace('$agent', user?.agentId || 'FTNH')}
                      </span>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        {response.extra}
                      </p>
                    </div>
                    <MessageSquare className="w-3.5 h-3.5 opacity-50 mt-0.5" />
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
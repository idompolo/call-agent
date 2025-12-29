'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Send, RotateCcw, X } from 'lucide-react'
import { useMqttStore } from '@/store/mqtt-store'
import { useOrderStore } from '@/store/order-store'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// SMS 템플릿 (Flutter idioms와 동일)
const SMS_TEMPLATES = [
  { id: 1, text: 'Plz wait a moment' },
  { id: 2, text: 'Taxi will arrive soon' },
  { id: 3, text: 'Driver is on the way' },
  { id: 4, text: 'Thank you for waiting' },
  { id: 5, text: 'Call if you need help' },
  { id: 6, text: 'Service temporarily unavailable' },
  { id: 7, text: 'Your reservation is confirmed' },
  { id: 8, text: 'Cancellation completed' },
  { id: 9, text: 'Please check your location' },
  { id: 10, text: 'Driver has arrived' },
]

export function SmsPanelFlutterLayout() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [message, setMessage] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const { publishMessage } = useMqttStore()
  const { selectedOrder } = useOrderStore()
  const { user } = useAuthStore()

  // Calculate byte length for SMS (90 byte limit)
  const byteLength = useMemo(() => {
    const encoder = new TextEncoder()
    return encoder.encode(message).length
  }, [message])

  const isOverLimit = byteLength > 90
  const canSend = phoneNumber.length > 10 && message.trim().length > 0 && !isOverLimit

  // Auto-fill from selected order
  useEffect(() => {
    if (selectedOrder) {
      setPhoneNumber(selectedOrder.telephone || '')
      
      // Generate default message like Flutter
      if (selectedOrder.licensePlate && selectedOrder.callplace) {
        const time = new Date().toLocaleTimeString('ko-KR', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false
        })
        const date = new Date().toLocaleDateString('ko-KR', {
          month: 'numeric',
          day: 'numeric'
        })
        setMessage(`Plz take cab#${selectedOrder.licensePlate} at ${selectedOrder.callplace} ${time} ${date}`)
      }
    }
  }, [selectedOrder])

  const handleTemplateSelect = (template: typeof SMS_TEMPLATES[0]) => {
    setSelectedTemplate(template.id)
    
    // Flutter 동작과 동일하게 구현
    if (message.startsWith('Plz take cab#') && selectedOrder?.callplace) {
      // 기존 메시지에 템플릿 추가
      setMessage(prev => `${prev} ${template.text}`)
    } else {
      // 템플릿으로 교체
      setMessage(template.text)
    }
  }

  const handleSendSms = () => {
    if (!canSend) return

    // MQTT로 SMS 전송
    const timestamp = new Date().toISOString().replace(/[:-]/g, '').split('.')[0]
    const payload = [
      phoneNumber,
      selectedOrder?.customerName || user?.name || 'ftnh',
      message,
      user?.agentId || '',
      timestamp
    ].join('|')

    publishMessage('sms.send', payload)
    
    toast.success('SMS 전송 완료', {
      description: `${phoneNumber}로 SMS를 전송하였습니다`
    })

    // Clear after sending
    setMessage('')
    setSelectedTemplate(null)
  }

  const handleReset = () => {
    // Flutter의 초기화 로직과 동일
    if (selectedOrder?.licensePlate && selectedOrder?.callplace) {
      const time = new Date().toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      })
      const date = new Date().toLocaleDateString('ko-KR', {
        month: 'numeric',
        day: 'numeric'
      })
      setMessage(`Plz take cab#${selectedOrder.licensePlate} at ${selectedOrder.callplace} ${time} ${date}`)
    } else {
      setMessage('')
    }
    setSelectedTemplate(null)
  }

  const handleClear = () => {
    setMessage('')
    setSelectedTemplate(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - Flutter와 동일한 레이아웃 */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-xl font-bold">문자보내기</h2>
        <div className="flex gap-2 flex-1 max-w-xs ml-4">
          <Button
            onClick={handleSendSms}
            disabled={!canSend}
            className="flex-1"
            size="sm"
          >
            SMS 전송
          </Button>
          <Button
            variant="ghost"
            onClick={() => {/* 닫기 로직 */}}
            size="sm"
          >
            닫기
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {/* Message Input - 상단 */}
        <div className="mb-4">
          <Textarea
            placeholder="보낼 내용을 적으세요."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={cn(
              "resize-none h-20 bg-muted/30",
              isOverLimit && "border-destructive focus:ring-destructive"
            )}
            maxLength={200}
          />
        </div>

        {/* Split Layout - Flutter Expanded Row */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left Side - flex: 3 */}
          <div className="flex-[3] flex flex-col space-y-4">
            {/* Preview Section */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">미리보기</span>
                <span className={cn(
                  "text-sm font-bold",
                  isOverLimit ? "text-destructive" : "text-foreground"
                )}>
                  {byteLength} / 90 bytes
                </span>
              </div>
              <Card className="flex-1 p-3 bg-muted/10">
                <p className="text-sm font-mono break-all whitespace-pre-wrap">
                  {message || <span className="text-muted-foreground">메시지가 여기에 표시됩니다</span>}
                </p>
              </Card>
            </div>

            {/* Phone Input and Buttons */}
            <div className="space-y-3">
              <Input
                type="tel"
                placeholder="전화번호"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="bg-muted/30"
              />
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1"
                  size="sm"
                >
                  초기화
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClear}
                  className="flex-1"
                  size="sm"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {/* Right Side - flex: 4 - Templates */}
          <div className="flex-[4] flex flex-col">
            <h3 className="text-sm font-medium mb-2">SMS 템플릿</h3>
            <ScrollArea className="flex-1 border rounded-lg p-2">
              <div className="space-y-1">
                {SMS_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    className={cn(
                      "p-2 rounded cursor-pointer transition-colors hover:bg-accent",
                      selectedTemplate === template.id && "bg-accent border-l-2 border-primary"
                    )}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <p className="text-sm">{template.text}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}
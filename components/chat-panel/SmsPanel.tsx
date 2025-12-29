'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Send, RotateCcw, X } from 'lucide-react'
import { useMqttStore } from '@/store/mqtt-store'
import { useOrderStore } from '@/store/order-store'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// SMS 템플릿 (idioms)
const SMS_TEMPLATES = [
  { id: 1, text: 'Plz wait a moment' },
  { id: 2, text: 'Taxi will arrive soon' },
  { id: 3, text: 'Driver is on the way' },
  { id: 4, text: 'Thank you for waiting' },
  { id: 5, text: 'Call if you need help' },
  { id: 6, text: 'Service temporarily unavailable' },
  { id: 7, text: 'Your reservation is confirmed' },
  { id: 8, text: 'Cancellation completed' },
]

export function SmsPanel() {
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

  // Auto-fill phone number from selected order
  useEffect(() => {
    if (selectedOrder?.telephone) {
      setPhoneNumber(selectedOrder.telephone)
    }
  }, [selectedOrder])

  // Generate default message for selected order
  const generateDefaultMessage = () => {
    if (!selectedOrder) return ''
    
    const { licensePlate, callplace } = selectedOrder
    if (licensePlate && callplace) {
      const time = new Date().toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
      return `Plz take cab#${licensePlate} at ${callplace} ${time}`
    }
    return ''
  }

  const handleTemplateSelect = (template: typeof SMS_TEMPLATES[0]) => {
    setSelectedTemplate(template.id)
    
    // If there's a default message, append template, otherwise replace
    if (message.startsWith('Plz take cab#')) {
      setMessage(prev => `${prev} ${template.text}`)
    } else {
      setMessage(template.text)
    }
  }

  const handleSendSms = () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('전화번호를 입력해주세요')
      return
    }

    if (!message || message.trim().length === 0) {
      toast.error('메시지를 입력해주세요')
      return
    }

    if (isOverLimit) {
      toast.error('메시지가 90 bytes를 초과했습니다')
      return
    }

    // Publish SMS via MQTT
    const timestamp = new Date().toISOString().replace(/[:-]/g, '').split('.')[0]
    const payload = [
      phoneNumber,
      selectedOrder?.customerName || 'Customer',
      message,
      user?.agentId || '',
      timestamp
    ].join('|')

    publishMessage('sms.send', payload)
    
    toast.success('SMS 전송 완료', {
      description: `${phoneNumber}로 메시지를 전송했습니다`
    })

    // Clear message after sending
    setMessage('')
    setSelectedTemplate(null)
  }

  const handleReset = () => {
    setMessage(generateDefaultMessage())
    setSelectedTemplate(null)
  }

  const handleClear = () => {
    setMessage('')
    setSelectedTemplate(null)
  }

  return (
    <div className="flex h-full">
      {/* Left side - Message composition */}
      <div className="flex-1 flex flex-col p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">전화번호</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="010-0000-0000"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <div className="space-y-2 flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <Label htmlFor="message">메시지</Label>
            <Badge 
              variant={isOverLimit ? "destructive" : "secondary"}
              className="text-xs"
            >
              {byteLength} / 90 bytes
            </Badge>
          </div>
          <Textarea
            id="message"
            placeholder="보낼 내용을 입력하세요"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={cn(
              "flex-1 resize-none font-mono",
              isOverLimit && "border-destructive focus:ring-destructive"
            )}
            maxLength={200}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSendSms}
            disabled={!phoneNumber || !message || isOverLimit}
            className="flex-1"
          >
            <Send className="w-4 h-4 mr-2" />
            SMS 전송
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            size="icon"
            title="초기화"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            size="icon"
            title="지우기"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Preview */}
        <Card className="p-3 bg-muted/50">
          <Label className="text-xs text-muted-foreground">미리보기</Label>
          <p className="mt-1 text-sm font-mono break-all">
            {message || <span className="text-muted-foreground">메시지가 여기에 표시됩니다</span>}
          </p>
        </Card>
      </div>

      {/* Right side - Templates */}
      <div className="w-80 border-l p-4">
        <Label className="text-sm font-medium mb-3 block">SMS 템플릿</Label>
        <ScrollArea className="h-full -mr-4 pr-4">
          <div className="space-y-2">
            {SMS_TEMPLATES.map((template) => (
              <Card
                key={template.id}
                className={cn(
                  "p-3 cursor-pointer transition-all hover:bg-accent",
                  selectedTemplate === template.id && "bg-accent border-primary"
                )}
                onClick={() => handleTemplateSelect(template)}
              >
                <p className="text-sm">{template.text}</p>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
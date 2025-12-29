'use client'

import { useEffect, useState } from 'react'
import { useOrderStore } from '@/store/order-store'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, X, MapPin, Search } from 'lucide-react'

const orderSchema = z.object({
  customerName: z.string().optional(),
  telephone: z.string().optional(),
  calldong: z.string().optional(),
  callplace: z.string().optional(),
  poiName: z.string().optional(),
  extra: z.string().optional(),
})

type OrderFormData = z.infer<typeof orderSchema>

export function OrderEditPanel() {
  const { selectedOrder, updateOrder } = useOrderStore()
  const [isEditing, setIsEditing] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerName: '',
      telephone: '',
      calldong: '',
      callplace: '',
      poiName: '',
      extra: '',
    }
  })

  useEffect(() => {
    if (selectedOrder) {
      reset({
        customerName: selectedOrder.customerName || '',
        telephone: selectedOrder.telephone || '',
        calldong: selectedOrder.calldong || '',
        callplace: selectedOrder.callplace || '',
        poiName: selectedOrder.poiName || '',
        extra: selectedOrder.extra || '',
      })
      setIsEditing(true)
    } else {
      reset({
        customerName: '',
        telephone: '',
        calldong: '',
        callplace: '',
        poiName: '',
        extra: '',
      })
      setIsEditing(false)
    }
  }, [selectedOrder, reset])

  const onSubmit = (data: OrderFormData) => {
    if (selectedOrder) {
      updateOrder(selectedOrder.id, data)
      // TODO: Send update to server
    } else {
      // TODO: Create new order
    }
  }

  return (
    <div className="border rounded-lg px-2 py-1.5 bg-card">
      <form onSubmit={handleSubmit(onSubmit)} className="flex items-center gap-2">
        {/* 모든 입력 필드를 한 줄로 */}
        <div className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          {selectedOrder ? `#${selectedOrder.id}` : '새주문'}
        </div>
        
        <input
          {...register('customerName')}
          className="w-20 px-2 py-0.5 border rounded text-xs"
          placeholder="고객명"
        />

        <input
          {...register('telephone')}
          className="w-28 px-2 py-0.5 border rounded text-xs"
          placeholder="전화번호"
        />

        <input
          {...register('calldong')}
          className="w-20 px-2 py-0.5 border rounded text-xs"
          placeholder="동"
        />

        <input
          {...register('callplace')}
          className="flex-1 px-2 py-0.5 border rounded text-xs"
          placeholder="상세주소"
        />

        <div className="flex gap-1">
          <input
            {...register('poiName')}
            className="w-24 px-2 py-0.5 border rounded text-xs"
            placeholder="POI"
          />
          <button
            type="button"
            className="p-0.5 border rounded hover:bg-accent"
          >
            <Search className="h-3 w-3" />
          </button>
        </div>

        <input
          {...register('extra')}
          className="w-32 px-2 py-0.5 border rounded text-xs"
          placeholder="메모"
        />

        {/* 버튼 그룹 */}
        {isEditing && (
          <div className="flex gap-1">
            <button
              type="submit"
              className="p-0.5 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              <Save className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                reset()
                setIsEditing(false)
              }}
              className="p-0.5 border rounded hover:bg-accent"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
'use client'

import { useState, useRef, useEffect } from 'react'
import { Phone, User, MapPin, Navigation, FileText, Clock, Send, X, RotateCcw, Calendar, Search, Car } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrderStore } from '@/store/order-store'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { orderService } from '@/services/order-service'
import { useAuthStore } from '@/store/auth-store'
import { RecentOrdersDialog, RecentOrder } from '@/components/recent-orders-dialog'
import { AsyncAutocomplete } from '@/components/ui/async-autocomplete'
import { SyncAutocomplete } from '@/components/ui/sync-autocomplete'
import { actionService } from '@/services/action-service'
import { Order } from '@/types/order'

interface OrderInputPanelProps {
  className?: string
}

// Export ref for external access
export const telephoneFocusRef = { current: null as HTMLInputElement | null }

export function OrderInputPanel({ className }: OrderInputPanelProps) {
  const { selectedOrder, updateOrder, addOrder } = useOrderStore()
  const { user } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form states
  const [telephone, setTelephone] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [callPlace, setCallPlace] = useState('')
  const [destination, setDestination] = useState('')
  const [memo, setMemo] = useState('')
  const [isReserve, setIsReserve] = useState(false)
  const [reserveTime, setReserveTime] = useState('')
  const [reserveNotification, setReserveNotification] = useState(10)
  const [cancelCode, setCancelCode] = useState('')
  const [driverNo, setDriverNo] = useState('')
  const [showReserveMenu, setShowReserveMenu] = useState(false)
  const [reserveMenuPosition, setReserveMenuPosition] = useState({ x: 0, y: 0 })
  const [showRecentOrders, setShowRecentOrders] = useState(false)
  const [recentOrderTelephone, setRecentOrderTelephone] = useState('')
  
  // 취소된 주문인지 확인
  const isCancelledOrder = !!selectedOrder?.cancelAt || selectedOrder?.status === '취소'
  
  // Refs for focus management
  const telephoneRef = useRef<HTMLInputElement>(null)
  const customerNameRef = useRef<HTMLInputElement>(null)
  const callPlaceRef = useRef<HTMLInputElement>(null)
  const destinationRef = useRef<HTMLInputElement>(null)
  const memoRef = useRef<HTMLInputElement>(null)
  const driverNoRef = useRef<HTMLInputElement>(null)
  const cancelCodeRef = useRef<HTMLInputElement>(null)
  
  // Connect external ref to internal ref
  useEffect(() => {
    telephoneFocusRef.current = telephoneRef.current
  }, [])
  
  // Load selected order data
  useEffect(() => {
    if (selectedOrder) {
      const telephone = selectedOrder.telephone || ''
      setTelephone(telephone)
      setCustomerName(selectedOrder.customerName || '')
      setCallPlace(selectedOrder.callplace || '')
      setDestination(selectedOrder.calldong || '')
      setMemo(selectedOrder.extra || '')
      setDriverNo(selectedOrder.drvNo || '')
      
      // 취소된 주문인 경우 취소 상태 설정
      if (selectedOrder.cancelStatus) {
        // 취소 상태에서 숫자만 추출 (예: "취소1" -> "1")
        const cancelCode = selectedOrder.cancelStatus.replace('취소', '').split('(')[0].trim()
        setCancelCode(cancelCode)
      } else {
        setCancelCode('')
      }
      
      if (selectedOrder.reserveAt) {
        setIsReserve(true)
        setReserveTime(format(new Date(selectedOrder.reserveAt), 'yyyy-MM-dd HH:mm'))
        setReserveNotification(selectedOrder.notiTime || 10)
      } else {
        setIsReserve(false)
        setReserveTime('')
      }
      
      // 전화번호가 있으면 최근 이력 자동 조회
      if (telephone) {
        setRecentOrderTelephone(telephone)
        setShowRecentOrders(true)
        
        // 최근 이력 팝업이 열린 후 포커스 설정 (동기적 처리)
        setTimeout(() => {
          handleFocusBasedOnOrderStatus(selectedOrder)
        }, 200) // 팝업이 열릴 시간을 주고 포커스 설정
      } else {
        // 전화번호가 없으면 바로 포커스 설정
        handleFocusBasedOnOrderStatus(selectedOrder)
      }
    } else {
      // 선택 해제 시 초기화
      handleReset()
    }
  }, [selectedOrder])
  
  // 포커스 처리 함수 - 주문 상태에 따라 적절한 필드에 포커스
  const handleFocusBasedOnOrderStatus = (order: Order) => {
    // 취소된 주문이면 포커스 설정하지 않음
    if (order.cancelAt || order.status === '취소') {
      return
    }
    
    // requestAnimationFrame을 사용하여 다음 렌더링 사이클에 실행
    requestAnimationFrame(() => {
      // 배차 상태인 경우 취소 input으로 포커스
      const isAcceptedOrder = order.status === '배차' || order.acceptAt
      // 접수/대기 상태이고 드라이버가 없으면 드라이버 필드로 포커스
      const isWaitingOrder = (order.status === '접수' || order.status === '대기' || !order.acceptAt) && !order.drvNo
      
      // 포커스 설정 함수
      const setFocusWithRetry = (ref: React.RefObject<HTMLInputElement>, fieldName: string, retries = 3) => {
        if (retries <= 0) {
          return
        }
        
        if (ref.current) {
          ref.current.focus()
          ref.current.select()
          
          // 포커스가 제대로 설정되었는지 확인
          setTimeout(() => {
            if (document.activeElement !== ref.current) {
              setFocusWithRetry(ref, fieldName, retries - 1)
            }
          }, 100)
        }
      }
      
      if (isAcceptedOrder) {
        setFocusWithRetry(cancelCodeRef, 'cancel field')
      } else if (isWaitingOrder) {
        setFocusWithRetry(driverNoRef, 'driver field')
      } else {
        setFocusWithRetry(telephoneRef, 'telephone field')
      }
    })
  }
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // F7 - Focus telephone
      if (e.key === 'F7') {
        e.preventDefault()
        telephoneRef.current?.focus()
      }
      // F8 - Submit/Cancel order (based on cancelCode)
      else if (e.key === 'F8') {
        e.preventDefault()
        handleSubmit()
      }
      // F12 - Reset
      else if (e.key === 'F12') {
        e.preventDefault()
        handleReset()
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [cancelCode, telephone, callPlace])
  
  // 버튼 활성화 여부 판단 (Flutter 로직과 동일)
  const isButtonEnabled = () => {
    // 이미 배차된 주문이고 취소 코드가 없으면 비활성화
    if (selectedOrder?.acceptAt && !cancelCode) {
      return false
    }
    
    // 이미 취소된 주문이면 비활성화
    if (selectedOrder?.cancelAt) {
      return false
    }
    
    // 신규 주문이거나 수정 가능한 상태면 활성화
    return true
  }

  const handleSubmit = async () => {
    // 버튼이 비활성화 상태면 실행하지 않음
    if (!isButtonEnabled()) return
    
    // 취소 코드가 있으면 취소 처리
    if (cancelCode && selectedOrder?.id) {
      if (!confirm(`취소 코드: ${cancelCode}\n정말 취소하시겠습니까?`)) return
      
      setIsSubmitting(true)
      try {
        await orderService.cancelOrder(selectedOrder.id, cancelCode)
        // MQTT로 요청만 보내고, 실제 업데이트는 MQTT 응답(web/cancelOrder)으로 처리됨
        // updateOrder는 use-mqtt.ts에서 처리
        handleReset()
      } catch (error) {
        console.error('Failed to cancel order:', error)
        alert('주문 취소에 실패했습니다.')
      } finally {
        setIsSubmitting(false)
      }
      return
    }
    
    // Flutter 로직과 동일한 필수 필드 검증
    if (!telephone) {
      alert('고객 전화번호 필수 사항!!')
      telephoneRef.current?.focus()
      return
    }
    
    if (!customerName) {
      alert('고객명 필수 사항!!')
      customerNameRef.current?.focus()
      return
    }
    
    if (!callPlace) {
      alert('탑승지 필수 사항!!')
      callPlaceRef.current?.focus()
      return
    }
    
    setIsSubmitting(true)
    try {
      // Flutter의 로직을 정확히 따름
      if (!selectedOrder?.id) {
        // 신규 주문 생성
        if (isReserve && reserveTime) {
          // 예약 주문 (Flutter: reserveRequest)
          const orderData = {
            telephone,
            customerName,
            callplace: callPlace,
            calldong: destination,
            extra: memo,
            reserveAt: new Date(reserveTime),
            notiTime: reserveNotification
          }
          await orderService.createOrder(orderData)
          // MQTT 응답을 기다림 (use-mqtt.ts에서 처리)
        } else if (driverNo) {
          // 드라이버가 지정된 신규 주문 (Flutter: acceptOrder with orderId=-1)
          const orderData = {
            telephone,
            customerName,
            callplace: callPlace,
            calldong: destination,
            extra: memo,
            drvNo: driverNo,
            acceptAt: new Date(),
            status: '배차'
          }
          await orderService.createOrder(orderData)
          // MQTT 응답을 기다림 (use-mqtt.ts에서 처리)
        } else {
          // 일반 신규 주문 (Flutter: addOrder)
          const orderData = {
            telephone,
            customerName,
            callplace: callPlace,
            calldong: destination,
            extra: memo
          }
          await orderService.createOrder(orderData)
          // MQTT 응답을 기다림 (use-mqtt.ts에서 처리)
        }
      } else {
        // 기존 주문 수정
        if (driverNo && !selectedOrder.acceptAt) {
          // 접수 상태에서 드라이버 지정 (배차)
          const orderData = {
            telephone,
            customerName,
            callplace: callPlace,
            calldong: destination,
            extra: memo,
            drvNo: driverNo
          }
          await orderService.updateOrder(selectedOrder.id, orderData)
          // MQTT 응답을 기다림 (use-mqtt.ts에서 처리)
        } else if (selectedOrder.acceptAt && driverNo && selectedOrder.drvNo !== driverNo) {
          // 배차 기사 변경 (Flutter: acceptRequest with different driver)
          const orderData = {
            telephone,
            customerName,
            callplace: callPlace,
            calldong: destination,
            extra: memo,
            drvNo: driverNo
          }
          await orderService.updateOrder(selectedOrder.id, orderData)
          // MQTT 응답을 기다림 (use-mqtt.ts에서 처리)
        } else {
          // 일반 수정 (Flutter: editRequest)
          const orderData = {
            telephone,
            customerName,
            callplace: callPlace,
            calldong: destination,
            extra: memo,
            drvNo: driverNo || undefined
          }
          await orderService.updateOrder(selectedOrder.id, orderData)
          // MQTT 응답을 기다림 (use-mqtt.ts에서 처리)
        }
      }
      
      // Reset form after successful submission
      handleReset()
    } catch (error) {
      console.error('Failed to submit order:', error)
      alert('주문 접수에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  
  const handleReset = () => {
    setTelephone('')
    setCustomerName('')
    setCallPlace('')
    setDestination('')
    setMemo('')
    setIsReserve(false)
    setReserveTime('')
    setReserveNotification(10)
    setCancelCode('')
    setDriverNo('')
    
    // 최근 이력 팝업 닫기
    setShowRecentOrders(false)
    setRecentOrderTelephone('')
    
    // 주문 선택 해제
    if (selectedOrder) {
      useOrderStore.getState().selectOrder(null)
    }
    
    telephoneRef.current?.focus()
  }
  
  const handleSearchHistory = async () => {
    if (telephone) {
      setRecentOrderTelephone(telephone)
      setShowRecentOrders(true)
      
      // 최근 이력 조회 후 가장 최근 주문으로 자동 채우기 (Flutter 로직과 동일)
      try {
        const recentOrders = await orderService.getRecentOrder(telephone)
        if (recentOrders && recentOrders.length > 0) {
          // 첫 번째 주문(가장 최근)으로 폼 채우기
          const mostRecentOrder = recentOrders[0]
          
          // 선택된 주문이 없을 때만 자동 채우기
          if (!selectedOrder) {
            setTimeout(() => {
              setTelephone(telephone) // 전화번호는 그대로 유지
              setCustomerName(mostRecentOrder.user_name || '')
              setDestination(mostRecentOrder.calldong || '')
              setCallPlace(mostRecentOrder.callplace || '')
              
              // 특정 키워드가 포함된 경우만 메모 필드 채우기 (Flutter 로직과 동일)
              const extraText = mostRecentOrder.order_extra?.toLowerCase()
              if (extraText && ['long', 'suv', '긴급'].some(keyword => extraText.includes(keyword))) {
                setMemo(mostRecentOrder.order_extra || '')
              }
              
              // 팝업이 열린 후에도 전화번호 필드에 포커스 유지
              telephoneRef.current?.focus()
            }, 100)
          }
        }
      } catch (error) {
        console.error('Failed to load recent orders:', error)
      }
      
      // 팝업이 열린 후 포커스 이동
      setTimeout(() => {
        const element = document.getElementById('recent-orders-container')
        if (element) {
          element.focus()
        }
      }, 150)
    }
  }

  const handleSelectRecentOrder = (order: RecentOrder) => {
    // 선택한 주문의 정보로 폼 채우기
    setTelephone(order.user_telephone || '')
    setCustomerName(order.user_name || '')
    setDestination(order.calldong || '')
    setCallPlace(order.callplace || '')
    
    // 특정 키워드가 포함된 경우만 메모 필드 채우기 (Flutter 로직과 동일)
    const extraText = order.order_extra?.toLowerCase()
    if (extraText && ['long', 'suv', '긴급'].some(keyword => extraText.includes(keyword))) {
      setMemo(order.order_extra || '')
    }
    
    // 목적지 필드로 포커스 이동
    destinationRef.current?.focus()
  }

  // 이력 팝업에서 선택 행이 바뀔 때마다 input 채우기 (팝업이 열려있을 때만)
  const handleSelectionChange = (order: RecentOrder) => {
    // 팝업이 열려있을 때만 입력 필드 업데이트
    if (showRecentOrders) {
      // 선택된 행이 바뀔 때마다 입력 필드 업데이트
      setTelephone(order.user_telephone || '')
      setCustomerName(order.user_name || '')
      setDestination(order.calldong || '')
      setCallPlace(order.callplace || '')
      
      // 특정 키워드가 포함된 경우만 메모 필드 채우기
      const extraText = order.order_extra?.toLowerCase()
      if (extraText && ['long', 'suv', '긴급'].some(keyword => extraText.includes(keyword))) {
        setMemo(order.order_extra || '')
      } else {
        setMemo('') // 키워드가 없으면 메모 초기화
      }
    }
  }

  // 포커스 시 텍스트 전체 선택
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      e.target.select()
    }, 0)
  }

  // 방향키 처리 함수
  const handleArrowKeys = (
    e: React.KeyboardEvent<HTMLInputElement>,
    prevRef: React.RefObject<HTMLInputElement> | null,
    nextRef: React.RefObject<HTMLInputElement> | null
  ) => {
    const target = e.target as HTMLInputElement
    const hasSelection = target.selectionStart !== target.selectionEnd
    
    if (e.key === 'ArrowLeft' && prevRef) {
      e.preventDefault()
      prevRef.current?.focus()
    } else if (e.key === 'ArrowRight' && nextRef) {
      e.preventDefault()
      nextRef.current?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      // 텍스트가 선택된 상태면 커서를 끝으로 이동하고 한 칸 앞으로
      if (hasSelection) {
        const length = target.value.length
        const newPos = Math.max(0, length - 1)
        target.setSelectionRange(newPos, newPos)
      } else {
        const cursorPos = target.selectionStart || 0
        const newPos = Math.max(0, cursorPos - 1)
        target.setSelectionRange(newPos, newPos)
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      // 텍스트가 선택된 상태면 커서를 끝으로 이동
      if (hasSelection) {
        const length = target.value.length
        target.setSelectionRange(length, length)
      } else {
        const cursorPos = target.selectionStart || 0
        const newPos = Math.min(target.value.length, cursorPos + 1)
        target.setSelectionRange(newPos, newPos)
      }
    }
  }

  const handleTelephoneKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (telephone) {
        await handleSearchHistory()
      }
    } else {
      handleArrowKeys(e, null, customerNameRef)
    }
  }
  
  return (
    <div className={cn(
      "bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-1 pt-0.5",
      className
    )}>
      <div className="flex items-center gap-0.5">
        {/* 초기화 버튼 (F12) */}
        <button
          onClick={handleReset}
          className="h-7 px-2 bg-gray-600 text-white text-xs font-medium rounded-sm hover:bg-gray-700 transition-colors whitespace-nowrap"
          title="초기화 (F12)"
        >
          초기화(F12)
        </button>
        {/* Telephone */}
        <div className="relative">
          <Phone className="absolute left-1 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
          <input
            ref={telephoneRef}
            type="tel"
            value={telephone}
            onChange={(e) => !isCancelledOrder && setTelephone(e.target.value)}
            onKeyDown={handleTelephoneKeyDown}
            onFocus={handleFocus}
            readOnly={isCancelledOrder}
            className="h-7 w-36 pl-5 pr-5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            placeholder="전화번호(F7)"
          />
          <button
            onClick={handleSearchHistory}
            disabled={isCancelledOrder}
            className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="이력 조회"
          >
            <Search className="h-3 w-3 text-gray-400" />
          </button>
        </div>
        
        {/* Customer Name */}
        <div className="relative">
          <User className="absolute left-1 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
          <input
            ref={customerNameRef}
            type="text"
            value={customerName}
            onChange={(e) => !isCancelledOrder && setCustomerName(e.target.value)}
            onKeyDown={(e) => handleArrowKeys(e, telephoneRef, destinationRef)}
            onFocus={handleFocus}
            readOnly={isCancelledOrder}
            className="h-7 w-36 pl-5 pr-0.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            placeholder="고객명"
          />
        </div>
        
        {/* Destination - 목적지 */}
        <div className="relative">
          <Navigation className="absolute left-1 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
          <input
            ref={destinationRef}
            type="text"
            value={destination}
            onChange={(e) => !isCancelledOrder && setDestination(e.target.value)}
            onKeyDown={(e) => handleArrowKeys(e, customerNameRef, callPlaceRef)}
            onFocus={handleFocus}
            readOnly={isCancelledOrder}
            className="h-7 w-44 pl-5 pr-0.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            placeholder="목적지"
          />
        </div>
        
        {/* Call Place - 탑승지 */}
        <AsyncAutocomplete
          value={callPlace}
          onChange={setCallPlace}
          onSelect={(item: { place: string }) => {
            // 항목 선택 시 검색 키워드를 제거하고 선택된 값만 설정
            setCallPlace(item.place)
          }}
          asyncSuggestions={async (searchValue: string) => {
            if (!searchValue.trim()) return []
            
            // 콤마로 분리하여 멀티 검색 지원
            const queries = searchValue.split(',').map(q => q.trim()).filter(q => q)
            
            try {
              const suggestions = await orderService.suggestionPlace(queries, 1)
              return suggestions
            } catch (error) {
              console.error('Failed to fetch place suggestions:', error)
              return []
            }
          }}
          suggestionBuilder={(item: { place: string }) => (
            <span>{item.place}</span>
          )}
          placeholder="탑승지"
          disabled={isCancelledOrder}
          readOnly={isCancelledOrder}
          inputRef={callPlaceRef}
          onKeyDown={(e) => {
            // ArrowLeft/Right 키 처리는 AsyncAutocomplete 내부에서 하지 않고 여기서 처리
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
              handleArrowKeys(e, destinationRef, memoRef)
            }
          }}
          onFocus={handleFocus}
        />
        
        {/* Memo */}
        <div className="relative">
          <FileText className="absolute left-1 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
          <input
            ref={memoRef}
            type="text"
            value={memo}
            onChange={(e) => !isCancelledOrder && setMemo(e.target.value)}
            onKeyDown={(e) => handleArrowKeys(e, callPlaceRef, driverNoRef)}
            onFocus={handleFocus}
            readOnly={isCancelledOrder}
            className="h-7 w-48 pl-5 pr-0.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            placeholder="메모"
          />
        </div>
        
        {/* Driver No - 드라이버 */}
        <div className="relative">
          <Car className="absolute left-1 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
          <input
            ref={driverNoRef}
            type="text"
            value={driverNo}
            onChange={(e) => !isCancelledOrder && setDriverNo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isCancelledOrder) {
                e.preventDefault()
                handleSubmit()
              } else {
                handleArrowKeys(e, memoRef, cancelCodeRef)
              }
            }}
            onFocus={handleFocus}
            readOnly={isCancelledOrder}
            className="h-7 w-24 pl-5 pr-0.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            placeholder="드라이버"
          />
        </div>
        
        {/* Cancel Code - 취소 */}
        <div className="relative">
          {/* 취소 코드가 있고 readOnly 상태일 때 툴팁 표시 */}
          {cancelCode && isCancelledOrder && (
            <div className="absolute bottom-full right-0 mb-1 z-50 animate-fade-in">
              <div className="bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-md px-3 py-2 shadow-lg whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-red-400 text-sm">취소{cancelCode}</span>
                  <span className="text-gray-300 text-sm">
                    {(() => {
                      const cancelTypes = actionService.searchCancelTypes(cancelCode)
                      const cancelType = cancelTypes.find(t => t.name?.replace('취소', '').trim() === cancelCode)
                      return cancelType?.extra || '취소 사유'
                    })()}
                  </span>
                </div>
                <div className="absolute bottom-0 right-[65px] transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 dark:bg-gray-700"></div>
              </div>
            </div>
          )}
          <SyncAutocomplete
            value={cancelCode}
            onChange={setCancelCode}
            onSelect={(item: { code: string; description: string }) => {
              setCancelCode(item.code)
            }}
            getSuggestions={(searchValue: string) => {
              // 메모리에 캐시된 취소 타입에서 검색
              const results = actionService.searchCancelTypes(searchValue)
              return results.map(type => ({
                code: type.name?.replace('취소', '').trim() || '',
                description: type.extra || ''
              }))
            }}
            suggestionBuilder={(item: { code: string; description: string }) => (
              <div className="flex items-center justify-between w-full">
                <span className="font-semibold text-red-600 dark:text-red-400">취소{item.code}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 truncate">{item.description}</span>
              </div>
            )}
            placeholder="취소"
            disabled={!!isCancelledOrder}
            readOnly={!!isCancelledOrder}
            showDropdownOnReadOnly={false} // readOnly 상태에서는 드롭다운 숨김
            inputRef={cancelCodeRef}
            icon={<X className="h-3 w-3 text-red-500" />}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isCancelledOrder) {
                e.preventDefault()
                handleSubmit()
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                handleArrowKeys(e, driverNoRef, null)
              }
            }}
            onFocus={handleFocus}
          />
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-0.5 ml-auto relative">
          <button
            onClick={handleSubmit}
            onContextMenu={(e) => {
              e.preventDefault()
              setReserveMenuPosition({ x: e.pageX, y: e.pageY })
              setShowReserveMenu(true)
            }}
            disabled={isSubmitting || !isButtonEnabled()}
            className={cn(
              "h-7 px-2 text-white text-xs font-medium rounded-sm transition-colors whitespace-nowrap",
              !isButtonEnabled() ? "bg-gray-400 cursor-not-allowed" :
              cancelCode ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700",
              "disabled:opacity-50"
            )}
            title={
              !isButtonEnabled() ? "수정 불가능한 주문입니다" :
              cancelCode ? "취소 처리 (F8)" : "접수 (F8) - 우클릭: 예약"
            }
          >
            {cancelCode ? "취소" : isReserve ? "예약" : "전송"}(F8)
          </button>
        </div>
      </div>
      
      {/* 예약 컨텍스트 메뉴 */}
      {showReserveMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setShowReserveMenu(false)}
          />
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg py-1"
            style={{
              left: reserveMenuPosition.x - 280, // 모달 너비만큼 왼쪽으로 이동
              top: reserveMenuPosition.y
            }}
          >
            <div className="p-2">
              <div className="text-xs font-medium mb-2">예약으로 진행</div>
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={reserveTime || new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16)}
                  onChange={(e) => setReserveTime(e.target.value)}
                  className="px-1 py-0.5 text-[10px] border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                />
                <select
                  value={reserveNotification}
                  onChange={(e) => setReserveNotification(Number(e.target.value))}
                  className="py-0.5 px-1 text-[10px] border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                >
                  <option value={5}>5분전</option>
                  <option value={10}>10분전</option>
                  <option value={15}>15분전</option>
                  <option value={30}>30분전</option>
                </select>
                <button
                  onClick={() => {
                    setIsReserve(true)
                    setShowReserveMenu(false)
                    if (!reserveTime) {
                      const now = new Date()
                      now.setMinutes(now.getMinutes() + 30)
                      setReserveTime(now.toISOString().slice(0, 16))
                    }
                  }}
                  className="px-2 py-0.5 bg-blue-600 text-white text-[10px] rounded hover:bg-blue-700"
                >
                  예약
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* 최근 이력 다이얼로그 */}
      {showRecentOrders && (
        <RecentOrdersDialog
          telephone={recentOrderTelephone}
          onSelectOrder={handleSelectRecentOrder}
          onSelectionChange={handleSelectionChange}
          onClose={() => setShowRecentOrders(false)}
        />
      )}
    </div>
  )
}
import { Order } from '@/types/order'
import axios from 'axios'
import { normalizeAgent } from '@/utils/order-formatter'
import { mqttService } from './mqtt-service'
import { useAuthStore } from '@/store/auth-store'

const API_BASE_URL = 'http://211.55.114.181:3000'

interface DbOrderModel {
  order_id: number
  order_extra?: string | null
  order_insertAt: string
  user_name?: string | null
  user_telephone?: string | null
  drv_name?: string | null
  car_callNo?: number | null
  callplace?: string | null
  poi?: string | null
  calldong?: string | null
  status?: string | null
  acceptAt?: string | null
  cancelAt?: string | null
  reserveAt?: string | null
  notiTime?: number | null
  acts?: string | null
  start_agent?: number | null
  end_agent?: number | null
  cancel_agent?: number | null
  cancel_status?: string | null
  cancel_reason?: string | null
  license_plate?: string | null
  token?: string | null
}

export const orderService = {
  async getAllOrders(beforeTimeMin: number = 60, idx?: number | null): Promise<Order[]> {
    const url = new URL(`${API_BASE_URL}/order/api/orders`)
    url.searchParams.append('before_time_min', beforeTimeMin.toString())
    if (idx !== null && idx !== undefined) {
      url.searchParams.append('idx', idx.toString())
    }

    try {
      const response = await axios.get<DbOrderModel[]>(url.toString())
      const data = response.data
      
      // Map DbOrderModel to Order type
      return data.map((dbOrder): Order => {
        // Parse POI to extract name and coordinates
        let poiName = dbOrder.poi || undefined
        let lat = undefined
        let lng = undefined
        
        if (dbOrder.poi) {
          const poiParts = dbOrder.poi.split('|')
          if (poiParts.length >= 1) {
            poiName = poiParts[0].trim()
          }
          if (poiParts.length >= 3) {
            const parsedLat = parseFloat(poiParts[1])
            const parsedLng = parseFloat(poiParts[2])
            if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
              lat = parsedLat
              lng = parsedLng
            }
          }
        }
        
        // If cancelAt exists, use status as cancelStatus (Flutter logic)
        let cancelStatus = dbOrder.cancel_status || undefined
        if (dbOrder.cancelAt) {
          cancelStatus = dbOrder.status || cancelStatus
        }
        
        // Parse actions from acts string (Flutter: acts.split('|').map((e) => ActionModel(e.split('_'))))
        let actions = undefined
        if (dbOrder.acts) {
          actions = dbOrder.acts.split('|').map(actStr => {
            const parts = actStr.split('_')
            return {
              name: parts[0] || '',
              at: parts[1] ? new Date(parseInt(parts[1]) * 1000) : new Date(),
              type: parts[2],
              data: parts[3]
            }
          }).reverse() // Flutter reverses the order
        }
        
        return {
          id: dbOrder.order_id,
          customerName: dbOrder.user_name || undefined,
          telephone: dbOrder.user_telephone || undefined,
          calldong: dbOrder.calldong || undefined,
          callplace: dbOrder.callplace || undefined,
          poiName,
          extra: dbOrder.order_extra || undefined,
          addAt: new Date(dbOrder.order_insertAt),
          addAgent: normalizeAgent(dbOrder.start_agent),
          acceptAgent: normalizeAgent(dbOrder.end_agent),
          cancelAgent: normalizeAgent(dbOrder.cancel_agent),
          acceptAt: dbOrder.acceptAt ? new Date(dbOrder.acceptAt) : undefined,
          cancelAt: dbOrder.cancelAt ? new Date(dbOrder.cancelAt) : undefined,
          cancelStatus,
          cancelReason: dbOrder.cancel_reason || undefined,
          reserveAt: dbOrder.reserveAt ? new Date(dbOrder.reserveAt) : undefined,
          notiTime: dbOrder.notiTime || undefined,
          status: dbOrder.status || 'waiting',
          drvNo: dbOrder.car_callNo?.toString() || undefined,
          drvName: dbOrder.drv_name || undefined,
          carNo: dbOrder.car_callNo || undefined,
          licensePlate: dbOrder.license_plate || undefined,
          token: dbOrder.token || undefined,
          lat,
          lng,
          actions,
          acts: dbOrder.acts || undefined,
          poi: dbOrder.poi || undefined,
        }
      })
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      throw error
    }
  },

  async getRecentOrder(telephone: string): Promise<any[]> {
    const response = await axios.get(`${API_BASE_URL}/order/api/recent`, {
      params: { custtel: telephone }
    })
    return response.data
  },

  async searchOrders(params: {
    beginDt: string
    endDt: string
    place?: string
    dong?: string
    custTel?: string
    drvno?: string
    areaFilter?: string
    driverId?: string
  }): Promise<Order[]> {
    const response = await axios.get<DbOrderModel[]>(`${API_BASE_URL}/order/api/searchOrders`, {
      params
    })
    
    const data = response.data
    return data.map((dbOrder): Order => {
      // Parse POI to extract name and coordinates
      let poiName = dbOrder.poi || undefined
      let lat = undefined
      let lng = undefined
      
      if (dbOrder.poi) {
        const poiParts = dbOrder.poi.split('|')
        if (poiParts.length >= 1) {
          poiName = poiParts[0].trim()
        }
        if (poiParts.length >= 3) {
          const parsedLat = parseFloat(poiParts[1])
          const parsedLng = parseFloat(poiParts[2])
          if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
            lat = parsedLat
            lng = parsedLng
          }
        }
      }
      
      // If cancelAt exists, use status as cancelStatus (Flutter logic)
      let cancelStatus = dbOrder.cancel_status || undefined
      if (dbOrder.cancelAt) {
        cancelStatus = dbOrder.status || cancelStatus
      }
      
      // Parse actions from acts string (Flutter: acts.split('|').map((e) => ActionModel(e.split('_'))))
      let actions = undefined
      if (dbOrder.acts) {
        actions = dbOrder.acts.split('|').map(actStr => {
          const parts = actStr.split('_')
          return {
            name: parts[0] || '',
            at: parts[1] ? new Date(parseInt(parts[1]) * 1000) : new Date(),
            type: parts[2],
            data: parts[3]
          }
        }).reverse() // Flutter reverses the order
      }
      
      return {
        id: dbOrder.order_id,
        customerName: dbOrder.user_name || undefined,
        telephone: dbOrder.user_telephone || undefined,
        calldong: dbOrder.calldong || undefined,
        callplace: dbOrder.callplace || undefined,
        poiName,
        extra: dbOrder.order_extra || undefined,
        addAt: new Date(dbOrder.order_insertAt),
        addAgent: normalizeAgent(dbOrder.start_agent),
        acceptAgent: normalizeAgent(dbOrder.end_agent),
        cancelAgent: normalizeAgent(dbOrder.cancel_agent),
        acceptAt: dbOrder.acceptAt ? new Date(dbOrder.acceptAt) : undefined,
        cancelAt: dbOrder.cancelAt ? new Date(dbOrder.cancelAt) : undefined,
        cancelStatus,
        cancelReason: dbOrder.cancel_reason || undefined,
        reserveAt: dbOrder.reserveAt ? new Date(dbOrder.reserveAt) : undefined,
        notiTime: dbOrder.notiTime || undefined,
        status: dbOrder.status || 'waiting',
        drvNo: dbOrder.car_callNo?.toString() || undefined,
        drvName: dbOrder.drv_name || undefined,
        carNo: dbOrder.car_callNo || undefined,
        licensePlate: dbOrder.license_plate || undefined,
        token: dbOrder.token || undefined,
        lat,
        lng,
        actions,
        acts: dbOrder.acts || undefined,
        poi: dbOrder.poi || undefined,
      }
    })
  },

  async createOrder(order: {
    telephone: string
    customerName: string
    callplace: string
    calldong?: string
    extra?: string
    drvNo?: string
    acceptAt?: Date
    status?: string
    poiName?: string
    lat?: number
    lng?: number
    token?: string
    reserveAt?: Date
    notiTime?: number
  }): Promise<Order> {
    try {
      // Get user route from auth store (Flutter에서 useCode = agentId)
      const userState = useAuthStore.getState()
      const userRoute = userState.user?.agentId || ''
      
      if (!userRoute) {
        throw new Error('User agentId not available')
      }

      // Flutter 방식으로 MQTT 메시지 발행
      if (order.reserveAt) {
        // 예약 주문 (Flutter: reserveRequest)
        let place = order.callplace || ''
        if (order.extra) {
          place += `/${order.extra}`
        }
        const messageArr = [
          '', // orderId empty for new
          order.telephone,
          order.customerName,
          place,
          order.calldong || '',
          userRoute,
          order.reserveAt.getTime().toString(),
          (order.notiTime || 10).toString()
        ]
        
        mqttService.publishMessage('reserve.request', messageArr.join('|'))
      } else if (order.drvNo) {
        // 드라이버가 지정된 경우 acceptOrder 호출 (Flutter: acceptOrder with orderId=-1)
        const messageArr = [
          '-1', // 신규 주문이므로 orderId는 -1
          order.telephone,
          order.customerName,
          order.callplace || '',
          order.calldong || '',
          'n', // reserve flag
          userRoute,
          order.drvNo,
          '', // drvTel (empty)
          '', // empty
          order.extra || '' // extra
        ]
        
        mqttService.publishMessage('accept.order.request', messageArr.join('|'))
      } else {
        // 일반 주문 (Flutter: addOrder)
        let place = order.callplace || ''
        if (order.extra) {
          place += `/${order.extra}`
        }
        const messageArr = [
          '', // orderId empty for new
          order.telephone,
          order.customerName,
          place,
          order.calldong || '',
          'n', // reserve flag
          userRoute,
          '' // drvno empty
        ]
        
        mqttService.publishMessage('add.order.request', messageArr.join('|'))
      }
      
      // MQTT 메시지 발행 완료
      // 실제 주문은 MQTT 응답(web/addOrder, web/acceptOrder, web/addReserve)으로 처리됨
      return {} as Order // 빈 객체 반환 (use-mqtt.ts에서 실제 데이터 처리)
      
    } catch (error) {
      console.error('[OrderService] Failed to create order:', error)
      throw error
    }
  },

  async updateOrder(orderId: number, order: Partial<Order>): Promise<Order> {
    try {
      // Get user route from auth store (Flutter에서 useCode = agentId)
      const userState = useAuthStore.getState()
      const userRoute = userState.user?.agentId || ''
      
      if (!userRoute) {
        throw new Error('User agentId not available')
      }

      // 드라이버 변경인 경우 acceptOrder
      if (order.drvNo) {
        const messageArr = [
          orderId.toString(),
          order.telephone || '',
          order.customerName || '',
          order.callplace || '',
          order.calldong || '',
          'n', // reserve flag
          userRoute,
          order.drvNo,
          '', // drvTel
          '', // empty
          order.extra || ''
        ]
        
        mqttService.publishMessage('accept.order.request', messageArr.join('|'))
      } else {
        // 일반 수정 (Flutter: editOrder)
        let place = order.callplace || ''
        if (order.extra) {
          place += `/${order.extra}`
        }
        const messageArr = [
          orderId.toString(),
          order.telephone || '',
          order.customerName || '',
          place,
          order.calldong || '',
          'n', // reserve flag
          userRoute,
          '' // empty
        ]
        
        mqttService.publishMessage('modify.order.request', messageArr.join('|'))
      }
      
      // MQTT 메시지 발행 완료
      // 실제 업데이트는 MQTT 응답(web/modifyOrder, web/acceptOrder)으로 처리됨
      return {} as Order // 빈 객체 반환 (use-mqtt.ts에서 실제 데이터 처리)
      
    } catch (error) {
      console.error('[OrderService] Failed to update order:', error)
      throw error
    }
  },

  async cancelOrder(orderId: number, reason?: string): Promise<void> {
    try {
      // Get user route from auth store (Flutter에서 useCode = agentId)
      const userState = useAuthStore.getState()
      const userRoute = userState.user?.agentId || ''
      
      if (!userRoute) {
        throw new Error('User agentId not available')
      }

      // Flutter 방식으로 MQTT 메시지 발행
      const messageArr = [
        orderId.toString(),
        userRoute,
        reason || '1', // 기본 취소 코드 1
        '' // empty
      ]
      
      mqttService.publishMessage('cancel.order.request', messageArr.join('|'))
      
    } catch (error) {
      console.error('[OrderService] Failed to cancel order:', error)
      throw error
    }
  },

  async acceptOrder(orderId: number, drvNo: string): Promise<void> {
    await axios.post(`${API_BASE_URL}/order/${orderId}/accept`, {
      drvNo
    })
  },

  async suggestionPlace(queries: string[], type: number = 1): Promise<{ place: string }[]> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/suggestionsplace`, {
        querys: queries,
        type
      })
      
      // API 응답이 배열이 아닌 경우 빈 배열 반환
      if (!Array.isArray(response.data)) {
        return []
      }
      
      // 응답 데이터를 { place: string } 형태로 변환
      return response.data.map((item: any) => ({
        place: typeof item === 'string' ? item : item.place || ''
      }))
    } catch (error) {
      console.error('[OrderService] Failed to get place suggestions:', error)
      return []
    }
  }
}
import { orderService } from './order-service'
import { mqttService } from './mqtt-service'
import { useOrderStore } from '@/store/order-store'
import { useAuthStore } from '@/store/auth-store'

interface InitializationResult {
  success: boolean
  error?: string
}

export const initializationService = {
  async initialize(): Promise<InitializationResult> {
    const { setInitializing, setInitialized } = useAuthStore.getState()
    
    try {
      setInitializing(true)
      
      // Step 1: Load initial orders (last 60 minutes)
      console.log('Loading initial orders...')
      const orders = await orderService.getAllOrders(60)
      useOrderStore.getState().setOrders(orders)
      
      // Step 2: MQTT 서비스에 초기 데이터 로드 완료 알림
      mqttService.onInitialDataLoaded()
      
      // Step 3: Load SMS idioms (if needed in future)
      // await loadSmsIdioms()
      
      // Step 4: Load other configurations (if needed)
      // await loadConfigurations()
      
      // Mark initialization as complete
      setInitialized(true)
      setInitializing(false)
      
      console.log('Initialization completed successfully')
      return { success: true }
    } catch (error) {
      console.error('Initialization failed:', error)
      setInitializing(false)
      setInitialized(false)
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Initialization failed' 
      }
    }
  },

  async reset(): Promise<void> {
    const { setInitialized, setInitializing } = useAuthStore.getState()
    console.log('Resetting initialization state and clearing data...')
    
    // Reset auth initialization state
    setInitialized(false)
    setInitializing(false)
    
    // Clear all order data
    useOrderStore.getState().reset()
    
    // Clear any other cached data here in the future
    console.log('Reset completed')
  }
}
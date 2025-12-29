import axios from 'axios'

const API_BASE_URL = 'http://211.55.114.181:3000'

export interface ActionType {
  id?: number
  name?: string
  extra?: string  // 취소 코드 설명
}

class ActionService {
  private cancelTypes: ActionType[] = []
  private checkCallTypes: ActionType[] = []

  // 취소 타입 가져오기
  async fetchCancelTypes(): Promise<ActionType[]> {
    try {
      const response = await axios.get<ActionType[]>(`${API_BASE_URL}/actiontype/canceltype`)
      this.cancelTypes = response.data
      console.log('[ActionService] Loaded cancel types:', this.cancelTypes.length)
      return this.cancelTypes
    } catch (error) {
      console.error('[ActionService] Failed to fetch cancel types:', error)
      return []
    }
  }

  // 체크콜 타입 가져오기
  async fetchCheckCallTypes(): Promise<ActionType[]> {
    try {
      const response = await axios.get<ActionType[]>(`${API_BASE_URL}/actiontype/checkcalltype`)
      this.checkCallTypes = response.data
      console.log('[ActionService] Loaded checkcall types:', this.checkCallTypes.length)
      return this.checkCallTypes
    } catch (error) {
      console.error('[ActionService] Failed to fetch checkcall types:', error)
      return []
    }
  }

  // 캐시된 취소 타입 반환
  getCancelTypes(): ActionType[] {
    return this.cancelTypes
  }

  // 캐시된 체크콜 타입 반환
  getCheckCallTypes(): ActionType[] {
    return this.checkCallTypes
  }

  // 취소 코드로 취소 타입 찾기
  findCancelTypeByCode(code: string): ActionType | undefined {
    return this.cancelTypes.find(type => {
      const typeCode = type.name?.replace('취소', '').trim()
      return typeCode === code
    })
  }

  // 취소 코드 검색 (자동완성용)
  searchCancelTypes(query: string): ActionType[] {
    if (!query || !query.trim()) return []

    // 숫자만 추출 (사용자가 "취소1" 또는 "1"을 입력해도 동작)
    const queryCode = query.replace(/[^0-9]/g, '').trim()
    if (!queryCode) return []
    
    return this.cancelTypes.filter(type => {
      // 취소 코드 번호만 추출
      const code = type.name?.replace('취소', '').trim() || ''
      // 정확히 일치하는 것만 반환
      return code === queryCode
    })
  }

  // 서비스 초기화
  async initialize(): Promise<void> {
    console.log('[ActionService] Initializing...')
    await Promise.all([
      this.fetchCancelTypes(),
      this.fetchCheckCallTypes()
    ])
    console.log('[ActionService] Initialization complete')
  }
}

// 싱글톤 인스턴스
export const actionService = new ActionService()
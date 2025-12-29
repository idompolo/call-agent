'use client'

import { useState, useEffect } from 'react'
import { X, Search, Plus, Edit2, Trash2, Save, User, Car, MapPin, Building2, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { editService, Driver, Car as CarType, Camp, POI } from '@/services/edit-service'

interface EditPanelProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'driver' | 'car' | 'camp' | 'poi'

type Notification = {
  type: 'success' | 'error'
  message: string
}

export function EditPanel({ isOpen, onClose }: EditPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('driver')
  const [searchTerm, setSearchTerm] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [notification, setNotification] = useState<Notification | null>(null)

  // 폼 데이터 상태
  const [formData, setFormData] = useState<any>({})

  // 실제 데이터
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [cars, setCars] = useState<CarType[]>([])
  const [camps, setCamps] = useState<Camp[]>([])
  const [pois, setPois] = useState<POI[]>([])

  // 데이터 로드
  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, activeTab])

  const loadData = async () => {
    setIsLoading(true)
    try {
      switch (activeTab) {
        case 'driver':
          const driversData = await editService.getDrivers()
          setDrivers(Array.isArray(driversData) ? driversData : [])
          break
        case 'car':
          const carsData = await editService.getCars()
          setCars(Array.isArray(carsData) ? carsData : [])
          break
        case 'camp':
          const campsData = await editService.getCamps()
          setCamps(Array.isArray(campsData) ? campsData : [])
          break
        case 'poi':
          const poisData = await editService.getPOIs()
          setPois(Array.isArray(poisData) ? poisData : [])
          break
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      // API 연결 실패 시 빈 배열로 초기화
      switch (activeTab) {
        case 'driver':
          setDrivers([])
          break
        case 'car':
          setCars([])
          break
        case 'camp':
          setCamps([])
          break
        case 'poi':
          setPois([])
          break
      }
      // 개발 환경에서는 오류를 보여주지 않고 빈 데이터로 표시
      // showNotification('error', '데이터를 불러오는데 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  const tabs = [
    { id: 'driver' as TabType, label: '기사 관리', icon: User, count: drivers.length },
    { id: 'car' as TabType, label: '차량 관리', icon: Car, count: cars.length },
    { id: 'camp' as TabType, label: '지점 관리', icon: Building2, count: camps.length },
    { id: 'poi' as TabType, label: 'POI 관리', icon: MapPin, count: pois.length },
  ]

  const getCurrentData = () => {
    switch (activeTab) {
      case 'driver': return drivers
      case 'car': return cars
      case 'camp': return camps
      case 'poi': return pois
      default: return []
    }
  }

  const handleEdit = (item: any) => {
    setSelectedItem(item)
    setFormData(item)
    setIsEditing(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      try {
        switch (activeTab) {
          case 'driver':
            await editService.deleteDriver(id)
            setDrivers(drivers.filter(d => d.id !== id))
            break
          case 'car':
            await editService.deleteCar(id)
            setCars(cars.filter(c => c.id !== id))
            break
          case 'camp':
            await editService.deleteCamp(id)
            setCamps(camps.filter(c => c.id !== id))
            break
          case 'poi':
            await editService.deletePOI(id)
            setPois(pois.filter(p => p.id !== id))
            break
        }
        showNotification('success', '삭제되었습니다')
      } catch (error) {
        console.error('Failed to delete:', error)
        showNotification('error', '삭제에 실패했습니다')
      }
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      switch (activeTab) {
        case 'driver':
          if (selectedItem?.id) {
            const updated = await editService.updateDriver(selectedItem.id, formData)
            setDrivers(drivers.map(d => d.id === selectedItem.id ? updated : d))
          } else {
            const created = await editService.createDriver(formData as Omit<Driver, 'id'>)
            setDrivers([...drivers, created])
          }
          break
        case 'car':
          if (selectedItem?.id) {
            const updated = await editService.updateCar(selectedItem.id, formData)
            setCars(cars.map(c => c.id === selectedItem.id ? updated : c))
          } else {
            const created = await editService.createCar(formData as Omit<CarType, 'id'>)
            setCars([...cars, created])
          }
          break
        case 'camp':
          if (selectedItem?.id) {
            const updated = await editService.updateCamp(selectedItem.id, formData)
            setCamps(camps.map(c => c.id === selectedItem.id ? updated : c))
          } else {
            const created = await editService.createCamp(formData as Omit<Camp, 'id'>)
            setCamps([...camps, created])
          }
          break
        case 'poi':
          if (selectedItem?.id) {
            const updated = await editService.updatePOI(selectedItem.id, formData)
            setPois(pois.map(p => p.id === selectedItem.id ? updated : p))
          } else {
            const created = await editService.createPOI(formData as Omit<POI, 'id'>)
            setPois([...pois, created])
          }
          break
      }
      showNotification('success', selectedItem ? '수정되었습니다' : '추가되었습니다')
      setIsEditing(false)
      setSelectedItem(null)
      setFormData({})
    } catch (error) {
      console.error('Failed to save:', error)
      showNotification('error', '저장에 실패했습니다')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAdd = () => {
    setSelectedItem(null)
    setFormData({})
    setIsEditing(true)
  }

  const renderForm = () => {
    switch (activeTab) {
      case 'driver':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">이름</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                placeholder="기사 이름"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">나이</label>
                <input
                  type="number"
                  value={formData.age || ''}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                  placeholder="나이"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">전화번호</label>
                <input
                  type="tel"
                  value={formData.telephone || ''}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                  placeholder="010-0000-0000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">콜번호</label>
                <input
                  type="text"
                  value={formData.carNo || ''}
                  onChange={(e) => setFormData({ ...formData, carNo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                  placeholder="콜번호"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">차량번호</label>
                <input
                  type="text"
                  value={formData.licensePlate || ''}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                  placeholder="서울12가3456"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">지점</label>
              <select
                value={formData.camp || ''}
                onChange={(e) => setFormData({ ...formData, camp: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
              >
                <option value="">선택하세요</option>
                {camps.map(camp => (
                  <option key={camp.id} value={camp.name}>{camp.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="lock"
                checked={formData.lock || false}
                onChange={(e) => setFormData({ ...formData, lock: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="lock" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                계정 잠금
              </label>
            </div>
          </div>
        )
      
      case 'car':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">콜번호</label>
                <input
                  type="text"
                  value={formData.callNo || ''}
                  onChange={(e) => setFormData({ ...formData, callNo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                  placeholder="콜번호"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">차량번호</label>
                <input
                  type="text"
                  value={formData.licensePlate || ''}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                  placeholder="서울12가3456"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">차종</label>
              <input
                type="text"
                value={formData.model || ''}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                placeholder="차종"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">지점</label>
              <select
                value={formData.camp || ''}
                onChange={(e) => setFormData({ ...formData, camp: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
              >
                <option value="">선택하세요</option>
                {camps.map(camp => (
                  <option key={camp.id} value={camp.name}>{camp.name}</option>
                ))}
              </select>
            </div>
          </div>
        )

      case 'camp':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">지점명</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                placeholder="지점명"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">지점코드</label>
              <input
                type="text"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                placeholder="지점코드"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">주소</label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                placeholder="주소"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">전화번호</label>
              <input
                type="tel"
                value={formData.telephone || ''}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                placeholder="02-0000-0000"
              />
            </div>
          </div>
        )

      case 'poi':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">장소명</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                placeholder="장소명"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">주소</label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                placeholder="주소"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">카테고리</label>
              <select
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
              >
                <option value="">선택하세요</option>
                <option value="교통">교통</option>
                <option value="병원">병원</option>
                <option value="관공서">관공서</option>
                <option value="쇼핑">쇼핑</option>
                <option value="기타">기타</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">위도</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.lat || ''}
                  onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                  placeholder="37.0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">경도</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.lng || ''}
                  onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                  placeholder="127.0000"
                />
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const renderList = () => {
    const data = getCurrentData()
    const filteredData = data.filter((item: any) => {
      const searchLower = searchTerm.toLowerCase()
      return Object.values(item).some(value => 
        String(value).toLowerCase().includes(searchLower)
      )
    })

    return (
      <div className="space-y-2">
        {filteredData.map((item: any) => (
          <div
            key={item.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {activeTab === 'driver' && (
                  <>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{item.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.telephone} | 콜: {item.car?.callNo || item.carNo} | {item.car?.camp?.name || item.camp}
                    </p>
                  </>
                )}
                {activeTab === 'car' && (
                  <>
                    <h4 className="font-semibold text-gray-900 dark:text-white">콜번호: {item.callNo}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.licensePlate} | {item.model} | {item.camp?.name || item.camp}
                    </p>
                  </>
                )}
                {activeTab === 'camp' && (
                  <>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{item.name} ({item.code})</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.address} | {item.telephone}
                    </p>
                  </>
                )}
                {activeTab === 'poi' && (
                  <>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{item.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.address} | {item.category}
                    </p>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all hover:scale-110"
                  title="편집"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all hover:scale-110"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity z-40",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full bg-white dark:bg-gray-900 shadow-2xl transition-all duration-300 ease-out z-50",
          isOpen ? "translate-x-0" : "translate-x-full",
          isEditing ? "w-[800px]" : "w-[600px]"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500/5 to-purple-500/5 dark:from-blue-500/10 dark:to-purple-500/10">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">데이터 관리</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all hover:rotate-90 duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setIsEditing(false)
                    setSelectedItem(null)
                    setFormData({})
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors",
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                  <span className="ml-1 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-full">
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Notification */}
          {notification && (
            <div className={cn(
              "mx-6 mt-4 p-3 rounded-lg flex items-center gap-2",
              notification.type === 'success' ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
            )}>
              {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span className="text-sm">{notification.message}</span>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isEditing ? (
              <>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {selectedItem ? '편집' : '새로 추가'}
                  </h3>
                  {renderForm()}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSaving ? '저장 중...' : '저장'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setSelectedItem(null)
                      setFormData({})
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Search Bar */}
                <div className="mb-6">
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="검색..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                      />
                    </div>
                    <button
                      onClick={handleAdd}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg"
                    >
                      <Plus className="w-4 h-4" />
                      추가
                    </button>
                  </div>
                </div>

                {/* List */}
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">데이터를 불러오는 중...</p>
                  </div>
                ) : (
                  renderList()
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
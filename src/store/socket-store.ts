import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'

interface SocketState {
  socket: Socket | null
  isConnected: boolean
  connectedAgents: string[]
  connect: (agentId: string) => void
  disconnect: () => void
  emit: (event: string, data: unknown) => void
  on: (event: string, callback: (data: unknown) => void) => void
  off: (event: string) => void
  setConnectedAgents: (agents: string[]) => void
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'wss://ws.ftnhwokr.com'

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  connectedAgents: [],
  connect: (agentId) => {
    const { socket } = get()
    if (socket?.connected) return

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      query: { agentId },
    })

    newSocket.on('connect', () => {
      set({ isConnected: true })
      console.log('Socket connected')
    })

    newSocket.on('disconnect', () => {
      set({ isConnected: false })
      console.log('Socket disconnected')
    })

    newSocket.on('agents:update', (agents: string[]) => {
      set({ connectedAgents: agents })
    })

    set({ socket: newSocket })
  },
  disconnect: () => {
    const { socket } = get()
    if (socket) {
      socket.disconnect()
      set({ socket: null, isConnected: false, connectedAgents: [] })
    }
  },
  emit: (event, data) => {
    const { socket } = get()
    if (socket?.connected) {
      socket.emit(event, data)
    }
  },
  on: (event, callback) => {
    const { socket } = get()
    if (socket) {
      socket.on(event, callback)
    }
  },
  off: (event) => {
    const { socket } = get()
    if (socket) {
      socket.off(event)
    }
  },
  setConnectedAgents: (agents) => set({ connectedAgents: agents }),
}))
import { io } from 'socket.io-client'
import { useGameStore } from '../stores/gameStore.js'
import { useMultiplayerStore } from '../stores/multiplayerStore.js'

class SocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
    this.isReconnecting = false
    this.eventHandlers = new Map()
    this.connectionPromise = null
  }

  // 连接到服务器
  async connect(serverUrl = 'http://localhost:3001') {
    if (this.socket && this.socket.connected) {
      return Promise.resolve(this.socket)
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        console.log(`🔗 正在连接到服务器: ${serverUrl}`)
        
        this.socket = io(serverUrl, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          forceNew: true,
          autoConnect: true
        })

        this.setupEventHandlers()

        this.socket.on('connect', () => {
          console.log('✅ WebSocket 连接成功')
          this.isConnected = true
          this.reconnectAttempts = 0
          this.isReconnecting = false
          
          const multiplayerStore = useMultiplayerStore()
          multiplayerStore.setConnectionStatus(true)
          multiplayerStore.socket = this.socket
          
          // 初始化玩家
          this.initializePlayer()
          
          resolve(this.socket)
        })

        this.socket.on('connect_error', (error) => {
          console.error('❌ WebSocket 连接错误:', error)
          this.isConnected = false
          
          const multiplayerStore = useMultiplayerStore()
          multiplayerStore.setConnectionStatus(false)
          multiplayerStore.connectionError = error.message
          
          reject(error)
        })

        this.socket.on('disconnect', (reason) => {
          console.log('🔌 WebSocket 连接断开:', reason)
          this.isConnected = false
          
          const multiplayerStore = useMultiplayerStore()
          multiplayerStore.setConnectionStatus(false)
          
          // 如果不是主动断开，尝试重连
          if (reason !== 'io client disconnect' && !this.isReconnecting) {
            this.attemptReconnect()
          }
        })

      } catch (error) {
        console.error('❌ 创建Socket连接失败:', error)
        reject(error)
      }
    })

    return this.connectionPromise
  }

  // 初始化玩家
  initializePlayer() {
    const multiplayerStore = useMultiplayerStore()
    const playerName = localStorage.getItem('playerName') || `玩家${Math.floor(Math.random() * 1000)}`
    
    const playerData = {
      name: playerName,
      level: parseInt(localStorage.getItem('playerLevel')) || 1,
      avatar: localStorage.getItem('playerAvatar') || ''
    }
    
    this.socket.emit('player_init', playerData)
  }

  // 设置事件处理器
  setupEventHandlers() {
    if (!this.socket) return

    // 玩家初始化响应
    this.socket.on('player_initialized', (data) => {
      const multiplayerStore = useMultiplayerStore()
      multiplayerStore.localPlayer = data.player
      // 更新房间列表和在线玩家
      if (data.rooms) {
        multiplayerStore.roomList = data.rooms
      }
      console.log('👤 玩家初始化完成:', data.player)
    })

    // 房间相关事件
    this.socket.on('room_created', (data) => {
      console.log('🏠 房间创建成功:', data)
      const multiplayerStore = useMultiplayerStore()
      multiplayerStore.currentRoom = data.room
      multiplayerStore.isInRoom = true
      multiplayerStore.isHost = true
    })

    this.socket.on('room_create_success', (data) => {
      console.log('🏠 房间创建成功:', data)
      const multiplayerStore = useMultiplayerStore()
      multiplayerStore.currentRoom = data.room
      multiplayerStore.isInRoom = true
      multiplayerStore.isHost = true
    })

    this.socket.on('room_create_error', (data) => {
      console.error('❌ 房间创建失败:', data.message)
      alert(`创建房间失败: ${data.message}`)
    })

    this.socket.on('room_joined', (data) => {
      console.log('🚪 成功加入房间:', data)
      const multiplayerStore = useMultiplayerStore()
      multiplayerStore.currentRoom = data.room
      multiplayerStore.isInRoom = true
      multiplayerStore.isHost = data.room.host === multiplayerStore.localPlayer.id
    })

    this.socket.on('room_join_success', (data) => {
      console.log('🚪 成功加入房间:', data)
      const multiplayerStore = useMultiplayerStore()
      multiplayerStore.currentRoom = data.room
      multiplayerStore.isInRoom = true
      multiplayerStore.isHost = data.room.host === multiplayerStore.localPlayer.id
    })

    this.socket.on('room_join_error', (data) => {
      console.error('❌ 加入房间失败:', data.message)
      alert(`加入房间失败: ${data.message}`)
    })

    this.socket.on('room_left', (data) => {
      console.log('🚪 已离开房间:', data)
      const multiplayerStore = useMultiplayerStore()
      multiplayerStore.currentRoom = null
      multiplayerStore.isInRoom = false
      multiplayerStore.isHost = false
    })

    this.socket.on('player_joined', (data) => {
      console.log('👤 玩家加入房间:', data)
      const multiplayerStore = useMultiplayerStore()
      if (multiplayerStore.currentRoom) {
        multiplayerStore.currentRoom = data.room
      }
    })

    this.socket.on('player_left', (data) => {
      console.log('👤 玩家离开房间:', data)
      const multiplayerStore = useMultiplayerStore()
      if (multiplayerStore.currentRoom) {
        multiplayerStore.currentRoom = data.room
      }
    })

    // 匹配相关事件
    this.socket.on('matchmaking_started', (data) => {
      console.log('🔍 开始匹配:', data)
      const multiplayerStore = useMultiplayerStore()
      multiplayerStore.isSearching = true
      multiplayerStore.matchingProgress = 0
      multiplayerStore.estimatedWaitTime = 30
    })

    this.socket.on('match_found', (data) => {
      console.log('✅ 找到匹配:', data)
      const multiplayerStore = useMultiplayerStore()
      multiplayerStore.isSearching = false
      multiplayerStore.matchingProgress = 100
      multiplayerStore.currentRoom = data.room
      multiplayerStore.isInRoom = true
      multiplayerStore.isHost = data.room.host === multiplayerStore.localPlayer.id
    })

    this.socket.on('match_failed', (data) => {
      console.error('❌ 匹配失败:', data)
      const multiplayerStore = useMultiplayerStore()
      multiplayerStore.isSearching = false
      multiplayerStore.matchingProgress = 0
      alert(`匹配失败: ${data.error}`)
    })

    this.socket.on('matchmaking_cancelled', () => {
      console.log('❌ 匹配已取消')
      const multiplayerStore = useMultiplayerStore()
      multiplayerStore.isSearching = false
      multiplayerStore.matchingProgress = 0
      multiplayerStore.estimatedWaitTime = 0
    })

    this.socket.on('match_error', (data) => {
      console.error('❌ 匹配错误:', data)
      alert(`匹配错误: ${data.message}`)
    })

    // 房间列表更新
    this.socket.on('room_list_updated', (data) => {
      const multiplayerStore = useMultiplayerStore()
      multiplayerStore.roomList = data.rooms
    })

    this.socket.on('room_list', (data) => {
      const multiplayerStore = useMultiplayerStore()
      multiplayerStore.roomList = data.rooms
    })

    // 在线玩家更新
    this.socket.on('online_players', (data) => {
      const multiplayerStore = useMultiplayerStore()
      multiplayerStore.onlinePlayers = data.players
    })

    // 聊天消息
    this.socket.on('chat_message', (data) => {
      console.log('💬 收到聊天消息:', data)
      const multiplayerStore = useMultiplayerStore()
      multiplayerStore.messages.push(data)
    })

    this.socket.on('lobby_chat_message', (data) => {
      console.log('💬 收到大厅消息:', data)
      const multiplayerStore = useMultiplayerStore()
      multiplayerStore.messages.push(data)
    })

    // 错误处理
    this.socket.on('error', (data) => {
      console.error('🔥 服务器错误:', data)
      alert(`服务器错误: ${data.message}`)
    })
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.isConnected = false
    
    const multiplayerStore = useMultiplayerStore()
    multiplayerStore.setConnectionStatus(false)
    multiplayerStore.socket = null
    
    console.log('🔌 已断开连接')
  }

  // 重连逻辑
  async attemptReconnect() {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return
    }

    this.isReconnecting = true
    this.reconnectAttempts++

    console.log(`🔄 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)

    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay))

    try {
      await this.connect()
      console.log('✅ 重连成功')
    } catch (error) {
      console.error(`❌ 重连失败 (${this.reconnectAttempts}/${this.maxReconnectAttempts}):`, error)
      
      // 指数退避
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000)
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect()
      } else {
        console.error('💀 达到最大重连次数')
        const multiplayerStore = useMultiplayerStore()
        multiplayerStore.connectionError = '连接丢失，请刷新页面重试'
      }
    } finally {
      this.isReconnecting = false
    }
  }

  // API方法

  // 获取房间列表
  getRoomList() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('get_room_list')
    }
    
    const multiplayerStore = useMultiplayerStore()
    return multiplayerStore.roomList || []
  }

  // 获取在线玩家列表
  getOnlinePlayersList() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('get_online_players')
    }
    
    const multiplayerStore = useMultiplayerStore()
    return multiplayerStore.onlinePlayers || []
  }

  // 创建房间
  createRoom(roomConfig) {
    if (!this.socket || !this.socket.connected) {
      throw new Error('未连接到服务器')
    }

    this.socket.emit('create_room', roomConfig)
  }

  // 加入房间
  async joinRoom(roomId, password = '') {
    if (!this.socket || !this.socket.connected) {
      throw new Error('未连接到服务器')
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('加入房间超时'))
      }, 10000)

      const successHandler = (data) => {
        clearTimeout(timeout)
        this.socket.off('room_join_error', errorHandler)
        resolve(data.room)
      }

      const errorHandler = (data) => {
        clearTimeout(timeout)
        this.socket.off('room_join_success', successHandler)
        reject(new Error(data.message))
      }

      this.socket.once('room_join_success', successHandler)
      this.socket.once('room_join_error', errorHandler)
      
      this.socket.emit('join_room', { roomId, password })
    })
  }

  // 离开房间
  leaveRoom() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_room')
    }
  }

  // 开始快速匹配
  startQuickMatch(gameMode = 'classic') {
    if (!this.socket || !this.socket.connected) {
      throw new Error('未连接到服务器')
    }

    this.socket.emit('start_quick_match', { gameMode })
    
    // 模拟匹配进度更新
    const multiplayerStore = useMultiplayerStore()
    const progressInterval = setInterval(() => {
      if (!multiplayerStore.isSearching) {
        clearInterval(progressInterval)
        return
      }
      
      multiplayerStore.matchingProgress += Math.random() * 10 + 5
      multiplayerStore.estimatedWaitTime = Math.max(0, multiplayerStore.estimatedWaitTime - 2)
      
      if (multiplayerStore.matchingProgress >= 95) {
        multiplayerStore.matchingProgress = 95 // 等待服务器响应
      }
    }, 1000)
  }

  // 取消匹配
  cancelMatching() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('cancel_quick_match')
    }
    
    const multiplayerStore = useMultiplayerStore()
    multiplayerStore.isSearching = false
    multiplayerStore.matchingProgress = 0
    multiplayerStore.estimatedWaitTime = 0
  }

  // 发送聊天消息
  sendChatMessage(message) {
    if (!this.socket || !this.socket.connected) {
      console.warn('未连接到服务器，无法发送消息')
      return
    }

    const multiplayerStore = useMultiplayerStore()
    const roomId = multiplayerStore.currentRoom?.id
    
    this.socket.emit('chat_message', {
      message: message,
      roomId: roomId
    })
  }

  // 邀请玩家
  invitePlayer(player) {
    console.log(`📩 邀请玩家功能开发中: ${player.name}`)
    // TODO: 实现邀请功能
  }

  // 挑战玩家
  challengePlayer(player) {
    console.log(`⚔️ 挑战玩家功能开发中: ${player.name}`)
    // TODO: 实现挑战功能
  }
}

// 创建并导出服务实例
export const socketService = new SocketService()

// 默认导出插件
export default {
  install(app) {
    app.config.globalProperties.$socket = socketService
    app.provide('socketService', socketService)
  }
}
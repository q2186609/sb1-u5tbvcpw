import { io } from 'socket.io-client'
import { useGameStore } from '../stores/gameStore.js'
import { useMultiplayerStore } from '../stores/multiplayerStore.js'

// Mock数据生成器
const generatePlayerId = () => `player_${Math.random().toString(36).substr(2, 9)}`
const generateRoomId = () => `room_${Math.random().toString(36).substr(2, 8)}`

class SocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.mockRooms = new Map()
    this.mockPlayers = new Map()
    this.matchQueue = []
    this.eventHandlers = new Map()
    this.connectionPromise = null
    
    // 初始化一些模拟数据
    this.initMockData()
  }
  
  // 初始化模拟数据
  initMockData() {
    // 创建一些模拟玩家
    const mockPlayerNames = ['小蛇王', '贪吃达人', '游戏高手', '蛇蛇爱好者', '闪电蛇', '神级玩家']
    
    mockPlayerNames.forEach((name, index) => {
      const player = {
        id: generatePlayerId(),
        name: name,
        level: Math.floor(Math.random() * 20) + 1,
        status: 'online',
        avatar: `avatar_${index + 1}`
      }
      this.mockPlayers.set(player.id, player)
    })
    
    // 创建一些模拟房间
    this.createMockRooms()
  }
  
  // 创建模拟房间
  createMockRooms() {
    const roomNames = ['新手练习房', '高手对决', '欢乐竞技', '速度挑战', '团队合作']
    const gameModes = ['classic', 'speed', 'team', 'survival']
    
    roomNames.forEach((name, index) => {
      const roomId = generateRoomId()
      const players = Array.from(this.mockPlayers.values()).slice(0, Math.floor(Math.random() * 3) + 1)
      
      const room = {
        id: roomId,
        name: name,
        gameMode: gameModes[index % gameModes.length],
        maxPlayers: 4,
        minPlayers: 2,
        players: players,
        host: players[0]?.id,
        hostName: players[0]?.name,
        status: Math.random() > 0.7 ? 'playing' : 'waiting',
        isPrivate: Math.random() > 0.8,
        createdAt: new Date(Date.now() - Math.random() * 3600000).toISOString() // 过去1小时内创建
      }
      
      this.mockRooms.set(roomId, room)
    })
  }

  // 连接到服务器（Mock版本）
  async connect(serverUrl = 'mock://localhost:3001') {
    if (this.isConnected) {
      return Promise.resolve(true)
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // 模拟连接过程
        console.log('🔗 正在连接到游戏服务器...')
        
        setTimeout(() => {
          this.isConnected = true
          console.log('✅ Mock WebSocket 连接成功')
          
          const multiplayerStore = useMultiplayerStore()
          multiplayerStore.setConnectionStatus(true)
          multiplayerStore.socket = this
          
          // 初始化玩家数据
          this.initializePlayer()
          
          resolve(this)
        }, 1000) // 模拟1秒连接延迟
        
      } catch (error) {
        console.error('❌ Failed to create mock connection:', error)
        reject(error)
      }
    })

    return this.connectionPromise
  }
  
  // 初始化玩家
  initializePlayer() {
    const multiplayerStore = useMultiplayerStore()
    const playerName = `玩家${Math.floor(Math.random() * 1000)}`
    
    multiplayerStore.localPlayer.id = generatePlayerId()
    multiplayerStore.localPlayer.name = playerName
    multiplayerStore.localPlayer.level = Math.floor(Math.random() * 10) + 1
    
    console.log('👤 玩家初始化完成:', multiplayerStore.localPlayer)
  }

  // Mock API 方法
  
  // 断开连接
  disconnect() {
    this.isConnected = false
    console.log('🔌 Mock WebSocket 已断开')
    
    const multiplayerStore = useMultiplayerStore()
    multiplayerStore.setConnectionStatus(false)
    multiplayerStore.socket = null
  }
  
  // 获取房间列表
  getRoomList() {
    return Array.from(this.mockRooms.values())
      .filter(room => !room.isPrivate) // 只返回公开房间
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }
  
  // 获取在线玩家列表
  getOnlinePlayersList() {
    return Array.from(this.mockPlayers.values())
      .filter(player => player.status === 'online')
      .slice(0, 10) // 最多显示10个
  }
  
  // 开始快速匹配
  startQuickMatch(gameMode = 'classic') {
    const multiplayerStore = useMultiplayerStore()
    multiplayerStore.isSearching = true
    multiplayerStore.matchingProgress = 0
    multiplayerStore.estimatedWaitTime = 30
    
    console.log(`🔍 开始快速匹配: ${gameMode}`)
    
    // 模拟匹配过程
    const matchInterval = setInterval(() => {
      multiplayerStore.matchingProgress += Math.random() * 15 + 5
      multiplayerStore.estimatedWaitTime = Math.max(0, multiplayerStore.estimatedWaitTime - 2)
      
      // 70%的几率在进度条达到80%后找到匹配
      if (multiplayerStore.matchingProgress >= 80 && Math.random() > 0.3) {
        clearInterval(matchInterval)
        this.handleMatchFound(gameMode)
      }
      
      // 超时处理
      if (multiplayerStore.matchingProgress >= 100) {
        clearInterval(matchInterval)
        this.handleMatchFound(gameMode)
      }
    }, 1000)
    
    return matchInterval
  }
  
  // 处理找到匹配
  handleMatchFound(gameMode) {
    const multiplayerStore = useMultiplayerStore()
    
    // 创建匹配房间
    const roomId = generateRoomId()
    const matchedPlayers = Array.from(this.mockPlayers.values()).slice(0, 2) // 获取2个模拟玩家
    matchedPlayers.push(multiplayerStore.localPlayer) // 添加本地玩家
    
    const room = {
      id: roomId,
      name: `快速匹配 - ${gameMode}`,
      gameMode: gameMode,
      maxPlayers: 4,
      minPlayers: 2,
      players: matchedPlayers,
      host: multiplayerStore.localPlayer.id,
      hostName: multiplayerStore.localPlayer.name,
      status: 'waiting',
      isPrivate: false,
      createdAt: new Date().toISOString()
    }
    
    this.mockRooms.set(roomId, room)
    
    // 更新状态
    multiplayerStore.isSearching = false
    multiplayerStore.matchingProgress = 100
    multiplayerStore.currentRoom = room
    multiplayerStore.isInRoom = true
    multiplayerStore.isHost = true
    
    console.log('✅ 找到匹配！成功创建房间:', room)
    
    // 模拟其他玩家加入的延迟
    setTimeout(() => {
      console.log('👥 其他玩家已加入房间')
    }, 1500)
  }
  
  // 取消匹配
  cancelMatching() {
    const multiplayerStore = useMultiplayerStore()
    multiplayerStore.isSearching = false
    multiplayerStore.matchingProgress = 0
    multiplayerStore.estimatedWaitTime = 0
    
    console.log('❌ 已取消匹配')
  }
  
  // 创建房间
  createRoom(roomConfig) {
    const multiplayerStore = useMultiplayerStore()
    const roomId = generateRoomId()
    
    const room = {
      id: roomId,
      name: roomConfig.name || `${multiplayerStore.localPlayer.name}的房间`,
      gameMode: roomConfig.gameMode || 'classic',
      maxPlayers: roomConfig.maxPlayers || 4,
      minPlayers: roomConfig.minPlayers || 2,
      players: [multiplayerStore.localPlayer],
      host: multiplayerStore.localPlayer.id,
      hostName: multiplayerStore.localPlayer.name,
      status: 'waiting',
      isPrivate: roomConfig.isPrivate || false,
      password: roomConfig.password || '',
      createdAt: new Date().toISOString()
    }
    
    this.mockRooms.set(roomId, room)
    
    multiplayerStore.currentRoom = room
    multiplayerStore.isInRoom = true
    multiplayerStore.isHost = true
    
    console.log('🏠 房间创建成功:', room)
    return room
  }
  
  // 加入房间
  async joinRoom(roomId, password = '') {
    const multiplayerStore = useMultiplayerStore()
    const room = this.mockRooms.get(roomId)
    
    if (!room) {
      throw new Error('房间不存在')
    }
    
    if (room.isPrivate && room.password !== password) {
      throw new Error('房间密码错误')
    }
    
    if (room.players.length >= room.maxPlayers) {
      throw new Error('房间已满')
    }
    
    if (room.status === 'playing') {
      throw new Error('游戏已开始，无法加入')
    }
    
    // 模拟加入延迟
    await new Promise(resolve => setTimeout(resolve, 500))
    
    room.players.push(multiplayerStore.localPlayer)
    
    multiplayerStore.currentRoom = room
    multiplayerStore.isInRoom = true
    multiplayerStore.isHost = false
    
    console.log('🚆 成功加入房间:', room)
    return room
  }
  
  // 离开房间
  leaveRoom() {
    const multiplayerStore = useMultiplayerStore()
    
    if (multiplayerStore.currentRoom) {
      const room = this.mockRooms.get(multiplayerStore.currentRoom.id)
      if (room) {
        room.players = room.players.filter(p => p.id !== multiplayerStore.localPlayer.id)
        
        // 如果房主离开，转移房主权限
        if (multiplayerStore.isHost && room.players.length > 0) {
          room.host = room.players[0].id
          room.hostName = room.players[0].name
        }
        
        // 如果房间没人了，删除房间
        if (room.players.length === 0) {
          this.mockRooms.delete(room.id)
        }
      }
    }
    
    multiplayerStore.currentRoom = null
    multiplayerStore.isInRoom = false
    multiplayerStore.isHost = false
    
    console.log('🚆 已离开房间')
  }
  
  // 向玩家发送邀请
  invitePlayer(player) {
    console.log(`📩 已向 ${player.name} 发送邀请`)
    
    // 模拟回复，70%的几率接受
    setTimeout(() => {
      if (Math.random() > 0.3) {
        console.log(`✅ ${player.name} 接受了你的邀请`)
      } else {
        console.log(`❌ ${player.name} 拒绝了你的邀请`)
      }
    }, 2000)
  }
  
  // 挑战玩家
  challengePlayer(player) {
    console.log(`⚔️ 已向 ${player.name} 发起挑战`)
    
    // 模拟回复，60%的几率接受
    setTimeout(() => {
      if (Math.random() > 0.4) {
        console.log(`⚔️ ${player.name} 接受了你的挑战！`)
        // 自动创建1v1房间
        this.createRoom({
          name: `${player.name} vs 你`,
          gameMode: 'classic',
          maxPlayers: 2,
          minPlayers: 2
        })
      } else {
        console.log(`❌ ${player.name} 拒绝了你的挑战`)
      }
    }, 2000)
  }
  
  // 发送聊天消息
  sendChatMessage(message) {
    const multiplayerStore = useMultiplayerStore()
    
    const chatMessage = {
      id: `msg_${Date.now()}`,
      playerId: multiplayerStore.localPlayer.id,
      playerName: multiplayerStore.localPlayer.name,
      message: message,
      timestamp: new Date().toISOString(),
      type: 'text'
    }
    
    multiplayerStore.messages.push(chatMessage)
    console.log('💬 消息已发送:', message)
    
    // 模拟其他玩家的回复
    setTimeout(() => {
      const responses = ['好的！', '没问题', '赶紧开始吧', '我已经准备好了', '加油！']
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      const mockPlayers = Array.from(this.mockPlayers.values())
      const randomPlayer = mockPlayers[Math.floor(Math.random() * mockPlayers.length)]
      
      const responseMessage = {
        id: `msg_${Date.now()}_resp`,
        playerId: randomPlayer.id,
        playerName: randomPlayer.name,
        message: randomResponse,
        timestamp: new Date().toISOString(),
        type: 'text'
      }
      
      multiplayerStore.messages.push(responseMessage)
    }, 1000 + Math.random() * 2000)
  }

  // 房间事件处理器
  handleRoomCreated(data) {
    console.log('🏠 Room created:', data)
    const multiplayerStore = useMultiplayerStore()
    multiplayerStore.currentRoom = data.room
    multiplayerStore.isInRoom = true
    multiplayerStore.isHost = true
  }

  handleRoomJoined(data) {
    console.log('🚪 Room joined:', data)
    const multiplayerStore = useMultiplayerStore()
    multiplayerStore.currentRoom = data.room
    multiplayerStore.isInRoom = true
    multiplayerStore.isHost = data.room.host === multiplayerStore.localPlayer.id
  }

  handleRoomLeft(data) {
    console.log('🚪 Room left:', data)
    const multiplayerStore = useMultiplayerStore()
    multiplayerStore.currentRoom = null
    multiplayerStore.isInRoom = false
    multiplayerStore.isHost = false
  }

  handleRoomUpdated(data) {
    console.log('🔄 Room updated:', data)
    const multiplayerStore = useMultiplayerStore()
    multiplayerStore.currentRoom = data.room
  }

  handlePlayerJoined(data) {
    console.log('👤 Player joined:', data)
    const multiplayerStore = useMultiplayerStore()
    multiplayerStore.addPlayer(data.player)
    
    if (multiplayerStore.currentRoom) {
      multiplayerStore.currentRoom.players.push(data.player)
    }
  }

  handlePlayerLeft(data) {
    console.log('👤 Player left:', data)
    const multiplayerStore = useMultiplayerStore()
    multiplayerStore.removeRemotePlayer(data.playerId)
    
    if (multiplayerStore.currentRoom) {
      multiplayerStore.currentRoom.players = multiplayerStore.currentRoom.players
        .filter(p => p.id !== data.playerId)
      
      // 如果房主离开，转移房主权限
      if (data.playerId === multiplayerStore.currentRoom.host && 
          multiplayerStore.currentRoom.players.length > 0) {
        multiplayerStore.currentRoom.host = multiplayerStore.currentRoom.players[0].id
        multiplayerStore.isHost = multiplayerStore.currentRoom.host === multiplayerStore.localPlayer.id
      }
    }
  }

  // 游戏事件处理器
  handleGameStarted(data) {
    console.log('🎮 Game started:', data)
    const multiplayerStore = useMultiplayerStore()
    const gameStore = useGameStore()
    
    multiplayerStore.gameSession = data.gameSession
    gameStore.startGame()
    gameStore.setGameMode('multiplayer')
  }

  handleGameStateUpdate(data) {
    const multiplayerStore = useMultiplayerStore()
    const gameStore = useGameStore()
    
    // 更新游戏状态
    multiplayerStore.updateGameState(data.gameState)
    
    // 更新远程玩家状态
    if (data.players) {
      data.players.forEach(player => {
        if (player.id !== multiplayerStore.localPlayer.id) {
          multiplayerStore.updateRemotePlayer(player.id, player)
        }
      })
    }
    
    // 更新游戏元素
    if (data.gameElements) {
      gameStore.food = data.gameElements.food
      gameStore.obstacles = data.gameElements.obstacles
      gameStore.specialFood = data.gameElements.specialFood
    }
  }

  handleGameEnded(data) {
    console.log('🏁 Game ended:', data)
    const multiplayerStore = useMultiplayerStore()
    const gameStore = useGameStore()
    
    multiplayerStore.endGameSession(data.winner)
    gameStore.endGame()
    
    // 显示游戏结果
    this.emit('gameResultsReady', {
      winner: data.winner,
      finalScores: data.finalScores,
      gameStats: data.gameStats
    })
  }

  handlePlayerAction(data) {
    const multiplayerStore = useMultiplayerStore()
    
    // 如果是远程玩家的动作，更新其状态
    if (data.playerId !== multiplayerStore.localPlayer.id) {
      multiplayerStore.updateRemotePlayer(data.playerId, {
        action: data.action,
        timestamp: data.timestamp
      })
    }
  }

  // 聊天事件处理器
  handleChatMessage(data) {
    console.log('💬 Chat message:', data)
    const multiplayerStore = useMultiplayerStore()
    multiplayerStore.receiveMessage(data)
  }

  // 匹配事件处理器
  handleMatchFound(data) {
    console.log('🎯 Match found:', data)
    const multiplayerStore = useMultiplayerStore()
    
    multiplayerStore.isSearching = false
    multiplayerStore.currentRoom = data.room
    multiplayerStore.isInRoom = true
    multiplayerStore.isHost = data.room.host === multiplayerStore.localPlayer.id
  }

  handleMatchCancelled(data) {
    console.log('❌ Match cancelled:', data)
    const multiplayerStore = useMultiplayerStore()
    multiplayerStore.cancelMatchmaking()
  }

  // 错误处理器
  handleError(error) {
    console.error('🔥 Socket error:', error)
    const multiplayerStore = useMultiplayerStore()
    multiplayerStore.connectionError = error.message || 'Unknown error'
  }

  // 重连逻辑
  async attemptReconnect() {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return
    }

    this.isReconnecting = true
    this.reconnectAttempts++

    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)

    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay))

    try {
      await this.connect()
    } catch (error) {
      console.error('❌ Reconnection failed:', error)
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectDelay *= 2 // 指数退避
        this.attemptReconnect()
      } else {
        console.error('❌ Max reconnection attempts reached')
        this.isReconnecting = false
      }
    }
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    
    const multiplayerStore = useMultiplayerStore()
    multiplayerStore.setConnectionStatus(false)
    multiplayerStore.socket = null
    
    this.reconnectAttempts = 0
    this.isReconnecting = false
  }

  // 发送事件
  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data)
      return true
    } else {
      console.warn('⚠️ Cannot emit event, socket not connected:', event)
      return false
    }
  }

  // 监听事件
  on(event, handler) {
    if (this.socket) {
      this.socket.on(event, handler)
    }
    
    // 保存处理器以便重连时重新绑定
    this.eventHandlers.set(event, handler)
  }

  // 移除事件监听
  off(event, handler) {
    if (this.socket) {
      this.socket.off(event, handler)
    }
    
    this.eventHandlers.delete(event)
  }

  // 房间操作
  createRoom(roomConfig) {
    return this.emit('create_room', roomConfig)
  }

  joinRoom(roomId, password = '') {
    return this.emit('join_room', { roomId, password })
  }

  leaveRoom() {
    return this.emit('leave_room')
  }

  // 游戏操作
  startGame() {
    return this.emit('start_game')
  }

  sendPlayerAction(action) {
    const multiplayerStore = useMultiplayerStore()
    const actionData = {
      type: action.type,
      direction: action.direction,
      position: action.position,
      timestamp: Date.now(),
      playerId: multiplayerStore.localPlayer.id
    }
    
    return this.emit('player_action', actionData)
  }

  sendGameUpdate(gameData) {
    return this.emit('game_update', gameData)
  }

  // 聊天操作
  sendChatMessage(message) {
    const multiplayerStore = useMultiplayerStore()
    const messageData = {
      content: message,
      playerId: multiplayerStore.localPlayer.id,
      timestamp: new Date().toISOString()
    }
    
    return this.emit('chat_message', messageData)
  }

  // 匹配操作
  startMatchmaking(gameMode, preferences = {}) {
    const multiplayerStore = useMultiplayerStore()
    const matchData = {
      gameMode,
      playerId: multiplayerStore.localPlayer.id,
      preferences
    }
    
    return this.emit('start_matchmaking', matchData)
  }

  cancelMatchmaking() {
    return this.emit('cancel_matchmaking')
  }

  // 获取连接状态
  isConnected() {
    return this.socket && this.socket.connected
  }

  // 获取延迟
  getPing() {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        resolve(-1)
        return
      }

      const start = Date.now()
      this.socket.emit('ping', start, () => {
        resolve(Date.now() - start)
      })
    })
  }
}

// 创建单例实例
export const socketService = new SocketService()

// 提供便捷的访问方法
export default {
  install(app) {
    app.config.globalProperties.$socket = socketService
    app.provide('socket', socketService)
  }
}
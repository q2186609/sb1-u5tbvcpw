import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useMultiplayerStore = defineStore('multiplayer', () => {
  // 连接状态
  const socket = ref(null)
  const isConnected = ref(false)
  const connectionError = ref('')
  
  // 响应式数据
  const roomList = ref([])
  const onlinePlayers = ref([])
  const messages = ref([])
  const unreadCount = ref(0)
  
  // 房间状态
  const currentRoom = ref(null)
  const isInRoom = ref(false)
  const isHost = ref(false)
  
  // 匹配状态
  const isSearching = ref(false)
  const matchingProgress = ref(0)
  const estimatedWaitTime = ref(0)
  
  // 游戏会话状态
  const gameSession = ref({
    id: '',
    mode: '', // 'classic', 'team', 'survival', 'score'
    status: 'waiting', // 'waiting', 'starting', 'playing', 'paused', 'finished'
    startTime: null,
    endTime: null,
    winner: null,
    players: [],
    gameData: {}
  })
  
  // 玩家状态
  const localPlayer = ref({
    id: '',
    name: '',
    avatar: '',
    score: 0,
    rank: 0,
    isAlive: true,
    snake: [],
    direction: 'right',
    powerUps: [],
    skills: {}
  })
  
  const remotePlayers = ref([])
  
  // 实时游戏数据
  const gameState = ref({
    gridSize: 32,
    obstacles: [],
    foods: [],
    powerUps: [],
    tick: 0,
    lastUpdate: 0
  })
  
  // 聊天系统已在上面定义
  
  // 计算属性
  const allPlayers = computed(() => {
    return [localPlayer.value, ...remotePlayers.value].filter(p => p.id)
  })
  
  const alivePlayers = computed(() => {
    return allPlayers.value.filter(p => p.isAlive)
  })
  
  const leaderboard = computed(() => {
    return [...allPlayers.value].sort((a, b) => b.score - a.score)
  })
  
  const canStartGame = computed(() => {
    return isHost.value && 
           currentRoom.value && 
           currentRoom.value.players.length >= currentRoom.value.minPlayers &&
           gameSession.value.status === 'waiting'
  })
  
  const gameProgress = computed(() => {
    if (!gameSession.value.startTime) return 0
    const elapsed = Date.now() - gameSession.value.startTime
    const total = gameSession.value.duration || 300000 // 5分钟默认
    return Math.min(elapsed / total, 1)
  })
  
  // WebSocket连接管理
  const setConnectionStatus = (status) => {
    isConnected.value = status
    if (!status) {
      connectionError.value = ''
    }
  }
  
  const connect = (url) => {
    return new Promise((resolve, reject) => {
      try {
        // 这里会在后续实现WebSocket连接
        isConnected.value = true
        connectionError.value = ''
        resolve(true)
      } catch (error) {
        connectionError.value = error.message
        reject(error)
      }
    })
  }
  
  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }
    isConnected.value = false
    resetState()
  }
  
  // 房间管理
  const createRoom = (roomConfig) => {
    const room = {
      id: generateRoomId(),
      name: roomConfig.name || `${localPlayer.value.name}的房间`,
      host: localPlayer.value.id,
      gameMode: roomConfig.gameMode || 'classic',
      maxPlayers: roomConfig.maxPlayers || 4,
      minPlayers: roomConfig.minPlayers || 2,
      isPrivate: roomConfig.isPrivate || false,
      password: roomConfig.password || '',
      level: roomConfig.level || null,
      settings: roomConfig.settings || {},
      players: [localPlayer.value],
      status: 'waiting',
      createdAt: new Date().toISOString()
    }
    
    currentRoom.value = room
    isInRoom.value = true
    isHost.value = true
    
    return room
  }
  
  const joinRoom = (roomId, password = '') => {
    return new Promise((resolve, reject) => {
      // 模拟加入房间逻辑
      const room = roomList.value.find(r => r.id === roomId)
      if (!room) {
        reject(new Error('房间不存在'))
        return
      }
      
      if (room.isPrivate && room.password !== password) {
        reject(new Error('房间密码错误'))
        return
      }
      
      if (room.players.length >= room.maxPlayers) {
        reject(new Error('房间已满'))
        return
      }
      
      room.players.push(localPlayer.value)
      currentRoom.value = room
      isInRoom.value = true
      isHost.value = false
      
      resolve(room)
    })
  }
  
  const leaveRoom = () => {
    if (currentRoom.value) {
      currentRoom.value.players = currentRoom.value.players.filter(
        p => p.id !== localPlayer.value.id
      )
      
      if (isHost.value && currentRoom.value.players.length > 0) {
        // 转移房主
        currentRoom.value.host = currentRoom.value.players[0].id
      }
    }
    
    currentRoom.value = null
    isInRoom.value = false
    isHost.value = false
    gameSession.value.status = 'waiting'
  }
  
  // 匹配系统
  const startMatchmaking = (gameMode, skill = 'normal') => {
    isSearching.value = true
    matchingProgress.value = 0
    estimatedWaitTime.value = 30 // 估计等待时间(秒)
    
    // 模拟匹配进度
    const interval = setInterval(() => {
      matchingProgress.value += 10
      estimatedWaitTime.value = Math.max(0, estimatedWaitTime.value - 3)
      
      if (matchingProgress.value >= 100) {
        clearInterval(interval)
        // 模拟找到匹配
        const mockRoom = createRoom({
          name: '快速匹配房间',
          gameMode: gameMode,
          maxPlayers: 4
        })
        
        // 添加模拟玩家
        for (let i = 1; i < 4; i++) {
          mockRoom.players.push({
            id: `ai_player_${i}`,
            name: `玩家${i}`,
            avatar: '',
            score: 0,
            rank: 0,
            isAlive: true,
            snake: [],
            direction: 'right'
          })
        }
        
        isSearching.value = false
        matchingProgress.value = 0
      }
    }, 1000)
    
    return interval
  }
  
  const cancelMatchmaking = () => {
    isSearching.value = false
    matchingProgress.value = 0
    estimatedWaitTime.value = 0
  }
  
  // 游戏会话管理
  const startGameSession = () => {
    if (!canStartGame.value) return false
    
    gameSession.value = {
      id: generateSessionId(),
      mode: currentRoom.value.gameMode,
      status: 'starting',
      startTime: Date.now() + 3000, // 3秒后开始
      endTime: null,
      winner: null,
      players: [...currentRoom.value.players],
      gameData: initializeGameData()
    }
    
    // 3秒倒计时后开始游戏
    setTimeout(() => {
      if (gameSession.value.status === 'starting') {
        gameSession.value.status = 'playing'
        gameSession.value.startTime = Date.now()
      }
    }, 3000)
    
    return true
  }
  
  const endGameSession = (winner = null) => {
    gameSession.value.status = 'finished'
    gameSession.value.endTime = Date.now()
    gameSession.value.winner = winner
    
    // 更新玩家统计
    updatePlayerStats()
  }
  
  const pauseGame = () => {
    if (gameSession.value.status === 'playing') {
      gameSession.value.status = 'paused'
    }
  }
  
  const resumeGame = () => {
    if (gameSession.value.status === 'paused') {
      gameSession.value.status = 'playing'
    }
  }
  
  // 玩家状态更新
  const updateLocalPlayer = (updates) => {
    localPlayer.value = { ...localPlayer.value, ...updates }
  }
  
  const updateRemotePlayer = (playerId, updates) => {
    const playerIndex = remotePlayers.value.findIndex(p => p.id === playerId)
    if (playerIndex !== -1) {
      remotePlayers.value[playerIndex] = { ...remotePlayers.value[playerIndex], ...updates }
    } else {
      remotePlayers.value.push({ id: playerId, ...updates })
    }
  }
  
  const removeRemotePlayer = (playerId) => {
    remotePlayers.value = remotePlayers.value.filter(p => p.id !== playerId)
  }
  
  // 游戏状态同步
  const updateGameState = (newState) => {
    gameState.value = { ...gameState.value, ...newState }
    gameState.value.lastUpdate = Date.now()
  }
  
  const sendPlayerAction = (action) => {
    if (!isConnected.value || !socket.value) return
    
    const actionData = {
      type: 'player_action',
      playerId: localPlayer.value.id,
      action: action,
      timestamp: Date.now(),
      tick: gameState.value.tick
    }
    
    // 发送到服务器
    socket.value.emit('game_action', actionData)
  }
  
  // 聊天系统
  const sendMessage = (message) => {
    if (!message.trim()) return
    
    const chatMessage = {
      id: Date.now().toString(),
      playerId: localPlayer.value.id,
      playerName: localPlayer.value.name,
      content: message.trim(),
      timestamp: new Date().toISOString(),
      type: 'text'
    }
    
    messages.value.push(chatMessage)
    
    if (socket.value) {
      socket.value.emit('chat_message', chatMessage)
    }
  }
  
  const receiveMessage = (message) => {
    messages.value.push(message)
    if (message.playerId !== localPlayer.value.id) {
      unreadCount.value++
    }
  }
  
  const markMessagesAsRead = () => {
    unreadCount.value = 0
  }
  
  // 工具函数
  const generateRoomId = () => {
    return 'room_' + Math.random().toString(36).substr(2, 9)
  }
  
  const generateSessionId = () => {
    return 'session_' + Math.random().toString(36).substr(2, 9)
  }
  
  const initializeGameData = () => {
    return {
      gridSize: 32,
      obstacles: [],
      foods: [Math.floor(Math.random() * 1024)],
      powerUps: [],
      tick: 0
    }
  }
  
  const updatePlayerStats = () => {
    // 更新本地玩家统计数据
    const isWinner = gameSession.value.winner === localPlayer.value.id
    const gamesPlayed = parseInt(localStorage.getItem('multiplayerGamesPlayed') || '0') + 1
    const wins = parseInt(localStorage.getItem('multiplayerWins') || '0') + (isWinner ? 1 : 0)
    
    localStorage.setItem('multiplayerGamesPlayed', gamesPlayed.toString())
    localStorage.setItem('multiplayerWins', wins.toString())
  }
  
  const resetState = () => {
    currentRoom.value = null
    isInRoom.value = false
    isHost.value = false
    isSearching.value = false
    matchingProgress.value = 0
    gameSession.value = {
      id: '',
      mode: '',
      status: 'waiting',
      startTime: null,
      endTime: null,
      winner: null,
      players: [],
      gameData: {}
    }
    remotePlayers.value = []
    messages.value = []
    unreadCount.value = 0
  }
  
  return {
    // 状态
    socket,
    isConnected,
    connectionError,
    currentRoom,
    roomList,
    onlinePlayers,
    isInRoom,
    isHost,
    isSearching,
    matchingProgress,
    estimatedWaitTime,
    gameSession,
    localPlayer,
    remotePlayers,
    gameState,
    messages,
    unreadCount,
    
    // 计算属性
    allPlayers,
    alivePlayers,
    leaderboard,
    canStartGame,
    gameProgress,
    
    // 方法
    setConnectionStatus,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    leaveRoom,
    startMatchmaking,
    cancelMatchmaking,
    startGameSession,
    endGameSession,
    pauseGame,
    resumeGame,
    updateLocalPlayer,
    updateRemotePlayer,
    removeRemotePlayer,
    updateGameState,
    sendPlayerAction,
    sendMessage,
    receiveMessage,
    markMessagesAsRead,
    resetState
  }
})
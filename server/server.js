import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const server = createServer(app)

// 配置CORS
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://192.168.2.80:5173",
    /^http:\/\/192\.168\.\d+\.\d+:5173$/,
    /^http:\/\/10\.\d+\.\d+\.\d+:5173$/,
    /^http:\/\/172\.(?:1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:5173$/
  ],
  credentials: true
}))

// 配置Socket.io
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://192.168.2.80:5173",
      /^http:\/\/192\.168\.\d+\.\d+:5173$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:5173$/,
      /^http:\/\/172\.(?:1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:5173$/
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
})

// 游戏状态管理
class GameServer {
  constructor() {
    this.players = new Map() // 所有连接的玩家
    this.rooms = new Map()   // 所有房间
    this.matchQueue = []     // 匹配队列
    this.gameSessions = new Map() // 游戏会话
  }

  // 玩家连接
  addPlayer(socket, playerData = {}) {
    const player = {
      id: socket.id,
      name: playerData.name || `玩家${Math.floor(Math.random() * 1000)}`,
      socketId: socket.id,
      status: 'online',
      level: playerData.level || 1,
      avatar: playerData.avatar || '',
      currentRoom: null,
      lastActivity: new Date(),
      gameStats: {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        highScore: 0
      }
    }
    
    this.players.set(socket.id, player)
    console.log(`👤 玩家连接: ${player.name} (${socket.id})`)
    
    // 广播玩家上线
    socket.broadcast.emit('player_online', {
      player: this.getPublicPlayerInfo(player)
    })
    
    return player
  }

  // 玩家断开连接
  removePlayer(socketId) {
    const player = this.players.get(socketId)
    if (player) {
      // 如果玩家在房间中，让其离开房间
      if (player.currentRoom) {
        this.leaveRoom(socketId)
      }
      
      // 从匹配队列中移除
      this.matchQueue = this.matchQueue.filter(p => p.id !== socketId)
      
      this.players.delete(socketId)
      console.log(`👋 玩家断开: ${player.name} (${socketId})`)
      
      // 广播玩家下线
      io.emit('player_offline', {
        playerId: socketId
      })
    }
  }

  // 获取公开的玩家信息
  getPublicPlayerInfo(player) {
    return {
      id: player.id,
      name: player.name,
      level: player.level,
      avatar: player.avatar,
      status: player.status
    }
  }

  // 获取在线玩家列表
  getOnlinePlayers() {
    return Array.from(this.players.values())
      .map(player => this.getPublicPlayerInfo(player))
      .slice(0, 20) // 最多返回20个玩家
  }

  // 创建房间
  createRoom(hostSocketId, roomConfig) {
    const host = this.players.get(hostSocketId)
    if (!host) {
      throw new Error('主机玩家不存在')
    }

    const roomId = uuidv4()
    const room = {
      id: roomId,
      name: roomConfig.name || `${host.name}的房间`,
      host: hostSocketId,
      hostName: host.name,
      gameMode: roomConfig.gameMode || 'classic',
      maxPlayers: roomConfig.maxPlayers || 4,
      minPlayers: roomConfig.minPlayers || 2,
      isPrivate: roomConfig.isPrivate || false,
      password: roomConfig.password || '',
      status: 'waiting', // waiting, preparing, countdown, starting, playing, finished
      players: [hostSocketId],
      readyPlayers: [], // 已准备的玩家ID列表
      settings: roomConfig.settings || {},
      createdAt: new Date().toISOString(),
      gameSession: null
    }

    this.rooms.set(roomId, room)
    host.currentRoom = roomId

    console.log(`🏠 房间创建: ${room.name} (${roomId}) by ${host.name}`)
    console.log(`👤 房主状态: ${host.name} (${host.id}) currentRoom: ${host.currentRoom}`)
    
    // 通知房主
    io.to(hostSocketId).emit('room_created', {
      room: this.getRoomInfo(room)
    })

    // 广播房间列表更新
    this.broadcastRoomList()
    
    return room
  }

  // 加入房间
  joinRoom(playerSocketId, roomId, password = '') {
    const player = this.players.get(playerSocketId)
    const room = this.rooms.get(roomId)

    if (!player) {
      throw new Error('玩家不存在')
    }

    if (!room) {
      throw new Error('房间不存在')
    }

    if (room.isPrivate && room.password !== password) {
      throw new Error('房间密码错误')
    }

    if (room.players.length >= room.maxPlayers) {
      throw new Error('房间已满')
    }

    if (room.status !== 'waiting') {
      throw new Error('游戏已开始，无法加入')
    }

    if (player.currentRoom) {
      this.leaveRoom(playerSocketId)
    }

    // 加入房间
    room.players.push(playerSocketId)
    player.currentRoom = roomId

    console.log(`🚪 玩家加入房间: ${player.name} -> ${room.name}`)

    // 通知房间内所有玩家
    room.players.forEach(socketId => {
      io.to(socketId).emit('player_joined', {
        player: this.getPublicPlayerInfo(player),
        room: this.getRoomInfo(room)
      })
    })

    // 通知加入者
    io.to(playerSocketId).emit('room_joined', {
      room: this.getRoomInfo(room)
    })

    // 广播房间列表更新
    this.broadcastRoomList()

    return room
  }

  // 离开房间
  leaveRoom(playerSocketId) {
    const player = this.players.get(playerSocketId)
    if (!player || !player.currentRoom) {
      return
    }

    const room = this.rooms.get(player.currentRoom)
    if (!room) {
      return
    }

    // 从房间中移除玩家
    room.players = room.players.filter(id => id !== playerSocketId)
    player.currentRoom = null

    console.log(`🚪 玩家离开房间: ${player.name} <- ${room.name}`)

    // 通知房间内其他玩家
    room.players.forEach(socketId => {
      io.to(socketId).emit('player_left', {
        playerId: playerSocketId,
        playerName: player.name,
        room: this.getRoomInfo(room)
      })
    })

    // 通知离开者
    io.to(playerSocketId).emit('room_left', {
      roomId: room.id
    })

    // 如果房主离开，转移房主权限或删除房间
    if (room.host === playerSocketId) {
      if (room.players.length > 0) {
        room.host = room.players[0]
        const newHost = this.players.get(room.host)
        room.hostName = newHost.name
        
        // 通知新房主
        io.to(room.host).emit('room_host_changed', {
          room: this.getRoomInfo(room)
        })
      } else {
        // 房间没人了，删除房间
        this.rooms.delete(room.id)
        console.log(`🗑️ 删除空房间: ${room.name}`)
      }
    }

    // 广播房间列表更新
    this.broadcastRoomList()
  }

  // 获取房间信息
  getRoomInfo(room) {
    return {
      id: room.id,
      name: room.name,
      host: room.host,
      hostName: room.hostName,
      gameMode: room.gameMode,
      maxPlayers: room.maxPlayers,
      minPlayers: room.minPlayers,
      isPrivate: room.isPrivate,
      status: room.status,
      readyPlayers: room.readyPlayers || [], // 添加准备玩家列表
      players: room.players.map(socketId => {
        const player = this.players.get(socketId)
        return player ? this.getPublicPlayerInfo(player) : null
      }).filter(Boolean),
      createdAt: room.createdAt
    }
  }
  
  // 准备系统方法
  setPlayerReady(playerSocketId, ready) {
    const player = this.players.get(playerSocketId)
    console.log(`🔍 检查玩家: ${playerSocketId}, 玩家存在: ${!!player}, currentRoom: ${player?.currentRoom}`)
    
    if (!player || !player.currentRoom) {
      const errorMsg = !player ? '玩家不存在' : '玩家未在房间中'
      console.error(`❌ setPlayerReady 失败: ${errorMsg}, 玩家ID: ${playerSocketId}`)
      throw new Error('玩家未在房间中')
    }
    
    const room = this.rooms.get(player.currentRoom)
    console.log(`🏠 检查房间: ${player.currentRoom}, 房间存在: ${!!room}`)
    
    if (!room) {
      console.error(`❌ 房间不存在: ${player.currentRoom}, 玩家: ${player.name} (${playerSocketId})`)
      console.log('🗺️ 当前所有房间:', Array.from(this.rooms.keys()))
      throw new Error('房间不存在')
    }
    
    const readyIndex = room.readyPlayers.indexOf(playerSocketId)
    
    if (ready && readyIndex === -1) {
      room.readyPlayers.push(playerSocketId)
    } else if (!ready && readyIndex !== -1) {
      room.readyPlayers.splice(readyIndex, 1)
    }
    
    console.log(`🎯 玩家准备状态: ${player.name} - ${ready ? '已准备' : '取消准备'}`)
    
    // 通知房间内所有玩家
    room.players.forEach(socketId => {
      io.to(socketId).emit('player_ready_changed', {
        playerId: playerSocketId,
        playerName: player.name,
        ready: ready,
        room: this.getRoomInfo(room)
      })
    })
    
    // 检查是否所有玩家都已准备
    if (room.players.length >= room.minPlayers && room.readyPlayers.length === room.players.length) {
      this.startGameCountdown(room.id)
    }
    
    return room
  }
  
  startGameCountdown(roomId) {
    const room = this.rooms.get(roomId)
    if (!room) return
    
    room.status = 'countdown'
    let countdown = 3
    
    console.log(`⏰ 房间 ${room.name} 开始倒计时`)
    
    // 通知所有玩家开始倒计时
    room.players.forEach(socketId => {
      io.to(socketId).emit('game_countdown_start', {
        countdown: countdown,
        room: this.getRoomInfo(room)
      })
    })
    
    const countdownInterval = setInterval(() => {
      countdown--
      
      if (countdown > 0) {
        // 继续倒计时
        room.players.forEach(socketId => {
          io.to(socketId).emit('game_countdown_tick', {
            countdown: countdown
          })
        })
      } else {
        // 倒计时结束，开始游戏
        clearInterval(countdownInterval)
        this.startGame(roomId)
      }
    }, 1000)
  }
  
  startGame(roomId) {
    const room = this.rooms.get(roomId)
    if (!room) return
    
    room.status = 'playing'
    
    // 初始化游戏会话
    const gameSession = this.initializeGameSession(room)
    room.gameSession = gameSession
    this.gameSessions.set(roomId, gameSession)
    
    console.log(`🎮 房间 ${room.name} 游戏开始，初始化游戏会话`)
    
    // 通知所有玩家游戏开始
    room.players.forEach(socketId => {
      io.to(socketId).emit('game_started', {
        room: this.getRoomInfo(room),
        gameSession: gameSession
      })
    })
    
    // 启动游戏循环
    this.startGameLoop(roomId)
    
    // 更新房间列表
    this.broadcastRoomList()
  }
  
  // 初始化游戏会话
  initializeGameSession(room) {
    const canvasWidth = 800
    const canvasHeight = 600
    const gridSize = 20
    
    const gameSession = {
      id: room.id,
      status: 'playing',
      startTime: Date.now(),
      tick: 0,
      players: room.players.map((socketId, index) => {
        const player = this.players.get(socketId)
        return {
          id: socketId,
          name: player.name,
          color: this.getPlayerColor(index),
          score: 0,
          snake: [{ 
            x: 10 + index * 10, 
            y: 10 + index * 5 
          }],
          direction: { x: 1, y: 0 },
          nextDirection: { x: 1, y: 0 }, // 缓存下一个方向
          alive: true,
          lastUpdate: Date.now()
        }
      }),
      food: this.generateFood(canvasWidth, canvasHeight, gridSize),
      canvasWidth,
      canvasHeight,
      gridSize
    }
    
    return gameSession
  }
  
  // 获取玩家颜色
  getPlayerColor(index) {
    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316']
    return colors[index % colors.length]
  }
  
  // 生成食物（初始化时使用，生成两个不同类型的食物）
  generateFood(canvasWidth, canvasHeight, gridSize) {
    const maxX = Math.floor(canvasWidth / gridSize) - 1
    const maxY = Math.floor(canvasHeight / gridSize) - 1
    
    return [
      {
        x: Math.floor(Math.random() * maxX),
        y: Math.floor(Math.random() * maxY),
        type: 'normal'
      },
      {
        x: Math.floor(Math.random() * maxX),
        y: Math.floor(Math.random() * maxY),
        type: 'bonus'
      }
    ]
  }
  
  // 生成单个食物（吃掉食物后补充使用）
  generateSingleFood(canvasWidth, canvasHeight, gridSize, foodType) {
    const maxX = Math.floor(canvasWidth / gridSize) - 1
    const maxY = Math.floor(canvasHeight / gridSize) - 1
    
    return {
      x: Math.floor(Math.random() * maxX),
      y: Math.floor(Math.random() * maxY),
      type: foodType
    }
  }
  
  // 启动游戏循环
  startGameLoop(roomId) {
    const gameSession = this.gameSessions.get(roomId)
    if (!gameSession) return
    
    console.log(`🔄 启动房间 ${roomId} 的游戏循环`)
    
    const gameLoop = setInterval(() => {
      try {
        this.updateGameState(roomId)
        this.broadcastGameState(roomId)
      } catch (error) {
        console.error('游戏循环错误:', error)
        clearInterval(gameLoop)
      }
    }, 150) // 与客户端同步的间隔
    
    gameSession.gameLoop = gameLoop
  }
  
  // 更新游戏状态
  updateGameState(roomId) {
    const gameSession = this.gameSessions.get(roomId)
    const room = this.rooms.get(roomId)
    
    if (!gameSession || !room || room.status !== 'playing') {
      return
    }
    
    gameSession.tick++
    
    // 更新所有玩家
    gameSession.players.forEach(player => {
      if (!player.alive) return
      
      // 应用缓存的方向
      player.direction = { ...player.nextDirection }
      
      // 移动蛇头
      const head = { ...player.snake[0] }
      head.x += player.direction.x
      head.y += player.direction.y
      
      // 检查边界碰撞
      if (head.x < 0 || head.x >= gameSession.canvasWidth / gameSession.gridSize ||
          head.y < 0 || head.y >= gameSession.canvasHeight / gameSession.gridSize) {
        player.alive = false
        console.log(`💥 玩家 ${player.name} 撞墙死亡: (${head.x},${head.y})`)
        return
      }
      
      // 检查与其他蛇的碰撞
      const allSnakeSegments = gameSession.players.flatMap(p => p.snake)
      if (allSnakeSegments.some(segment => segment.x === head.x && segment.y === head.y)) {
        player.alive = false
        console.log(`💥 玩家 ${player.name} 撞蛇死亡: (${head.x},${head.y})`)
        return
      }
      
      player.snake.unshift(head)
      
      // 检查是否吃到食物
      const eatenFoodIndex = gameSession.food.findIndex(f => f.x === head.x && f.y === head.y)
      if (eatenFoodIndex !== -1) {
        const eatenFood = gameSession.food[eatenFoodIndex]
        player.score += eatenFood.type === 'bonus' ? 20 : 10
        console.log(`🍎 玩家 ${player.name} 吃到食物，得分: ${player.score}`)
        
        // 移除被吃的食物
        gameSession.food.splice(eatenFoodIndex, 1)
        
        // 生成一个相同类型的新食物
        const newFood = this.generateSingleFood(gameSession.canvasWidth, gameSession.canvasHeight, gameSession.gridSize, eatenFood.type)
        gameSession.food.push(newFood)
      } else {
        player.snake.pop()
      }
    })
    
    // 检查游戏是否结束
    const alivePlayers = gameSession.players.filter(p => p.alive)
    if (alivePlayers.length <= 1) {
      this.endGame(roomId, alivePlayers[0] || null)
    }
  }
  
  // 广播游戏状态
  broadcastGameState(roomId) {
    const gameSession = this.gameSessions.get(roomId)
    const room = this.rooms.get(roomId)
    
    if (!gameSession || !room) return
    
    const gameState = {
      tick: gameSession.tick,
      players: gameSession.players,
      food: gameSession.food,
      timestamp: Date.now()
    }
    
    // 向房间内所有玩家广播游戏状态
    room.players.forEach(socketId => {
      io.to(socketId).emit('game_state_update', gameState)
    })
  }
  
  // 处理玩家动作
  handlePlayerAction(socketId, action) {
    const player = this.players.get(socketId)
    if (!player || !player.currentRoom) return
    
    const gameSession = this.gameSessions.get(player.currentRoom)
    if (!gameSession) return
    
    const gamePlayer = gameSession.players.find(p => p.id === socketId)
    if (!gamePlayer || !gamePlayer.alive) return
    
    // 验证方向改变是否有效（不能反向）
    const newDirection = action.direction
    const currentDirection = gamePlayer.direction
    
    // 检查是否是有效的方向改变
    if ((newDirection.x !== 0 && currentDirection.x !== -newDirection.x) ||
        (newDirection.y !== 0 && currentDirection.y !== -newDirection.y)) {
      gamePlayer.nextDirection = newDirection
      console.log(`🎮 玩家 ${gamePlayer.name} 方向改变:`, newDirection)
    }
  }
  
  // 结束游戏
  endGame(roomId, winner) {
    const gameSession = this.gameSessions.get(roomId)
    const room = this.rooms.get(roomId)
    
    if (!gameSession || !room) return
    
    console.log(`🏁 房间 ${room.name} 游戏结束`)
    
    // 停止游戏循环
    if (gameSession.gameLoop) {
      clearInterval(gameSession.gameLoop)
      gameSession.gameLoop = null
    }
    
    gameSession.status = 'finished'
    gameSession.endTime = Date.now()
    room.status = 'finished'
    
    // 计算最终结果
    const finalResults = {
      winner: winner,
      players: gameSession.players.sort((a, b) => b.score - a.score),
      gameTime: gameSession.endTime - gameSession.startTime
    }
    
    // 通知所有玩家游戏结束
    room.players.forEach(socketId => {
      io.to(socketId).emit('game_ended', finalResults)
    })
    
    // 清理游戏会话
    this.gameSessions.delete(roomId)
  }
  
  forceStartGame(hostSocketId, roomId) {
    const host = this.players.get(hostSocketId)
    const room = this.rooms.get(roomId)
    
    if (!host || !room) {
      throw new Error('房间或玩家不存在')
    }
    
    if (room.host !== hostSocketId) {
      throw new Error('只有房主才能强制开始游戏')
    }
    
    if (room.players.length < room.minPlayers) {
      throw new Error('玩家数量不足')
    }
    
    console.log(`⚡ 房主 ${host.name} 强制开始游戏`)
    
    // 重置准备状态，直接开始倒计时
    room.readyPlayers = [...room.players]
    this.startGameCountdown(roomId)
    
    return room
  }
  
  // 重置游戏
  resetGame(roomId) {
    const room = this.rooms.get(roomId)
    if (!room) {
      throw new Error('房间不存在')
    }
    
    // 重置房间状态
    room.status = 'waiting'
    room.readyPlayers = []
    
    console.log(`🔄 重置游戏: 房间 ${room.name}`)
    
    // 通知房间内所有玩家游戏已重置
    room.players.forEach(socketId => {
      io.to(socketId).emit('game_reset', {
        room: this.getRoomInfo(room)
      })
    })
    
    // 更新房间列表
    this.broadcastRoomList()
    
    return room
  }

  // 获取公开房间列表
  getPublicRooms() {
    return Array.from(this.rooms.values())
      .filter(room => !room.isPrivate)
      .map(room => this.getRoomInfo(room))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  // 广播房间列表更新
  broadcastRoomList() {
    io.emit('room_list_updated', {
      rooms: this.getPublicRooms()
    })
  }

  // 开始快速匹配
  startQuickMatch(playerSocketId, gameMode = 'classic') {
    const player = this.players.get(playerSocketId)
    if (!player) {
      throw new Error('玩家不存在')
    }

    // 检查是否已经在队列中
    const existingIndex = this.matchQueue.findIndex(p => p.id === playerSocketId)
    if (existingIndex !== -1) {
      throw new Error('已经在匹配队列中')
    }

    const matchRequest = {
      id: playerSocketId,
      player: player,
      gameMode: gameMode,
      timestamp: Date.now(),
      skillLevel: player.level
    }

    this.matchQueue.push(matchRequest)
    console.log(`🔍 开始匹配: ${player.name} (${gameMode})`)

    // 通知玩家匹配开始
    io.to(playerSocketId).emit('matchmaking_started', {
      gameMode: gameMode,
      queuePosition: this.matchQueue.length
    })

    // 尝试立即匹配
    this.processMatchQueue()
  }

  // 取消匹配
  cancelQuickMatch(playerSocketId) {
    const index = this.matchQueue.findIndex(p => p.id === playerSocketId)
    if (index !== -1) {
      const removed = this.matchQueue.splice(index, 1)[0]
      console.log(`❌ 取消匹配: ${removed.player.name}`)
      
      io.to(playerSocketId).emit('matchmaking_cancelled')
    }
  }

  // 处理匹配队列
  processMatchQueue() {
    if (this.matchQueue.length < 2) return

    // 简单匹配逻辑：按游戏模式和技能等级匹配
    const groups = new Map()
    
    this.matchQueue.forEach(request => {
      const key = `${request.gameMode}_${Math.floor(request.skillLevel / 5)}`
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key).push(request)
    })

    groups.forEach((requests, key) => {
      while (requests.length >= 2) {
        const matchedPlayers = requests.splice(0, Math.min(4, requests.length))
        this.createMatchedRoom(matchedPlayers)
      }
    })

    // 更新匹配队列
    this.matchQueue = Array.from(groups.values()).flat()
  }

  // 创建匹配房间
  createMatchedRoom(matchedPlayers) {
    const host = matchedPlayers[0]
    const roomConfig = {
      name: `快速匹配 - ${host.gameMode}`,
      gameMode: host.gameMode,
      maxPlayers: 4,
      minPlayers: 2,
      isPrivate: false
    }

    try {
      const room = this.createRoom(host.id, roomConfig)
      
      // 让其他玩家加入房间
      for (let i = 1; i < matchedPlayers.length; i++) {
        this.joinRoom(matchedPlayers[i].id, room.id)
      }

      // 通知所有匹配的玩家
      matchedPlayers.forEach(({ id }) => {
        io.to(id).emit('match_found', {
          room: this.getRoomInfo(room)
        })
      })

      console.log(`✅ 匹配成功: ${matchedPlayers.length}个玩家加入房间 ${room.name}`)
      
    } catch (error) {
      console.error('创建匹配房间失败:', error)
      
      // 通知匹配失败
      matchedPlayers.forEach(({ id }) => {
        io.to(id).emit('match_failed', {
          error: error.message
        })
      })
    }
  }
}

// 创建游戏服务器实例
const gameServer = new GameServer()

// Socket.io连接处理
io.on('connection', (socket) => {
  console.log(`🔗 新连接: ${socket.id}`)

  // 玩家初始化
  socket.on('player_init', (data) => {
    try {
      const player = gameServer.addPlayer(socket, data)
      socket.emit('player_initialized', {
        player: gameServer.getPublicPlayerInfo(player),
        onlinePlayers: gameServer.getOnlinePlayers(),
        rooms: gameServer.getPublicRooms()
      })
    } catch (error) {
      socket.emit('error', { message: error.message })
    }
  })

  // 获取房间列表
  socket.on('get_room_list', () => {
    socket.emit('room_list', {
      rooms: gameServer.getPublicRooms()
    })
  })

  // 获取在线玩家列表
  socket.on('get_online_players', () => {
    socket.emit('online_players', {
      players: gameServer.getOnlinePlayers()
    })
  })

  // 创建房间
  socket.on('create_room', (roomConfig) => {
    try {
      const room = gameServer.createRoom(socket.id, roomConfig)
      socket.emit('room_create_success', {
        room: gameServer.getRoomInfo(room)
      })
    } catch (error) {
      socket.emit('room_create_error', { message: error.message })
    }
  })

  // 加入房间
  socket.on('join_room', ({ roomId, password }) => {
    try {
      const room = gameServer.joinRoom(socket.id, roomId, password)
      socket.emit('room_join_success', {
        room: gameServer.getRoomInfo(room)
      })
    } catch (error) {
      socket.emit('room_join_error', { message: error.message })
    }
  })

  // 离开房间
  socket.on('leave_room', () => {
    try {
      gameServer.leaveRoom(socket.id)
      socket.emit('room_leave_success')
    } catch (error) {
      socket.emit('error', { message: error.message })
    }
  })

  // 开始快速匹配
  socket.on('start_quick_match', ({ gameMode }) => {
    try {
      gameServer.startQuickMatch(socket.id, gameMode)
    } catch (error) {
      socket.emit('match_error', { message: error.message })
    }
  })

  // 取消匹配
  socket.on('cancel_quick_match', () => {
    gameServer.cancelQuickMatch(socket.id)
  })

  // 聊天消息
  socket.on('chat_message', ({ message, roomId }) => {
    const player = gameServer.players.get(socket.id)
    if (!player) return

    const chatMessage = {
      id: uuidv4(),
      playerId: socket.id,
      playerName: player.name,
      message: message,
      timestamp: new Date().toISOString(),
      type: 'text'
    }

    if (roomId) {
      // 房间内聊天
      const room = gameServer.rooms.get(roomId)
      if (room && room.players.includes(socket.id)) {
        room.players.forEach(socketId => {
          io.to(socketId).emit('chat_message', chatMessage)
        })
      }
    } else {
      // 大厅聊天
      io.emit('lobby_chat_message', chatMessage)
    }
  })
  
  // 准备系统事件处理
  socket.on('player_ready', ({ playerId, ready, roomId }) => {
    try {
      const room = gameServer.setPlayerReady(socket.id, ready)
      socket.emit('player_ready_success', {
        room: gameServer.getRoomInfo(room)
      })
    } catch (error) {
      socket.emit('player_ready_error', { message: error.message })
    }
  })
  
  // 房主强制开始游戏
  socket.on('force_start_game', ({ roomId }) => {
    try {
      const room = gameServer.forceStartGame(socket.id, roomId)
      socket.emit('force_start_success', {
        room: gameServer.getRoomInfo(room)
      })
    } catch (error) {
      socket.emit('force_start_error', { message: error.message })
    }
  })
  
  // 重置游戏
  socket.on('reset_game', ({ roomId }) => {
    try {
      const room = gameServer.resetGame(roomId)
      socket.emit('reset_game_success', {
        room: gameServer.getRoomInfo(room)
      })
    } catch (error) {
      socket.emit('reset_game_error', { message: error.message })
    }
  })
  
  // 处理玩家游戏动作
  socket.on('player_action', (actionData) => {
    try {
      gameServer.handlePlayerAction(socket.id, actionData)
    } catch (error) {
      console.error('处理玩家动作失败:', error)
    }
  })

  // 断开连接
  socket.on('disconnect', () => {
    console.log(`🔌 连接断开: ${socket.id}`)
    gameServer.removePlayer(socket.id)
  })
})

// 定期清理匹配队列
setInterval(() => {
  gameServer.processMatchQueue()
}, 3000)

// 启动服务器
const PORT = process.env.PORT || 3001
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Snake Game Server running on port ${PORT}`)
  console.log(`📱 WebSocket endpoint: ws://0.0.0.0:${PORT}`)
  console.log(`🌐 Local access: http://localhost:${PORT}`)
  console.log(`🌐 LAN access: http://192.168.2.80:${PORT}`)
  console.log(`💡 Frontend should connect to: ws://192.168.2.80:${PORT}`)
})
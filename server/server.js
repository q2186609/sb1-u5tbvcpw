import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const server = createServer(app)

// 配置CORS
app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true
}))

// 配置Socket.io
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
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
      status: 'waiting', // waiting, starting, playing, finished
      players: [hostSocketId],
      settings: roomConfig.settings || {},
      createdAt: new Date().toISOString(),
      gameSession: null
    }

    this.rooms.set(roomId, room)
    host.currentRoom = roomId

    console.log(`🏠 房间创建: ${room.name} (${roomId}) by ${host.name}`)
    
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
      players: room.players.map(socketId => {
        const player = this.players.get(socketId)
        return player ? this.getPublicPlayerInfo(player) : null
      }).filter(Boolean),
      createdAt: room.createdAt
    }
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
server.listen(PORT, () => {
  console.log(`🚀 Snake Game Server running on port ${PORT}`)
  console.log(`📱 WebSocket endpoint: ws://localhost:${PORT}`)
  console.log(`🌐 Frontend should connect to: http://localhost:${PORT}`)
})
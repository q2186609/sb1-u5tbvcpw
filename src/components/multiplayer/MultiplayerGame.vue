<template>
  <div class="multiplayer-game min-h-screen bg-gray-900 relative">
    <!-- 游戏标题栏 -->
    <div class="game-header bg-gray-800 p-4 flex justify-between items-center">
      <button 
        @click="leaveGame"
        class="back-btn bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
      >
        ← 离开游戏
      </button>
      
      <div class="game-info text-white flex gap-6">
        <span>房间: {{ roomId }}</span>
        <span>玩家: {{ playerCount }}/{{ maxPlayers }}</span>
      </div>
    </div>

    <!-- 游戏区域 -->
    <div class="game-container flex justify-center items-center min-h-[calc(100vh-80px)]">
      <div class="game-area relative">
        <canvas 
          ref="gameCanvas"
          :width="canvasWidth"
          :height="canvasHeight"
          class="border-2 border-gray-600 bg-gray-800"
          @keydown="handleKeyDown"
          tabindex="0"
        ></canvas>
        
        <!-- 准备阶段 -->
        <div v-if="gameSession.status === 'waiting'" class="prepare-overlay absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
          <div class="prepare-card bg-gray-800 p-8 rounded-lg text-center max-w-md">
            <h2 class="text-3xl font-bold text-white mb-6">等待玩家准备</h2>
            
            <!-- 玩家准备状态 -->
            <div class="players-ready-status mb-6">
              <div 
                v-for="player in roomPlayers" 
                :key="player.id"
                class="flex items-center justify-between p-3 mb-2 rounded-lg"
                :class="isPlayerReady(player.id) ? 'bg-green-700' : 'bg-gray-700'"
              >
                <div class="flex items-center gap-3">
                  <div 
                    class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                    :style="{ backgroundColor: getPlayerColor(roomPlayers.indexOf(player)) }"
                  >
                    {{ player.name.charAt(0).toUpperCase() }}
                  </div>
                  <span class="text-white font-medium">{{ player.name }}</span>
                  <span v-if="player.id === playerId" class="text-blue-300 text-sm">(你)</span>
                </div>
                <div class="ready-status">
                  <span 
                    v-if="isPlayerReady(player.id)" 
                    class="text-green-400 font-bold flex items-center gap-1"
                  >
                    ✓ 已准备
                  </span>
                  <span v-else class="text-gray-400">未准备</span>
                </div>
              </div>
            </div>
            
            <!-- 准备按钮 -->
            <div class="ready-controls mb-4">
              <button
                @click="toggleReady"
                class="ready-btn px-8 py-3 rounded-lg font-bold text-lg transition-all duration-200"
                :class="isCurrentPlayerReady ? 
                  'bg-red-600 hover:bg-red-500 text-white' : 
                  'bg-green-600 hover:bg-green-500 text-white'"
              >
                {{ isCurrentPlayerReady ? '取消准备' : '准备' }}
              </button>
            </div>
            
            <!-- 等待提示 -->
            <p class="text-gray-300 text-sm">
              需要最少 {{ minPlayers }} 名玩家，当前 {{ readyPlayersCount }}/{{ roomPlayers.length }} 人已准备
            </p>
            
            <!-- 房主强制开始按钮（仅房主可见） -->
            <div v-if="isHost && roomPlayers.length >= minPlayers" class="mt-4">
              <button
                @click="forceStart"
                class="force-start-btn bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-lg text-sm"
              >
                强制开始游戏
              </button>
            </div>
          </div>
        </div>
        
        <!-- 倒计时阶段 -->
        <div v-if="gameSession.status === 'countdown'" class="countdown-overlay absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
          <div class="countdown-card text-center">
            <div class="countdown-number text-8xl font-bold text-white mb-4 animate-pulse">
              {{ gameSession.countdownValue || '开始!' }}
            </div>
            <p class="text-2xl text-gray-300">游戏即将开始...</p>
          </div>
        </div>
        
        <!-- 等待其他玩家（旧版，保留作为备用） -->
        <div v-if="waitingForPlayers && gameSession.status === 'waiting'" class="waiting-overlay absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center" style="display: none;">
          <div class="waiting-card bg-gray-800 p-8 rounded-lg text-center">
            <h2 class="text-3xl font-bold text-white mb-4">等待其他玩家...</h2>
            <div class="loading-spinner mb-4">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            </div>
            <p class="text-gray-300">{{ playerCount }}/{{ maxPlayers }} 玩家已准备</p>
          </div>
        </div>

        <!-- 游戏结束界面 -->
        <div v-if="gameEnded" class="game-over-overlay absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
          <div class="game-over-card bg-gray-800 p-8 rounded-lg text-center">
            <h2 class="text-3xl font-bold text-white mb-4">游戏结束</h2>
            
            <!-- 排行榜 -->
            <div class="leaderboard mb-6">
              <h3 class="text-xl font-bold text-white mb-4">最终排名</h3>
              <div class="space-y-2">
                <div 
                  v-for="(player, index) in sortedPlayers" 
                  :key="player.id"
                  class="flex justify-between items-center p-3 rounded"
                  :class="player.id === playerId ? 'bg-blue-700' : 'bg-gray-700'"
                >
                  <div class="flex items-center gap-3">
                    <span class="text-lg font-bold">{{ index + 1 }}.</span>
                    <span class="text-white">{{ player.name }}</span>
                    <span v-if="player.id === playerId" class="text-blue-300">(你)</span>
                  </div>
                  <span class="text-yellow-400 font-bold">{{ player.score }}</span>
                </div>
              </div>
            </div>
            
            <div class="flex gap-4">
              <button 
                @click="playAgain"
                class="play-again-btn bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg transition-colors"
              >
                🔄 重新准备
              </button>
              <button 
                @click="leaveGame"
                class="back-btn bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg transition-colors"
              >
                🚪 返回大厅
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 玩家列表 -->
    <div class="players-list fixed right-4 top-20 bg-gray-800 p-4 rounded-lg">
      <h3 class="text-white font-bold mb-2">在线玩家</h3>
      <div class="space-y-2">
        <div 
          v-for="player in players" 
          :key="player.id"
          class="flex items-center gap-2 text-sm"
        >
          <div 
            class="w-3 h-3 rounded-full"
            :style="{ backgroundColor: player.color }"
          ></div>
          <span class="text-white">{{ player.name }}</span>
          <span v-if="player.id === playerId" class="text-blue-300">(你)</span>
          <span class="text-gray-400">{{ player.score }}</span>
        </div>
      </div>
    </div>

    <!-- 控制说明 -->
    <div class="controls-info fixed bottom-4 left-4 bg-gray-800 p-4 rounded-lg text-white">
      <h3 class="font-bold mb-2">控制说明:</h3>
      <p class="text-sm text-gray-300">
        ↑↓←→ 方向键控制移动<br>
        空格键暂停/继续
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useMultiplayerStore } from '../../stores/multiplayerStore.js'
import { socketService } from '../../services/socketService.js'

// 定义 emits
const emit = defineEmits(['back', 'gameEnded'])

// 使用多人游戏状态
const multiplayerStore = useMultiplayerStore()

// Canvas引用
const gameCanvas = ref(null)

// 动画和特效状态
const animationTime = ref(0)
const foodPulse = ref(0)
const canvasWidth = 800
const canvasHeight = 600
const gridSize = 20

// 游戏数据
const waitingForPlayers = ref(true)
const gameEnded = ref(false)
const isPaused = ref(false)

// 从 multiplayerStore 获取游戏会话状态
const gameSession = computed(() => multiplayerStore.gameSession)
const isHost = computed(() => multiplayerStore.isHost)
const roomPlayers = computed(() => multiplayerStore.currentRoom?.players || [])
const minPlayers = computed(() => multiplayerStore.currentRoom?.minPlayers || 2)
const readyPlayersCount = computed(() => gameSession.value.readyPlayers.length)
const isCurrentPlayerReady = computed(() => multiplayerStore.isPlayerReady)

// 玩家数据
const playerId = computed(() => multiplayerStore.localPlayer?.id || 'unknown')
const roomId = computed(() => multiplayerStore.currentRoom?.id || 'UNKNOWN')
const maxPlayers = computed(() => multiplayerStore.currentRoom?.maxPlayers || 4)
const playerCount = computed(() => multiplayerStore.currentRoom?.players?.length || 1)

// 初始化玩家数据
const players = ref([
  { 
    id: 'temp-player', 
    name: '玩家1', 
    color: '#10B981', 
    score: 0,
    snake: [{ x: 10, y: 10 }],
    direction: { x: 1, y: 0 },
    alive: true
  }
])

// 食物
const food = ref([
  { x: 15, y: 15, type: 'normal' },
  { x: 25, y: 25, type: 'bonus' }
])

// 计算属性
const sortedPlayers = computed(() => 
  [...players.value].sort((a, b) => b.score - a.score)
)

// 游戏循环
let gameLoop = null

// 初始化游戏
const initGame = () => {
  gameEnded.value = false
  isPaused.value = false
  
  console.log('🎮 初始化游戏，当前玩家ID:', playerId.value)
  console.log('🏠 房间玩家:', multiplayerStore.currentRoom?.players)
  
  // 从 multiplayerStore 获取房间数据
  if (multiplayerStore.currentRoom && multiplayerStore.currentRoom.players) {
    players.value = multiplayerStore.currentRoom.players.map((player, index) => {
      const playerData = {
        id: player.id,
        name: player.name,
        color: getPlayerColor(index),
        score: 0,
        snake: [{ x: 10 + index * 10, y: 10 + index * 5 }],
        direction: { x: 1, y: 0 },
        alive: true
      }
      console.log(`👤 初始化玩家 ${index}:`, playerData)
      return playerData
    })
  }
  
  // 确保当前玩家存在于玩家列表中
  const currentPlayer = players.value.find(p => p.id === playerId.value)
  if (!currentPlayer) {
    console.warn('⚠️ 当前玩家不在玩家列表中，添加默认玩家')
    players.value.push({
      id: playerId.value,
      name: multiplayerStore.localPlayer?.name || '未知玩家',
      color: getPlayerColor(players.value.length),
      score: 0,
      snake: [{ x: 15, y: 15 }],
      direction: { x: 1, y: 0 },
      alive: true
    })
  }
  
  // 初始化游戏会话
  if (!gameSession.value.id) {
    multiplayerStore.gameSession.id = multiplayerStore.generateSessionId()
    multiplayerStore.gameSession.mode = multiplayerStore.currentRoom?.gameMode || 'classic'
    multiplayerStore.gameSession.status = 'waiting'
  }
  
  // 不再自动开始游戏，等待玩家准备
  waitingForPlayers.value = false
}

// 获取玩家颜色
const getPlayerColor = (index) => {
  const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316']
  return colors[index % colors.length]
}

// 准备系统方法
const toggleReady = () => {
  multiplayerStore.togglePlayerReady()
  
  // 发送准备状态给服务器
  if (socketService.isConnected) {
    socketService.socket.emit('player_ready', {
      playerId: playerId.value,
      ready: multiplayerStore.isPlayerReady,
      roomId: roomId.value
    })
  }
}

const isPlayerReady = (playerIdToCheck) => {
  return gameSession.value.readyPlayers.includes(playerIdToCheck)
}

const forceStart = () => {
  if (isHost.value && roomPlayers.value.length >= minPlayers.value) {
    multiplayerStore.startCountdown()
    
    // 通知服务器强制开始游戏
    if (socketService.isConnected) {
      socketService.socket.emit('force_start_game', {
        roomId: roomId.value
      })
    }
  }
}

// 生成食物
const generateFood = () => {
  const maxX = Math.floor(canvasWidth / gridSize) - 1
  const maxY = Math.floor(canvasHeight / gridSize) - 1
  
  food.value = [
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

// 接收服务器游戏状态更新
const handleGameStateUpdate = (gameState) => {
  console.log('📥 接收服务器游戏状态更新:', gameState.tick)
  
  // 更新玩家状态
  players.value = gameState.players.map(serverPlayer => {
    const existingPlayer = players.value.find(p => p.id === serverPlayer.id)
    return {
      ...serverPlayer,
      color: existingPlayer?.color || serverPlayer.color
    }
  })
  
  // 更新食物
  food.value = gameState.food
  
  // 检查游戏是否结束
  const alivePlayers = gameState.players.filter(p => p.alive)
  if (alivePlayers.length <= 1 && gameSession.value.status === 'playing') {
    // 等待服务器的游戏结束通知
  }
}

// 渲染游戏
const renderGame = () => {
  const canvas = gameCanvas.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  
  // 更新动画时间
  animationTime.value += 0.1
  foodPulse.value += 0.15
  
  // 清空画布并添加背景渐变
  const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight)
  gradient.addColorStop(0, '#1F2937')
  gradient.addColorStop(0.5, '#111827')
  gradient.addColorStop(1, '#0F172A')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  
  // 绘制网格线（淡淡的）
  ctx.strokeStyle = 'rgba(75, 85, 99, 0.1)'
  ctx.lineWidth = 0.5
  for (let x = 0; x <= canvasWidth; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvasHeight)
    ctx.stroke()
  }
  for (let y = 0; y <= canvasHeight; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvasWidth, y)
    ctx.stroke()
  }
  
  // 绘制所有玩家的蛇
  players.value.forEach(player => {
    if (!player.alive) return
    drawMultiplayerSnake(ctx, player)
  })
  
  // 绘制美化的食物
  drawMultiplayerFood(ctx)
}

// 绘制多人游戏中的蛇
const drawMultiplayerSnake = (ctx, player) => {
  player.snake.forEach((segment, index) => {
    const x = segment.x * gridSize
    const y = segment.y * gridSize
    const size = gridSize - 2
    
    // 计算蛇的厚度（根据长度变化）
    const baseThickness = Math.min(size * 0.9, size * (0.6 + player.snake.length * 0.005))
    const segmentThickness = index === 0 ? baseThickness : baseThickness * (1 - index * 0.02)
    
    ctx.save()
    
    if (index === 0) {
      // 蛇头特效
      drawMultiplayerSnakeHead(ctx, x, y, size, segmentThickness, player)
    } else {
      // 蛇身特效
      drawMultiplayerSnakeBody(ctx, x, y, size, segmentThickness, index, player)
    }
    
    ctx.restore()
  })
}

// 绘制多人游戏蛇头
const drawMultiplayerSnakeHead = (ctx, x, y, size, thickness, player) => {
  const centerX = x + size / 2
  const centerY = y + size / 2
  const radius = thickness / 2
  
  // 头部阴影
  ctx.shadowColor = player.color + '80'
  ctx.shadowBlur = 15
  ctx.shadowOffsetX = 3
  ctx.shadowOffsetY = 3
  
  // 头部渐变（使用玩家颜色）
  const headGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
  const playerColor = player.color
  headGradient.addColorStop(0, lightenColor(playerColor, 20))
  headGradient.addColorStop(0.7, playerColor)
  headGradient.addColorStop(1, darkenColor(playerColor, 20))
  
  ctx.fillStyle = headGradient
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
  ctx.fill()
  
  // 头部高光
  ctx.shadowColor = 'transparent'
  const highlightGradient = ctx.createRadialGradient(
    centerX - radius * 0.3, centerY - radius * 0.3, 0,
    centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.6
  )
  highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)')
  highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  
  ctx.fillStyle = highlightGradient
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius * 0.8, 0, Math.PI * 2)
  ctx.fill()
  
  // 眼睛
  drawMultiplayerSnakeEyes(ctx, centerX, centerY, radius, player)
  
  // 动态光环效果
  const glowIntensity = 0.3 + Math.sin(animationTime.value) * 0.2
  ctx.shadowColor = `${playerColor}${Math.floor(glowIntensity * 255).toString(16)}`
  ctx.shadowBlur = 20
  ctx.strokeStyle = `${playerColor}${Math.floor(glowIntensity * 255).toString(16)}`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2)
  ctx.stroke()
}

// 绘制多人游戏蛇眼睛
const drawMultiplayerSnakeEyes = (ctx, centerX, centerY, radius, player) => {
  const eyeSize = radius * 0.15
  const eyeOffset = radius * 0.4
  
  // 根据移动方向调整眼睛位置
  let eyeX1, eyeY1, eyeX2, eyeY2
  
  if (player.direction.x !== 0) {
    eyeX1 = centerX + player.direction.x * radius * 0.2
    eyeY1 = centerY - eyeOffset
    eyeX2 = centerX + player.direction.x * radius * 0.2
    eyeY2 = centerY + eyeOffset
  } else {
    eyeX1 = centerX - eyeOffset
    eyeY1 = centerY + player.direction.y * radius * 0.2
    eyeX2 = centerX + eyeOffset
    eyeY2 = centerY + player.direction.y * radius * 0.2
  }
  
  // 眼白
  ctx.fillStyle = 'white'
  ctx.beginPath()
  ctx.arc(eyeX1, eyeY1, eyeSize, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(eyeX2, eyeY2, eyeSize, 0, Math.PI * 2)
  ctx.fill()
  
  // 瞳孔
  ctx.fillStyle = '#1F2937'
  ctx.beginPath()
  ctx.arc(eyeX1, eyeY1, eyeSize * 0.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(eyeX2, eyeY2, eyeSize * 0.6, 0, Math.PI * 2)
  ctx.fill()
}

// 绘制多人游戏蛇身
const drawMultiplayerSnakeBody = (ctx, x, y, size, thickness, index, player) => {
  const centerX = x + size / 2
  const centerY = y + size / 2
  const radius = thickness / 2
  
  // 身体阴影
  ctx.shadowColor = player.color + '40'
  ctx.shadowBlur = 8
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2
  
  // 身体渐变（随着距离头部越远颜色越深）
  const alpha = Math.max(0.6, 1 - index * 0.05)
  const bodyGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
  const playerColor = player.color
  bodyGradient.addColorStop(0, lightenColor(playerColor, 10) + Math.floor(alpha * 255).toString(16))
  bodyGradient.addColorStop(0.7, playerColor + Math.floor(alpha * 255).toString(16))
  bodyGradient.addColorStop(1, darkenColor(playerColor, 10) + Math.floor(alpha * 255).toString(16))
  
  ctx.fillStyle = bodyGradient
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
  ctx.fill()
  
  // 身体纹理
  ctx.shadowColor = 'transparent'
  const patternOffset = (animationTime.value + index) * 0.5
  const patternIntensity = 0.2 + Math.sin(patternOffset) * 0.1
  
  ctx.strokeStyle = darkenColor(playerColor, 30) + Math.floor(patternIntensity * 255).toString(16)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius * 0.7, 0, Math.PI * 2)
  ctx.stroke()
}

// 绘制多人游戏食物
const drawMultiplayerFood = (ctx) => {
  food.value.forEach(f => {
    const x = f.x * gridSize + gridSize / 2
    const y = f.y * gridSize + gridSize / 2
    const baseSize = gridSize * 0.4
    const pulseSize = baseSize + Math.sin(foodPulse.value) * 3
    
    // 食物颜色
    const foodColor = f.type === 'bonus' ? '#F59E0B' : '#EF4444'
    const glowColor = f.type === 'bonus' ? '#FCD34D' : '#FBBF24'
    
    // 食物光环
    const glowSize = pulseSize + 5
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize)
    glowGradient.addColorStop(0, foodColor + '99')
    glowGradient.addColorStop(0.7, foodColor + '4D')
    glowGradient.addColorStop(1, foodColor + '00')
    
    ctx.fillStyle = glowGradient
    ctx.beginPath()
    ctx.arc(x, y, glowSize, 0, Math.PI * 2)
    ctx.fill()
    
    // 食物主体
    ctx.shadowColor = foodColor + 'CC'
    ctx.shadowBlur = 10
    
    const foodGradient = ctx.createRadialGradient(x, y, 0, x, y, pulseSize)
    foodGradient.addColorStop(0, glowColor)
    foodGradient.addColorStop(0.6, foodColor)
    foodGradient.addColorStop(1, darkenColor(foodColor, 20))
    
    ctx.fillStyle = foodGradient
    ctx.beginPath()
    ctx.arc(x, y, pulseSize, 0, Math.PI * 2)
    ctx.fill()
    
    // 食物高光
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.beginPath()
    ctx.arc(x - pulseSize * 0.3, y - pulseSize * 0.3, pulseSize * 0.3, 0, Math.PI * 2)
    ctx.fill()
    
    // 特殊食物额外效果
    if (f.type === 'bonus') {
      const rays = 6
      ctx.strokeStyle = `rgba(252, 211, 77, ${0.4 + Math.sin(foodPulse.value) * 0.3})`
      ctx.lineWidth = 2
      
      for (let i = 0; i < rays; i++) {
        const angle = (i / rays) * Math.PI * 2 + foodPulse.value * 0.7
        const x1 = x + Math.cos(angle) * (pulseSize + 3)
        const y1 = y + Math.sin(angle) * (pulseSize + 3)
        const x2 = x + Math.cos(angle) * (pulseSize + 8)
        const y2 = y + Math.sin(angle) * (pulseSize + 8)
        
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
    }
  })
}

// 颜色工具函数
const lightenColor = (color, percent) => {
  const num = parseInt(color.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.min(255, (num >> 16) + amt)
  const G = Math.min(255, (num >> 8 & 0x00FF) + amt)
  const B = Math.min(255, (num & 0x0000FF) + amt)
  return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1)
}

const darkenColor = (color, percent) => {
  const num = parseInt(color.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max(0, (num >> 16) - amt)
  const G = Math.max(0, (num >> 8 & 0x00FF) - amt)
  const B = Math.max(0, (num & 0x0000FF) - amt)
  return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1)
}

// 渲染循环（仅负责渲染）
const renderStep = () => {
  renderGame()
}

// 开始渲染循环
const startRenderLoop = () => {
  if (gameLoop) clearInterval(gameLoop)
  gameLoop = setInterval(renderStep, 50) // 更高的渲染频率
  console.log('✅ 渲染循环已启动，间隔: 50ms')
}

// 停止渲染循环
const stopRenderLoop = () => {
  if (gameLoop) {
    clearInterval(gameLoop)
    gameLoop = null
  }
}

// 结束游戏（由服务器触发）
const endGame = () => {
  console.log('💯 游戏结束，显示游戏结束界面')
  gameEnded.value = true
  stopRenderLoop()
  
  // 设置游戏会话状态为结束
  multiplayerStore.gameSession.status = 'finished'
  
  // 不再发出 gameEnded 事件，避免直接返回大厅
  // emit('gameEnded') // 已移除
}

// 再玩一局
const playAgain = () => {
  console.log('🔄 再玩一局，重置准备状态')
  
  // 重置游戏状态
  gameEnded.value = false
  
  // 重置所有玩家的游戏数据（但不重新初始化游戏）
  players.value.forEach(player => {
    player.score = 0
    player.alive = true
    player.snake = [{ 
      x: Math.floor(Math.random() * 20) + 10, 
      y: Math.floor(Math.random() * 20) + 10 
    }]
    player.direction = { x: 1, y: 0 }
  })
  
  // 重新生成食物
  generateFood()
  
  // 重置准备系统，返回等待准备状态
  multiplayerStore.resetReady()
  multiplayerStore.gameSession.status = 'waiting'
  
  // 通知服务器重置游戏
  if (socketService.isConnected && multiplayerStore.currentRoom) {
    socketService.socket.emit('reset_game', {
      roomId: roomId.value
    })
  }
  
  console.log('🚀 游戏已重置，等待玩家准备')
}

// 离开游戏
const leaveGame = () => {
  stopGameLoop()
  
  // 离开房间
  if (socketService.isConnected && multiplayerStore.currentRoom) {
    socketService.leaveRoom()
  }
  
  // 清理状态
  multiplayerStore.currentRoom = null
  multiplayerStore.isInRoom = false
  multiplayerStore.isHost = false
  
  emit('back')
}

// 键盘事件监听器
let keyboardListener = null

// 键盘事件处理
const handleKeyDown = (event) => {
  console.log('🎮 键盘事件触发:', event.key, '游戏状态:', gameSession.value.status, '游戏结束:', gameEnded.value)
  
  // 检查游戏状态
  if (gameEnded.value) {
    console.log('🚫 游戏已结束，忽略键盘输入')
    return
  }
  if (gameSession.value.status !== 'playing') {
    console.log('⚠️ 游戏未开始，当前状态:', gameSession.value.status)
    return
  }
  
  const key = event.key
  let newDirection = null
  
  switch (key) {
    case 'ArrowUp':
      newDirection = { x: 0, y: -1 }
      break
    case 'ArrowDown':
      newDirection = { x: 0, y: 1 }
      break
    case 'ArrowLeft':
      newDirection = { x: -1, y: 0 }
      break
    case 'ArrowRight':
      newDirection = { x: 1, y: 0 }
      break
    case ' ':
      isPaused.value = !isPaused.value
      console.log('⏸️ 暂停状态切换:', isPaused.value)
      break
  }
  
  // 发送方向改变到服务器
  if (newDirection && socketService.isConnected) {
    console.log('📡 发送方向改变到服务器:', newDirection)
    socketService.socket.emit('player_action', {
      type: 'direction_change',
      direction: newDirection,
      timestamp: Date.now()
    })
  }
  
  event.preventDefault()
}

// 设置键盘监听
const setupKeyboardListeners = () => {
  // 移除之前的监听器
  if (keyboardListener) {
    document.removeEventListener('keydown', keyboardListener)
  }
  
  // 创建新的监听器
  keyboardListener = (event) => handleKeyDown(event)
  
  // 添加到document以确保全局监听
  document.addEventListener('keydown', keyboardListener)
  console.log('🎮 键盘监听器已设置')
}

// 移除键盘监听
const removeKeyboardListeners = () => {
  if (keyboardListener) {
    document.removeEventListener('keydown', keyboardListener)
    keyboardListener = null
    console.log('🎮 键盘监听器已移除')
  }
}

// 组件挂载时初始化
onMounted(async () => {
  await nextTick()
  
  // 检查Socket连接状态
  if (!socketService.isConnected) {
    console.warn('⚠️ Socket未连接，尝试重新连接...')
    try {
      await socketService.connect()
    } catch (error) {
      console.error('连接失败:', error)
      // 如果连接失败，返回大厅
      emit('back')
      return
    }
  }
  
  // 检查房间状态
  if (!multiplayerStore.currentRoom) {
    console.warn('⚠️ 未找到房间信息，返回大厅')
    emit('back')
    return
  }
  
  console.log('🎮 初始化多人游戏，房间ID:', multiplayerStore.currentRoom.id)
  
  generateFood()
  initGame()
  
  // 设置键盘监听器
  setupKeyboardListeners()
  
  // 设置Socket事件监听
  setupSocketListeners()
  
  // 聚焦画布以接收键盘事件（备用方案）
  if (gameCanvas.value) {
    gameCanvas.value.focus()
    console.log('📺 Canvas已获得焦点')
  }
})

// 设置Socket事件监听
const setupSocketListeners = () => {
  if (!socketService.socket) return
  
  // 监听服务器游戏状态更新
  socketService.socket.on('game_state_update', handleGameStateUpdate)
  
  // 监听游戏结束事件
  socketService.socket.on('game_ended', (result) => {
    console.log('🏁 收到游戏结束通知:', result)
    gameEnded.value = true
    stopRenderLoop()
    
    // 更新最终排名
    players.value = result.players
  })
  
  console.log('📡 Socket事件监听器已设置')
}

// 移除Socket事件监听
const removeSocketListeners = () => {
  if (!socketService.socket) return
  
  socketService.socket.off('game_state_update', handleGameStateUpdate)
  socketService.socket.off('game_ended')
  
  console.log('📡 Socket事件监听器已移除')
}

// 组件卸载时清理
onUnmounted(() => {
  stopRenderLoop()
  removeKeyboardListeners()
  removeSocketListeners()
  // 重置准备状态
  multiplayerStore.resetReady()
})

// 监听游戏会话状态变化
watch(
  () => gameSession.value.status,
  (newStatus, oldStatus) => {
    console.log(`游戏状态变化: ${oldStatus} -> ${newStatus}`)
    
    if (newStatus === 'playing' && oldStatus !== 'playing') {
      // 开始游戏
      console.log('🎮 游戏开始!')
      waitingForPlayers.value = false // 确保不再等待玩家
      gameEnded.value = false // 确保游戏未结束标志
      isPaused.value = false // 确保游戏未暂停
      startRenderLoop() // 启动渲染循环
    } else if (newStatus === 'countdown') {
      // 倒计时阶段
      console.log('⏰ 游戏倒计时中')
      waitingForPlayers.value = false
      stopRenderLoop() // 倒计时期间停止渲染循环
    } else if (newStatus === 'waiting') {
      // 停止游戏
      console.log('⏳ 等待玩家准备')
      waitingForPlayers.value = true // 重新等待玩家
      stopRenderLoop()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.multiplayer-game {
  user-select: none;
}

.game-area canvas:focus {
  outline: none;
}

.prepare-overlay,
.countdown-overlay,
.waiting-overlay,
.game-over-overlay {
  backdrop-filter: blur(4px);
}

.players-list,
.controls-info {
  background: rgba(31, 41, 55, 0.9);
  backdrop-filter: blur(8px);
}

.ready-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.countdown-number {
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.8);
  animation: countdown-pulse 1s ease-in-out infinite;
}

@keyframes countdown-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.prepare-card {
  animation: slideInUp 0.5s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.loading-spinner {
  display: flex;
  justify-content: center;
}
</style>
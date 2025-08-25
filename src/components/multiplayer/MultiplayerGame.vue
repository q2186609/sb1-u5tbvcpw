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
        
        <!-- 等待其他玩家 -->
        <div v-if="waitingForPlayers" class="waiting-overlay absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
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
                再玩一局
              </button>
              <button 
                @click="leaveGame"
                class="back-btn bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg transition-colors"
              >
                返回大厅
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useMultiplayerStore } from '../../stores/multiplayerStore.js'

// 定义 emits
const emit = defineEmits(['back', 'gameEnded'])

// 使用多人游戏状态
const multiplayerStore = useMultiplayerStore()

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

// 玩家数据
const playerId = ref('player-' + Math.random().toString(36).substr(2, 9))
const roomId = ref('DEMO-ROOM')
const maxPlayers = ref(4)

// 模拟玩家数据
const players = ref([
  { 
    id: playerId.value, 
    name: '玩家1', 
    color: '#10B981', 
    score: 0,
    snake: [{ x: 10, y: 10 }],
    direction: { x: 1, y: 0 },
    alive: true
  },
  { 
    id: 'player-2', 
    name: '玩家2', 
    color: '#3B82F6', 
    score: 0,
    snake: [{ x: 20, y: 20 }],
    direction: { x: -1, y: 0 },
    alive: true
  }
])

// 食物
const food = ref([
  { x: 15, y: 15, type: 'normal' },
  { x: 25, y: 25, type: 'bonus' }
])

// 计算属性
const playerCount = computed(() => players.value.length)
const sortedPlayers = computed(() => 
  [...players.value].sort((a, b) => b.score - a.score)
)

// 游戏循环
let gameLoop = null

// 初始化游戏
const initGame = () => {
  gameEnded.value = false
  isPaused.value = false
  
  // 模拟等待玩家过程
  setTimeout(() => {
    waitingForPlayers.value = false
    startGameLoop()
  }, 2000)
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

// 更新游戏状态
const updateGame = () => {
  if (gameEnded.value || isPaused.value || waitingForPlayers.value) return

  players.value.forEach(player => {
    if (!player.alive) return

    // 移动蛇头
    const head = { ...player.snake[0] }
    head.x += player.direction.x
    head.y += player.direction.y

    // 检查边界碰撞
    if (head.x < 0 || head.x >= canvasWidth / gridSize || 
        head.y < 0 || head.y >= canvasHeight / gridSize) {
      player.alive = false
      return
    }

    // 检查与其他蛇的碰撞
    const allSnakeSegments = players.value.flatMap(p => p.snake)
    if (allSnakeSegments.some(segment => segment.x === head.x && segment.y === head.y)) {
      player.alive = false
      return
    }

    player.snake.unshift(head)

    // 检查是否吃到食物
    const eatenFood = food.value.find(f => f.x === head.x && f.y === head.y)
    if (eatenFood) {
      player.score += eatenFood.type === 'bonus' ? 20 : 10
      // 移除被吃的食物
      food.value = food.value.filter(f => f !== eatenFood)
      // 生成新食物
      generateFood()
    } else {
      player.snake.pop()
    }
  })

  // 检查游戏是否结束
  const alivePlayers = players.value.filter(p => p.alive)
  if (alivePlayers.length <= 1) {
    endGame()
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

// 游戏主循环
const gameStep = () => {
  updateGame()
  renderGame()
}

// 开始游戏循环
const startGameLoop = () => {
  if (gameLoop) clearInterval(gameLoop)
  gameLoop = setInterval(gameStep, 150)
}

// 停止游戏循环
const stopGameLoop = () => {
  if (gameLoop) {
    clearInterval(gameLoop)
    gameLoop = null
  }
}

// 结束游戏
const endGame = () => {
  gameEnded.value = true
  stopGameLoop()
  emit('gameEnded')
}

// 再玩一局
const playAgain = () => {
  // 重置玩家状态
  players.value.forEach(player => {
    player.score = 0
    player.alive = true
    player.snake = [{ 
      x: Math.floor(Math.random() * 20) + 10, 
      y: Math.floor(Math.random() * 20) + 10 
    }]
  })
  
  generateFood()
  initGame()
}

// 离开游戏
const leaveGame = () => {
  stopGameLoop()
  emit('back')
}

// 键盘事件处理
const handleKeyDown = (event) => {
  const key = event.key
  const currentPlayer = players.value.find(p => p.id === playerId.value)
  
  if (!currentPlayer || !currentPlayer.alive) return
  
  switch (key) {
    case 'ArrowUp':
      if (currentPlayer.direction.y !== 1) {
        currentPlayer.direction = { x: 0, y: -1 }
      }
      break
    case 'ArrowDown':
      if (currentPlayer.direction.y !== -1) {
        currentPlayer.direction = { x: 0, y: 1 }
      }
      break
    case 'ArrowLeft':
      if (currentPlayer.direction.x !== 1) {
        currentPlayer.direction = { x: -1, y: 0 }
      }
      break
    case 'ArrowRight':
      if (currentPlayer.direction.x !== -1) {
        currentPlayer.direction = { x: 1, y: 0 }
      }
      break
    case ' ':
      isPaused.value = !isPaused.value
      break
  }
  
  event.preventDefault()
}

// 组件挂载时初始化
onMounted(async () => {
  await nextTick()
  generateFood()
  initGame()
  
  // 聚焦画布以接收键盘事件
  if (gameCanvas.value) {
    gameCanvas.value.focus()
  }
})

// 组件卸载时清理
onUnmounted(() => {
  stopGameLoop()
})
</script>

<style scoped>
.multiplayer-game {
  user-select: none;
}

.game-area canvas:focus {
  outline: none;
}

.waiting-overlay,
.game-over-overlay {
  backdrop-filter: blur(4px);
}

.players-list,
.controls-info {
  background: rgba(31, 41, 55, 0.9);
  backdrop-filter: blur(8px);
}

.loading-spinner {
  display: flex;
  justify-content: center;
}
</style>
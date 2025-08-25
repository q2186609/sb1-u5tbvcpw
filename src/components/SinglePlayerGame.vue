<template>
  <div class="single-player-game min-h-screen bg-gray-900 relative">
    <!-- 游戏标题栏 -->
    <div class="game-header bg-gray-800 p-4 flex justify-between items-center">
      <button 
        @click="$emit('back')"
        class="back-btn bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
      >
        ← 返回主菜单
      </button>
      
      <div class="game-info text-white">
        <span class="mr-6">得分: {{ score }}</span>
        <span>长度: {{ snakeLength }}</span>
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
        
        <!-- 游戏结束界面 -->
        <div v-if="gameOver" class="game-over-overlay absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
          <div class="game-over-card bg-gray-800 p-8 rounded-lg text-center">
            <h2 class="text-3xl font-bold text-white mb-4">游戏结束</h2>
            <p class="text-xl text-gray-300 mb-2">最终得分: {{ score }}</p>
            <p class="text-lg text-gray-400 mb-6">蛇的长度: {{ snakeLength }}</p>
            <div class="flex gap-4">
              <button 
                @click="restartGame"
                class="restart-btn bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg transition-colors"
              >
                重新开始
              </button>
              <button 
                @click="$emit('back')"
                class="back-btn bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg transition-colors"
              >
                返回主菜单
              </button>
            </div>
          </div>
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
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

// 定义 emits
const emit = defineEmits(['back'])

// 游戏状态
const gameCanvas = ref(null)
const canvasWidth = 800
const canvasHeight = 600
const gridSize = 20

// 游戏数据
const score = ref(0)
const snakeLength = ref(1)
const gameOver = ref(false)
const isPaused = ref(false)

// 蛇的状态
const snake = ref([{ x: 10, y: 10 }])
const direction = ref({ x: 1, y: 0 })
const food = ref({ x: 15, y: 15 })

// 动画和特效状态
const animationTime = ref(0)
const snakeTrail = ref([])
const foodPulse = ref(0)
const lastDirection = ref({ x: 1, y: 0 })

// 游戏循环
let gameLoop = null
let animationFrame = null

// 初始化游戏
const initGame = () => {
  snake.value = [{ x: 10, y: 10 }]
  direction.value = { x: 1, y: 0 }
  lastDirection.value = { x: 1, y: 0 }
  score.value = 0
  snakeLength.value = 1
  gameOver.value = false
  isPaused.value = false
  
  // 重置动画状态
  animationTime.value = 0
  foodPulse.value = 0
  snakeTrail.value = []
  
  generateFood()
}

// 生成食物
const generateFood = () => {
  const maxX = Math.floor(canvasWidth / gridSize) - 1
  const maxY = Math.floor(canvasHeight / gridSize) - 1
  
  do {
    food.value = {
      x: Math.floor(Math.random() * maxX),
      y: Math.floor(Math.random() * maxY)
    }
  } while (snake.value.some(segment => segment.x === food.value.x && segment.y === food.value.y))
}

// 更新游戏状态
const updateGame = () => {
  if (gameOver.value || isPaused.value) return

  // 更新轨迹
  if (snake.value.length > 0) {
    snakeTrail.value.unshift({ ...snake.value[snake.value.length - 1] })
    if (snakeTrail.value.length > 10) {
      snakeTrail.value.pop()
    }
  }

  // 记录上一个方向
  lastDirection.value = { ...direction.value }

  // 移动蛇头
  const head = { ...snake.value[0] }
  head.x += direction.value.x
  head.y += direction.value.y

  // 检查边界碰撞
  if (head.x < 0 || head.x >= canvasWidth / gridSize || 
      head.y < 0 || head.y >= canvasHeight / gridSize) {
    gameOver.value = true
    return
  }

  // 检查自身碰撞
  if (snake.value.some(segment => segment.x === head.x && segment.y === head.y)) {
    gameOver.value = true
    return
  }

  snake.value.unshift(head)

  // 检查是否吃到食物
  if (head.x === food.value.x && head.y === food.value.y) {
    score.value += 10
    snakeLength.value = snake.value.length
    generateFood()
    
    // 食物被吃掉的特效
    createFoodEffect()
  } else {
    snake.value.pop()
  }
}

// 创建食物被吃掉的特效
const createFoodEffect = () => {
  // 这里可以添加粒子效果或其他特效
  console.log('食物被吃掉了！创建特效')
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
  
  // 绘制蛇的轨迹（淡化效果）
  drawSnakeTrail(ctx)
  
  // 绘制美化的蛇
  drawEnhancedSnake(ctx)
  
  // 绘制美化的食物
  drawEnhancedFood(ctx)
}

// 绘制增强版蛇
const drawEnhancedSnake = (ctx) => {
  if (snake.value.length === 0) return
  
  snake.value.forEach((segment, index) => {
    const x = segment.x * gridSize
    const y = segment.y * gridSize
    const size = gridSize - 2
    
    // 计算蛇的厚度和颜色（根据长度变化）
    const baseThickness = Math.min(size * 0.9, size * (0.6 + snake.value.length * 0.005))
    const segmentThickness = index === 0 ? baseThickness : baseThickness * (1 - index * 0.02)
    
    // 保存上下文
    ctx.save()
    
    if (index === 0) {
      // 蛇头特效
      drawSnakeHead(ctx, x, y, size, segmentThickness)
    } else {
      // 蛇身特效
      drawSnakeBody(ctx, x, y, size, segmentThickness, index)
    }
    
    ctx.restore()
  })
}

// 绘制蛇头
const drawSnakeHead = (ctx, x, y, size, thickness) => {
  const centerX = x + size / 2
  const centerY = y + size / 2
  const radius = thickness / 2
  
  // 头部阴影
  ctx.shadowColor = 'rgba(5, 150, 105, 0.8)'
  ctx.shadowBlur = 15
  ctx.shadowOffsetX = 3
  ctx.shadowOffsetY = 3
  
  // 头部渐变
  const headGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
  headGradient.addColorStop(0, '#34D399')
  headGradient.addColorStop(0.7, '#10B981')
  headGradient.addColorStop(1, '#059669')
  
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
  drawSnakeEyes(ctx, centerX, centerY, radius)
  
  // 动态光环效果
  const glowIntensity = 0.3 + Math.sin(animationTime.value) * 0.2
  ctx.shadowColor = `rgba(34, 211, 153, ${glowIntensity})`
  ctx.shadowBlur = 20
  ctx.strokeStyle = `rgba(34, 211, 153, ${glowIntensity})`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2)
  ctx.stroke()
}

// 绘制蛇眼睛
const drawSnakeEyes = (ctx, centerX, centerY, radius) => {
  const eyeSize = radius * 0.15
  const eyeOffset = radius * 0.4
  
  // 根据移动方向调整眼睛位置
  let eyeX1, eyeY1, eyeX2, eyeY2
  
  if (direction.value.x !== 0) {
    // 水平移动
    eyeX1 = centerX + direction.value.x * radius * 0.2
    eyeY1 = centerY - eyeOffset
    eyeX2 = centerX + direction.value.x * radius * 0.2
    eyeY2 = centerY + eyeOffset
  } else {
    // 垂直移动
    eyeX1 = centerX - eyeOffset
    eyeY1 = centerY + direction.value.y * radius * 0.2
    eyeX2 = centerX + eyeOffset
    eyeY2 = centerY + direction.value.y * radius * 0.2
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

// 绘制蛇身
const drawSnakeBody = (ctx, x, y, size, thickness, index) => {
  const centerX = x + size / 2
  const centerY = y + size / 2
  const radius = thickness / 2
  
  // 身体阴影
  ctx.shadowColor = 'rgba(16, 185, 129, 0.4)'
  ctx.shadowBlur = 8
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2
  
  // 身体渐变（随着距离头部越远颜色越深）
  const alpha = Math.max(0.6, 1 - index * 0.05)
  const bodyGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
  bodyGradient.addColorStop(0, `rgba(52, 211, 153, ${alpha})`)
  bodyGradient.addColorStop(0.7, `rgba(16, 185, 129, ${alpha})`)
  bodyGradient.addColorStop(1, `rgba(5, 150, 105, ${alpha})`)
  
  ctx.fillStyle = bodyGradient
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
  ctx.fill()
  
  // 身体纹理
  ctx.shadowColor = 'transparent'
  const patternOffset = (animationTime.value + index) * 0.5
  const patternIntensity = 0.2 + Math.sin(patternOffset) * 0.1
  
  ctx.strokeStyle = `rgba(5, 150, 105, ${patternIntensity})`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius * 0.7, 0, Math.PI * 2)
  ctx.stroke()
}

// 绘制轨迹效果
const drawSnakeTrail = (ctx) => {
  snakeTrail.value.forEach((trail, index) => {
    const alpha = (snakeTrail.value.length - index) / snakeTrail.value.length * 0.3
    const size = gridSize * 0.5 * alpha
    
    ctx.fillStyle = `rgba(34, 211, 153, ${alpha})`
    ctx.beginPath()
    ctx.arc(
      trail.x * gridSize + gridSize / 2,
      trail.y * gridSize + gridSize / 2,
      size,
      0,
      Math.PI * 2
    )
    ctx.fill()
  })
}

// 绘制增强版食物
const drawEnhancedFood = (ctx) => {
  const x = food.value.x * gridSize + gridSize / 2
  const y = food.value.y * gridSize + gridSize / 2
  const baseSize = gridSize * 0.4
  const pulseSize = baseSize + Math.sin(foodPulse.value) * 3
  
  // 食物光环
  const glowSize = pulseSize + 5
  const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize)
  glowGradient.addColorStop(0, 'rgba(239, 68, 68, 0.6)')
  glowGradient.addColorStop(0.7, 'rgba(239, 68, 68, 0.3)')
  glowGradient.addColorStop(1, 'rgba(239, 68, 68, 0)')
  
  ctx.fillStyle = glowGradient
  ctx.beginPath()
  ctx.arc(x, y, glowSize, 0, Math.PI * 2)
  ctx.fill()
  
  // 食物主体
  ctx.shadowColor = 'rgba(239, 68, 68, 0.8)'
  ctx.shadowBlur = 10
  
  const foodGradient = ctx.createRadialGradient(x, y, 0, x, y, pulseSize)
  foodGradient.addColorStop(0, '#FBBF24')
  foodGradient.addColorStop(0.6, '#F59E0B')
  foodGradient.addColorStop(0.8, '#EF4444')
  foodGradient.addColorStop(1, '#DC2626')
  
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
  
  // 旋转的光芒效果
  const rays = 8
  ctx.strokeStyle = `rgba(251, 191, 36, ${0.3 + Math.sin(foodPulse.value) * 0.2})`
  ctx.lineWidth = 2
  
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2 + foodPulse.value * 0.5
    const x1 = x + Math.cos(angle) * (pulseSize + 5)
    const y1 = y + Math.sin(angle) * (pulseSize + 5)
    const x2 = x + Math.cos(angle) * (pulseSize + 12)
    const y2 = y + Math.sin(angle) * (pulseSize + 12)
    
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }
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

// 重新开始游戏
const restartGame = () => {
  initGame()
  startGameLoop()
}

// 键盘事件处理
const handleKeyDown = (event) => {
  const key = event.key
  
  switch (key) {
    case 'ArrowUp':
      if (direction.value.y !== 1) {
        direction.value = { x: 0, y: -1 }
      }
      break
    case 'ArrowDown':
      if (direction.value.y !== -1) {
        direction.value = { x: 0, y: 1 }
      }
      break
    case 'ArrowLeft':
      if (direction.value.x !== 1) {
        direction.value = { x: -1, y: 0 }
      }
      break
    case 'ArrowRight':
      if (direction.value.x !== -1) {
        direction.value = { x: 1, y: 0 }
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
  initGame()
  startGameLoop()
  
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
.single-player-game {
  user-select: none;
}

.game-area canvas:focus {
  outline: none;
}

.game-over-overlay {
  backdrop-filter: blur(4px);
}

.controls-info {
  background: rgba(31, 41, 55, 0.9);
  backdrop-filter: blur(8px);
}
</style>
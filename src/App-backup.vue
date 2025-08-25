<template>
  <div class="min-h-screen bg-gray-900">
    <!-- 主菜单界面 -->
    <div v-if="currentView === 'menu'" class="main-menu">
      <div class="flex items-center justify-center min-h-screen">
        <div class="text-center max-w-4xl mx-auto px-6">
          <!-- 游戏标题 -->
          <div class="mb-12">
            <h1 class="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              蛇战天下
            </h1>
            <p class="text-xl text-gray-300">多人在线联机关卡挑战</p>
          </div>
          
          <!-- 游戏模式选择 -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <!-- 单人模式 -->
            <div 
              @click="startSinglePlayer"
              class="game-mode-card bg-gradient-to-br from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 cursor-pointer transform hover:scale-105 transition-all duration-200"
            >
              <div class="p-6 text-center">
                <div class="text-4xl mb-4">🐍</div>
                <h3 class="text-xl font-bold text-white mb-2">单人模式</h3>
                <p class="text-green-100 text-sm">经典贪吃蛇游戏</p>
              </div>
            </div>
            
            <!-- 关卡挑战 -->
            <div 
              @click="showLevelSelection"
              class="game-mode-card bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 cursor-pointer transform hover:scale-105 transition-all duration-200"
            >
              <div class="p-6 text-center">
                <div class="text-4xl mb-4">🏆</div>
                <h3 class="text-xl font-bold text-white mb-2">关卡挑战</h3>
                <p class="text-blue-100 text-sm">94个精心设计的关卡</p>
              </div>
            </div>
            
            <!-- 多人对战 -->
            <div 
              @click="showMultiplayerLobby"
              class="game-mode-card bg-gradient-to-br from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 cursor-pointer transform hover:scale-105 transition-all duration-200"
            >
              <div class="p-6 text-center">
                <div class="text-4xl mb-4">⚔️</div>
                <h3 class="text-xl font-bold text-white mb-2">多人对战</h3>
                <p class="text-purple-100 text-sm">实时联机对战</p>
              </div>
            </div>
            
            <!-- 设置选项 -->
            <div 
              @click="showSettings"
              class="game-mode-card bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 cursor-pointer transform hover:scale-105 transition-all duration-200"
            >
              <div class="p-6 text-center">
                <div class="text-4xl mb-4">⚙️</div>
                <h3 class="text-xl font-bold text-white mb-2">游戏设置</h3>
                <p class="text-gray-100 text-sm">个性化配置</p>
              </div>
            </div>
          </div>
          
          <!-- 玩家统计 -->
          <div class="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 class="text-white text-lg font-bold mb-4">个人统计</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div class="text-2xl font-bold text-blue-400">{{ gameStats.gamesPlayed }}</div>
                <div class="text-gray-400 text-sm">游戏次数</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-green-400">{{ gameStats.highScore }}</div>
                <div class="text-gray-400 text-sm">最高分数</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-purple-400">{{ totalLevelsCompleted }}</div>
                <div class="text-gray-400 text-sm">完成关卡</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-yellow-400">{{ totalStarsEarned }}</div>
                <div class="text-gray-400 text-sm">获得星星</div>
              </div>
            </div>
          </div>
          
          <!-- 版本信息 -->
          <div class="text-gray-500 text-sm">
            版本 2.0.0 - 多人联机关卡挑战版
          </div>
        </div>
      </div>
    </div>
    
    <!-- 单人游戏界面 -->
    <SinglePlayerGame 
      v-else-if="currentView === 'singlePlayer'"
      @back="currentView = 'menu'"
    />
    
    <!-- 关卡选择界面 -->
    <LevelSelection 
      v-else-if="currentView === 'levels'"
      @back="currentView = 'menu'"
      @startLevel="startLevelGame"
      @startDailyChallenge="startDailyChallenge"
    />
    
    <!-- 关卡游戏界面 -->
    <LevelGame 
      v-else-if="currentView === 'levelGame'"
      :levelId="selectedLevel"
      @levelChange="startLevelGame"
      @backToSelection="currentView = 'levels'"
    />
    
    <!-- 多人游戏大厅 -->
    <MultiplayerLobby 
      v-else-if="currentView === 'multiplayerLobby'"
      @back="currentView = 'menu'"
      @joinedRoom="currentView = 'multiplayerGame'"
      @createdRoom="currentView = 'multiplayerGame'"
    />
    
    <!-- 多人游戏界面 -->
    <MultiplayerGame 
      v-else-if="currentView === 'multiplayerGame'"
      @back="currentView = 'multiplayerLobby'"
      @gameEnded="handleMultiplayerGameEnd"
    />
    
    <!-- 设置界面 -->
    <GameSettings 
      v-else-if="currentView === 'settings'"
      @back="currentView = 'menu'"
    />
    
    <!-- 全局通知 -->
    <div v-if="notification" class="fixed top-4 right-4 z-50">
      <div 
        class="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300"
        :class="notification.type === 'success' ? 'bg-green-600' : notification.type === 'error' ? 'bg-red-600' : 'bg-blue-600'"
      >
        {{ notification.message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
// import { useGameStore } from './stores/gameStore.js'
// import { useLevelStore } from './stores/levelStore.js'
// import { useMultiplayerStore } from './stores/multiplayerStore.js'

// 导入组件
import SinglePlayerGame from './components/SinglePlayerGame.vue'
import LevelSelection from './components/levels/LevelSelection.vue'
import LevelGame from './components/levels/LevelGame.vue'
import MultiplayerLobby from './components/multiplayer/MultiplayerLobby.vue'
import MultiplayerGame from './components/multiplayer/MultiplayerGame.vue'
import GameSettings from './components/GameSettings.vue'

// 状态管理
// const gameStore = useGameStore()
// const levelStore = useLevelStore()
// const multiplayerStore = useMultiplayerStore()

// 响应式数据
const currentView = ref('menu')
const selectedLevel = ref(1)
const notification = ref(null)

// 计算属性 - 临时使用模拟数据
const gameStats = computed(() => ({ gamesPlayed: 0, highScore: 0 }))
const totalLevelsCompleted = computed(() => 0)
const totalStarsEarned = computed(() => 0)

// 方法
const startSinglePlayer = () => {
  // gameStore.setGameMode('single')
  currentView.value = 'singlePlayer'
}

const showLevelSelection = () => {
  currentView.value = 'levels'
}

const showMultiplayerLobby = () => {
  currentView.value = 'multiplayerLobby'
}

const showSettings = () => {
  currentView.value = 'settings'
}

const startLevelGame = (levelId) => {
  selectedLevel.value = levelId
  currentView.value = 'levelGame'
}

const startDailyChallenge = (challenge) => {
  // 处理每日挑战
  // gameStore.setGameMode('daily_challenge')
  showNotification(`开始每日挑战: ${challenge.name}`, 'success')
  currentView.value = 'singlePlayer'
}

const handleMultiplayerGameEnd = () => {
  currentView.value = 'multiplayerLobby'
  showNotification('游戏结束', 'info')
}

const showNotification = (message, type = 'info') => {
  notification.value = { message, type }
  setTimeout(() => {
    notification.value = null
  }, 3000)
}

// 生命周期
onMounted(() => {
  // 初始化数据
  // gameStore.init()
  // levelStore.loadProgress()
  
  // 检查是否有保存的游戏状态
  const savedView = localStorage.getItem('lastView')
  if (savedView && ['menu', 'levels', 'multiplayerLobby'].includes(savedView)) {
    currentView.value = savedView
  }
})

// 监听视图变化，保存状态
watch(currentView, (newView) => {
  localStorage.setItem('lastView', newView)
})
</script>

<style scoped>
.main-menu {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  min-height: 100vh;
}

.game-mode-card {
  border-radius: 1rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  border: 2px solid transparent;
  background-clip: padding-box;
}

.game-mode-card:hover {
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.2);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.game-mode-card {
  animation: fadeIn 0.6s ease-out;
}

.game-mode-card:nth-child(1) { animation-delay: 0.1s; }
.game-mode-card:nth-child(2) { animation-delay: 0.2s; }
.game-mode-card:nth-child(3) { animation-delay: 0.3s; }
.game-mode-card:nth-child(4) { animation-delay: 0.4s; }
</style>
const generateSpecialFood = () => {
  // 20%概率生成特殊食物
  if (Math.random() < 0.2) {
    let newSpecialFood
    do {
      newSpecialFood = Math.floor(Math.random() * cells.value.length)
    } while (
      snake.value.includes(newSpecialFood) ||
      obstacles.value.includes(newSpecialFood) ||
      food.value === newSpecialFood ||
      (aiSnake.value && aiSnake.value.includes(newSpecialFood))
    )
    
    specialFood.value = newSpecialFood
    
    // 随机选择特殊食物类型
    const types = ['double', 'speed', 'ghost']
    specialFoodType.value = types[Math.floor(Math.random() * types.length)]
    
    // 10秒后移除特殊食物
    setTimeout(() => {
      specialFood.value = -1
      specialFoodType.value = ''
    }, 10000)
  }
}

// 添加特殊食物效果处理函数
const activateSpecialFood = (type) => {
  specialFoodActive.value = true
  
  switch(type) {
    case 'double':
      specialFoodEffect.value = '双倍分数'
      break
    case 'speed':
      specialFoodEffect.value = '加速'
      // 临时提高蛇的速度
      clearInterval(gameInterval)
      gameInterval = setInterval(() => {
        move()
        moveAiSnake()
      }, gameSpeed.value / 2)
      break
    case 'ghost':
      specialFoodEffect.value = '穿墙'
      break
  }
  
  // 清除之前的计时器
  if (specialFoodTimer.value) {
    clearTimeout(specialFoodTimer.value)
  }
  
  // 设置效果持续时间（5秒）
  specialFoodTimer.value = setTimeout(() => {
    specialFoodActive.value = false
    specialFoodEffect.value = ''
    
    // 如果是速度效果，恢复正常速度
    if (type === 'speed') {
      clearInterval(gameInterval)
      gameInterval = setInterval(() => {
        move()
        moveAiSnake()
      }, gameSpeed.value)
    }
  }, 5000)
}

// 检查是否是特殊食物
const isSpecialFood = (index) => specialFood.value === index

const createObstacles = () => {
  obstacles.value = [];
  const obstacleCount = Math.floor(Math.random() * 10) + 5;
  const snakeHeadPos = snake.value[0];
  const safePositions = [snakeHeadPos];
  const directions = [
    -gridSize-1, -gridSize, -gridSize+1,
    -1, 1,
    gridSize-1, gridSize, gridSize+1
  ];
  for (const offset of directions) {
    const pos = snakeHeadPos + offset;
    if (pos >= 0 && pos < cells.value.length) {
      const snakeHeadRow = Math.floor(snakeHeadPos / gridSize);
      const posRow = Math.floor(pos / gridSize);
      if (Math.abs(snakeHeadRow - posRow) <= 1) {
        safePositions.push(pos);
      }
    }
  }
  // 添加蛇头前进方向上的额外安全区
  let frontPos = snakeHeadPos;
  for (let i = 0; i < 3; i++) {
    switch (direction.value) {
      case 'up':
        frontPos = frontPos - gridSize;
        if (frontPos < 0) frontPos += cells.value.length;
        break;
      case 'down':
        frontPos = frontPos + gridSize;
        if (frontPos >= cells.value.length) frontPos -= cells.value.length;
        break;
      case 'left':
        frontPos = frontPos % gridSize === 0 ? frontPos + gridSize - 1 : frontPos - 1;
        break;
      case 'right':
        frontPos = frontPos % gridSize === gridSize - 1 ? frontPos - gridSize + 1 : frontPos + 1;
        break;
    }
    safePositions.push(frontPos);
  }
  // AI蛇安全区同理...
  if (aiSnake.value.length > 0) {
    const aiHeadPos = aiSnake.value[0]
    safePositions.push(aiHeadPos)
    
    for (const offset of directions) {
      const pos = aiHeadPos + offset
      if (pos >= 0 && pos < cells.value.length) {
        const aiHeadRow = Math.floor(aiHeadPos / gridSize)
        const posRow = Math.floor(pos / gridSize)
        if (Math.abs(aiHeadRow - posRow) <= 1) {
          safePositions.push(pos)
        }
      }
    }
    
    // 添加AI蛇头前进方向上的额外安全区域
    let aiFrontPos = aiHeadPos;
    for (let i = 0; i < 3; i++) {
      switch (aiDirection.value) {
        case 'up':
          aiFrontPos = aiFrontPos - gridSize;
          if (aiFrontPos < 0) aiFrontPos += cells.value.length;
          break;
        case 'down':
          aiFrontPos = aiFrontPos + gridSize;
          if (aiFrontPos >= cells.value.length) aiFrontPos -= cells.value.length;
          break;
        case 'left':
          aiFrontPos = aiFrontPos % gridSize === 0 ? aiFrontPos + gridSize - 1 : aiFrontPos - 1;
          break;
        case 'right':
          aiFrontPos = aiFrontPos % gridSize === gridSize - 1 ? aiFrontPos - gridSize + 1 : aiFrontPos + 1;
          break;
      }
      safePositions.push(aiFrontPos);
    }
  }
  
  // 生成障碍物，避开安全区域
  while (obstacles.value.length < obstacleCount) {
    const pos = Math.floor(Math.random() * cells.value.length);
    if (!obstacles.value.includes(pos) && !safePositions.includes(pos)) {
      obstacles.value.push(pos);
    }
  }
}

const generateFood = () => {
  let newFood
  do {
    newFood = Math.floor(Math.random() * cells.value.length)
  } while (
    snake.value.includes(newFood) ||
    obstacles.value.includes(newFood) ||
    (aiSnake.value && aiSnake.value.includes(newFood)) // Check against AI snake
  )
  food.value = newFood
}

const isSnake = (index) => snake.value.includes(index)
const isAiSnake = (index) => aiSnake.value.includes(index) // AI Snake check
const isFood = (index) => food.value === index
const isObstacle = (index) => obstacles.value.includes(index)

const calculateNewHeadInternal = (currentHead, dir, currentGridSize, totalCells) => {
  // Renamed to avoid conflict with the one inside moveAiSnake if it's not perfectly scoped
  // Or ensure moveAiSnake's calculateNewHead uses its own scope's gridSize and cells.value.length
  let newH
  switch (dir) {
    case 'up':
      newH = currentHead - currentGridSize
      if (newH < 0) newH += totalCells
      break
    case 'down':
      newH = currentHead + currentGridSize
      if (newH >= totalCells) newH -= totalCells
      break
    case 'left':
      newH = currentHead % currentGridSize === 0 ? currentHead + currentGridSize - 1 : currentHead - 1
      break
    case 'right':
      newH = currentHead % currentGridSize === currentGridSize - 1 ? currentHead - currentGridSize + 1 : currentHead + 1
      break
  }
  return newH
}

const countOpenAdjacentCells = (position, currentAiSnakeSegments, playerSnakeSegments, obstacleCells) => {
  let openCount = 0
  const directions = ['up', 'down', 'left', 'right']
  for (const dir of directions) {
    const neighbor = calculateNewHeadInternal(position, dir, gridSize, cells.value.length) // Uses gridSize and cells.value.length from outer scope

    // Check if neighbor is safe (not obstacle, not player, not AI)
    // For this specific count, the AI snake body to check against should be its current state.
    // If the AI is length 1, its head (position) is part of currentAiSnakeSegments. A neighbor cannot be itself.
    const isNeighborObstacle = obstacleCells.includes(neighbor)
    const isNeighborPlayer = playerSnakeSegments.includes(neighbor)
    const isNeighborAi = currentAiSnakeSegments.includes(neighbor) // Check against the whole current AI snake

    if (!isNeighborObstacle && !isNeighborPlayer && !isNeighborAi) {
      openCount++
    }
  }
  return openCount
}


// 修改move函数，确保第一次移动时不会立即检测到碰撞
const move = () => {
  if (gameOver.value) return; // 如果游戏已结束，不执行移动
  
  const head = snake.value[0];
  let newHead;

  switch (direction.value) {
    case 'up':
      newHead = head - gridSize;
      if (newHead < 0) newHead += cells.value.length;
      break;
    case 'down':
      newHead = head + gridSize;
      if (newHead >= cells.value.length) newHead -= cells.value.length;
      break;
    case 'left':
      newHead = head % gridSize === 0 ? head + gridSize - 1 : head - 1;
      break;
    case 'right':
      newHead = head % gridSize === gridSize - 1 ? head - gridSize + 1 : head + 1;
      break;
  }

  // 检查是否与障碍物碰撞
  if (!specialFoodActive.value || specialFoodEffect.value !== '穿墙') {
    if (obstacles.value.includes(newHead)) {
      console.log('碰到障碍物，游戏结束');
      if (soundEnabled.value) playSound('collision');
      endGame();
      return;
    }
  }

  // 检查是否与自身碰撞
  if (snake.value.slice(0, -1).includes(newHead)) {
    console.log('碰到自身，游戏结束');
    if (soundEnabled.value) playSound('collision');
    endGame();
    return;
  }

  // 检查是否与AI蛇碰撞
  if (aiSnake.value.length > 0 && !aiGameOver.value && aiSnake.value.includes(newHead)) {
    console.log('碰到AI蛇，游戏结束');
    if (soundEnabled.value) playSound('collision');
    endGame();
    return;
  }

  snake.value.unshift(newHead);

  if (newHead === food.value) {
    score.value += 10;
    generateFood();
    // 在吃到普通食物后有机会生成特殊食物
    generateSpecialFood();
    if (soundEnabled.value) playSound('eat');
  } else if (newHead === specialFood.value) {
    // 处理特殊食物
    if (specialFoodType.value === 'double') {
      score.value += 20;
    } else {
      score.value += 10;
    }
    
    // 激活特殊食物效果
    activateSpecialFood(specialFoodType.value);
    
    // 移除特殊食物
    specialFood.value = -1;
    specialFoodType.value = '';
    
    if (soundEnabled.value) playSound('special');
  } else {
    snake.value.pop();
  }
  
  if (soundEnabled.value) playSound('move');
}

// 从这里开始删除，直到下一个函数定义之前
// 505|  // 修改createObstacles函数，确保蛇头前进方向上没有障碍物
// 506|  const createObstacles = () => {
// 507|    obstacles.value = [];
// 508|    const obstacleCount = Math.floor(Math.random() * 10) + 5;
// ... (删除直到下一个函数定义，例如 generateFood 函数之前的所有内容)
// 509|    // 计算蛇头周围的安全区域（蛇头位置及其周围的8个格子）

// ... existing code ...
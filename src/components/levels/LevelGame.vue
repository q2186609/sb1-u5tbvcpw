<template>
  <div class="level-game bg-gray-900 min-h-screen flex flex-col">
    <!-- 游戏头部信息 -->
    <div class="game-header bg-gray-800 p-4 flex items-center justify-between">
      <!-- 关卡信息 -->
      <div class="flex items-center text-white">
        <button
          @click="pauseGame"
          class="mr-4 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
        >
          {{ isPaused ? '▶️' : '⏸️' }}
        </button>
        <div>
          <h2 class="text-xl font-bold">关卡 {{ currentLevel }}</h2>
          <p class="text-sm text-gray-300">{{ currentLevelConfig?.name }}</p>
        </div>
      </div>
      
      <!-- 游戏统计 -->
      <div class="flex items-center space-x-6 text-white">
        <div class="text-center">
          <div class="text-lg font-bold">{{ score }}</div>
          <div class="text-xs text-gray-300">分数</div>
        </div>
        <div class="text-center">
          <div class="text-lg font-bold">{{ snakeLength }}</div>
          <div class="text-xs text-gray-300">长度</div>
        </div>
        <div v-if="timeLimit" class="text-center">
          <div 
            class="text-lg font-bold"
            :class="timeRemaining < 30000 ? 'text-red-400' : 'text-white'"
          >
            {{ formatTime(timeRemaining) }}
          </div>
          <div class="text-xs text-gray-300">剩余时间</div>
        </div>
      </div>
      
      <!-- 技能栏 -->
      <div class="flex items-center space-x-2">
        <button
          v-for="(skill, skillName) in availableSkills"
          :key="skillName"
          @click="useSkill(skillName)"
          class="skill-button p-2 rounded-lg transition-all duration-200"
          :class="getSkillButtonClass(skillName)"
          :disabled="!canUseSkill(skillName)"
          :title="getSkillTooltip(skillName)"
        >
          {{ getSkillIcon(skillName) }}
        </button>
      </div>
    </div>

    <!-- 游戏主体 -->
    <div class="flex-1 flex items-center justify-center p-4">
      <div class="game-container relative">
        <!-- 游戏网格 -->
        <div
          class="grid gap-px bg-gray-700 p-1 rounded-lg shadow-2xl"
          :style="{
            'grid-template-columns': `repeat(${gridSize}, minmax(0, 1fr))`,
            width: '600px',
            height: '600px'
          }"
        >
          <div
            v-for="(cell, index) in cells"
            :key="index"
            class="cell w-full h-full rounded-sm transition-colors duration-100"
            :class="getCellClass(index)"
          >
            <!-- 特殊效果 -->
            <div v-if="hasSpecialEffect(index)" class="special-effect">
              {{ getSpecialEffectIcon(index) }}
            </div>
          </div>
        </div>
        
        <!-- 游戏覆盖层 -->
        <div v-if="isPaused || gameOver" class="game-overlay">
          <div v-if="isPaused" class="overlay-content">
            <h3 class="text-3xl font-bold text-white mb-4">游戏暂停</h3>
            <button
              @click="resumeGame"
              class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg"
            >
              继续游戏
            </button>
          </div>
          
          <div v-if="gameOver" class="overlay-content">
            <h3 class="text-3xl font-bold mb-4" :class="isLevelCompleted ? 'text-green-400' : 'text-red-400'">
              {{ isLevelCompleted ? '关卡完成!' : '挑战失败!' }}
            </h3>
            
            <!-- 关卡完成统计 -->
            <div v-if="isLevelCompleted" class="mb-6">
              <div class="flex justify-center mb-4">
                <div
                  v-for="star in 3"
                  :key="star"
                  class="text-4xl mx-1 transition-all duration-300"
                  :class="star <= earnedStars ? 'text-yellow-400 animate-pulse' : 'text-gray-600'"
                >
                  ⭐
                </div>
              </div>
              
              <div class="text-white mb-4">
                <p>最终得分: {{ score }}</p>
                <p>用时: {{ formatTime(completionTime) }}</p>
                <p>蛇身长度: {{ snakeLength }}</p>
              </div>
              
              <!-- 目标完成情况 -->
              <div class="mb-4">
                <h4 class="text-white font-bold mb-2">目标完成情况:</h4>
                <div class="space-y-1">
                  <div 
                    v-for="objective in currentObjectives"
                    :key="objective.type"
                    class="flex items-center justify-between text-sm"
                    :class="isObjectiveCompleted(objective) ? 'text-green-400' : 'text-gray-400'"
                  >
                    <span>{{ objective.description }}</span>
                    <span>{{ isObjectiveCompleted(objective) ? '✅' : '❌' }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 失败原因 -->
            <div v-else class="text-white mb-6">
              <p class="text-lg">{{ failureReason }}</p>
              <p class="text-sm text-gray-300 mt-2">最终得分: {{ score }}</p>
            </div>
            
            <!-- 操作按钮 -->
            <div class="flex gap-4">
              <button
                @click="restartLevel"
                class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg"
              >
                重新挑战
              </button>
              <button
                v-if="isLevelCompleted && hasNextLevel"
                @click="nextLevel"
                class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg"
              >
                下一关
              </button>
              <button
                @click="backToLevelSelection"
                class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg"
              >
                返回关卡选择
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 目标和提示面板 -->
    <div class="bottom-panel bg-gray-800 p-4">
      <div class="flex justify-between items-center">
        <!-- 关卡目标 -->
        <div class="objectives">
          <h4 class="text-white font-bold mb-2">关卡目标:</h4>
          <div class="space-y-1">
            <div 
              v-for="objective in currentObjectives"
              :key="objective.type"
              class="flex items-center text-sm"
              :class="isObjectiveCompleted(objective) ? 'text-green-400' : 'text-white'"
            >
              <span class="mr-2">{{ isObjectiveCompleted(objective) ? '✅' : '🎯' }}</span>
              <span>{{ objective.description }}</span>
              <span v-if="objective.required" class="ml-2 text-red-400">(必需)</span>
            </div>
          </div>
        </div>
        
        <!-- 操作提示 -->
        <div class="controls text-right">
          <h4 class="text-white font-bold mb-2">操作提示:</h4>
          <div class="text-sm text-gray-300 space-y-1">
            <p>WASD 或 方向键: 移动</p>
            <p>空格键: 暂停/继续</p>
            <p>1-4: 使用技能</p>
            <p>ESC: 退出关卡</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { useLevelStore } from '../../stores/levelStore.js'
import gameService from '../../services/gameService.js'

// Props
const props = defineProps({
  levelId: {
    type: Number,
    required: true
  }
})

// 状态管理
const gameStore = useGameStore()
const levelStore = useLevelStore()

// 响应式数据
const isPaused = ref(false)
const gameStartTime = ref(0)
const completionTime = ref(0)
const earnedStars = ref(0)
const failureReason = ref('')

// 计算属性
const currentLevel = computed(() => levelStore.currentLevel)
const currentLevelConfig = computed(() => levelStore.getLevelConfig(props.levelId))
const currentObjectives = computed(() => levelStore.currentObjectives)
const score = computed(() => gameStore.score)
const snakeLength = computed(() => gameStore.snake.length)
const gridSize = computed(() => gameStore.gridSize)
const cells = computed(() => gameStore.cells)
const gameOver = computed(() => gameStore.gameOver)
const timeLimit = computed(() => currentLevelConfig.value?.timeLimit)
const availableSkills = computed(() => gameStore.skills)

const timeRemaining = computed(() => {
  if (!timeLimit.value || !gameStartTime.value) return 0
  const elapsed = Date.now() - gameStartTime.value
  return Math.max(0, timeLimit.value - elapsed)
})

const isLevelCompleted = computed(() => {
  if (!gameOver.value) return false
  
  const requiredObjectives = currentObjectives.value.filter(obj => obj.required)
  const completedRequired = requiredObjectives.filter(obj => isObjectiveCompleted(obj))
  
  return completedRequired.length === requiredObjectives.length
})

const hasNextLevel = computed(() => {
  return props.levelId < 94 && levelStore.canAccessLevel(props.levelId + 1)
})

// 方法
const getCellClass = (index) => {
  if (gameStore.snake.includes(index)) {
    return 'bg-green-500 snake-segment'
  }
  if (index === gameStore.food) {
    return 'bg-red-500 food-cell animate-pulse'
  }
  if (index === gameStore.specialFood) {
    const typeClass = {
      'double': 'bg-purple-500',
      'speed': 'bg-yellow-500', 
      'ghost': 'bg-cyan-500'
    }
    return `${typeClass[gameStore.specialFoodType] || 'bg-purple-500'} special-food animate-bounce`
  }
  if (gameStore.obstacles.includes(index)) {
    return 'bg-gray-600 obstacle'
  }
  
  return 'bg-gray-800'
}

const hasSpecialEffect = (index) => {
  // 检查是否有特殊效果在这个位置
  return false // 暂时返回false，可以根据需要添加特效
}

const getSpecialEffectIcon = (index) => {
  return ''
}

const getSkillButtonClass = (skillName) => {
  const skill = gameStore.skills[skillName]
  if (!skill.unlocked) {
    return 'bg-gray-600 cursor-not-allowed opacity-50'
  }
  if (skill.cooldown > 0) {
    return 'bg-red-600 cursor-not-allowed opacity-75'
  }
  return 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
}

const canUseSkill = (skillName) => {
  const skill = gameStore.skills[skillName]
  return skill.unlocked && skill.cooldown === 0
}

const getSkillIcon = (skillName) => {
  const icons = {
    'dash': '⚡',
    'shield': '🛡️',
    'laser': '🔥',
    'timeSlash': '⏰'
  }
  return icons[skillName] || '❓'
}

const getSkillTooltip = (skillName) => {
  const tooltips = {
    'dash': '冲刺 - 快速前进3格',
    'shield': '护盾 - 免疫一次碰撞',
    'laser': '激光 - 穿透攻击',
    'timeSlash': '时间减缓 - 减缓游戏速度'
  }
  return tooltips[skillName] || ''
}

const isObjectiveCompleted = (objective) => {
  return levelStore.completedObjectives.includes(objective)
}

const useSkill = (skillName) => {
  if (canUseSkill(skillName)) {
    gameService.useSkill(skillName)
  }
}

const pauseGame = () => {
  isPaused.value = !isPaused.value
  gameService.pauseGame()
}

const resumeGame = () => {
  isPaused.value = false
  gameService.pauseGame()
}

const restartLevel = () => {
  gameStore.resetGame()
  startLevel()
}

const nextLevel = () => {
  if (hasNextLevel.value) {
    emit('levelChange', props.levelId + 1)
  }
}

const backToLevelSelection = () => {
  emit('backToSelection')
}

const startLevel = () => {
  const levelConfig = levelStore.startLevel(props.levelId)
  gameStartTime.value = Date.now()
  gameService.startGame('level', props.levelId)
  
  // 设置时间限制检查
  if (timeLimit.value) {
    setTimeout(() => {
      if (!gameOver.value) {
        failureReason.value = '时间用尽!'
        gameStore.endGame()
      }
    }, timeLimit.value)
  }
}

const calculateStars = () => {
  let stars = 1 // 基础完成1星
  
  const optionalCompleted = currentObjectives.value
    .filter(obj => !obj.required && isObjectiveCompleted(obj)).length
  const totalOptional = currentObjectives.value.filter(obj => !obj.required).length
  
  if (totalOptional > 0) {
    if (optionalCompleted >= Math.ceil(totalOptional * 0.5)) stars = 2
    if (optionalCompleted >= totalOptional) stars = 3
  }
  
  return stars
}

const formatTime = (milliseconds) => {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// 事件
const emit = defineEmits(['levelChange', 'backToSelection'])

// 监听游戏结束
watch(gameOver, (isGameOver) => {
  if (isGameOver) {
    completionTime.value = Date.now() - gameStartTime.value
    
    if (isLevelCompleted.value) {
      earnedStars.value = calculateStars()
      levelStore.completeLevel(props.levelId, score.value, completionTime.value)
    } else {
      if (!failureReason.value) {
        failureReason.value = '挑战失败，请重试!'
      }
    }
  }
})

// 监听目标完成
watch(() => levelStore.completedObjectives, (completed) => {
  completed.forEach(objective => {
    if (objective.type === 'score' && score.value >= objective.target) {
      levelStore.completeObjective('score', score.value)
    }
    // 其他目标检查...
  })
}, { deep: true })

// 键盘事件处理
const handleKeyPress = (event) => {
  if (event.key === 'Escape') {
    backToLevelSelection()
  }
}

// 生命周期
onMounted(() => {
  levelStore.loadProgress()
  startLevel()
  document.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  gameService.cleanup()
  document.removeEventListener('keydown', handleKeyPress)
})
</script>

<style scoped>
.game-container {
  position: relative;
}

.game-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
}

.overlay-content {
  text-align: center;
  padding: 2rem;
  background: rgba(31, 41, 55, 0.95);
  border-radius: 1rem;
  border: 2px solid rgba(59, 130, 246, 0.5);
}

.cell {
  transition: all 0.1s ease-in-out;
}

.snake-segment {
  box-shadow: inset 0 0 10px rgba(34, 197, 94, 0.5);
}

.food-cell {
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.7);
}

.special-food {
  box-shadow: 0 0 15px rgba(168, 85, 247, 0.7);
}

.obstacle {
  background: linear-gradient(45deg, #4b5563, #6b7280);
}

.skill-button {
  min-width: 2.5rem;
  min-height: 2.5rem;
  font-size: 1.2rem;
}

.objectives, .controls {
  max-width: 300px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes bounce {
  0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); }
  40%, 43% { transform: translate3d(0,-2px,0); }
  70% { transform: translate3d(0,-1px,0); }
  90% { transform: translate3d(0,-1px,0); }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-bounce {
  animation: bounce 1s infinite;
}
</style>
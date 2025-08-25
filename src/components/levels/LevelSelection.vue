<template>
  <div class="level-selection bg-gray-900 min-h-screen p-6">
    <!-- 标题和进度 -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-white mb-4">关卡挑战</h1>
      <div class="text-lg text-gray-300 mb-6">
        <span>已完成: {{ totalLevelsCompleted }}/{{ totalLevels }}</span>
        <span class="ml-6">获得星星: {{ totalStarsEarned }}</span>
        <span class="ml-6">完成率: {{ Math.round(levelCompletionRate) }}%</span>
      </div>
      
      <!-- 进度条 -->
      <div class="w-full max-w-md mx-auto bg-gray-700 rounded-full h-3">
        <div 
          class="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
          :style="{ width: levelCompletionRate + '%' }"
        ></div>
      </div>
    </div>

    <!-- 关卡分类标签 -->
    <div class="flex justify-center mb-8">
      <div class="flex bg-gray-800 rounded-lg p-1">
        <button
          v-for="category in levelCategories"
          :key="category.id"
          @click="selectedCategory = category.id"
          class="px-4 py-2 rounded-md text-white font-medium transition-all duration-200"
          :class="selectedCategory === category.id 
            ? 'bg-blue-600 shadow-lg' 
            : 'hover:bg-gray-700'"
        >
          {{ category.name }}
        </button>
      </div>
    </div>

    <!-- 关卡网格 -->
    <div class="max-w-6xl mx-auto">
      <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        <div
          v-for="levelId in filteredLevels"
          :key="levelId"
          @click="selectLevel(levelId)"
          class="level-card relative bg-gray-800 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:bg-gray-700 hover:scale-105"
          :class="getLevelCardClass(levelId)"
        >
          <!-- 关卡编号 -->
          <div class="text-center">
            <div class="text-2xl font-bold text-white mb-2">{{ levelId }}</div>
            
            <!-- 星星评级 -->
            <div class="flex justify-center mb-2">
              <div
                v-for="star in 3"
                :key="star"
                class="w-4 h-4 mx-1"
                :class="star <= getLevelStars(levelId) 
                  ? 'text-yellow-400' 
                  : 'text-gray-600'"
              >
                ⭐
              </div>
            </div>
            
            <!-- 难度标识 -->
            <div 
              class="text-xs px-2 py-1 rounded-full"
              :class="getDifficultyClass(levelId)"
            >
              {{ getDifficultyText(levelId) }}
            </div>
            
            <!-- 最佳成绩 -->
            <div v-if="getLevelProgress(levelId)?.bestScore" class="text-xs text-gray-400 mt-2">
              最佳: {{ getLevelProgress(levelId).bestScore }}
            </div>
          </div>
          
          <!-- 锁定状态 -->
          <div 
            v-if="!canAccessLevel(levelId)"
            class="absolute inset-0 bg-gray-900 bg-opacity-75 rounded-lg flex items-center justify-center"
          >
            <div class="text-4xl text-gray-500">🔒</div>
          </div>
          
          <!-- 新关卡标识 -->
          <div 
            v-if="isNewLevel(levelId)"
            class="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full"
          >
            NEW
          </div>
        </div>
      </div>
    </div>

    <!-- 每日挑战 -->
    <div class="mt-12 max-w-4xl mx-auto">
      <h2 class="text-2xl font-bold text-white mb-6 text-center">每日挑战</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          v-for="challenge in dailyChallenges"
          :key="challenge.id"
          @click="startDailyChallenge(challenge)"
          class="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 cursor-pointer hover:scale-105 transition-transform duration-200"
        >
          <div class="text-white">
            <h3 class="text-xl font-bold mb-2">{{ challenge.name }}</h3>
            <p class="text-purple-100 mb-4">{{ challenge.description }}</p>
            <div class="flex justify-between items-center">
              <span class="text-sm">奖励: {{ challenge.reward }}</span>
              <span class="text-sm">⏰ {{ challenge.timeLeft }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 关卡详情模态框 -->
    <div 
      v-if="selectedLevelDetail"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="selectedLevelDetail = null"
    >
      <div 
        class="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4"
        @click.stop
      >
        <h3 class="text-2xl font-bold text-white mb-4">
          关卡 {{ selectedLevelDetail.id }}
        </h3>
        
        <!-- 关卡信息 -->
        <div class="text-gray-300 mb-6">
          <p class="mb-2"><strong>难度:</strong> {{ getDifficultyText(selectedLevelDetail.id) }}</p>
          <p class="mb-2"><strong>目标:</strong></p>
          <ul class="list-disc list-inside ml-4">
            <li v-for="objective in selectedLevelDetail.objectives" :key="objective.type">
              {{ objective.description }}
              <span v-if="objective.required" class="text-red-400">(必需)</span>
            </li>
          </ul>
          
          <!-- 关卡记录 -->
          <div v-if="getLevelProgress(selectedLevelDetail.id)" class="mt-4 p-4 bg-gray-700 rounded">
            <h4 class="text-white font-bold mb-2">个人记录</h4>
            <p>最佳成绩: {{ getLevelProgress(selectedLevelDetail.id).bestScore }}</p>
            <p>获得星星: {{ getLevelProgress(selectedLevelDetail.id).stars }}/3</p>
            <p v-if="getLevelProgress(selectedLevelDetail.id).bestTime">
              最快时间: {{ formatTime(getLevelProgress(selectedLevelDetail.id).bestTime) }}
            </p>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="flex gap-4">
          <button
            @click="startLevel(selectedLevelDetail.id)"
            class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg"
            :disabled="!canAccessLevel(selectedLevelDetail.id)"
          >
            开始挑战
          </button>
          <button
            @click="selectedLevelDetail = null"
            class="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useLevelStore } from '../../stores/levelStore.js'
import { useGameStore } from '../../stores/gameStore.js'

// 状态管理
const levelStore = useLevelStore()
const gameStore = useGameStore()

// 响应式数据
const selectedCategory = ref('tutorial')
const selectedLevelDetail = ref(null)

// 计算属性
const levelCategories = computed(() => levelStore.levelCategories)
const totalLevels = computed(() => 94) // 总关卡数
const totalLevelsCompleted = computed(() => levelStore.totalLevelsCompleted)
const totalStarsEarned = computed(() => levelStore.totalStarsEarned)
const levelCompletionRate = computed(() => levelStore.levelCompletionRate)

const filteredLevels = computed(() => {
  const category = levelCategories.value.find(cat => cat.id === selectedCategory.value)
  return category ? category.levels : []
})

const dailyChallenges = computed(() => [
  {
    id: 'speed_run',
    name: '极速挑战',
    description: '在60秒内获得500分',
    reward: '100金币',
    timeLeft: '23:45:12'
  },
  {
    id: 'no_walls',
    name: '完美操控',
    description: '不撞墙完成任意关卡',
    reward: '特殊皮肤',
    timeLeft: '23:45:12'
  },
  {
    id: 'long_snake',
    name: '巨蟒挑战',
    description: '蛇身长度达到50',
    reward: '200经验',
    timeLeft: '23:45:12'
  }
])

// 方法
const canAccessLevel = (levelId) => {
  return levelStore.canAccessLevel(levelId)
}

const getLevelProgress = (levelId) => {
  return levelStore.levelProgress[levelId]
}

const getLevelStars = (levelId) => {
  return getLevelProgress(levelId)?.stars || 0
}

const getDifficultyText = (levelId) => {
  const difficulty = levelStore.getDifficultyByLevel(levelId)
  const difficultyMap = {
    'easy': '简单',
    'medium': '中等', 
    'hard': '困难',
    'expert': '专家',
    'master': '大师'
  }
  return difficultyMap[difficulty] || '未知'
}

const getDifficultyClass = (levelId) => {
  const difficulty = levelStore.getDifficultyByLevel(levelId)
  const classMap = {
    'easy': 'bg-green-600 text-white',
    'medium': 'bg-yellow-600 text-white',
    'hard': 'bg-orange-600 text-white', 
    'expert': 'bg-red-600 text-white',
    'master': 'bg-purple-600 text-white'
  }
  return classMap[difficulty] || 'bg-gray-600 text-white'
}

const getLevelCardClass = (levelId) => {
  if (!canAccessLevel(levelId)) {
    return 'opacity-50 cursor-not-allowed'
  }
  
  const isCompleted = getLevelProgress(levelId)?.completed
  if (isCompleted) {
    const stars = getLevelStars(levelId)
    if (stars === 3) {
      return 'border-2 border-yellow-400 bg-gradient-to-br from-yellow-900 to-gray-800'
    } else if (stars === 2) {
      return 'border-2 border-blue-400 bg-gradient-to-br from-blue-900 to-gray-800'
    } else {
      return 'border-2 border-green-400 bg-gradient-to-br from-green-900 to-gray-800'
    }
  }
  
  return 'border-2 border-gray-600 hover:border-blue-500'
}

const isNewLevel = (levelId) => {
  // 检查是否是新解锁的关卡
  const maxUnlocked = Math.max(...levelStore.unlockedLevels)
  return levelId === maxUnlocked && !getLevelProgress(levelId)?.completed
}

const selectLevel = (levelId) => {
  if (!canAccessLevel(levelId)) return
  
  const levelConfig = levelStore.getLevelConfig(levelId)
  selectedLevelDetail.value = levelConfig
}

const startLevel = (levelId) => {
  if (!canAccessLevel(levelId)) return
  
  gameStore.setGameMode('level')
  levelStore.setCurrentLevel(levelId)
  
  // 触发开始关卡事件
  emit('startLevel', levelId)
  selectedLevelDetail.value = null
}

const startDailyChallenge = (challenge) => {
  // 启动每日挑战
  gameStore.setGameMode('daily_challenge')
  emit('startDailyChallenge', challenge)
}

const formatTime = (milliseconds) => {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// 事件
const emit = defineEmits(['startLevel', 'startDailyChallenge'])

// 生命周期
onMounted(() => {
  levelStore.loadProgress()
})
</script>

<style scoped>
.level-card {
  transition: all 0.2s ease-in-out;
}

.level-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.level-selection {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}
</style>
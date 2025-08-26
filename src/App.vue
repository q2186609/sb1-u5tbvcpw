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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { socketService } from './services/socketService.js'

// 导入组件
import SinglePlayerGame from './components/SinglePlayerGame.vue'
import LevelSelection from './components/levels/LevelSelection.vue'
import LevelGame from './components/levels/LevelGame.vue'
import MultiplayerLobby from './components/multiplayer/MultiplayerLobby.vue'
import MultiplayerGame from './components/multiplayer/MultiplayerGame.vue'
import GameSettings from './components/GameSettings.vue'

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
  console.log('Vue Snake Game 初始化完成')
})

// 在应用关闭时清理Socket连接
onUnmounted(() => {
  if (socketService.isConnected) {
    socketService.disconnect()
  }
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
<template>
  <div class="game-settings min-h-screen bg-gray-900">
    <!-- 标题栏 -->
    <div class="settings-header bg-gray-800 p-4 flex justify-between items-center">
      <button 
        @click="$emit('back')"
        class="back-btn bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
      >
        ← 返回主菜单
      </button>
      
      <h1 class="text-2xl font-bold text-white">游戏设置</h1>
      
      <button 
        @click="resetToDefaults"
        class="reset-btn bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
      >
        恢复默认
      </button>
    </div>

    <!-- 设置内容 -->
    <div class="settings-content max-w-4xl mx-auto p-6">
      <div class="grid gap-8">
        
        <!-- 游戏设置 -->
        <div class="settings-section bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-bold text-white mb-6 flex items-center">
            🎮 游戏设置
          </h2>
          
          <div class="space-y-6">
            <!-- 游戏速度 -->
            <div class="setting-item">
              <label class="block text-white font-medium mb-2">
                游戏速度: {{ gameSpeed }}
              </label>
              <input 
                v-model="gameSpeed"
                type="range" 
                min="1" 
                max="10" 
                class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              >
              <div class="flex justify-between text-sm text-gray-400 mt-1">
                <span>慢</span>
                <span>快</span>
              </div>
            </div>

            <!-- 网格显示 -->
            <div class="setting-item">
              <label class="flex items-center cursor-pointer">
                <input 
                  v-model="showGrid"
                  type="checkbox" 
                  class="mr-3 w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                >
                <span class="text-white font-medium">显示网格线</span>
              </label>
              <p class="text-sm text-gray-400 mt-1">在游戏区域显示辅助网格线</p>
            </div>

            <!-- 边界穿越 -->
            <div class="setting-item">
              <label class="flex items-center cursor-pointer">
                <input 
                  v-model="wallWrap"
                  type="checkbox" 
                  class="mr-3 w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                >
                <span class="text-white font-medium">边界穿越模式</span>
              </label>
              <p class="text-sm text-gray-400 mt-1">允许蛇从边界一侧穿越到另一侧</p>
            </div>
          </div>
        </div>

        <!-- 视觉设置 -->
        <div class="settings-section bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-bold text-white mb-6 flex items-center">
            🎨 视觉设置
          </h2>
          
          <div class="space-y-6">
            <!-- 主题颜色 -->
            <div class="setting-item">
              <label class="block text-white font-medium mb-3">主题颜色</label>
              <div class="grid grid-cols-4 gap-3">
                <div 
                  v-for="theme in colorThemes" 
                  :key="theme.name"
                  @click="selectedTheme = theme.name"
                  class="theme-option cursor-pointer p-3 rounded-lg border-2 transition-all"
                  :class="selectedTheme === theme.name ? 'border-blue-500 bg-gray-700' : 'border-gray-600 hover:border-gray-500'"
                >
                  <div class="flex space-x-1 mb-2">
                    <div 
                      v-for="color in theme.colors" 
                      :key="color"
                      class="w-4 h-4 rounded"
                      :style="{ backgroundColor: color }"
                    ></div>
                  </div>
                  <span class="text-sm text-white">{{ theme.name }}</span>
                </div>
              </div>
            </div>

            <!-- 动画效果 -->
            <div class="setting-item">
              <label class="flex items-center cursor-pointer">
                <input 
                  v-model="enableAnimations"
                  type="checkbox" 
                  class="mr-3 w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                >
                <span class="text-white font-medium">启用动画效果</span>
              </label>
              <p class="text-sm text-gray-400 mt-1">界面切换和游戏元素的动画效果</p>
            </div>

            <!-- 粒子效果 -->
            <div class="setting-item">
              <label class="flex items-center cursor-pointer">
                <input 
                  v-model="enableParticles"
                  type="checkbox" 
                  class="mr-3 w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                >
                <span class="text-white font-medium">粒子特效</span>
              </label>
              <p class="text-sm text-gray-400 mt-1">食物消失和游戏结束时的粒子效果</p>
            </div>
          </div>
        </div>

        <!-- 音频设置 -->
        <div class="settings-section bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-bold text-white mb-6 flex items-center">
            🔊 音频设置
          </h2>
          
          <div class="space-y-6">
            <!-- 主音量 -->
            <div class="setting-item">
              <label class="block text-white font-medium mb-2">
                主音量: {{ masterVolume }}%
              </label>
              <input 
                v-model="masterVolume"
                type="range" 
                min="0" 
                max="100" 
                class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              >
            </div>

            <!-- 音效音量 -->
            <div class="setting-item">
              <label class="block text-white font-medium mb-2">
                音效音量: {{ sfxVolume }}%
              </label>
              <input 
                v-model="sfxVolume"
                type="range" 
                min="0" 
                max="100" 
                class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              >
            </div>

            <!-- 背景音乐 -->
            <div class="setting-item">
              <label class="flex items-center cursor-pointer">
                <input 
                  v-model="enableBgMusic"
                  type="checkbox" 
                  class="mr-3 w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                >
                <span class="text-white font-medium">背景音乐</span>
              </label>
              <p class="text-sm text-gray-400 mt-1">游戏过程中播放背景音乐</p>
            </div>
          </div>
        </div>

        <!-- 控制设置 -->
        <div class="settings-section bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-bold text-white mb-6 flex items-center">
            ⌨️ 控制设置
          </h2>
          
          <div class="space-y-6">
            <!-- 控制方案 -->
            <div class="setting-item">
              <label class="block text-white font-medium mb-3">控制方案</label>
              <div class="space-y-2">
                <label 
                  v-for="scheme in controlSchemes" 
                  :key="scheme.name"
                  class="flex items-center cursor-pointer p-3 rounded-lg hover:bg-gray-700"
                >
                  <input 
                    v-model="selectedControlScheme"
                    :value="scheme.name"
                    type="radio" 
                    class="mr-3 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600"
                  >
                  <div>
                    <span class="text-white font-medium">{{ scheme.name }}</span>
                    <p class="text-sm text-gray-400">{{ scheme.description }}</p>
                  </div>
                </label>
              </div>
            </div>

            <!-- 反向控制 -->
            <div class="setting-item">
              <label class="flex items-center cursor-pointer">
                <input 
                  v-model="reverseControls"
                  type="checkbox" 
                  class="mr-3 w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                >
                <span class="text-white font-medium">反向控制</span>
              </label>
              <p class="text-sm text-gray-400 mt-1">反转上下左右控制方向</p>
            </div>
          </div>
        </div>

        <!-- 数据管理 -->
        <div class="settings-section bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-bold text-white mb-6 flex items-center">
            💾 数据管理
          </h2>
          
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <div>
                <h3 class="text-white font-medium">清除游戏数据</h3>
                <p class="text-sm text-gray-400">删除所有游戏进度和统计数据</p>
              </div>
              <button 
                @click="clearGameData"
                class="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                清除数据
              </button>
            </div>
            
            <div class="flex justify-between items-center">
              <div>
                <h3 class="text-white font-medium">导出设置</h3>
                <p class="text-sm text-gray-400">将当前设置导出为文件</p>
              </div>
              <button 
                @click="exportSettings"
                class="bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                导出设置
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

// 定义 emits
const emit = defineEmits(['back'])

// 游戏设置
const gameSpeed = ref(5)
const showGrid = ref(true)
const wallWrap = ref(false)

// 视觉设置
const selectedTheme = ref('经典')
const enableAnimations = ref(true)
const enableParticles = ref(true)

// 音频设置
const masterVolume = ref(70)
const sfxVolume = ref(80)
const enableBgMusic = ref(true)

// 控制设置
const selectedControlScheme = ref('方向键')
const reverseControls = ref(false)

// 主题颜色配置
const colorThemes = ref([
  {
    name: '经典',
    colors: ['#10B981', '#EF4444', '#3B82F6', '#F59E0B']
  },
  {
    name: '深海',
    colors: ['#06B6D4', '#0EA5E9', '#1D4ED8', '#3730A3']
  },
  {
    name: '森林',
    colors: ['#059669', '#65A30D', '#CA8A04', '#DC2626']
  },
  {
    name: '霓虹',
    colors: ['#EC4899', '#8B5CF6', '#06B6D4', '#F59E0B']
  }
])

// 控制方案配置
const controlSchemes = ref([
  {
    name: '方向键',
    description: '使用键盘方向键控制蛇的移动'
  },
  {
    name: 'WASD',
    description: '使用 W/A/S/D 键控制蛇的移动'
  },
  {
    name: '鼠标',
    description: '点击屏幕方向控制蛇的移动'
  }
])

// 加载设置
const loadSettings = () => {
  try {
    const saved = localStorage.getItem('snakeGameSettings')
    if (saved) {
      const settings = JSON.parse(saved)
      
      // 游戏设置
      gameSpeed.value = settings.gameSpeed || 5
      showGrid.value = settings.showGrid !== undefined ? settings.showGrid : true
      wallWrap.value = settings.wallWrap || false
      
      // 视觉设置
      selectedTheme.value = settings.selectedTheme || '经典'
      enableAnimations.value = settings.enableAnimations !== undefined ? settings.enableAnimations : true
      enableParticles.value = settings.enableParticles !== undefined ? settings.enableParticles : true
      
      // 音频设置
      masterVolume.value = settings.masterVolume || 70
      sfxVolume.value = settings.sfxVolume || 80
      enableBgMusic.value = settings.enableBgMusic !== undefined ? settings.enableBgMusic : true
      
      // 控制设置
      selectedControlScheme.value = settings.selectedControlScheme || '方向键'
      reverseControls.value = settings.reverseControls || false
    }
  } catch (error) {
    console.error('加载设置失败:', error)
  }
}

// 保存设置
const saveSettings = () => {
  try {
    const settings = {
      gameSpeed: gameSpeed.value,
      showGrid: showGrid.value,
      wallWrap: wallWrap.value,
      selectedTheme: selectedTheme.value,
      enableAnimations: enableAnimations.value,
      enableParticles: enableParticles.value,
      masterVolume: masterVolume.value,
      sfxVolume: sfxVolume.value,
      enableBgMusic: enableBgMusic.value,
      selectedControlScheme: selectedControlScheme.value,
      reverseControls: reverseControls.value
    }
    
    localStorage.setItem('snakeGameSettings', JSON.stringify(settings))
  } catch (error) {
    console.error('保存设置失败:', error)
  }
}

// 恢复默认设置
const resetToDefaults = () => {
  if (confirm('确定要恢复所有设置到默认值吗？')) {
    gameSpeed.value = 5
    showGrid.value = true
    wallWrap.value = false
    selectedTheme.value = '经典'
    enableAnimations.value = true
    enableParticles.value = true
    masterVolume.value = 70
    sfxVolume.value = 80
    enableBgMusic.value = true
    selectedControlScheme.value = '方向键'
    reverseControls.value = false
    
    saveSettings()
    alert('设置已恢复到默认值')
  }
}

// 清除游戏数据
const clearGameData = () => {
  if (confirm('确定要清除所有游戏数据吗？这将删除你的游戏进度和统计信息，此操作不可撤销。')) {
    try {
      localStorage.removeItem('snakeGameStats')
      localStorage.removeItem('snakeGameProgress')
      localStorage.removeItem('snakeGameLevels')
      alert('游戏数据已清除')
    } catch (error) {
      console.error('清除数据失败:', error)
      alert('清除数据失败')
    }
  }
}

// 导出设置
const exportSettings = () => {
  try {
    const settings = {
      gameSpeed: gameSpeed.value,
      showGrid: showGrid.value,
      wallWrap: wallWrap.value,
      selectedTheme: selectedTheme.value,
      enableAnimations: enableAnimations.value,
      enableParticles: enableParticles.value,
      masterVolume: masterVolume.value,
      sfxVolume: sfxVolume.value,
      enableBgMusic: enableBgMusic.value,
      selectedControlScheme: selectedControlScheme.value,
      reverseControls: reverseControls.value,
      exportTime: new Date().toISOString()
    }
    
    const dataStr = JSON.stringify(settings, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `snake-game-settings-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
    alert('设置已导出')
  } catch (error) {
    console.error('导出设置失败:', error)
    alert('导出设置失败')
  }
}

// 监听设置变化并自动保存
watch([
  gameSpeed, showGrid, wallWrap,
  selectedTheme, enableAnimations, enableParticles,
  masterVolume, sfxVolume, enableBgMusic,
  selectedControlScheme, reverseControls
], () => {
  saveSettings()
}, { deep: true })

// 组件挂载时加载设置
onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.slider::-webkit-slider-thumb {
  appearance: none;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #3B82F6;
  cursor: pointer;
  border: 2px solid #1F2937;
}

.slider::-moz-range-thumb {
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #3B82F6;
  cursor: pointer;
  border: 2px solid #1F2937;
}

.theme-option:hover {
  transform: translateY(-2px);
}

.setting-item {
  padding-bottom: 1rem;
  border-bottom: 1px solid #374151;
}

.setting-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
</style>
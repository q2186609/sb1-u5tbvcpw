<template>
  <div class="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="modal-content bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
      <h2 class="text-2xl font-bold text-white mb-6">创建游戏房间</h2>
      
      <form @submit.prevent="createRoom" class="space-y-4">
        <!-- 房间名称 -->
        <div>
          <label class="block text-white font-medium mb-2">房间名称</label>
          <input
            v-model="roomConfig.name"
            type="text"
            placeholder="输入房间名称"
            class="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
            required
            maxlength="20"
          >
        </div>
        
        <!-- 游戏模式 -->
        <div>
          <label class="block text-white font-medium mb-2">游戏模式</label>
          <select
            v-model="roomConfig.gameMode"
            class="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
          >
            <option value="classic">经典对战</option>
            <option value="team">团队合作</option>
            <option value="survival">生存挑战</option>
            <option value="score">积分竞赛</option>
          </select>
        </div>
        
        <!-- 玩家数量 -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-white font-medium mb-2">最小玩家</label>
            <select
              v-model="roomConfig.minPlayers"
              class="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
            >
              <option value="2">2人</option>
              <option value="3">3人</option>
              <option value="4">4人</option>
            </select>
          </div>
          <div>
            <label class="block text-white font-medium mb-2">最大玩家</label>
            <select
              v-model="roomConfig.maxPlayers"
              class="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
            >
              <option value="2">2人</option>
              <option value="3">3人</option>
              <option value="4">4人</option>
              <option value="6">6人</option>
              <option value="8">8人</option>
            </select>
          </div>
        </div>
        
        <!-- 房间设置 -->
        <div class="space-y-3">
          <div class="flex items-center">
            <input
              v-model="roomConfig.isPrivate"
              type="checkbox"
              id="private"
              class="mr-2"
            >
            <label for="private" class="text-white">私人房间</label>
          </div>
          
          <div v-if="roomConfig.isPrivate">
            <label class="block text-white font-medium mb-2">房间密码</label>
            <input
              v-model="roomConfig.password"
              type="password"
              placeholder="设置房间密码"
              class="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
              maxlength="10"
            >
          </div>
        </div>
        
        <!-- 游戏设置 -->
        <div class="bg-gray-700 rounded p-4 space-y-3">
          <h3 class="text-white font-bold mb-2">游戏设置</h3>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-white text-sm mb-1">游戏速度</label>
              <select
                v-model="roomConfig.settings.gameSpeed"
                class="w-full bg-gray-600 text-white px-2 py-1 rounded text-sm"
              >
                <option value="200">慢速</option>
                <option value="150">正常</option>
                <option value="100">快速</option>
                <option value="75">极速</option>
              </select>
            </div>
            
            <div>
              <label class="block text-white text-sm mb-1">地图大小</label>
              <select
                v-model="roomConfig.settings.gridSize"
                class="w-full bg-gray-600 text-white px-2 py-1 rounded text-sm"
              >
                <option value="24">小 (24x24)</option>
                <option value="32">中 (32x32)</option>
                <option value="40">大 (40x40)</option>
              </select>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-white text-sm mb-1">时间限制</label>
              <select
                v-model="roomConfig.settings.timeLimit"
                class="w-full bg-gray-600 text-white px-2 py-1 rounded text-sm"
              >
                <option value="0">无限制</option>
                <option value="300000">5分钟</option>
                <option value="600000">10分钟</option>
                <option value="900000">15分钟</option>
              </select>
            </div>
            
            <div>
              <label class="block text-white text-sm mb-1">分数限制</label>
              <select
                v-model="roomConfig.settings.scoreLimit"
                class="w-full bg-gray-600 text-white px-2 py-1 rounded text-sm"
              >
                <option value="0">无限制</option>
                <option value="500">500分</option>
                <option value="1000">1000分</option>
                <option value="2000">2000分</option>
              </select>
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
            <div class="flex items-center">
              <input
                v-model="roomConfig.settings.enablePowerUps"
                type="checkbox"
                id="powerups"
                class="mr-2"
              >
              <label for="powerups" class="text-white text-sm">启用道具</label>
            </div>
            
            <div class="flex items-center">
              <input
                v-model="roomConfig.settings.enableSkills"
                type="checkbox"
                id="skills"
                class="mr-2"
              >
              <label for="skills" class="text-white text-sm">启用技能</label>
            </div>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="flex gap-4 pt-4">
          <button
            type="submit"
            class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg"
            :disabled="!isFormValid"
          >
            创建房间
          </button>
          <button
            type="button"
            @click="$emit('close')"
            class="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// 事件
const emit = defineEmits(['close', 'create'])

// 响应式数据
const roomConfig = ref({
  name: '',
  gameMode: 'classic',
  minPlayers: 2,
  maxPlayers: 4,
  isPrivate: false,
  password: '',
  settings: {
    gameSpeed: 150,
    gridSize: 32,
    timeLimit: 0,
    scoreLimit: 0,
    enablePowerUps: true,
    enableSkills: true
  }
})

// 计算属性
const isFormValid = computed(() => {
  return roomConfig.value.name.trim().length > 0 &&
         roomConfig.value.minPlayers <= roomConfig.value.maxPlayers &&
         (!roomConfig.value.isPrivate || roomConfig.value.password.length > 0)
})

// 方法
const createRoom = () => {
  if (isFormValid.value) {
    emit('create', roomConfig.value)
  }
}
</script>

<style scoped>
.modal-overlay {
  backdrop-filter: blur(4px);
}

.modal-content {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  accent-color: #3B82F6;
}

select option {
  background-color: #374151;
  color: white;
}
</style>
<template>
  <div class="multiplayer-lobby bg-gray-900 min-h-screen p-6">
    <!-- 顶部导航 -->
    <div class="top-nav flex justify-between items-center mb-8">
      <div class="flex items-center">
        <button
          @click="$emit('back')"
          class="mr-4 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
        >
          ← 返回
        </button>
        <h1 class="text-3xl font-bold text-white">多人游戏大厅</h1>
      </div>
      
      <!-- 连接状态 -->
      <div class="flex items-center space-x-4">
        <div class="connection-status flex items-center">
          <div 
            class="w-3 h-3 rounded-full mr-2"
            :class="isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'"
          ></div>
          <span class="text-white text-sm">
            {{ isConnected ? '已连接' : '连接中...' }}
          </span>
        </div>
        
        <!-- 玩家信息 -->
        <div class="player-info bg-gray-800 rounded-lg px-4 py-2">
          <span class="text-white font-medium">{{ playerName }}</span>
          <span class="text-gray-400 text-sm ml-2">ID: {{ playerId }}</span>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- 左侧：快速匹配和游戏模式 -->
      <div class="game-modes">
        <div class="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 class="text-xl font-bold text-white mb-4">快速匹配</h2>
          
          <!-- 匹配状态 -->
          <div v-if="isSearching" class="matching-status text-center py-8">
            <div class="loading-spinner mb-4">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            </div>
            <p class="text-white mb-2">正在寻找对手...</p>
            <p class="text-gray-400 text-sm">预计等待时间: {{ estimatedWaitTime }}秒</p>
            <div class="w-full bg-gray-700 rounded-full h-2 mt-4">
              <div 
                class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                :style="{ width: matchingProgress + '%' }"
              ></div>
            </div>
            <button
              @click="cancelMatching"
              class="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              取消匹配
            </button>
          </div>
          
          <!-- 游戏模式选择 -->
          <div v-else class="game-mode-selection">
            <div class="grid grid-cols-1 gap-3">
              <button
                v-for="mode in gameModes"
                :key="mode.id"
                @click="startQuickMatch(mode.id)"
                class="game-mode-button bg-gray-700 hover:bg-gray-600 p-4 rounded-lg text-left transition-all duration-200"
              >
                <div class="flex items-center">
                  <div class="text-2xl mr-3">{{ mode.icon }}</div>
                  <div>
                    <h3 class="text-white font-bold">{{ mode.name }}</h3>
                    <p class="text-gray-400 text-sm">{{ mode.description }}</p>
                    <p class="text-blue-400 text-xs mt-1">{{ mode.players }} | {{ mode.duration }}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
        
        <!-- 创建房间 -->
        <div class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-bold text-white mb-4">创建房间</h2>
          <button
            @click="showCreateRoomModal = true"
            class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg"
          >
            🏠 创建自定义房间
          </button>
        </div>
      </div>
      
      <!-- 中间：房间列表 -->
      <div class="room-list">
        <div class="bg-gray-800 rounded-lg p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold text-white">游戏房间</h2>
            <button
              @click="refreshRooms"
              class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
            >
              🔄 刷新
            </button>
          </div>
          
          <!-- 房间列表 -->
          <div class="rooms-container max-h-96 overflow-y-auto">
            <div v-if="roomList.length === 0" class="text-center py-8 text-gray-400">
              <p>暂无可用房间</p>
              <p class="text-sm mt-2">创建一个房间或使用快速匹配</p>
            </div>
            
            <div
              v-for="room in roomList"
              :key="room.id"
              @click="joinRoom(room)"
              class="room-item bg-gray-700 hover:bg-gray-600 p-4 rounded-lg mb-3 cursor-pointer transition-all duration-200"
            >
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <div class="flex items-center mb-2">
                    <h3 class="text-white font-bold mr-2">{{ room.name }}</h3>
                    <span v-if="room.isPrivate" class="text-yellow-400 text-xs">🔒</span>
                  </div>
                  <p class="text-gray-300 text-sm mb-1">模式: {{ getGameModeName(room.gameMode) }}</p>
                  <p class="text-gray-400 text-xs">
                    玩家: {{ room.players.length }}/{{ room.maxPlayers }} | 
                    房主: {{ room.hostName }}
                  </p>
                </div>
                
                <div class="text-right">
                  <div 
                    class="status-badge px-2 py-1 rounded text-xs font-bold"
                    :class="getRoomStatusClass(room.status)"
                  >
                    {{ getRoomStatusText(room.status) }}
                  </div>
                  <div class="text-gray-400 text-xs mt-1">
                    {{ formatRelativeTime(room.createdAt) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 右侧：在线玩家和聊天 -->
      <div class="sidebar">
        <!-- 在线玩家 -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 class="text-xl font-bold text-white mb-4">在线玩家 ({{ onlinePlayers.length }})</h2>
          <div class="players-list max-h-48 overflow-y-auto">
            <div
              v-for="player in onlinePlayers"
              :key="player.id"
              class="player-item flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0"
            >
              <div class="flex items-center">
                <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                  {{ player.name.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <p class="text-white font-medium">{{ player.name }}</p>
                  <p class="text-gray-400 text-xs">等级 {{ player.level || 1 }}</p>
                </div>
              </div>
              
              <div class="flex space-x-2">
                <button
                  @click="invitePlayer(player)"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                >
                  邀请
                </button>
                <button
                  @click="challengePlayer(player)"
                  class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                >
                  挑战
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 快速聊天 -->
        <div class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-bold text-white mb-4">
            大厅聊天
            <span v-if="unreadCount > 0" class="bg-red-500 text-white text-xs px-2 py-1 rounded-full ml-2">
              {{ unreadCount }}
            </span>
          </h2>
          
          <!-- 聊天消息 -->
          <div class="chat-messages bg-gray-700 rounded p-3 h-32 overflow-y-auto mb-3">
            <div
              v-for="message in recentMessages"
              :key="message.id"
              class="message mb-2 last:mb-0"
            >
              <span class="text-blue-400 text-sm font-bold">{{ message.playerName }}:</span>
              <span class="text-white text-sm ml-1">{{ message.content }}</span>
            </div>
          </div>
          
          <!-- 聊天输入 -->
          <div class="chat-input flex">
            <input
              v-model="chatMessage"
              @keyup.enter="sendChatMessage"
              placeholder="输入消息..."
              class="flex-1 bg-gray-700 text-white px-3 py-2 rounded-l border-none outline-none"
              maxlength="100"
            >
            <button
              @click="sendChatMessage"
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建房间模态框 -->
    <CreateRoomModal
      v-if="showCreateRoomModal"
      @close="showCreateRoomModal = false"
      @create="handleCreateRoom"
    />
    
    <!-- 加入房间密码输入框 -->
    <PasswordModal
      v-if="showPasswordModal"
      :room="selectedRoom"
      @close="showPasswordModal = false"
      @join="handleJoinRoom"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMultiplayerStore } from '../../stores/multiplayerStore.js'
import { socketService } from '../../services/socketService.js'
import CreateRoomModal from './CreateRoomModal.vue'
import PasswordModal from './PasswordModal.vue'

// 状态管理
const multiplayerStore = useMultiplayerStore()

// 响应式数据
const showCreateRoomModal = ref(false)
const showPasswordModal = ref(false)
const selectedRoom = ref(null)
const chatMessage = ref('')

// 计算属性
const isConnected = computed(() => multiplayerStore.isConnected)
const isSearching = computed(() => multiplayerStore.isSearching)
const matchingProgress = computed(() => multiplayerStore.matchingProgress)
const estimatedWaitTime = computed(() => multiplayerStore.estimatedWaitTime)
const roomList = computed(() => socketService.getRoomList())
const playerId = computed(() => multiplayerStore.localPlayer.id)
const playerName = computed(() => multiplayerStore.localPlayer.name)
const recentMessages = computed(() => multiplayerStore.messages.slice(-10))
const unreadCount = computed(() => multiplayerStore.unreadCount)
const onlinePlayers = computed(() => socketService.getOnlinePlayersList())

// 游戏模式配置
const gameModes = ref([
  {
    id: 'classic',
    name: '经典对战',
    description: '传统多人贪吃蛇对战',
    icon: '🐍',
    players: '2-4人',
    duration: '5-10分钟'
  },
  {
    id: 'team',
    name: '团队合作',
    description: '与队友协作完成任务',
    icon: '🤝',
    players: '2-6人',
    duration: '10-15分钟'
  },
  {
    id: 'survival',
    name: '生存挑战',
    description: '在障碍环境中生存最久',
    icon: '⚡',
    players: '2-8人',
    duration: '8-12分钟'
  },
  {
    id: 'score',
    name: '积分竞赛',
    description: '限时内获得最高分数',
    icon: '🏆',
    players: '2-6人',
    duration: '5分钟'
  }
])

// 方法
const startQuickMatch = async (gameMode) => {
  try {
    socketService.startQuickMatch(gameMode)
  } catch (error) {
    console.error('开始匹配失败:', error)
  }
}

const cancelMatching = () => {
  socketService.cancelMatching()
}

const refreshRooms = () => {
  // Mock服务不需要刻意刷新，数据已经存在
  console.log('🔄 房间列表已刷新')
}

const joinRoom = (room) => {
  if (room.isPrivate) {
    selectedRoom.value = room
    showPasswordModal.value = true
  } else {
    handleJoinRoom(room, '')
  }
}

const handleJoinRoom = async (room, password = '') => {
  try {
    await socketService.joinRoom(room.id, password)
    showPasswordModal.value = false
    emit('joinedRoom', room)
  } catch (error) {
    console.error('加入房间失败:', error)
    alert(error.message)
  }
}

const handleCreateRoom = (roomConfig) => {
  try {
    const room = socketService.createRoom(roomConfig)
    showCreateRoomModal.value = false
    emit('createdRoom', room)
  } catch (error) {
    console.error('创建房间失败:', error)
  }
}

const invitePlayer = (player) => {
  socketService.invitePlayer(player)
}

const challengePlayer = (player) => {
  socketService.challengePlayer(player)
}

const sendChatMessage = () => {
  if (chatMessage.value.trim()) {
    socketService.sendChatMessage(chatMessage.value.trim())
    chatMessage.value = ''
  }
}

const getGameModeName = (modeId) => {
  const mode = gameModes.value.find(m => m.id === modeId)
  return mode ? mode.name : modeId
}

const getRoomStatusClass = (status) => {
  const statusClasses = {
    'waiting': 'bg-green-600 text-white',
    'starting': 'bg-yellow-600 text-white',
    'playing': 'bg-red-600 text-white',
    'finished': 'bg-gray-600 text-white'
  }
  return statusClasses[status] || 'bg-gray-600 text-white'
}

const getRoomStatusText = (status) => {
  const statusTexts = {
    'waiting': '等待中',
    'starting': '即将开始',
    'playing': '游戏中',
    'finished': '已结束'
  }
  return statusTexts[status] || '未知'
}

const formatRelativeTime = (timestamp) => {
  const now = new Date()
  const time = new Date(timestamp)
  const diff = now - time
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

// 事件
const emit = defineEmits(['back', 'joinedRoom', 'createdRoom'])

// 生命周期
onMounted(async () => {
  // 连接到服务器
  try {
    await socketService.connect()
    console.log('🎮 连接到多人游戏服务器成功')
  } catch (error) {
    console.error('连接服务器失败:', error)
  }
})

onUnmounted(() => {
  if (socketService.isConnected) {
    socketService.disconnect()
  }
})
</script>

<style scoped>
.multiplayer-lobby {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.game-mode-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.room-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.loading-spinner {
  display: inline-block;
}

.chat-messages {
  scrollbar-width: thin;
  scrollbar-color: #4B5563 #374151;
}

.chat-messages::-webkit-scrollbar {
  width: 4px;
}

.chat-messages::-webkit-scrollbar-track {
  background: #374151;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #4B5563;
  border-radius: 2px;
}

.rooms-container {
  scrollbar-width: thin;
  scrollbar-color: #4B5563 #374151;
}

.rooms-container::-webkit-scrollbar {
  width: 4px;
}

.rooms-container::-webkit-scrollbar-track {
  background: #374151;
}

.rooms-container::-webkit-scrollbar-thumb {
  background: #4B5563;
  border-radius: 2px;
}
</style>
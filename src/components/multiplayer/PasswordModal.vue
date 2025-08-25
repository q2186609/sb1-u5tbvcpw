<template>
  <div class="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="modal-content bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
      <h2 class="text-xl font-bold text-white mb-4">加入私人房间</h2>
      
      <div class="mb-4">
        <p class="text-gray-300 mb-2">房间名称: {{ room.name }}</p>
        <p class="text-gray-400 text-sm">此房间需要密码才能加入</p>
      </div>
      
      <form @submit.prevent="joinRoom">
        <div class="mb-6">
          <label class="block text-white font-medium mb-2">房间密码</label>
          <input
            v-model="password"
            type="password"
            placeholder="输入房间密码"
            class="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
            required
            ref="passwordInput"
          >
          <p v-if="errorMessage" class="text-red-400 text-sm mt-2">{{ errorMessage }}</p>
        </div>
        
        <div class="flex gap-4">
          <button
            type="submit"
            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
            :disabled="!password.trim()"
          >
            加入房间
          </button>
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// Props
const props = defineProps({
  room: {
    type: Object,
    required: true
  }
})

// 事件
const emit = defineEmits(['close', 'join'])

// 响应式数据
const password = ref('')
const errorMessage = ref('')
const passwordInput = ref(null)

// 方法
const joinRoom = () => {
  if (password.value.trim()) {
    emit('join', props.room, password.value.trim())
  }
}

// 生命周期
onMounted(() => {
  // 自动聚焦到密码输入框
  if (passwordInput.value) {
    passwordInput.value.focus()
  }
})
</script>

<style scoped>
.modal-overlay {
  backdrop-filter: blur(4px);
}

.modal-content {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(59, 130, 246, 0.3);
}
</style>
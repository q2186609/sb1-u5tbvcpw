import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0', // 监听所有网卡
    port: 5173,      // 确保端口号
    strictPort: true  // 如果端口被占用则退出
  }
})
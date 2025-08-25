import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { pinia } from './stores/index.js'
import socketPlugin from './services/socketService.js'

const app = createApp(App)
app.use(pinia)
app.use(socketPlugin)
app.mount('#app')
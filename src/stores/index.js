import { createPinia } from 'pinia'

export const pinia = createPinia()

// 导出所有store
export { useGameStore } from './gameStore.js'
export { useMultiplayerStore } from './multiplayerStore.js'
export { useLevelStore } from './levelStore.js'
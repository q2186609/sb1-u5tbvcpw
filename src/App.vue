<template>
  <div class="min-h-screen bg-gray-900 flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-4xl font-bold mb-8 text-white">Snake Game</h1>
      <div v-if="!isPlaying" class="mb-8">
        <button
          @click="startGame"
          class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
        >
          Start Game
        </button>
      </div>
      <div
        class="grid gap-px bg-gray-700 p-1 rounded-lg shadow-lg"
        :style="{
          'grid-template-columns': `repeat(${gridSize}, minmax(0, 1fr))`,
          width: '600px',
          height: '600px'
        }"
      >
        <div
          v-for="(cell, index) in cells"
          :key="index"
          class="w-full h-full rounded-sm"
          :class="{
            'bg-green-500': isSnake(index),
            'bg-red-500': isFood(index),
            'bg-gray-600': isObstacle(index),
            'bg-gray-800': !isSnake(index) && !isFood(index) && !isObstacle(index)
          }"
        ></div>
      </div>
      <div class="mt-4 text-white text-xl">
        Score: {{ score }}
      </div>
      <div v-if="gameOver" class="mt-4 text-red-500 text-2xl font-bold">
        Game Over!
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const gridSize = 24
const cells = ref(Array(gridSize * gridSize).fill(0))
const snake = ref([])
const direction = ref('right')
const food = ref(-1)
const obstacles = ref([])
const isPlaying = ref(false)
const gameOver = ref(false)
const score = ref(0)
let gameInterval

const createObstacles = () => {
  obstacles.value = []
  const obstacleCount = Math.floor(Math.random() * 10) + 5 // 5-15 obstacles
  while (obstacles.value.length < obstacleCount) {
    const pos = Math.floor(Math.random() * cells.value.length)
    if (!obstacles.value.includes(pos)) {
      obstacles.value.push(pos)
    }
  }
}

const generateFood = () => {
  let newFood
  do {
    newFood = Math.floor(Math.random() * cells.value.length)
  } while (
    snake.value.includes(newFood) ||
    obstacles.value.includes(newFood)
  )
  food.value = newFood
}

const isSnake = (index) => snake.value.includes(index)
const isFood = (index) => food.value === index
const isObstacle = (index) => obstacles.value.includes(index)

const move = () => {
  const head = snake.value[0]
  let newHead

  switch (direction.value) {
    case 'up':
      newHead = head - gridSize
      if (newHead < 0) newHead += cells.value.length
      break
    case 'down':
      newHead = head + gridSize
      if (newHead >= cells.value.length) newHead -= cells.value.length
      break
    case 'left':
      newHead = head % gridSize === 0 ? head + gridSize - 1 : head - 1
      break
    case 'right':
      newHead = head % gridSize === gridSize - 1 ? head - gridSize + 1 : head + 1
      break
  }

  if (obstacles.value.includes(newHead) || snake.value.includes(newHead)) {
    endGame()
    return
  }

  snake.value.unshift(newHead)

  if (newHead === food.value) {
    score.value += 10
    generateFood()
  } else {
    snake.value.pop()
  }
}

const startGame = () => {
  snake.value = [gridSize * gridSize / 2]
  direction.value = 'right'
  score.value = 0
  gameOver.value = false
  isPlaying.value = true
  createObstacles()
  generateFood()
  gameInterval = setInterval(move, 150)
}

const endGame = () => {
  clearInterval(gameInterval)
  gameOver.value = true
  isPlaying.value = false
}

const handleKeydown = (e) => {
  if (!isPlaying.value) return

  const key = e.key.toLowerCase()
  const opposites = {
    arrowup: 'down',
    arrowdown: 'up',
    arrowleft: 'right',
    arrowright: 'left',
    w: 'down',
    s: 'up',
    a: 'right',
    d: 'left'
  }

  const newDirection = {
    arrowup: 'up',
    arrowdown: 'down',
    arrowleft: 'left',
    arrowright: 'right',
    w: 'up',
    s: 'down',
    a: 'left',
    d: 'right'
  }[key]

  if (newDirection && opposites[key] !== direction.value) {
    direction.value = newDirection
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  clearInterval(gameInterval)
})
</script>
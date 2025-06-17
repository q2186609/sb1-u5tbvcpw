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
          width: '800px',
          height: '800px'
        }"
      >
        <div
          v-for="(cell, index) in cells"
          :key="index"
          class="w-full h-full rounded-sm"
          :class="{
            'bg-green-500': isSnake(index),
            'bg-blue-500': isAiSnake(index),
            'bg-red-500': isFood(index),
            'bg-gray-600': isObstacle(index),
            'bg-gray-800': !isSnake(index) && !isAiSnake(index) && !isFood(index) && !isObstacle(index)
          }"
        ></div>
      </div>
      <div class="mt-4 text-white text-xl">
        Score: {{ score }}
      </div>
      <div class="mt-1 text-white text-lg">
        AI Score: {{ aiScore }}
      </div>
      <div v-if="gameOver" class="mt-4 text-red-500 text-2xl font-bold">
        Game Over!
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const gridSize = 32
const cells = ref(Array(gridSize * gridSize).fill(0))
const snake = ref([])
const direction = ref('right')
const food = ref(-1)
const obstacles = ref([])
const isPlaying = ref(false)
const gameOver = ref(false)
const score = ref(0)
const aiSnake = ref([])
const aiDirection = ref('left')
const aiScore = ref(0)
const aiGameOver = ref(false)
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
    obstacles.value.includes(newFood) ||
    (aiSnake.value && aiSnake.value.includes(newFood)) // Check against AI snake
  )
  food.value = newFood
}

const isSnake = (index) => snake.value.includes(index)
const isAiSnake = (index) => aiSnake.value.includes(index) // AI Snake check
const isFood = (index) => food.value === index
const isObstacle = (index) => obstacles.value.includes(index)

const calculateNewHeadInternal = (currentHead, dir, currentGridSize, totalCells) => {
  // Renamed to avoid conflict with the one inside moveAiSnake if it's not perfectly scoped
  // Or ensure moveAiSnake's calculateNewHead uses its own scope's gridSize and cells.value.length
  let newH
  switch (dir) {
    case 'up':
      newH = currentHead - currentGridSize
      if (newH < 0) newH += totalCells
      break
    case 'down':
      newH = currentHead + currentGridSize
      if (newH >= totalCells) newH -= totalCells
      break
    case 'left':
      newH = currentHead % currentGridSize === 0 ? currentHead + currentGridSize - 1 : currentHead - 1
      break
    case 'right':
      newH = currentHead % currentGridSize === currentGridSize - 1 ? currentHead - currentGridSize + 1 : currentHead + 1
      break
  }
  return newH
}

const countOpenAdjacentCells = (position, currentAiSnakeSegments, playerSnakeSegments, obstacleCells) => {
  let openCount = 0
  const directions = ['up', 'down', 'left', 'right']
  for (const dir of directions) {
    const neighbor = calculateNewHeadInternal(position, dir, gridSize, cells.value.length) // Uses gridSize and cells.value.length from outer scope

    // Check if neighbor is safe (not obstacle, not player, not AI)
    // For this specific count, the AI snake body to check against should be its current state.
    // If the AI is length 1, its head (position) is part of currentAiSnakeSegments. A neighbor cannot be itself.
    const isNeighborObstacle = obstacleCells.includes(neighbor)
    const isNeighborPlayer = playerSnakeSegments.includes(neighbor)
    const isNeighborAi = currentAiSnakeSegments.includes(neighbor) // Check against the whole current AI snake

    if (!isNeighborObstacle && !isNeighborPlayer && !isNeighborAi) {
      openCount++
    }
  }
  return openCount
}


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

  if (
    obstacles.value.includes(newHead) ||
    snake.value.includes(newHead) ||
    (aiSnake.value.length > 0 && !aiGameOver.value && aiSnake.value.includes(newHead))
  ) {
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

const moveAiSnake = () => {
  if (gameOver.value || !isPlaying.value || aiSnake.value.length === 0 || aiGameOver.value) {
    return
  }

  const head = aiSnake.value[0]
  const foodPos = food.value

  // If food is somehow not set, AI waits.
  if (foodPos === -1) {
    return;
  }

  const headRow = Math.floor(head / gridSize)
  const headCol = head % gridSize
  const foodRow = Math.floor(foodPos / gridSize)
  const foodCol = foodPos % gridSize

  const deltaRow = foodRow - headRow
  const deltaCol = foodCol - headCol

  const aiOpposites = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left',
  }

  const calculateNewHead = (currentHead, dir) => {
    let newH
    switch (dir) {
      case 'up':
        newH = currentHead - gridSize
        if (newH < 0) newH += cells.value.length
        break
      case 'down':
        newH = currentHead + gridSize
        if (newH >= cells.value.length) newH -= cells.value.length
        break
      case 'left':
        newH = currentHead % gridSize === 0 ? currentHead + gridSize - 1 : currentHead - 1
        break
      case 'right':
        newH = currentHead % gridSize === gridSize - 1 ? currentHead - gridSize + 1 : currentHead + 1
        break
    }
    return newH
  }

  const isSafe = (posCheck) => {
    // For self-collision, AI can move into its previous tail position
    // This simple check is okay if tail is popped right after unshift
    const tempAiSnakeForCheck = aiSnake.value.slice(0, aiSnake.value.length > 1 ? -1 : 1);

    return !obstacles.value.includes(posCheck) &&
           !snake.value.includes(posCheck) && // Check against player snake
           !tempAiSnakeForCheck.includes(posCheck) // Check against AI snake (excluding tail)
  }

  let preferredDirections = []
  if (Math.abs(deltaCol) > Math.abs(deltaRow)) {
    if (deltaCol > 0) preferredDirections.push('right')
    else if (deltaCol < 0) preferredDirections.push('left')
    if (deltaRow > 0) preferredDirections.push('down')
    else if (deltaRow < 0) preferredDirections.push('up')
  } else {
    if (deltaRow > 0) preferredDirections.push('down')
    else if (deltaRow < 0) preferredDirections.push('up')
    if (deltaCol > 0) preferredDirections.push('right')
    else if (deltaCol < 0) preferredDirections.push('left')
  }

  // Add remaining directions to try if preferred ones are blocked
  const allDirections = ['up', 'down', 'left', 'right']
  for (const dir of allDirections) {
    if (!preferredDirections.includes(dir)) {
      preferredDirections.push(dir)
    }
  }

  let chosenDirection = null
  for (const dir of preferredDirections) {
    if (aiSnake.value.length > 1 && dir === aiOpposites[aiDirection.value]) {
      continue // Don't move directly backward
    }
    const nextHead = calculateNewHead(head, dir)
    if (isSafe(nextHead)) {
      chosenDirection = dir
      break
    }
  }

  // If no safe preferred/alternative move, try to keep current direction if it's not into itself (and not reversing)
  if (!chosenDirection && aiDirection.value && !(aiSnake.value.length > 1 && aiOpposites[aiDirection.value] === aiDirection.value)) {
      const currentDirNextHead = calculateNewHead(head, aiDirection.value);
      if(isSafe(currentDirNextHead)){
          chosenDirection = aiDirection.value;
      }
  }


  // If still no direction, use the new fallback logic with countOpenAdjacentCells
  if (!chosenDirection) {
    let bestFallbackMove = null
    let maxOpenCells = -1

    // Shuffle directions to break ties randomly or if all have same low open cells
    const potentialFallbackMoves = allDirections.sort(() => Math.random() - 0.5);

    for (const moveDir of potentialFallbackMoves) {
      if (aiSnake.value.length > 1 && moveDir === aiOpposites[aiDirection.value]) {
        continue // Skip reverse move
      }
      const testHead = calculateNewHead(head, moveDir) // calculateNewHead from moveAiSnake scope
      if (isSafe(testHead)) { // isSafe from moveAiSnake scope
        // Pass aiSnake.value as it is, countOpen... will handle it.
        const openCount = countOpenAdjacentCells(testHead, aiSnake.value, snake.value, obstacles.value)
        if (openCount > maxOpenCells) {
          maxOpenCells = openCount
          bestFallbackMove = moveDir
        }
      }
    }
    if (bestFallbackMove) {
      chosenDirection = bestFallbackMove
    }
    // If still no chosenDirection after this, AI will freeze for a turn.
  }

  if (chosenDirection) {
    aiDirection.value = chosenDirection
    // Recalculate finalNewHead based on the chosenDirection (could be from fallback)
    const finalNewHead = calculateNewHead(head, aiDirection.value)

    const collidedWithObstacle = obstacles.value.includes(finalNewHead)
    const collidedWithPlayer = snake.value.includes(finalNewHead)
    let collidedWithSelf = false
    if (aiSnake.value.length > 0) {
      const bodySegments = aiSnake.value.slice(0, aiSnake.value.length - 1)
      if (bodySegments.includes(finalNewHead)) {
        collidedWithSelf = true
      }
    }

    if (collidedWithObstacle || collidedWithPlayer || collidedWithSelf) {
      aiGameOver.value = true
      // Optional: Clear AI snake or mark it as game over in UI if needed
      // aiSnake.value = []
      return
    }

    aiSnake.value.unshift(finalNewHead)

    if (finalNewHead === food.value) {
      aiScore.value += 10
      generateFood()
      // Tail is not popped, AI snake grows
    } else {
      // Only pop tail if not eating
      if (aiSnake.value.length > 0) { // Safety check though unshift just happened
         aiSnake.value.pop()
      }
    }
  }
  // If no chosenDirection, AI effectively "freezes" for this turn.
}

const startGame = () => {
  snake.value = [Math.floor(gridSize * gridSize / 2)]
  direction.value = 'right'
  score.value = 0
  gameOver.value = false
  aiGameOver.value = false // Reset AI game over state
  isPlaying.value = true
  createObstacles() // Obstacles created first

  aiScore.value = 0
  aiDirection.value = 'left'
  let aiStartPos
  do {
    aiStartPos = Math.floor(Math.random() * cells.value.length)
  } while (
    aiStartPos === snake.value[0] || // Avoid player start
    obstacles.value.includes(aiStartPos) // Avoid obstacles
  )
  aiSnake.value = [aiStartPos]

  generateFood() // Food generated after snakes and obstacles
  gameInterval = setInterval(() => {
    move()
    moveAiSnake()
  }, 150)
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
import { useGameStore } from '../stores/gameStore.js'
import { useMultiplayerStore } from '../stores/multiplayerStore.js'
import { useLevelStore } from '../stores/levelStore.js'
import { socketService } from './socketService.js'

class GameService {
  constructor() {
    this.gameLoopId = null
    this.lastFrameTime = 0
    this.gameSpeed = 150
    this.isPaused = false
    this.isMultiplayer = false
    
    // 游戏状态预测和回滚
    this.stateHistory = []
    this.maxHistorySize = 60 // 保存1秒的历史状态(60fps)
    
    // 碰撞检测缓存
    this.collisionCache = new Map()
    
    // 技能冷却管理
    this.skillCooldowns = new Map()
    
    this.initializeEventListeners()
  }

  // 初始化事件监听
  initializeEventListeners() {
    // 键盘控制
    document.addEventListener('keydown', this.handleKeyDown.bind(this))
    
    // 窗口焦点管理
    window.addEventListener('focus', this.handleWindowFocus.bind(this))
    window.addEventListener('blur', this.handleWindowBlur.bind(this))
    
    // 页面卸载时清理
    window.addEventListener('beforeunload', this.cleanup.bind(this))
  }

  // 开始游戏
  startGame(mode = 'single', levelId = null) {
    const gameStore = useGameStore()
    const levelStore = useLevelStore()
    
    this.isMultiplayer = mode === 'multiplayer'
    
    if (levelId) {
      // 关卡模式
      const levelConfig = levelStore.startLevel(levelId)
      this.setupLevelGame(levelConfig)
    } else {
      // 普通模式
      this.setupNormalGame()
    }
    
    gameStore.startGame()
    gameStore.setGameMode(mode)
    
    this.startGameLoop()
    
    // 如果是多人游戏，通知服务器
    if (this.isMultiplayer) {
      socketService.emit('game_ready', {
        playerId: gameStore.playerId,
        gameMode: mode
      })
    }
  }

  // 设置关卡游戏
  setupLevelGame(levelConfig) {
    const gameStore = useGameStore()
    
    // 应用关卡配置
    gameStore.gridSize = levelConfig.gridSize || 32
    gameStore.obstacles = this.generateObstacles(levelConfig.environment.obstacles)
    
    // 设置游戏速度
    this.gameSpeed = this.getDifficultySpeed(levelConfig.difficulty)
    
    // 生成初始食物
    this.generateFood()
    
    // 初始化蛇的位置
    this.initializeSnake()
    
    // 设置特殊元素
    if (levelConfig.environment.specialElements) {
      this.setupSpecialElements(levelConfig.environment.specialElements)
    }
  }

  // 设置普通游戏
  setupNormalGame() {
    const gameStore = useGameStore()
    
    gameStore.gridSize = 32
    gameStore.obstacles = []
    this.gameSpeed = gameStore.gameSpeed
    
    this.generateFood()
    this.initializeSnake()
    
    // 在困难模式下生成一些障碍物
    if (gameStore.difficulty === 'hard') {
      gameStore.obstacles = this.generateRandomObstacles(5)
    }
  }

  // 初始化蛇
  initializeSnake() {
    const gameStore = useGameStore()
    const center = Math.floor(gameStore.gridSize / 2)
    const centerIndex = center * gameStore.gridSize + center
    
    gameStore.snake = [centerIndex, centerIndex - 1, centerIndex - 2]
    gameStore.direction = 'right'
    
    // 多人模式下初始化AI蛇
    if (!this.isMultiplayer && gameStore.gameMode === 'single') {
      const aiStart = center * gameStore.gridSize + center - 10
      gameStore.aiSnake = [aiStart, aiStart + 1, aiStart + 2]
      gameStore.aiDirection = 'left'
    }
  }

  // 开始游戏循环
  startGameLoop() {
    this.lastFrameTime = performance.now()
    this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this))
  }

  // 游戏主循环
  gameLoop(currentTime) {
    if (this.isPaused) {
      this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this))
      return
    }

    const deltaTime = currentTime - this.lastFrameTime
    
    if (deltaTime >= this.gameSpeed) {
      this.updateGame(deltaTime)
      this.lastFrameTime = currentTime
    }
    
    this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this))
  }

  // 更新游戏状态
  updateGame(deltaTime) {
    const gameStore = useGameStore()
    
    if (!gameStore.isPlaying || gameStore.gameOver) {
      return
    }

    // 保存当前状态到历史记录
    this.saveStateToHistory()
    
    // 更新技能冷却
    gameStore.updateSkillCooldowns(deltaTime)
    
    // 更新蛇的移动
    this.updateSnakeMovement()
    
    // 更新AI蛇(单人模式)
    if (!this.isMultiplayer && gameStore.gameMode === 'single') {
      this.updateAISnake()
    }
    
    // 检测碰撞
    this.checkCollisions()
    
    // 更新特殊元素
    this.updateSpecialElements(deltaTime)
    
    // 检查关卡目标
    if (gameStore.gameMode === 'level') {
      this.checkLevelObjectives()
    }
    
    // 多人游戏状态同步
    if (this.isMultiplayer) {
      this.syncMultiplayerState()
    }
  }

  // 更新蛇的移动
  updateSnakeMovement() {
    const gameStore = useGameStore()
    const snake = [...gameStore.snake]
    const head = snake[0]
    
    const newHead = this.getNewHeadPosition(head, gameStore.direction, gameStore.gridSize)
    
    // 检查边界碰撞
    if (this.checkBoundaryCollision(newHead, gameStore.gridSize)) {
      this.handleGameOver('boundary')
      return
    }
    
    // 检查自身碰撞
    if (snake.includes(newHead)) {
      this.handleGameOver('self')
      return
    }
    
    // 检查障碍物碰撞
    if (gameStore.obstacles.includes(newHead)) {
      this.handleGameOver('obstacle')
      return
    }
    
    snake.unshift(newHead)
    
    // 检查是否吃到食物
    if (newHead === gameStore.food) {
      this.handleFoodEaten()
    } else if (newHead === gameStore.specialFood) {
      this.handleSpecialFoodEaten()
    } else {
      snake.pop() // 没吃到食物，移除尾部
    }
    
    gameStore.snake = snake
  }

  // 更新AI蛇
  updateAISnake() {
    const gameStore = useGameStore()
    
    if (gameStore.aiGameOver) return
    
    const aiSnake = [...gameStore.aiSnake]
    const aiHead = aiSnake[0]
    
    // AI寻路逻辑
    const bestDirection = this.calculateAIDirection(aiHead, gameStore.food, aiSnake, gameStore.obstacles, gameStore.gridSize)
    gameStore.aiDirection = bestDirection
    
    const newAIHead = this.getNewHeadPosition(aiHead, bestDirection, gameStore.gridSize)
    
    // AI碰撞检测
    if (this.checkBoundaryCollision(newAIHead, gameStore.gridSize) ||
        aiSnake.includes(newAIHead) ||
        gameStore.obstacles.includes(newAIHead) ||
        gameStore.snake.includes(newAIHead)) {
      gameStore.aiGameOver = true
      return
    }
    
    aiSnake.unshift(newAIHead)
    
    if (newAIHead === gameStore.food) {
      gameStore.aiScore += 10
      this.generateFood()
    } else {
      aiSnake.pop()
    }
    
    gameStore.aiSnake = aiSnake
  }

  // AI寻路算法 (简化版A*)
  calculateAIDirection(head, food, snake, obstacles, gridSize) {
    const directions = ['up', 'down', 'left', 'right']
    const scores = new Map()
    
    directions.forEach(dir => {
      const newPos = this.getNewHeadPosition(head, dir, gridSize)
      let score = 0
      
      // 检查安全性
      if (this.checkBoundaryCollision(newPos, gridSize) ||
          snake.includes(newPos) ||
          obstacles.includes(newPos)) {
        score = -1000
      } else {
        // 计算到食物的距离
        const foodDistance = this.getManhattanDistance(newPos, food, gridSize)
        score = 1000 - foodDistance
        
        // 增加探索奖励
        const explorationBonus = this.calculateExplorationBonus(newPos, snake, gridSize)
        score += explorationBonus
        
        // 避免陷入死胡同
        const freedomScore = this.calculateFreedomScore(newPos, snake, obstacles, gridSize)
        score += freedomScore
      }
      
      scores.set(dir, score)
    })
    
    // 选择得分最高的方向
    let bestDirection = 'up'
    let bestScore = -Infinity
    
    scores.forEach((score, direction) => {
      if (score > bestScore) {
        bestScore = score
        bestDirection = direction
      }
    })
    
    return bestDirection
  }

  // 处理食物被吃
  handleFoodEaten() {
    const gameStore = useGameStore()
    
    gameStore.updateScore(10)
    this.generateFood()
    
    // 播放音效
    this.playSound('eat')
    
    // 随机生成特殊食物
    if (Math.random() < 0.2) { // 20%概率
      this.generateSpecialFood()
    }
  }

  // 处理特殊食物被吃
  handleSpecialFoodEaten() {
    const gameStore = useGameStore()
    
    switch (gameStore.specialFoodType) {
      case 'double':
        gameStore.updateScore(20)
        break
      case 'speed':
        this.activateSpeedBoost()
        break
      case 'ghost':
        this.activateGhostMode()
        break
    }
    
    gameStore.specialFood = -1
    gameStore.specialFoodType = ''
    
    this.playSound('special_eat')
  }

  // 检测碰撞
  checkCollisions() {
    const gameStore = useGameStore()
    
    // 玩家蛇与AI蛇碰撞
    if (!this.isMultiplayer && gameStore.gameMode === 'single') {
      const playerHead = gameStore.snake[0]
      const aiHead = gameStore.aiSnake[0]
      
      // 头部相撞
      if (playerHead === aiHead) {
        this.handleGameOver('collision')
        return
      }
      
      // 玩家撞AI身体
      if (gameStore.aiSnake.includes(playerHead)) {
        this.handleGameOver('ai_body')
        return
      }
      
      // AI撞玩家身体
      if (gameStore.snake.includes(aiHead)) {
        gameStore.aiGameOver = true
      }
    }
    
    // 多人游戏碰撞检测
    if (this.isMultiplayer) {
      this.checkMultiplayerCollisions()
    }
  }

  // 多人游戏碰撞检测
  checkMultiplayerCollisions() {
    const multiplayerStore = useMultiplayerStore()
    const localPlayer = multiplayerStore.localPlayer
    
    if (!localPlayer.isAlive) return
    
    const localHead = localPlayer.snake[0]
    
    // 检查与其他玩家的碰撞
    multiplayerStore.remotePlayers.forEach(player => {
      if (!player.isAlive) return
      
      // 头部碰撞
      if (localHead === player.snake[0]) {
        this.handleMultiplayerCollision('head_collision', player.id)
        return
      }
      
      // 撞到其他玩家身体
      if (player.snake.includes(localHead)) {
        this.handleMultiplayerCollision('body_collision', player.id)
        return
      }
    })
  }

  // 处理游戏结束
  handleGameOver(reason) {
    const gameStore = useGameStore()
    
    gameStore.endGame()
    this.stopGameLoop()
    
    this.playSound('game_over')
    
    // 记录游戏结束原因
    console.log('Game Over Reason:', reason)
    
    // 关卡模式特殊处理
    if (gameStore.gameMode === 'level') {
      this.handleLevelGameOver(reason)
    }
  }

  // 处理多人游戏碰撞
  handleMultiplayerCollision(type, otherPlayerId) {
    const multiplayerStore = useMultiplayerStore()
    
    multiplayerStore.updateLocalPlayer({ isAlive: false })
    
    // 通知服务器
    socketService.sendPlayerAction({
      type: 'collision',
      collisionType: type,
      otherPlayerId: otherPlayerId,
      timestamp: Date.now()
    })
    
    this.playSound('collision')
  }

  // 生成食物
  generateFood() {
    const gameStore = useGameStore()
    let foodPosition
    
    do {
      foodPosition = Math.floor(Math.random() * (gameStore.gridSize * gameStore.gridSize))
    } while (
      gameStore.snake.includes(foodPosition) ||
      gameStore.aiSnake.includes(foodPosition) ||
      gameStore.obstacles.includes(foodPosition)
    )
    
    gameStore.food = foodPosition
  }

  // 生成特殊食物
  generateSpecialFood() {
    const gameStore = useGameStore()
    const types = ['double', 'speed', 'ghost']
    
    let specialFoodPosition
    do {
      specialFoodPosition = Math.floor(Math.random() * (gameStore.gridSize * gameStore.gridSize))
    } while (
      gameStore.snake.includes(specialFoodPosition) ||
      gameStore.aiSnake.includes(specialFoodPosition) ||
      gameStore.obstacles.includes(specialFoodPosition) ||
      specialFoodPosition === gameStore.food
    )
    
    gameStore.specialFood = specialFoodPosition
    gameStore.specialFoodType = types[Math.floor(Math.random() * types.length)]
  }

  // 生成障碍物
  generateObstacles(obstacleConfig) {
    const obstacles = []
    
    obstacleConfig.forEach(config => {
      switch (config.pattern) {
        case 'single':
          obstacles.push(config.position)
          break
        case 'line':
          obstacles.push(...this.generateLineObstacle(config.position, config.length || 3))
          break
        case 'cross':
          obstacles.push(...this.generateCrossObstacle(config.position))
          break
        case 'maze':
          obstacles.push(...this.generateMazeObstacle(config.area))
          break
      }
    })
    
    return obstacles
  }

  // 生成随机障碍物
  generateRandomObstacles(count) {
    const gameStore = useGameStore()
    const obstacles = []
    
    for (let i = 0; i < count; i++) {
      let position
      do {
        position = Math.floor(Math.random() * (gameStore.gridSize * gameStore.gridSize))
      } while (
        gameStore.snake.includes(position) ||
        gameStore.aiSnake.includes(position) ||
        position === gameStore.food
      )
      
      obstacles.push(position)
    }
    
    return obstacles
  }

  // 处理键盘输入
  handleKeyDown(event) {
    const gameStore = useGameStore()
    
    if (!gameStore.isPlaying) return
    
    const key = event.key.toLowerCase()
    let newDirection = null
    
    // 方向键和WASD控制
    switch (key) {
      case 'arrowup':
      case 'w':
        newDirection = 'up'
        break
      case 'arrowdown':
      case 's':
        newDirection = 'down'
        break
      case 'arrowleft':
      case 'a':
        newDirection = 'left'
        break
      case 'arrowright':
      case 'd':
        newDirection = 'right'
        break
      case ' ':
        event.preventDefault()
        this.pauseGame()
        return
      case 'escape':
        this.pauseGame()
        return
    }
    
    // 技能快捷键
    if (key >= '1' && key <= '4') {
      const skillIndex = parseInt(key) - 1
      const skills = ['dash', 'shield', 'laser', 'timeSlash']
      this.useSkill(skills[skillIndex])
      return
    }
    
    if (newDirection && this.isValidDirectionChange(gameStore.direction, newDirection)) {
      gameStore.direction = newDirection
      
      // 多人游戏中发送动作
      if (this.isMultiplayer) {
        socketService.sendPlayerAction({
          type: 'direction_change',
          direction: newDirection,
          timestamp: Date.now()
        })
      }
      
      event.preventDefault()
    }
  }

  // 验证方向变化是否有效
  isValidDirectionChange(currentDirection, newDirection) {
    const opposites = {
      'up': 'down',
      'down': 'up',
      'left': 'right',
      'right': 'left'
    }
    
    return opposites[currentDirection] !== newDirection
  }

  // 使用技能
  useSkill(skillName) {
    const gameStore = useGameStore()
    
    if (gameStore.useSkill(skillName)) {
      switch (skillName) {
        case 'dash':
          this.activateDash()
          break
        case 'shield':
          this.activateShield()
          break
        case 'laser':
          this.activateLaser()
          break
        case 'timeSlash':
          this.activateTimeSlash()
          break
      }
      
      this.playSound('skill_use')
    }
  }

  // 激活冲刺技能
  activateDash() {
    const gameStore = useGameStore()
    
    // 向前冲刺3格
    for (let i = 0; i < 3; i++) {
      const head = gameStore.snake[0]
      const newHead = this.getNewHeadPosition(head, gameStore.direction, gameStore.gridSize)
      
      if (!this.checkBoundaryCollision(newHead, gameStore.gridSize) &&
          !gameStore.snake.includes(newHead) &&
          !gameStore.obstacles.includes(newHead)) {
        gameStore.snake.unshift(newHead)
        gameStore.snake.pop()
      } else {
        break
      }
    }
  }

  // 工具方法
  getNewHeadPosition(head, direction, gridSize) {
    const row = Math.floor(head / gridSize)
    const col = head % gridSize
    
    switch (direction) {
      case 'up':
        return (row - 1) * gridSize + col
      case 'down':
        return (row + 1) * gridSize + col
      case 'left':
        return row * gridSize + (col - 1)
      case 'right':
        return row * gridSize + (col + 1)
      default:
        return head
    }
  }

  checkBoundaryCollision(position, gridSize) {
    const row = Math.floor(position / gridSize)
    const col = position % gridSize
    
    return row < 0 || row >= gridSize || col < 0 || col >= gridSize
  }

  getManhattanDistance(pos1, pos2, gridSize) {
    const row1 = Math.floor(pos1 / gridSize)
    const col1 = pos1 % gridSize
    const row2 = Math.floor(pos2 / gridSize)
    const col2 = pos2 % gridSize
    
    return Math.abs(row1 - row2) + Math.abs(col1 - col2)
  }

  // 游戏控制方法
  pauseGame() {
    this.isPaused = !this.isPaused
    
    if (this.isMultiplayer) {
      socketService.emit('game_pause', { paused: this.isPaused })
    }
  }

  stopGameLoop() {
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId)
      this.gameLoopId = null
    }
  }

  // 音效播放
  playSound(soundName) {
    // 这里会调用音效系统
    // 可以根据需要实现
  }

  // 保存状态到历史
  saveStateToHistory() {
    const gameStore = useGameStore()
    
    const state = {
      timestamp: Date.now(),
      snake: [...gameStore.snake],
      direction: gameStore.direction,
      score: gameStore.score,
      food: gameStore.food,
      specialFood: gameStore.specialFood
    }
    
    this.stateHistory.push(state)
    
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift()
    }
  }

  // 窗口焦点管理
  handleWindowFocus() {
    // 窗口获得焦点时恢复游戏
  }

  handleWindowBlur() {
    // 窗口失去焦点时暂停游戏
    if (this.gameLoopId && !this.isPaused) {
      this.pauseGame()
    }
  }

  // 清理资源
  cleanup() {
    this.stopGameLoop()
    
    if (this.isMultiplayer) {
      socketService.disconnect()
    }
  }

  // 获取当前游戏状态
  getCurrentGameState() {
    const gameStore = useGameStore()
    
    return {
      snake: gameStore.snake,
      direction: gameStore.direction,
      score: gameStore.score,
      food: gameStore.food,
      obstacles: gameStore.obstacles,
      specialFood: gameStore.specialFood,
      isPlaying: gameStore.isPlaying,
      gameOver: gameStore.gameOver
    }
  }
}

// 创建单例实例
export const gameService = new GameService()

export default gameService
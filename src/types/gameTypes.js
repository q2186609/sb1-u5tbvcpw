// 游戏基础类型定义

// 方向枚举
export const Direction = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right'
}

// 游戏模式枚举
export const GameMode = {
  SINGLE: 'single',
  MULTIPLAYER: 'multiplayer',
  LEVEL: 'level',
  TOURNAMENT: 'tournament'
}

// 游戏状态枚举
export const GameStatus = {
  WAITING: 'waiting',
  STARTING: 'starting',
  PLAYING: 'playing',
  PAUSED: 'paused',
  FINISHED: 'finished'
}

// 难度级别枚举
export const DifficultyLevel = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  EXPERT: 'expert',
  MASTER: 'master'
}

// 位置类
export class Position {
  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
  }

  // 转换为一维索引
  toIndex(gridSize) {
    return this.y * gridSize + this.x
  }

  // 从一维索引创建位置
  static fromIndex(index, gridSize) {
    return new Position(
      index % gridSize,
      Math.floor(index / gridSize)
    )
  }

  // 计算曼哈顿距离
  manhattanDistance(other) {
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y)
  }

  // 计算欧几里得距离
  euclideanDistance(other) {
    const dx = this.x - other.x
    const dy = this.y - other.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  // 获取相邻位置
  getAdjacentPositions() {
    return [
      new Position(this.x, this.y - 1), // up
      new Position(this.x, this.y + 1), // down
      new Position(this.x - 1, this.y), // left
      new Position(this.x + 1, this.y)  // right
    ]
  }

  // 检查是否相等
  equals(other) {
    return this.x === other.x && this.y === other.y
  }

  // 克隆位置
  clone() {
    return new Position(this.x, this.y)
  }

  // 转换为字符串
  toString() {
    return `(${this.x}, ${this.y})`
  }
}

// 蛇类
export class Snake {
  constructor(initialPositions = [], direction = Direction.RIGHT) {
    this.body = initialPositions.map(pos => 
      pos instanceof Position ? pos : Position.fromIndex(pos, 32)
    )
    this.direction = direction
    this.nextDirection = direction
    this.isAlive = true
    this.length = this.body.length
  }

  // 获取头部位置
  getHead() {
    return this.body[0]
  }

  // 获取尾部位置
  getTail() {
    return this.body[this.body.length - 1]
  }

  // 移动蛇
  move(gridSize, grow = false) {
    if (!this.isAlive) return false

    const head = this.getHead()
    const newHead = this.getNextHeadPosition(head, this.nextDirection)

    // 检查边界
    if (this.isOutOfBounds(newHead, gridSize)) {
      this.isAlive = false
      return false
    }

    // 检查自身碰撞
    if (this.containsPosition(newHead)) {
      this.isAlive = false
      return false
    }

    this.body.unshift(newHead)
    this.direction = this.nextDirection

    if (!grow) {
      this.body.pop()
    } else {
      this.length = this.body.length
    }

    return true
  }

  // 获取下一个头部位置
  getNextHeadPosition(head, direction) {
    switch (direction) {
      case Direction.UP:
        return new Position(head.x, head.y - 1)
      case Direction.DOWN:
        return new Position(head.x, head.y + 1)
      case Direction.LEFT:
        return new Position(head.x - 1, head.y)
      case Direction.RIGHT:
        return new Position(head.x + 1, head.y)
      default:
        return head.clone()
    }
  }

  // 设置方向
  setDirection(newDirection) {
    if (this.isValidDirectionChange(newDirection)) {
      this.nextDirection = newDirection
    }
  }

  // 验证方向改变是否有效
  isValidDirectionChange(newDirection) {
    const opposites = {
      [Direction.UP]: Direction.DOWN,
      [Direction.DOWN]: Direction.UP,
      [Direction.LEFT]: Direction.RIGHT,
      [Direction.RIGHT]: Direction.LEFT
    }

    return opposites[this.direction] !== newDirection
  }

  // 检查是否包含某个位置
  containsPosition(position) {
    return this.body.some(segment => segment.equals(position))
  }

  // 检查是否超出边界
  isOutOfBounds(position, gridSize) {
    return position.x < 0 || position.x >= gridSize || 
           position.y < 0 || position.y >= gridSize
  }

  // 获取蛇的索引数组
  toIndexArray(gridSize) {
    return this.body.map(pos => pos.toIndex(gridSize))
  }

  // 从索引数组创建蛇
  static fromIndexArray(indices, gridSize, direction = Direction.RIGHT) {
    const positions = indices.map(index => Position.fromIndex(index, gridSize))
    return new Snake(positions, direction)
  }

  // 克隆蛇
  clone() {
    return new Snake(
      this.body.map(pos => pos.clone()),
      this.direction
    )
  }
}

// 食物类
export class Food {
  constructor(position, type = 'normal', value = 10) {
    this.position = position instanceof Position ? position : Position.fromIndex(position, 32)
    this.type = type
    this.value = value
    this.createdAt = Date.now()
    this.expiresAt = null
  }

  // 检查是否过期
  isExpired() {
    return this.expiresAt && Date.now() > this.expiresAt
  }

  // 设置过期时间
  setExpiration(milliseconds) {
    this.expiresAt = Date.now() + milliseconds
  }

  // 获取索引
  toIndex(gridSize) {
    return this.position.toIndex(gridSize)
  }
}

// 特殊食物类
export class SpecialFood extends Food {
  constructor(position, type, value, duration = 0) {
    super(position, type, value)
    this.duration = duration
    this.effect = this.getEffectByType(type)
  }

  getEffectByType(type) {
    const effects = {
      'double': { scoreMultiplier: 2 },
      'speed': { speedBoost: 1.5, duration: 5000 },
      'ghost': { ghostMode: true, duration: 3000 },
      'magnet': { magnetRange: 3, duration: 8000 },
      'shield': { invincible: true, duration: 2000 },
      'freeze': { freezeEnemies: true, duration: 3000 }
    }
    
    return effects[type] || {}
  }
}

// 障碍物类
export class Obstacle {
  constructor(position, type = 'wall', pattern = 'single') {
    this.position = position instanceof Position ? position : Position.fromIndex(position, 32)
    this.type = type
    this.pattern = pattern
    this.isDestructible = false
    this.health = type === 'breakable' ? 1 : -1
  }

  // 获取障碍物占用的所有位置
  getOccupiedPositions(gridSize) {
    switch (this.pattern) {
      case 'single':
        return [this.position]
      case 'line':
        return this.generateLinePattern(gridSize)
      case 'cross':
        return this.generateCrossPattern(gridSize)
      case 'spiral':
        return this.generateSpiralPattern(gridSize)
      default:
        return [this.position]
    }
  }

  generateLinePattern(gridSize, length = 3) {
    const positions = []
    for (let i = 0; i < length; i++) {
      const pos = new Position(this.position.x + i, this.position.y)
      if (pos.x < gridSize) {
        positions.push(pos)
      }
    }
    return positions
  }

  generateCrossPattern(gridSize) {
    const positions = [this.position]
    const directions = [
      new Position(0, -1), new Position(0, 1),
      new Position(-1, 0), new Position(1, 0)
    ]
    
    directions.forEach(dir => {
      const pos = new Position(
        this.position.x + dir.x,
        this.position.y + dir.y
      )
      if (pos.x >= 0 && pos.x < gridSize && pos.y >= 0 && pos.y < gridSize) {
        positions.push(pos)
      }
    })
    
    return positions
  }

  generateSpiralPattern(gridSize) {
    // 简化的螺旋模式
    const positions = [this.position]
    const spiral = [
      new Position(1, 0), new Position(1, 1), new Position(0, 1),
      new Position(-1, 1), new Position(-1, 0), new Position(-1, -1),
      new Position(0, -1), new Position(1, -1)
    ]
    
    spiral.forEach(offset => {
      const pos = new Position(
        this.position.x + offset.x,
        this.position.y + offset.y
      )
      if (pos.x >= 0 && pos.x < gridSize && pos.y >= 0 && pos.y < gridSize) {
        positions.push(pos)
      }
    })
    
    return positions
  }

  // 获取索引数组
  toIndexArray(gridSize) {
    return this.getOccupiedPositions(gridSize).map(pos => pos.toIndex(gridSize))
  }
}

// 道具类
export class PowerUp {
  constructor(position, type, duration = 5000) {
    this.id = this.generateId()
    this.position = position instanceof Position ? position : Position.fromIndex(position, 32)
    this.type = type
    this.duration = duration
    this.createdAt = Date.now()
    this.isActive = false
    this.effect = this.getEffectByType(type)
  }

  generateId() {
    return 'powerup_' + Math.random().toString(36).substr(2, 9)
  }

  getEffectByType(type) {
    const effects = {
      'speed_boost': { speedMultiplier: 1.5 },
      'slow_motion': { timeMultiplier: 0.5 },
      'invincibility': { invincible: true },
      'double_score': { scoreMultiplier: 2 },
      'extra_life': { lives: 1 },
      'teleport': { canTeleport: true },
      'laser': { canShoot: true },
      'mine': { canPlaceMine: true }
    }
    
    return effects[type] || {}
  }

  // 激活道具
  activate() {
    this.isActive = true
    this.activatedAt = Date.now()
  }

  // 检查是否过期
  isExpired() {
    return this.isActive && (Date.now() - this.activatedAt) > this.duration
  }

  // 获取索引
  toIndex(gridSize) {
    return this.position.toIndex(gridSize)
  }
}

// 玩家类
export class Player {
  constructor(id, name, avatar = '') {
    this.id = id
    this.name = name
    this.avatar = avatar
    this.score = 0
    this.rank = 0
    this.isAlive = true
    this.isReady = false
    this.snake = null
    this.activePowerUps = []
    this.skills = new Map()
    this.equipment = new Map()
    this.stats = {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      totalScore: 0,
      longestSnake: 0,
      powerUpsUsed: 0
    }
    this.joinedAt = new Date()
  }

  // 初始化蛇
  initializeSnake(startPositions, direction = Direction.RIGHT) {
    this.snake = new Snake(startPositions, direction)
  }

  // 添加分数
  addScore(points) {
    this.score += points
    this.stats.totalScore += points
  }

  // 添加道具
  addPowerUp(powerUp) {
    powerUp.activate()
    this.activePowerUps.push(powerUp)
    this.stats.powerUpsUsed++
  }

  // 移除过期道具
  removeExpiredPowerUps() {
    this.activePowerUps = this.activePowerUps.filter(powerUp => !powerUp.isExpired())
  }

  // 检查是否有特定道具效果
  hasEffect(effectName) {
    return this.activePowerUps.some(powerUp => 
      powerUp.effect.hasOwnProperty(effectName)
    )
  }

  // 获取道具效果值
  getEffectValue(effectName) {
    const powerUp = this.activePowerUps.find(powerUp => 
      powerUp.effect.hasOwnProperty(effectName)
    )
    return powerUp ? powerUp.effect[effectName] : null
  }

  // 死亡处理
  die() {
    this.isAlive = false
    if (this.snake) {
      this.snake.isAlive = false
    }
    this.stats.losses++
  }

  // 胜利处理
  win() {
    this.stats.wins++
    this.stats.gamesPlayed++
  }

  // 更新最长蛇身记录
  updateLongestSnake() {
    if (this.snake && this.snake.length > this.stats.longestSnake) {
      this.stats.longestSnake = this.snake.length
    }
  }

  // 重置游戏状态
  resetGameState() {
    this.score = 0
    this.rank = 0
    this.isAlive = true
    this.isReady = false
    this.snake = null
    this.activePowerUps = []
  }

  // 序列化玩家数据
  serialize() {
    return {
      id: this.id,
      name: this.name,
      avatar: this.avatar,
      score: this.score,
      rank: this.rank,
      isAlive: this.isAlive,
      isReady: this.isReady,
      snake: this.snake ? this.snake.toIndexArray(32) : [],
      snakeDirection: this.snake ? this.snake.direction : Direction.RIGHT,
      activePowerUps: this.activePowerUps.map(powerUp => ({
        id: powerUp.id,
        type: powerUp.type,
        duration: powerUp.duration,
        isActive: powerUp.isActive,
        activatedAt: powerUp.activatedAt
      })),
      stats: this.stats
    }
  }

  // 反序列化玩家数据
  static deserialize(data) {
    const player = new Player(data.id, data.name, data.avatar)
    player.score = data.score
    player.rank = data.rank
    player.isAlive = data.isAlive
    player.isReady = data.isReady
    
    if (data.snake && data.snake.length > 0) {
      player.snake = Snake.fromIndexArray(data.snake, 32, data.snakeDirection)
    }
    
    player.activePowerUps = data.activePowerUps?.map(powerUpData => {
      const powerUp = new PowerUp(0, powerUpData.type, powerUpData.duration)
      powerUp.id = powerUpData.id
      powerUp.isActive = powerUpData.isActive
      powerUp.activatedAt = powerUpData.activatedAt
      return powerUp
    }) || []
    
    player.stats = { ...player.stats, ...data.stats }
    
    return player
  }
}

// 游戏房间类
export class GameRoom {
  constructor(id, hostId, config = {}) {
    this.id = id
    this.hostId = hostId
    this.name = config.name || `${hostId}的房间`
    this.gameMode = config.gameMode || GameMode.MULTIPLAYER
    this.maxPlayers = config.maxPlayers || 4
    this.minPlayers = config.minPlayers || 2
    this.isPrivate = config.isPrivate || false
    this.password = config.password || ''
    this.level = config.level || null
    this.players = []
    this.status = GameStatus.WAITING
    this.settings = {
      gridSize: config.gridSize || 32,
      gameSpeed: config.gameSpeed || 150,
      enablePowerUps: config.enablePowerUps !== false,
      enableSkills: config.enableSkills !== false,
      timeLimit: config.timeLimit || 0,
      scoreLimit: config.scoreLimit || 0,
      ...config.settings
    }
    this.createdAt = new Date()
    this.startedAt = null
    this.endedAt = null
  }

  // 添加玩家
  addPlayer(player) {
    if (this.players.length >= this.maxPlayers) {
      throw new Error('房间已满')
    }
    
    if (this.players.find(p => p.id === player.id)) {
      throw new Error('玩家已在房间中')
    }
    
    this.players.push(player)
    return true
  }

  // 移除玩家
  removePlayer(playerId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId)
    if (playerIndex === -1) {
      return false
    }
    
    this.players.splice(playerIndex, 1)
    
    // 如果房主离开，转移房主权限
    if (this.hostId === playerId && this.players.length > 0) {
      this.hostId = this.players[0].id
    }
    
    return true
  }

  // 检查是否可以开始游戏
  canStartGame() {
    return this.players.length >= this.minPlayers &&
           this.players.every(p => p.isReady) &&
           this.status === GameStatus.WAITING
  }

  // 开始游戏
  startGame() {
    if (!this.canStartGame()) {
      throw new Error('无法开始游戏')
    }
    
    this.status = GameStatus.STARTING
    this.startedAt = new Date()
    
    // 初始化玩家蛇的位置
    this.initializePlayerSnakes()
    
    return true
  }

  // 初始化玩家蛇的位置
  initializePlayerSnakes() {
    const gridSize = this.settings.gridSize
    const startPositions = this.generateStartPositions(gridSize, this.players.length)
    
    this.players.forEach((player, index) => {
      player.initializeSnake(startPositions[index], this.getStartDirection(index))
      player.resetGameState()
      player.isAlive = true
    })
  }

  // 生成起始位置
  generateStartPositions(gridSize, playerCount) {
    const positions = []
    const center = Math.floor(gridSize / 2)
    
    switch (playerCount) {
      case 2:
        positions.push(
          [center - 5, center, center - 4, center - 3], // 玩家1
          [center + 5, center, center + 4, center + 3]  // 玩家2
        )
        break
      case 3:
        positions.push(
          [center, center - 5, center, center - 4, center, center - 3], // 玩家1
          [center - 5, center + 3, center - 4, center + 3, center - 3, center + 3], // 玩家2
          [center + 5, center + 3, center + 4, center + 3, center + 3, center + 3]  // 玩家3
        )
        break
      case 4:
        positions.push(
          [center - 5, center - 5, center - 4, center - 5, center - 3, center - 5], // 玩家1
          [center + 5, center - 5, center + 4, center - 5, center + 3, center - 5], // 玩家2
          [center - 5, center + 5, center - 4, center + 5, center - 3, center + 5], // 玩家3
          [center + 5, center + 5, center + 4, center + 5, center + 3, center + 5]  // 玩家4
        )
        break
      default:
        // 随机分布
        for (let i = 0; i < playerCount; i++) {
          const angle = (2 * Math.PI * i) / playerCount
          const radius = Math.floor(gridSize / 4)
          const x = center + Math.floor(radius * Math.cos(angle))
          const y = center + Math.floor(radius * Math.sin(angle))
          positions.push([y * gridSize + x, y * gridSize + x - 1, y * gridSize + x - 2])
        }
    }
    
    return positions.map(posArray => 
      posArray.map(index => Position.fromIndex(index, gridSize))
    )
  }

  // 获取起始方向
  getStartDirection(playerIndex) {
    const directions = [Direction.RIGHT, Direction.LEFT, Direction.DOWN, Direction.UP]
    return directions[playerIndex % directions.length]
  }

  // 结束游戏
  endGame(winnerId = null) {
    this.status = GameStatus.FINISHED
    this.endedAt = new Date()
    
    // 更新玩家统计
    this.players.forEach(player => {
      player.stats.gamesPlayed++
      if (player.id === winnerId) {
        player.win()
      } else {
        player.stats.losses++
      }
      player.updateLongestSnake()
    })
    
    return true
  }

  // 序列化房间数据
  serialize() {
    return {
      id: this.id,
      hostId: this.hostId,
      name: this.name,
      gameMode: this.gameMode,
      maxPlayers: this.maxPlayers,
      minPlayers: this.minPlayers,
      isPrivate: this.isPrivate,
      level: this.level,
      players: this.players.map(p => p.serialize()),
      status: this.status,
      settings: this.settings,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      endedAt: this.endedAt
    }
  }
}

// 游戏状态类
export class GameState {
  constructor(gridSize = 32) {
    this.gridSize = gridSize
    this.tick = 0
    this.lastUpdate = Date.now()
    this.foods = []
    this.obstacles = []
    this.powerUps = []
    this.effects = []
    this.events = []
  }

  // 添加食物
  addFood(position, type = 'normal', value = 10) {
    const food = new Food(position, type, value)
    this.foods.push(food)
    return food
  }

  // 移除食物
  removeFood(position) {
    const index = this.foods.findIndex(food => 
      food.position.equals(position instanceof Position ? position : Position.fromIndex(position, this.gridSize))
    )
    if (index !== -1) {
      return this.foods.splice(index, 1)[0]
    }
    return null
  }

  // 添加障碍物
  addObstacle(position, type = 'wall', pattern = 'single') {
    const obstacle = new Obstacle(position, type, pattern)
    this.obstacles.push(obstacle)
    return obstacle
  }

  // 获取所有被占用的位置
  getOccupiedPositions() {
    const occupied = new Set()
    
    // 添加障碍物位置
    this.obstacles.forEach(obstacle => {
      obstacle.getOccupiedPositions(this.gridSize).forEach(pos => {
        occupied.add(pos.toIndex(this.gridSize))
      })
    })
    
    return occupied
  }

  // 检查位置是否空闲
  isPositionFree(position) {
    const index = position instanceof Position ? position.toIndex(this.gridSize) : position
    const occupied = this.getOccupiedPositions()
    
    // 检查障碍物
    if (occupied.has(index)) return false
    
    // 检查食物
    if (this.foods.some(food => food.toIndex(this.gridSize) === index)) return false
    
    // 检查道具
    if (this.powerUps.some(powerUp => powerUp.toIndex(this.gridSize) === index)) return false
    
    return true
  }

  // 生成随机空闲位置
  generateRandomFreePosition(excludePositions = []) {
    const exclude = new Set(excludePositions)
    let attempts = 0
    let position
    
    do {
      position = Math.floor(Math.random() * (this.gridSize * this.gridSize))
      attempts++
    } while ((exclude.has(position) || !this.isPositionFree(position)) && attempts < 100)
    
    return attempts < 100 ? Position.fromIndex(position, this.gridSize) : null
  }

  // 更新游戏状态
  update() {
    this.tick++
    this.lastUpdate = Date.now()
    
    // 移除过期的食物
    this.foods = this.foods.filter(food => !food.isExpired())
    
    // 清理完成的事件
    this.events = this.events.filter(event => !event.isCompleted)
  }

  // 序列化游戏状态
  serialize() {
    return {
      gridSize: this.gridSize,
      tick: this.tick,
      lastUpdate: this.lastUpdate,
      foods: this.foods.map(food => ({
        position: food.position.toIndex(this.gridSize),
        type: food.type,
        value: food.value,
        createdAt: food.createdAt,
        expiresAt: food.expiresAt
      })),
      obstacles: this.obstacles.map(obstacle => ({
        position: obstacle.position.toIndex(this.gridSize),
        type: obstacle.type,
        pattern: obstacle.pattern
      })),
      powerUps: this.powerUps.map(powerUp => ({
        id: powerUp.id,
        position: powerUp.position.toIndex(this.gridSize),
        type: powerUp.type,
        duration: powerUp.duration,
        createdAt: powerUp.createdAt
      }))
    }
  }
}

// 导出工具函数
export const GameUtils = {
  // 生成唯一ID
  generateId: () => Math.random().toString(36).substr(2, 9),
  
  // 计算分数
  calculateScore: (baseScore, multiplier = 1, bonus = 0) => {
    return Math.floor((baseScore * multiplier) + bonus)
  },
  
  // 验证位置
  isValidPosition: (position, gridSize) => {
    return position.x >= 0 && position.x < gridSize && 
           position.y >= 0 && position.y < gridSize
  },
  
  // 获取相对方向
  getRelativeDirection: (from, to) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? Direction.RIGHT : Direction.LEFT
    } else {
      return dy > 0 ? Direction.DOWN : Direction.UP
    }
  }
}
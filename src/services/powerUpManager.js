import { useGameStore } from '../stores/gameStore.js'
import { PowerUp, Position } from '../types/gameTypes.js'

// 道具系统管理器
export class PowerUpManager {
  constructor() {
    this.activePowerUps = new Map()
    this.powerUpDefinitions = new Map()
    this.spawnTimer = 0
    this.spawnInterval = 10000 // 10秒生成一个道具
    this.initializePowerUps()
  }

  // 初始化道具定义
  initializePowerUps() {
    // 速度提升道具
    this.powerUpDefinitions.set('speed_boost', {
      id: 'speed_boost',
      name: '速度提升',
      description: '提升移动速度50%',
      icon: '🏃',
      rarity: 'common',
      duration: 5000,
      color: '#FFD700',
      effect: this.speedBoostEffect.bind(this)
    })

    // 双倍得分道具
    this.powerUpDefinitions.set('double_score', {
      id: 'double_score',
      name: '双倍得分',
      description: '获得分数翻倍',
      icon: '💰',
      rarity: 'common',
      duration: 8000,
      color: '#32CD32',
      effect: this.doubleScoreEffect.bind(this)
    })

    // 幽灵模式道具
    this.powerUpDefinitions.set('ghost_mode', {
      id: 'ghost_mode',
      name: '幽灵模式',
      description: '可以穿越障碍物和自身',
      icon: '👻',
      rarity: 'rare',
      duration: 3000,
      color: '#9370DB',
      effect: this.ghostModeEffect.bind(this)
    })

    // 磁力道具
    this.powerUpDefinitions.set('magnet', {
      id: 'magnet',
      name: '磁力吸引',
      description: '自动吸引附近的食物',
      icon: '🧲',
      rarity: 'uncommon',
      duration: 6000,
      color: '#FF4500',
      effect: this.magnetEffect.bind(this)
    })

    // 护盾道具
    this.powerUpDefinitions.set('shield', {
      id: 'shield',
      name: '能量护盾',
      description: '免疫一次碰撞伤害',
      icon: '🛡️',
      rarity: 'uncommon',
      duration: 10000,
      color: '#1E90FF',
      effect: this.shieldEffect.bind(this)
    })

    // 时间减缓道具
    this.powerUpDefinitions.set('slow_time', {
      id: 'slow_time',
      name: '时间减缓',
      description: '游戏速度减慢50%',
      icon: '⏰',
      rarity: 'rare',
      duration: 4000,
      color: '#8A2BE2',
      effect: this.slowTimeEffect.bind(this)
    })

    // 额外生命道具
    this.powerUpDefinitions.set('extra_life', {
      id: 'extra_life',
      name: '额外生命',
      description: '获得一次复活机会',
      icon: '❤️',
      rarity: 'epic',
      duration: 0, // 永久直到使用
      color: '#DC143C',
      effect: this.extraLifeEffect.bind(this)
    })

    // 传送道具
    this.powerUpDefinitions.set('teleport', {
      id: 'teleport',
      name: '瞬间传送',
      description: '传送到随机安全位置',
      icon: '🌀',
      rarity: 'rare',
      duration: 0, // 即时效果
      color: '#00CED1',
      effect: this.teleportEffect.bind(this)
    })

    // 激光道具
    this.powerUpDefinitions.set('laser', {
      id: 'laser',
      name: '激光武器',
      description: '发射激光清除前方障碍',
      icon: '🔫',
      rarity: 'epic',
      duration: 0, // 即时效果
      color: '#FF6347',
      effect: this.laserEffect.bind(this)
    })

    // 地雷道具
    this.powerUpDefinitions.set('mine', {
      id: 'mine',
      name: '时空地雷',
      description: '放置地雷陷阱',
      icon: '💣',
      rarity: 'rare',
      duration: 0, // 即时效果
      color: '#2F4F4F',
      effect: this.mineEffect.bind(this)
    })

    // 食物雨道具
    this.powerUpDefinitions.set('food_rain', {
      id: 'food_rain',
      name: '食物暴雨',
      description: '地图上出现大量食物',
      icon: '🌧️',
      rarity: 'epic',
      duration: 0, // 即时效果
      color: '#FFB6C1',
      effect: this.foodRainEffect.bind(this)
    })

    // 隐身道具
    this.powerUpDefinitions.set('invisibility', {
      id: 'invisibility',
      name: '隐身斗篷',
      description: '短时间内对敌人隐身',
      icon: '🫥',
      rarity: 'legendary',
      duration: 3000,
      color: '#E6E6FA',
      effect: this.invisibilityEffect.bind(this)
    })
  }

  // 更新道具系统
  update(deltaTime) {
    this.spawnTimer += deltaTime
    
    // 检查是否需要生成新道具
    if (this.spawnTimer >= this.spawnInterval) {
      this.trySpawnPowerUp()
      this.spawnTimer = 0
    }

    // 更新激活的道具
    this.updateActivePowerUps(deltaTime)
  }

  // 尝试生成道具
  trySpawnPowerUp() {
    const gameStore = useGameStore()
    const currentPowerUps = gameStore.activePowerUps.length
    const maxPowerUps = 3

    if (currentPowerUps >= maxPowerUps) return

    // 随机选择道具类型
    const powerUpType = this.getRandomPowerUpType()
    const position = this.findSafeSpawnPosition(gameStore)

    if (position !== null) {
      this.spawnPowerUp(powerUpType, position)
    }
  }

  // 生成道具
  spawnPowerUp(type, position) {
    const gameStore = useGameStore()
    const powerUpDef = this.powerUpDefinitions.get(type)
    
    if (!powerUpDef) return

    const powerUp = new PowerUp(position, type, powerUpDef.duration)
    powerUp.definition = powerUpDef

    gameStore.activePowerUps.push(powerUp)
    console.log(`生成道具: ${powerUpDef.name} at ${position}`)
  }

  // 收集道具
  collectPowerUp(powerUpId) {
    const gameStore = useGameStore()
    const powerUpIndex = gameStore.activePowerUps.findIndex(p => p.id === powerUpId)
    
    if (powerUpIndex === -1) return false

    const powerUp = gameStore.activePowerUps[powerUpIndex]
    const powerUpDef = this.powerUpDefinitions.get(powerUp.type)

    if (!powerUpDef) return false

    // 移除道具从地图
    gameStore.activePowerUps.splice(powerUpIndex, 1)

    // 应用道具效果
    try {
      powerUpDef.effect(gameStore, powerUp)
      console.log(`使用道具: ${powerUpDef.name}`)
      
      // 添加到玩家激活道具列表（如果有持续时间）
      if (powerUp.duration > 0) {
        powerUp.activate()
        this.activePowerUps.set(powerUp.id, powerUp)
        
        // 设置过期时间
        setTimeout(() => {
          this.removePowerUpEffect(powerUp.id)
        }, powerUp.duration)
      }

      return true
    } catch (error) {
      console.error(`道具 ${powerUp.type} 效果执行失败:`, error)
      return false
    }
  }

  // 道具效果实现

  // 速度提升效果
  speedBoostEffect(gameStore, powerUp) {
    const originalSpeed = gameStore.gameSpeed
    gameStore.gameSpeed = Math.max(50, originalSpeed * 0.7) // 加快速度

    // 添加视觉效果
    this.addVisualEffect('speed_trail', gameStore.snake[0], powerUp.duration)
  }

  // 双倍得分效果
  doubleScoreEffect(gameStore, powerUp) {
    gameStore.scoreMultiplier = (gameStore.scoreMultiplier || 1) * 2
    
    // 添加得分倍数指示器
    this.addVisualEffect('score_multiplier', null, powerUp.duration)
  }

  // 幽灵模式效果
  ghostModeEffect(gameStore, powerUp) {
    gameStore.isGhostMode = true
    
    // 添加幽灵效果
    this.addVisualEffect('ghost_mode', gameStore.snake, powerUp.duration)
  }

  // 磁力效果
  magnetEffect(gameStore, powerUp) {
    gameStore.hasMagnet = true
    gameStore.magnetRange = 3
    
    // 自动吸引食物的逻辑在游戏主循环中处理
    this.addVisualEffect('magnetic_field', gameStore.snake[0], powerUp.duration)
  }

  // 护盾效果
  shieldEffect(gameStore, powerUp) {
    gameStore.hasShield = true
    gameStore.shieldCharges = 1
    
    this.addVisualEffect('shield_aura', gameStore.snake, powerUp.duration)
  }

  // 时间减缓效果
  slowTimeEffect(gameStore, powerUp) {
    const originalSpeed = gameStore.gameSpeed
    gameStore.gameSpeed = originalSpeed * 1.5 // 减慢速度
    
    this.addVisualEffect('time_slow', null, powerUp.duration)
  }

  // 额外生命效果
  extraLifeEffect(gameStore, powerUp) {
    gameStore.extraLives = (gameStore.extraLives || 0) + 1
    
    this.addVisualEffect('extra_life', null, 2000)
  }

  // 传送效果
  teleportEffect(gameStore, powerUp) {
    const newPosition = this.findSafePosition(gameStore)
    if (newPosition !== null) {
      const head = gameStore.snake[0]
      const offset = newPosition - head
      
      // 传送整条蛇
      gameStore.snake = gameStore.snake.map(segment => segment + offset)
      
      this.addVisualEffect('teleport', [head, newPosition], 1000)
    }
  }

  // 激光效果
  laserEffect(gameStore, powerUp) {
    const head = gameStore.snake[0]
    const direction = gameStore.direction
    const laserPath = this.calculateLaserPath(head, direction, gameStore.gridSize)
    
    // 清除路径上的障碍物
    gameStore.obstacles = gameStore.obstacles.filter(obstacle => 
      !laserPath.includes(obstacle)
    )
    
    // 对敌人造成伤害
    if (gameStore.aiSnake.some(segment => laserPath.includes(segment))) {
      gameStore.aiGameOver = true
    }
    
    this.addVisualEffect('laser_beam', laserPath, 1000)
  }

  // 地雷效果
  mineEffect(gameStore, powerUp) {
    const minePosition = gameStore.snake[gameStore.snake.length - 1] // 在蛇尾放置地雷
    
    // 添加地雷到游戏状态
    gameStore.mines = gameStore.mines || []
    gameStore.mines.push({
      position: minePosition,
      timer: 10000, // 10秒后爆炸
      damage: 1
    })
    
    this.addVisualEffect('mine_placed', minePosition, 500)
  }

  // 食物雨效果
  foodRainEffect(gameStore, powerUp) {
    const foodCount = 8
    const newFoods = []
    
    for (let i = 0; i < foodCount; i++) {
      const position = this.findSafePosition(gameStore)
      if (position !== null) {
        newFoods.push(position)
      }
    }
    
    // 添加食物到游戏（这需要在游戏服务中实现）
    this.addVisualEffect('food_rain', newFoods, 2000)
  }

  // 隐身效果
  invisibilityEffect(gameStore, powerUp) {
    gameStore.isInvisible = true
    
    this.addVisualEffect('invisibility', gameStore.snake, powerUp.duration)
  }

  // 工具方法

  // 获取随机道具类型
  getRandomPowerUpType() {
    const types = Array.from(this.powerUpDefinitions.keys())
    const weights = types.map(type => {
      const rarity = this.powerUpDefinitions.get(type).rarity
      const rarityWeights = {
        'common': 40,
        'uncommon': 25,
        'rare': 20,
        'epic': 10,
        'legendary': 5
      }
      return rarityWeights[rarity] || 10
    })
    
    return this.weightedRandomChoice(types, weights)
  }

  // 加权随机选择
  weightedRandomChoice(items, weights) {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    let random = Math.random() * totalWeight
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i]
      if (random <= 0) {
        return items[i]
      }
    }
    
    return items[items.length - 1]
  }

  // 寻找安全的生成位置
  findSafeSpawnPosition(gameStore) {
    const gridSize = gameStore.gridSize
    const attempts = 50
    
    for (let i = 0; i < attempts; i++) {
      const position = Math.floor(Math.random() * (gridSize * gridSize))
      
      if (this.isPositionSafe(position, gameStore)) {
        return position
      }
    }
    
    return null
  }

  // 寻找安全位置
  findSafePosition(gameStore) {
    return this.findSafeSpawnPosition(gameStore)
  }

  // 检查位置是否安全
  isPositionSafe(position, gameStore) {
    return !gameStore.snake.includes(position) &&
           !gameStore.aiSnake.includes(position) &&
           !gameStore.obstacles.includes(position) &&
           position !== gameStore.food &&
           position !== gameStore.specialFood &&
           !gameStore.activePowerUps.some(powerUp => 
             powerUp.position.toIndex ? 
             powerUp.position.toIndex(gameStore.gridSize) === position :
             powerUp.position === position
           )
  }

  // 计算激光路径
  calculateLaserPath(startPos, direction, gridSize) {
    const path = []
    let currentPos = startPos
    
    for (let i = 0; i < gridSize; i++) {
      currentPos = this.getNextPosition(currentPos, direction, gridSize)
      if (this.isOutOfBounds(currentPos, gridSize)) break
      path.push(currentPos)
    }
    
    return path
  }

  // 获取下一个位置
  getNextPosition(position, direction, gridSize) {
    const row = Math.floor(position / gridSize)
    const col = position % gridSize
    
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
        return position
    }
  }

  // 检查是否超出边界
  isOutOfBounds(position, gridSize) {
    const row = Math.floor(position / gridSize)
    const col = position % gridSize
    return row < 0 || row >= gridSize || col < 0 || col >= gridSize
  }

  // 更新激活的道具
  updateActivePowerUps(deltaTime) {
    for (const [powerUpId, powerUp] of this.activePowerUps) {
      if (powerUp.isExpired()) {
        this.removePowerUpEffect(powerUpId)
      }
    }
  }

  // 移除道具效果
  removePowerUpEffect(powerUpId) {
    const powerUp = this.activePowerUps.get(powerUpId)
    if (!powerUp) return

    const gameStore = useGameStore()

    // 根据道具类型移除效果
    switch (powerUp.type) {
      case 'speed_boost':
        gameStore.gameSpeed = 150 // 恢复默认速度
        break
      case 'double_score':
        gameStore.scoreMultiplier = Math.max(1, (gameStore.scoreMultiplier || 1) / 2)
        break
      case 'ghost_mode':
        gameStore.isGhostMode = false
        break
      case 'magnet':
        gameStore.hasMagnet = false
        gameStore.magnetRange = 0
        break
      case 'shield':
        gameStore.hasShield = false
        gameStore.shieldCharges = 0
        break
      case 'slow_time':
        gameStore.gameSpeed = 150 // 恢复默认速度
        break
      case 'invisibility':
        gameStore.isInvisible = false
        break
    }

    this.activePowerUps.delete(powerUpId)
    console.log(`道具效果结束: ${powerUp.type}`)
  }

  // 添加视觉效果
  addVisualEffect(type, data, duration) {
    // 这里可以触发视觉效果事件
    console.log(`添加视觉效果: ${type}`, data, `持续时间: ${duration}ms`)
  }

  // 获取道具定义
  getPowerUpDefinition(type) {
    return this.powerUpDefinitions.get(type)
  }

  // 获取所有道具定义
  getAllPowerUps() {
    return Array.from(this.powerUpDefinitions.values())
  }

  // 获取激活的道具
  getActivePowerUps() {
    return Array.from(this.activePowerUps.values())
  }

  // 清理所有道具效果
  clearAllEffects() {
    const gameStore = useGameStore()
    
    // 重置所有道具状态
    gameStore.isGhostMode = false
    gameStore.hasMagnet = false
    gameStore.hasShield = false
    gameStore.isInvisible = false
    gameStore.scoreMultiplier = 1
    gameStore.gameSpeed = 150
    
    this.activePowerUps.clear()
  }
}

// 创建单例实例
export const powerUpManager = new PowerUpManager()

export default powerUpManager
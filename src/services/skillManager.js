import { useGameStore } from '../stores/gameStore.js'
import { Position, Direction } from '../types/gameTypes.js'

// 技能系统管理器
export class SkillManager {
  constructor() {
    this.activeEffects = new Map()
    this.skillDefinitions = new Map()
    this.initializeSkills()
  }

  // 初始化技能定义
  initializeSkills() {
    // 冲刺技能
    this.skillDefinitions.set('dash', {
      id: 'dash',
      name: '瞬间冲刺',
      description: '快速向前移动3格距离，可穿过障碍物',
      icon: '⚡',
      cooldown: 15000,
      manaCost: 0,
      unlockLevel: 15,
      effect: this.dashEffect.bind(this)
    })

    // 护盾技能
    this.skillDefinitions.set('shield', {
      id: 'shield',
      name: '能量护盾',
      description: '获得临时护盾，免疫一次碰撞伤害',
      icon: '🛡️',
      cooldown: 30000,
      manaCost: 0,
      unlockLevel: 25,
      effect: this.shieldEffect.bind(this)
    })

    // 激光技能
    this.skillDefinitions.set('laser', {
      id: 'laser',
      name: '激光斩击',
      description: '发射激光穿透障碍物和敌人',
      icon: '🔥',
      cooldown: 45000,
      manaCost: 0,
      unlockLevel: 35,
      effect: this.laserEffect.bind(this)
    })

    // 时间减缓技能
    this.skillDefinitions.set('timeSlash', {
      id: 'timeSlash',
      name: '时间减缓',
      description: '周围时间减缓，敌人移动速度降低',
      icon: '⏰',
      cooldown: 60000,
      manaCost: 0,
      unlockLevel: 45,
      effect: this.timeSlashEffect.bind(this)
    })

    // 磁力技能
    this.skillDefinitions.set('magnet', {
      id: 'magnet',
      name: '磁力吸引',
      description: '吸引周围的食物和道具',
      icon: '🧲',
      cooldown: 25000,
      manaCost: 0,
      unlockLevel: 20,
      effect: this.magnetEffect.bind(this)
    })

    // 传送技能
    this.skillDefinitions.set('teleport', {
      id: 'teleport',
      name: '瞬间传送',
      description: '传送到地图的随机安全位置',
      icon: '🌀',
      cooldown: 35000,
      manaCost: 0,
      unlockLevel: 30,
      effect: this.teleportEffect.bind(this)
    })

    // 分身技能
    this.skillDefinitions.set('clone', {
      id: 'clone',
      name: '影分身',
      description: '创建一个短暂的分身干扰敌人',
      icon: '👥',
      cooldown: 50000,
      manaCost: 0,
      unlockLevel: 40,
      effect: this.cloneEffect.bind(this)
    })

    // 冰冻技能
    this.skillDefinitions.set('freeze', {
      id: 'freeze',
      name: '冰霜冻结',
      description: '冻结所有敌人3秒',
      icon: '❄️',
      cooldown: 55000,
      manaCost: 0,
      unlockLevel: 50,
      effect: this.freezeEffect.bind(this)
    })
  }

  // 使用技能
  useSkill(skillId) {
    const gameStore = useGameStore()
    const skillDef = this.skillDefinitions.get(skillId)
    
    if (!skillDef) {
      console.warn(`技能 ${skillId} 不存在`)
      return false
    }

    const skill = gameStore.skills[skillId]
    if (!skill || !skill.unlocked) {
      console.warn(`技能 ${skillId} 未解锁`)
      return false
    }

    if (skill.cooldown > 0) {
      console.warn(`技能 ${skillId} 冷却中`)
      return false
    }

    // 检查法力值消耗
    if (skillDef.manaCost > 0 && gameStore.mana < skillDef.manaCost) {
      console.warn(`法力值不足，需要 ${skillDef.manaCost}`)
      return false
    }

    // 执行技能效果
    try {
      skillDef.effect(gameStore)
      
      // 设置冷却时间
      skill.cooldown = skillDef.cooldown
      
      // 消耗法力值
      if (skillDef.manaCost > 0) {
        gameStore.mana = Math.max(0, gameStore.mana - skillDef.manaCost)
      }

      console.log(`使用技能: ${skillDef.name}`)
      return true
    } catch (error) {
      console.error(`技能 ${skillId} 执行失败:`, error)
      return false
    }
  }

  // 冲刺技能效果
  dashEffect(gameStore) {
    const snake = [...gameStore.snake]
    const direction = gameStore.direction
    const gridSize = gameStore.gridSize

    // 向前冲刺3格
    for (let i = 0; i < 3; i++) {
      const head = snake[0]
      const newHead = this.getNewPosition(head, direction, gridSize)
      
      // 检查边界
      if (this.isOutOfBounds(newHead, gridSize)) {
        break
      }
      
      snake.unshift(newHead)
      snake.pop()
    }

    gameStore.snake = snake
    
    // 添加视觉效果
    this.addEffect('dash', {
      type: 'dash_trail',
      duration: 500,
      positions: [...snake]
    })
  }

  // 护盾技能效果
  shieldEffect(gameStore) {
    this.addEffect('shield', {
      type: 'shield',
      duration: 5000,
      invulnerable: true
    })

    // 添加视觉护盾效果
    this.addVisualEffect('shield_aura', gameStore.snake[0], 5000)
  }

  // 激光技能效果
  laserEffect(gameStore) {
    const head = gameStore.snake[0]
    const direction = gameStore.direction
    const gridSize = gameStore.gridSize
    const laserPath = []

    // 计算激光路径
    let currentPos = head
    for (let i = 0; i < gridSize; i++) {
      currentPos = this.getNewPosition(currentPos, direction, gridSize)
      if (this.isOutOfBounds(currentPos, gridSize)) break
      laserPath.push(currentPos)
    }

    // 清除路径上的障碍物
    gameStore.obstacles = gameStore.obstacles.filter(obstacle => 
      !laserPath.includes(obstacle)
    )

    // 对敌人造成伤害
    this.dealDamageToEnemies(laserPath, gameStore)

    // 添加激光视觉效果
    this.addEffect('laser', {
      type: 'laser_beam',
      duration: 1000,
      path: laserPath,
      direction: direction
    })
  }

  // 时间减缓技能效果
  timeSlashEffect(gameStore) {
    this.addEffect('timeSlash', {
      type: 'time_slow',
      duration: 5000,
      slowFactor: 0.5
    })

    // 影响游戏速度
    const originalSpeed = gameStore.gameSpeed
    gameStore.gameSpeed = originalSpeed * 2 // 减慢速度

    setTimeout(() => {
      gameStore.gameSpeed = originalSpeed
    }, 5000)
  }

  // 磁力技能效果
  magnetEffect(gameStore) {
    const head = gameStore.snake[0]
    const magnetRange = 5
    const foods = []

    // 模拟磁力吸引附近的食物
    for (let i = 0; i < 3; i++) {
      const randomPos = this.getRandomNearbyPosition(head, magnetRange, gameStore.gridSize)
      if (randomPos && this.isPositionSafe(randomPos, gameStore)) {
        foods.push(randomPos)
      }
    }

    // 添加磁力视觉效果
    this.addEffect('magnet', {
      type: 'magnetic_field',
      duration: 3000,
      center: head,
      range: magnetRange,
      attractedItems: foods
    })
  }

  // 传送技能效果
  teleportEffect(gameStore) {
    const gridSize = gameStore.gridSize
    const snake = [...gameStore.snake]
    let newPosition

    // 寻找安全的传送位置
    for (let attempts = 0; attempts < 50; attempts++) {
      newPosition = Math.floor(Math.random() * (gridSize * gridSize))
      if (this.isPositionSafe(newPosition, gameStore)) {
        break
      }
    }

    if (newPosition && this.isPositionSafe(newPosition, gameStore)) {
      // 传送蛇头
      const offset = newPosition - snake[0]
      for (let i = 0; i < snake.length; i++) {
        snake[i] += offset
        // 确保传送后的位置在边界内
        if (this.isOutOfBounds(snake[i], gridSize)) {
          snake[i] = newPosition // fallback to head position
        }
      }

      gameStore.snake = snake

      // 添加传送视觉效果
      this.addEffect('teleport', {
        type: 'teleport_effect',
        duration: 1000,
        fromPosition: gameStore.snake[0],
        toPosition: newPosition
      })
    }
  }

  // 分身技能效果
  cloneEffect(gameStore) {
    const head = gameStore.snake[0]
    const clonePosition = this.getRandomNearbyPosition(head, 3, gameStore.gridSize)

    if (clonePosition) {
      this.addEffect('clone', {
        type: 'clone',
        duration: 8000,
        position: clonePosition,
        movement: 'random'
      })
    }
  }

  // 冰冻技能效果
  freezeEffect(gameStore) {
    this.addEffect('freeze', {
      type: 'freeze',
      duration: 3000,
      frozenEnemies: true
    })

    // 冻结AI蛇
    gameStore.aiGameOver = true
    setTimeout(() => {
      gameStore.aiGameOver = false
    }, 3000)
  }

  // 工具方法
  getNewPosition(position, direction, gridSize) {
    const row = Math.floor(position / gridSize)
    const col = position % gridSize

    switch (direction) {
      case Direction.UP:
        return Math.max(0, (row - 1) * gridSize + col)
      case Direction.DOWN:
        return Math.min(gridSize * gridSize - 1, (row + 1) * gridSize + col)
      case Direction.LEFT:
        return row * gridSize + Math.max(0, col - 1)
      case Direction.RIGHT:
        return row * gridSize + Math.min(gridSize - 1, col + 1)
      default:
        return position
    }
  }

  isOutOfBounds(position, gridSize) {
    const row = Math.floor(position / gridSize)
    const col = position % gridSize
    return row < 0 || row >= gridSize || col < 0 || col >= gridSize
  }

  isPositionSafe(position, gameStore) {
    return !gameStore.snake.includes(position) &&
           !gameStore.aiSnake.includes(position) &&
           !gameStore.obstacles.includes(position) &&
           position !== gameStore.food &&
           position !== gameStore.specialFood
  }

  getRandomNearbyPosition(centerPos, range, gridSize) {
    const row = Math.floor(centerPos / gridSize)
    const col = centerPos % gridSize

    const randomRow = Math.max(0, Math.min(gridSize - 1, 
      row + Math.floor(Math.random() * (range * 2 + 1)) - range))
    const randomCol = Math.max(0, Math.min(gridSize - 1, 
      col + Math.floor(Math.random() * (range * 2 + 1)) - range))

    return randomRow * gridSize + randomCol
  }

  dealDamageToEnemies(positions, gameStore) {
    // 检查激光是否击中敌人
    positions.forEach(pos => {
      if (gameStore.aiSnake.includes(pos)) {
        gameStore.aiGameOver = true
      }
    })
  }

  // 效果管理
  addEffect(skillId, effect) {
    effect.startTime = Date.now()
    effect.id = `${skillId}_${Date.now()}`
    this.activeEffects.set(effect.id, effect)

    // 自动清理过期效果
    setTimeout(() => {
      this.removeEffect(effect.id)
    }, effect.duration)
  }

  removeEffect(effectId) {
    this.activeEffects.delete(effectId)
  }

  addVisualEffect(type, position, duration) {
    // 添加视觉效果到游戏渲染系统
    console.log(`添加视觉效果: ${type} at ${position} for ${duration}ms`)
  }

  // 检查是否有特定效果激活
  hasEffect(effectType) {
    for (const effect of this.activeEffects.values()) {
      if (effect.type === effectType) {
        return true
      }
    }
    return false
  }

  // 获取激活的效果
  getActiveEffects() {
    return Array.from(this.activeEffects.values())
  }

  // 更新技能冷却
  updateCooldowns(deltaTime) {
    const gameStore = useGameStore()
    
    Object.keys(gameStore.skills).forEach(skillId => {
      const skill = gameStore.skills[skillId]
      if (skill.cooldown > 0) {
        skill.cooldown = Math.max(0, skill.cooldown - deltaTime)
      }
    })
  }

  // 解锁技能
  unlockSkill(skillId, level) {
    const gameStore = useGameStore()
    const skillDef = this.skillDefinitions.get(skillId)
    
    if (skillDef && level >= skillDef.unlockLevel) {
      if (!gameStore.skills[skillId]) {
        gameStore.skills[skillId] = {
          unlocked: false,
          cooldown: 0,
          maxCooldown: skillDef.cooldown
        }
      }
      gameStore.skills[skillId].unlocked = true
      console.log(`解锁技能: ${skillDef.name}`)
      return true
    }
    return false
  }

  // 获取技能信息
  getSkillInfo(skillId) {
    return this.skillDefinitions.get(skillId)
  }

  // 获取所有技能定义
  getAllSkills() {
    return Array.from(this.skillDefinitions.values())
  }

  // 清理所有效果
  clearAllEffects() {
    this.activeEffects.clear()
  }
}

// 创建单例实例
export const skillManager = new SkillManager()

export default skillManager
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useLevelStore = defineStore('level', () => {
  // 关卡基础数据
  const currentLevel = ref(1)
  const unlockedLevels = ref([1])
  const levelProgress = ref({})
  const dailyChallenges = ref([])
  const specialEvents = ref([])
  
  // 关卡配置缓存
  const levelConfigs = ref({})
  const levelCategories = ref([
    { id: 'tutorial', name: '新手教程', levels: [1, 2, 3] },
    { id: 'basic', name: '基础关卡', levels: Array.from({length: 15}, (_, i) => i + 4) },
    { id: 'advanced', name: '进阶关卡', levels: Array.from({length: 15}, (_, i) => i + 19) },
    { id: 'expert', name: '专家关卡', levels: Array.from({length: 20}, (_, i) => i + 34) },
    { id: 'master', name: '大师关卡', levels: Array.from({length: 20}, (_, i) => i + 54) },
    { id: 'legendary', name: '传奇关卡', levels: Array.from({length: 20}, (_, i) => i + 74) }
  ])
  
  // 成就系统
  const achievements = ref([])
  const unlockedAchievements = ref([])
  
  // 装备和道具
  const unlockedSkins = ref(['default'])
  const unlockedSkills = ref([])
  const inventory = ref({
    speedBoost: 0,
    shield: 0,
    doubleBold: 0,
    timeSlower: 0
  })
  
  // 关卡进行状态
  const currentObjectives = ref([])
  const completedObjectives = ref([])
  const levelTimer = ref(0)
  const levelStartTime = ref(0)
  
  // 计算属性
  const totalLevelsCompleted = computed(() => {
    return Object.values(levelProgress.value).filter(p => p.completed).length
  })
  
  const totalStarsEarned = computed(() => {
    return Object.values(levelProgress.value)
      .filter(p => p.completed)
      .reduce((total, p) => total + (p.stars || 0), 0)
  })
  
  const currentLevelCategory = computed(() => {
    return levelCategories.value.find(cat => 
      cat.levels.includes(currentLevel.value)
    )?.id || 'basic'
  })
  
  const nextUnlockLevel = computed(() => {
    const maxUnlocked = Math.max(...unlockedLevels.value)
    return maxUnlocked < 94 ? maxUnlocked + 1 : null
  })
  
  const levelCompletionRate = computed(() => {
    const completed = totalLevelsCompleted.value
    const available = unlockedLevels.value.length
    return available > 0 ? (completed / available) * 100 : 0
  })
  
  const canAccessLevel = computed(() => (levelId) => {
    return unlockedLevels.value.includes(levelId)
  })
  
  const getDifficultyByLevel = computed(() => (levelId) => {
    if (levelId <= 10) return 'easy'
    if (levelId <= 25) return 'medium'
    if (levelId <= 50) return 'hard'
    if (levelId <= 75) return 'expert'
    return 'master'
  })
  
  // 关卡配置生成
  const generateLevelConfig = (levelId) => {
    const difficulty = getDifficultyByLevel.value(levelId)
    
    const baseConfig = {
      id: levelId,
      name: `关卡 ${levelId}`,
      difficulty: difficulty,
      gridSize: 32,
      timeLimit: null,
      maxAttempts: null,
      background: getBackgroundByLevel(levelId),
      music: getMusicByLevel(levelId)
    }
    
    // 根据关卡ID生成不同的配置
    switch (true) {
      case levelId <= 3: // 教程关卡
        return {
          ...baseConfig,
          category: 'tutorial',
          objectives: generateTutorialObjectives(levelId),
          environment: generateTutorialEnvironment(levelId),
          rewards: generateTutorialRewards(levelId)
        }
        
      case levelId <= 18: // 基础关卡
        return {
          ...baseConfig,
          category: 'basic',
          objectives: generateBasicObjectives(levelId),
          environment: generateBasicEnvironment(levelId),
          rewards: generateBasicRewards(levelId)
        }
        
      case levelId <= 33: // 进阶关卡
        return {
          ...baseConfig,
          category: 'advanced',
          objectives: generateAdvancedObjectives(levelId),
          environment: generateAdvancedEnvironment(levelId),
          rewards: generateAdvancedRewards(levelId)
        }
        
      case levelId <= 53: // 专家关卡
        return {
          ...baseConfig,
          category: 'expert',
          objectives: generateExpertObjectives(levelId),
          environment: generateExpertEnvironment(levelId),
          rewards: generateExpertRewards(levelId),
          timeLimit: 300000 // 5分钟限制
        }
        
      case levelId <= 73: // 大师关卡
        return {
          ...baseConfig,
          category: 'master',
          objectives: generateMasterObjectives(levelId),
          environment: generateMasterEnvironment(levelId),
          rewards: generateMasterRewards(levelId),
          timeLimit: 240000 // 4分钟限制
        }
        
      default: // 传奇关卡
        return {
          ...baseConfig,
          category: 'legendary',
          objectives: generateLegendaryObjectives(levelId),
          environment: generateLegendaryEnvironment(levelId),
          rewards: generateLegendaryRewards(levelId),
          timeLimit: 180000 // 3分钟限制
        }
    }
  }
  
  // 目标生成函数
  const generateTutorialObjectives = (levelId) => {
    const objectives = [
      { type: 'score', target: 50 * levelId, description: `获得 ${50 * levelId} 分`, required: true },
      { type: 'length', target: 5 + levelId, description: `蛇身长度达到 ${5 + levelId}`, required: true }
    ]
    
    if (levelId === 3) {
      objectives.push({ type: 'power_up', target: 1, description: '使用1个道具', required: true })
    }
    
    return objectives
  }
  
  const generateBasicObjectives = (levelId) => {
    return [
      { type: 'score', target: 100 * levelId, description: `获得 ${100 * levelId} 分`, required: true },
      { type: 'length', target: 8 + Math.floor(levelId / 3), description: `蛇身长度达到 ${8 + Math.floor(levelId / 3)}`, required: false },
      { type: 'time', target: 120, description: '在2分钟内完成', required: false }
    ]
  }
  
  const generateAdvancedObjectives = (levelId) => {
    return [
      { type: 'score', target: 200 * levelId, description: `获得 ${200 * levelId} 分`, required: true },
      { type: 'survival', target: 180, description: '存活3分钟', required: true },
      { type: 'special_food', target: 3, description: '吃掉3个特殊食物', required: false }
    ]
  }
  
  const generateExpertObjectives = (levelId) => {
    return [
      { type: 'score', target: 500 * levelId, description: `获得 ${500 * levelId} 分`, required: true },
      { type: 'no_walls', target: 1, description: '不能撞墙', required: true },
      { type: 'perfect_run', target: 1, description: '完美通关(不失误)', required: false }
    ]
  }
  
  const generateMasterObjectives = (levelId) => {
    return [
      { type: 'score', target: 1000 * levelId, description: `获得 ${1000 * levelId} 分`, required: true },
      { type: 'speed_run', target: 180, description: '3分钟内通关', required: true },
      { type: 'combo', target: 10, description: '连续吃掉10个食物', required: false }
    ]
  }
  
  const generateLegendaryObjectives = (levelId) => {
    return [
      { type: 'score', target: 2000 * levelId, description: `获得 ${2000 * levelId} 分`, required: true },
      { type: 'legendary_task', target: 1, description: '完成传奇任务', required: true },
      { type: 'flawless', target: 1, description: '零失误通关', required: false }
    ]
  }
  
  // 环境生成函数
  const generateTutorialEnvironment = (levelId) => {
    return {
      obstacles: [],
      powerUps: levelId === 3 ? [{ type: 'speed', position: 200 }] : [],
      specialElements: [],
      dynamicEvents: []
    }
  }
  
  const generateBasicEnvironment = (levelId) => {
    const obstacleCount = Math.floor(levelId / 3)
    const obstacles = []
    
    for (let i = 0; i < obstacleCount; i++) {
      obstacles.push({
        type: 'wall',
        position: Math.floor(Math.random() * 1024),
        pattern: 'single'
      })
    }
    
    return {
      obstacles,
      powerUps: [{ type: 'speed', position: Math.floor(Math.random() * 1024) }],
      specialElements: [],
      dynamicEvents: []
    }
  }
  
  const generateAdvancedEnvironment = (levelId) => {
    const obstacleCount = 5 + Math.floor(levelId / 2)
    const obstacles = []
    
    for (let i = 0; i < obstacleCount; i++) {
      obstacles.push({
        type: 'wall',
        position: Math.floor(Math.random() * 1024),
        pattern: i % 3 === 0 ? 'cross' : 'single'
      })
    }
    
    return {
      obstacles,
      powerUps: [
        { type: 'speed', position: Math.floor(Math.random() * 1024) },
        { type: 'double', position: Math.floor(Math.random() * 1024) }
      ],
      specialElements: [{ type: 'teleporter', positions: [100, 900] }],
      dynamicEvents: [{ type: 'moving_wall', interval: 5000 }]
    }
  }
  
  const generateExpertEnvironment = (levelId) => {
    return {
      obstacles: generateComplexObstacles(10 + levelId),
      powerUps: generateRandomPowerUps(3),
      specialElements: [
        { type: 'teleporter', positions: [100, 200, 800, 900] },
        { type: 'gravity_field', position: 500 }
      ],
      dynamicEvents: [
        { type: 'moving_wall', interval: 4000 },
        { type: 'shrinking_border', delay: 60000 }
      ]
    }
  }
  
  const generateMasterEnvironment = (levelId) => {
    return {
      obstacles: generateComplexObstacles(15 + levelId),
      powerUps: generateRandomPowerUps(2),
      specialElements: [
        { type: 'portal_network', positions: [50, 250, 450, 650, 850] },
        { type: 'laser_grid', pattern: 'rotating' }
      ],
      dynamicEvents: [
        { type: 'earthquake', interval: 30000 },
        { type: 'food_rain', interval: 45000 },
        { type: 'time_distortion', interval: 60000 }
      ]
    }
  }
  
  const generateLegendaryEnvironment = (levelId) => {
    return {
      obstacles: generateLegendaryObstacles(levelId),
      powerUps: generateRandomPowerUps(1),
      specialElements: [
        { type: 'chaos_zone', area: [400, 600] },
        { type: 'mirror_dimension', trigger: 'score_threshold' }
      ],
      dynamicEvents: [
        { type: 'reality_shift', interval: 20000 },
        { type: 'temporal_storm', interval: 40000 },
        { type: 'dimensional_rift', interval: 80000 }
      ]
    }
  }
  
  // 奖励生成函数
  const generateTutorialRewards = (levelId) => {
    return [
      { type: 'experience', amount: 10 * levelId },
      { type: 'coins', amount: 5 * levelId }
    ]
  }
  
  const generateBasicRewards = (levelId) => {
    const rewards = [
      { type: 'experience', amount: 25 * levelId },
      { type: 'coins', amount: 15 * levelId }
    ]
    
    if (levelId % 5 === 0) {
      rewards.push({ type: 'skin', id: `basic_skin_${Math.floor(levelId / 5)}` })
    }
    
    return rewards
  }
  
  const generateAdvancedRewards = (levelId) => {
    const rewards = [
      { type: 'experience', amount: 50 * levelId },
      { type: 'coins', amount: 30 * levelId }
    ]
    
    if (levelId % 3 === 0) {
      rewards.push({ type: 'skill', id: 'dash' })
    }
    
    return rewards
  }
  
  const generateExpertRewards = (levelId) => {
    return [
      { type: 'experience', amount: 100 * levelId },
      { type: 'coins', amount: 75 * levelId },
      { type: 'skill', id: 'shield' },
      { type: 'achievement', id: `expert_level_${levelId}` }
    ]
  }
  
  const generateMasterRewards = (levelId) => {
    return [
      { type: 'experience', amount: 200 * levelId },
      { type: 'coins', amount: 150 * levelId },
      { type: 'skin', id: `master_skin_${levelId}` },
      { type: 'title', id: `master_level_${levelId}` }
    ]
  }
  
  const generateLegendaryRewards = (levelId) => {
    return [
      { type: 'experience', amount: 500 * levelId },
      { type: 'coins', amount: 400 * levelId },
      { type: 'legendary_skin', id: `legendary_${levelId}` },
      { type: 'legendary_title', id: `legend_${levelId}` },
      { type: 'special_power', id: `chaos_${levelId}` }
    ]
  }
  
  // 工具函数
  const getBackgroundByLevel = (levelId) => {
    if (levelId <= 20) return 'forest'
    if (levelId <= 40) return 'desert'
    if (levelId <= 60) return 'ocean'
    if (levelId <= 80) return 'space'
    return 'chaos'
  }
  
  const getMusicByLevel = (levelId) => {
    if (levelId <= 20) return 'peaceful'
    if (levelId <= 40) return 'adventure'
    if (levelId <= 60) return 'intense'
    if (levelId <= 80) return 'epic'
    return 'legendary'
  }
  
  const generateComplexObstacles = (count) => {
    const obstacles = []
    const patterns = ['single', 'line', 'cross', 'spiral', 'maze']
    
    for (let i = 0; i < count; i++) {
      obstacles.push({
        type: 'wall',
        position: Math.floor(Math.random() * 1024),
        pattern: patterns[Math.floor(Math.random() * patterns.length)]
      })
    }
    
    return obstacles
  }
  
  const generateLegendaryObstacles = (levelId) => {
    return [
      { type: 'chaos_wall', pattern: 'shifting', count: 5 },
      { type: 'void_zones', pattern: 'random', count: 3 },
      { type: 'temporal_barriers', pattern: 'phasing', count: 4 }
    ]
  }
  
  const generateRandomPowerUps = (count) => {
    const powerUpTypes = ['speed', 'double', 'shield', 'ghost', 'magnet']
    const powerUps = []
    
    for (let i = 0; i < count; i++) {
      powerUps.push({
        type: powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)],
        position: Math.floor(Math.random() * 1024)
      })
    }
    
    return powerUps
  }
  
  // 主要方法
  const getLevelConfig = (levelId) => {
    if (!levelConfigs.value[levelId]) {
      levelConfigs.value[levelId] = generateLevelConfig(levelId)
    }
    return levelConfigs.value[levelId]
  }
  
  const setCurrentLevel = (levelId) => {
    if (canAccessLevel.value(levelId)) {
      currentLevel.value = levelId
      return true
    }
    return false
  }
  
  const startLevel = (levelId) => {
    const config = getLevelConfig(levelId)
    currentLevel.value = levelId
    currentObjectives.value = [...config.objectives]
    completedObjectives.value = []
    levelStartTime.value = Date.now()
    levelTimer.value = 0
    
    return config
  }
  
  const completeObjective = (objectiveType, value = 1) => {
    const objective = currentObjectives.value.find(obj => 
      obj.type === objectiveType && !completedObjectives.value.includes(obj)
    )
    
    if (objective) {
      objective.progress = (objective.progress || 0) + value
      if (objective.progress >= objective.target) {
        completedObjectives.value.push(objective)
        return true
      }
    }
    return false
  }
  
  const completeLevel = (levelId, score = 0, timeElapsed = 0) => {
    const requiredCompleted = completedObjectives.value.filter(obj => obj.required).length
    const totalRequired = currentObjectives.value.filter(obj => obj.required).length
    
    if (requiredCompleted < totalRequired) {
      return false // 未完成必需目标
    }
    
    const stars = calculateStars(levelId, score, timeElapsed)
    
    levelProgress.value[levelId] = {
      completed: true,
      stars: Math.max(stars, levelProgress.value[levelId]?.stars || 0),
      bestScore: Math.max(score, levelProgress.value[levelId]?.bestScore || 0),
      bestTime: Math.min(timeElapsed, levelProgress.value[levelId]?.bestTime || Infinity),
      completedAt: new Date().toISOString(),
      objectives: [...completedObjectives.value]
    }
    
    // 解锁下一关
    if (levelId < 94 && !unlockedLevels.value.includes(levelId + 1)) {
      unlockedLevels.value.push(levelId + 1)
      unlockedLevels.value.sort((a, b) => a - b)
    }
    
    // 检查成就解锁
    checkAchievements()
    
    saveProgress()
    return true
  }
  
  const calculateStars = (levelId, score, timeElapsed) => {
    const config = getLevelConfig(levelId)
    let stars = 1 // 基础完成1星
    
    // 根据完成的目标数量增加星星
    const optionalCompleted = completedObjectives.value.filter(obj => !obj.required).length
    const totalOptional = currentObjectives.value.filter(obj => !obj.required).length
    
    if (optionalCompleted >= totalOptional * 0.5) stars = 2
    if (optionalCompleted >= totalOptional) stars = 3
    
    return stars
  }
  
  const unlockLevel = (levelId) => {
    if (!unlockedLevels.value.includes(levelId)) {
      unlockedLevels.value.push(levelId)
      unlockedLevels.value.sort((a, b) => a - b)
      saveProgress()
    }
  }
  
  const checkAchievements = () => {
    // 检查各种成就条件
    const totalStars = totalStarsEarned.value
    const levelsCompleted = totalLevelsCompleted.value
    
    // 星星成就
    if (totalStars >= 50 && !unlockedAchievements.value.includes('star_collector_50')) {
      unlockAchievement('star_collector_50')
    }
    
    // 关卡完成成就
    if (levelsCompleted >= 25 && !unlockedAchievements.value.includes('level_master_25')) {
      unlockAchievement('level_master_25')
    }
  }
  
  const unlockAchievement = (achievementId) => {
    if (!unlockedAchievements.value.includes(achievementId)) {
      unlockedAchievements.value.push(achievementId)
      saveProgress()
    }
  }
  
  const saveProgress = () => {
    localStorage.setItem('levelProgress', JSON.stringify(levelProgress.value))
    localStorage.setItem('unlockedLevels', JSON.stringify(unlockedLevels.value))
    localStorage.setItem('unlockedAchievements', JSON.stringify(unlockedAchievements.value))
    localStorage.setItem('unlockedSkins', JSON.stringify(unlockedSkins.value))
    localStorage.setItem('unlockedSkills', JSON.stringify(unlockedSkills.value))
  }
  
  const loadProgress = () => {
    const savedProgress = localStorage.getItem('levelProgress')
    if (savedProgress) {
      levelProgress.value = JSON.parse(savedProgress)
    }
    
    const savedLevels = localStorage.getItem('unlockedLevels')
    if (savedLevels) {
      unlockedLevels.value = JSON.parse(savedLevels)
    }
    
    const savedAchievements = localStorage.getItem('unlockedAchievements')
    if (savedAchievements) {
      unlockedAchievements.value = JSON.parse(savedAchievements)
    }
    
    const savedSkins = localStorage.getItem('unlockedSkins')
    if (savedSkins) {
      unlockedSkins.value = JSON.parse(savedSkins)
    }
    
    const savedSkills = localStorage.getItem('unlockedSkills')
    if (savedSkills) {
      unlockedSkills.value = JSON.parse(savedSkills)
    }
  }
  
  return {
    // 状态
    currentLevel,
    unlockedLevels,
    levelProgress,
    dailyChallenges,
    specialEvents,
    levelConfigs,
    levelCategories,
    achievements,
    unlockedAchievements,
    unlockedSkins,
    unlockedSkills,
    inventory,
    currentObjectives,
    completedObjectives,
    levelTimer,
    levelStartTime,
    
    // 计算属性
    totalLevelsCompleted,
    totalStarsEarned,
    currentLevelCategory,
    nextUnlockLevel,
    levelCompletionRate,
    canAccessLevel,
    getDifficultyByLevel,
    
    // 方法
    getLevelConfig,
    setCurrentLevel,
    startLevel,
    completeObjective,
    completeLevel,
    unlockLevel,
    unlockAchievement,
    saveProgress,
    loadProgress
  }
})
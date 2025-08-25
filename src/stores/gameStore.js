import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useGameStore = defineStore('game', () => {
  // 游戏基础状态
  const isPlaying = ref(false)
  const gameMode = ref('single') // 'single', 'multiplayer', 'level'
  const difficulty = ref('medium') // 'easy', 'medium', 'hard'
  const currentLevel = ref(1)
  const score = ref(0)
  const gameOver = ref(false)
  
  // 游戏配置
  const gridSize = ref(32)
  const gameSpeed = ref(150)
  
  // 蛇的状态
  const snake = ref([])
  const direction = ref('right')
  
  // 食物和障碍物
  const food = ref(-1)
  const obstacles = ref([])
  const specialFood = ref(-1)
  const specialFoodType = ref('')
  
  // AI蛇状态
  const aiSnake = ref([])
  const aiDirection = ref('left')
  const aiScore = ref(0)
  const aiGameOver = ref(false)
  
  // 多人游戏状态
  const playerId = ref('')
  const roomId = ref('')
  const players = ref([])
  const isHost = ref(false)
  const isConnected = ref(false)
  
  // 关卡系统状态
  const unlockedLevels = ref([1])
  const levelProgress = ref({})
  const achievements = ref([])
  
  // 技能系统状态
  const skills = ref({
    dash: { unlocked: false, cooldown: 0, maxCooldown: 15000 },
    shield: { unlocked: false, cooldown: 0, maxCooldown: 30000 },
    laser: { unlocked: false, cooldown: 0, maxCooldown: 45000 },
    timeSlash: { unlocked: false, cooldown: 0, maxCooldown: 60000 }
  })
  
  const activePowerUps = ref([])
  
  // 音效设置
  const soundEnabled = ref(true)
  const soundVolume = ref(0.5)
  
  // 游戏统计
  const gameStats = ref({
    gamesPlayed: 0,
    highScore: 0,
    totalScore: 0,
    longestSnake: 0,
    levelsCompleted: 0,
    multiplayerWins: 0,
    multiplayerLosses: 0
  })
  
  // 计算属性
  const cells = computed(() => Array(gridSize.value * gridSize.value).fill(0))
  
  const playerRank = computed(() => {
    if (players.value.length === 0) return 1
    const sortedPlayers = [...players.value].sort((a, b) => b.score - a.score)
    return sortedPlayers.findIndex(p => p.id === playerId.value) + 1
  })
  
  const isLevelCompleted = computed(() => {
    return (level) => levelProgress.value[level]?.completed || false
  })
  
  const availableSkills = computed(() => {
    return Object.entries(skills.value)
      .filter(([_, skill]) => skill.unlocked && skill.cooldown === 0)
      .map(([name, _]) => name)
  })
  
  // Actions
  const setDifficulty = (level) => {
    difficulty.value = level
    switch(level) {
      case 'easy':
        gameSpeed.value = 200
        break
      case 'medium':
        gameSpeed.value = 150
        break
      case 'hard':
        gameSpeed.value = 100
        break
    }
  }
  
  const setGameMode = (mode) => {
    gameMode.value = mode
  }
  
  const startGame = () => {
    isPlaying.value = true
    gameOver.value = false
    score.value = 0
    snake.value = []
    direction.value = 'right'
    food.value = -1
    obstacles.value = []
    specialFood.value = -1
    specialFoodType.value = ''
  }
  
  const endGame = () => {
    isPlaying.value = false
    gameOver.value = true
    updateGameStats()
  }
  
  const resetGame = () => {
    isPlaying.value = false
    gameOver.value = false
    score.value = 0
    snake.value = []
    direction.value = 'right'
    food.value = -1
    obstacles.value = []
    specialFood.value = -1
    specialFoodType.value = ''
    aiSnake.value = []
    aiDirection.value = 'left'
    aiScore.value = 0
    aiGameOver.value = false
  }
  
  const updateScore = (points) => {
    score.value += points
  }
  
  const updateGameStats = () => {
    gameStats.value.gamesPlayed++
    gameStats.value.totalScore += score.value
    
    if (score.value > gameStats.value.highScore) {
      gameStats.value.highScore = score.value
    }
    
    if (snake.value.length > gameStats.value.longestSnake) {
      gameStats.value.longestSnake = snake.value.length
    }
    
    saveStatsToLocalStorage()
  }
  
  const unlockLevel = (level) => {
    if (!unlockedLevels.value.includes(level)) {
      unlockedLevels.value.push(level)
      unlockedLevels.value.sort((a, b) => a - b)
    }
  }
  
  const completLevel = (level, stars = 1) => {
    levelProgress.value[level] = {
      completed: true,
      stars: Math.max(stars, levelProgress.value[level]?.stars || 0),
      bestScore: Math.max(score.value, levelProgress.value[level]?.bestScore || 0),
      completedAt: new Date().toISOString()
    }
    
    // 解锁下一关
    if (level + 1 <= 100) {
      unlockLevel(level + 1)
    }
    
    gameStats.value.levelsCompleted++
    saveStatsToLocalStorage()
  }
  
  const useSkill = (skillName) => {
    if (skills.value[skillName] && skills.value[skillName].unlocked && skills.value[skillName].cooldown === 0) {
      skills.value[skillName].cooldown = skills.value[skillName].maxCooldown
      return true
    }
    return false
  }
  
  const updateSkillCooldowns = (deltaTime) => {
    Object.keys(skills.value).forEach(skillName => {
      if (skills.value[skillName].cooldown > 0) {
        skills.value[skillName].cooldown = Math.max(0, skills.value[skillName].cooldown - deltaTime)
      }
    })
  }
  
  const addPowerUp = (powerUp) => {
    activePowerUps.value.push({
      ...powerUp,
      startTime: Date.now()
    })
  }
  
  const removePowerUp = (powerUpId) => {
    activePowerUps.value = activePowerUps.value.filter(p => p.id !== powerUpId)
  }
  
  const toggleSound = () => {
    soundEnabled.value = !soundEnabled.value
  }
  
  const setSoundVolume = (volume) => {
    soundVolume.value = volume
  }
  
  // 多人游戏相关方法
  const setPlayerId = (id) => {
    playerId.value = id
  }
  
  const setRoomId = (id) => {
    roomId.value = id
  }
  
  const setPlayers = (playerList) => {
    players.value = playerList
  }
  
  const addPlayer = (player) => {
    const existingIndex = players.value.findIndex(p => p.id === player.id)
    if (existingIndex !== -1) {
      players.value[existingIndex] = player
    } else {
      players.value.push(player)
    }
  }
  
  const removePlayer = (playerId) => {
    players.value = players.value.filter(p => p.id !== playerId)
  }
  
  const setConnectionStatus = (status) => {
    isConnected.value = status
  }
  
  const setHostStatus = (status) => {
    isHost.value = status
  }
  
  // 持久化相关
  const saveStatsToLocalStorage = () => {
    localStorage.setItem('snakeGameStats', JSON.stringify(gameStats.value))
    localStorage.setItem('snakeLevelProgress', JSON.stringify(levelProgress.value))
    localStorage.setItem('snakeUnlockedLevels', JSON.stringify(unlockedLevels.value))
    localStorage.setItem('snakeAchievements', JSON.stringify(achievements.value))
  }
  
  const loadStatsFromLocalStorage = () => {
    const savedStats = localStorage.getItem('snakeGameStats')
    if (savedStats) {
      gameStats.value = { ...gameStats.value, ...JSON.parse(savedStats) }
    }
    
    const savedProgress = localStorage.getItem('snakeLevelProgress')
    if (savedProgress) {
      levelProgress.value = JSON.parse(savedProgress)
    }
    
    const savedLevels = localStorage.getItem('snakeUnlockedLevels')
    if (savedLevels) {
      unlockedLevels.value = JSON.parse(savedLevels)
    }
    
    const savedAchievements = localStorage.getItem('snakeAchievements')
    if (savedAchievements) {
      achievements.value = JSON.parse(savedAchievements)
    }
  }
  
  // 初始化
  const init = () => {
    loadStatsFromLocalStorage()
  }
  
  return {
    // 状态
    isPlaying,
    gameMode,
    difficulty,
    currentLevel,
    score,
    gameOver,
    gridSize,
    gameSpeed,
    snake,
    direction,
    food,
    obstacles,
    specialFood,
    specialFoodType,
    aiSnake,
    aiDirection,
    aiScore,
    aiGameOver,
    playerId,
    roomId,
    players,
    isHost,
    isConnected,
    unlockedLevels,
    levelProgress,
    achievements,
    skills,
    activePowerUps,
    soundEnabled,
    soundVolume,
    gameStats,
    
    // 计算属性
    cells,
    playerRank,
    isLevelCompleted,
    availableSkills,
    
    // 方法
    setDifficulty,
    setGameMode,
    startGame,
    endGame,
    resetGame,
    updateScore,
    updateGameStats,
    unlockLevel,
    completLevel,
    useSkill,
    updateSkillCooldowns,
    addPowerUp,
    removePowerUp,
    toggleSound,
    setSoundVolume,
    setPlayerId,
    setRoomId,
    setPlayers,
    addPlayer,
    removePlayer,
    setConnectionStatus,
    setHostStatus,
    saveStatsToLocalStorage,
    loadStatsFromLocalStorage,
    init
  }
})
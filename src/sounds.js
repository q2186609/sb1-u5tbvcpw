// 音效管理模块
const sounds = {
  move: new Audio('/sounds/move.mp3'),
  eat: new Audio('/sounds/eat.mp3'),
  special: new Audio('/sounds/special.mp3'),
  collision: new Audio('/sounds/collision.mp3'),
  gameStart: new Audio('/sounds/game-start.mp3')
}

// 音量控制
const setVolume = (volume) => {
  Object.values(sounds).forEach(sound => {
    sound.volume = volume
  })
}

// 默认音量设置
setVolume(0.5)

// 播放音效函数
const playSound = (soundName) => {
  if (sounds[soundName]) {
    sounds[soundName].currentTime = 0 // 重置音频
    sounds[soundName].play().catch(e => console.error('音频播放失败:', e))
  }
}

export { sounds, setVolume, playSound }
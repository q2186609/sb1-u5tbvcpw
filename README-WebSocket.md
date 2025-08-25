# Snake Game WebSocket 服务器

## 🚀 快速开始

### 方法1：一键启动前后端
```bash
npm run start:all
```

### 方法2：分别启动

#### 启动后端服务器
```bash
# 使用脚本启动
./start-server.sh

# 或者手动启动
cd server
npm install
npm run dev
```

#### 启动前端
```bash
npm run dev
```

## 📋 服务器信息

- **WebSocket端口**: 3001
- **WebSocket地址**: `ws://localhost:3001`
- **前端地址**: `http://localhost:5173`

## 🎮 功能特性

### ✅ 已实现功能

#### 🏠 房间管理
- 创建房间（公开/私密）
- 加入房间（支持密码）
- 离开房间
- 房主权限转移
- 实时房间列表更新

#### 🔍 智能匹配
- 快速匹配系统
- 按游戏模式匹配
- 按技能等级匹配
- 匹配进度显示
- 取消匹配功能

#### 👥 玩家管理
- 玩家上线/下线通知
- 在线玩家列表
- 玩家状态同步
- 玩家统计数据

#### 💬 实时通信
- 房间内聊天
- 大厅聊天
- 系统消息通知
- 消息历史记录

#### 🎯 游戏同步
- 实时游戏状态同步
- 玩家动作广播
- 游戏会话管理
- 断线重连机制

## 🔧 配置说明

### 服务器配置
服务器支持以下环境变量：
- `PORT`: 服务器端口（默认：3001）
- `NODE_ENV`: 运行环境（development/production）

### CORS配置
服务器已配置允许以下域名访问：
- `http://localhost:5173`
- `http://127.0.0.1:5173`

## 📡 API事件

### 客户端发送事件

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `player_init` | `{name, level, avatar}` | 初始化玩家 |
| `create_room` | `{name, gameMode, maxPlayers, isPrivate, password}` | 创建房间 |
| `join_room` | `{roomId, password}` | 加入房间 |
| `leave_room` | - | 离开房间 |
| `start_quick_match` | `{gameMode}` | 开始快速匹配 |
| `cancel_quick_match` | - | 取消匹配 |
| `chat_message` | `{message, roomId}` | 发送聊天消息 |
| `get_room_list` | - | 获取房间列表 |
| `get_online_players` | - | 获取在线玩家 |

### 服务器发送事件

| 事件名 | 数据 | 描述 |
|--------|------|------|
| `player_initialized` | `{player, onlinePlayers, rooms}` | 玩家初始化完成 |
| `room_created` | `{room}` | 房间创建成功 |
| `room_joined` | `{room}` | 加入房间成功 |
| `player_joined` | `{player, room}` | 有玩家加入房间 |
| `player_left` | `{playerId, playerName, room}` | 有玩家离开房间 |
| `match_found` | `{room}` | 找到匹配 |
| `matchmaking_started` | `{gameMode, queuePosition}` | 开始匹配 |
| `room_list_updated` | `{rooms}` | 房间列表更新 |
| `chat_message` | `{id, playerId, playerName, message, timestamp}` | 聊天消息 |

## 🛠️ 开发信息

### 技术栈
- **后端**: Node.js + Express + Socket.io
- **前端**: Vue 3 + Socket.io-client

### 项目结构
```
server/
├── package.json      # 服务端依赖配置
├── server.js          # 主服务器文件
└── node_modules/      # 服务端依赖

src/services/
└── socketService.js   # 前端Socket.io客户端服务
```

### 日志说明
服务器会输出详细的连接和操作日志：
- 🔗 玩家连接/断开
- 🏠 房间创建/加入/离开
- 🔍 匹配开始/完成
- 💬 聊天消息
- ❌ 错误信息

## 🔒 安全特性

1. **CORS保护**: 只允许指定域名访问
2. **房间密码**: 支持私密房间密码保护
3. **输入验证**: 服务器验证所有输入数据
4. **连接管理**: 自动清理断开的连接
5. **错误处理**: 完善的错误处理和用户提示

## 🐛 故障排除

### 常见问题

1. **连接失败**
   - 检查服务器是否启动（端口3001）
   - 检查防火墙设置
   - 确认WebSocket端口未被占用

2. **匹配不到玩家**
   - 确保有其他玩家在线
   - 检查游戏模式是否匹配
   - 等待匹配队列处理（3秒一次）

3. **房间加入失败**
   - 检查房间是否存在
   - 确认密码正确（私密房间）
   - 检查房间是否已满

### 调试模式
启用调试日志：
```bash
DEBUG=socket.io* npm run dev
```

## 🔄 版本说明

**当前版本**: 1.0.0

### 更新日志
- ✅ 完整的WebSocket服务器实现
- ✅ 房间管理系统
- ✅ 智能匹配系统
- ✅ 实时聊天功能
- ✅ 玩家状态同步
- ✅ 断线重连机制

## 📞 技术支持

如果遇到问题，请检查：
1. Node.js版本 >= 14.0.0
2. 端口3001是否被占用
3. 网络连接是否正常
4. 浏览器控制台是否有错误信息
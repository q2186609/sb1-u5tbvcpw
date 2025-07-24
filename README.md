# Vue Snake Game

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/q2186609/sb1-u5tbvcpw)

## 项目介绍

这是一个基于Vue 3开发的贪吃蛇游戏，具有现代化的界面设计和AI对战功能。游戏采用了响应式设计，使用Tailwind CSS进行样式管理，通过Vite构建工具实现快速开发和构建。

## 功能特点

- 经典贪吃蛇游戏玩法
- 玩家与AI对战模式
- 随机生成的障碍物增加游戏难度
- 实时分数显示
- 响应式游戏界面
- 使用键盘方向键或WASD控制蛇的移动

## 技术栈

- **前端框架**: Vue 3.3.4
- **构建工具**: Vite 4.4.0
- **CSS框架**: Tailwind CSS 3.3.2
- **开发语言**: JavaScript
- **包管理器**: npm

## 项目结构

```
├── src/                # 源代码目录
│   ├── App.vue        # 主要游戏组件
│   ├── main.js        # 应用入口文件
│   └── style.css      # 全局样式文件
├── public/            # 静态资源目录
├── index.html         # HTML入口文件
├── vite.config.js     # Vite配置文件
├── package.json       # 项目依赖配置
└── README.md          # 项目说明文档
```

## 安装与运行

### 前提条件

- Node.js (推荐v14.0.0以上)
- npm或yarn包管理器

### 安装步骤

1. 克隆仓库或下载源码

```bash
git clone https://github.com/q2186609/sb1-u5tbvcpw.git
cd sb1-u5tbvcpw
```

2. 安装依赖

```bash
npm install
# 或
yarn install
```

3. 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

4. 构建生产版本

```bash
npm run build
# 或
yarn build
```

## 游戏玩法

1. 点击"Start Game"按钮开始游戏
2. 使用键盘方向键或WASD键控制蛇的移动
3. 吃到红色食物可以增加分数和蛇的长度
4. 避开灰色障碍物、自己的身体以及AI蛇
5. 游戏结束条件：撞到障碍物、自己的身体或AI蛇

## AI对战机制

游戏中的AI蛇会自动寻找食物并避开障碍物。AI使用简单的寻路算法，优先选择朝向食物的方向移动，同时避免碰撞。当无法找到安全路径时，AI会选择具有最多开放相邻单元格的方向移动。

## 版本信息

- 当前版本: 0.0.0 (开发中)
- 最后更新: 2023年

## 浏览器兼容性

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 贡献指南

欢迎提交问题报告和功能请求。如果您想贡献代码，请遵循以下步骤：

1. Fork 仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 Pull Request

## 许可证

[MIT](https://opensource.org/licenses/MIT)

## 致谢

- Vue.js团队提供的优秀框架
- Tailwind CSS团队提供的CSS框架
- Vite团队提供的构建工具
- StackBlitz提供的在线开发环境

        
#!/bin/bash

echo "🚀 启动 Snake Game 服务端..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装"
    echo "请先安装 Node.js (v14.0.0+)"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: npm 未安装"
    exit 1
fi

# 进入服务端目录
cd "$(dirname "$0")/server"

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装服务端依赖..."
    npm install
fi

# 启动服务器
echo "🎮 启动 WebSocket 服务器..."
npm run dev
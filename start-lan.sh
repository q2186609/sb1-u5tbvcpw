#!/bin/bash

# 贪吃蛇游戏局域网启动脚本
# 本脚本将启动前端和后端服务，支持局域网访问

echo "🐍 正在启动贪吃蛇游戏服务（局域网模式）..."

# 获取本地IP地址
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

if [ -z "$LOCAL_IP" ]; then
    echo "❌ 无法获取本地IP地址"
    exit 1
fi

echo "🌐 本地IP地址: $LOCAL_IP"

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo "📦 正在安装服务器依赖..."
    cd server && npm install && cd ..
fi

# 启动后端服务器
echo "🚀 正在启动后端服务器..."
cd server
npm start &
SERVER_PID=$!
cd ..

# 等待服务器启动
sleep 3

# 启动前端开发服务器
echo "🎮 正在启动前端开发服务器..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ 服务启动完成！"
echo ""
echo "📱 本地访问地址:"
echo "   http://localhost:5173"
echo "   http://127.0.0.1:5173"
echo ""
echo "🌐 局域网访问地址:"
echo "   http://$LOCAL_IP:5173"
echo ""
echo "🔗 WebSocket服务器:"
echo "   ws://$LOCAL_IP:3001"
echo ""
echo "💡 其他设备可以通过以下地址访问游戏:"
echo "   http://$LOCAL_IP:5173"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 清理函数
cleanup() {
    echo ""
    echo "🛑 正在停止服务..."
    kill $SERVER_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ 服务已停止"
    exit 0
}

# 捕获 Ctrl+C 信号
trap cleanup SIGINT

# 等待进程结束
wait
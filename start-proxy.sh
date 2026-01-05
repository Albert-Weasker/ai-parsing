#!/bin/bash

# 代理服务器启动脚本 (Mac/Linux)
# 在本地 9872 端口启动代理服务器，代理到 https://ai-parsing.vercel.app/

echo "正在启动代理服务器..."
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

# 检查端口是否被占用
if lsof -Pi :9872 -sTCP:LISTEN -t >/dev/null ; then
    echo "警告: 端口 9872 已被占用"
    echo "正在尝试关闭占用该端口的进程..."
    lsof -ti:9872 | xargs kill -9 2>/dev/null
    sleep 1
fi

# 启动代理服务器
node proxy-server.js


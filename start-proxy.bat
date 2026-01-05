@echo off
REM 代理服务器启动脚本 (Windows)
REM 在本地 9872 端口启动代理服务器，代理到 https://ai-parsing.vercel.app/

echo 正在启动代理服务器...
echo.

REM 检查 Node.js 是否安装
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

REM 检查端口是否被占用并尝试关闭
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :9872 ^| findstr LISTENING') do (
    echo 警告: 端口 9872 已被占用，正在尝试关闭进程...
    taskkill /F /PID %%a >nul 2>&1
    timeout /t 1 /nobreak >nul
)

REM 启动代理服务器
node proxy-server.js

pause


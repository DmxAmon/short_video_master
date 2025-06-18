#!/bin/bash

# 设置应用目录和名称
APP_DIR=~/douyin-qianduan-plugin-sidebar-template
APP_NAME="douyin-plugin"
APP_PORT=5173

# 输出彩色文本的函数
print_green() {
    echo -e "\e[32m$1\e[0m"
}

print_yellow() {
    echo -e "\e[33m$1\e[0m"
}

print_red() {
    echo -e "\e[31m$1\e[0m"
}

# 显示标题
print_green "====================================="
print_green "   抖音插件应用启动脚本"
print_green "====================================="
print_green "   $(date '+%Y-%m-%d %H:%M:%S')"
print_green "====================================="

# 检查PM2是否安装
if ! command -v pm2 &> /dev/null; then
    print_red "错误: PM2未安装，请先安装PM2: npm install -g pm2"
    exit 1
fi

# 检查并杀死占用端口的进程
print_yellow "检查端口 $APP_PORT 是否被占用..."
PORT_PID=$(lsof -ti:$APP_PORT)
if [ ! -z "$PORT_PID" ]; then
    print_yellow "端口 $APP_PORT 被进程 $PORT_PID 占用，正在终止..."
    sudo kill -9 $PORT_PID
    print_yellow "进程已终止。"
fi

# 停止所有PM2实例
print_yellow "停止所有PM2实例..."
pm2 delete all
print_yellow "所有PM2实例已停止。"

# 切换到应用目录
cd $APP_DIR || {
    print_red "错误: 无法切换到应用目录 $APP_DIR"
    exit 1
}

# 启动新的应用实例
print_yellow "正在启动新的应用实例..."
pm2 start npm --name "$APP_NAME" -- run dev -- --host 0.0.0.0 --port $APP_PORT

# 检查启动状态
sleep 3  # 等待应用启动
if pm2 list | grep -q "$APP_NAME" && pm2 list | grep -q "online"; then
    print_green "应用启动成功!"
    print_green "应用状态:"
    pm2 status "$APP_NAME"
    
    # 显示端口监听情况
    print_yellow "端口监听情况:"
    sudo lsof -i :$APP_PORT || echo "没有进程监听端口 $APP_PORT"
else
    print_red "应用启动可能存在问题，请检查日志:"
    pm2 logs "$APP_NAME" --lines 10
fi

print_green "====================================="
print_yellow "提示: 使用 'pm2 logs $APP_NAME' 查看应用日志"
print_yellow "提示: 使用 'pm2 monit' 监控应用状态"
print_green "====================================="

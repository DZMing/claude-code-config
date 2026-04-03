#!/bin/bash

# Claude Code 自定义状态栏
# 显示：模型、目录、分支、未提交文件、同步状态、token进度

# 获取当前信息
MODEL="claude-sonnet-4-5"
CURRENT_DIR=$(basename "$(pwd)")
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "no-git")
UNCOMMITTED=$(git status --short 2>/dev/null | wc -l | tr -d ' ' || echo "0")
SYNC_STATUS=$(git status -sb 2>/dev/null | grep -q "ahead" && echo "↑" || echo "=")

# Token进度（估算）
TOTAL_TOKENS=200000
USED_TOKENS=$(find . -name "*.json" -o -name "*.md" -o -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs wc -c 2>/dev/null | awk '{sum+=$1} END {print sum}')
PERCENTAGE=$((USED_TOKENS * 100 / TOTAL_TOKENS))

# 构建状态栏
STATUS_BAR="[$MODEL] $CURRENT_DIR|$GIT_BRANCH [$UNCOMMITTED] $SYNC_STATUS [$PERCENTAGE%]"

# 输出（Claude Code会读取这个）
echo "$STATUS_BAR"

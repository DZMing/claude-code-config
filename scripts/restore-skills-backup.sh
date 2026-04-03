#!/bin/bash
#
# Claude Skills 备份恢复脚本
# 用法: ./restore-skills-backup.sh <timestamp>
# 示例: ./restore-skills-backup.sh 20260217_045920
#

set -e

TIMESTAMP=$1

# 检查参数
if [ -z "$TIMESTAMP" ]; then
    echo "❌ 用法: $0 <timestamp>"
    echo "示例: $0 20260217_045920"
    echo ""
    echo "可用备份列表："
    ls -dt ~/.claude/skills.backup.* 2>/dev/null | sed 's/.*skills.backup.//' | head -10
    exit 1
fi

BACKUP_DIR="$HOME/.claude/skills.backup.$TIMESTAMP"
SKILLS_DIR="$HOME/.claude/skills"

# 检查备份是否存在
if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ 备份不存在: $BACKUP_DIR"
    echo ""
    echo "可用备份列表："
    ls -dt ~/.claude/skills.backup.* 2>/dev/null | sed 's/.*skills.backup.//' | head -10
    exit 1
fi

# 确认恢复
echo "⚠️  即将恢复以下备份："
echo "   源目录: $BACKUP_DIR"
echo "   目标目录: $SKILLS_DIR"
echo ""
echo "⚠️  警告：当前技能将被完全覆盖！"
echo ""
read -p "确认恢复？(yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ 恢复已取消"
    exit 0
fi

# 执行恢复
echo ""
echo "📦 正在恢复备份..."

# 创建临时备份（防止恢复失败）
TEMP_BACKUP="$SKILLS_DIR.temp.before-restore.$(date +%Y%m%d_%H%M%S)"
if [ -d "$SKILLS_DIR" ]; then
    cp -r "$SKILLS_DIR" "$TEMP_BACKUP" || true
fi

# 恢复文件
rm -rf "$SKILLS_DIR"/*
cp -r "$BACKUP_DIR"/* "$SKILLS_DIR/"

# 验证恢复
if [ $? -eq 0 ]; then
    echo "✅ 恢复完成"
    echo ""
    echo "恢复的技能："
    ls -1 "$SKILLS_DIR" | grep -E '\.md$' | wc -l | xargs echo "  - 技能文件数:"
    echo ""
    echo "临时备份已保存: $TEMP_BACKUP"
    echo "（验证成功后可手动删除）"

    # 发送通知
    osascript -e 'display notification "技能备份恢复成功（'"$TIMESTAMP"'）" with title "✅ Claude Skills Restore"' 2>/dev/null || true
else
    echo "❌ 恢复失败"
    echo "正在回滚到恢复前状态..."
    rm -rf "$SKILLS_DIR"/*
    cp -r "$TEMP_BACKUP"/* "$SKILLS_DIR/"
    echo "✅ 已回滚"
    exit 1
fi

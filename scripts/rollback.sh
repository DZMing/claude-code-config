#!/bin/bash
# ~/.claude/scripts/rollback.sh
# 配置优化回滚脚本

echo "🔄 开始回退 Claude Code 配置优化..."

# 查找最新备份
BACKUP=$(ls -t ~/.claude.backup.* 2>/dev/null | head -1)

if [ -z "$BACKUP" ]; then
    echo "❌ 未找到备份文件"
    echo "💡 提示：请在优化前先运行：cp -r ~/.claude ~/.claude.backup.$(date +%Y%m%d_%H%M%S)"
    exit 1
fi

echo "📦 找到备份：$BACKUP"
echo ""
echo "⚠️  警告：这将恢复以下优化前的配置："
echo "  - scope-lock 智能模式 → 原始 warn 模式"
echo "  - TDD 强制测试 → 重新启用"
echo "  - 会话启动流程 → 移除集成"
echo "  - 检查点系统 → 移除"
echo "  - 评估系统 → 移除"
echo ""
read -p "确认回退？(y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "❌ 取消回退"
    exit 0
fi

echo ""
echo "🔄 开始恢复..."

# 停止 Claude Code（如果运行中）
echo "1. 停止 Claude Code..."
# pkill -f "Claude Code" 2>/dev/null || true

# 恢复备份
echo "2. 恢复配置文件..."
cp -r "$BACKUP"/* ~/.claude/

echo ""
echo "✅ 回退完成"
echo ""
echo "📋 下一步："
echo "  1. 重启 Claude Code 使配置生效"
echo "  2. 验证配置是否恢复正常"
echo "  3. 如果问题仍然存在，请联系技术支持"

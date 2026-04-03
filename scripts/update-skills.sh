#!/bin/bash
#
# Claude Skills 自动更新脚本
# 功能：备份、更新、验证技能库
#

set -e

# 配置
LOG_FILE="$HOME/.claude/logs/skills-update.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$HOME/.claude/skills.backup.$TIMESTAMP"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 错误处理
error_exit() {
    log "❌ ERROR: $1"
    osascript -e 'display notification "技能更新失败：'"$1"'" with title "⚠️ Claude Skills Update"' 2>/dev/null || true
    exit 1
}

# 成功通知
success_notify() {
    log "✅ $1"
    osascript -e 'display notification "'"$1"'" with title "✅ Claude Skills Update"' 2>/dev/null || true
}

log "=========================================="
log "开始 Claude Skills 自动更新"
log "=========================================="

# 步骤 1: 创建备份
log ""
log "步骤 1/4: 创建备份..."
if [ -d "$HOME/.claude/skills" ]; then
    cp -r "$HOME/.claude/skills" "$BACKUP_DIR" || error_exit "备份失败"
    log "✅ 备份完成: $BACKUP_DIR"
else
    log "⚠️ skills 目录不存在，跳过备份"
fi

# 步骤 2: 更新外部 Git 仓库
log ""
log "步骤 2/4: 更新 Git 仓库..."
if [ -f "$HOME/.claude/scripts/update-skill-repos.sh" ]; then
    bash "$HOME/.claude/scripts/update-skill-repos.sh" 2>&1 | tee -a "$LOG_FILE" || error_exit "Git 仓库更新失败"
    log "✅ Git 仓库更新完成"
else
    log "⚠️ update-skill-repos.sh 不存在，跳过"
fi

# 步骤 3: 验证技能有效性
log ""
log "步骤 3/4: 验证技能..."
if [ -f "$HOME/.claude/scripts/validate-skills.sh" ]; then
    bash "$HOME/.claude/scripts/validate-skills.sh" 2>&1 | tee -a "$LOG_FILE" || log "⚠️ 技能验证发现问题"
    log "✅ 技能验证完成"
else
    log "⚠️ validate-skills.sh 不存在，跳过"
fi

# 步骤 4: 生成报告
log ""
log "步骤 4/4: 生成报告..."
if [ -f "$HOME/.claude/scripts/generate-skill-report.sh" ]; then
    bash "$HOME/.claude/scripts/generate-skill-report.sh" 2>&1 | tee -a "$LOG_FILE" || log "⚠️ 报告生成失败"
    log "✅ 报告生成完成"
else
    log "⚠️ generate-skill-report.sh 不存在，跳过"
fi

# 清理旧备份（保留最近 5 个）
log ""
log "清理旧备份..."
ls -dt ~/.claude/skills.backup.* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true
log "✅ 旧备份已清理"

# 生成日志摘要
log ""
log "生成日志摘要..."
tail -20 "$LOG_FILE" > "$HOME/.claude/logs/skills-update-summary.txt"

log ""
log "=========================================="
log "Claude Skills 自动更新完成"
log "=========================================="

# 发送成功通知
success_notify "技能更新完成（$TIMESTAMP）"

exit 0

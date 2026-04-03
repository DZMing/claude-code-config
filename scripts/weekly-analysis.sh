#!/bin/bash

# Claude Code 每周性能分析脚本

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="$HOME/.claude/reports"
REPORT_FILE="$REPORT_DIR/weekly-$TIMESTAMP.md"
BACKUP_DIR="$HOME/.claude/backups"

# 确保目录存在
mkdir -p "$REPORT_DIR"
mkdir -p "$BACKUP_DIR"

echo "# Claude Code 性能报告（$(date +%Y-%m-%d）" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "## 📊 性能数据" >> "$REPORT_FILE"

# 任务统计
echo "### 任务统计" >> "$REPORT_FILE"
if [ -f ~/.claude/performance.log ]; then
    T1_COUNT=$(grep "轻量" ~/.claude/performance.log 2>/dev/null | wc -l | tr -d ' ')
    T2_COUNT=$(grep "中等" ~/.claude/performance.log 2>/dev/null | wc -l | tr -d ' ')
    T3_COUNT=$(grep "重度" ~/.claude/performance.log 2>/dev/null | wc -l | tr -d ' ')
    T4_COUNT=$(grep "危险" ~/.claude/performance.log 2>/dev/null | wc -l | tr -d ' ')

    echo "- T1 轻量：${T1_COUNT:-0}次" >> "$REPORT_FILE"
    echo "- T2 中等：${T2_COUNT:-0}次" >> "$REPORT_FILE"
    echo "- T3 重度：${T3_COUNT:-0}次" >> "$REPORT_FILE"
    echo "- T4 危险：${T4_COUNT:-0}次" >> "$REPORT_FILE"
else
    echo "无性能数据" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "## 🔧 优化建议" >> "$REPORT_FILE"
echo "### 需要审查的规则" >> "$REPORT_FILE"
echo "- 检查规则触发频率和错误率" >> "$REPORT_FILE"
echo "- 移除冗余或过时的规则" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "### 性能瓶颈" >> "$REPORT_FILE"
echo "- Git操作耗时分析" >> "$REPORT_FILE"
echo "- 文件读取耗时分析" >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "报告已生成：$REPORT_FILE"
echo "请查看报告并根据建议优化配置"

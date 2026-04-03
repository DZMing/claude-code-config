#!/bin/bash
# 生成技能报告脚本

REPORT_FILE="$HOME/.claude/reports/skills-update-$(date +%Y%m%d_%H%M%S).md"
mkdir -p "$HOME/.claude/reports"

echo "# 技能库更新报告 ($(date +%Y-%m-%d))" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

## 概览统计
echo "## 概览" >> "$REPORT_FILE"
total=$(find ~/.claude/skills -maxdepth 1 -type d | wc -l)
active=$(grep -c ':active$' ~/.claude/skills-inventory-final.txt 2>/dev/null || echo 0)
symlinks=$(grep -c ':symlink->' ~/.claude/skills-inventory-final.txt 2>/dev/null || echo 0)
invalid=$(grep -c ':invalid$' ~/.claude/skills-inventory-final.txt 2>/dev/null || echo 0)

echo "- 技能总数: $total" >> "$REPORT_FILE"
echo "- 激活技能: $active" >> "$REPORT_FILE"
echo "- 符号链接: $symlinks" >> "$REPORT_FILE"
echo "- 无效目录: $invalid" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

## Git 仓库状态
echo "## Git 仓库" >> "$REPORT_FILE"
echo "（待 Teammate 1 汇报）" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

## 符号链接状态
echo "## 符号链接" >> "$REPORT_FILE"
echo "（待 Teammate 2 汇报）" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

## 去重结果
echo "## 重复技能清理" >> "$REPORT_FILE"
echo "（待 Teammate 4 汇报）" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

## 定期更新
echo "## 定期更新" >> "$REPORT_FILE"
echo "（待 Teammate 5 汇报）" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "✅ 报告已生成: $REPORT_FILE"
cat "$REPORT_FILE"

#!/bin/bash
echo "=== Claude Code 配置审查 ==="
echo ""

# 检查1: hookify 幽灵引用
echo -n "1. hookify 引用: "
count=$(grep -r "hookify\." ~/.claude/rules/ 2>/dev/null | grep -v "archive" | wc -l | tr -d ' ')
[ "$count" -eq 0 ] && echo "✅ 无" || echo "❌ 发现 $count 处"

# 检查2: 修复次数一致性
echo -n "2. 修复次数冲突 (5轮/5次): "
count=$(grep -rn "5轮.*修\|5次.*修\|最多5.*修\|修.*最多5\|修.*5轮\|修.*5次" ~/.claude/rules/ ~/.claude/CLAUDE.md 2>/dev/null | grep -v "archive" | wc -l | tr -d ' ')
[ "$count" -eq 0 ] && echo "✅ 无" || echo "❌ 发现 $count 处"

# 检查3: 双重 Hook
echo -n "3. settings.local.json hooks: "
result=$(python3 -c "import json; d=json.load(open('$HOME/Documents/通用/.claude/settings.local.json')); print('exists' if 'hooks' in d else 'clean')" 2>/dev/null)
[ "$result" = "clean" ] && echo "✅ 已清理" || echo "❌ 仍存在"

# 检查4: 引用完整性 - 不存在的文件
echo -n "4. 幽灵文件引用: "
ghosts=0
for f in "hookify.scope-lock.local.md" "14-long-running-agent.md" "spec.md" "auto-correct.json" "drift-prevention.json" "autonomous-workflow.json"; do
  found=$(grep -r "$f" ~/.claude/rules/ 2>/dev/null | grep -v "archive" | wc -l | tr -d ' ')
  if [ "$found" -gt 0 ]; then
    ghosts=$((ghosts + found))
  fi
done
[ "$ghosts" -eq 0 ] && echo "✅ 无" || echo "❌ 发现 $ghosts 处"

# 检查5: T1-T4 完整定义表格位置
echo -n "5. T1-T4 完整定义: "
count=$(grep -l "T1.*轻量.*< 20" ~/.claude/rules/*.md 2>/dev/null | grep -v "archive" | wc -l | tr -d ' ')
[ "$count" -eq 1 ] && echo "✅ 仅在 11-multi-ai-orchestration.md" || echo "⚠️ 在 $count 个文件中"

# 检查6: 归档文件
echo -n "6. 归档文件数: "
archive_count=$(ls ~/.claude/rules/archive/*.md 2>/dev/null | wc -l | tr -d ' ')
echo "📦 $archive_count 个文件已归档"

# 检查7: 活跃规则文件数
echo -n "7. 活跃规则文件: "
active_count=$(ls ~/.claude/rules/*.md 2>/dev/null | wc -l | tr -d ' ')
echo "📄 $active_count 个"

# 检查8: instructions.md 覆盖率
echo -n "8. instructions.md 覆盖: "
missing=0
for f in ~/.claude/rules/*.md; do
  basename=$(basename "$f")
  if ! grep -q "$basename" ~/.claude/instructions.md 2>/dev/null; then
    missing=$((missing + 1))
    echo ""
    echo "   ⚠️ 未列入: $basename"
  fi
done
[ "$missing" -eq 0 ] && echo "✅ 100% 覆盖" || echo ""

echo ""
echo "=== 审查完成 ==="

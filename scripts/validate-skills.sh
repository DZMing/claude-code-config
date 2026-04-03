#!/bin/bash
# 技能验证脚本

echo "=== 验证技能有效性 ==="
echo ""

valid_count=0
invalid_count=0
missing_skill_md=0
missing_fields=0
invalid_yaml=0

for skill_dir in ~/.claude/skills/*/; do
  skill_name=$(basename "$skill_dir")
  skill_file="$skill_dir/SKILL.md"

  # 检查 SKILL.md 是否存在
  if [ ! -f "$skill_file" ]; then
    echo "❌ $skill_name: Missing SKILL.md"
    ((invalid_count++))
    ((missing_skill_md++))
    continue
  fi

  # 验证 YAML frontmatter
  if ! grep -q "^---" "$skill_file"; then
    echo "⚠️  $skill_name: Invalid YAML frontmatter"
    ((invalid_yaml++))
  fi

  # 检查必需字段
  required_fields=("name" "description")
  missing=0
  for field in "${required_fields[@]}"; do
    if ! grep -q "^$field:" "$skill_file"; then
      echo "⚠️  $skill_name: Missing field '$field'"
      ((missing++))
    fi
  done

  if [ $missing -gt 0 ]; then
    ((missing_fields++))
    ((invalid_count++))
  else
    echo "✅ $skill_name: Valid"
    ((valid_count++))
  fi
done

echo ""
echo "=== 统计 ==="
echo "有效技能: $valid_count"
echo "无效技能: $invalid_count"
echo "  - 缺失 SKILL.md: $missing_skill_md"
echo "  - 缺失字段: $missing_fields"
echo "  - YAML 错误: $invalid_yaml"

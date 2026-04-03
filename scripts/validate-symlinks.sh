#!/bin/bash
# 符号链接验证脚本

echo "=== 验证符号链接 ==="
echo ""

valid_count=0
broken_count=0

for link in ~/.claude/skills/*; do
  if [ -L "$link" ]; then
    link_name=$(basename "$link")
    target=$(readlink "$link")

    if [ -e "$target" ]; then
      echo "✅ $link_name -> $target"
      ((valid_count++))
    else
      echo "❌ BROKEN: $link_name -> $target"
      ((broken_count++))
    fi
  fi
done

echo ""
echo "=== 统计 ==="
echo "有效链接: $valid_count"
echo "失效链接: $broken_count"

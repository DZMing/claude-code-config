#!/bin/bash
# 重复技能删除脚本（已创建备份）

set -e  # 遇到错误立即退出

backup_dir="$HOME/.claude/skills.backup.20260217_050211"
log_file="$HOME/.claude/duplicates-removed.log"

echo "=== 重复技能删除日志 ===" > "$log_file"
echo "时间: $(date)" >> "$log_file"
echo "备份位置: $backup_dir" >> "$log_file"
echo "" >> "$log_file"

# 要删除的技能列表（基于分析结果）
duplicates_to_remove=(
  "tdd"
  "debug"
  "auto-code-review"
)

skills_dir="$HOME/.claude/skills"
cd "$skills_dir"

for skill in "${duplicates_to_remove[@]}"; do
  skill_path="$skills_dir/$skill"

  echo "处理: $skill" | tee -a "$log_file"

  # 安全检查
  if [ ! -d "$skill_path" ]; then
    echo "  跳过: 目录不存在" | tee -a "$log_file"
    continue
  fi

  if [ -L "$skill_path" ]; then
    echo "  跳过: 是符号链接" | tee -a "$log_file"
    continue
  fi

  # 确认备份存在
  if [ ! -d "$backup_dir/$skill" ]; then
    echo "  错误: 备份不存在，跳过删除" | tee -a "$log_file"
    continue
  fi

  # 删除
  echo "  删除: $skill_path" | tee -a "$log_file"
  rm -rf "$skill_path"
  echo "  已删除" | tee -a "$log_file"
  echo "" >> "$log_file"
done

echo "=== 删除完成 ===" | tee -a "$log_file"
echo "" | tee -a "$log_file"

# 显示保留的技能
echo "=== 保留的技能 ===" | tee -a "$log_file"
echo "- test-driven-development (替代 tdd)" | tee -a "$log_file"
echo "- systematic-debugging (替代 debug)" | tee -a "$log_file"
echo "- code-review (保留，内容更完整)" | tee -a "$log_file"
echo "" | tee -a "$log_file"

# 列出当前所有技能
echo "=== 当前技能列表 ===" | tee -a "$log_file"
ls -1 "$skills_dir" | tee -a "$log_file"

echo ""
echo "✅ 删除完成！日志已保存到: $log_file"

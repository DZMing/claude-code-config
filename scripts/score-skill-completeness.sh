#!/bin/bash
# 技能完整度评分脚本

skill_dir="$1"

if [ ! -d "$skill_dir" ]; then
  echo "错误: 目录不存在 $skill_dir"
  exit 1
fi

skill_name=$(basename "$skill_dir")

# 1. 文件数量 (20分)
file_count=$(find "$skill_dir" -type f | wc -l | tr -d ' ')
score_files=$((file_count * 2))
if [ $score_files -gt 20 ]; then
  score_files=20
fi

# 2. 额外文档 (15分)
doc_count=$(find "$skill_dir" -name "*.md" | wc -l | tr -d ' ')
score_docs=$((doc_count * 5))
if [ $score_docs -gt 15 ]; then
  score_docs=15
fi

# 3. 代码示例 (15分)
example_count=$(find "$skill_dir" -name "*.js" -o -name "*.py" -o -name "*.ts" | wc -l | tr -d ' ')
score_examples=$((example_count * 5))
if [ $score_examples -gt 15 ]; then
  score_examples=15
fi

# 4. 描述长度 (20分)
if [ -f "$skill_dir/SKILL.md" ]; then
  desc_length=$(wc -c < "$skill_dir/SKILL.md" | tr -d ' ')
  score_desc=$((desc_length / 50))
  if [ $score_desc -gt 20 ]; then
    score_desc=20
  fi
else
  desc_length=0
  score_desc=0
fi

# 5. 触发词数量 (20分)
if [ -f "$skill_dir/SKILL.md" ]; then
  trigger_count=$(grep -E "^triggers:|^  - " "$skill_dir/SKILL.md" | wc -l | tr -d ' ')
  score_triggers=$((trigger_count * 3))
  if [ $score_triggers -gt 20 ]; then
    score_triggers=20
  fi
else
  trigger_count=0
  score_triggers=0
fi

# 6. 最近更新 (10分)
if [ -d "$skill_dir/.git" ]; then
  last_update=$(git -C "$skill_dir" log -1 --format=%ct 2>/dev/null || echo "0")
else
  # 使用文件修改时间
  last_update=$(find "$skill_dir" -type f -exec stat -f %m {} \; 2>/dev/null | sort -rn | head -1)
  if [ -z "$last_update" ]; then
    last_update=$(find "$skill_dir" -type f -exec stat -c %Y {} \; 2>/dev/null | sort -rn | head -1)
  fi
  if [ -z "$last_update" ]; then
    last_update=0
  fi
fi

# 转换为天数前（相对现在）
current_time=$(date +%s)
days_ago=$(( (current_time - last_update) / 86400 ))
if [ $days_ago -lt 30 ]; then
  score_recent=10
elif [ $days_ago -lt 90 ]; then
  score_recent=7
elif [ $days_ago -lt 180 ]; then
  score_recent=5
else
  score_recent=2
fi

# 总分
total_score=$((score_files + score_docs + score_examples + score_desc + score_triggers + score_recent))

# 输出JSON
cat << EOF
{
  "name": "$skill_name",
  "path": "$skill_dir",
  "scores": {
    "files": $score_files,
    "documentation": $score_docs,
    "examples": $score_examples,
    "description_length": $score_desc,
    "triggers": $score_triggers,
    "recent": $score_recent
  },
  "details": {
    "file_count": $file_count,
    "doc_count": $doc_count,
    "example_count": $example_count,
    "description_length": $desc_length,
    "trigger_count": $trigger_count,
    "days_since_update": $days_ago
  },
  "total_score": $total_score
}
EOF

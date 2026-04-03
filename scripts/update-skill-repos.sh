#!/bin/bash

# 更新外部技能仓库脚本
# 从符号链接状态中提取唯一的 Git 仓库并更新

UPDATE_LOG="$HOME/.claude/symlinks-updated.log"
SKILLS_DIR="$HOME/.claude/skills"
REPOS_FILE=$(mktemp)

echo "🔄 开始更新外部技能仓库..." 
echo "更新时间: $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$UPDATE_LOG"
echo "" >> "$UPDATE_LOG"

# 收集唯一的 Git 仓库
echo "🔍 扫描符号链接以找到 Git 仓库..."
for link in "$SKILLS_DIR"/*; do
  if [ -L "$link" ]; then
    target=$(readlink -f "$link" 2>/dev/null || readlink "$link")
    
    # 如果是相对路径，转换为绝对路径
    if [[ "$target" != /* ]]; then
      target="$(cd "$SKILLS_DIR" && cd "$(dirname "$link")" && cd "$target" && pwd)"
    fi
    
    # 向上查找 .git 目录
    repo_dir="$target"
    while [ "$repo_dir" != "/" ] && [ ! -d "$repo_dir/.git" ]; do
      repo_dir=$(dirname "$repo_dir")
    done
    
    # 如果找到 Git 仓库，记录
    if [ -d "$repo_dir/.git" ]; then
      echo "$repo_dir" >> "$REPOS_FILE"
    fi
  fi
done

# 去重并排序
unique_repos=$(sort -u "$REPOS_FILE")
total_repos=$(echo "$unique_repos" | wc -l | tr -d ' ')

echo "发现 $total_repos 个唯一的 Git 仓库"
echo "" >> "$UPDATE_LOG"
echo "发现的仓库列表：" >> "$UPDATE_LOG"
echo "$unique_repos" >> "$UPDATE_LOG"
echo "" >> "$UPDATE_LOG"

updated=0
skipped=0
failed=0

# 更新每个仓库
while IFS= read -r repo; do
  repo_name=$(basename "$repo")
  echo "" >> "$UPDATE_LOG"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$UPDATE_LOG"
  echo "仓库: $repo_name ($repo)" >> "$UPDATE_LOG"
  
  cd "$repo" || {
    echo "❌ 无法进入目录" >> "$UPDATE_LOG"
    failed=$((failed + 1))
    continue
  }
  
  # 检查未提交更改
  if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo "⚠️  跳过：有未提交的更改" >> "$UPDATE_LOG"
    skipped=$((skipped + 1))
    continue
  fi
  
  # 获取当前分支
  current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
  echo "当前分支: $current_branch" >> "$UPDATE_LOG"
  
  # 拉取最新代码
  echo "正在拉取最新代码..." >> "$UPDATE_LOG"
  if git fetch origin 2>> "$UPDATE_LOG"; then
    # 检查是否有新提交
    new_commits=$(git log HEAD..origin/"$current_branch" --oneline 2>/dev/null | wc -l | tr -d ' ')
    
    if [ "$new_commits" -gt 0 ]; then
      echo "📥 发现 $new_commits 个新提交：" >> "$UPDATE_LOG"
      git log HEAD..origin/"$current_branch" --oneline >> "$UPDATE_LOG"
      
      # 执行 pull
      if git pull origin "$current_branch" >> "$UPDATE_LOG" 2>&1; then
        echo "✅ 更新成功" >> "$UPDATE_LOG"
        updated=$((updated + 1))
      else
        echo "❌ 更新失败（可能存在冲突）" >> "$UPDATE_LOG"
        failed=$((failed + 1))
      fi
    else
      echo "✅ 已是最新" >> "$UPDATE_LOG"
      updated=$((updated + 1))
    fi
  else
    echo "❌ fetch 失败" >> "$UPDATE_LOG"
    failed=$((failed + 1))
  fi
done < <(echo "$unique_repos")

# 清理临时文件
rm -f "$REPOS_FILE"

# 输出总结
echo "" >> "$UPDATE_LOG"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$UPDATE_LOG"
echo "📊 更新总结" >> "$UPDATE_LOG"
echo "  总仓库数: $total_repos" >> "$UPDATE_LOG"
echo "  更新成功: $updated" >> "$UPDATE_LOG"
echo "  已是最新: $(($updated - $(grep -c "已是最新" "$UPDATE_LOG" || echo 0)))" >> "$UPDATE_LOG"
echo "  跳过: $skipped" >> "$UPDATE_LOG"
echo "  失败: $failed" >> "$UPDATE_LOG"

echo ""
echo "📊 更新完成！"
echo "  总仓库数: $total_repos"
echo "  更新成功: $updated ✅"
echo "  跳过: $skipped ⚠️"
echo "  失败: $failed ❌"
echo ""
echo "📄 详细日志已保存到: $UPDATE_LOG"

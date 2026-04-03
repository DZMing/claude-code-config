#!/bin/bash

set -euo pipefail

# Paperclip agent bypass — hooks are for human sessions
if [ -n "${PAPERCLIP_RUN_ID:-}" ]; then exit 0; fi

# 从 stdin 读取 tool info（JSON 格式）
tool_info="$(cat)"

# 检查文件路径
file_path=$(echo "$tool_info" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data.get("tool_input",{}).get("file_path",""))' 2>/dev/null || echo "")

# 只处理 .env 文件的编辑
if [[ ! "$file_path" =~ \.env$ ]]; then
  exit 0
fi

# 如果文件不存在，跳过检查
if [[ ! -f "$file_path" ]]; then
  exit 0
fi

echo "🔍 检查 .env 文件语法: $file_path"

# 语法检查函数
env_errors=0
env_warnings=0
line_num=0

while IFS= read -r line || [ -n "$line" ]; do
  ((line_num++))

  # 跳过注释行
  if [[ "$line" =~ ^# ]]; then
    continue
  fi

  # 跳过空行
  if [[ -z "$line" ]]; then
    continue
  fi

  # 检查是否包含等号（键值对）
  if [[ "$line" =~ = ]]; then
    key="${line%%=*}"
    value="${line#*=}"

    # 检查1: Key 中不能有空格
    if [[ "$key" =~ [[:space:]] ]]; then
      echo "❌ 第 ${line_num} 行: Key 包含空格"
      echo "   → $line"
      ((env_errors++))
      continue
    fi

    # 检查2: 行首不能有空格
    if [[ "$line" =~ ^[[:space:]] ]]; then
      echo "❌ 第 ${line_num} 行: 行首有空格"
      echo "   → $line"
      ((env_errors++))
      continue
    fi

    # 检查3: 未加引号的值包含空格（警告）
    if [[ ! "$value" =~ ^\".*\"$ ]] && [[ ! "$value" =~ ^\'.*\'$ ]] && [[ "$value" =~ [[:space:]] ]]; then
      echo "⚠️  第 ${line_num} 行: 值包含空格但未加引号（建议加引号）"
      echo "   → $line"
      ((env_warnings++))
    fi

  else
    # 不是注释、不是空行、也不是键值对
    echo "⚠️  第 ${line_num} 行: 无法识别的行（跳过）"
    echo "   → $line"
  fi
done < "$file_path"

# 汇总结果
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $env_errors -gt 0 ]]; then
  echo "🚫 .env 语法检查失败: 发现 $env_errors 个错误"
  exit 1
elif [[ $env_warnings -gt 0 ]]; then
  echo "⚠️  .env 语法检查通过（但有 $env_warnings 个警告）"
  exit 0
else
  echo "✅ .env 语法检查通过"
  exit 0
fi

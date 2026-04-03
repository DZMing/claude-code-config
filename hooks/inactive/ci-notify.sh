#!/bin/bash
# CI 通知 hook - post-commit 后触发

set -euo pipefail

# Paperclip agent bypass — hooks are for human sessions
if [ -n "${PAPERCLIP_RUN_ID:-}" ]; then exit 0; fi

# 获取最近commit
COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")
BRANCH=$(git branch --show-current 2>/dev/null || echo "main")

if [[ -z "$COMMIT" ]]; then
  exit 0
fi

# 检查是否有 CI 配置
if [[ -f ".github/workflows/ci.yml" ]] || [[ -f ".gitlab-ci.yml" ]]; then
  echo "🔄 CI已触发，commit: ${COMMIT:0:7}"
  # 如果有 gh CLI，检查 CI 状态
  if command -v gh &>/dev/null; then
    sleep 5
    STATUS=$(gh run list --limit 1 --json status,conclusion -q '.[0].status' 2>/dev/null || echo "unknown")
    if [[ "$STATUS" == "failure" ]]; then
      echo "❌ CI失败，请检查"
    fi
  fi
fi

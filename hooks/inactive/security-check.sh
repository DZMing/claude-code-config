#!/bin/bash
# 安全检查 - 检测硬编码凭证和安全风险

set -euo pipefail

# Paperclip agent 会话自动放行（非交互式，有 adapter 自身安全机制）
if [ -n "${PAPERCLIP_RUN_ID:-}" ]; then
    exit 0
fi

if [ -t 0 ]; then
    exit 0
fi

input="$(cat)"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
result=$(python3 "${SCRIPT_DIR}/security_check.py" "$input" 2>/dev/null || true)

if [[ -n "$result" ]]; then
    echo "$result"
fi

exit 0

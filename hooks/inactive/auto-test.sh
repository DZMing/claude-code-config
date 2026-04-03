#!/bin/bash
# 自动测试脚本（来自 OpenCode）

# Paperclip agent bypass — hooks are for human sessions
if [ -n "${PAPERCLIP_RUN_ID:-}" ]; then exit 0; fi

FILE="$1"
input="$(cat || true)"

if [[ -z "$FILE" && -n "$input" ]]; then
  if command -v python3 >/dev/null 2>&1; then
    FILE="$(python3 - "$input" <<'PY'
import json
import sys

raw = sys.argv[1] if len(sys.argv) > 1 else ""
try:
    data = json.loads(raw) if raw else {}
except Exception:
    data = {}

if isinstance(data, dict):
    tool_input = data.get("tool_input") or {}
    if isinstance(tool_input, dict):
        value = tool_input.get("file_path") or tool_input.get("filePath") or tool_input.get("path") or ""
        print(value or "")
PY
)"
  fi
fi

if [[ -z "$FILE" ]]; then
  exit 0
fi

DIR="$(dirname "$FILE")"
BASENAME="$(basename "$FILE" .py)"

# 只对 Python 文件执行测试
if [[ "$FILE" == *.py ]]; then
  for TESTFILE in test_${BASENAME}.py tests.py test.py; do
    if [ -f "$DIR/$TESTFILE" ]; then
      echo "🧪 运行测试: $TESTFILE"
      python3 "$DIR/$TESTFILE" >/dev/null 2>&1 && echo "✅ 测试通过" || echo "⚠️ 测试失败"
      break
    fi
  done
fi

exit 0

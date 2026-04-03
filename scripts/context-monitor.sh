#!/bin/bash
# 上下文监控脚本

CONTEXT_FILE=~/.claude/context-usage.log
CURRENT_TIME=$(date +%s)

# 记录当前时间戳
echo "$CURRENT_TIME" >> "$CONTEXT_FILE"

# 检查最近 100 个操作的时间跨度
if [ -f "$CONTEXT_FILE" ]; then
    LINE_COUNT=$(wc -l < "$CONTEXT_FILE")
    if [ "$LINE_COUNT" -gt 100 ]; then
        FIRST_TIME=$(head -1 "$CONTEXT_FILE")
        TIME_DIFF=$((CURRENT_TIME - FIRST_TIME))

        # 如果 100 个操作在 30 分钟内完成，可能上下文过长
        if [ "$TIME_DIFF" -lt 1800 ]; then
            echo "⚠️  HINT: 上下文可能过长，考虑使用 /compact 或 /clear" >&2
        fi

        # 清理旧记录
        tail -100 "$CONTEXT_FILE" > "$CONTEXT_FILE.tmp"
        mv "$CONTEXT_FILE.tmp" "$CONTEXT_FILE"
    fi
fi

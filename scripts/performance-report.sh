#!/bin/bash
# 性能报告生成脚本

echo "=== Claude Code 性能报告 ==="
echo "生成时间：$(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

PERF_LOG="${HOME}/.claude/performance.log"

if [ ! -f "$PERF_LOG" ]; then
    echo "❌ 性能日志不存在：$PERF_LOG"
    exit 1
fi

# 统计任务类型分布
echo "📊 任务类型分布："
jq -r '.records[] | .task.type' "$PERF_LOG" | sort | uniq -c | sort -rn

echo ""
echo "⏱️ 平均完成时间（按任务类型）："
for type in T1 T2 T3 T4; do
    count=$(jq -r ".records[] | select(.task.type == \"$type\") | .performance.duration_ms" "$PERF_LOG" | wc -l)
    if [ "$count" -gt 0 ]; then
        avg=$(jq -r "[.records[] | select(.task.type == \"$type\") | .performance.duration_ms] | add/length($count)" "$PERF_LOG")
        echo "  $type: $(($avg / 1000))秒 ($count 个任务)"
    fi
done

echo ""
echo "🤖 Multi-agent 使用率："
codex_count=$(jq -r '.records[] | select(.multi_agent.codex_used == true) | .task.type' "$PERF_LOG" | wc -l)
gemini_count=$(jq -r '.records[] | select(.multi_agent.gemini_used == true) | .task.type' "$PERF_LOG" | wc -l)
total=$(jq -r '.records[] | .task.type' "$PERF_LOG" | wc -l)

echo "  Codex 使用: $codex_count/$total ($(awk "BEGIN {printf \"%.1f\", $codex_count*100/$total}")%)"
echo "  Gemini 使用: $gemini_count/$total ($(awk "BEGIN {printf \"%.1f\", $gemini_count*100/$total}")%)"

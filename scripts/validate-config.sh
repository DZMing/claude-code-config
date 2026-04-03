#!/bin/bash

echo "🔍 验证 Claude Code 配置..."

# 检查 settings.json 语法
echo ""
echo "📄 检查 settings.json..."
if [ -f ~/.claude/settings.json ]; then
    jq empty ~/.claude/settings.json 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ settings.json 语法正确"
    else
        echo "❌ settings.json 语法错误"
        exit 1
    fi
else
    echo "⚠️  未找到 settings.json"
fi

# 检查 intent-detection.json 语法
echo ""
echo "📄 检查 intent-detection.json..."
if [ -f ~/.claude/hooks/intent-detection.json ]; then
    jq empty ~/.claude/hooks/intent-detection.json 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ intent-detection.json 语法正确"

        # 检查配置是否安全
        threshold=$(jq -r '.auto_confirm_threshold' ~/.claude/hooks/intent-detection.json)
        if [ "$threshold" == "T1" ]; then
            echo "✅ 自动确认阈值安全: $threshold"
        else
            echo "⚠️  自动确认阈值可能过高: $threshold (建议 T1)"
        fi
    else
        echo "❌ intent-detection.json 语法错误"
        exit 1
    fi
else
    echo "⚠️  未找到 intent-detection.json"
fi

# 检查 hooks 事件名称
echo ""
echo "🪝 检查 hooks 事件名称..."
hook_files=$(find ~/.claude/hooks -name "*.local.md" 2>/dev/null)
non_standard_count=0

for file in $hook_files; do
    events=$(grep "^event:" "$file" 2>/dev/null | sed 's/event: //' | tr -d '[:space:]')
    for event in $events; do
        # 官方标准事件名（根据 schema）
        standard_events="PreToolUse|PostToolUse|PostToolUseFailure|Notification|UserPromptSubmit|SessionStart|SessionEnd|Stop|SubagentStart|SubagentStop|PreCompact|PermissionRequest|Setup|TeammateIdle|TaskCompleted|Elicitation|ElicitationResult|ConfigChange|WorktreeCreate|WorktreeRemove|InstructionsLoaded"

        if [[ ! "$event" =~ ^($standard_events)$ ]]; then
            echo "⚠️  非标准事件: $event (文件: $(basename "$file"))"
            non_standard_count=$((non_standard_count + 1))
        fi
    done
done

if [ $non_standard_count -eq 0 ]; then
    echo "✅ 所有 hooks 使用标准事件名"
else
    echo "⚠️  发现 $non_standard_count 个非标准事件名"
fi

# 检查符号链接冲突
echo ""
echo "🔗 检查符号链接冲突..."
if [ -L ~/.claude/commands/loop.md ]; then
    target=$(readlink ~/.claude/commands/loop.md)
    if [[ "$target" == *"ralph-loop.md" ]]; then
        echo "❌ 检测到冲突: loop.md → ralph-loop.md (覆盖官方 /loop 命令)"
    fi
else
    echo "✅ 无符号链接冲突"
fi

# 检查插件状态
echo ""
echo "🔌 检查插件状态..."
plugin_count=$(find ~/.claude/plugins -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
plugin_size=$(du -sh ~/.claude/plugins 2>/dev/null | cut -f1)
echo "📊 插件数量: $plugin_count"
echo "📊 插件大小: $plugin_size"

if [ $plugin_count -gt 2000 ]; then
    echo "⚠️  插件数量过多 ($plugin_count > 2000)，可能影响性能"
fi

echo ""
echo "✅ 验证完成"

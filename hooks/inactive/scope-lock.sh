#!/bin/bash
# Scope Lock - 范围锁定脚本（阶段1优化版）
# 集成意图识别：引用 intent-detection.json

# 加载意图识别配置
CONFIG_SOURCE="${HOME}/.claude/hooks/intent-detection.json"

# 智能跳过配置
SMART_SKIP_ENABLED=true
SMART_SKIP_CONDITIONS=(
    "task_complexity:T1,T2"  # T1/T2 任务自动跳过
    "estimated_lines:<50"      # 少于50行自动跳过
    "description_length:<100" # 简短描述（<100字符）自动跳过
    "user_explicit_confirm:false" # 用户未明确要求确认时自动跳过
)

# 解析 JSON 配置函数
load_config() {
    if [ ! -f "$CONFIG_SOURCE" ]; then
        echo "⚠️ 配置文件不存在：$CONFIG_SOURCE"
        return 1
    fi

    # 使用 python3 解析 JSON（兼容性更好）
    python3 -c "
import json
import sys

try:
    with open('$CONFIG_SOURCE', 'r') as f:
        config = json.load(f)
        print(json.dumps(config))
except Exception as e:
    sys.exit(1)
" 2>/dev/null || return 1
}

# 智能判断：是否应该跳过确认
should_skip_confirmation() {
    local user_message="$1"

    # 读取配置
    local config
    config=$(load_config) || return 1

    # 检查智能跳过条件
    for condition in "${SMART_SKIP_CONDITIONS[@]}"; do
        local key="${condition%%:*}"
        local value="${condition##*:}"

        case "$key" in
            task_complexity)
                if [[ "$value" == *"T1"* ]] || [[ "$value" == *"T2"* ]]; then
                    return 0  # 跳过
                fi
                ;;
            estimated_lines)
                local lines=$(echo "$user_message" | wc -l)
                if [ "$lines" -lt "${value#<}" ]; then
                    return 0  # 跳过
                fi
                ;;
            description_length)
                local length=${#user_message}
                if [ "$length" -lt "${value#<}" ]; then
                    return 0  # 跳过
                fi
                ;;
            user_explicit_confirm)
                # 检查是否明确要求确认（需要更复杂的逻辑）
                # 简化处理：如果没有"确认"、"同意"、"批准"等关键词，认为未明确
                if [[ "$user_message" != *"确认"* ]] && \
                   [[ "$user_message" != *"同意"* ]] && \
                   [[ "$user_message" != *"批准"* ]]; then
                    return 0  # 跳过
                fi
                ;;
        esac
    done

    return 1  # 需要确认
}

# 主函数
main() {
    local user_message="$1"

    # Paperclip agent 自动跳过范围确认
    if [ -n "${PAPERCLIP_RUN_ID:-}" ]; then
        exit 0
    fi

    # 检查是否应该智能跳过
    if should_skip_confirmation "$user_message"; then
        echo "✅ 智能跳过：T1/T2 任务，无需范围确认"
        exit 0  # 跳过，不阻止
    fi

    # 需要确认时显示范围锁定协议
    echo "🔒 范围锁定协议"
    echo ""
    echo "### 我的理解"
    echo "1. **您说的是**：\"$user_message\""
    echo ""
    echo "2. **我理解为**："
    echo "   - [具体操作1]"
    echo "   - [具体操作2]"
    echo ""
    echo "3. **预计改动**：< X 行，Y 个文件"
    echo ""
    echo "4. **以下我不会做**（除非您确认）："
    echo "   - 重构相关模块"
    echo "   - 添加额外功能"
    echo "   - 优化非相关文件"
    echo ""
    echo "### 请确认"
    echo "- **Y** - 范围正确，开始执行"
    echo "- **M** - 需要修改范围（请告诉我）"
    echo "- **E** - 扩大范围（请说明要加什么）"
    echo ""
    echo "**确认后我才会开始工作**"
}

# 执行主函数
main "$@"

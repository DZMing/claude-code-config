#!/bin/bash
# 自动任务复杂度分类器

MESSAGE="${CLAUDE_USER_MESSAGE:-}"

# T3/T4 关键词检测
if echo "$MESSAGE" | grep -qiE '新功能|新模块|重构|数据库|认证|登录|支付|架构'; then
    echo "💡 HINT: 检测到 T3/T4 级别任务，建议调用 Codex 协作" >&2
    echo "关键词: $(echo "$MESSAGE" | grep -oiE '新功能|新模块|重构|数据库|认证|登录|支付|架构' | head -1)" >&2
fi

# 大规模修改检测
if echo "$MESSAGE" | grep -qiE '所有|全部|整个项目|批量'; then
    echo "⚠️  HINT: 检测到大规模修改，建议使用 Git Worktree 隔离" >&2
fi

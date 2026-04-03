#!/bin/bash
# 自动代码审查 hook

echo "🔍 正在自动审查代码..."

# 调用 code-review-router
claude -p "使用 code-review-router 技能审查当前的 staged changes"

# 如果审查失败，询问是否继续
if [ $? -ne 0 ]; then
    read -p "审查发现问题，是否继续提交？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

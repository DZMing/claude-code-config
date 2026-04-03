#!/bin/bash
# 质量门禁 - 任务完成前的自动检查提醒

set -euo pipefail

if [ -t 0 ]; then
  exit 0
fi

input="$(cat)"

# Stop 事件触发时执行质量检查提醒
echo '{"result": "🚦 **质量门禁检查**\n\n请确认以下项目：\n\n### Gate 1: 任务完成度\n- [ ] 所有 TODO 标记完成\n- [ ] 实现符合需求\n\n### Gate 2: 代码质量\n- [ ] 无 TypeScript/lint 错误\n- [ ] 测试覆盖率 > 90%\n\n### Gate 3: 文档\n- [ ] 必要的注释已添加\n- [ ] README 已更新（如需要）\n\n如果以上都满足，任务才算真正完成。"}'

exit 0

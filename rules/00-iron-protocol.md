# 强制评估协议 - IRON RULE

> 所有正式开发走 Forge 引擎（/forge），本协议负责会话启动和技能激活

## 会话启动（自动，无需手动执行）

forge-session-start.js 已自动检测进行中的项目并注入恢复提示。

如需手动恢复：

1. `/forge:status` — 查看所有项目状态
2. `/forge resume {项目名}` — 恢复指定项目

## EVALUATE → ACTIVATE

收到任何开发请求时，检查是否需要激活技能：

| 请求类型                        | 路由                                 |
| ------------------------------- | ------------------------------------ |
| 新项目开发                      | `/forge`                             |
| 恢复项目                        | `/forge resume`                      |
| 快速小改动（<50行，非核心逻辑） | `/gsd:fast` 或 `/gsd:quick` 或直接改 |
| 调试问题                        | `/gsd:diagnose-issues`               |
| 代码审查                        | `gstack /review`                     |

**没有必要激活技能时，直接做**

## Session 结束

Forge 自动管理状态持久化（forge-context-save.js + forge-state-sync.js）

如果没有在 Forge 流水线内：

1. 确认代码已 commit（git status 应干净）
2. 关键决策已记录到 .planning/STATE.md 或 claude-progress.txt

上下文耗尽时 Forge 自动生成 `.planning/HANDOFF.json`，下次用 `/forge resume {项目名}` 恢复

# 核心记忆系统

## feature_list.json

只能改 `passes` 字段（false→true 需 E2E 通过），禁止改 id/category/description/steps。

## Forge 状态文件

| 文件         | 位置                                  | 用途         |
| ------------ | ------------------------------------- | ------------ |
| state.json   | `~/.forge/projects/{slug}/state.json` | 项目主状态   |
| STATE.md     | `.planning/STATE.md`                  | GSD 执行状态 |
| HANDOFF.json | `.planning/HANDOFF.json`              | 上下文恢复   |

## 兜底

记忆混乱时：`git log --oneline -20`

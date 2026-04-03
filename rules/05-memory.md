# 核心记忆系统

**进门先看，干完必记**

## feature_list.json（The Truth）

铁律：
1. 初始状态必须 `"passes": false`
2. **禁止删除或修改 feature 定义**（只能改 passes 字段）
3. 端到端测试通过后才能改为 `true`
4. 禁止改动 id/category/description/steps

结构：`[{ id, category, description, steps[], passes: false }]`

## task_plan.md（复杂任务专用）

创建条件：工具调用 >30 次、时长 >1 小时、改动 >200 行

```markdown
# Task Plan: [名称]
## Goal — 一句话目标
## Phases — checkbox 列表
## Status — 当前阶段
## Decisions Made — 决策+理由
## Errors Encountered — 错误+方案
```

使用规则：
1. 任务开始：创建
2. 阶段前：读取（刷新目标）
3. 阶段后：更新（标记 [x]）
4. 完成：总结到 claude-progress.txt，删除

配套：notes.md 存研究发现（不塞上下文）

## Forge 状态文件

| 文件 | 位置 | 用途 |
|------|------|------|
| state.json | `~/.forge/projects/{slug}/state.json` | 项目主状态（Forge hub） |
| STATE.md | `.planning/STATE.md` | GSD 执行状态（源头） |
| HANDOFF.json | `.planning/HANDOFF.json` | 上下文耗尽时的恢复文件 |
| snapshots/ | `~/.forge/projects/{slug}/snapshots/` | 上下文自动快照 |

## Git Log（兜底）

记忆混乱时：`git log --oneline -20`

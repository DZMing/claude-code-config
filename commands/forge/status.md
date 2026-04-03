---
name: forge:status
description: 查看所有 Forge 项目的当前状态（中文展示）
---

# /forge:status — 项目状态总览

## 执行步骤

### Step 1：扫描项目状态

读取 `~/.forge/projects/` 下所有 `state.json` 文件。

使用 Bash：
```bash
find ~/.forge/projects -name "state.json" 2>/dev/null | sort
```

对每个 state.json 提取：
- `project_slug`：项目标识
- `project_name`：项目名称（没有则用 slug）
- `status`：active / paused_context / complete
- `phase.current`、`phase.total`、`phase.name`：当前阶段
- `tech_stack`：技术栈
- `last_activity`：最后活动时间（取前10位）
- `resume_command`：恢复命令

### Step 2：输出状态表格

**如果有项目**，输出：

```
┌────────────────────────────────────────────────────────────────┐
│                    🔨 Forge 项目状态                            │
├──────────────────┬──────────────┬──────────┬──────────────────-┤
│ 项目             │ 当前阶段      │ 进度     │ 状态              │
├──────────────────┼──────────────┼──────────┼───────────────────┤
│ {项目名}         │ {阶段名}      │ N/M      │ 🔄 执行中         │
│ {项目名}         │ {阶段名}      │ N/M      │ ⏸️ 已暂停（上下文）│
│ {项目名}         │ —            │ M/M      │ ✅ 已完成         │
└──────────────────┴──────────────┴──────────┴───────────────────┘

恢复进行中的项目，输入：/forge resume {项目名}
```

**如果没有项目**，输出：

```
目前没有 Forge 项目。

开始新项目，输入 /forge 并粘贴你的需求文档。
```

### Step 3：对进行中的项目，输出详情

对每个 status = "active" 或 "paused_context" 的项目，额外展示：
- 最近活动时间
- 恢复命令
- 项目路径

格式：
```
━━━ {项目名} 详情 ━━━
状态：{状态中文描述}
最后活动：{日期}
位置：{项目路径}
恢复：/forge resume {slug}
```

---
name: resume
description: Restore context from memory and progress files
argument-hint: ""
---

# 🧠 恢复上下文 (Resume Context)

**执行以下 5 步恢复流程：**

---

## Step 1: 读取 OpenMemory

调用 openmemory MCP 搜索当前项目的关键信息：
- 项目目标
- 技术栈决策
- 已完成的任务
- 遇到的问题

## Step 2: 读取 claude-progress.txt

```bash
cat claude-progress.txt 2>/dev/null | head -80 || echo "⚠️ 未找到 claude-progress.txt，需要创建"
```

## Step 3: 读取 feature_list.json

```bash
cat feature_list.json 2>/dev/null || echo "⚠️ 未找到 feature_list.json"
```

## Step 4: 查看 Git 历史

```bash
git log --oneline -10 2>/dev/null || echo "⚠️ 不在 Git 仓库中"
```

## Step 5: 汇报恢复结果

用以下格式向用户汇报：

```
🧠 记忆恢复完成！

📋 **项目目标**: [从 OpenMemory 或 claude-progress.txt 获取]
🛠️ **技术栈**: [技术选型]
✅ **已完成**: [最近完成的 3-5 项任务]
⏭️ **下一步**: [建议接下来做什么]
❓ **待决策**: [如果有未解决的问题]

老板，要继续上次的工作吗？
```

---

**⚠️ 如果所有来源都为空，说明这是全新项目，需要先创建 claude-progress.txt 和 feature_list.json**

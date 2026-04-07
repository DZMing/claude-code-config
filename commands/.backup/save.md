# 💾 保存当前进度 (Save Progress)

**执行以下保存流程：**

---

## Step 1: 更新 PROGRESS.md

在 `docs/PROGRESS.md` 顶部添加最新进度记录：

```markdown
### [当前时间] - [本次核心成果]

- [x] **完成了**: [具体描述]
- [ ] **下一步**: [建议]

> **遇到的问题**: [如有]
```

## Step 2: 保存到 OpenMemory

调用 openmemory MCP 的 add_memory 工具，保存以下内容：

- 项目名称
- 本次完成的任务
- 关键技术决策
- 下一步计划

## Step 3: Git Commit

```bash
git add -A && git commit -m "chore: 进度保存 - [简述]"
```

## Step 4: 确认保存

向用户汇报：

```
💾 进度已保存！

📝 PROGRESS.md 已更新
🧠 OpenMemory 已同步
📦 Git 已提交

下次可以用 /resume 恢复上下文
```

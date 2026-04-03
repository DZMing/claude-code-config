---
name: safe-clear
description: Clear context while preserving memory
argument-hint: ""
---

# 🧹 清理上下文但保留记忆 (Clear with Memory Save)

**安全清理流程：先保存，再清空**

---

## Step 1: 自动保存进度

执行 `/save` 命令的所有步骤：
- 更新 claude-progress.txt
- 同步到 OpenMemory
- Git commit

## Step 2: 提示用户

```
🧠 记忆已保存到 OpenMemory 和 claude-progress.txt

现在可以安全执行 /clear 了

清空后，运行 /resume 即可恢复上下文
```

## Step 3: 等待用户确认

**不要自动执行 /clear**，让用户手动确认

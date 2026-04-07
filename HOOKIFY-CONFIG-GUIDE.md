# Hookify 自动化规则配置指南

> 最后更新: 2026-01-04
> 配置者: Claude Code

---

## 概览

你有 **11 个自动化规则**，分为两类：

| 类型              | 数量 | 行为                                |
| ----------------- | ---- | ----------------------------------- |
| 🚫 **Block 模式** | 5 个 | **强制执行** - 不满足条件就阻止操作 |
| ⚠️ **Warn 模式**  | 6 个 | **友好提醒** - 显示检查清单但不阻止 |

---

## 🚫 Block 模式规则（强制执行）

这些规则会**阻止操作**直到你满足条件：

### 1. requirement-check（需求检查）

- **触发时机**: 当你说"实现"、"开发"、"create"、"build"等
- **作用**: 强制确认需求清晰度
- **文件**: `hookify.requirement-check.local.md`

### 2. coverage-check（覆盖率检查）

- **触发时机**: 会话结束时
- **作用**: 强制检查测试、文档、Git 状态
- **文件**: `hookify.coverage-check.local.md`

### 3. git-commit-convention（提交规范）

- **触发时机**: 执行 `git commit` 时
- **作用**: 强制遵循提交格式规范
- **文件**: `hookify.git-commit.local.md`

### 4. debug-protocol（调试协议）

- **触发时机**: 当你说"bug"、"报错"、"修复"等
- **作用**: 强制使用系统化调试流程
- **文件**: `hookify.debug-protocol.local.md`

### 5. tdd-enforce（TDD 强制）

- **触发时机**: 修改 src/lib/app 下的代码时
- **作用**: 强制遵循测试驱动开发
- **文件**: `hookify.tdd-enforce.local.md`

---

## ⚠️ Warn 模式规则（友好提醒）

这些规则会**显示提醒**但不阻止操作：

### 1. taste-check（品味检查）

- **触发时机**: 修改代码逻辑时
- **作用**: 提醒检查代码品味（Linus 风格）
- **文件**: `hookify.taste-check.local.md`

### 2. code-review（代码审查）

- **触发时机**: 修改代码文件时
- **作用**: 提醒进行代码自审
- **文件**: `hookify.code-review.local.md`

### 3. defense-in-depth（纵深防御）

- **触发时机**: 处理外部输入/API 调用时
- **作用**: 提醒添加多层验证
- **文件**: `hookify.defense-in-depth.local.md`

### 4. auto-documenter（自动文档）

- **触发时机**: 创建新函数/类但没有注释时
- **作用**: 提醒添加文档注释
- **文件**: `hookify.auto-documenter.local.md`

### 5. text-correction（文本校正）

- **触发时机**: 编辑 markdown/txt 文件时
- **作用**: 提醒检查文本质量
- **文件**: `hookify.text-correction.local.md`

### 6. finish-branch（分支完成）

- **触发时机**: 会话结束时
- **作用**: 提醒检查分支状态
- **文件**: `hookify.finish-branch.local.md`

---

## 如何调整规则

### 禁用某个规则

编辑对应文件，把 `enabled: true` 改成 `enabled: false`

### 改变规则行为

编辑对应文件，把 `action: block` 改成 `action: warn`（或反过来）

### 规则文件位置

所有规则都在: `~/.claude/hookify.*.local.md`

---

## 工作流效果

### 你说"实现一个登录功能"时

1. ✅ **requirement-check** 触发 → 显示需求检查清单
2. 必须确认需求清晰后才能继续

### 你说"有个 bug 需要修复"时

1. ✅ **debug-protocol** 触发 → 显示调试流程
2. 必须遵循系统化调试步骤

### 写代码时

1. ⚠️ **tdd-enforce** 提醒 → 确保先写测试
2. ⚠️ **taste-check** 提醒 → 检查代码品味
3. ⚠️ **defense-in-depth** 提醒 → 检查安全性

### 提交代码时

1. ✅ **git-commit-convention** 触发 → 强制规范格式

### 结束会话时

1. ✅ **coverage-check** 触发 → 检查测试、文档、状态
2. ⚠️ **finish-branch** 提醒 → 检查分支状态

---

## 设计理念

**Block 规则**（5个）用于**关键流程控制**：

- 需求不清晰 → 不让开始
- 调试不规范 → 不让乱改
- 提交不规范 → 不让提交
- 结束不检查 → 不让走

**Warn 规则**（6个）用于**质量建议**：

- 代码品味、安全检查、文档完善等
- 不强制，但会提醒
- 帮你养成好习惯

---

## 总结

你的 Claude Code 现在有了一套**自动化质量门禁**：

```
📥 任务输入
    ↓
🚫 需求检查 (block) ← 不清晰就卡住
    ↓
🔧 开发过程
    ↓
⚠️ TDD/品味/安全 (warn) ← 友好提醒
    ↓
🚫 提交检查 (block) ← 不规范就卡住
    ↓
🚫 结束检查 (block) ← 没做完就卡住
    ↓
📤 任务完成
```

**效果**: 即使你不懂编程，系统也会自动执行质量控制流程

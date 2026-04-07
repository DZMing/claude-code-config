# 标准化会话启动流程 (Standardized Session Startup Flow)

> **基于 Anthropic Engineering 官方最佳实践**
> 参考：https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents

## 触发时机

每个新会话开始时（Claude-Mem 自动注入后立即执行）

## 执行原则

### AI 行为模式（Agent Behavior Pattern）

- **显式思考**：在执行每个步骤前，AI 应该输出其意图和预期
- **工具优先**：优先使用工具获取信息，而非依赖记忆或假设
- **状态验证**：每个步骤后验证结果，再进行下一步

### 期望的 AI 输出模式（Expected AI Response Pattern）

```markdown
[Assistant] 我先获取当前项目的方位和上下文。

[Tool Use] <bash - pwd>

[Assistant] 现在让我检查最近的 Git 历史，了解上次工作内容。

[Tool Use] <bash - git log --oneline -20>

[Assistant] 我看到最近完成了 [任务描述]。让我读取进度文件获取详细信息。

[Tool Use] <read - claude-progress.txt>

[Assistant] 根据记录，上次做到了 [具体进度]。让我检查功能状态。

[Tool Use] <read - feature_list.json 或 task_plan.md>
```

## 执行步骤（按顺序）

### 步骤 1：确认工作目录（Verify Working Directory）

**AI 助手消息**：

```markdown
[Assistant] 我先确认当前工作目录，防止路径漂移。
```

**工具调用**：

```bash
pwd
```

**预期结果**：

```
/Users/zhimingdeng/Documents/claude/claude code优化/项目名称
```

**验证逻辑**：

- 如果路径不符合预期 → 切换到正确目录
- 如果路径包含特殊字符或空格 → 记录警告，继续执行

---

### 步骤 2：了解最近变更（Review Recent Changes）

**AI 助手消息**：

```markdown
[Assistant] 现在让我检查 Git 历史记录，快速了解最近的工作内容。
```

**工具调用**：

```bash
git log --oneline -20 --decorate
```

**预期结果**：

```
abc1234 (HEAD -> main) feat(auth): 实现用户登录功能 (Pass Test)
def5678 (origin/main) fix(api): 修复 CORS 跨域问题
...
```

**结果解析**：

- 识别最近 5-10 条 commit 的类型（feat/fix/refactor）
- 注意分支状态（是否在主分支、是否有未推送的 commit）
- 识别潜在的中间状态（WIP commits）

---

### 步骤 3：读取项目进度档案（Load Progress Archive）

**AI 助手消息**：

```markdown
[Assistant] 根据历史记录，我需要读取项目进度档案，了解详细的工作状态。
```

**工具调用**：

```bash
cat claude-progress.txt
```

**预期文件结构**：

```markdown
# 项目进度记录本

**项目名称**: [自动填写]
**最后更新**: [YYYY-MM-DD HH:mm]

---

## 最新进度（倒序记录，最新的在最上面）

### [YYYY-MM-DD HH:mm] - [本次核心成果]

- [x] **核心功能**: 创建 LoginForm 组件
- [x] **集成工作**: 集成 API 调用，解决 CORS 问题
- [ ] **下一步**: 添加密码重置功能
```

**结果解析**：

- 提取"最后更新"时间戳
- 识别"最新进度"的核心内容
- 记录"下一步"任务作为备选项

**如果文件不存在**：

```markdown
[Assistant] 未发现进度档案文件。我将在首次任务完成后创建 `claude-progress.txt`。
```

---

### 步骤 4：读取功能状态列表（Load Feature Status）

**AI 助手消息**：

```markdown
[Assistant] 让我检查功能完成状态和任务计划。
```

**工具调用**：

```bash
# 优先级顺序：
1. 如果存在 task_plan.md（T3/T4 复杂任务）
   cat task_plan.md

2. 如果存在 feature_list.json（功能追踪）
   cat feature_list.json

3. 如果都不存在
   echo "无功能状态文件"
```

**预期结果示例（task_plan.md）**：

```markdown
# Task Plan: 实现用户认证系统

## Goal

添加完整的用户登录、注册、密码重置功能

## Phases

- [x] Phase 1: 规划与设计
- [ ] Phase 2: 核心功能实现
- [ ] Phase 3: 测试与优化
- [ ] Phase 4: 审核与交付

## Status

**Currently in Phase 2** - 实现登录表单组件

## Decisions Made

- 使用 JWT 认证
- PostgreSQL 数据库
```

**预期结果示例（feature_list.json）**：

```json
{
  "feature_login": {
    "desc": "用户登录",
    "implemented": false,
    "test_criteria": "密码错误报红，正确跳转首页",
    "steps": [...],
    "last_attempt": null,
    "blocked_by": []
  }
}
```

**结果解析**：

- 如果 **task_plan.md 存在** → 当前是 T3/T4 复杂任务，必须严格遵循计划
- 如果 **feature_list.json 存在** → 识别未实现的功能，按优先级排序
- 如果 **都不存在** → 创建 `feature_list.json` 作为功能追踪起点

---

### 步骤 4.5：检查上下文压缩历史（Auto Recovery）

**AI 助手消息**：

```markdown
[Assistant] 让我检查是否有上下文压缩历史需要恢复。
```

**工具调用**：

```bash
# 检查压缩历史
if [ -f ~/.claude/context-compression-history/latest.md ]; then
    echo "🔄 检测到上下文压缩历史"
    cat ~/.claude/context-compression-history/latest.md

    # 读取最近访问的文件列表（从压缩摘要中提取）
    echo ""
    echo "📂 正在恢复最近访问的文件..."

    # 提取文件列表（伪代码，实际需要读取摘要内容）
    # grep -A 10 "最近变更" ~/.claude/context-compression-history/latest.md
else
    echo "无上下文压缩历史"
fi
```

**预期结果示例**：

```markdown
🔄 检测到上下文压缩历史

# 上下文压缩摘要（2026-02-14 15:30）

## 当前任务

- [进行中] 实现用户登录功能

## 最近变更（最近5个文件）

- src/auth.ts: 添加JWT认证逻辑
- src/components/LoginForm.tsx: 创建登录表单组件
  ...

📂 正在恢复最近访问的文件...
```

**恢复逻辑**：

- **检测到压缩历史**：显示压缩摘要
- **自动加载文件**：下次工具调用时优先加载最近5个文件
- **删除标记**：恢复成功后删除 `latest.md` 符号链接

**验证逻辑**：

- ✅ 压缩历史存在 → 显示摘要并记录到上下文
- ❌ 压缩历史不存在 → 跳过，继续下一步

---

### 步骤 5：检查检查点恢复（Check Checkpoint Recovery）

**AI 助手消息**：

```markdown
[Assistant] 让我检查是否有未完成的任务检查点需要恢复。
```

**工具调用**：

```bash
# 检查检查点标记文件
if [ -f checkpoints/.latest ]; then
    echo "检查到未完成的检查点："
    cat checkpoints/.latest | jq -r '.context.task_description'
    echo ""
    echo "检查点详情："
    cat checkpoints/.latest
else
    echo "无未完成的检查点"
fi
```

**预期结果示例**：

```json
{
  "checkpoint_id": "uuid-123",
  "timestamp": "2026-02-14T10:30:00Z",
  "state": "in_progress",
  "phase": "implementation",
  "context": {
    "task_description": "实现用户登录功能",
    "files_modified": ["src/auth.ts", "src/components/Login.tsx"],
    "decisions_made": ["使用 JWT 认证"],
    "next_steps": ["添加错误处理", "集成后端 API"]
  },
  "git_commit": "abc123",
  "test_results": { "passed": 3, "failed": 0 }
}
```

**恢复决策**：

- **如果 state = "in_progress"** → 询问用户是否恢复检查点

  ```
  [Assistant] ⚠️ 检测到未完成的检查点：
  - 任务：实现用户登录功能
  - 阶段：implementation（进行中）
  - 状态：已修改 2 个文件，测试 3 通过

  是否恢复此检查点？（输入 /resume 恢复，或继续新任务）
  ```

- **如果 state = "blocked"** → 强制建议恢复或调查阻塞原因
- **如果 state = "completed"** → 删除检查点标记，记录到 claude-progress.txt

---

### 步骤 6：启动并验证开发环境（Initialize & Validate Environment）

**AI 助手消息**：

```markdown
[Assistant] 最后，让我初始化开发环境并验证一切正常。
```

**工具调用**：

```bash
# 6a. 如果存在 init.sh，运行初始化脚本
if [ -f init.sh ]; then
    echo "运行初始化脚本..."
    ./init.sh
else
    echo "无初始化脚本（init.sh），跳过"
fi

# 6b. 运行基础测试验证环境
if [ -f package.json ]; then
    npm test --list 2>/dev/null | head -20
elif [ -f requirements.txt ]; then
    pytest --collect-only 2>/dev/null | head -20
elif [ -f go.mod ]; then
    go test -list ./... 2>/dev/null | head -20
else
    echo "未检测到测试框架"
fi

# 6c. 检查开发服务器状态
if [ -f .dev.pid ]; then
    PID=$(cat .dev.pid)
    if ps -p $PID > /dev/null; then
        echo "✅ 开发服务器运行中 (PID: $PID)"
    else
        echo "⚠️ 开发服务器未运行（PID 文件过期）"
    fi
else
    echo "⚠️ 开发服务器未启动"
fi
```

**预期结果**：

```
运行初始化脚本...
🚀 初始化开发环境...
✅ 创建进度文件: claude-progress.txt
✅ 开发服务器已启动 (PID: 12345)

测试套件：
  - login.test.js
  - api.test.js
  - utils.test.js
```

**验证逻辑**：

- ✅ **测试套件加载成功** → 环境正常
- ❌ **测试失败/找不到** → 记录警告，但不要阻塞启动
- ⚠️ **开发服务器未运行** → 提醒用户可能需要启动

---

### 步骤 7：显示自定义状态栏（Show Custom Status Bar）

**AI 助手消息**：

```markdown
[Assistant] 最后，让我显示当前会话状态和资源使用情况。
```

**工具调用**：

```bash
# 运行状态栏脚本
~/.claude/scripts/status-bar.sh
```

**预期结果**：

```
[claude-sonnet-4-5] project-name|main [3] ↑ [45%]
```

**结果解读**：

- **model**: 当前使用的模型
- **directory**: 当前项目目录
- **branch**: Git分支
- **[N]**: 未提交文件数
- **↑/=**: 同步状态（ahead/equal）
- **[%]**: Token使用百分比

**状态解读规则**：

- Token ≥ 80%：⚠️ 建议使用 `/compact` 压缩上下文
- Token ≥ 90%：⚠️ 强烈建议立即压缩或重启会话
- 未提交文件 ≥ 5：⚠️ 建议提交当前工作
- 同步状态显示 ↑：⚠️ 提醒有未推送的提交

---

## 完成后汇报（Completion Report）

### 成功启动（All Checks Passed）

```markdown
[Assistant] ✅ 会话启动完成，一切正常！

📊 **当前状态**：

- 工作目录：/path/to/project
- Git 分支：main（干净）
- 上次进度：实现用户登录功能
- 未完成任务：添加密码重置功能

🎯 **建议下一步**：
根据 task_plan.md，当前应该在 Phase 2: 核心功能实现

准备接收您的指令。
```

### 检测到未完成检查点（Checkpoint Detected）

```markdown
[Assistant] ⚠️ 会话启动完成，但检测到未完成的任务！

📦 **未完成检查点**：

- 任务：实现用户登录功能
- 阶段：implementation（进行中）
- 已修改：2 个文件
- 测试状态：3 通过，0 失败

🔄 **恢复选项**：

1. 输入 `/resume` - 自动恢复检查点并继续工作
2. 描述新任务 - 放弃当前检查点，开始新任务

等待您的决策。
```

### 环境异常（Environment Issues Detected）

```markdown
[Assistant] ⚠️ 会话启动完成，但发现环境问题：

❌ **检测到的问题**：

- 依赖缺失：未找到 node_modules
- 测试套件：npm test 失败（退出码 1）
- 开发服务器：未运行

🔧 **建议修复操作**：

1. 运行 `npm install` 安装依赖
2. 运行 `npm run dev` 启动开发服务器
3. 或运行 `./init.sh` 自动初始化环境

是否立即自动修复？（输入 "自动修复" 或 "手动处理"）
```

## 集成到规则文件

### 主集成点

- **`~/.claude/rules/00-iron-protocol.md`** - 第 0 步（记忆加载）之后立即执行
- **`~/.claude/rules/05-memory.md`** - Claude-Mem 自动注入之后
- **`~/.claude/checkpoint-recovery.md`** - 作为检查点恢复的前置步骤

### 自动执行条件

- **新会话开始**：自动触发，无需用户指令
- **Claude-Mem 注入后**：确保历史上下文已加载
- **任何 /resume 命令**：用户主动请求恢复上下文

### 与其他系统的集成

**检查点系统**（`~/.claude/checkpoint-recovery.md`）：

- 步骤 5 的检查点检测逻辑直接调用检查点恢复机制
- 如果检测到 `.latest` 文件，自动提示用户运行 `/resume`

**性能监控系统**（`~/.claude/performance-monitoring.md`）：

- 会话启动完成时，记录启动时间和加载的文件数量
- 如果启动时间 > 10 秒，记录性能警告

**上下文压缩系统**（`~/.claude/context-compression.md`）：

- 如果启动时加载的文件 > 5 个，触发上下文压缩建议
- 优先加载最近修改的 5 个文件，其他文件按需加载

## 常见问题排查（Troubleshooting）

### 问题：Git 分支显示错误

**症状**：`git log` 显示"不在任何分支上"
**解决**：

```bash
git checkout -b temp-branch-$(date +%s)
git checkout main
```

### 问题：claude-progress.txt 不存在或为空

**症状**：`cat claude-progress.txt` 失败或文件为空
**解决**：

```markdown
[Assistant] 未发现进度档案文件。我将在首次任务完成后创建它。
```

### 问题：检查点文件损坏

**症状**：`cat checkpoints/.latest | jq` 失败（JSON 格式错误）
**解决**：

```bash
# 备份损坏的检查点
mv checkpoints/.latest checkpoints/.latest.corrupted.$(date +%s)

# 尝试从最近的 Git commit 恢复
git checkout HEAD~1 -- checkpoints/.latest 2>/dev/null || echo "无法恢复"
```

### 问题：init.sh 执行失败

**症状**：`./init.sh` 返回非零退出码
**解决**：

```markdown
[Assistant] 初始化脚本执行失败（退出码：X）。

可能原因：

- 依赖安装失败（网络问题或包不可用）
- 权限不足（需要 chmod +x init.sh）
- 脚本中的命令不存在

建议：

1. 检查 init.sh 的权限：`chmod +x init.sh`
2. 手动运行依赖安装：`npm install` 或 `pip install -r requirements.txt`
3. 查看完整错误日志：`./init.sh 2>&1 | tee init-error.log`
```

## 最佳实践提醒（Best Practices Reminders）

### ✅ 推荐做法

- **显式思考**：每步都输出 AI 助手消息，让用户了解 AI 的意图
- **工具优先**：用工具获取信息，而非依赖记忆或假设
- **状态验证**：每个步骤后验证结果，再进行下一步
- **错误处理**：遇到问题不要中断，记录警告并继续执行

### ❌ 避免做法

- **隐式执行**：不要直接运行工具而不说明意图
- **假设状态**：不要假设文件存在或环境正常，用工具验证
- **过度检查**：不要重复检查同一个文件（缓存结果）
- **阻塞启动**：不要因为次要问题（如开发服务器未运行）而完全阻塞启动

### 🔧 调试模式

如果要调试会话启动流程，添加以下标志：

```bash
# 启用详细输出
export CLAUDE_DEBUG_SESSION_START=true

# 启用性能分析
export CLAUDE_PROFILE_STARTUP=true
```

这将输出每个步骤的执行时间和详细日志。

## 集成到规则文件

- `00-iron-protocol.md` - 第 0 步（记忆加载）之后
- `05-memory.md` - Claude-Mem 自动注入之后

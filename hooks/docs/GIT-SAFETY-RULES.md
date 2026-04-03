# Git 安全防护系统完整规则说明

> **版本**: 2.0 - 完整版（10 条规则）  
> **最后更新**: 2026-01-22  
> **适用环境**: Claude Code + OpenCode

---

## 📋 规则总览

| 规则编号 | 名称 | 防护对象 | 执行时机 | 严重程度 |
|---------|------|---------|---------|---------|
| **规则 1** | 禁止 main/master 的 force push | Git 历史安全 | PreToolUse (Bash) | 🔴 阻止 |
| **规则 2** | 检查远程是否有新提交 | 代码覆盖防护 | PreToolUse (Bash) | 🔴 阻止 |
| **规则 3** | 自动替换为安全版本 | 改用 --force-with-lease | PreToolUse (Bash) | 🟢 自动 |
| **规则 4** | commit --amend 安全检查 | 已推送提交保护 | PreToolUse (Bash) | 🔴 阻止 |
| **规则 5** | rebase 自动备份 | 历史重写保护 | PreToolUse (Bash) | 🟢 自动 |
| **规则 6** | 硬编码敏感信息检测 | 密钥泄漏防护 | PreToolUse (Bash) | 🔴 阻止 |
| **规则 7** | rm -rf 危险路径检测 | 系统文件保护 | PreToolUse (Bash) | 🔴 阻止 |
| **规则 8** | sudo 操作确认 | 系统权限保护 | PreToolUse (Bash) | 🔴 阻止 |
| **规则 9** | 删除关键文件确认 | 项目配置保护 | PreToolUse (Bash) | 🔴 阻止 |
| **规则 10** | 修改关键配置自动备份 | 配置文件保护 | PreToolUse (Write/Edit) | 🟢 自动 |

---

## 📖 详细规则说明

### 规则 1: 禁止 main/master 的 force push

**触发条件**:
```bash
git push --force
git push -f
# 且当前分支为 main 或 master
```

**防护逻辑**:
```bash
if [[ "$COMMAND" =~ (push.*--force|push.*-f) ]]; then
    if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
        # 阻止执行
    fi
fi
```

**错误提示**:
```
🚫 安全阻止: main/master 分支禁止 force push

如果确实需要，请：
  1. 切换到其他分支
  2. 联系团队负责人
  3. 手动执行（AI 不会帮你执行）
```

**为什么需要这条规则**:
- 保护主分支的提交历史完整性
- 防止覆盖团队成员的提交
- 避免破坏 CI/CD 流水线

---

### 规则 2: 检查远程是否有新提交

**触发条件**:
```bash
git push --force  # 任何分支
```

**防护逻辑**:
```bash
git fetch origin "$BRANCH"
REMOTE_COMMITS=$(git log HEAD..origin/$BRANCH --oneline | wc -l)

if [ "$REMOTE_COMMITS" -gt 0 ]; then
    # 阻止执行
fi
```

**错误提示**:
```
⚠️  安全警告: 远程有 3 个新提交

建议操作:
  git pull --rebase  # 先拉取远程更新

AI 已自动阻止 force push，保护你的代码
```

**为什么需要这条规则**:
- 防止覆盖协作者的新提交
- 强制同步最新代码再推送
- 避免代码丢失

---

### 规则 3: 自动替换为安全版本

**触发条件**:
```bash
git push --force  # 通过规则 1 和 2 检查后
```

**防护逻辑**:
```bash
# 自动替换
git push --force  →  git push --force-with-lease
```

**执行提示**:
```
✅ 安全替换: 使用 --force-with-lease

原命令: git push --force
安全命令: git push --force-with-lease
```

**为什么需要这条规则**:
- `--force-with-lease` 更安全：如果远程有新提交会失败
- 用户不需要记住复杂的参数
- AI 自动执行最佳实践

---

### 规则 4: commit --amend 安全检查

**触发条件**:
```bash
git commit --amend
```

**防护逻辑**:
```bash
LAST_COMMIT=$(git rev-parse HEAD)

if git branch -r --contains "$LAST_COMMIT" | grep -q "origin/$BRANCH"; then
    # 这个 commit 已经 push 到远程，阻止 amend
fi
```

**错误提示**:
```
🚫 安全阻止: 这个 commit 已经 push，不能 amend

建议: 创建新的 commit 而不是修改旧的
  git commit -m 'fix: 修正上个 commit 的问题'

原因: amend 已 push 的 commit 会导致历史冲突
```

**为什么需要这条规则**:
- amend 已推送的 commit 会改变 commit hash
- 导致协作者需要 force pull
- 破坏提交历史的完整性

---

### 规则 5: rebase 自动备份

**触发条件**:
```bash
git rebase
```

**防护逻辑**:
```bash
BACKUP_BRANCH="backup-$BRANCH-$(date +%Y%m%d-%H%M%S)"
git branch "$BACKUP_BRANCH"
```

**执行提示**:
```
💾 自动备份: backup-feature-20260122-142530

如果 rebase 出问题，可以恢复:
  git checkout backup-feature-20260122-142530
```

**为什么需要这条规则**:
- rebase 会重写提交历史，有风险
- 自动备份提供了恢复点
- 用户不需要记得手动备份

---

### 规则 6: 硬编码敏感信息检测

**触发条件**:
```bash
git commit
git add
```

**检测模式**:
```bash
PATTERNS=(
    "password\s*[:=]\s*['\"]?[^'\"[:space:]]+"
    "api[_-]?key\s*[:=]\s*['\"]?[^'\"[:space:]]+"
    "secret\s*[:=]\s*['\"]?[^'\"[:space:]]+"
    "token\s*[:=]\s*['\"]?[^'\"[:space:]]+"
    "private[_-]?key\s*[:=]"
    "aws[_-]?secret[_-]?access[_-]?key"
    "sk-[A-Za-z0-9]{32,}"     # OpenAI API key
    "ghp_[A-Za-z0-9]{36}"      # GitHub token
    "glpat-[A-Za-z0-9_-]{20,}" # GitLab token
)
```

**错误提示**:
```
🚫 安全阻止: 检测到硬编码敏感信息

文件: config.js
匹配模式: api_key\s*[:=]

建议：
  1. 使用环境变量: export API_KEY=xxx
  2. 使用配置文件并加入 .gitignore: config.local.json
  3. 使用密钥管理工具: AWS Secrets Manager, Azure Key Vault

AI 已自动阻止提交，保护你的密钥安全
```

**为什么需要这条规则**:
- 防止 API key、密码泄漏到 Git 历史
- 一旦提交，即使删除也会留在历史中
- 自动强制执行安全最佳实践

---

### 规则 7: rm -rf 危险路径检测

**触发条件**:
```bash
rm -rf [路径]
```

**危险路径列表**:
```bash
DANGEROUS_PATHS=(
    "/"
    "/usr"
    "/bin"
    "/sbin"
    "/etc"
    "/var"
    "/home"
    "/root"
    "~"
    "/*"
    "/.*"
    "\$HOME"
    "."
)
```

**错误提示**:
```
🚫 安全阻止: 危险的 rm -rf 操作

命令: rm -rf /
危险路径: /

这个操作可能删除系统关键文件或整个文件系统
AI 已自动阻止执行
```

**通配符检测**:
```bash
# 检测 rm -rf * 这类危险操作
if [[ "$COMMAND" =~ rm.*-rf.*\* ]]; then
    # 阻止执行，建议先用 ls 预览
fi
```

**为什么需要这条规则**:
- `rm -rf /` 会删除整个系统
- 通配符可能误删大量文件
- 保护用户免受毁灭性误操作

---

### 规则 8: sudo 操作确认

**触发条件**:
```bash
sudo [任何命令]
```

**错误提示**:
```
⚠️  警告: sudo 需要管理员权限

命令: sudo apt install test

这个操作需要管理员权限，可能影响系统安全

建议：
  1. 检查是否真的需要 sudo
  2. 优先使用用户级别的操作
  3. 如果确实需要，请手动执行

AI 已自动阻止执行
```

**为什么需要这条规则**:
- sudo 可以修改系统关键文件
- 防止 AI 意外获得过高权限
- 强制用户手动确认高危操作

---

### 规则 9: 删除关键文件确认

**触发条件**:
```bash
rm [关键文件]
```

**关键文件列表**:
```bash
CRITICAL_FILES=(
    "package.json"
    "package-lock.json"
    "yarn.lock"
    "pnpm-lock.yaml"
    "requirements.txt"
    "Pipfile"
    "Cargo.toml"
    "go.mod"
    ".git"
    ".gitignore"
    "README.md"
    "LICENSE"
    "tsconfig.json"
    "webpack.config"
    "vite.config"
    ".env"
    "docker-compose"
)
```

**错误提示**:
```
⚠️  警告: 尝试删除关键文件

命令: rm package.json
文件: package.json

这是项目的关键配置文件，删除可能导致项目无法运行

建议：
  1. 如果是临时备份，使用 git stash
  2. 如果确实要删除，请手动执行

AI 已自动阻止执行
```

**为什么需要这条规则**:
- 防止误删项目依赖配置
- 删除这些文件会导致项目无法运行
- 强制用户手动确认重要操作

---

### 规则 10: 修改关键配置自动备份

**触发条件**:
```bash
Write/Edit 操作修改以下文件：
```

**关键配置文件列表**:
```bash
CRITICAL_CONFIG_FILES=(
    ".gitignore"
    "package.json"
    "tsconfig.json"
    "webpack.config.js"
    "vite.config.js"
    "next.config.js"
    "tailwind.config.js"
    ".eslintrc"
    ".prettierrc"
    "docker-compose.yml"
    "Dockerfile"
)
```

**防护逻辑**:
```bash
# 在项目根目录创建 .backups/ 文件夹
BACKUP_DIR="$(dirname \"$FILE\")/.backups"
mkdir -p "$BACKUP_DIR"

# 备份文件，带时间戳
BACKUP_FILE="$BACKUP_DIR/$BASENAME.$(date +%Y%m%d-%H%M%S).bak"
cp "$FILE" "$BACKUP_FILE"
```

**执行提示**:
```
💾 自动备份关键配置: .backups/package.json.20260122-142530.bak
```

**为什么需要这条规则**:
- 配置文件改错可能导致项目无法运行
- 自动备份提供快速恢复机制
- 用户不需要记得手动备份

---

## 🔧 技术实现

### Hook 配置 (global.json)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c '[语法检查...]' -- \"$FILE\""
          },
          {
            "type": "command",
            "command": "bash -c '[敏感信息检查...]' -- \"$FILE\""
          },
          {
            "type": "command",
            "command": "bash -c '[关键配置备份...]' -- \"$FILE\""
          }
        ],
        "description": "🛡️ 纯Hooks：保存前检查（语法+安全+备份）"
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/git-safety.sh \"$COMMAND\""
          }
        ],
        "description": "🔒 Git 安全规范自动执行"
      }
    ]
  }
}
```

### Shell 脚本结构 (git-safety.sh)

```bash
#!/bin/bash
set -e

COMMAND="$1"
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")

# 规则 1-5: Git 操作防护
# 规则 6: 硬编码敏感信息检测
# 规则 7: rm -rf 危险路径检测
# 规则 8: sudo 操作确认
# 规则 9: 删除关键文件确认
# 规则 10: 在 global.json 的 PreToolUse Hook 中实现

# 如果没有匹配任何规则，放行
echo "✅ 安全检查通过"
exit 0
```

---

## 🧪 测试验证

### 测试场景 1: 禁止 main 分支 force push
```bash
# 当前分支: main
$ git push --force

# 预期结果：
🚫 安全阻止: main/master 分支禁止 force push
```

### 测试场景 2: 检测硬编码密钥
```bash
# 文件内容: const API_KEY = "sk-1234567890..."
$ git add config.js
$ git commit -m "add config"

# 预期结果：
🚫 安全阻止: 检测到硬编码敏感信息
文件: config.js
匹配模式: sk-[A-Za-z0-9]{32,}
```

### 测试场景 3: 阻止危险删除
```bash
$ rm package.json

# 预期结果：
⚠️  警告: 尝试删除关键文件
文件: package.json
```

### 测试场景 4: 自动备份配置
```bash
# 修改 package.json
$ [AI 编辑文件]

# 预期结果：
💾 自动备份关键配置: .backups/package.json.20260122-142530.bak
```

---

## 📊 防护统计

| 防护类型 | 规则数量 | 严重程度分布 |
|---------|---------|------------|
| **Git 操作** | 5 | 🔴 阻止 × 2, 🟢 自动 × 3 |
| **敏感信息** | 1 | 🔴 阻止 × 1 |
| **文件操作** | 3 | 🔴 阻止 × 2, 🟢 自动 × 1 |
| **系统操作** | 1 | 🔴 阻止 × 1 |
| **总计** | 10 | 🔴 阻止 × 7, 🟢 自动 × 3 |

---

## 🎯 设计理念

### 用户不需要懂技术
- **自动执行最佳实践**：无需用户记忆复杂的 Git 规则
- **详细的错误说明**：每个阻止操作都附带原因和建议
- **自动替换危险命令**：如 `--force` → `--force-with-lease`

### 防护分级
- **🔴 阻止级**：毁灭性操作，绝对不能执行
- **🟡 警告级**：高危操作，需要用户确认
- **🟢 自动级**：安全操作，AI 自动执行

### 零配置
- 无需用户手动配置
- Hook 自动生效
- 跨项目通用

---

## 🔄 同步状态

| 文件 | Claude Code | OpenCode | 状态 |
|------|-------------|----------|------|
| `git-safety.sh` | ✅ | ✅ | 已同步 |
| `global.json/hooks.json` | ✅ | ✅ | 已同步 |
| `GIT-SAFETY-RULES.md` | ✅ | ⏳ | 待同步 |

---

## 📝 维护日志

### 2026-01-22
- ✅ 创建规则 1-5（Git 操作防护）
- ✅ 创建规则 6-9（文件和系统操作防护）
- ✅ 创建规则 10（配置文件自动备份）
- ✅ 更新 global.json 和 hooks.json
- ✅ 测试验证所有规则
- ✅ 创建完整文档

### 未来计划
- 添加更多敏感信息检测模式（AWS、Azure 密钥）
- 支持自定义关键文件列表
- 添加规则启用/禁用配置
- 创建交互式验证模式（询问用户确认）

---

**最后更新**: 2026-01-22 14:25:30  
**维护者**: Claude Code AI + OpenCode AI  
**问题反馈**: 检查 `~/.claude/hooks/git-safety.sh` 执行日志

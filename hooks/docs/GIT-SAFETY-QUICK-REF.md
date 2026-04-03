# Git 安全防护系统 - 快速参考卡

> **用途**: 一页纸快速查看所有防护规则  
> **位置**: `~/.claude/hooks/GIT-SAFETY-QUICK-REF.md`

---

## 🛡️ 10 条安全规则速查

| # | 规则 | 触发 | 结果 |
|---|------|------|------|
| 1️⃣ | **禁止 main/master force push** | `git push --force` on main | 🚫 阻止 |
| 2️⃣ | **检查远程新提交** | `git push --force` 且远程有新提交 | 🚫 阻止 |
| 3️⃣ | **自动安全替换** | `git push --force` | 🟢 `→ --force-with-lease` |
| 4️⃣ | **amend 安全检查** | `git commit --amend` 已推送的 commit | 🚫 阻止 |
| 5️⃣ | **rebase 自动备份** | `git rebase` | 🟢 创建 `backup-*` 分支 |
| 6️⃣ | **硬编码敏感信息** | `git commit` 包含密钥的文件 | 🚫 阻止 |
| 7️⃣ | **rm -rf 危险路径** | `rm -rf /`, `rm -rf ~`, 等 | 🚫 阻止 |
| 8️⃣ | **sudo 操作** | `sudo [任何命令]` | 🚫 阻止 |
| 9️⃣ | **删除关键文件** | `rm package.json`, 等 | 🚫 阻止 |
| 🔟 | **关键配置备份** | 编辑 package.json, tsconfig.json, 等 | 🟢 自动备份到 `.backups/` |

---

## 🔍 敏感信息检测模式（9 种）

```regex
password\s*[:=]             # 密码
api[_-]?key\s*[:=]          # API 密钥
secret\s*[:=]               # 通用密钥
token\s*[:=]                # 通用令牌
private[_-]?key\s*[:=]      # 私钥
aws[_-]?secret              # AWS 密钥
sk-[A-Za-z0-9]{32,}         # OpenAI API key
ghp_[A-Za-z0-9]{36}         # GitHub token
glpat-[A-Za-z0-9_-]{20,}    # GitLab token
```

---

## 🚨 危险路径列表（13 种）

```
/       /usr    /bin    /sbin   /etc    /var
/home   /root   ~       /*      /.*     $HOME   .
```

---

## 📋 关键配置文件（10 种）

**自动备份到 `.backups/<文件名>.<时间戳>.bak`**

```
.gitignore              package.json           tsconfig.json
webpack.config.js       vite.config.js         next.config.js
tailwind.config.js      .eslintrc              .prettierrc
docker-compose.yml      Dockerfile
```

---

## 🔐 关键项目文件（18 种）

**删除前需要确认**

```
package.json            package-lock.json      yarn.lock
pnpm-lock.yaml          requirements.txt       Pipfile
Cargo.toml              go.mod                 .git
.gitignore              README.md              LICENSE
tsconfig.json           webpack.config         vite.config
.env                    docker-compose
```

---

## 💡 常见场景示例

### 场景 1: 想要 force push
```bash
# ❌ 直接 force push（被阻止）
git push --force

# ✅ AI 自动替换为
git push --force-with-lease
```

### 场景 2: 修改已推送的 commit
```bash
# ❌ amend 已推送的 commit（被阻止）
git commit --amend

# ✅ 建议：创建新 commit
git commit -m 'fix: 修正上个 commit 的问题'
```

### 场景 3: 想要 rebase
```bash
# ✅ AI 自动创建备份
git rebase main
# 自动创建: backup-feature-20260122-142530

# 如果出问题，恢复：
git checkout backup-feature-20260122-142530
```

### 场景 4: 不小心硬编码密钥
```javascript
// ❌ 这样会被阻止提交
const API_KEY = "sk-1234567890...";

// ✅ 使用环境变量
const API_KEY = process.env.API_KEY;
```

### 场景 5: 修改 package.json
```bash
# ✅ AI 自动备份
[编辑 package.json]
# 自动创建: .backups/package.json.20260122-142530.bak

# 如果改错了，恢复：
cp .backups/package.json.20260122-142530.bak package.json
```

---

## 🎯 规则分级

| 级别 | 数量 | 说明 |
|------|------|------|
| 🔴 **阻止级** | 7 | 毁灭性操作，绝对不能执行 |
| 🟢 **自动级** | 3 | 安全操作，AI 自动执行 |

---

## 📍 文件位置

| 环境 | 脚本位置 | 配置位置 | 文档位置 |
|------|---------|---------|---------|
| **Claude Code** | `~/.claude/hooks/git-safety.sh` | `~/.claude/hooks/global.json` | `~/.claude/hooks/GIT-SAFETY-RULES.md` |
| **OpenCode** | `~/.config/opencode/hooks/git-safety.sh` | `~/.config/opencode/hooks/hooks.json` | `~/.config/opencode/hooks/GIT-SAFETY-RULES.md` |

---

## 🆘 出现错误怎么办？

### 看不懂错误信息？
- 每个错误都有详细说明和建议
- 查看完整文档：`~/.claude/hooks/GIT-SAFETY-RULES.md`

### 规则太严格？
- 手动执行被阻止的命令（AI 不会帮你执行）
- 理解风险后，由用户自己决定

### Hook 没有生效？
```bash
# 检查脚本权限
chmod +x ~/.claude/hooks/git-safety.sh
chmod +x ~/.config/opencode/hooks/git-safety.sh

# 检查配置文件格式
python3 -c "import json; json.load(open('~/.claude/hooks/global.json'))"
```

---

## 🔄 版本信息

- **版本**: 2.0 完整版
- **最后更新**: 2026-01-22
- **规则数量**: 10 条
- **代码行数**: 192 行
- **测试状态**: 3/10 已验证，7/10 待实际测试

---

**快速查阅**: 打印这页纸，贴在显示器旁边 🖨️

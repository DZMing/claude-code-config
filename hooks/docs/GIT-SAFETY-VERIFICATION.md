# Git 安全防护系统 - 验证清单

> **用途**: 新会话测试所有规则是否正常工作  
> **执行时间**: 预计 10-15 分钟  
> **最后验证**: 待执行

---

## 📋 验证步骤

### 准备工作

- [ ] 创建测试 Git 仓库
  ```bash
  cd /tmp
  mkdir git-safety-test
  cd git-safety-test
  git init
  echo "test" > README.md
  git add README.md
  git commit -m "initial commit"
  ```

---

### ✅ 规则 1: 禁止 main/master force push

**测试步骤**:
```bash
cd /tmp/git-safety-test
git checkout -b main  # 确保在 main 分支
git push --force      # 应被阻止
```

**预期结果**:
```
🚫 安全阻止: main/master 分支禁止 force push
```

**验证**: [ ] 通过 / [ ] 失败

---

### ✅ 规则 2: 检查远程新提交

**测试步骤**:
```bash
# 需要有远程仓库
git remote add origin https://github.com/test/test.git
git fetch origin main
git push --force  # 如果远程有新提交，应被阻止
```

**预期结果**:
```
⚠️  安全警告: 远程有 X 个新提交
建议操作: git pull --rebase
```

**验证**: [ ] 通过 / [ ] 失败 / [ ] 跳过（无远程）

---

### ✅ 规则 3: 自动安全替换

**测试步骤**:
```bash
git checkout -b feature
git push --force  # 应自动替换为 --force-with-lease
```

**预期结果**:
```
✅ 安全替换: 使用 --force-with-lease
原命令: git push --force
安全命令: git push --force-with-lease
```

**验证**: [ ] 通过 / [ ] 失败

---

### ✅ 规则 4: commit --amend 安全检查

**测试步骤**:
```bash
# 创建并推送一个 commit
echo "test" >> README.md
git add README.md
git commit -m "test commit"
git push  # 推送到远程

# 尝试 amend 已推送的 commit
git commit --amend -m "modified"  # 应被阻止
```

**预期结果**:
```
🚫 安全阻止: 这个 commit 已经 push，不能 amend
建议: 创建新的 commit
```

**验证**: [ ] 通过 / [ ] 失败 / [ ] 跳过（无远程）

---

### ✅ 规则 5: rebase 自动备份

**测试步骤**:
```bash
git checkout -b feature2
echo "feature" >> README.md
git add README.md
git commit -m "feature commit"

git rebase main  # 应自动创建备份分支
git branch | grep backup  # 检查是否创建备份
```

**预期结果**:
```
💾 自动备份: backup-feature2-20260122-XXXXXX
```

**验证**: [ ] 通过 / [ ] 失败

---

### ✅ 规则 6: 硬编码敏感信息检测

**测试步骤**:
```bash
# 创建包含敏感信息的文件
echo 'const API_KEY = "sk-1234567890abcdefghijklmnopqrstuvwxyz";' > config.js
git add config.js
git commit -m "add config"  # 应被阻止
```

**预期结果**:
```
🚫 安全阻止: 检测到硬编码敏感信息
文件: config.js
匹配模式: sk-[A-Za-z0-9]{32,}
```

**验证**: [ ] 通过 / [ ] 失败

**测试更多模式**:
```bash
# GitHub token
echo 'TOKEN = "ghp_1234567890123456789012345678901234567890"' > github.txt
git add github.txt
git commit -m "add token"  # 应被阻止

# GitLab token
echo 'GITLAB_TOKEN = "glpat-12345678901234567890"' > gitlab.txt
git add gitlab.txt
git commit -m "add gitlab token"  # 应被阻止

# 通用密码
echo 'password = "mySecretPassword123"' > creds.txt
git add creds.txt
git commit -m "add password"  # 应被阻止
```

**验证**: [ ] GitHub token / [ ] GitLab token / [ ] 密码

---

### ✅ 规则 7: rm -rf 危险路径检测

**测试步骤**:
```bash
rm -rf /tmp/test       # 应被阻止（系统路径）
rm -rf /usr/local/test # 应被阻止（/usr）
rm -rf ~              # 应被阻止（home）
rm -rf *              # 应被阻止（通配符）
```

**预期结果**:
```
🚫 安全阻止: 危险的 rm -rf 操作
```

**验证**: [ ] 通过 / [ ] 失败

**注意**: 某些路径可能被系统级别阻止（这是好事）

---

### ✅ 规则 8: sudo 操作确认

**测试步骤**:
```bash
sudo apt update         # 应被阻止
sudo brew install test  # 应被阻止
sudo ls                 # 应被阻止
```

**预期结果**:
```
⚠️  警告: sudo 需要管理员权限
命令: sudo apt update
AI 已自动阻止执行
```

**验证**: [ ] 通过 / [ ] 失败

---

### ✅ 规则 9: 删除关键文件确认

**测试步骤**:
```bash
cd /tmp/git-safety-test
echo '{}' > package.json
rm package.json          # 应被阻止
rm .gitignore            # 应被阻止
rm README.md             # 应被阻止
```

**预期结果**:
```
⚠️  警告: 尝试删除关键文件
命令: rm package.json
文件: package.json
```

**验证**: [ ] package.json / [ ] .gitignore / [ ] README.md

---

### ✅ 规则 10: 修改关键配置自动备份

**测试步骤**:
```bash
cd /tmp/git-safety-test

# 创建关键配置文件
echo '{"name": "test"}' > package.json

# 在 Claude Code 或 OpenCode 中编辑 package.json
# AI 应该自动创建备份

# 检查备份是否创建
ls -la .backups/
```

**预期结果**:
```
💾 自动备份关键配置: .backups/package.json.20260122-XXXXXX.bak
```

**测试更多文件**:
```bash
echo '{"compilerOptions": {}}' > tsconfig.json
# 编辑 tsconfig.json，检查备份

echo 'module.exports = {}' > webpack.config.js
# 编辑 webpack.config.js，检查备份
```

**验证**: [ ] package.json / [ ] tsconfig.json / [ ] webpack.config.js

---

## 📊 验证结果汇总

| 规则 | 状态 | 备注 |
|------|------|------|
| 规则 1: main/master force push | [ ] | |
| 规则 2: 检查远程新提交 | [ ] | |
| 规则 3: 自动安全替换 | [ ] | |
| 规则 4: amend 安全检查 | [ ] | |
| 规则 5: rebase 自动备份 | [ ] | |
| 规则 6: 硬编码敏感信息 | [ ] | |
| 规则 7: rm -rf 危险路径 | [ ] | |
| 规则 8: sudo 操作 | [ ] | |
| 规则 9: 删除关键文件 | [ ] | |
| 规则 10: 关键配置备份 | [ ] | |

**通过率**: ___ / 10

---

## 🐛 问题排查

### Hook 没有触发？

1. **检查脚本权限**
   ```bash
   ls -la ~/.claude/hooks/git-safety.sh
   ls -la ~/.config/opencode/hooks/git-safety.sh
   # 应该显示 -rwxr-xr-x（可执行）
   ```

2. **检查 Hook 配置**
   ```bash
   # Claude Code
   cat ~/.claude/hooks/global.json | grep git-safety

   # OpenCode
   cat ~/.config/opencode/hooks/hooks.json | grep git-safety
   ```

3. **手动测试脚本**
   ```bash
   bash ~/.claude/hooks/git-safety.sh "sudo apt update"
   # 应该显示警告信息
   ```

### 错误信息不显示？

1. **检查 Shell 环境**
   ```bash
   echo $SHELL
   # 应该是 /bin/bash 或 /bin/zsh
   ```

2. **检查脚本语法**
   ```bash
   bash -n ~/.claude/hooks/git-safety.sh
   # 没有输出表示语法正确
   ```

### 备份没有创建？

1. **检查 .backups 目录权限**
   ```bash
   ls -la .backups/
   mkdir -p .backups  # 手动创建
   ```

2. **检查 Hook 配置中的备份命令**
   ```bash
   cat ~/.claude/hooks/global.json | grep -A 5 "BACKUP"
   ```

---

## 📝 验证日志

### 验证时间: __________

### 环境信息:
- OS: __________
- Shell: __________
- Claude Code 版本: __________
- OpenCode 版本: __________

### 问题记录:
1. 
2. 
3. 

### 改进建议:
1. 
2. 
3. 

---

## ✅ 验证完成后

- [ ] 更新 `GIT-SAFETY-RULES.md` 的测试状态
- [ ] 更新 `claude-progress.txt` 记录验证结果
- [ ] 如果有问题，创建 issue 或修复脚本
- [ ] 删除测试仓库：`rm -rf /tmp/git-safety-test`

---

**下次验证时间**: 定期验证或系统更新后

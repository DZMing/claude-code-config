# Git 集成最佳实践

> 将项目管理与 Git 工作流结合

---

## Git Hook 集成

### 提交后提示

在 `.git/hooks/post-commit` 中添加以下内容：

```bash
#!/bin/bash
echo ""
echo "✅ 提交成功！"
echo ""
echo "💡 建议: 运行 /update-status 更新项目状态"
echo ""
```

**效果：** 每次提交后自动提示更新项目状态

---

### 提交信息规范

推荐使用以下格式：

```
类型(模块): 简短描述

详细说明（可选）
- 改动点1
- 改动点2

相关: #123, #124
```

**类型说明：**
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 杂项（如依赖更新）

**好处：**
- AI 可通过提交信息自动理解代码变更
- 便于生成更新报告

---

### 分支管理建议

#### 单人开发

```bash
# 主分支
git checkout main

# 开发新功能
git checkout -b feature/user-profile

# 开发完成后
git add .
git commit -m "feat(user): 完成用户个人资料页"
git checkout main
git merge feature/user-profile

# 更新状态
/update-status
```

#### 团队协作

```bash
# 团队成员A
git checkout -b feature/payment
# 开发...
git commit -m "feat(payment): 实现支付接口"
git push origin feature/payment
# 创建PR并合并
/update-status
git push

# 团队成员B
git pull origin main
/next  # 获取新任务建议
```

---

## 自动化脚本

### 一键更新脚本

创建 `scripts/update-project.sh`：

```bash
#!/bin/bash
# 一键提交、推送、更新状态

echo "📦 添加文件..."
git add .

echo "💬 提交代码..."
git commit -m "$1"

echo "☁️ 推送到远程..."
git push

echo "📊 更新项目状态..."
echo "在Claude Code中运行: /update-status"
```

**使用方法：**
```bash
cd 项目目录
./scripts/update-project.sh "feat: 完成用户评论功能"
```

然后在Claude Code中运行：`/update-status`

---

## 与项目管理命令结合

### 每日工作流程

```bash
# 早上开始工作
cd 项目目录
claude-code  # 启动Claude Code
> /start      # 了解项目状态

# 获取任务
git pull      # 拉取最新代码
> /next       # 获取任务建议

# 开发...
# 编写代码
# 运行测试

# 更新状态
git add .
git commit -m "feat: 完成XX功能"
git push
> /update-status  # 更新项目文档

# 下班前
git push
> /next       # 规划明日任务
```

---

## 团队协作模式

### 同步开发

**团队成员A:**
```bash
git pull
/next  # 获取任务
# 开发...
git add . && git commit -m "feat: XX功能" && git push
/update-status
```

**团队成员B:**
```bash
git pull
/progress  # 查看整体进度
/next  # 获取新任务（避免冲突）
```

---

## 项目交接流程

### 老员工交接

1. **生成完整报告：**
   ```bash
   /progress
   # 复制完整报告
   ```

2. **更新所有文档：**
   ```bash
   /update-status  # 确保文档最新
   git add docs/ && git commit -m "docs: 更新项目文档" && git push
   ```

3. **代码审查：**
   ```bash
   git log --oneline -10  # 查看最近10次提交
   # 向新员工说明关键点
   ```

### 新员工接手

1. **快速了解项目：**
   ```bash
   git clone <项目地址>
   cd project
   /start
   ```

2. **阅读文档：**
   ```bash
   Read docs/需求文档.md
   Read docs/项目状态.md
   Read docs/待办清单.md
   ```

3. **获取第一个任务：**
   ```bash
   /next
   ```

---

## 常见问题

### Q: 提交信息要写多详细？

**A:** 至少包含类型和简短描述：
```bash
✅ good commit:
f"eat(auth): 添加JWT认证

git pull
> /next
```

---

### Q: 团队协作时如何避免冲突？

**A:** 使用 `/next` 命令，AI会分析其他成员正在进行的工作，推荐不会冲突的任务。

```bash
# 查看谁在做什么
git log --oneline -20 --all
/progress  # 查看总体进度
/next      # 获取推荐的独立任务
```

---

### Q: 如何回退错误的更新？

**A:** Git + 备份

```bash
# 查看提交历史
git log --oneline -10

# 回退到上一个状态
git reset HEAD~1

# 或者创建修复提交
git revert <错误提交的哈希>

# 更新状态
/update-status
```

---

## 推荐配置

### 1. Git 别名（可选）

在 `~/.gitconfig` 中添加：

```ini
[alias]
    s = status
    cm = commit -m
    p = push
    pl = pull
    lg = log --oneline --graph --all
    ustatus = !echo "TBD: 集成Claude Code的/update-status"
```

**使用：**
```bash
git s      # 状态
git cm "feat: XX功能"  # 提交
git p      # 推送
git lg     # 查看日志
```

### 2. 预提交钩子

在 `.git/hooks/pre-commit`：

```bash
#!/bin/bash
# 提交前检查是否有重要文件修改

if git diff --cached --name-only | grep -q "CLAUDE.md"; then
    echo "⚠️  检测到 CLAUDE.md 被修改"
    read -p "确认继续提交？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
```

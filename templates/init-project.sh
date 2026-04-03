#!/bin/bash
# Harness 工程：项目初始化脚手架
# 用法：在新项目根目录执行 bash ~/.claude/templates/init-project.sh

set -e

PROJECT_NAME=$(basename "$(pwd)")
echo "🏗️ 初始化 Harness 脚手架：$PROJECT_NAME"

# 1. 创建 feature_list.json（所有 passes:false）
if [ ! -f feature_list.json ]; then
  cat > feature_list.json << 'TEMPLATE'
[
  {
    "id": 1,
    "category": "functional",
    "description": "TODO: 描述功能",
    "steps": ["TODO: 验证步骤"],
    "passes": false
  }
]
TEMPLATE
  echo "✅ 创建 feature_list.json"
else
  echo "⏭️  feature_list.json 已存在，跳过"
fi

# 2. 创建 claude-progress.txt
if [ ! -f claude-progress.txt ]; then
  cat > claude-progress.txt << EOF
# $PROJECT_NAME 进度日志

## [$(date '+%Y-%m-%d %H:%M')] - Session 0 (初始化)

### 完成
- 项目初始化，创建 Harness 脚手架

### 下一步建议
- 填写 feature_list.json 完整功能列表
- 实现第一个 feature
EOF
  echo "✅ 创建 claude-progress.txt"
else
  echo "⏭️  claude-progress.txt 已存在，跳过"
fi

# 3. 创建 init.sh（环境恢复脚本）
if [ ! -f init.sh ]; then
  cat > init.sh << 'INITEOF'
#!/bin/bash
# 环境恢复脚本 — 每次会话开始时运行
set -e
echo "🔧 恢复开发环境..."

# 自动检测并安装依赖
if [ -f package.json ]; then
  LOCKFILE=""
  [ -f pnpm-lock.yaml ] && LOCKFILE="pnpm"
  [ -f yarn.lock ] && LOCKFILE="yarn"
  [ -f package-lock.json ] && LOCKFILE="npm"
  ${LOCKFILE:-npm} install --silent 2>/dev/null || true
elif [ -f requirements.txt ]; then
  pip install -q -r requirements.txt 2>/dev/null || true
elif [ -f go.mod ]; then
  go mod download 2>/dev/null || true
fi

echo "✅ 开发环境就绪"
INITEOF
  chmod +x init.sh
  echo "✅ 创建 init.sh"
else
  echo "⏭️  init.sh 已存在，跳过"
fi

# 4. 创建项目级 .claude/CLAUDE.md
mkdir -p .claude
if [ ! -f .claude/CLAUDE.md ]; then
  cat > .claude/CLAUDE.md << EOF
# $PROJECT_NAME

## 技术栈
- TODO: 填写

## 快捷命令
- \`npm test\` — 运行测试
- \`npm run dev\` — 启动开发服务器

## 已知问题
- （暂无）
EOF
  echo "✅ 创建 .claude/CLAUDE.md"
else
  echo "⏭️  .claude/CLAUDE.md 已存在，跳过"
fi

# 5. 确保 Git 初始化
if [ ! -d .git ]; then
  git init
  echo "✅ Git 初始化"
fi

echo ""
echo "✅ Harness 脚手架创建完成"
echo "📝 下一步：编辑 feature_list.json 添加功能列表"

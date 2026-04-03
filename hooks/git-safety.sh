#!/bin/bash
# Git 安全规范自动执行脚本
# 位置: ~/.claude/hooks/git-safety.sh

set -e

# Paperclip agent bypass — hooks are for human sessions
if [ -n "${PAPERCLIP_RUN_ID:-}" ]; then exit 0; fi

COMMAND="$1"
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")

# ============================================
# 规则 1: 禁止 main/master 的 force push
# ============================================
if [[ "$COMMAND" =~ (push.*--force|push.*-f) ]]; then
    if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🚫 安全阻止: main/master 分支禁止 force push"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "如果确实需要，请："
        echo "  1. 切换到其他分支"
        echo "  2. 联系团队负责人"
        echo "  3. 手动执行（AI 不会帮你执行）"
        echo ""
        exit 1
    fi
    
    # ============================================
    # 规则 2: 检查远程是否有新提交
    # ============================================
    git fetch origin "$BRANCH" 2>/dev/null || true
    REMOTE_COMMITS=$(git log HEAD..origin/$BRANCH --oneline 2>/dev/null | wc -l | tr -d ' ')
    
    if [ "$REMOTE_COMMITS" -gt 0 ]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "⚠️  安全警告: 远程有 $REMOTE_COMMITS 个新提交"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "建议操作:"
        echo "  git pull --rebase  # 先拉取远程更新"
        echo ""
        echo "AI 已自动阻止 force push，保护你的代码"
        echo ""
        exit 1
    fi
    
    # ============================================
    # 规则 3: 自动替换为安全版本
    # ============================================
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ 安全替换: 使用 --force-with-lease"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # 替换命令
    SAFE_COMMAND=$(echo "$COMMAND" | sed 's/--force\|/-f/--force-with-lease/g')
    echo "原命令: $COMMAND"
    echo "安全命令: $SAFE_COMMAND"
    echo ""
    
    # 执行安全命令
    eval "$SAFE_COMMAND"
    exit 0
fi

# ============================================
# 规则 4: commit --amend 安全检查
# ============================================
if [[ "$COMMAND" =~ commit.*--amend ]]; then
    # 检查最近的 commit 是否已 push
    LAST_COMMIT=$(git rev-parse HEAD)
    
    if git branch -r --contains "$LAST_COMMIT" 2>/dev/null | grep -q "origin/$BRANCH"; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🚫 安全阻止: 这个 commit 已经 push，不能 amend"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "建议: 创建新的 commit 而不是修改旧的"
        echo "  git commit -m 'fix: 修正上个 commit 的问题'"
        echo ""
        echo "原因: amend 已 push 的 commit 会导致历史冲突"
        echo ""
        exit 1
    fi
    
    echo "✅ 安全: 这个 commit 只在本地，可以 amend"
fi

# ============================================
# 规则 5: rebase 自动备份
# ============================================
if [[ "$COMMAND" =~ rebase ]]; then
    BACKUP_BRANCH="backup-$BRANCH-$(date +%Y%m%d-%H%M%S)"
    git branch "$BACKUP_BRANCH" 2>/dev/null || true
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "💾 自动备份: $BACKUP_BRANCH"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "如果 rebase 出问题，可以恢复:"
    echo "  git checkout $BACKUP_BRANCH"
    echo ""
fi

# ============================================
# 规则 6: 硬编码敏感信息检测
# ============================================
if [[ "$COMMAND" =~ (commit|add) ]]; then
    # 敏感信息模式
    PATTERNS=(
        "password\s*[:=]\s*['\"]?[^'\"[:space:]]+"
        "api[_-]?key\s*[:=]\s*['\"]?[^'\"[:space:]]+"
        "secret\s*[:=]\s*['\"]?[^'\"[:space:]]+"
        "token\s*[:=]\s*['\"]?[^'\"[:space:]]+"
        "private[_-]?key\s*[:=]"
        "aws[_-]?secret[_-]?access[_-]?key"
        "sk-[A-Za-z0-9]{32,}"  # OpenAI API key pattern
        "ghp_[A-Za-z0-9]{36}"   # GitHub personal access token
        "glpat-[A-Za-z0-9_-]{20,}"  # GitLab personal access token
    )
    
    # 检查暂存区文件
    STAGED_FILES=$(git diff --cached --name-only 2>/dev/null)
    
    for FILE in $STAGED_FILES; do
        if [ -f "$FILE" ]; then
            for PATTERN in "${PATTERNS[@]}"; do
                if grep -i -E "$PATTERN" "$FILE" > /dev/null 2>&1; then
                    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                    echo "🚫 安全阻止: 检测到硬编码敏感信息"
                    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                    echo ""
                    echo "文件: $FILE"
                    echo "匹配模式: $PATTERN"
                    echo ""
                    echo "建议："
                    echo "  1. 使用环境变量: export API_KEY=xxx"
                    echo "  2. 使用配置文件并加入 .gitignore: config.local.json"
                    echo "  3. 使用密钥管理工具: AWS Secrets Manager, Azure Key Vault"
                    echo ""
                    echo "AI 已自动阻止提交，保护你的密钥安全"
                    echo ""
                    exit 1
                fi
            done
        fi
    done
fi

# ============================================
# 规则 7: rm -rf 危险路径检测
# ============================================
if [[ "$COMMAND" =~ rm.*-rf ]]; then
    # 危险路径模式
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
    
    for PATH in "${DANGEROUS_PATHS[@]}"; do
        if [[ "$COMMAND" =~ $PATH ]]; then
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "🚫 安全阻止: 危险的 rm -rf 操作"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            echo "命令: $COMMAND"
            echo "危险路径: $PATH"
            echo ""
            echo "这个操作可能删除系统关键文件或整个文件系统"
            echo "AI 已自动阻止执行"
            echo ""
            exit 1
        fi
    done
    
    # 检测通配符 *
    if [[ "$COMMAND" =~ rm.*-rf.*\* ]]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "⚠️  警告: 使用通配符的 rm -rf 操作"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "命令: $COMMAND"
        echo ""
        echo "请确认要删除的文件，使用 ls 预览："
        echo "  ls -la [你的路径]"
        echo ""
        echo "AI 已自动阻止执行，防止误删"
        echo ""
        exit 1
    fi
fi

# ============================================
# 规则 8: sudo 操作确认
# ============================================
if [[ "$COMMAND" =~ ^sudo ]]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚠️  警告: sudo 需要管理员权限"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "命令: $COMMAND"
    echo ""
    echo "这个操作需要管理员权限，可能影响系统安全"
    echo ""
    echo "建议："
    echo "  1. 检查是否真的需要 sudo"
    echo "  2. 优先使用用户级别的操作"
    echo "  3. 如果确实需要，请手动执行"
    echo ""
    echo "AI 已自动阻止执行"
    echo ""
    exit 1
fi

# ============================================
# 规则 9: 删除文件确认
# ============================================
if [[ "$COMMAND" =~ ^rm ]]; then
    # 关键文件模式
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
    
    for FILE in "${CRITICAL_FILES[@]}"; do
        if [[ "$COMMAND" =~ $FILE ]]; then
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "⚠️  警告: 尝试删除关键文件"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            echo "命令: $COMMAND"
            echo "文件: $FILE"
            echo ""
            echo "这是项目的关键配置文件，删除可能导致项目无法运行"
            echo ""
            echo "建议："
            echo "  1. 如果是临时备份，使用 git stash"
            echo "  2. 如果确实要删除，请手动执行"
            echo ""
            echo "AI 已自动阻止执行"
            echo ""
            exit 1
        fi
    done
fi

# ============================================
# 规则 10: 修改关键配置自动备份
# ============================================
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

# 这个规则由 PreToolUse Hook 在 Write/Edit 时自动触发
# 此处仅用于文档说明
# 实际备份逻辑在 global.json 的 PreToolUse Hook 中实现

# 如果没有匹配任何规则，放行
echo "✅ 安全检查通过"
exit 0

#!/bin/bash
# Claude Skills Vault — Ship Fast pre-push hook
# 触发时机：git push 之前
# 功能：构建检查 + 类型检查 + Lighthouse 基础检查（如果可用）
# 兼容：macOS + Linux

set -e

echo "🚀 Ship Fast pre-push 检查..."

# ── 1. 检查是否有未暂存的改动 ────────────────────────────────────────────────
if ! git diff --quiet; then
  echo "⚠️  有未暂存的改动，建议 commit 后再 push（不强制阻止）"
fi

# ── 2. TypeScript 类型检查 ───────────────────────────────────────────────────
if [ -f "tsconfig.json" ]; then
  echo "→ 类型检查..."
  if command -v npx &>/dev/null; then
    npx tsc --noEmit || { echo "❌ 类型错误，修好再 push"; exit 1; }
    echo "  ✅ 类型检查通过"
  fi
fi

# ── 3. 构建检查 ───────────────────────────────────────────────────────────────
if [ -f "package.json" ]; then
  BUILD_CMD=""
  if grep -q '"build"' package.json 2>/dev/null; then
    BUILD_CMD="npm run build"
  fi

  if [ -n "$BUILD_CMD" ]; then
    echo "→ 构建检查..."
    $BUILD_CMD || { echo "❌ 构建失败，修好再 push"; exit 1; }
    echo "  ✅ 构建通过"
  fi
fi

# ── 4. 环境变量检查（警告缺失的生产环境变量）──────────────────────────────
if [ -f ".env.example" ]; then
  echo "→ 环境变量检查..."
  MISSING=""
  while IFS= read -r line; do
    # 跳过注释和空行
    [[ "$line" =~ ^#.*$ ]] && continue
    [[ -z "$line" ]] && continue
    VAR_NAME=$(echo "$line" | cut -d'=' -f1)
    if [ -z "${!VAR_NAME}" ] && [ -z "$(grep "^$VAR_NAME=" .env.local 2>/dev/null)" ]; then
      MISSING="$MISSING $VAR_NAME"
    fi
  done < .env.example

  if [ -n "$MISSING" ]; then
    echo "  ⚠️  以下变量未在环境中设置（部署时记得配）:$MISSING"
  else
    echo "  ✅ 环境变量完整"
  fi
fi

# ── 5. 检查是否有硬编码的 localhost ──────────────────────────────────────────
echo "→ 检查硬编码 URL..."
HARDCODED=$(grep -rn "localhost:3000" --include="*.ts" --include="*.tsx"   --exclude-dir=".next" --exclude-dir="node_modules" . 2>/dev/null |   grep -v "// " | grep -v ".env" | head -5 || true)

if [ -n "$HARDCODED" ]; then
  echo "  ⚠️  发现硬编码 localhost，上线记得改成环境变量："
  echo "$HARDCODED"
else
  echo "  ✅ 无硬编码 URL"
fi

echo ""
echo "✅ pre-push 检查全部通过，推送中..."

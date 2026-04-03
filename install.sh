#!/bin/bash
# Claude Code 全套配置安装脚本
# 用法：bash install.sh

set -e

echo "======================================"
echo "  Claude Code 配置安装脚本"
echo "======================================"
echo ""

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
FORGE_DIR="$HOME/.forge"

# ── 步骤 1：备份现有配置 ───────────────────────────────
echo "📦 步骤 1/7：备份现有配置..."
if [ -d "$CLAUDE_DIR" ]; then
  BACKUP="$HOME/.claude.backup.$(date +%Y%m%d_%H%M%S)"
  cp -r "$CLAUDE_DIR" "$BACKUP"
  echo -e "${GREEN}✅ 已备份到 $BACKUP${NC}"
else
  echo "  (无现有配置，跳过备份)"
fi
echo ""

# ── 步骤 2：创建目录结构 ──────────────────────────────
echo "📁 步骤 2/7：创建目录结构..."
mkdir -p "$CLAUDE_DIR"/{rules,hooks,commands/gsd,commands/forge,skills,agents,mcp-servers,scripts,templates,config,output-styles,flows,get-shit-done,plugins}
mkdir -p "$FORGE_DIR"/{projects,runtime,logs,templates/constraints,signals}
echo -e "${GREEN}✅ 目录创建完成${NC}"
echo ""

# ── 步骤 3：安装核心配置 ──────────────────────────────
echo "⚙️  步骤 3/7：安装核心配置..."

# 复制并替换 __HOME__ 占位符
for f in settings.json mcp.json; do
  if [ -f "$REPO_DIR/core/$f" ]; then
    sed "s|__HOME__|$HOME|g" "$REPO_DIR/core/$f" > "$CLAUDE_DIR/$f"
    echo "  ✓ $f（路径已替换为 $HOME）"
  fi
done

# 直接复制（无需替换）
for f in CLAUDE.md AGENTS.md instructions.md cclsp.json package.json config.json user_preferences.json; do
  [ -f "$REPO_DIR/core/$f" ] && cp "$REPO_DIR/core/$f" "$CLAUDE_DIR/" && echo "  ✓ $f"
done
echo -e "${GREEN}✅ 核心配置安装完成${NC}"
echo ""

# ── 步骤 4：安装规则、Hook、命令、技能、Agent ─────────
echo "📋 步骤 4/7：安装规则、Hook、命令..."

cp -r "$REPO_DIR/rules/"* "$CLAUDE_DIR/rules/"
echo "  ✓ rules/ (6 个规则文件)"

cp "$REPO_DIR/hooks/"*.js "$CLAUDE_DIR/hooks/" 2>/dev/null
cp "$REPO_DIR/hooks/"*.sh "$CLAUDE_DIR/hooks/" 2>/dev/null
cp -r "$REPO_DIR/hooks/docs" "$CLAUDE_DIR/hooks/"
cp -r "$REPO_DIR/hooks/inactive" "$CLAUDE_DIR/hooks/"
chmod +x "$CLAUDE_DIR/hooks/"*.sh 2>/dev/null
echo "  ✓ hooks/ (活跃 + 备用 hooks)"

cp "$REPO_DIR/commands/"*.md "$CLAUDE_DIR/commands/" 2>/dev/null
cp "$REPO_DIR/commands/gsd/"*.md "$CLAUDE_DIR/commands/gsd/" 2>/dev/null
for f in fix implement pr; do
  [ -f "$REPO_DIR/commands/$f" ] && cp "$REPO_DIR/commands/$f" "$CLAUDE_DIR/commands/" && chmod +x "$CLAUDE_DIR/commands/$f"
done
[ -f "$REPO_DIR/commands/forge/status.md" ] && cp "$REPO_DIR/commands/forge/status.md" "$CLAUDE_DIR/commands/forge/"
echo "  ✓ commands/ (斜杠命令)"

cp -r "$REPO_DIR/skills/"* "$CLAUDE_DIR/skills/"
echo "  ✓ skills/ (18 个自定义技能)"

cp "$REPO_DIR/agents/"*.md "$CLAUDE_DIR/agents/"
echo "  ✓ agents/ (47 个 Agent 定义)"

cp -r "$REPO_DIR/config/"* "$CLAUDE_DIR/config/"
cp -r "$REPO_DIR/output-styles/"* "$CLAUDE_DIR/output-styles/"
cp -r "$REPO_DIR/flows/"* "$CLAUDE_DIR/flows/"
cp -r "$REPO_DIR/templates/"* "$CLAUDE_DIR/templates/"
cp -r "$REPO_DIR/scripts/"* "$CLAUDE_DIR/scripts/"
chmod +x "$CLAUDE_DIR/scripts/"*.sh 2>/dev/null
echo "  ✓ config、output-styles、flows、templates、scripts"

cp -r "$REPO_DIR/mcp-servers/"* "$CLAUDE_DIR/mcp-servers/"
echo "  ✓ mcp-servers/ (Gemini + Codex 自定义服务器)"

echo -e "${GREEN}✅ 规则、Hook、命令安装完成${NC}"
echo ""

# ── 步骤 5：安装 GSD 框架和 Forge 配置 ───────────────
echo "🔧 步骤 5/7：安装 GSD 框架和 Forge 配置..."

cp -r "$REPO_DIR/get-shit-done/"* "$CLAUDE_DIR/get-shit-done/"
echo "  ✓ get-shit-done/"

cp "$REPO_DIR/forge/config.json" "$FORGE_DIR/config.json"
cp "$REPO_DIR/forge/templates/constraints/"*.md "$FORGE_DIR/templates/constraints/"
echo "  ✓ forge config"

echo -e "${GREEN}✅ GSD 框架安装完成${NC}"
echo ""

# ── 步骤 6：创建符号链接 ──────────────────────────────
echo "🔗 步骤 6/7：创建符号链接..."

# GSD 技能符号链接（skills/gsd-*.md → commands/gsd/*.md）
for f in "$CLAUDE_DIR/commands/gsd/"*.md; do
  BASENAME=$(basename "$f")
  CMD_NAME="${BASENAME%.md}"
  LINK="$CLAUDE_DIR/skills/gsd-${CMD_NAME}.md"
  [ ! -L "$LINK" ] && ln -sf "$f" "$LINK"
done
echo "  ✓ GSD 技能符号链接"

# 尝试克隆 gstack（如果没有安装）
if [ ! -d "$CLAUDE_DIR/skills/gstack/.git" ]; then
  echo ""
  echo -e "${YELLOW}  📥 正在克隆 gstack 工具链...${NC}"
  if git clone --depth=1 https://github.com/garrytan/gstack.git "$CLAUDE_DIR/skills/gstack" 2>/dev/null; then
    echo "  ✓ gstack 克隆成功"
    # 创建 gstack 技能符号链接
    GSTACK_SKILLS="autoplan benchmark browse canary careful codex connect-chrome cso design-consultation design-review document-release freeze gstack-upgrade guard investigate land-and-deploy office-hours plan-ceo-review plan-design-review plan-eng-review qa qa-only retro review setup-browser-cookies setup-deploy ship unfreeze"
    for s in $GSTACK_SKILLS; do
      [ -d "$CLAUDE_DIR/skills/gstack/$s" ] && ln -sf "$CLAUDE_DIR/skills/gstack/$s" "$CLAUDE_DIR/skills/$s" 2>/dev/null
    done
    echo "  ✓ gstack 技能符号链接"
  else
    echo -e "${YELLOW}  ⚠ gstack 克隆失败（可能网络问题），跳过${NC}"
    echo "    手动安装：git clone https://github.com/garrytan/gstack.git ~/.claude/skills/gstack"
  fi
else
  echo "  ✓ gstack 已存在，跳过"
fi

echo -e "${GREEN}✅ 符号链接创建完成${NC}"
echo ""

# ── 步骤 7：配置 API Keys ─────────────────────────────
echo "🔑 步骤 7/7：API Key 配置提示"
echo ""
echo -e "${YELLOW}  需要你手动填入以下 API Key：${NC}"
echo ""
echo "  1. 打开 $CLAUDE_DIR/mcp.json"
echo "     找到 \"__YOUR_BIGMODEL_API_KEY__\""
echo "     替换为你的 BigModel/ZhiPu API Key"
echo "     （可在 https://open.bigmodel.cn 申请）"
echo ""
echo "  2. OpenSpace MCP 服务器需要 Python 环境和 openspace 包"
echo "     如不需要可删除 mcp.json 中的 openspace 配置"
echo ""
echo "  3. patchright 隐身浏览器需要单独安装："
echo "     git clone https://github.com/xxx/patchright-mcp-lite ~/tools/patchright-mcp-lite"
echo "     （如不需要可删除 mcp.json 中的 patchright-stealth 配置）"
echo ""

# ── 完成 ─────────────────────────────────────────────
echo "======================================"
echo -e "${GREEN}  ✅ 安装完成！${NC}"
echo "======================================"
echo ""
echo "📦 需要手动安装的插件（在 Claude Code 中运行）："
echo ""
echo "  claude plugin install typescript-lsp@claude-plugins-official"
echo "  claude plugin install superpowers@claude-plugins-official"
echo "  claude plugin install code-simplifier@claude-plugins-official"
echo "  claude plugin install claude-md-management@claude-plugins-official"
echo "  claude plugin install commit-commands@claude-plugins-official"
echo "  claude plugin install github@claude-plugins-official"
echo "  claude plugin install skill-creator@claude-plugins-official"
echo "  claude plugin install hookify@claude-plugins-official"
echo "  claude plugin install playwright@claude-plugins-official"
echo "  claude plugin install frontend-design@claude-plugins-official"
echo "  claude plugin install code-review@claude-plugins-official"
echo "  claude plugin install ralph-loop@claude-plugins-official"
echo "  claude plugin install pyright-lsp@claude-plugins-official"
echo "  claude plugin install claude-hud@jarrodwatts"
echo "  claude plugin install pua@pua-skills"
echo "  claude plugin install discord@claude-plugins-official"
echo ""
echo "📌 其他依赖："
echo "  - Node.js >= 18"
echo "  - bun（状态栏插件需要）: curl -fsSL https://bun.sh/install | bash"
echo "  - context7 MCP：npm install -g @upstash/context7-mcp"
echo "  - codex CLI：npm install -g @openai/codex"
echo ""
echo "重启 Claude Code 即可生效！🚀"

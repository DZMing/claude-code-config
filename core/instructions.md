# Claude Code Global Context (Master Index)

> **Rule Modules** 已模块化到 `~/.claude/rules/` 目录

## 核心规则（始终加载）

1. **[00-iron-protocol.md](rules/00-iron-protocol.md)** — 会话启动协议 + Forge 路由
2. **[02-coding-standards.md](rules/02-coding-standards.md)** — 编码规范 + 原子提交（≤50行）
3. **[05-memory.md](rules/05-memory.md)** — 记忆系统 + Forge 状态文件
4. **[10-autonomous-mode.md](rules/10-autonomous-mode.md)** — AI 自主模式（含安全边界）
5. **[15-browser-iron-law.md](rules/15-browser-iron-law.md)** — 浏览器使用铁律

## Hooks 注册

**Active hooks（settings.json）**：
- SessionStart: `gsd-check-update.js`, `forge-session-start.js`
- PostToolUse: `forge-context-save.js`, `forge-state-sync.js`
- PreToolUse: `gsd-prompt-guard.js`, `git-safety.sh`, `pre-tool-use-guard.sh`

**注**：`hooks/global.json` 已删除（运行时不加载）

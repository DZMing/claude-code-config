# Claude Code 全套配置

这是一套经过打磨的 Claude Code 配置，包含自动化工作流引擎、60+ 技能命令、12 个 MCP 工具服务器、完整代码质量保障体系，以及多 AI 协作编排。

> 适合想让 Claude Code 更智能、更自动化的用户。

---

## 包含什么

| 模块 | 内容 | 作用 |
|------|------|------|
| **Forge 引擎** | 全自动开发流水线 | 输入需求 → 自动规划 → 编码 → 测试 → 部署 |
| **GSD 框架** | 57 个 `/gsd:*` 命令 | 项目管理、任务分解、里程碑追踪 |
| **gstack 工具链** | 28 个质量审查命令 | 代码审查、QA、基准测试、发布管理 |
| **行为规则** | 6 条规范文件 | 中文回复、苏格拉底质量协议、自主模式约束 |
| **Hooks 系统** | 12 个自动 Hook | 自动 git 保存进度、错误自修复、质量把关 |
| **自定义技能** | 18 个专项技能 | 落地页、支付集成、MVP 脚手架、爬虫等 |
| **Agent 定义** | 47 个专家 Agent | 数据库设计、机器学习、TDD 专家等 |
| **MCP 服务器** | 12 个工具服务器 | 文件系统、GitHub、浏览器控制、记忆、AI 集成 |
| **斜杠命令** | 22 个 `/命令` | ask、code、commit、debug、plan 等 |

---

## 安装方法

### 前置条件

- [Claude Code](https://claude.ai/code) 已安装
- Node.js >= 18（运行 `node --version` 检查）
- Git
- bun（状态栏插件需要）

### 一键安装

```bash
git clone https://github.com/DZMing/claude-code-config.git
cd claude-code-config
bash install.sh
```

安装完成后**重启 Claude Code**。

---

## 配置你的 API Key

安装后需要填入你自己的 API Key：

### 1. 打开 MCP 配置文件

```bash
# 用文本编辑器打开（Mac 上双击即可）
open ~/.claude/mcp.json
```

### 2. 替换占位符

找到以下占位符，替换为你自己的值：

| 占位符 | 说明 | 在哪申请 |
|--------|------|---------|
| `__YOUR_BIGMODEL_API_KEY__` | 智谱 AI API Key（OpenSpace 技能进化用） | [open.bigmodel.cn](https://open.bigmodel.cn) |
| `__HOME__` | 已由安装脚本自动替换为你的主目录，无需手动修改 | — |

### 3. 可选 MCP 服务器

以下 MCP 服务器需要额外安装，**如不需要可以删掉** mcp.json 中对应的配置块：

| 服务器 | 用途 | 需要什么 |
|--------|------|---------|
| `patchright-stealth` | 过反爬虫的隐身浏览器 | 需克隆 patchright-mcp-lite 仓库 |
| `openspace` | AI 技能自动进化 | 需安装 OpenSpace Python 包 |
| `claude-mem` | 跨会话记忆 | 自动从插件缓存读取，无需额外操作 |

---

## 安装插件

安装完成后，在 Claude Code 终端中运行以下命令安装插件：

```
claude plugin install superpowers@claude-plugins-official
claude plugin install typescript-lsp@claude-plugins-official
claude plugin install code-simplifier@claude-plugins-official
claude plugin install claude-md-management@claude-plugins-official
claude plugin install commit-commands@claude-plugins-official
claude plugin install github@claude-plugins-official
claude plugin install skill-creator@claude-plugins-official
claude plugin install hookify@claude-plugins-official
claude plugin install playwright@claude-plugins-official
claude plugin install frontend-design@claude-plugins-official
claude plugin install code-review@claude-plugins-official
claude plugin install ralph-loop@claude-plugins-official
claude plugin install pyright-lsp@claude-plugins-official
claude plugin install claude-hud@jarrodwatts
claude plugin install pua@pua-skills
claude plugin install discord@claude-plugins-official
```

---

## 如何使用

### 开始一个新项目（Forge 全自动流程）

把你的需求粘贴给 Claude，然后输入：

```
/forge
```

Claude 会自动完成：需求分析 → 技术规划 → 代码开发 → 测试 → 质量审查 → 部署。

### 快速小任务

```
/gsd:fast  # 快速执行，不走完整流程
/gsd:quick # 极速模式
```

### 查看所有项目状态

```
/forge:status
```

### 恢复中断的项目

```
/forge resume 项目名称
```

---

## 目录说明

```
claude-code-config/
├── core/           # 核心配置（安装到 ~/.claude/）
├── rules/          # 行为规则（6 条）
├── hooks/          # 自动化 Hook 脚本
│   ├── *.js/.sh    # 活跃 Hook
│   └── inactive/   # 备用 Hook（未激活）
├── commands/       # 斜杠命令
│   └── gsd/        # 57 个 GSD 子命令
├── skills/         # 自定义技能（18 个）
├── agents/         # 专家 Agent 定义（47 个）
├── mcp-servers/    # 自定义 MCP 服务器代码
├── forge/          # Forge 引擎配置
├── get-shit-done/  # GSD 框架文件
├── scripts/        # 实用脚本
├── output-styles/  # AI 输出风格模板
└── install.sh      # 一键安装脚本
```

---

## 常见问题

**Q: 安装后 Hook 不生效？**  
A: 检查 `~/.claude/settings.json` 中的路径是否正确（应该是你的主目录路径）。

**Q: `forge-session-start.js` 报错？**  
A: 确保 Node.js >= 18：`node --version`

**Q: gstack 克隆失败？**  
A: 手动克隆：`git clone https://github.com/garrytan/gstack.git ~/.claude/skills/gstack`

**Q: 状态栏不显示？**  
A: 需要安装 bun：`curl -fsSL https://bun.sh/install | bash`，然后重启 Claude Code。

**Q: MCP 服务器连不上？**  
A: 先安装依赖：`npm install -g @upstash/context7-mcp`，`npm install -g @openai/codex`

---

## 感谢

配置基于以下工具构建：
- [GSD (Get Shit Done)](https://github.com/daveshanley/get-shit-done) — 项目管理框架
- [gstack](https://github.com/garrytan/gstack) — 质量工具链
- [Superpowers](https://claude.ai/code/plugins) — Claude Code 官方插件
- [claude-hud](https://github.com/jarrodwatts/claude-hud) — 状态栏 HUD
